## **ErgeMD —— 技术基线与架构规范**

> **本文档面向 AI Agent 开发**，是 ErgeMD 项目所有代码生成的最高约束。AI 在生成任何模块代码前，必须先阅读并遵守本规范。若发现需要引入新依赖或偏离架构设定，必须先向 PM（用户）申请确认。

---

## **一、 项目概述与开发模式**

ErgeMD 是一款专注于 Markdown 阅读的桌面应用，核心理念：**极致的渲染美感 + 丝滑的阅读体验**。以阅读为核心，同时提供轻量编辑、多窗口、导出等辅助能力。

- **开发模式**：纯 AI Agent 驱动开发（开发者扮演 PM 角色，负责架构把控与需求定义）。
- **核心原则**：前后端分离。前端（React）负责 UI 渲染与用户交互，所有文件 IO、编码检测、数据库操作必须下沉至 Rust 后端执行。
- **性能第一公理**：只渲染用户看到的，只计算用户需要的，只在必要时写入磁盘。

---

## **二、 核心技术栈（严禁自行替换）**

| 层级 | 技术选型 | 版本约束 | 说明 |
|------|----------|---------|------|
| 桌面框架 | Tauri 2 | >= 2.0 | 原生多窗口、无边框窗口 |
| 前端框架 | React 18 + TypeScript | React >= 18 | 严格类型检查 |
| 构建工具 | Vite | >= 5 | 快速 HMR |
| 状态管理 | Zustand | >= 4 | 基于选择器订阅，禁止引入 Redux |
| 样式方案 | Tailwind CSS + CSS 变量 | Tailwind >= 3.4 | 主题系统通过 CSS 变量实现 |
| Markdown 渲染 | react-markdown + remark/rehype | 最新 | 插件链架构 |
| 代码高亮 | shiki (via rehype-pretty-code) | 最新 | 延迟加载策略 |
| 数学公式 | rehype-katex | 最新 | KaTeX 渲染 |
| 图表 | remark-mermaid | 最新 | SVG 渲染 |
| 虚拟滚动 | react-virtuoso | >= 4 | 长文档性能保障 |
| 本地数据库 | SQLite (tauri-plugin-sql) | WAL 模式 | 本地存储 |
| 文件监听 | notify (Rust crate) | 最新 | 文件变更检测 |
| 编码检测 | encoding_rs + chardetng (Rust crate) | 最新 | 自动识别文件编码 |

**禁止引入的依赖**：
- ❌ Redux / MobX / Context API 作为全局状态（已选 Zustand）
- ❌ CSS-in-JS 库（styled-components / emotion）（已选 Tailwind + CSS 变量）
- ❌ 任何重型 UI 组件库（Ant Design / MUI）（自定义组件，保持轻量）
- ❌ sqlx（已选 tauri-plugin-sql）

---

## **三、 UI 与视觉规范**

### 3.1 主题系统

- **默认主题**：赛博朋克（Cyberpunk）高对比度暗黑风格。
- **实现路径**：通过 CSS 变量（`--bg-page`, `--text-primary`, `--accent-cyan` 等）定义主题 token，Tailwind 通过 `theme()` 引用 CSS 变量。
- **多主题支持**：赛博朋克（默认）、暗色、亮色、跟随系统。切换主题时只替换 CSS 变量值，不重新渲染组件。
- **霓虹色使用原则**：霓虹色（`#00FFFF`, `#FF00FF` 等）仅用于小面积点缀（链接、进度条、交互反馈），正文和标题必须使用低饱和度的优化色，确保长时间阅读不疲劳。

### 3.2 窗口模式

- **无边框窗口**（`decorations: false`），自定义标题栏。
- 标题栏阅读时自动渐隐（`opacity` 动画，300ms ease-out）。
- 标签栏与标题栏同行，同步渐隐。
- 窗口最小尺寸：800×600。

### 3.3 动画规范（性能红线）

**核心原则：只动画 `transform` 和 `opacity`，绝不触发布局重排（reflow）。**

- 侧边栏滑出：`transform: translateX`，150ms ease-out
- 标题栏渐隐：`opacity`，300ms ease-out
- 面板隔离：`contain: layout style paint`
- 降级：`@media (prefers-reduced-motion: reduce)` 禁用所有动画
- **禁止**：动画 `width`、`height`、`top`、`left`、`margin`、`padding`、`font-size` 等触发 reflow 的属性

### 3.4 排版规范

- 阅读区居中，最大宽度可调（默认 800px），两侧留白。
- 阅读区背景比页面背景稍亮，形成「画框」层次感。
- 代码块：带语言标签 + 一键复制按钮，shiki 高亮。
- 图片：`loading="lazy"`，点击放大查看。
- 表格：响应式，支持横向滚动。

---

## **四、 性能架构（严禁违背）**

