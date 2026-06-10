# 更新日志

本项目的所有重要变更都会记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [Unreleased]

### 新增

- **macOS 支持**：ErgeMD 现可在 macOS 11+ 上运行，提供 Apple Silicon 与 Intel 通用 .dmg
- **Linux 支持**：ErgeMD 现可在 Ubuntu 22.04+ / Debian 12+ 上运行，提供 .AppImage 与 .deb
- **平台检测工具**：`src/utils/platform.ts` 提供统一平台判断；`detectPlatform()` 与 `getPlatformLabel()`
- **更新检查跨平台化**：`update.rs` 按 `target_os` 关键字匹配对应平台资产（Windows NSIS、macOS DMG、Linux AppImage）
- **reveal_in_explorer 跨平台化**：macOS 走 `open -R`，Linux 走 `xdg-open`，Windows 保持 `explorer /select,`
- **单元测试基础设施**：Vitest（前端） + cargo test（Rust）双层测试套件，CI 强制跑测试

### 变更

- **PDF 导出**：macOS / Linux 走系统打印对话框（用户需手动选择「存储为 PDF」）；Windows 仍走 WebView2 PrintToPdf
- **TitleBar**：macOS 上隐藏自绘最小化 / 最大化 / 关闭按钮，避免与系统红绿灯冲突
- **tauri.conf.json**：`bundle.targets` 扩展为 `["nsis", "app", "dmg", "appimage", "deb"]`，启用三大平台打包
- **release.yml**：从单平台 Windows 扩展为 4 平台矩阵（Windows x64 / macOS arm64 / macOS x64 / Linux x64）
- **rename-bundle.js**：按 `process.platform` / `BUILD_PLATFORM` 环境变量分流，支持 .app / .dmg / .AppImage / .deb

### 备注

- 跨平台首版 **不启用** macOS 代码签名（免费软件策略），用户需右键 → 打开绕过 Gatekeeper

## [0.3.7] - 2026-06-10

### 变更

- Windows 安装包构建移除 MSI 产物：`tauri.conf.json` 的 `bundle.targets` 由 `["nsis", "msi"]` 改为 `["nsis"]`，CI 仅产出 NSIS 安装包与便携 zip；降低构建时间与发布体积（MSI 用户群体极少，且企业批量部署场景未启用）
- 更新检查默认下载链接改为 NSIS 安装包：Rust 端 `pick_msi_download_url` 重命名为 `pick_nsis_download_url`，优先匹配 `*setup.exe` 资产（NSIS 安装包），其次回退到 `*-portable.zip`（便携版），最后回退到 release html_url；不再解析 `.msi` 资产

## [0.3.6] - 2026-06-10

### 新增

- Mermaid 集成 ZenUML 外部插件：新增 `@mermaid-js/mermaid-zenuml@0.2.3` 依赖，实现 6.15 节 ZenUML 序列图的原生渲染；`MermaidDiagram` 通过 `ensureZenumlRegistered()` 在 `mermaid.initialize()` 之前幂等注册插件，仅检测到 `zenuml` 关键字时按需懒加载 `@zenuml/core`
- Mermaid 升级至 11.15.0：内置 Event Modeling 事件建模图支持，6.23 节 `eventmodeling` 关键字可直接渲染（无需外部插件）
- MermaidDiagram 主题类型扩展：补全 `ChartColors.zenuml`（text / border / bg）与 `getMermaidColors()` 的 CSS 变量透传；同步透传基础 fontColor / fontFamily，确保 ZenUML 与全局主题风格一致
- MermaidDiagram 主题适配：新增 ZenUML 与 Event Modeling 主题变量映射（`mermaid-zenuml.css` / `mermaid-eventmodeling.css`），通过 SVG 后处理注入 `!important` 规则覆盖 ZenUML 插件硬编码的内联颜色
- 主题 CSS 变量补全：为 ZenUML 新增 `--mermaid-zenuml-lifeline` / `--mermaid-zenuml-message` 变量，为 Event Modeling 新增 15 个 `em*` 系列变量（ui / processor / readmodel / command / event 五类 box、关系线、泳道、箭头）

### 变更

- `vite.config.ts` 的 `chunkSizeWarningLimit` 由 600 提升至 6500：ZenUML 外部插件引入的 `@zenuml/core@^3.47.0` 依赖较大，mermaid chunk 从 ~1MB 膨胀至 ~6MB；仅消除构建警告，产物体积实际未变
- `UNSUPPORTED_DIAGRAM_TYPES` 清空：移除 `zenuml` 与 `eventmodeling` 标记，对应图表均已支持
- `MarkdownSyntaxExample.md`：6.15 节 ZenUML 与 6.23 节事件建模图说明由「暂不支持」更新为「支持说明」

### 修复

- 主题适配后 ZenUML 消息线不可见：`.fragment-border` 原始 CSS 为 `fill: none`（透明），主题适配误将其 `fill` 改为不透明背景色导致遮挡消息线；恢复 `fill: none` 并保留 `stroke` 主题适配

## [0.3.5] - 2026-06-06

### 新增

