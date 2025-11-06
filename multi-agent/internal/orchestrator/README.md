# 目录说明（internal/orchestrator）

此包负责把看板导出的原始 JSON 转换为编排可用的规范化结构，并生成供智能体按图执行的最简代理图。

- `model.go`：规范化数据模型
  - 定义 `Board`、`ExportNode/ExportEdge/BoardExport`（原始导出结构）。
  - 定义 `Node/Edge/Canonical`（规范化结构，`Node.Text` 为从 `payload` 提取的文本）。
- `parser.go`：导出解析与文本抽取
  - `ParseBoardExport(path)`：读取看板导出 JSON，转换为 `Canonical`（仅保留有效的 `from/to` 边）。
  - `extractText(payload)`：从 `payload` 里挑选有意义的字符串，忽略二进制/资源类字段，生成 `Node.Text`。
- `agent.go`：最简代理图
  - 定义 `SimpleNode/SimpleEdge/SimpleGraph`（仅 id、原始 `payload` 与边）。
  - `BuildSimpleGraph(canonical)`：过滤未启用节点，保留 `RawPayload`，生成最简图供智能体执行。
- `run.go`：辅助方法
  - `imageURLFromPayload(p)`：从节点 `payload` 中提取并清洗 `imageUrl`。

## 用法
- 生成最简代理图（由 `cmd/summarize` 使用）：
  - `go run ./cmd/summarize -file ../board-export.json -agent_out ../agent-graph.json`
- 消费最简代理图（由 `cmd/process-graph` 使用）：
  - 入口通过 `graphproc.ReadSimpleGraph` 加载 `agent-graph.json`，再用 `graphproc.ProcessGraph` 执行各节点，最后由 `summary_agent` 汇总。

## 设计要点
- 保留 `RawPayload`：便于后续代理根据原始字段自由解析与扩展。
- 文本抽取用于监督：`Canonical.Node.Text` 让监督者更容易判断路由到文本/视觉子代理。
- 边保持简单：仅 `from/to`，确保拓扑执行与可视化直观。