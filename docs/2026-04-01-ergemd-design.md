# ErgeMD 设计文档

> A minimal Markdown reader by 宝藏二哥(Erge)
>
> 日期：2026-04-01

---

## 1. 项目概述

### 1.1 产品定位

ErgeMD 是一款专注于 Markdown 阅读的桌面应用。核心理念：**极致的渲染美感 + 丝滑的阅读体验**。以阅读为核心，同时提供轻量编辑、多窗口、导出等辅助能力。

### 1.2 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 桌面框架 | Tauri 2 | 轻量、高性能、跨平台，原生多窗口支持 |
| 前端框架 | React 18 + TypeScript | 组件化开发 |
| 构建工具 | Vite | 快速构建、HMR |
| 状态管理 | Zustand | 轻量、基于选择器订阅 |
| 样式方案 | Tailwind CSS + CSS 变量 | 主题系统 |
| Markdown 渲染 | react-markdown + remark/rehype 插件链 | 生态成熟，扩展性强 |
| 代码高亮 | shiki (via rehype-pretty-code) | VSCode 级别高亮 |
| 数学公式 | rehype-katex | LaTeX 渲染 |
| 图表 | remark-mermaid | 流程图、时序图等 |
| 虚拟滚动 | react-virtuoso | 长文档性能保障 |
| 数据库 | SQLite (tauri-plugin-sql) | 本地存储 |
| 文件监听 | notify (Rust crate) | 文件变更检测 |
| 编码检测 | encoding_rs (Rust crate) | 自动识别文件编码 |
| 国际化 | i18next | 中英双语支持 |

### 1.3 目标平台

主要 Windows，兼顾 macOS 和 Linux（Tauri 2 跨平台能力）。

### 1.4 国际化 / i18n

ErgeMD 支持中英双语（中文 / English），默认跟随系统语言，用户可在设置中手动切换。

#### 语言策略

| 原则 | 说明 |
|------|------|
| 默认跟随系统 | 首次启动根据 `navigator.language` 自动选择 |
| 手动切换 | 设置面板中提供语言选项 |
| 热切换 | 切换语言无需重启应用 |
| 双语文件 | 翻译文件独立管理，按语言分文件存储 |

#### 翻译范围

| 范围 | 是否翻译 | 说明 |
|------|---------|------|
| UI 文案 | ✅ | 按钮、菜单、标签、提示文字 |
| 快捷键提示 | ✅ | 如「打开文件 Ctrl+O」 |
| 错误提示 | ✅ | Toast 消息 |
| 设置项标签 | ✅ | 字体、字号、行间距等 |
| Markdown 内容 | ❌ | 用户文档内容不做翻译 |
| 文件名/路径 | ❌ | 保持原始文件名 |
| 代码块内容 | ❌ | 保持原始代码 |

#### 翻译文件结构

```
src/
├── i18n/
│   ├── index.ts          # i18next 初始化配置
│   ├── zh-CN.json        # 中文翻译
│   └── en-US.json        # 英文翻译
```

#### 翻译键命名规范

- 嵌套层级：`{模块}.{功能}.{文案}`
- 示例：

```json
// zh-CN.json
{
  "welcome": {
    "title": "ErgeMD",
    "subtitle": "A minimal Markdown reader by 宝藏二哥",
    "openFile": "打开文件",
    "openFolder": "打开文件夹",
    "dragHint": "拖拽 Markdown 文件到此处打开"
  },
  "titleBar": {
    "minimize": "最小化",
    "maximize": "最大化",
    "close": "关闭"
  },
  "statusBar": {
    "wordCount": "{{count}} 字",
    "progress": "{{percent}}%"
  },
  "contextMenu": {
    "copy": "复制",
    "selectAll": "全选",
    "search": "搜索...",
    "editParagraph": "编辑此段落",
    "exportHtml": "导出为 HTML",
    "exportPdf": "导出为 PDF",
    "openInNewWindow": "在新窗口中打开"
  },
  "settings": {
    "title": "设置",
    "font": "字体",
    "fontSize": "字号",
    "lineHeight": "行间距",
    "letterSpacing": "字间距",
    "paragraphSpacing": "段落间距",
    "pageWidth": "页面宽度",
    "theme": "主题",
    "language": "语言",
    "autoSaveProgress": "自动保存阅读进度"
  },
  "error": {
    "fileNotFound": "文件不存在",
    "permissionDenied": "权限不足",
    "encodingError": "无法识别文件编码",
    "readFailed": "文件读取失败"
  }
}
```