- 关于页版本号右侧新增最新版本徽章：AboutPage 打开时自动调用 `forceCheckUpdate` 检测，发现新版本时在「↻」右侧显示绿色 `↑ v{latestVersion}` 徽章，点击直接打开最新版的 MSI 安装包下载链接
- ToastMessage 新增 `action` 字段：Toast 可携带可点击的按钮（如「下载」），点击调用 `openUrl` 打开外部链接
- 更新检查结果增加 `download_url` 字段：Rust 端 `fetch_github_latest` / `fetch_gitee_latest` 从 release 的 `assets` 中优先匹配 `.msi` 文件的 `browser_download_url`，未命中时 fallback 到 release 页面 `html_url`

### 修复

- 关于页点击「↻」后无可见反馈：检测到新版本时显式设置 `latestAvailable` state，让右侧徽章立即出现；同时 Toast 提示文本可携带「下载」action 按钮

## [0.3.4] - 2026-06-06

### 修复

- 远程图片无法渲染：新增 `fetch_remote_image_as_data_url` 后端命令，通过 Rust reqwest 客户端代理下载远程图片并转为 base64 data URL，绕过 Tauri WebView 的 CORS、防盗链和网络限制；前端 `ContextMenuImage` 组件对 `http` 开头的图片 src 改走后端代理，后端失败时 fallback 为 WebView 直接加载

## [0.3.3] - 2026-06-04

### 新增

- 关于页版本号旁新增「↻」手动检查更新按钮：点击立即触发 `check_update` 后端命令，绕过 24h 缓存限制，解决客户端因缓存窗口内不重新检查而错过新版本提示的问题
- 新增 `forceCheckUpdate` 工具函数：从 `UpdateChecker` 模块导出，可被任意组件复用触发一次强制更新检查

### 修复

- Toast 通知不可见：移除 `ToastItem` 内联样式中覆盖动画终态的 `opacity: 0` / `transform: translateX(20px)`，让 `toast-enter` 关键帧的 `forwards` 模式正常生效
- Toast 被关于页遮罩遮挡：Toast 容器 z-index 由 `z-50` 提升到 `z-[400]`，确保能盖过 `AboutPage` 的背景遮罩（z-100）和二维码弹窗（z-300）

## [0.3.2] - 2026-06-04

### 修复

- 欢迎页最近打开单条关闭失效：新增 `delete_recent_file` 后端命令，关闭单条记录时同步删除数据库记录，刷新后不再恢复

## [0.3.1] - 2026-06-01

### 新增

- PDF 导出独立管线：从复用阅读组件改为从 Markdown 原文直接生成完整 HTML，不再依赖虚拟滚动/IntersectionObserver/懒加载等阅读场景逻辑
- PlantUML 导出渲染：新增 `renderPlantUmlForExport` 函数，复用组件内串行队列渲染 SVG
- F12 彩蛋恢复：恢复按 F12 打开彩蛋页面的快捷键功能

### 修复

- PDF 导出图表不渲染：彻底解决 Mermaid 和 PlantUML 图表在 PDF 导出中不显示的问题（包括序列图、类图、活动图、状态图、用例图等全部 16+ 类型）
- PDF 多文档导出错误：从 `useFileStore.getState().currentContent` 获取当前文档内容，而非 `document.querySelector`（之前永远选到第一个 Tab 的内容）
- PDF 导出性能优化：渲染 HTML 与弹出保存位置对话框并行进行（`Promise.all`），用户选位置的时间"隐藏"在渲染时间中
- 内联 Markdown 解析：图片正则先于链接正则执行，解决带链接的图片语法 `[![alt](src)](url)` 被错误解析为纯链接的问题
- 内联 Markdown 转义：`renderInlineMarkdown` 先匹配正则再 HTML 转义，解决 `\[!NOTE]` 等转义语法被误解析为链接的问题
- Obsidian Callout 图标不显示：修复示例文档中 Admonition 提示框因转义语法 `\[!NOTE]` 导致 callout 检测失败、图标无法渲染的问题
- Obsidian Callout 转义兼容：检测正则增加对 `\[!TYPE]` 转义写法的兼容支持
- 阅读器代码块字体不跟随缩放：移除 `<pre>` 元素的 `text-[13px]` 硬编码，改为 `0.9em` 相对单位使代码块字号跟随阅读设置缩放

### 变更

- PDF 导出重构：`exportPdf.ts` 重写，调用 `generateExportHtml` 从 Markdown 原文生成完整静态 HTML（含所有 Mermaid/PlantUML SVG、KaTeX 公式），通过 WebView2 PrintToPdf 生成 PDF
- 导出模块清理：删除 `exportMode.ts`，移除 `setExportMode`、`forceNonVirtual`、`export-mode-change` 等脏补丁，`ReadingArea.tsx` 恢复干净的虚拟滚动逻辑
- `generateExportHtml.ts` 重构：删除无用的 `escapeInlineMarkdown` 函数，`escapeHtml` 更名为 `escapeForHtml`，内联 Markdown 解析顺序调整为图片 → 链接 → 粗体/斜体/删除线/代码 → 最终转义
- PDF 导出菜单优化：黑白模式标记为"推荐"并放在带样式模式之后

### 移除

- `exportMode.ts` 文件：导出不再依赖虚拟滚动控制

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