### 4.1 渲染性能

- **虚拟滚动**：Markdown 长文档必须使用 `react-virtuoso`，DOM 节点数恒定。严禁使用 `.map()` 遍历渲染全量内容。
- **React 渲染锁**：所有子组件必须用 `React.memo` 包裹，计算结果用 `useMemo` / `useCallback` 缓存。严禁在渲染函数中创建新对象/函数。
- **代码高亮延迟加载**：首次渲染用 `highlight.js` 快速占位，后台编译 shiki 后替换，避免阻塞首屏。
- **图片懒加载**：所有图片 `loading="lazy"` + 占位骨架屏。

### 4.2 滚动性能

- **章节检测**：使用 `IntersectionObserver` 检测当前章节，**严禁**使用 scroll 事件监听（高频触发导致掉帧）。
- **进度计算**：使用 `requestAnimationFrame` 节流，每帧最多计算一次。
- **进度保存**：`debounce 2s`，停止滚动后才写入 SQLite。
- **CSS 层面**：`overflow: scroll` + `will-change: scroll-position`，启用 GPU 合成层。

### 4.3 启动性能

- **路由级代码分割**：阅读视图优先加载，设置面板、文件浏览器按需 `React.lazy()` 加载。
- **字体策略**：`font-display: swap`，系统字体先行，自定义字体加载后无缝替换。
- **依赖瘦身**：tree-shaking 去掉不需要的 remark/rehype 插件。
- **Tauri 启动**：Rust 侧异步初始化 SQLite，不阻塞窗口显示。

### 4.4 文件 IO 性能

- **内存缓存**：当前打开文件缓存在 Zustand store，不重复读磁盘。
- **IPC 最小化**：一次 `invoke` 返回完整数据，避免多次往返。
- **编码检测**：Rust 侧 `encoding_rs` + `chardetng` 自动检测，统一转 UTF-8 传给前端。
- **工作区扫描**：Rust 侧递归扫描，一次返回完整文件树。

### 4.5 数据库性能

- **WAL 模式**：读写不互斥，读操作不阻塞。
- **批量读取**：打开工作区时一次性读取所有文件进度。
- **延迟写入**：进度 debounce 2s，应用退出时 `on_window_close` 强制 flush。

### 4.6 性能预算

| 指标 | 目标 | 红线 |
|------|------|------|
| 首屏渲染（打开文件） | < 100ms | 不得超过 200ms |
| 滚动帧率 | 稳定 60fps | 不得低于 30fps |
| 侧边栏动画 | < 150ms | 不得超过 200ms |
| 启动到窗口显示 | < 500ms | 不得超过 1s |
| 内存占用（空闲） | < 80MB | 不得超过 150MB |

---

## **五、 架构分层与职责（严禁越界）**

### 5.1 Rust 后端职责

Rust 后端是**唯一的**数据访问层，负责：

- 文件读取/写入/编码检测（`encoding_rs` + `chardetng`）
- 工作区文件扫描（递归遍历，过滤 .md 文件）
- 文件变更监听（`notify` crate）
- SQLite 数据库操作（进度、设置、最近文件）
- 图片路径解析（相对路径 → 绝对路径）
- 导出操作（HTML/PDF 生成）
- 多窗口管理（`WebviewWindow` API）

### 5.2 React 前端职责

前端**仅负责**：

- UI 渲染与交互
- Markdown 渲染（react-markdown + 插件链）
- 状态管理（Zustand）
- 动画与过渡效果
- 用户输入处理

### 5.3 禁止事项

- ❌ 前端直接读取/写入文件系统（必须通过 Tauri Command）
- ❌ 前端直接操作 SQLite（必须通过 Tauri Command）
- ❌ Rust 后端处理 UI 逻辑
- ❌ 前端进行文件编码检测（必须由 Rust 处理）

---

## **六、 IPC 通信规范**

### 6.1 命令命名

- Rust Command 使用 `snake_case`：`read_file`, `save_reading_progress`
- 前端调用使用 `invoke<string>("command_name", { args })`

### 6.2 数据传输

- 单次 IPC 传输数据量不得超过 5MB（Markdown 文件内容）。
- 工作区扫描结果（文件树）一次性返回，但必须过滤掉非 .md 文件。
- 数据库查询结果使用分页（`LIMIT` + `OFFSET`），单次不超过 100 条。

### 6.3 事件驱动

- 文件变更通知：Rust → 前端（`file-changed` 事件）
- 跨窗口设置同步：Rust → 所有窗口（`settings-changed` 事件）
- 前端通过 `listen()` 监听事件，更新 Zustand store。

---

## **七、 状态管理规范**

### 7.1 Store 结构

```
fileStore      → 当前文件内容、文件列表、工作区、标签页
readerStore    → 阅读进度、TOC 数据、当前章节、搜索状态
settingsStore  → 主题、字体、间距等阅读设置
```

