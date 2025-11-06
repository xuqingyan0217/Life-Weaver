package graphproc

// 本文件负责“按图执行”的核心逻辑：
// - 根据边关系构建各节点的入度与邻接表
// - 分层（Kahn 算法）推进可执行节点集合 layer
// - 对每个节点：由监督者（graph_supervisor）决定路由到 text 或 vision 子代理
// - 显式调用子代理，融合前驱输出与本节点负载，得到结果并记录
// - 逐层减少后继入度，生成下一层，直至全部可执行节点处理完毕
// 重要约束：图需为有向无环图（DAG）。若存在环，相关节点的入度不会降为 0，将永远无法进入执行层。

import (
	"context"
	"encoding/json"
	"fmt"
	"multi-agent/internal/logs"
	"strings"
	"sync"

	"multi-agent/internal/orchestrator"

	"github.com/cloudwego/eino/adk"
)

// ProcessGraph 执行最简代理图（SimpleGraph）。
// 参数：
// - ctx：上下文，用于模型调用的取消与超时控制。
// - sg：最简图（节点 id、原始 payload、边）。
// - supervisorAgent：监督者，仅负责在 text/vision 两个子代理间进行路由决策。
// - textAgent：文本子代理，处理纯文本分析与总结。
// - visionAgent：视觉子代理，处理图像相关内容（可调用 get_image 工具获取 data URL）。
// - results：输出映射，key 为节点 id，value 为节点执行结果（类型、输出文本、错误）。
// 行为：
// - 构建入度 indeg 与邻接表 adj；初始化第一层 layer（入度为 0 的节点）。
// - 逐层遍历 layer：为每个节点汇总前驱输出，询问监督者进行路由，随后显式调用对应子代理执行。
// - 写入 results；将本层已处理节点的所有后继入度减 1，入度变为 0 的加入下一层 next。
// - 直到没有新节点进入 layer，处理结束。
func ProcessGraph(ctx context.Context, sg orchestrator.SimpleGraph, supervisorAgent adk.Agent, textAgent adk.Agent, visionAgent adk.Agent, results map[string]NodeResult, printer *StreamPrinter) error {
	// 1) 构建入度（indeg）与邻接表（adj）：供分层推进使用
	indeg := make(map[string]int, len(sg.Nodes))
	adj := make(map[string][]string, len(sg.Nodes))
	// 初始化所有节点的入度为0
	for _, n := range sg.Nodes {
		indeg[n.ID] = 0
	}
	for _, e := range sg.Edges {
		// 遍历边，边的两端是节点，依据此更新节点的邻接表，表示当前节点的后继
		adj[e.From] = append(adj[e.From], e.To)
		// to是下一个节点，有边就表示有注入，入度加1
		indeg[e.To]++
	}

	// 2) 初始化第一层（layer）：所有入度为 0 的节点可立即执行
	layer := make([]string, 0)
	for id, d := range indeg {
		// 找到入度为0，表示没有依赖的节点，可作为首节点立即执行
		if d == 0 {
			layer = append(layer, id)
		}
	}

	// 3) 逐层处理：由监督者判断并调用子代理，推进拓扑执行
	// processed 记录已处理节点，用于生成下一层时判断依赖是否完成
	processed := make(map[string]struct{}, len(sg.Nodes))
	// 读写共享结构的互斥锁（results 与 processed）
	var resMu sync.Mutex
	var procMu sync.Mutex

	for len(layer) > 0 {
		// 并发上限（可根据需要调整）；同层通过信号量控制并发度
		maxConcurrent := 4
		if maxConcurrent > len(layer) {
			maxConcurrent = len(layer)
		}
		sem := make(chan struct{}, maxConcurrent)
		var wg sync.WaitGroup

		for _, id := range layer {
			wg.Add(1)
			sem <- struct{}{}
			go func(id string) {
				defer func() { <-sem; wg.Done() }()
				// 3.1) 定位当前层的具体节点实体
				var node *orchestrator.SimpleNode
				for i := range sg.Nodes {
					if sg.Nodes[i].ID == id {
						node = &sg.Nodes[i]
						break
					}
				}
				if node == nil {
					return
				}

				// 判断是否为最后一个节点（无任何后继）
				isLast := len(adj[node.ID]) == 0

				// 3.2) 收集前驱节点输出（prevs）：供监督者路由与子代理参考
				type prevInfo struct {
					ID     string `json:"id"`
					Kind   string `json:"kind"`
					Output string `json:"output"`
				}
				var prevs []prevInfo
				// 读 results 也需加锁，避免与其他 goroutine 写入冲突
				resMu.Lock()
				for _, e := range sg.Edges {
					if e.To == node.ID {
						if r, ok := results[e.From]; ok {
							prevs = append(prevs, prevInfo{ID: e.From, Kind: r.Kind, Output: r.Output})
						}
					}
				}
				resMu.Unlock()
				// Debug: 打印当前节点的直接前驱ID，便于核验
				var prevIDs []string
				for _, p := range prevs {
					prevIDs = append(prevIDs, p.ID)
				}
				if len(prevIDs) > 0 {
					logs.Infof("[graph] node=%s direct_predecessors=%v", node.ID, prevIDs)
				} else {
					logs.Infof("[graph] node=%s direct_predecessors=[]", node.ID)
				}
				prevJSON, _ := json.Marshal(prevs)

				// 3.3) 询问监督者（graph_supervisor）进行路由：只需返回 {"used":"text|vision"}
				// 注意：监督者不负责执行任务，只做选择；真正的执行在 3.5) 子代理调用。
				prompt := fmt.Sprintf(`请仅进行路由选择，不要自己完成任务。
节点ID: %s
节点负载(JSON): %s
前驱节点输出(JSON): %s
规则：
- 若节点负载包含非空 imageUrl，则选择 vision_agent；
- 否则根据负载文本与前驱输出在 text_agent/vision_agent 中选择其一。
只返回一个严格的 JSON：{"used":"text"} 或 {"used":"vision"}。`,
					node.ID, string(node.Payload), string(prevJSON))
				used, _, routerUsage, err := runRouterWithUsage(ctx, supervisorAgent, prompt)

				var kind, output, errStr string
				// 用于记录子代理执行阶段的token用量（若可获取）
				var usage *TokenUsage
				if err != nil {
					// 3.4) 路由失败兜底：记录错误并继续推进（避免单点失败导致整体中断）
					kind = "llm_routed"
					output = ""
					errStr = err.Error()
				} else {
					// 3.5) 根据路由结果显式调用子代理：
					// - 输入以文本形式融合前驱输出与当前节点负载；若为最后节点，额外注入完整图负载并改为最终总结输出
					// - 子代理返回结论文本（由 RunAgentOnce 抽取最后消息内容）
					var sb strings.Builder
					fmt.Fprintf(&sb, "处理节点: %s\n", node.ID)
					// 角色与目的：根据是否存在前驱输出与是否为最后节点进行区分
					if isLast {
						fmt.Fprintf(&sb, "## 角色与目的\n你是最后节点总结代理：结合直接前驱输出与完整负载，生成最终的中文总结、建议与最终结果（满足用户的具体交付）。\n")
					} else if len(prevs) == 0 {
						fmt.Fprintf(&sb, "## 角色与目的\n你是首节点分析代理：仅基于当前节点负载进行理解与联想。\n")
					} else {
						fmt.Fprintf(&sb, "## 角色与目的\n你是中间节点分析代理：结合上述直接前驱的输出与当前负载进行整合与延伸；不要引用未列出的其它节点。\n")
					}
					// 前驱输出
					if len(prevs) > 0 {
						fmt.Fprintf(&sb, "\n# 前驱节点输出\n")
						for _, p := range prevs {
							fmt.Fprintf(&sb, "- %s (%s): %s\n", p.ID, p.Kind, strings.TrimSpace(p.Output))
						}
					} else {
						fmt.Fprintf(&sb, "\n# 前驱节点输出\n无\n")
					}
					// 当前负载
					fmt.Fprintf(&sb, "\n# 当前节点负载(JSON)\n%s\n", string(node.Payload))
					// 若为最后节点，注入完整图负载（nodes 与 edges）
					if isLast {
						fullJSON, _ := json.Marshal(sg)
						fmt.Fprintf(&sb, "\n# 完整负载(JSON)\n%s\n", string(fullJSON))
					}
					// 输出规范（最后节点改为最终总结样式，其它节点保持精炼要点）
					if isLast {
						fmt.Fprintf(&sb, "\n## 输出要求\n- 先给出总体总结（不超过 10 句）\n- 再给出 3 条可执行建议（编号 1-3）\n- 最后输出\"最终结果\"：直接给出满足用户需求的交付内容；严格遵守用户约束（例如字数与风格）\n- 为增强可读性，可以适度使用表情符号（每条建议不超过 2 个）\n- 不输出代码块、不加额外引号\n")
					} else {
						fmt.Fprintf(&sb, "\n## 输出要求\n- 仅参考上面列出的直接前驱输出，不要引用未列出的节点\n- 结合前驱输出与当前负载进行分析/整合（首节点仅基于当前负载）\n- 直接返回结论与要点，中文，精炼（不超过 6 句）\n- 中间结果不使用表情符号\n")
					}

					// 3.6) 负载字段检查：若存在 imageUrl，则强制使用 vision（避免文本代理误判）
					var payload map[string]any
					_ = json.Unmarshal(node.Payload, &payload)
					var imageURL string
					if v, ok := payload["imageUrl"].(string); ok && v != "" {
						imageURL = v
					}

					// 最后节点强制使用文本代理用于最终总结；否则若存在图片链接则使用视觉代理
					if isLast {
						used = "text"
					} else if imageURL != "" {
						used = "vision"
					}

					var subOut string
					var subErr error
					if used == "vision" {
						kind = "vision"
						// 3.7) 图像场景：为降低 tokens，仅传递图片链接与提示，不注入 base64 数据
						if imageURL != "" {
							fmt.Fprintf(&sb, "\n# 图片链接\nURL: %s\n", imageURL)
						}
						subOut, usage, subErr = RunAgentOnceWithUsageStreaming(ctx, visionAgent, sb.String(), printer, node.ID)
					} else {
						// 默认文本代理
						kind = "text"
						subOut, usage, subErr = RunAgentOnceWithUsageStreaming(ctx, textAgent, sb.String(), printer, node.ID)
					}
					if subErr != nil {
						errStr = subErr.Error()
					}
					output = strings.TrimSpace(subOut)
					if usage != nil {
						logs.Infof("[tokens] node=%s kind=%s prompt=%d completion=%d total=%d", node.ID, kind, usage.PromptTokens, usage.CompletionTokens, usage.TotalTokens)
					}
				}
				// 3.8) 记录节点结果：包含执行类型（text/vision/llm_routed）、输出、错误，以及token用量
				var nr NodeResult
				nr.Kind = kind
				nr.Output = output
				nr.Error = errStr
				// 监督者路由阶段tokens
				if routerUsage != nil {
					logs.Infof("[tokens] node=%s router prompt=%d completion=%d total=%d", node.ID, routerUsage.PromptTokens, routerUsage.CompletionTokens, routerUsage.TotalTokens)
					nr.RouterPromptTokens = routerUsage.PromptTokens
					nr.RouterCompletionTokens = routerUsage.CompletionTokens
					nr.RouterTotalTokens = routerUsage.TotalTokens
				}
				// 若有usage则写入
				if usage != nil {
					nr.PromptTokens = usage.PromptTokens
					nr.CompletionTokens = usage.CompletionTokens
					nr.TotalTokens = usage.TotalTokens
				}
				// 写 results 需加锁
				resMu.Lock()
				results[node.ID] = nr
				resMu.Unlock()
				// 标记 processed 需加锁
				procMu.Lock()
				processed[node.ID] = struct{}{}
				procMu.Unlock()
			}(id)
		}
		// 等待本层所有并发节点完成，形成层栅栏
		wg.Wait()

		// 4) 生成下一层：对于当前层每个节点的所有后继 nb，将其入度减 1。
		//    若后继入度变为 0，则加入 next，成为下一轮可执行节点。
		next := make([]string, 0)
		for _, id := range layer {
			for _, nb := range adj[id] {
				if _, ok := processed[id]; !ok {
					continue
				}
				indeg[nb]--
				if indeg[nb] == 0 {
					next = append(next, nb)
				}
			}
		}
		// 更新当前层为下一层
		layer = next
	}

	return nil
}