```json
// en-US.json
{
  "welcome": {
    "title": "ErgeMD",
    "subtitle": "A minimal Markdown reader by 宝藏二哥",
    "openFile": "Open File",
    "openFolder": "Open Folder",
    "dragHint": "Drag Markdown files here to open"
  },
  "titleBar": {
    "minimize": "Minimize",
    "maximize": "Maximize",
    "close": "Close"
  },
  "statusBar": {
    "wordCount": "{{count}} words",
    "progress": "{{percent}}%"
  },
  "contextMenu": {
    "copy": "Copy",
    "selectAll": "Select All",
    "search": "Search...",
    "editParagraph": "Edit Paragraph",
    "exportHtml": "Export as HTML",
    "exportPdf": "Export as PDF",
    "openInNewWindow": "Open in New Window"
  },
  "settings": {
    "title": "Settings",
    "font": "Font",
    "fontSize": "Font Size",
    "lineHeight": "Line Height",
    "letterSpacing": "Letter Spacing",
    "paragraphSpacing": "Paragraph Spacing",
    "pageWidth": "Page Width",
    "theme": "Theme",
    "language": "Language",
    "autoSaveProgress": "Auto Save Reading Progress"
  },
  "error": {
    "fileNotFound": "File not found",
    "permissionDenied": "Permission denied",
    "encodingError": "Unable to detect file encoding",
    "readFailed": "Failed to read file"
  }
}
```

#### 主题名称翻译

| 中文 | English |
|------|---------|
| 赛博朋克 | Cyberpunk |
| 暗色 | Dark |
| 亮色 | Light |
| 跟随系统 | System |

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    React 前端                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │
│  │ 欢迎页    │ │ 标签栏    │ │ 阅读视图  │ │ 设置面板  │ │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │
│  │ 文件列表  │ │ 浮动 TOC │ │ 搜索栏   │ │ 右键菜单  │ │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 快速编辑  │ │ 导出面板  │ │ 图片预览  │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│              Zustand Store (fileStore / readerStore / settingsStore) │
├─────────────────────────────────────────────────────────┤
│                   Tauri Commands (IPC)                   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐   │
│  │                   Rust 后端                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │   │
│  │  │ 文件系统    │  │ SQLite DB  │  │ 文件监听   │ │   │
│  │  │ 读取/扫描  │  │ 进度/设置  │  │ notify     │ │   │
│  │  │ 写入/导出  │  │           │  │            │ │   │
│  │  └────────────┘  └────────────┘  └────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
用户点击文件
    ↓
Rust: 读取文件内容 (Tauri Command, 同步)
    ↓
Rust: 编码检测 → UTF-8 转换 (encoding_rs)
    ↓
前端: 接收内容 → 立即渲染 Markdown + 提取 TOC
    ↓
前端: 异步从 SQLite 读取阅读进度 → 恢复滚动位置
    ↓
用户阅读中...
    ↓
前端: IntersectionObserver 检测当前章节 → 更新 TOC 高亮
    ↓
前端: requestAnimationFrame 计算阅读进度 → 更新进度条
    ↓
前端: debounce 2s → Rust: 写入 SQLite 保存进度
```

### 2.3 数据存储

**存储分离原则**：
- 文件内容：始终从磁盘实时读取，不做持久化缓存（保证与源文件同步）
- 内存缓存：当前打开的文件内容缓存在 Zustand store 中，避免重复 IPC 调用
- 元数据：SQLite 数据库，存储阅读进度、阅读设置、最近文件列表

**数据库位置**：`~/.ergemd/ergereader.db`

**SQLite 配置**：
- WAL 模式：读写不互斥
- 异步初始化：应用启动时不阻塞窗口显示
- 延迟写入：进度保存 debounce 2s，退出时 flush 兜底

### 2.4 数据库 Schema

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

-- 标签系统（预留，当前不实现）
-- CREATE TABLE tags (...);
-- CREATE TABLE file_tags (...);
```

---

## 3. UI 设计

### 3.1 窗口模式

- **无边框窗口**（Tauri `decorations: false`），自定义标题栏
- 标题栏内容：应用图标 + 当前文件名 + 窗口控制按钮（最小化/最大化/关闭）
- **阅读时标题栏自动渐隐**：开始滚动后 1s 渐隐，鼠标移到顶部区域时渐入
- 标签栏与标题栏同行，阅读时同步渐隐

### 3.2 主界面布局

```
┌──────────────────────────────────────────────────────┐
│  ErgeMD  │ tab1 │ tab2 │ tab3 │         [—][□][×]   │  ← 标题栏+标签栏（阅读时渐隐）
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────┐                                           │
│  │ TOC  │          正文内容...                        │
│  │(浮动)│                                           │
│  │      │                                           │
│  │·H1 ✓ │                                           │
│  │·H2   │                                           │
│  │·H2   │                                           │
│  │·H1   │                                           │
│  └──────┘                                           │
│                                                      │
├══════════════════════════════════════════════════════┤  ← 2px 阅读进度条
│              1,234 字 · 42%                           │  ← 状态栏（无边框，居中）
└──────────────────────────────────────────────────────┘
```