### 7.2 使用原则

- **选择器订阅**：组件必须通过选择器（selector）订阅，只在自己关心的状态变化时重渲染。
  ```typescript
  // ✅ 正确
  const theme = useSettingsStore((s) => s.theme);

  // ❌ 错误：订阅整个 store，任何变化都重渲染
  const store = useSettingsStore();
  ```

- **禁止在组件中直接修改 store**：必须通过 store 提供的 action 方法修改。
- **持久化**：仅 `settingsStore` 使用 `zustand/persist` 持久化到 localStorage。阅读进度和文件数据存储在 SQLite，不使用 Zustand 持久化。

---

## **八、 容错与防幻觉机制**

### 8.1 错误处理

- **Rust 端**：所有 Command 函数必须返回 `Result<T, String>`，严禁使用 `.unwrap()` 静默失败。
- **前端**：所有 `invoke` 调用必须 `try/catch`，错误通过 Toast 提示用户。
- **错误提示**：统一使用内联 Toast 组件，**严禁**使用系统弹窗（`alert` / `confirm`）。

### 8.2 AI 约束

- 在生成代码前，AI 必须先检查本规范中的技术栈和架构设定。
- 引入新依赖必须先向 PM 申请确认。
- 生成代码后，AI 必须自行检查是否符合性能红线和禁止事项。

---

## **九、 数据库规范**

### 9.1 Schema

```sql
-- 阅读进度
CREATE TABLE reading_progress (
    file_path TEXT PRIMARY KEY,
    scroll_percentage REAL NOT NULL DEFAULT 0,
    last_read_at INTEGER NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0
);

-- 阅读设置
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 最近打开的文件
CREATE TABLE recent_files (
    file_path TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    opened_at INTEGER NOT NULL
);

-- 工作区
CREATE TABLE workspaces (
    folder_path TEXT PRIMARY KEY,
    folder_name TEXT NOT NULL,
    opened_at INTEGER NOT NULL
);
```

### 9.2 操作规范

- 所有写操作使用 `INSERT ... ON CONFLICT DO UPDATE`（Upsert），避免先查后写。
- 进度保存使用 debounce 2s，退出时 flush。
- 数据库文件位置：`~/.ergemd/ergereader.db`（通过 Tauri `app_data_dir` 获取）。

---

## **十、 项目文件结构规范**

```
ergemd/
├── src-tauri/                  # Rust 后端
│   ├── src/
│   │   ├── main.rs             # 入口
│   │   ├── lib.rs              # Tauri Builder，插件注册
│   │   ├── commands/           # Tauri Commands（按职责分文件）
│   │   │   ├── mod.rs
│   │   │   ├── file.rs         # 文件操作
│   │   │   ├── db.rs           # 数据库操作
│   │   │   ├── workspace.rs    # 工作区扫描
│   │   │   ├── window.rs       # 多窗口管理
│   │   │   └── export.rs       # 导出操作
│   │   └── db/
│   │       ├── mod.rs
│   │       ├── init.rs          # 数据库初始化
│   │       └── models.rs        # 数据模型
│   ├── migrations/              # SQL 迁移文件
│   │   └── 001_init.sql
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                        # React 前端
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/             # 布局组件
│   │   ├── reader/             # 阅读相关组件
│   │   ├── panels/             # 侧边面板
│   │   ├── context-menu/       # 右键菜单
│   │   ├── export/             # 导出相关
│   │   ├── welcome/            # 欢迎页
│   │   └── common/             # 通用组件
│   ├── stores/                 # Zustand stores
│   ├── hooks/                  # 自定义 Hooks
│   ├── utils/                  # 工具函数
│   ├── styles/                 # 样式文件
│   │   ├── themes/             # 主题 CSS
│   │   ├── markdown.css        # Markdown 排版
│   │   └── animations.css      # 动画定义
│   └── types/                  # TypeScript 类型
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

**文件组织原则**：
- 每个文件一个职责，单文件不超过 300 行。
- 相关文件放在一起（按功能分组，不按技术层分组）。
- 组件文件名使用 PascalCase，其他文件使用 camelCase。

---

## **十一、 Git 提交规范**

- `feat:` 新功能
- `fix:` 修复 Bug
- `refactor:` 重构（不改变行为）
- `perf:` 性能优化
- `style:` 样式调整
- `chore:` 构建/工具链变更
- `docs:` 文档更新

每个 Task 完成后提交一次，commit message 格式：`feat: 简要描述做了什么`

---

## **十二、 相关文档**

- **设计文档**：`docs/superpowers/specs/2026-04-01-ergemd-design.md`
- **Phase 1 实施计划**：`docs/superpowers/plans/2026-04-01-ergemd-phase1-skeleton.md`
