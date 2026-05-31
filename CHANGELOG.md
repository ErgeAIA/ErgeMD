# 更新日志

本项目的所有重要变更都会记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [Unreleased]

## [0.3.0] - 2026-05-31

### 新增

- PlantUML 图表支持：新增 `@plantuml/core` 渲染库，支持 16+ 图表类型（序列图、类图、活动图、组件图、状态图、对象图、用例图、部署图、时序图、网络图、ER 图、思维导图、WBS 工作分解结构、JSON/YAML 可视化）
- PlantUML 右键菜单：支持 SVG 预览、编辑图表功能
- PlantUML 串行渲染队列：解决 `@plantuml/core` 全局变量导致的并发冲突
- Word 导出功能：支持将 Markdown 文档导出为 `.docx` 格式
- PDF 导出优化：重构导出逻辑，使用 HTML 中转 + WebView2 PrintToPdf API 替代 `window.print()`，支持带样式/黑白双模式，支持分页和颜色保护
- 自动更新检查器：新增 `UpdateChecker` 组件，支持检查应用更新
  - 双平台检测：同时查询 GitHub 和 Gitee 最新 Release，取版本号更高者
  - 每天一次：启动时检查距上次检测是否超过 24 小时
  - 一键下载：点击「下载」按钮直接打开 Release 页面

### 修复

- PlantUML 暗黑主题适配：通过 `injectThemeStyles()` 函数向 SVG 内部注入主题样式，解决外部 CSS 无法覆盖内联样式的问题
- PlantUML 时序图/网络图/甘特图/Wireframe 渲染失败：确认 `@plantuml/core` 支持的图表类型，替换不支持的图表为替代方案（WBS 图、用例图）
- PlantUML 并发渲染问题：实现串行渲染队列，确保同一时间只处理一个渲染任务
- PlantUML `viz-global.js` 加载失败：通过动态创建 `<script>` 标签加载 UMD 模块
- Word 导出失败：修复 `exportDocx.ts` 中的兼容性问题
- i18n 翻译 key 缺失：补充 `common.preview`、`common.edit`、`common.cancel`、`common.save`、`quickEdit.unsavedWarning`、`quickEdit.unsaved`、`quickEdit.synced`、`reader.preview` 等翻译

### 变更

- Markdown 解析逻辑：`parseMarkdownBlocks()` 新增 PlantUML 代码块识别（`plantuml`/`puml`）
- 导出模块重构：`export.ts` 重构导出逻辑，统一处理流程
- i18n 国际化：更新中英文语言文件

### 细节优化

- 状态栏优化：显示当前编辑状态
- 阅读体验优化：MarkdownBlockView 组件增强

## [0.2.2] - 2026-05-29

### 细节优化

## [0.2.1] - 2026-05-29

### 修复

- YAML Frontmatter 解析：移除对 `gray-matter` 库的依赖，该库在浏览器环境中不可用（依赖 Node.js Buffer），改用手动解析方案
- YAML Frontmatter 渲染：修复解析失败时显示原始内容的问题
- 目录生成：添加 frontmatter 区域跳过逻辑，防止 frontmatter 字段被错误识别为标题

## [0.2.0] - 2026-05-29

### 新增

- Obsidian Callout：支持 13 种内置类型（note/abstract/info/todo/tip/success/question/warning/failure/danger/bug/example/quote）及别名映射，支持自定义标题、可折叠（+/-）、嵌套渲染
- Obsidian Wikilink：支持 `[[note]]`、`[[note|text]]`、`[[note#heading]]`、`[[note#^blockId]]`、`[[#heading]]` 格式解析与渲染
- Obsidian Embed：支持 `![[file]]` 内嵌引用，按扩展名自动识别图片/PDF/音频/视频/笔记类型，图片加载失败时显示 fallback
- Obsidian 高亮语法：`==text==` 渲染为 `<mark>` 标签
- Obsidian 注释语法：`%%text%%` 渲染时自动隐藏
- Obsidian 块 ID：`^block-id` 渲染为不可见锚点
- Obsidian Frontmatter：YAML frontmatter（`---` 包裹）识别为独立 block 并格式化渲染
- Obsidian 按需加载：`useObsidianModule` hook 仅在检测到 Obsidian 语法时激活组件覆盖，普通 Markdown 文件零开销
- 代码块保护：预处理函数自动保护 fenced code 和 inline code 内容不被误替换
- 14 个主题适配：每个主题添加 13 个 `--obsidian-callout-*` CSS 变量，Callout 颜色跟随主题切换

### 变更

- 移除旧版 Admonition 系统（9 种类型、内联检测逻辑），由 Obsidian Callout 模块完全替代
- `MarkdownBlockType` 新增 `frontmatter` 类型
- `parseMarkdownBlocks()` 两套解析逻辑均支持 frontmatter block 识别

## [0.1.1] - 2026-05-22

### 修复

- 文件关联打开失败：Windows 冷启动时 `tauri://file-open` 事件不触发，添加命令行参数解析作为兜底
- 欢迎页最近文件不显示：`init_database` 与 `get_recent_files` 存在竞态条件，添加 `dbReady` 状态同步

### 变更

- README.md 新增"从源码构建"和"下载"章节，完善开源文档

## [0.1.0] - 2026-05-16

### 新增

- Markdown 渲染：GFM、数学公式（KaTeX）、代码高亮、Mermaid 图表、任务列表
- 阅读体验：虚拟滚动、进度追踪、14 种主题
- 工作区管理：多标签页、文件树
- 导出功能：HTML、DOCX、PDF
- 浮动目录（TOC）：自动生成章节导航
- 专注模式：沉浸式阅读
- 右键菜单：复制、编辑、导出、图片/链接/代码块专属操作
- 快速编辑：双击段落编辑
- 文件关联：支持 `.md` 和 `.markdown` 文件
- 全局快捷键：窗口管理、标签导航、阅读控制