### 3.3 左侧面板 — 文件列表

- **触发方式**：鼠标移到屏幕左边缘（8px 触发区）
- **外观**：深空蓝背景（`#1A1A2E`），树形文件列表，只显示 .md 文件
- **交互**：
  - 选中文件后自动丝滑隐藏（150ms ease-out）
  - 支持工作区模式（文件夹扫描）和单文件打开
  - 文件树结构展示文件夹层级
- **动画**：`transform: translateX(-100%) → translateX(0)`，GPU 加速

### 3.4 浮动 TOC（章节导航）

- **定位**：`position: fixed`，浮动在阅读区域左侧，层级在内容之上
- **外观**：半透明背景（`rgba(26,26,46,0.85)`），与文件列表完全不同的视觉风格
- **字体**：比正文稍大，清晰醒目
- **行为**：
  - 使用 `IntersectionObserver` 检测当前章节，零性能开销
  - 当前章节高亮（主题色 + 加粗），已读章节稍淡
  - TOC 列表自动滚动，保持当前章节在视野内
  - 鼠标悬停时停止自动滚动，方便点击跳转
  - 鼠标离开后恢复跟随阅读进度
- **层级**：只显示 H1-H3，H4 及以下折叠

### 3.5 右侧面板 — 阅读选项

- **触发方式**：鼠标移到屏幕右边缘（8px 触发区）
- **外观**：与左侧面板风格一致
- **设置项**：

| 设置项 | 类型 | 范围 | 默认值 |
|--------|------|------|--------|
| 语言 / Language | 下拉选择 | 中文 / English | 跟随系统 |
| 字体 | 下拉选择 | 系统字体列表 | 思源黑体 |
| 字号 | 滑块 | 14-32px | 16px |
| 行间距 | 下拉 | 1.0/1.5/1.8/2.0 | 1.8 |
| 字间距 | 滑块 | 0-8px | 0px |
| 段落间距 | 滑块 | 0-40px | 16px |
| 页面宽度 | 滑块 | 600-1200px | 800px |
| 背景色 | 预设色板 | 主题预设 | 跟随主题 |
| 文字色 | 预设色板 | 自动匹配背景 | 跟随主题 |
| 主题 | 选择 | 赛博朋克/暗色/亮色/跟随系统 | 赛博朋克 |
| 自动保存进度 | 开关 | 开/关 | 开 |

### 3.6 阅读区域

- **排版**：居中，最大宽度可调（默认 800px），两侧留白
- **内容层次**：阅读区背景比页面背景稍亮，形成「画框」感
- **代码块**：带语言标签 + 一键复制按钮，shiki 高亮
- **图片**：自适应宽度，`loading="lazy"`，点击可放大查看
- **表格**：响应式，支持横向滚动
- **数学公式**：KaTeX 渲染，支持行内和块级
- **Mermaid 图表**：渲染为 SVG
- **脚注**：标准 `[^1]` 语法支持

### 3.7 底部状态栏

- **进度条**：紧贴状态栏上方，2px 高，主题色填充已读比例
- **状态栏**：无边框，文字居中，半透明背景融入阅读区
- **内容**：`{字数} 字 · {百分比}%` / `{count} words · {percent}%`
- **交互**：滚动过程中状态栏文字淡出（opacity 降低），停止滚动 500ms 后淡入

### 3.8 欢迎页 / 空状态

首次打开或无文件时显示：
- 应用 Logo + 名称 "ErgeMD"
- 副标题 "A minimal Markdown reader by 宝藏二哥"
- 「拖拽文件到此处打开」/ "Drag Markdown files here to open" 提示区域
- 「打开文件」/ "Open File" 按钮（Ctrl+O）
- 「打开文件夹」/ "Open Folder" 按钮（Ctrl+Shift+O）
- 最近打开的文件列表（最多 10 条）

### 3.9 搜索栏

- **触发**：`Ctrl+F`
- **位置**：阅读区顶部，浮动显示
- **功能**：实时搜索高亮，Enter/Shift+Enter 跳转上下一个匹配项
- **关闭**：Esc 或点击关闭按钮

---

## 4. 主题系统

### 4.1 主题列表

| 主题 | 说明 |
|------|------|
| 赛博朋克（默认） | 深色背景 + 霓虹点缀，二哥个人风格 |
| 暗色 | 标准暗色主题，适合日常使用 |
| 亮色 | 浅色背景，适合白天使用 |
| 跟随系统 | 自动切换亮色/暗色 |

### 4.2 赛博朋克主题配色

基于二哥的个人色板优化，核心原则：**霓虹色做点缀，优化色做内容，暗色做背景**。

#### 背景层

