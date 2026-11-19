---
name: ErgeMD
description: 极简 Markdown 阅读器 —— 渲染保真、UI 退让、14 套主题换装
colors:
  canvas-page: "#282830"
  canvas-reader: "#2E2E38"
  canvas-sidebar: "#222230"
  canvas-code: "#262630"
  ink-heading: "#E2E2E2"
  ink-primary: "#D4D4D4"
  ink-secondary: "#A6A6A6"
  ink-muted: "#989898"
  brand-primary: "#00FFFF"
  brand-secondary: "#FF00FF"
  accent-cyan: "#00FFFF"
  accent-pink: "#FF6496"
  accent-purple: "#FF00FF"
  accent-green: "#00FF00"
  accent-yellow: "#FFFF00"
  accent-orange: "#FF8000"
  accent-red: "#FF0040"
  heading-1: "#E2E2E2"
  heading-2: "#00FFFF"
  heading-3: "#FF3DFE"
  heading-4: "#FF8000"
  heading-5: "#00FF00"
  heading-6: "#8E96A4"
  divider: "#3C3C45"
  table-border: "#3C3C45"
  border-subtle: "#373740"
  code-keyword: "#FF00FF"
  code-string: "#00FF00"
  code-number: "#FF8000"
  code-comment: "#6B7280"
  code-function: "#00FFFF"
  code-text: "#E0E0E0"
  code-label: "#FF8000"
typography:
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: "0px"
  display:
    fontSize: "2em"
    fontWeight: 700
    letterSpacing: "0px"
  headline:
    fontSize: "1.5em"
    fontWeight: 600
  title:
    fontSize: "1.25em"
    fontWeight: 600
  subtitle:
    fontSize: "1.1em"
    fontWeight: 600
  label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.2
  micro:
    fontSize: "11px"
    lineHeight: 1.3
  compact:
    fontSize: "13px"
    lineHeight: 1.5
  ui-title:
    fontSize: "16px"
    fontWeight: 600
  app-name:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    letterSpacing: "0.05em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace"
    fontSize: "0.9em"
    lineHeight: 1.6
rounded:
  numeric: "2px"
  chip: "4px"
  block: "6px"
  menu: "8px"
  zone: "10px"
  circle: "50%"
spacing:
  hairline: "2px"
  tight: "4px"
  compact: "8px"
  standard: "12px"
  roomy: "16px"
  section: "24px"
components:
  titlebar:
    backgroundColor: "{colors.canvas-sidebar}"
    textColor: "{colors.ink-muted}"
    height: "36px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    height: "36px"
    width: "180px"
  tab-active:
    backgroundColor: "{colors.canvas-sidebar}"
    textColor: "{colors.brand-primary}"
    height: "36px"
  context-menu:
    backgroundColor: "{colors.canvas-sidebar}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.menu}"
    width: "280px"
  toc-panel:
    backgroundColor: "{colors.canvas-page}"
    textColor: "{colors.ink-secondary}"
    width: "200px"
  search-bar:
    backgroundColor: "{colors.canvas-sidebar}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.menu}"
    width: "360px"
  code-block:
    backgroundColor: "{colors.canvas-code}"
    textColor: "{colors.code-text}"
    rounded: "{rounded.block}"
    padding: "1em"
  drop-zone:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.zone}"
  reading-column:
    backgroundColor: "{colors.canvas-reader}"
    textColor: "{colors.ink-primary}"
    width: "800px"
    padding: "2em 3em"
---

# Design System: ErgeMD

## Overview

**Creative North Star: "阅读画框"**

ErgeMD 是一台给长文用的显影机：正文居中成一幅画，四周的标题栏、标签、目录、状态栏是画框。画框该在时精确在位，该退时整块淡出——用户滚动起来之后，36px 标题栏以 3000ms 淡出到 0，鼠标回到顶部再 300ms 渐显；底部状态栏静止压到 0.45（低于此值字数与进度在深色画布上不可读），滚动时升到 0.6，悬停升到 0.8。消失不是简化，是这个产品最核心的交互。

