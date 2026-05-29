# 更新日志

本项目的所有重要变更都会记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

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
