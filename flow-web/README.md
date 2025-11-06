**项目概览**
- 前端基于 `Vite + React` 的白板/编排应用，用于可视化地拖拽模块、连线形成“代理图”（DAG），并与后端进行流式执行对接。
- 目标是让开发者快速理解模块/状态/动作的分层设计，便于后续维护与功能迭代（新增模块、修改编排逻辑、接入更多后端接口）。

**运行与构建**
- 开发启动：`npm run dev`（默认 `http://localhost:5173/`）。
- 构建：`npm run build`；产物由 Vite 输出到 `dist/`。
- 后端（配套服务）：在项目根 `multi-agent/` 目录运行 `go run .`（默认 `http://localhost:8080/`）。
- 主要后端接口：
  - `POST /api/graph/summarize`：从当前白板导出数据生成最简代理图（`SimpleGraph`）。
  - `POST /api/graph/process`：执行代理图；支持 `stream: true` SSE 流式返回。
  - `POST /api/images` / `DELETE /api/images/:id` / `POST /api/images/url`：模块图片资源上传/删除/URL引用。

**项目结构**
- `index.html`：应用入口，挂载 `#root`；标题为 `Life Weaver`；链接 favicon。
- `vite.config.js`：Vite 配置（端口、插件、别名等）。
- `package.json`：脚本与依赖；`npm run dev`/`build`。
- `src/`：源码目录（见下）。
  - `main.jsx`：React 入口，渲染 `App.jsx` 到 `#root`。
  - `App.jsx` / `App.css` / `index.css`：全局页面框架与样式（包含白板容器与覆盖层样式）。
  - `assets/`：静态资源（图片、图标等）。
  - `context/`：保留用于未来的全局上下文。
  - `pages/`：页面级组件（当前主页面位于 `components`，后续可迁移）。
  - `components/`：UI 组件与画板结构（详解见下）。
  - `hooks/`：行为与副作用抽象层（集中管理动作与持久化等）。
  - `utils/`：工具函数（导入导出、布局编排、坐标计算等）。
  - `public/`：静态资源（favicon 与 PWA 清单）。

**核心页面与组件**
- `components/JamBoard.jsx`
  - 功能：画板页面骨架，负责状态组装与渲染；组合各 Hook/工具函数。
  - 主要状态：
    - 视图：`boardRef/boardSize/viewOffset/isPanning/gridBg`（来自 `useBoardState`）。
    - 模型：`modules/links/linking/editingId/showModuleList/userModuleDefs`（来自 `useBoardModel`）。
    - 页面提示与按钮态：`notice/summarizeLoading/processLoading`。
    - URL 导入：`urlImportForId/urlInputText/urlImportLoading/urlImportError`。
    - 新增：`nodeStreams`（key 为节点 id，value 为流式输出文本；供每个节点下方面板展示）。
  - 行为：通过 `useBoardActions` 获取导出/导入/重置/自动编排/执行等动作；将 `nodeStreams` 传入 `BoardStage`。

- `components/board/BoardStage.jsx`
  - 功能：画板主舞台；渲染模块、连线与连接器层；应用 `viewOffset`；控制 `arranging/panning` 交互态。
  - 输入：`modules/links/linking/...` 与 `nodeStreams`。
  - 渲染：为每个启用模块渲染 `ModuleItem` 并传入对应的 `nodeStreamText`。

- `components/board/ModuleItem.jsx`
  - 功能：单个模块的渲染与交互（拖拽、编辑、删除）。
  - 交互：
    - 点击拖拽移动位置。
    - 编辑（`contenteditable`），保持输入法组合和光标位置（`caretInfoRef` 与组合态队列）。
    - 右键显示删除框，支持删除后端图片资源（若存在）。
  - 渲染约定：模块的 `render(m, onPayloadChange, edit)` 由模块定义提供；`onPayloadChange(patch)` 负责合并到模块 `payload`。
  - 流式输出面板：`nodeStreamText` 非空时，在模块正下方渲染一个“流式输出”框，`white-space: pre-wrap` 显示增量文本；位置与宽度跟随模块。

- `components/board/BoardToolbar.jsx`
  - 功能：顶部工具栏；提供“导出”“生成代理图”“执行（流式）”“清理布局”“清空画板”“网格背景切换”“模版侧栏开关”等。

- `components/panels/ModuleListPanel.jsx`
  - 功能：模块清单侧栏；支持搜索、过滤（“仅启用”“仅改动”）、按模板添加实例、保存当前编辑为模板。

