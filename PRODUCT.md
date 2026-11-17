# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

主要用户为中文技术读者：开发者、技术写作者、AI 工具重度用户，日常阅读体量大、含代码与图表的 Markdown 文档（AI 生成的方案与报告、项目 README、Obsidian 笔记库、长篇教程）。他们在桌面端长时间连续阅读，需要目录导航、进度记忆与文内搜索，而不是快速扫一眼。

次要用户为不写代码的中文读者，只读 .md 笔记、文章与说明书，看重排版观感与操作简单。

推断：第一项未经用户明确确认（用户在提问中选择「无偏好」），依据为 README 渠道构成（B 站 / 知乎 / 公众号）、Obsidian 语法兼容投入与 README 技术栈定位；若后续用户口径变化以用户为准。

## Product Purpose

ErgeMD 是一款专注 Markdown 阅读的桌面应用，核心理念是「极致的渲染美感 + 丝滑的阅读体验」。它让 Markdown 文档在桌面上以接近成品出版物的样子呈现：GFM、KaTeX 公式、Mermaid / PlantUML 图表、Obsidian 语法、代码高亮全部按主题正确着色，长文档靠虚拟滚动保持顺滑。

阅读是核心；编辑（双击段落就地快速编辑）、多标签、多窗口、导出（HTML / PDF / Word / SVG）是辅助能力，不得反过来挤压阅读体验。

成功意味着：打开文档即接近成品观感，长时间阅读不疲劳、不卡顿，进度与位置自动记住，导出结果与屏幕所见一致。

## Positioning

渲染保真 + Obsidian 语法兼容：同一份笔记在 ErgeMD 里比在通用 Markdown 编辑器里更接近成品——Callout、Wiki 链接、嵌入引用、高亮标记、块 ID 等 Obsidian 专属语法被原生解析，Mermaid / PlantUML / KaTeX / 代码高亮按 14 套主题逐一切换配色，且导出链路复用同一渲染结果。这是代码里投入最重、最难被同类工具如实复制的部分。

## Operating Context

- 桌面应用，Windows 为主，兼顾 macOS 与 Linux；无边框窗口 + 自定义标题栏，沉浸式全屏阅读。
- 阅读区 100vh 全屏滚动，标题栏 / 状态栏 / 浮动目录 / 左右面板均为浮层，滚动时自动渐隐。
- 文件内容始终从磁盘实时读取（不做持久化缓存），元数据（阅读进度、设置、最近文件、工作区）存 SQLite（`~/.ergemd/ergereader.db`）。
- 外部修改文件时提示「文件已更新，点击重新加载」，不自动刷新，避免打断阅读。
- 支持工作区（文件夹扫描为文件树）与单文件两种打开方式，支持拖拽打开文件 / 文件夹。
- 14 套内置主题，按 CSS 变量分层（core / dark-base / light-base / 各主题 / derived）切换。
- 中英双语 UI，默认跟随系统语言，可热切换。
- 发布走 GitHub Releases 为唯一发布源，Gitee 镜像仓库同步代码；应用内自动检查更新。

## Capabilities and Constraints

已确认能力：Markdown 渲染（GFM、KaTeX、Mermaid、PlantUML、脚注、任务列表）；Obsidian 语法兼容；虚拟滚动长文档；多标签页与标签固定；多窗口（共享设置、独立内容）；文件树工作区与书签；浮动目录（可固定）；文内搜索与全局搜索；阅读进度记忆；双击段落快速编辑；导出 HTML / PDF / Word，图表另存 SVG；14 套主题；字号 / 行距 / 字距 / 段距 / 页宽可调；专注模式；右键菜单（阅读区 / 代码块 / 图片 / 链接 / 标签栏 / 文件列表 / 目录）。

硬约束（用户明确要求后续改动必须守住）：

- 免费、无账号、完全离线：不引入登录、云同步、订阅、遥测；文件只在本地。AGPL-3.0 开源。
- 性能预算不可退让：大文档打开与滚动帧率优先于视觉花活；长文档必须虚拟滚动；动画只动 `transform` 与 `opacity`。
- Windows / macOS / Linux 三端都能装：平台特性需降级兼容，不为单端牺牲其他端。
- 中英双语 UI 常备：新增 UI 文案必须同时有中英文，默认跟随系统语言。

技术边界（来自仓库事实）：前端只做渲染，文件 IO、编码检测、数据库操作全部下沉 Rust 后端；IPC 单次传输不超过 1000 条记录；包管理器唯一为 pnpm。

已知未决：macOS Intel（x64）原生包缺失；Mermaid 11 的中文宽度计算问题等上游 Bug 待官方修复。

## Brand Commitments

- 名称：ErgeMD；作者署名「宝藏二哥AIA / ErgeAIA」；副标题「A minimal Markdown reader by 宝藏二哥」。
- 作者个人信条进入产品文案：「三无分享——无门槛、无套路、无保留」「让每一次阅读，都回归内容本身」。
- 赛博朋克主题是作者个人风格的第一身份主题（PDR 记录为初始默认主题），品牌色系为霓虹色点缀 + 优化色做内容 + 暗色做背景。
- 许可证 AGPL-3.0，README 与关于页均标注免费软件。

## Evidence on Hand

- 产品需求文档：`docs/ErgeMD-pdr.md`（2026-04 版本，部分技术选型已被实际实现取代，以代码与 `docs/agents/decision-log.md` 为准）。
- 会话与决策留痕：`docs/agents/project-progress.md`、`docs/agents/decision-log.md`、`docs/agents/debug-log.md`。
- 版本记录：`CHANGELOG.md` / `CHANGELOG.en.md`，当前 v0.5.0。
- 真实主题实现：`src/styles/themes/`（14 套主题 CSS + core 分层）。
- 封面与二维码等品牌素材：`public/images/`。
- 界面文案权威源：`src/i18n/zh-CN.json` 与 `src/i18n/en-US.json`。

不存在、后续工作不得虚构：用户量、下载量口碑数据、客户案例、付费方案、企业背书。

## Product Principles

1. 阅读优先：任何新增能力都必须证明它不损害打开速度、滚动帧率与长时间阅读的舒适度。
2. 保真不可打折：屏幕所见即导出所得；主题切换后所有渲染元素（含图表、公式、Callout）同步正确，不留默认黑描边、白底白字这类失配。
3. 离线即隐私：不联网也能完整使用，不收集任何数据。
4. 三端同权：新交互先确认在 Windows / macOS / Linux 都能落地或体面降级。
5. 观感服务于内容：主题、动效、浮层都在退让于正文可读性——沉浸式界面里，UI 该消失时就消失。

## Accessibility & Inclusion

中英双语为已确认的常备要求（含快捷键提示、错误提示、设置项标签）。未确认无障碍合规等级；后续若无明确要求，按桌面应用通用可读性标准执行（对比度、键盘可达、`prefers-reduced-motion` 降级），不宣称符合 WCAG 等级。