| 用途 | 颜色 | 色值 |
|------|------|------|
| 页面背景 | 暗黑背景 | `#0A0A0F` |
| 阅读区背景 | 深空蓝变体 | `#12121A` |
| 侧边栏背景 | 深空蓝 | `#1A1A2E` |
| 代码块背景 | 深空蓝变体 | `#16162A` |

#### 正文层（护眼优先）

| 用途 | 颜色 | 色值 |
|------|------|------|
| 主文字 | 霓虹白优化版 | `#C8C8C8` |
| 次要文字 | 灰色优化版 | `#787882` |
| 弱化文字 | 深灰 | `#50505A` |

#### 标题层级

| 级别 | 颜色 | 色值 |
|------|------|------|
| H1 | 霓虹白 | `#E0E0E0` |
| H2 | 霓虹青优化版 | `#64C8C8` |
| H3 | 电光紫优化版 | `#B464C8` |
| H4 | 荧光橙优化版 | `#C89650` |

#### 代码高亮

| 用途 | 颜色 | 色值 |
|------|------|------|
| 关键字 | 电光紫优化版 | `#B464C8` |
| 字符串 | 霓虹绿优化版 | `#64B478` |
| 数字 | 荧光橙优化版 | `#C89650` |
| 注释 | 深灰 | `#50505A` |
| 函数名 | 赛博蓝优化版 | `#6496C8` |
| 代码文字 | 霓虹白优化版 | `#C8C8C8` |

#### 强调与交互（霓虹色点缀）

| 用途 | 颜色 | 色值 |
|------|------|------|
| 链接 | 霓虹青 | `#00FFFF` |
| 行内代码 | 霓虹粉优化版 | `#FF6496` |
| 引用边框 | 电光紫 | `#BF00FF` |
| 进度条 | 霓虹青 | `#00FFFF` |
| 活跃标签 | 霓虹青 | `#00FFFF` |
| 悬停效果 | 霓虹青半透明 | `rgba(0,255,255,0.1)` |
| 选中高亮 | 霓虹青半透明 | `rgba(0,255,255,0.15)` |
| 代码块语言标签 | 荧光橙 | `#FF8000` |
| 复制成功提示 | 霓虹绿 | `#00FF64` |
| 搜索高亮 | 霓虹黄 | `#FFFF00` |
| 错误提示 | 激光红 | `#FF0040` |
| 滚动条 | 深空蓝 | `#1A1A2E` |

---

## 5. 性能策略

### 5.1 性能预算

| 指标 | 目标 |
|------|------|
| 首屏渲染（打开文件） | < 100ms |
| 滚动帧率 | 稳定 60fps |
| 侧边栏动画 | < 150ms |
| 启动到窗口显示 | < 500ms |
| 内存占用（空闲） | < 80MB |

### 5.2 渲染性能

- **虚拟滚动**：react-virtuoso，只渲染可视区域内的 Markdown 节点，DOM 节点数恒定
- **React 渲染锁**：`React.memo` 包裹所有子组件，`useMemo` 缓存解析结果
- **代码高亮延迟加载**：首次用 highlight.js 快速占位，后台编译 shiki 后替换
- **图片懒加载**：`loading="lazy"` + 占位骨架屏

### 5.3 滚动性能

- **章节检测**：`IntersectionObserver` 代替 scroll 事件，零性能开销
- **进度计算**：`requestAnimationFrame` 节流，每帧最多计算一次
- **进度保存**：debounce 2s，停止滚动后才写入 SQLite
- **CSS 层面**：`overflow: scroll` + `will-change: scroll-position`，GPU 合成层

### 5.4 动画性能

**原则：只动画 `transform` 和 `opacity`，绝不触发布局重排。**

- 侧边栏滑出：`transform: translateX`
- 标题栏渐隐：`opacity`
- 面板隔离：`contain: layout style paint`
- 动画时长：150ms ease-out
- 降级：`@media (prefers-reduced-motion: reduce)`

### 5.5 启动性能

- **路由级代码分割**：阅读视图优先加载，设置面板、文件浏览器按需加载
- **字体策略**：`font-display: swap`，系统字体先行，自定义字体加载后替换
- **依赖瘦身**：tree-shaking 去掉不需要的插件
- **Tauri 启动**：Rust 侧异步初始化 SQLite，不阻塞窗口显示

### 5.6 文件 I/O 性能

- **内存缓存**：当前打开文件缓存在 Zustand store，不重复读磁盘
- **文件变更监听**：Rust 侧 notify crate 监听，Tauri Event 推送到前端
- **工作区扫描**：Rust 侧递归扫描，一次返回完整文件树
- **IPC 最小化**：一次 invoke 返回完整数据，避免多次往返
- **编码检测**：encoding_rs 自动检测，统一转 UTF-8

### 5.7 数据库性能

- **WAL 模式**：读写不互斥
- **批量读取**：打开工作区时一次性读取所有文件进度
- **延迟写入**：进度 debounce 2s，退出时 flush

