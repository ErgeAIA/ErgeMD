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
  | flowchart / sequence / gantt / pie / class / state / ER / journey | 通用 themeVariables | `actorBkg`、`pieColors`、`classBkg` 等 |
  | mindmap | 专用 + 多变量冗余 | `mindmapLevel1~3BgColor`、`cScale0~5`、`cScaleInv0~5`（中心文字色） |
  | xychart | 嵌套对象 | `vars.xyChart = { backgroundColor }`，扁平结构无效 |
  | gitGraph | 专用 | `git0~git3`、`commitLabelColor`、`commitNodeColor` |
  | timeline | cScale 系列 | `cScale0~cScale11` + `cScaleLabel0~11`（**不是** `timelineGroupBg`） |
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