- `components/defs/registry.jsx`
  - 功能：内置模块与贴纸类型的注册入口（`defaultUserModuleDefs`），包含 `name/defaultSize/defaultPayload/connectable/render`。
  - 与 `components/modules/*`、`components/stickers/*` 共同定义可用类型。

- `components/defs/defaultLayout.js`
  - 功能：默认布局（模块集合），用于无缓存或“恢复默认”时的初始画板。

- `components/modules/*`（示例）
  - `AgendaPanel.jsx`、`StickyNote.jsx`、`ActionCard.jsx`、`DogPhoto.jsx` 等模块，遵循如下约定：
    - `payload`：模块数据对象；
    - `onPayloadChange(patch)`：将局部修改写回；
    - `edit`：`{ isEditing, stopEditing, id, openUrlDialog }` 提供编辑态与工具；
    - 若 `connectable: true`，模块会在左右显示连接器端口，支持连线。

- `components/stickers/*`
  - 装饰类“贴纸”组件（不可连接），如 `LoveIt.jsx` 等。

**Hooks 层**
- `hooks/useBoardState.js`
  - 管理画板视图状态：容器引用、尺寸、视图偏移、是否拖拽中、网格背景。

- `hooks/useBoardModel.js`
  - 管理核心模型：连线集合、连线交互态、编辑态、模板集合。
  - 提供助手（如 `bringToFront/addModuleFromDef/saveTemplateFromEditing/finishLink`）。

- `hooks/useBoardPersistence.js`
  - 本地持久化：监听 `modules/links/viewOffset/templates` 写入 `localStorage`。
  - 恢复工具：`getInitialStateFromCache()`、`mapPersistedTemplatesToDefs()`。
  - 清理：`clearBoardCache()` 与键名统一管理（`STORAGE_KEYS`）。

- `hooks/useAutoArrange.js`
  - 自动编排：根据画板尺寸与初始模块集合进行位置插值，支持动画与视图校准。

- `hooks/useBoardStartup.js`
  - 启动流程：在缓存存在时恢复 `viewOffset/links`；否则触发一次自动编排；控制 `isReady` 显示。

- `hooks/useCloseOnEscape.js`
  - 通用 ESC 关闭逻辑 Hook（用于弹窗/确认框等）。

- `hooks/useMergeUserDefs.js`
  - 首次合并恢复的用户模板到运行时状态，确保 `render` 能从基模板推导。

- `hooks/useBoardActions.js`
  - 集中操作：导出/导入、清空、恢复默认、背景拖拽、在当前视图添加实例、生成代理图、执行（流式）。
  - 关键动作：
    - `summarizeToBackend()`：构造 `SimpleGraph` 请求后端生成代理图；将结果缓存于 `lastGraphRef`。
    - `processGraphStreaming()`：若无图先 `summarize`，之后请求后端 `stream: true`；使用 `fetch + getReader()` 解析 SSE：
      - 将每个事件块以空行分段，取 `data:` 后的整段数据作为正文。
      - 识别边界行 `=== node=<id> ===` 切换当前节点，并将后续文本累积到 `nodeStreams[id]`。
      - 移除每次累积时的强制换行，按原始文本拼接，避免“一字一行”。
    - 其余：`exportBoard/importBoard/clearBoardInstances/restoreDefaultLayout/clearCacheAndArrange/onBackgroundPointerDown` 等。

**Utils 层**
- `utils/board-io.js`
  - 导入/导出工具：
    - 构建导出 JSON（模块/连线/视图）；
    - 文件下载、解析；
    - 与后端 `summarize` 的输入保持同构。

- `utils/board-initial.js`
  - 初始模块构造：`computeInitialModules(cache, mergedUserDefs)` 优先使用缓存，否则用默认布局。

- `utils/layout-arrange.js`
  - 自动编排算法：位置插值、对齐与视图偏移重置，支持动画。

- `utils/layout.js`
  - 布局相关的小工具（坐标/尺寸/插值等）。

**核心数据模型**
- 模块（node）：`{ id, x, y, w, h, z, type, connectable?, editable?, enabled, payload? }`
- 连线（edge）：`{ from, to, color, intent?, params? }`
- 视图（view）：`{ x, y }`（`viewOffset`）与画布尺寸 `boardSize`。
- 模板（def）：`{ name, defaultSize, defaultPayload, connectable, render }`（用户模板的 `render` 由基模板推导）。

