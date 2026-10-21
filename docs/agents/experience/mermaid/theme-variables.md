# mermaid/theme-variables — Mermaid 主题适配经验

## M1: 自定义图表主题必须走 base 主题 + themeVariables 🔴

- **主张**：Mermaid 图表自定义配色必须使用 `base` 主题 + `themeVariables`；亮色主题必须显式 `darkMode: false`；themeVariables 只接受实际颜色值，不解析 CSS 变量。
- **适用**：任何需要图表跟随应用主题切换的场景（Mermaid 12.x）。
- **Why**：① 只有 `base` 主题支持自定义 themeVariables，`default`/`dark` 主题传入即被忽略；② `base` 默认按暗色风格计算颜色，亮色不设 `darkMode: false` 会得到错误配色；③ Mermaid 在 JS 侧消费配置对象，`var(--xxx)` 对它不可解析，只会得到非法色值。
- **How**：
  ```typescript
  const mermaidTheme = "base";                 // 唯一支持 themeVariables 的主题
  const vars = themeVariables as any;          // 自定义变量需 as any 绕过类型检查
  if (colors.isLight) vars.darkMode = false;   // 亮色必须，否则颜色计算错误
  vars.primaryColor = colors.primaryColor;     // 传实际色值，禁 var(--xxx)
  ```
- **反例**：`mermaid.initialize({ theme: "dark" })` + `themeVariables: { primaryColor: "var(--accent)" }` —— 变量被忽略、色值非法，图表保持默认暗色（BUG-032、BUG-015；lessons 05/06）。
- **事实源**：BUG-032、BUG-015；DEC-005；lessons 05 / 06

## M2: themeVariables 失效时用 SVG 后处理注入 scoped CSS 🔴