### 5.8 状态管理

使用 Zustand，基于选择器订阅，组件只在自己关心的状态变化时重渲染。

```
fileStore      → 当前文件内容、文件列表、工作区、标签页
readerStore    → 阅读进度、TOC 数据、当前章节、搜索状态
settingsStore  → 主题、字体、间距、语言等阅读设置
```

---

## 6. 交互设计

### 6.1 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+O` | 打开文件 |
| `Ctrl+Shift+O` | 打开文件夹（工作区） |
| `Ctrl+W` | 关闭当前标签页 |
| `Ctrl+Tab` | 切换到下一个标签页 |
| `Ctrl+Shift+Tab` | 切换到上一个标签页 |
| `Ctrl+滚轮` | 调整字体大小 |
| `Ctrl+Shift+T` | 切换主题 |
| `Ctrl+F` | 文内搜索 |
| `Ctrl+,` | 打开设置 |
| `Esc` | 退出阅读 / 关闭面板 / 关闭搜索 |
| `Ctrl+N` | 新建窗口 |

### 6.2 拖拽支持

- 拖拽 .md 文件到窗口 → 打开文件
- 拖拽文件夹到窗口 → 打开为工作区

### 6.3 文件变更处理

- Rust 侧 notify 监听当前打开文件的变化
- 检测到外部修改后，阅读区顶部显示轻量提示条：「文件已更新，点击重新加载」/ "File updated, click to reload"
- 不自动刷新，避免打断阅读

### 6.4 错误处理

- 统一使用内联 toast 提示，不使用系统弹窗
- 错误类型：文件不存在、权限不足、编码无法识别、文件读取失败
- Toast 自动 3s 消失，可手动关闭
- 所有错误提示支持中英双语

### 6.5 右键菜单

自定义 React 组件实现，不使用系统原生右键菜单，保持赛博朋克风格一致。每个菜单不超过 7 项，用分隔线分组，只显示当前上下文可用的选项。所有菜单文案支持中英双语。

#### 6.5.1 阅读区域（正文）

| 菜单项 | 说明 | 条件 |
|--------|------|------|
| 复制 / Copy | 复制选中文本 | 有选中文本时 |
| 全选 / Select All | 选中全部内容 | 始终 |
| 搜索... / Search... | 用选中文本触发搜索 | 有选中文本时 |
| ---分隔线--- | | |
| 编辑此段落 / Edit Paragraph | 双击编辑的快捷入口 | 始终 |
| ---分隔线--- | | |
| 导出为 HTML / Export as HTML | 导出当前文档 | 始终 |
| 导出为 PDF / Export as PDF | 导出当前文档 | 始终 |
| ---分隔线--- | | |
| 在新窗口中打开 / Open in New Window | 多窗口支持 | 始终 |

#### 6.5.2 代码块

| 菜单项 | 说明 | 条件 |
|--------|------|------|
| 复制代码 / Copy Code | 复制整个代码块 | 始终 |
| 复制选中 / Copy Selection | 复制选中的代码 | 有选中文本时 |
| ---分隔线--- | | |
| 编辑代码块 / Edit Code Block | 进入编辑模式 | 始终 |

#### 6.5.3 图片

| 菜单项 | 说明 | 条件 |
|--------|------|------|
| 复制图片 / Copy Image | 复制到剪贴板 | 始终 |
| 放大查看 / View Full Size | 全屏预览 | 始终 |
| ---分隔线--- | | |
| 在新窗口打开图片 / Open Image in New Window | 用系统默认程序打开 | 始终 |
| 复制图片路径 / Copy Image Path | 复制图片的文件路径 | 始终 |

#### 6.5.4 链接

| 菜单项 | 说明 | 条件 |
|--------|------|------|
| 打开链接 / Open Link | 在默认浏览器中打开 | 始终 |
| 复制链接地址 / Copy Link Address | 复制 URL | 始终 |

#### 6.5.5 标签栏

| 菜单项 | 说明 | 条件 |
|--------|------|------|
| 关闭标签页 / Close Tab | 关闭当前标签 | 始终 |
| 关闭其他标签 / Close Other Tabs | 关闭除当前外的所有标签 | 有多个标签时 |
| 关闭右侧标签 / Close Tabs to Right | 关闭当前标签右侧的所有 | 右侧有标签时 |
| ---分隔线--- | | |
| 在新窗口中打开 / Open in New Window | 将此文件移到新窗口 | 始终 |
| ---分隔线--- | | |
| 复制文件路径 / Copy File Path | 复制当前文件的完整路径 | 始终 |
| 在资源管理器中显示 / Reveal in Explorer | 打开文件所在目录 | 始终 |

#### 6.5.6 文件列表