整套视觉建立在一次分层分权上：**UI 外壳可以高唤醒，正文画布必须低唤醒，代码区保留出身原配**。理由写进了主题契约——唤醒度与停留时长成反比，标题栏停留数秒，正文停留数十分钟。所以外壳允许赛博霓虹与发光，正文只允许一种东西抢注意力：内容本身。14 套主题在同一套变量契约下换装，切换一次，标题、图表、Callout、代码高亮同步改色，不残留默认黑描边，不出现白底白字。

控件手感是**精确克制**：36px 高的外壳条、32px 见方的图标按钮、1px 细边框、2–8px 的小圆角、半透明交互色淡底做悬停。阅读工作面上没有大圆角卡片，没有投影堆叠，没有渐变按钮；大圆角与投影只出现在模态、更新卡这类被单独注视的浮面。密度偏紧但每行字留足 1.8 倍行高，因为紧的是外壳，松的是正文。

**Key Characteristics:**
- 沉浸式浮层：阅读区 100vh 全屏滚动，标题栏 / 状态栏 / 目录 / 左右面板全部 `position: fixed` 浮动其上
- 平面分层：零阴影分层，靠画布明度阶梯（sidebar → code → page → reader）区分层级；阴影只给弹层
- 主题即变量：14 套主题只交源色，其余 token 由构建脚本推导，切换零闪烁
- 功能性着色：标题多色相是层级身份，正文墨色近中性，发光只留在外壳
- 动效只动 `transform` 与 `opacity` 做位移/尺寸/淡入淡出（颜色与底色过渡另算），时长 80–200ms，另有 3000ms 的渐隐长过渡

## Colors

整体是「深空灰画布 + 霓虹强调」：画布本身近乎无色相（`oklch(0.16–0.18 0.01 270)` 一带的冷灰），颜色只在标题、功能位与图表上出现，出现即有意义。

此处 frontmatter 记录的是**默认主题 cyberpunk** 的取值；14 套主题通过 `[data-theme]` 覆盖同一批变量名，权威源是 `scripts/theme/sources/*.js`，生成物在 `src/styles/themes/*.css`。变量名是契约，值随主题变。

