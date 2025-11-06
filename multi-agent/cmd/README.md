# 命令说明（cmd）

本目录包含两个可执行入口，用于将前端导出的板面数据转换为最简代理图，并按图执行智能体流程：

- `process-graph`：按最简代理图执行 text/vision 子代理（最终总结由最后一个节点生成）
  - 用法：
    - `go run ./cmd/process-graph -file ../agent-graph.json [-verbose=true]`
  - 行为：
    - 读取 `agent-graph.json`（或你指定的文件），构建监督者/文本代理/视觉代理。
    - 依照拓扑顺序路由到合适子代理并执行每个节点，所有输出以“流式内容”打印到控制台；最后一个节点会注入完整图负载并输出“总体总结+3条建议+最终结果（交付物）”。
  - 备注：
    - 若节点 `payload` 中存在非空 `imageUrl`，会强制路由至 `vision_agent`；其余情况在没有监督者转移事件时默认走 `text_agent`。
    - `-verbose=true` 时开启详细调试输出：打印消息流的角色与最终消息的角色，以及路由事件与工具调用摘要，便于检查是否为真正的流式输出。
    - 需要在 `multi-agent/.env` 配置模型相关环境变量。

- `summarize`：将板面导出 JSON 转为最简代理图
  - 用法：
    - `go run ./cmd/summarize -file ../board-export.json -agent_out ../agent-graph.json`
  - 行为：
    - 读取 `board-export.json`（或你指定的导出文件），解析出启用的节点与有效连线。
    - 生成 `agent-graph.json`，仅保留每个节点的原始 `payload` 与有向边，便于后续按图执行。
  - 备注：
    - 控制台会打印节点和边的数量，便于快速核对。

建议流程：先运行 `summarize` 生成/更新代理图，再运行 `process-graph` 完成图执行（最后节点输出总结与建议，流式打印）。

## Verbose 输出格式快速解读
- `[event idx=N node=<id> has_action=<bool> has_output=<bool>]`：事件头；N 为事件序号。
- `- action: exit`：退出动作（历史上由 `ExitTool` 触发，现已移除）。
- `- output: final_message role=<assistant|tool> len=<bytes>`：最终消息的角色与长度。
- `[router event idx=N transfer to=<text|vision>]`：监督者路由事件，指明调用的子代理。
- `[stream role=assistant] <chunk>`：assistant 角色的增量内容（逐字/逐句）。
- `[stream tool_calls=K]`：工具调用摘要（当前消息包含的调用数量，verbose 下可能重复出现）。
- `[final role=assistant] <content>`：最终消息全文（流关闭后一次性打印）。

## 常见问题：看不到流式增量
- 现象：只有一次性输出，且角色是 `tool`；控制台无 `[stream role=assistant]`。
- 原因：代理使用了 `ExitTool`，最终消息以 `tool` 角色返回；流事件以工具调用为主。
- 解决：移除 `text_agent`、`vision_agent`、`graph_supervisor` 的 `ExitTool`，让模型直接以 `assistant` 角色输出。
- 验证：加 `-verbose=true` 运行，观察到 `[stream role=assistant]` 与 `[final role=assistant]`。