- **主张**：当 themeVariables 对某图表类型不生效（官方 Bug 或不暴露变量）时，在 `mermaid.render()` 返回的 SVG 字符串上注入 scoped CSS：用 SVG 根 id 限定作用域、`!important` 强制覆盖、选择器覆盖所有形状/文字/连接线、追加在既有 `</style>` 之后；覆盖第三方插件样式前必须读其源码确认原始属性值。
- **适用**：Mermaid 内部样式优先级高于外部 CSS、或 themeVariables 存在 Bug 的图表类型。
- **Why**：Mermaid 内部样式优先级很高，外部 CSS 与 themeCSS 都可能被覆盖；直接改渲染后的 SVG 字符串是唯一 100% 可控的路径。而凭「合理推断」覆盖原始样式会制造新 Bug——`fill: none`（透明）与不透明填充是互斥属性。
- **How**：
  ```typescript
  let { svg } = await mermaid.render(id, chart);
  const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (isErDiagram) {
    const style = `#${id} .er text, #${id} .er .attributeBoxEven text { fill: ${c.text} !important; } ...`;
    svg = svg.includes("<style>")
      ? svg.replace("<style>", `<style>${style}`)
      : svg.replace("<svg ", `<svg><style>${style}</style>`); // style 缺失兜底
  }
  ```
- **反例**：① ZenUML `.fragment-border` 原样式 `fill: none`，后处理改成不透明背景色 → 消息线被完全遮挡（BUG-050）；② 只覆盖 `circle` 不覆盖 `rect`/`ellipse`/`text`/连接线 → 部分元素仍默认色（BUG-044）。
- **事实源**：BUG-043~046、BUG-050；DEC-015；lessons 08

## M3: 图表类型主题变量速查 🟡

- **主张**：不同 Mermaid 图表类型的主题变量支持度不同，配置前先查类型再动手，禁止猜测变量名。
- **适用**：新增或修复任一图表类型的主题适配。
- **Why**：Mermaid 各图表类型的变量体系不统一，猜名必然落空；且实验性图表（timeline / xychart）的语法与变量随版本变化。
- **How**：速查表——

  | 图表 | 配置方式 | 关键变量 |
  |---|---|---|
  | flowchart / sequence / gantt / pie / class / state | 通用 themeVariables | `actorBkg`、`pieColors`、`classBkg` 等 |
  | ER（mermaid ≥11 v2 渲染器） | 通用 themeVariables | `mainBkg`/`nodeBorder`（实体框）、`attributeBackgroundColorOdd/Even`（属性行）、`lineColor`（关系线）、`textColor`/`nodeTextColor`/`titleColor`（文字）；`entityBkg` 系为 v10 死键（见 M8） |
  | journey | fillType/actor 系列 | `fillType0~7`（分区/任务填充，缺省自 primary/secondary 派生）、`actor0~3`、`faceColor`（脸谱底）、通用 `mainBkg`/`nodeBorder`/`textColor`；`journeyBkg` 系为死键。分区标题文字在样式模板硬编码 `#333`，需 SVG 后处理覆盖 `.label text` |
  | quadrant | quadrant* 系列 | `quadrant1~4Fill`、`quadrant1~4TextFill`、`quadrantPointFill`/`quadrantPointTextFill`、`quadrantXAxisTextFill`/`quadrantYAxisTextFill`、`quadrantTitleFill`、`quadrantInternal/ExternalBorderStrokeFill`；`quadrantBkgColor` 系为死键。四象限底色取主题状态色（`--mermaid-quadrant-fill-1~4` ← accent 绿/蓝/红/黄，对齐官方 Cynefin 语义），象限文字用 `readableTextOnFill` 按对比度自动取白/深墨 |
  | cynefin | 嵌套配置对象 | `vars.cynefin = { complexBg/complicatedBg/clearBg/chaoticBg/confusionBg, labelColor, textColor, boundaryColor/cliffColor/arrowColor, ... }`；五域底色取主题状态色（绿/蓝/红/黄/紫，中心=queued 紫）。条目徽标与域标签都压在同色域底色上（dist 实测 fill-opacity 0.95），五域同明度类（亮色主题全深、暗色主题全中亮）→ 单一 `labelColor`/`textColor` 由 `readableTextOnFill` 选取即可通吃 |
  | gitGraph | git* 系列 | `git0~7` 取品牌系列色 `chart-series-0~7`（主分支/提交点=品牌橙，其余分支绿/黄/蓝/紫/红），`gitBranchLabel0~7`、`commitLabelColor`/`commitLabelBackground`、`tagLabelColor/Background/Border`；后处理补丁逐分支 `.branchN path/line{stroke:branchColors[N]}` 着色，**删除** over-broad `.gitGraph path,.gitGraph line{stroke:branchColors[0]}` 压色规则（曾把全图分支线压成中性灰、被读作青色）；提交点 `.commit circle{fill:commitNodeColor}`（=chart-stroke-0 橙） |
  | timeline / kanban | cScale 系列同族 | `cScale0~11` + `cScaleLabel0~11`（genSections 按 `THEME_COLOR_LIMIT` 循环）、根节点 `git0`/`gitBranchLabel0`；`timelineGroupBg`/`kanbanColumnBkgColor` 为死键。kanban 节点底走 chart-fill × text-on-fill 配对 |
  | mindmap | cScale 系列 + git0 | `git0`（中心节点）、`cScale0~11`、`cScaleInv0~11`（分支线；classic 外观下视觉无效，由 SVG 后处理覆盖 `.section-edge-N`） |
  | treemap / venn | cScale 系列 | treemap `cScale0~7`（渲染器按深度取槽位）+ `textColor`/`titleColor`；venn `cScale0~12` + `vennSetTextColor`/`vennTitleTextColor`；`treemapLeaf0Color` 系为死键 |
  | block | 通用组 | `mainBkg`/`nodeBorder`/`textColor`/`nodeTextColor`/`titleColor`/`lineColor`/`arrowheadColor`/`edgeLabelBackground`/`clusterBkg`/`clusterBorder`；`blockBkgColor` 系为死键 |
  | architecture | arch* 系列 | `archEdgeColor`/`archEdgeArrowColor`/`archGroupBorderColor`；服务节点填充由 config.architecture 控制（无 themeVariables 键） |
  | sankey | 仅通用键 | 官方主题键仅 `textColor`（标签文字）+ `mainBkg`（标签光晕描边）；节点/流量带颜色由 config.sankey 控制；`sankeyNodeBkgColor` 系为死键 |
  | requirement | requirement* 系列 | `requirementBackground`/`requirementBorderColor`/`requirementTextColor`、`relationColor`、`relationLabelBackground`/`relationLabelColor`、`edgeLabelBackground`；`requirementBkgColor`/`elementBkgColor` 系为死键（元素框走通用 `mainBkg`/`nodeBorder`） |
  | treeView | 仅通用键 | 官方消费仅 `textColor`/`lineColor`（图标 `fill=currentColor` 随文字色）；`treeviewLabelColor` 系为死键 |
  | packet / c4 / zenuml | themeVariables 不适用 | packet 走 `packet.*` 配置组且上游有缺陷（SVG 后处理兜底）；C4 不接受 themeVariables（源码内样式声明）；ZenUML 插件不接受 themeVariables（后处理注入） |
  | 全类型连线标签 | 官方键 `edgeLabelBackground` | `edgeLabelBg`/`edgeLabelTextColor` 为死键；取画布色让标签底融入页面（泳道黑底色块即死键落回默认深色所致） |
  | radar | cScale 系列 | `cScale0~cScale4`（**不是** `radarCurve0~4`） |
  | sankey | 可单独配置 | `sankeyNodeBkgColor` 等 |
  | requirement | 专用 | `requirementBkgColor`、`elementBkgColor` |
  | C4 | **不支持 themeVariables** | 图表源码内 `UpdateElementStyle(user, $fontColor=..., $bgColor=...)` |
  | Treemap | 不暴露变量 | classDef important 方式 |
  | Packet | themeVariables 有 Bug | SVG 后处理（见 M2） |