| 菜单项 | 说明 | 条件 |
|--------|------|------|
| 打开 / Open | 在当前标签页打开 | 始终 |
| 在新标签页打开 / Open in New Tab | 新建标签页打开 | 始终 |
| 在新窗口中打开 / Open in New Window | 新窗口打开 | 始终 |
| ---分隔线--- | | |
| 复制文件路径 / Copy File Path | | 始终 |
| 在资源管理器中显示 / Reveal in Explorer | | 始终 |
| ---分隔线--- | | |
| 从最近列表移除 / Remove from Recent | 从最近打开列表中移除 | 始终 |

#### 6.5.7 浮动 TOC

| 菜单项 | 说明 | 条件 |
|--------|------|------|
| 跳转到此章节 / Jump to Section | 滚动到该章节 | 始终 |
| 复制章节标题 / Copy Section Title | 复制标题文本 | 始终 |
| ---分隔线--- | | |
| 导出此章节为 HTML / Export Section as HTML | 仅导出选中章节 | 始终 |

---

## 7. 功能模块

### 7.1 多窗口支持

- **策略**：共享设置，独立内容（方案 B）
- **实现**：Tauri 2 原生 `WebviewWindow` API
- **设置同步**：窗口间共享主题/字体/语言等设置，新窗口启动时从 SQLite 读取
- **内容隔离**：每个窗口独立的文件和阅读进度
- **跨窗口通信**：Tauri 2 Event 系统广播（如主题变更通知所有窗口更新）
- **内存预算**：3-5 个窗口约 200-400MB，可接受

### 7.2 快速编辑模式

- **策略**：双击快速编辑（方案 C），保持阅读器核心定位
- **交互流程**：
  1. 双击某个段落 → 该段落就地变为 textarea 编辑状态
  2. 编辑内容 → 按 `Ctrl+Enter` 保存，按 `Esc` 取消
  3. 保存 → 写回源文件 → 重新渲染 Markdown
- **适用场景**：小改动（改错别字、调整一段话）
- **后续迭代**：如需重度编辑，再加完整源码编辑模式（CodeMirror 6）

### 7.3 导出功能

#### 7.3.1 导出 HTML

- **实现**：从渲染后的 DOM 提取 HTML，内联 CSS，生成完整 HTML 文件
- **导出范围**：整个文档 / 选中章节（通过右键菜单触发）
- **选项**：是否内联 CSS、是否内联图片（base64）

#### 7.3.2 导出 PDF

- **第一版**：使用 Tauri 的 print-to-pdf（`WebviewWindow.print()`），零额外依赖
- **导出范围**：整个文档 / 选中章节
- **选项**：纸张大小（A4/Letter）、边距、是否包含页眉页脚
- **后续迭代**：如用户对 PDF 质量不满意，考虑集成 wkhtmltopdf

---

## 8. Rust 后端 Tauri Commands

### 8.1 文件操作

| Command | 说明 | 参数 | 返回 |
|---------|------|------|------|
| `read_file` | 读取文件内容 | `{ path: string }` | `{ content: string, encoding: string }` |
| `write_file` | 写入文件内容 | `{ path: string, content: string }` | `void` |
| `scan_workspace` | 扫描工作区 md 文件 | `{ folder_path: string }` | `FileTree` |
| `resolve_image_path` | 解析图片相对路径 | `{ base_path: string, relative_path: string }` | `{ absolute_path: string }` |
| `pick_file` | 文件选择对话框 | `{ filters?: FileFilter[] }` | `{ path: string } \| null` |
| `pick_folder` | 文件夹选择对话框 | - | `{ path: string } \| null` |
| `show_in_explorer` | 在资源管理器中显示 | `{ path: string }` | `void` |
| `export_html` | 导出为 HTML 文件 | `{ content: string, css: string, path: string, options: ExportHtmlOptions }` | `void` |
| `export_pdf` | 导出为 PDF 文件 | `{ path: string, options: ExportPdfOptions }` | `void` |

### 8.2 数据库操作

| Command | 说明 | 参数 | 返回 |
|---------|------|------|------|
| `get_reading_progress` | 获取阅读进度 | `{ file_path: string }` | `ReadingProgress \| null` |
| `save_reading_progress` | 保存阅读进度 | `{ file_path, scroll_percentage, word_count }` | `void` |
| `get_all_progress` | 批量获取进度 | `{ paths: string[] }` | `Map<string, ReadingProgress>` |
| `get_settings` | 获取设置 | `{ key: string }` | `string \| null` |
| `save_setting` | 保存设置 | `{ key: string, value: string }` | `void` |
| `get_recent_files` | 获取最近文件 | `{ limit?: number }` | `RecentFile[]` |
| `add_recent_file` | 添加最近文件 | `{ file_path, file_name }` | `void` |
| `remove_recent_file` | 移除最近文件 | `{ file_path: string }` | `void` |
| `flush_progress` | 强制写入所有缓存进度 | - | `void` |