**模块开发约定**
- 新增模块步骤：
  - 在 `components/modules/` 中创建组件，约定 `payload/onPayloadChange(edit)` 接口。
  - 在 `components/defs/registry.jsx` 注册类型（`name/defaultSize/defaultPayload/connectable/render`）。
  - 若需要连接能力，设 `connectable: true` 并在渲染中尊重 `payload` 的数据结构。
  - 如涉及图片资源，使用后端接口上传/删除，避免导出过大。

**流式执行与前端展示**
- 后端流式：服务端以 SSE `data:` 事件推送增量文本，节点输出由 `StreamPrinter` 包围：
  - 边界行：`=== node=<id> ===`（注意服务端会在边界行前写一个换行）。
  - 文本：按模型增量消息逐步打印，最终以空行结束一个节点。
- 前端解析：`useBoardActions.processGraphStreaming` 按事件块解析，提取 `data:` 后的整段并识别边界行；把文本写入 `nodeStreams[id]`。
- UI 展示：`ModuleItem.jsx` 在模块下方渲染“流式输出”面板，实时显示该节点的执行内容。

**持久化与恢复**
- `useBoardPersistence` 写入 `localStorage`：
  - `jam.modules.v1`（模块实例集合，不含 `render`）、`jam.links.v1`、`jam.view.v1`、`jam.templates.v1`（用户模板）。
- 读取缓存：`getInitialStateFromCache()`；合并模板：`useMergeUserDefs()`。

**常见工作流**
- 添加一个模块并连接：
  - 在侧栏选中模块模板 → 点击画板添加 → 拖拽到合适位置 → 从输出端口拖拽到目标模块输入端口。
- 执行图：
  - 点击工具栏“生成代理图”→ 成功后点击“执行（流式）”→ 观察每个节点下方的流式输出。
- 清理与编排：
  - 点击“清理布局”清空缓存并自动编排；“恢复默认”回到 `defaultLayout`。

**样式与可访问性**
- 全局样式：`index.css`/`App.css` 控制画板容器、覆层、弹窗等；
- 模块与面板样式以内联为主，必要时可抽取到 CSS。
- Toast/Modal 带有基本的 `role`/`aria` 属性。

**扩展建议**
- 页面拆分：将 Jam 页面迁移至 `pages/`，保留 `components/` 为可复用 UI。
- 高性能渲染：模块较多时引入虚拟化或分区渲染。
- 模板管理：抽象模板 CRUD 与分类；支持导入/导出模板库。
- 执行日志：在右侧增加全局日志面板，按节点分组、可折叠、可复制，保留节点下方就地展示。

**约定与风格**
- 状态管理以 Hook 为中心，页面仅做骨架与组装。
- 工具函数保持纯函数，不引入 UI 侧副作用。
- 命名统一使用小写短横线的类型键（例如 `agenda-panel`）。
- 避免在导出 JSON 中存储 Base64 图片，优先后端存储与引用。

**已知限制**
- SSE 边界行由服务端写入，当前以换行开头；前端已兼容，但若换为标准化 `data:` 每行前缀会更稳妥。
- 图需为 DAG（无环）；存在环时不会进入执行层。

**维护清单（快速定位）**
- 页面骨架：`components/JamBoard.jsx`
- 主舞台：`components/board/BoardStage.jsx`
- 单模块：`components/board/ModuleItem.jsx`
- 工具栏：`components/board/BoardToolbar.jsx`
- 模块清单：`components/panels/ModuleListPanel.jsx`
- 模块注册：`components/defs/registry.jsx`
- 默认布局：`components/defs/defaultLayout.js`
- 动作合集：`hooks/useBoardActions.js`
- 持久化：`hooks/useBoardPersistence.js`
- 启动编排：`hooks/useBoardStartup.js`、`hooks/useAutoArrange.js`
- 其它 Hook：`hooks/useCloseOnEscape.js`、`hooks/useMergeUserDefs.js`
- 工具函数：`utils/board-io.js`、`utils/board-initial.js`、`utils/layout-arrange.js`、`utils/layout.js`

**变更记录（近期）**
- 新增节点级流式输出面板：`JamBoard.jsx` 引入 `nodeStreams`，`BoardStage.jsx` 传递到 `ModuleItem.jsx`；`useBoardActions.processGraphStreaming` 解析 SSE 并按节点写入，解析时因为后端对于节点信息做了特殊处理，所以我们是sse解析时普通事件，用 chunk.replace(/^data:\\s?/, '') 取得 data: 后的整个正文，并将前导空白/换行去掉，再匹配 === node=<id> === 边界，之后的文本累积到对应节点。；去除逐 token 的强制换行。