- **反例**：timeline 用 `timelineGroupBg` → 暗色主题黑底（BUG-040）；radar 用 `radarCurve0~4` → 变量不被识别（DEC-016）。
- **事实源**：BUG-040~042；DEC-016、DEC-017；lessons 05/06/07/08

## M4: 三层适配架构与缓存版本号 🟡

- **主张**：图表主题适配采用三层架构：主题 CSS 定义 `--mermaid-*` 变量（统一引用 `--chart-*`）→ 组件 `getMermaidColors()` 读取 → themeVariables / SVG 后处理注入；修改配色逻辑后必须更新缓存版本号强制刷新。
- **适用**：多主题 + 多图表类型的图表适配工程。
- **Why**：每主题各维护一套完整变量会产生海量重复定义（本项目曾 328 个重复变量）；收敛到适配器层统一管理。Mermaid 渲染结果按主题签名缓存，不改版本号会复用旧结果。
- **How**：
  1. `styles/themes/core/mermaid/*.css` 定义 `--mermaid-*`，引用 `var(--chart-*)`
  2. `getMermaidColors()` 读 CSS 变量生成配色对象
  3. `getMermaidThemeSignature()` 追踪影响渲染的变量用于缓存失效
  4. cacheKey 内嵌 `_version`，改配色逻辑即升级（如 v28 → v29）
- **反例**：只改注入逻辑不升版本号 → 主题切换后图表仍是旧配色（BUG-046）。
- **事实源**：DEC-014；BUG-046；lessons 08

## M5: 已知 Mermaid Bug 清单 🟢

