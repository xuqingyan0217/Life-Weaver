# 目录说明（internal/graphproc）

此包封装“按图执行”的核心逻辑与工具，供 `cmd/process-graph` 入口调用。当前实现以“单文件流式执行”为主：仅在控制台打印内容，不再输出最终 JSON，不做 token 估算，也不做 JSON 兜底路由解析。

• 文件概览
- `types.go`：结果结构体
  - `NodeResult`：记录每个节点的执行类型（text/vision/llm_routed）、输出、错误，以及监督者与子代理阶段的可用 token 用量（若模型返回）。
  - `FinalResult`：整体输出（`results` 与 `summary`）。目前入口不再打印 JSON，但结构体仍用于内部数据组织。
- `loader.go`：图加载
  - `ReadSimpleGraph(path)`：读取最简代理图（`SimpleGraph`）。
- `agents.go`：代理构建
  - 构建 `text_agent`、`vision_agent`、`graph_supervisor`（仅路由）。
  - 说明：不再挂载图片下载工具；视觉代理只基于提供的 `imageUrl` 链接进行分析。原 `summary_agent` 已不再使用，最终总结由图的最后一个节点生成。
- `processor.go`：拓扑执行与路由
  - `ProcessGraph(...)`：Kahn 拓扑推进，逐层收集前驱输出，询问监督者进行路由，随后显式调用子代理执行并打印流式内容。
  - 路由规则：
    - 若节点 `payload` 中存在非空 `imageUrl`，强制路由至 `vision_agent`。
    - 其余情况下，优先依据监督者的 `transfer` 事件决定 `text`/`vision`；若无事件，则默认走 `text`。
- `runner.go`：执行器封装
  - `RunAgentOnceWithUsageStreaming(...)`：消费事件流并进行增量打印（仅打印消息内容），同时提取模型提供的 token 用量（若有）。
  - `runRouterWithUsage(...)`：仅捕获监督者的 `transfer` 事件确定路由；不再解析任意 JSON 文本，也不做 token 估算。
  - `StreamPrinter`（见 `stream.go`）：支持 verbose 模式的详细流式调试输出，打印消息角色（assistant/tool）、工具调用摘要（tool_calls）、路由事件与最终消息元信息。
• 最终总结
- 不再单独调用汇总代理；在 `processor.go` 中，最后一个节点会被识别为“无后继”的节点，并在其输入中额外注入“完整图负载（nodes 与 edges 的 JSON）”。
- 最后节点的输出要求为“先总体总结（≤10句），再 3 条可执行建议，最后输出满足用户需求的‘最终结果’（交付物，严格遵守字数/风格约束）”，直接以流式打印输出到控制台。

• 行为与约束
- 图需为 DAG（无环）；存在环时入度不会降为 0，将无法进入执行层。
- 控制台输出为逐节点的流式文本；最后一个节点承担总结与建议的输出，不再生成最终 JSON。
- token 用量仅在模型返回时记录；未返回时为 `nil`，不做估算。

• 使用方式
- 入口读取 `SimpleGraph`，调用 `BuildAgents` 获取各代理，使用 `ProcessGraph` 执行节点（最后一个节点注入完整负载并输出“总结+建议+最终结果”），所有输出均以流式形式打印到控制台。
- 调试：通过 `process-graph` 的 `-verbose=true` 参数启用详细流式调试输出（打印消息角色与流/最终消息元信息），便于排查模型是否产生真正的消息流。

• 故障排查：流式输出不生效
- 症状：执行时仅看到一次性最终输出，且为 `tool` 角色（例如 `[final role=tool] ...`），看不到 `[stream role=assistant]` 的逐字增量。
- 原因：代理配置了 `ExitTool`，导致模型以“工具退出”的形式返回最终消息，角色为 `tool`；流事件里多为工具调用摘要而非 assistant 内容。
- 解决：移除 `text_agent`、`vision_agent` 与 `graph_supervisor` 的 `ExitTool` 配置，让模型直接以 `assistant` 角色输出。
- 验证：使用 `-verbose=true` 运行，观察到大量 `[stream role=assistant]` 的增量块，以及最后的 `[final role=assistant]`。

• Verbose 输出格式说明
- `[event idx=N node=<id> has_action=<bool> has_output=<bool>]`：事件头，包含事件序号、节点 ID、是否有动作/输出。
- `- action: exit`：该事件为退出动作（以往由 `ExitTool` 触发）。
- `- output: final_message role=<assistant|tool> len=<bytes>`：最终消息的角色与长度。
- `[router event idx=N transfer to=<text|vision>]`：监督者路由事件，指向将要调用的子代理。
- `[stream role=assistant] <chunk>`：assistant 角色的内容增量（可能按字/词切分）。
- `[stream tool_calls=K]`：工具调用摘要（当前消息包含的调用数量，verbose 下可能多次打印）。
- `[final role=assistant] <content>`：最终汇总的消息内容（流关闭后一次性打印）。