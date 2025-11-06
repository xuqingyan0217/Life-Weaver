# Life Weaver

**项目概览**
- 前端：基于 `Vite + React` 的白板/编排应用，支持拖拽模块、连线生成“代理图（DAG）”，与后端进行流式执行对接。
- 后端：Go + Gin 的多智能体执行服务，将前端导出的编排数据转为最简代理图并按拓扑顺序执行，通过 SSE 向前端推送增量文本。

**目录结构**
- `flow-web/`：前端工程（白板与编排 UI、SSE 展示、导入导出等）。
- `multi-agent/`：后端服务（HTTP 服务、图摘要与执行、多智能体协作、图片上传接口等）。
- `uploads/`（后端下）：运行时图片存储目录。

**前端页面一览**
- 示例截图：
  
![前端页面示例](multi-agent/statics/example.png)

**视频功能展示**
- 请点击链接观看：
  - [▶️ 观看演示视频（MP4）](multi-agent/statics/life_weaver.mp4)
  

**快速开始**
- 启动后端：在项目根运行 `go run ./multi-agent/main.go`（默认 `http://localhost:8080/`）。
- 启动前端：进入 `flow-web/`，运行 `npm install && npm run dev`（默认 `http://localhost:5173/`）。
- 在前端画板：
  - 点击“生成代理图（后端）”→ 成功后点击“执行（流式）”；
  - 每个节点的输出以小框显示，并可展开查看完整内容。

**前端说明（flow-web）**
- 技术栈与脚本：`Vite + React`，`npm run dev`/`npm run build`，构建产物在 `flow-web/dist/`。
- 核心页面：`components/JamBoard.jsx` 作为骨架，组合状态、动作与渲染；`BoardStage.jsx` 渲染模块与连线；`ModuleItem.jsx` 负责单模块拖拽、编辑、删除与流式输出面板。
- 流式输出：`useBoardActions.processGraphStreaming()` 解析后端 SSE，识别 `=== node=<id> ===` 边界，将增量文本累积至 `nodeStreams[id]`；`ModuleItem.jsx` 就地展示小框并支持展开。
- 导入导出：`BoardToolbar.jsx` 提供“导出编排数据/导入编排数据”；导出仅包含有效节点与连线，便于后端摘要生成。
- 本地持久化：`useBoardPersistence.js` 将 `modules/links/view/templates/nodeStreams` 写入 `localStorage`；支持恢复默认布局与一键清空画板。

**后端说明（multi-agent）**
- 技术与入口：`Go + Gin`；入口 `multi-agent/main.go`；路由与 SSE 在 `internal/httpserver`；编排解析与图生成在 `internal/orchestrator`；图执行与多智能体在 `internal/graphproc`。
- 智能体协作：包含监督者（路由决策）、文本代理（文本分析）、视觉代理（图像分析），按 Kahn 分层推进，层内并发上限默认 `4`。
- 命令行工具：
  - 生成最简图：`go run ./multi-agent/cmd/summarize -file ../board-export.json -agent_out ../agent-graph.json`
  - 本地执行（控制台流式验证）：`go run ./multi-agent/cmd/process-graph -file ../agent-graph.json -verbose=false`

**接口与流式执行（SSE）**
- `POST /api/graph/summarize`：输入前端导出的 `BoardExport` 或文件路径，返回 `SimpleGraph`。
- `POST /api/graph/process`：输入 `SimpleGraph` 或文件路径，`stream=true` 则以 `text/event-stream` 返回增量文本；非流模式返回 `{status,nodes,edges,results}`。
- SSE 事件约定：
  - 正常增量：`data: <chunk>\n\n`；每个节点开始时会推送边界行 `=== node=<id> ===`（前端据此切换当前节点）。
  - 错误事件：`event: error\ndata: <message>\n\n`。
- 图片接口：`POST /api/images`（上传）；`DELETE /api/images/:id`（删除）；`POST /api/images/url`（按 URL 引用，返回 `{id,url}`）。

**环境变量与模型选择**
- 模型切换：`MODEL_TYPE=ark` 或 `openai`（默认 OpenAI）。
- Ark：`ARK_API_KEY`, `ARK_MODEL`, `ARK_BASE_URL`。
- OpenAI：`OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`, `OPENAI_BY_AZURE`（如走 Azure）。
- 示例参考：`multi-agent/.example.env` 与根 `.env`（注意不要提交真实密钥）。

**常见工作流**
- 画板编排 → 导出 → 后端摘要生成 → 执行（流式）→ 前端就地展示每节点输出。
- 也可离线：用 `cmd/summarize` 生成 `agent-graph.json`，再用 `cmd/process-graph` 控制台流式验证。

**维护与扩展建议**
- 前端：模块类型可在 `components/defs/registry.jsx` 注册与扩展；建议抽象模板管理与右侧全局日志面板。
- 后端：可在文本/视觉代理中挂载工具（检索、下载等），完善错误重试与节点耗时统计；根据需要增加并发与日志落盘（可扩展到 `internal/logs`）。

详尽说明可参阅：
- `flow-web/README.md`（前端架构、组件与工作流）
- `multi-agent/README.md`（后端架构、接口、SSE 契约与运维建议）