- **主张**：以下为项目实测确认的 Mermaid 已知问题与规避姿势（当前 12.2.0），升级 Mermaid 后必须重新验证。
- **适用**：本项目技术栈（Mermaid 12.2.0 + Tauri WebView）；换版本/换环境必须重新核对。
- **Why**：这些是上游 Bug，本项目无法修复，只能规避；版本升级后行为可能变化。
- **How**：
  - Packet：themeVariables 不传播到样式函数（issue #7058）→ SVG 后处理 `patchPacketSvg`，`aria-roledescription="packet"` 检测 + `#svgId` 作用域
  - `htmlLabels: false` 时文字不居中（issue #1177，mermaid 12.2.0 已修复 #8390；本项目仍钉 `htmlLabels: true`）→ 嵌入式 WebView 文字不可见见 BUG-015 的完整决策链
  - Mermaid 中文/CJK 字符宽度计算错误，每节点缺末字符 → 无解，等官方；降级 v10 会 esbuild 报错
  - Wardley：渲染器从 `themeVariables.wardley` 子对象读样式，不是顶层变量；SVG 内无 `.wardley-map` class
  - Treemap：不暴露任何 themeVariables → classDef important
- **反例**：假设「官方文档写了就该生效」——Packet 的 `packetTextColor` 传入完全不生效。
- **事实源**：BUG-015；DEC-015；lessons 08；BUG-050

## M6: 思维导图配色专项 🟡

- **主张**：思维导图用统一单色方案（所有级别同填充/同文字），文字色由 `cScaleInv` 系列控制；背景色与文字色必须分离成独立配置字段。
- **适用**：mindmap 图表主题适配。
- **Why**：① 多级配色视觉不统一且维护困难；② Mermaid 用 `cScaleInv0` 控制中心节点文字色而非 `primaryTextColor`，单设一个变量必漏；③ 深/亮主题的中心节点对比度策略不同。
- **How**：`mindmapLevel1~3BgColor`/`TextColor`/`mindmapCenterBgColor`/`TextColor` 全部设同色；`cScale0~5 = 背景色`、`cScaleInv0~5 = 文字色`；`darkMode = isLight ? false : true`；SVG 后处理用 `[class*="mindmap"]` 覆盖 circle/rect/ellipse/text/连接线。
- **反例**：把 `cScaleInv0` 设成背景色 → 中心节点文字与背景同色不可见（lessons 07）；只设 `primaryTextColor` → 中心文字不变（lessons 07）。
- **事实源**：BUG-044；lessons 06/07

## M7: 任何渲染产出变更都必须 bump 自建渲染缓存版本键 🟡

- **主张**：只要改动了图表渲染的产出逻辑——后处理 CSS、themeVariables 注入、主题色板、布局——而不只是升级引擎，就必须同步 bump 项目自建渲染缓存的版本键（cacheKey 内的 `_version`）；缓存键若含「内容签名」（如 CSS 变量签名），签名必须纳入**全部**影响产出的 token。两者缺一，改完源数据缓存仍复用旧产物，症状与「从未修改」完全一致。
- **适用**：任何有「自建渲染缓存 + 可迭代产出逻辑」的图表/渲染管线。
- **Why**：三类实证。① BUG-077 连续三轮修复（themeVariables 注入 → section 规则 → 内联取墨）在实机零效果，根因是 `_version` 停在旧值，缓存命中即 `setSvgHtml(cached.svgHtml); return`，整段渲染与后处理被跳过；② 改主题 mindmap 色板后用户重启仍无变化，第二因是 `themeSignature` 只收了 `--mermaid-mindmap-branch-line-*`，未收实际消费的 `--mermaid-mindmap-branch-0..4` 与 `l*-text`，签名不变即命中；③ 引擎升级版：mermaid 12 的 neo 外观给节点/边加 `drop-shadow` 灰影，未 bump 则跨版本复用带影字符串（BUG-065）。
- **How**：缓存键 `_version` 随任何产出变更 +1（如 v44→v45→v46→v47）；`themeSignature` 的 token 清单与渲染实际消费的 token 逐一对齐（新增消费 token 时同步入签名）；外观类默认值变更（neo / redux-color）以「钉位」冻结（`look: "classic"`，阅读 + 导出两处 initialize）；验证用真实浏览器 `getComputedStyle` 看实际色值与 `filter`，而非只读源码。
- **反例**：改了 SVG 后处理逻辑但未 bump `_version` → 三轮修复在实机零效果，全部误判为「级联/取墨数学」问题；`themeSignature` 漏收 token → 重新生成主题后用户重启仍看到旧色板；mermaid 12 升级后未 bump → 带曲线连接的图表节点与边缘残留灰色半透明污影，切 Tab 残留、重启才消失（BUG-065）。
- **事实源**：BUG-077（2026-10-19~20 全链路）；BUG-065；DEC-033；M4（缓存版本号基础规则）