### Primary
- **交互强调青 / Accent Cyan** (#00FFFF): 外壳的主用色，**不是**品牌标识色。当前标签下划线、进度条、滑杆拇指、激活图标、焦点边框、链接兜底色、设置项数值高亮——凡是「当前可操作 / 当前生效」都取它。token 名叫 cyan，职责实为「本主题的主交互色相」：夜灯主题它是蓝紫 #7480CB，晨光主题它是靛蓝 #4353B8。
- **品牌标识青 / Brand Primary** (#00FFFF): 只服务品牌标识与阅读导航——浮动目录当前章节与当前指示线、目录固定图钉。cyberpunk 主题下与 Accent Cyan 同值；夜灯主题它是橙 #F2570F，晨光主题是橙 #FF6A2B，所以目录高亮与标签高亮在暖色主题里本就是两种颜色。

### Secondary
- **品牌标识品红 / Brand Secondary** (#FF00FF): 与 Brand Primary 构成 135° 品牌渐变（Logo 底、app 名悬停光晕），同时在标题色阶中占 H3。
- **优化粉 / Accent Pink** (#FF6496): 行内代码文字与底色来源，长文中唯一的「软」高饱和。
- **荧光橙 / Accent Orange** (#FF8000): 代码块语言标签、数字字面量、H4。
- **霓虹绿 / Accent Green** (#00FF00): 字符串、复制成功、H5、成功类 Toast。

### Tertiary
- **霓虹黄 / Accent Yellow** (#FFFF00): 搜索命中高亮（0.25 alpha，当前命中 0.50），以及 Warning 类 Toast / Admonition。
- **激光红 / Accent Red** (#FF0040): 错误、危险操作、关闭按钮悬停、破坏性菜单项。

### Neutral
- **深空画布 / Canvas Page** (#282830): 页面底色，也是目录面板与图表 label 底。
- **阅读画布 / Canvas Reader** (#2E2E38): 正文所在平面，比页面亮一档——这就是「画框」的框内。
- **侧栏画布 / Canvas Sidebar** (#222230): 标题栏、左右面板、右键菜单、搜索栏，比页面暗一档。
- **代码画布 / Canvas Code** (#262630): 代码块与设置项容器。
- **标题墨 / Ink Heading** (#E2E2E2): H1 与最高层级文字。不再使用 `#FAFAFA` 一类近纯白——层级由字号与字重承担，明度只做小幅递进。
- **正文灰 / Ink Primary** (#D4D4D4): 长文正文，对 `canvas-reader` 实测 9.1:1、L\*84.9。暗色正文墨色统一落在 L\*84–87（APCA≈75–80），低于成熟暗色主题的舒适上限；对比度只保证下限，上限见 Do 规则。
- **次要灰 / Ink Secondary** (#A6A6A6): 元信息、非激活标签、快捷键提示。
- **弱化灰 / Ink Muted** (#989898): 状态栏、占位提示、图标默认色。
- **分割线 / Divider** (#3C3C45): 与画布固定明度差推导，不手写、不随主题漂移；表格线复用同一值。
- **细边 / Border Subtle** (#373740): 1px 结构边，标题栏分段、弹层描边。

### Named Rules

**The Reading Cost Rule.** 正文画布上不允许出现发光、渐变文字与高饱和底色；唤醒度属于外壳，不属于正文。主题契约规定正文对比度 ≥ 7:1、标题与功能位 ≥ 4.5:1，护栏是硬指标，不满足就压明度，不放宽门禁。

**The One Hue, One Job Rule.** 同一色相只承担一类语义：青 = 交互与当前态，品红 = 品牌渐变与 H3，橙 = 字面量与标签，黄 = 搜索，绿 = 成功，红 = 危险。新增语义优先复用现有槽位，不新增第七种强调色。

**The Two Kinds of Accent Rule.** `--accent-cyan` 是交互色（外壳所有「当前/可操作」状态），`--brand-primary` 是品牌色（Logo、目录高亮、图钉）。两者在赛博朋克同值，在暖色主题（夜灯 #F2570F / 晨光 #FF6A2B）明确分离。新增组件先问自己：这是「可点击的当前态」还是「品牌标识」——选错会让主题切换后整屏配色失谐。

**The Theme-Is-A-Table Rule.** 任何颜色只能来自 token。主题文件内出现字面量十六进制即违约——源色表是唯一手写处，其余由 `pnpm theme:generate` 推导。

## Typography

**Display Font:** 与正文同族（正文可换，见下）；无独立展示字体
**Body Font:** 用户可选，默认 `system-ui, -apple-system, BlinkMacSystemFont, sans-serif`；另有 Windows / macOS / Ubuntu / Serif / Monospace 五个预设
**Label/Mono Font:** `ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace`

**Character:** 单一字族的纯功能排版。没有字重戏法，没有大写标签，层级靠字号阶梯与色相区分。中文环境下默认走系统字体，保证零打包、跨平台一致；用户想换衬线或等宽，在右侧面板一键切换。

### Hierarchy
- **Display / H1** (700, 2em, 行高继承用户设置默认 1.8): 文档主标题，标题层级中唯一使用 700 权重的一层，带 1px `divider` 下边框与 0.3em 下内距。
- **Headline / H2** (600, 1.5em, 继承): 章节标题，同样带下边框但内距收到 0.2em。
- **Title / H3** (600, 1.25em, 继承): 小节标题，从这里开始不再有下边框。
- **Subtitle / H4** (600, 1.15em): 与正文拉开一档，仍靠色相区分层级。
- **H5 / H6** (600, 1.05em / 0.95em, H6 加 0.02em 字距): 到这两级只剩色相与半个字号差，H6 略小于正文以收束尾部层级。
- **Body** (400, 16px 默认，1.8 行高，字距 0): 长文正文，段间距 16px，页宽 800px 默认（600–1400 可调）。字号、行高、字距、段距、页宽五项全部开放给用户。
- **Label** (400, 12px): 标签栏文字、状态栏字数与百分比、面板分组小标题（大写分组可加 ≤0.04em 字距）。
- **Compact** (400, 13px): 面板行、右键菜单、Toast 与更新卡正文——外壳的默认密度档。
- **Micro** (11px): 仅限等宽或数字型微元数据（代码语言角标、图片序号、搜索结果计数）；中文正文类文字不得低于 12px。
- **Dialog Title** (600, 16px): 模态标题（快捷键总览、关于页区块标题）。
- **App Name** (700, 14px, 0.05em 字距): 标题栏左侧 "ErgeMD"，悬停加 8px 品牌色 text-shadow。

### Named Rules

**The 1.8 Rule.** 正文行高默认 1.8，下限 1.0 只在用户显式选择时出现；任何新增长文排版控件都必须以 1.8 为默认值。

**The Mono-Only-Inside Rule.** 等宽字体只用于代码、快捷键提示与性能参数表。正文、标题、按钮文字一律不上等宽。

**The Tracking Rule.** 正文与标题字距为 0；`ErgeMD` 用 0.05em；大写分组标签可用 ≤0.04em。字号阶梯固定为 11 / 12 / 13 / 14 / 16，禁止出现 15px 或 0.6875rem 这类游离值。

## Layout

阅读区是唯一的滚动容器，`width: 100%; height: 100vh`，内部一列居中的正文，最大宽度 `pageWidth`（默认 800px），内距 `2em 3em`。外壳全部浮层：标题栏 `fixed top-0` 高 36px，状态栏 `fixed bottom-0`（文字行 24px + 2px 进度条），浮动目录 `fixed` 在左（收起 64px / 展开 200px，条目 28px 高），左右面板 `fixed` 从侧边推入（左默认 240px；右默认 320px，可拖范围 280–600px），两者均可拖拽改宽。

不使用 CSS Grid 或 Flexbox 嵌套布局包裹滚动容器——这是硬约束，滚动容器一旦被外壳包裹，沉浸式全屏就失效。

间距节奏取 4 的倍数：2 / 4 / 8 / 12 / 16 / 24。标题栏 36px 高、图标按钮 32px 见方，给点击热区留满；底部状态栏更薄（文字行 24px + 2px 进度条），因为它承载的信息是辅助读数。正文块内的标题间距用 em（`1.5em 0 0.5em` 上距），保证用户改字号时纵向韵律等比跟随；段落间距则走用户设置值（默认 16px，0–40 可调），因为它是用户唯一直接控制的纵向节奏。

窗口默认 1480×920，最小 900×640。窄窗下正文列自然收缩（`maxWidth` 是上限，不是固定宽），外壳让位靠收起面板，不引入响应式断点重排。

### Named Rules

**The One Scroll Container Rule.** 只有一个元素滚动。任何新面板内部需要滚动时必须用独立滚动容器，且禁止 `overflow` 出现在祖先链上——祖先一旦 overflow，`position: fixed` 的浮层会被裁切。

**The 36/32 Rule.** 标题栏 36px 高，图标按钮 32×32。不为了「看起来更精致」把它们做小，小到 24px 时热区与视觉尺寸的比值就崩了。底部状态栏是唯一例外（24px），因为它不进指针主路径、只在需要读进度时被看一眼。

## Elevation & Depth

**平面分层，阴影只给浮层。** 阅读区、面板、标题栏全部零阴影，层级靠画布的明度阶梯表达：暗色系主题下 `canvas-sidebar` (L≈0.14) < `canvas-code` (L≈0.15) < `canvas-page` (L≈0.16) < `canvas-reader` (L≈0.18)；亮色系主题整体镜像翻转，reader 最亮、sidebar 与 page 合并为一档。焦点、悬停、选中用透明度分层（0.03 / 0.05 / 0.06 / 0.10 / 0.15 / 0.30 六档 alpha），不用投影。

只有真正脱离文档流的浮层才投影：右键菜单、Toast、搜索栏、展开态的浮动目录。发光（glow）只存在于外壳——app 名悬停、滑杆拇指、目录当前章节指示线；正文与全部图表（30+ 种 Mermaid 映射）一律无发光。

### Shadow Vocabulary
- **Menu** (`0 4px 16px rgba(0, 0, 0, 0.4)`): 右键菜单、下拉菜单。叠加 1px `border-subtle` 描边收边。
- **Popup** (`0 4px 24px rgba(0, 0, 0, 0.5)`): 图片预览、Toast（亮色主题同结构降到 0.15）。
- **TOC Expanded** (`0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.06)`): 目录展开态，双环让它在任何画布上都能被识别为浮层。
- **Modal** (`0 25px 50px -12px rgba(0, 0, 0, 0.5)`): 编辑模态这一层最大的浮面（`shadow-2xl`）。
- **Floating Card** (`var(--shadow-floating-card)`，暗色 `0 12px 40px rgba(0,0,0,0.4)` / 亮色 `0.15`): 更新卡片、彩蛋大卡；图表明细浮层用 `0 8px 32px rgba(0,0,0,0.5)`。
- **Glow（外壳专用）** (`0 0 8px var(--accent-cyan)`): app 名悬停、滑杆拇指、目录当前章节指示线。不进正文。

### Named Rules

**The Flat-By-Default Rule.** 静止状态零阴影。阴影只作为「这是一层浮在上面的东西」的信号出现，不用于表达重要性。

**The Glow Stays Outside Rule.** 发光只允许出现在标题栏、Logo、滑杆、目录指示线。正文画布上的任何元素——包括标题与链接——都不能有 glow 或 text-shadow。

## Shapes

小圆角功能主义，分两族。**工作外壳（2–10px）**：2px 用于滑杆轨道与搜索命中高亮，4px 用于图片、菜单项与引用块右角，6px 用于代码块与主题色卡，8px 用于右键菜单、搜索栏与关于页图标按钮，10px 用于欢迎页拖拽框与关于页徽章，50% 用于滑杆拇指与主题色点。**停留型浮面（12–16px）**：更新卡片、设置下拉、关于页作者卡用 12px，编辑模态与彩蛋用 16px——它们是被单独凝视的浮面，与阅读外壳不在同一层。行内代码与 `kbd` 用相对单位 `0.25em`，跟随字号缩放。

圆形有两种用途：滑杆拇指与色点用 50% 表达「选中了什么」；状态徽章与图标按钮用 50% 表达「一个可点的点」。两者都不用于排版容器。

表格是唯一不设圆角的块级元素：`border-collapse: collapse` + 单元格 1px `table-border` 实线，外框由单元格线自然闭合，不做外圆角包装。

引用块与 Callout 是唯一的非对称形状：左侧 3–4px 实心边框 + 右侧 4–6px 圆角。这是 Markdown 语义约定（引用、提示），不是装饰。

### Named Rules

**The Two-Radius-Layer Rule.** 阅读工作面的圆角止步 10px；12–16px 只留给停留型浮面（模态、更新卡、关于页）。给标签栏、菜单、目录套 12px 圆角，会让它在沉浸阅读中显得膨胀。

**The No-Pill-Buttons Rule.** 操作按钮（含更新卡的「详情」「立即更新」）不用胶囊，一律 4–6px 小圆角；胶囊只出现在状态徽章与圆形色标上，不承担点击。

## Components

### Buttons
- **Shape:** 图标按钮 32×32（标题栏为满高 32 宽），无背景、无边框；关于页社交图标按钮 36×36、8px 圆角，`divider` 描边，悬停转 `accent-cyan` 描边
- **Filled（主操作，仅通知面）:** 实心 `accent-cyan` 底 + `--text-on-accent` 文字（暗色近黑 / 亮色近黑，保证中明度强调色上也过 AA）；正文与阅读外壳不用实心按钮
- **Tonal（次级）:** `accent-cyan` 10% alpha 底 + 20% alpha 边，悬停升到 15%；secondary 用白（暗色）/ 黑（亮色）5% alpha 底 + 10% alpha 边。这两档由 `--btn-primary-*` / `--btn-secondary-*` token 提供，当前仅欢迎页与设置面使用
- **Hover / Focus:** 颜色与背景 100ms ease 过渡；`:focus-visible` 用 1px `active-border`（交互色 30% alpha）。不使用外发光焦点环——glow 已分配给外壳强调态
- **Icon-only:** 16px 线性图标（`stroke-width: 1.2`），默认 `ink-muted`，悬停升到 `ink-secondary` 并加 `hover-bg-light` 底；危险图标悬停转 `accent-red` 并加 `danger-hover-bg`

### Chips
- **Style:** 主题色卡是 6px 小圆角行 + 四枚 8px 圆形预览色点（画布 / 主强调 / 副强调 / 第三色），选中态加 1px `accent-cyan` 描边
- **State:** 非选中是 1px `border-subtle` 描边 + 透明底，悬停换成 `hover-bg-subtle` 淡底；选中靠 `accent-cyan` 描边与名称变色，不靠填充，避免高饱和主题下糊成一片

### Cards / Containers
- **Corner Style:** 6px（内容容器）/ 8px（浮层容器）
- **Background:** `canvas-code` 用于代码与设置块，`canvas-sidebar` 用于面板与弹层
- **Shadow Strategy:** 见 Elevation——静止零阴影，浮层才投影
- **Border:** 1px `divider` 为默认结构线，`border-subtle` 为更淡的分段线
- **Internal Padding:** 弹层 4px 8px，面板 12–16px，正文块 0.8em 0

### Inputs / Fields
- **Style:** 搜索栏是 8px 圆角的浮层输入，`canvas-sidebar` 底 + 1px `divider` 边，无内阴影
- **Sidebar filter:** 画布底（`--bg-page`）+ 1px `--divider` 边、5px 圆角、左侧放大镜、有内容时右侧清除；聚焦时边框转 `--active-border` 并带 3px 青色光晕。占位符统一 `--text-muted`，不用比面板更亮的灰底块——字段必须一眼看得出能输入
- **Range:** 轨道 4px 高、2px 圆角、未填充段用 `canvas-code`，填充段用 `accent-cyan`；拇指 14px 圆形、2px `canvas-sidebar` 描边、`accent-cyan` 填充 + 4px 发光
- **Select:** 原生下拉，只改外观（去箭头、聚焦时边框转 `active-border`）。原生弹层样式由系统决定，不自绘

### Navigation
- **TabBar:** 与标题栏同行，条目最大宽 180px、12px 字号、左右 12px 内距、图标与文字间距 8px。激活态 = 2px `accent-cyan` 下边框 + 同色文字 + 5% 同色淡底；拖拽中左缘 2px 同色指示插入位
- **FloatingTOC:** 收起态只显示长度递减的指示线（H1 22px、H2 16px、H3 11px、更深 7px，逐级右缩进 2/14/26/38px），展开态滑出 200px 面板。当前章节指示线加粗到 3px 高、品牌色 + 8px 发光，文字也转品牌色；未激活项按距离衰减透明度，最近邻之外逐渐淡出——目录本身也不抢戏

### Signature Component: 滚动条回显
所有滚动条静止时低透明（`--sb-alpha` 0.32），滚动时 120ms 点亮、停止 450ms 后 650ms 渐隐；悬停拇指直接取 `--scrollbar-thumb-hover`。机制在 `src/utils/scrollFx.ts`（捕获 scroll、逐帧改 `--sb-alpha` / `scrollbar-color`），不改变滚动行为，`prefers-reduced-motion` 下直接切态。滚动条是存在的工具，不是常驻的装饰。

### Signature Component: 沉浸式自动渐隐外壳
标题栏（含标签栏）与状态栏各有一套渐隐，但都遵循同一条不对称节奏：淡入 300ms，淡出 3000ms（`useAutoHide`），因为「离开」应该比「回来」慢得多。标题栏在滚动容器就绪后即淡出，鼠标进入顶部 36px 热区渐显；状态栏不走淡入淡出，而是三段透明度——静止 0.2、滚动 0.6、悬停 0.8，700ms 过渡。`prefers-reduced-motion` 下全部压到 0.01ms。
左右停靠面板复用同一不对称模型：进场 `transform 200ms` + `opacity 180ms`，退场 `transform 360ms` + `opacity 320ms`，并用 `visibility 0s linear 360ms` 延迟隐藏——闭包期间保持可见，渐隐才看得见；关闭瞬间 `pointer-events: none`，避免挡住正文操作。
右侧浮动目录（FloatingTOC）的 hover 展开/收起同理：过渡时长不低于 200ms（展开）/ 320ms（收起），低性能档的配置不得把过渡压成瞬移；目录文字与固定徽章改为常驻节点 + 透明度/可见性过渡，不再条件挂载（否则会「闪进闪出」）。

### Signature Component: 主题色卡
14 套主题在右侧面板以「四色圆点 + 名称」呈现，分「内置主题」与「系统」两组；晨光（light）与夜灯（dark）作为品牌双主题排在内置组最前，其后是十二套个性主题。「跟随系统」独占系统组。色点顺序固定为画布、主强调（brand-primary）、副强调（brand-secondary）、第三色（accent-pink），用户换主题前就能预判换完是什么气质。

## Do's and Don'ts

### Do:
- **Do** 让正文画布保持低唤醒：正文、标题、链接、表格上不加发光、不加渐变文字、不加高饱和底色。
- **Do** 用 alpha 六档（0.03 / 0.05 / 0.06 / 0.10 / 0.15 / 0.30）表达悬停、选中、激活，而不是换颜色。
- **Do** 用画布明度阶梯表达层级：sidebar 最暗、code 次之、page 再次、reader 最亮。
- **Do** 把一切颜色写成 token；新增主题只交源色表，跑 `pnpm theme:generate` 生成，跑 `pnpm theme:generate:check` 校验。
- **Do** 保持正文行高 1.8、段距 16px、页宽 800px 为默认值。
- **Do** 让浮层投影、让正文扁平；阴影是「浮在上面的信号」，不是「更重要的信号」。
- **Do** 让新增 UI 文案同时补 `zh-CN.json` 与 `en-US.json` 两个键。
- **Do** 让停靠面板在点击正文 / 空白 / 搜索栏时自动收起（非模态），只有标题栏与面板开关不触发收起——用户设完就该能直接离开，不必回头找开关。
- **Do** 用 `data-hint` + 全局 `HoverHint` 承载悬停说明；原生 `title` 会画出系统边框、不跟主题，一律不用。
- **Do** 让滚动条在闲置时变淡：静止低透明、滚动点亮、停止后渐隐（见「滚动条回显」）。
- **Do** 给墨色设「舒适上限」而不只设下限：暗色正文 L\*84–87、一级标题 ≤ L\*90（APCA 正文 ≈75–80、标题 ≤ 90）；亮色正文 L\*16–24。层级靠字号与字重，不靠逼近纯白/纯黑。
- **Do** 让性能策略默认自动：按文档规模与设备能力选初始档，只在运行时向下调整；用户要干预时给一行原生下拉，不做阶梯卡片、预览卡与参数表。

### Don't:
- **Don't** 在正文画布上使用外投影、`text-shadow` 或 `filter: drop-shadow`。发光属于外壳；`kbd` 的 1px inset 下边线是唯一允许的正文内阴影（结构线，不是光）。
- **Don't** 给阅读工作面（标签、菜单、目录、搜索栏）套 12px 以上的圆角或胶囊形状；大圆角只属于模态、更新卡、关于页这类停留型浮面。
- **Don't** 给滚动容器的祖先加 `overflow`，会裁切 `position: fixed` 的浮层。
- **Don't** 在主题 CSS 里手写字面量颜色。文件头写着 GENERATED 的文件只能由脚本重写。
- **Don't** 混用 Tailwind 断点做响应式排版——桌面窗口只有宽度变化，用面板收起与页宽自适应，不引入移动端断点体系。
- **Don't** 把正文里的引用块与 Callout 做成「左侧色条 + 卡片」的通用强调卡。左侧竖线是 Markdown 语义，只给引用与提示（关于页的「左竖线 + 圆角卡」是品牌展示面，不适用于正文）。
- **Don't** 用投影表达 hover。Hover 一律用 100ms 的背景/颜色过渡。
- **Don't** 在预览表里手写主题色值。色卡已改为运行时读取主题 CSS 变量（`src/utils/themePreview.ts`），新增主题无需登记任何色值；手写副本必然与生成物漂移。