### 8.3 窗口操作

| Command | 说明 | 参数 | 返回 |
|---------|------|------|------|
| `new_window` | 创建新窗口 | `{ file_path?: string, workspace_path?: string }` | `void` |

### 8.4 事件

| Event | 方向 | 说明 |
|-------|------|------|
| `file-changed` | Rust → Frontend | 文件外部修改通知 |
| `settings-changed` | Rust → Frontend | 跨窗口设置变更通知 |

---

## 9. 项目结构

```
ergemd/
├── src-tauri/                  # Rust 后端
│   ├── src/
│   │   ├── main.rs             # 入口
│   │   ├── commands/           # Tauri Commands
│   │   │   ├── mod.rs
│   │   │   ├── file.rs         # 文件操作（读/写/导出）
│   │   │   ├── db.rs           # 数据库操作
│   │   │   ├── workspace.rs    # 工作区扫描
│   │   │   └── window.rs       # 多窗口管理
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── init.rs          # 数据库初始化
│   │   │   └── models.rs        # 数据模型
│   │   └── watcher.rs          # 文件监听
│   ├── migrations/              # SQL 迁移文件
│   │   └── 001_init.sql
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                        # React 前端
│   ├── main.tsx                # 入口
│   ├── App.tsx                 # 根组件
│   ├── i18n/
│   │   ├── index.ts            # i18next 初始化配置
│   │   ├── zh-CN.json          # 中文翻译
│   │   └── en-US.json          # 英文翻译
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx    # 自定义标题栏
│   │   │   ├── TabBar.tsx      # 标签栏
│   │   │   ├── StatusBar.tsx   # 状态栏 + 进度条
│   │   │   └── ProgressBar.tsx
│   │   ├── reader/
│   │   │   ├── MarkdownView.tsx    # Markdown 渲染
│   │   │   ├── FloatingTOC.tsx     # 浮动目录
│   │   │   ├── CodeBlock.tsx       # 代码块（高亮+复制）
│   │   │   ├── ImagePreview.tsx    # 图片放大查看
│   │   │   ├── SearchBar.tsx       # 文内搜索
│   │   │   ├── MermaidDiagram.tsx  # Mermaid 图表
│   │   │   └── QuickEdit.tsx       # 快速编辑（双击段落）
│   │   ├── panels/
│   │   │   ├── FileList.tsx        # 文件列表（左侧）
│   │   │   ├── ReadingOptions.tsx  # 阅读选项（右侧）
│   │   │   └── SettingsPanel.tsx   # 设置面板
│   │   ├── context-menu/
│   │   │   ├── ContextMenu.tsx         # 右键菜单容器
│   │   │   ├── ReaderContextMenu.tsx   # 阅读区右键菜单
│   │   │   ├── CodeBlockContextMenu.tsx
│   │   │   ├── ImageContextMenu.tsx
│   │   │   ├── LinkContextMenu.tsx
│   │   │   ├── TabContextMenu.tsx
│   │   │   ├── FileListContextMenu.tsx
│   │   │   └── TOCContextMenu.tsx
│   │   ├── export/
│   │   │   ├── ExportPanel.tsx        # 导出选项面板
│   │   │   └── ExportOptions.tsx      # 导出参数配置
│   │   ├── welcome/
│   │   │   └── WelcomePage.tsx     # 欢迎页
│   │   └── common/
│   │       ├── Toast.tsx           # 提示组件
│   │       ├── FileDropZone.tsx    # 拖拽区域
│   │       └── Icon.tsx            # 图标组件
│   ├── stores/
│   │   ├── fileStore.ts        # 文件状态
│   │   ├── readerStore.ts      # 阅读状态
│   │   └── settingsStore.ts    # 设置状态
│   ├── hooks/
│   │   ├── useReadingProgress.ts   # 阅读进度逻辑
│   │   ├── useTOCObserver.ts       # TOC IntersectionObserver
│   │   ├── useFileWatcher.ts       # 文件变更监听
│   │   ├── useKeyboardShortcuts.ts # 快捷键
│   │   ├── useAutoHide.ts          # 自动隐藏逻辑
│   │   ├── useContextMenu.ts       # 右键菜单逻辑
│   │   └── useQuickEdit.ts         # 快速编辑逻辑
│   ├── utils/
│   │   ├── markdown.ts         # Markdown 解析工具
│   │   ├── toc.ts              # TOC 提取
│   │   ├── wordCount.ts        # 字数统计
│   │   └── export.ts           # 导出工具（HTML/PDF）
│   ├── styles/
│   │   ├── themes/
│   │   │   ├── cyberpunk.css   # 赛博朋克主题
│   │   │   ├── dark.css        # 暗色主题
│   │   │   └── light.css       # 亮色主题
│   │   ├── markdown.css        # Markdown 排版样式
│   │   ├── context-menu.css    # 右键菜单样式
│   │   └── animations.css      # 动画定义
│   └── types/
│       └── index.ts            # TypeScript 类型定义
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## 10. 预留扩展

### 10.1 标签系统（当前不实现）

架构预留：
- 数据库 Schema 中预留 tags 和 file_tags 表
- 文件列表和阅读视图预留标签入口位置
- 标签面板可复用右侧面板的交互模式

### 10.2 完整源码编辑模式（当前不实现）

架构预留：
- 快速编辑模式验证用户编辑需求
- 如需重度编辑，后续集成 CodeMirror 6 实现完整源码编辑

### 10.3 高质量 PDF 导出（当前不实现）

架构预留：
- 第一版使用 Tauri print-to-pdf
- 如用户对质量不满意，后续集成 wkhtmltopdf

### 10.4 其他可能扩展

- 云同步阅读进度
- 自定义 CSS 主题
- Markdown 编辑模式增强
- 更多语言支持（日语、韩语等）

---

## 11. 开发路线图

采用分阶段交付策略，每个阶段产出可运行、可验证的里程碑版本。

### Phase 1: 基础骨架

**目标**：搭建项目骨架，能打开窗口并显示欢迎页。

| 内容 | 交付物 |
|------|--------|
| Tauri 2 + React + Vite 项目初始化 | 项目结构 |
| Tailwind CSS + CSS 变量主题系统 | 赛博朋克配色基础 |
| 无边框窗口 + 自定义标题栏 | 可拖拽、最小化/最大化/关闭 |
| SQLite 数据库初始化 | WAL 模式，完整 Schema |
| Zustand 设置 Store | 持久化 |
| 欢迎页 | Logo + 打开文件/文件夹按钮 |
| Rust 文件操作命令 | 读取、写入、工作区扫描 |

**实施计划**：`docs/superpowers/plans/2026-04-01-ergemd-phase1-skeleton.md`

### Phase 2: 核心阅读

**目标**：能打开 .md 文件并渲染阅读。

| 内容 | 交付物 |
|------|--------|
| Markdown 渲染（react-markdown + remark/rehype） | GFM + 代码高亮 + KaTeX + Mermaid + 脚注 |
| 文件打开（单文件 + 工作区） | 文件列表 + 文件树 |
| TOC 提取 | 标题层级解析 |
| 基础阅读布局 | 阅读区 + 内容居中 |

### Phase 3: UI 精雕

**目标**：完整的沉浸式阅读界面。

| 内容 | 交付物 |
|------|--------|
| 标签栏 | 多标签页切换 |
| 左侧面板（文件列表） | 边缘触发，选文件后自动隐藏 |
| 浮动 TOC | 跟随阅读进度，IntersectionObserver |
| 右侧面板（阅读选项） | 字体、字号、行距等设置滑块 |
| 底部状态栏 + 进度条 | 字数 + 百分比，滚动时文字淡出 |
| 标题栏渐隐 | 阅读时自动隐藏 |
| 丝滑动画 | transform + opacity，150ms ease-out |

### Phase 4: 阅读功能

**目标**：完整的阅读体验。

| 内容 | 交付物 |
|------|--------|
| 阅读进度记忆 | 内容百分比，debounce 2s 写入 SQLite |
| 文内搜索 | Ctrl+F，实时高亮，Enter 跳转 |
| 键盘快捷键 | Ctrl+O/W/F/滚轮 等 |
| 拖拽打开文件 | 文件 + 文件夹 |
| 文件变更检测 | notify crate，提示重新加载 |
| 图片路径解析 | 相对路径转绝对路径 |
| 图片放大查看 | 点击全屏预览 |
| 欢迎页完善 | 最近打开文件列表 |

### Phase 5: 主题系统

**目标**：可定制的视觉体验。

| 内容 | 交付物 |
|------|--------|
| 赛博朋克主题（默认） | 完整配色方案 |
| 暗色主题 | 标准暗色 |
| 亮色主题 | 浅色背景 |
| 跟随系统 | 自动切换 |
| 阅读选项面板 | 字体、字号、行距、间距、背景色、文字色 |
| 代码高亮主题适配 | 每个主题的代码配色 |

### Phase 6: 高级功能

**目标**：完整功能集。

| 内容 | 交付物 |
|------|--------|
| 快速编辑模式 | 双击段落编辑，Ctrl+Enter 保存 |
| 导出 HTML | DOM 提取 + 内联 CSS |
| 导出 PDF | Tauri print-to-pdf |
| 多窗口支持 | 共享设置，独立内容 |
| 右键菜单 | 7 个区域的上下文菜单 |
| 错误处理 | 内联 toast 提示 |
| 国际化 | 中英双语支持 |