## M8: 注入主题键前先在安装版 dist 检索键名（ER v2 键名换代教训）🔴

- **主张**：给任何 mermaid 图表类型注入 `themeVariables` 前，必须先在安装版本的 dist（`node_modules/.pnpm/mermaid@*/node_modules/mermaid/dist` 递归全部 .mjs）里对键名做全文检索确认存在；0 命中即死键，注入静默失效。SVG 后处理选择器同理——先确认 DOM 类名仍在。
- **适用**：所有 mermaid 图表类型的主题适配，尤其渲染引擎大版本升级之后。
- **Why**：mermaid ≥11 把 ER 重写为 v2 统一渲染器：v10 键名 `entityBkg`/`entityBorder`/`entityTextColor`/`relationshipColor` 全部移除（12.2.0 dist `entityBkg` 0 命中），DOM 类 `.attributeBoxOdd/Even` 也已删除——注入与 SVG 补丁两条路径同时死掉，症状与「从未适配」无异（BUG-069）。官方键 `attributeBackgroundColorOdd/Even`（属性行）、`mainBkg`/`nodeBorder`（实体框）、`lineColor`（关系线）、`textColor`/`nodeTextColor`/`titleColor`（文字）通过 dist 检索 5 分钟即可证实，盲改半天无从定位。
- **How**：
  ```bash
  node -e "const fs=require('fs'),path=require('path');const dir=path.dirname(require.resolve('mermaid'));/* 递归收集 .mjs 拼接后 indexOf 计数 */"
  ```
  或直接对 dist 目录逐文件全文检索键名；同时用 `Select-String`/`indexOf` 上下文提取样式函数（如 ER 的 `getStyles`）确认键→元素的映射关系。
- **反例**：在死键上叠加第二层 SVG 后处理补丁，补丁选择器引用的 DOM 类同样已被移除——双保险变成双失效（BUG-069 修复前状态）。
- **事实源**：BUG-069；mermaid 12.2.0 dist 检索记录（`entityBkg`=0、`attributeBox`=0、`attributeBackgroundColorOdd`=66、`mainBkg`=529、`nodeBorder`=417）

## M9: mermaid 派生色可能被主题基类无条件重写 🔴

- **主张**：通过 `themeVariables` 注入「派生色」（如 `cScaleLabel*`）前，必须先 grep 该 token 在 mermaid dist 里是否被主题基类构造函数用 `darken`/`lighten`/`invert` 二次计算；**无 `||` 守卫**的下料式重写会让注入值整个失效——注入成功了却看不到效果。
- **适用**：所有向 mermaid 注入派生类主题变量的场景（cScaleLabel / cScaleInv / cScalePeer / scaleLabelColor 等），与 M8（键名不存在）互补：M8 查「键在不在」，本条查「值会不会被改」。
- **Why**：mermaid 12.2.0 主题基类的 `updateColors` 中 `this["cScaleLabel"+i] = darken_default(this["cScale"+i], 75)` 是**无条件**赋值（同文件其他派生色都用 `||` 守卫），注入值被整体覆盖成「色相不变、明度压 75%」的暗色。表现为节点文字呈「填充色加深版」，与取墨算法优不优毫无关系。
- **How**：`Select-String -Path node_modules/mermaid/dist/chunks/mermaid.esm/*.mjs -Pattern "cScaleLabel"` 定位重写点并读上下文确认有无 `||` 守卫；确认被覆盖时改走「注入源头变量」（如改 `cScale` 让派生值自动正确）或 SVG 后处理，不要在已被覆盖的键上叠补丁。
- **反例**：在 `cScaleLabel` 上连续叠 themeVariables 注入、section 规则、`#nid` 规则三层补丁——注入层被基类覆盖、后两层受文字载体与 id 解析影响，三层全不生效，却判定为「取墨算法不够优」而升级算法（BUG-077 首轮误诊）。
- **事实源**：BUG-077；mermaid 12.2.0 主题基类 `cScaleLabel` 重写段

## M10: mermaid 文字载体可能是 HTML span，`text{fill}` 对其无效 🟡

- **主张**：覆盖 mermaid 图表文字色时，后处理 CSS 必须同时覆盖 `span`（`color`）与 `text`/`tspan`（`fill`）两类载体；只写 `text{fill}` 在开启 `htmlLabels` 的类型上完全无效。
- **适用**：所有 mermaid 图表类型的文字色后处理，尤其 mindmap / flowchart 等默认走 `htmlLabels` 的类型。
- **Why**：`htmlLabels` 把标签渲染为 `foreignObject` 内的 HTML `<span><p>`——实测某 mindmap 产出 `<text>` 0 个、`<span>` 19 个。`fill` 是 SVG 表现属性，对 HTML 元素不生效，只有 `color` 有效；反之 `color` 也不负责 SVG `text` 的填充。两类都要写才能通吃。
- **How**：规则写成 `.xxx span, .xxx text, .xxx tspan { fill: <ink> !important; color: <ink> !important; }`——两个属性都写，HTML 元素忽略 `fill`、SVG 元素忽略 `color`，互不干扰，也免去在渲染侧判断元素类型（`instanceof SVGElement` 一旦抛错会被外层 catch 静默吞掉）。
- **反例**：只写 `#nid text{fill:ink}` → 文字实为 HTML span，规则静默不命中，文字保持主题默认色（BUG-077 中多轮修复无效的原因之一）。
- **事实源**：BUG-077；mindmap 渲染产出 DOM 实测（`text` 0 / `span` 19）

## M11: mindmap 按层级分色走 `colorBy: "depth"` 🟡

- **主张**：思维导图要「同层级同色、层级间递进」（主流思维导图读法）时用 `mindmap: { colorBy: "depth" }`；要「同分支同色」才用 `"branch"`。两种策略可共用同一套色板，差别只在映射依据。
- **适用**：mermaid mindmap 的配色设计；需要提供多种分色策略的产品。
- **Why**：`colorBy: "branch"` 把 section 按**分支**分配，同分支跨层级同色；`colorBy: "depth"` 把 section 按**层级**分配，节点底取 `cScale(depth-1)`、连线取 `cScaleInv(depth-1)`，天然实现层级分色，无需自己从 SVG 反查节点层级（此前自写的逐节点深度解析正则还因边 id 带渲染前缀从未命中）。
- **How**：`mermaid.initialize({ mindmap: { colorBy: "depth" } })` + `cScale0..11` 按层级排色板（cScale0=root/L2、cScale1=L3……）；想换回按分支分色只改这一个配置值，色板不动，两档可并列供用户选择。
- **反例**：默认落在 `"branch"` 却按「层级分色」做产品设计 → 用户看到的同色块跨越多个层级，与心智模型相反（用户指出「正常思维导图按层级划分颜色」）。
- **事实源**：BUG-077 后续；mermaid 12.2.0 mindmap `colorBy` 行为实测（真浏览器渲染：二级节点全同色、三级全同色）
