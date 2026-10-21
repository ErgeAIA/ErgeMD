/**
 * light 主题源色表 —— light 主题唯一的手写处。
 * 生成物 src/styles/themes/light.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 * 值源：ThemeVault themes/erge/light（ErgeAIA #152）按语义组映射：
 *   背景/文本/边框 → canvas/ink（divider/table-border/border-subtle 仍按 R12 由画布派生）
 *   强调色 → brand / headingHues / link
 *   状态色 → accent 绿黄红蓝紫槽 + toast-* / obsidian-callout-*
 *   语法高亮 → code（comment/keyword/string/literal/title/attr 一一对应）
 * 字段分工（design §5/§6 + SDD 台账 R11）：
 *   派生：headingHues→h1..6（调校至 ≥4.5:1）、chartHues→fill-0..5（fillBand）与
 *        stroke-0..5（恒等）、seriesHues→series-0..5（恒等）、text-on-fill-0..7（选墨）、
 *        divider/table-border/border-subtle（mixWith 固定比例）、accent/brand 的 -rgb 三元组
 *   透传：chartNeutral / chartSpare / passthrough（其余全部现行值）
 */
export default {
  name: "light",
  canvas: {
    reader: "#FAF1E9", // bg
    code: "#EDE8DE", // bg-surface-2
    sidebar: "#FBE8DD", // bg-surface
    page: "#FBE8DD", // bg-surface
    secondary: "#FFFFFF", // bg-elevated / card
    tertiary: "#EDE8DE", // bg-surface-2
  },
  ink: {
    heading: "#171614", // text
    primary: "#171614", // text
    secondary: "#55524C", // text-muted
    muted: "#706E69", // text-dim
  },
  // 状态色落槽 + 调色板缺失槽近邻：cyan/blue→info、pink→accent-hover、purple→queued
  accent: {
    cyan: "#4353B8", // info
    pink: "#D15723", // accent-hover（行内代码文字位，AA 达标）
    purple: "#6B51C6", // queued
    green: "#257552", // ok
    yellow: "#8A6410", // warn
    red: "#C2382E", // danger
    orange: "#FF6A2B", // accent
    blue: "#4353B8", // info
  },
  brand: {
    primary: "#FF6A2B", // accent
    secondary: "#F07A3D", // accent-secondary
    logo: "#FF6A2B", // accent
  },
  // 六级标题：强调色阶 h2 accent → h3 accent-hover → h4 accent-deep；h1/h5/h6 中性墨
  // （生成时按画布调校至 ≥4.5:1，色相不变）
  headingHues: ["#171614", "#FF6A2B", "#D15723", "#B84A14", "#55524C", "#706E69"],
  // 图表类别：强调色 + 状态色（accent/ok/info/warn/queued/danger）
  chartHues: ["#FF6A2B", "#257552", "#4353B8", "#8A6410", "#6B51C6", "#C2382E"],
  // 思维导图层级色板（root/L2、L3、L4、L5、L6）：品牌色 + 状态色，色相按
  // 暖→冷递进（橙→黄→绿→蓝→紫）。亮画布主题取状态色 **-fill 版**（比基础值
  // 亮一档，作实底更鲜明、不与暗画布的 dark 主题撞车）；fill 版属中明度，
  // 配黑字可达 4.99–6.11（配白字仅 3.4–4.2 会跌破门槛），文字由生成器自动配对。
  // 覆盖 core 的 chart-fill 映射——chart-fill 走 fillBand 低彩度填充带，用作
  // mindmap 主色会让本主题失去品牌与语义识别度
  mindmapHues: ["#FF6A2B", "#B2820B", "#2E8A5F", "#6478D9", "#8B6FE0"],
  // 数据序列：同上重排
  seriesHues: ["#FF6A2B", "#257552", "#8A6410", "#4353B8", "#6B51C6", "#C2382E"],
  // 图表填充带（OKLCH）：按现行 fill-0..5 实测中位校准（L 0.97 / C 0.018）。
  // 注意：CSS 内联 oklch 注释为近似值（实测 #EEF4FF 为 L 0.97/C 0.016，注释写 0.94/0.04），
  // 不作为依据；本带使派生 fill 与现行值肉眼一致（色相来自 chartHues，允许微小差异）
  fillBand: { l: 0.97, c: 0.02 },
  // 代码高亮：语法高亮组一一对应（text=主文本，copySuccess=ok）
  code: {
    keyword: "#8E24AA", // syntax-keyword
    string: "#2E7D32", // syntax-string
    number: "#8A5700", // syntax-literal
    comment: "#5F6B7A", // syntax-comment
    function: "#1E55C7", // syntax-title
    text: "#171614", // text
    label: "#0E7490", // syntax-attr
    copySuccess: "#257552", // ok
  },
  scrollbar: {
    track: "transparent",
    thumb: "#D2CCBE", // border-strong
    thumbHover: "#C9A48C", // border-focus
  },
  // 图表中性组：调色板中性面
  chartNeutral: {
    edge: "#D2CCBE", // border-strong
    labelBg: "#F2E9E0", // hairline
    surface1: "#FFFFFF", // bg-elevated
    surface2: "#F2E9E0", // hairline
    surface3: "#EDE8DE", // bg-surface-2
    text: "#171614", // text
    textMuted: "#706E69", // text-dim
  },
  // 图表备用槽 6/7（fill 槽保留现行中性；色槽落状态色/中性墨）
  chartSpare: {
    fill6: "#F8EEFF",
    fill7: "#F5F5F5",
    stroke6: "#4353B8", // info
    stroke7: "#706E69", // text-dim
    series6: "#4353B8", // info
    series7: "#C2382E", // danger
  },
  // 透传组：键为 CSS token 名，值为字面量
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #FF6A2B, #F07A3D)",
    "status-bar-bg": "rgba(255, 255, 255, 0.60)",
    "reader-bg-elevated": "#FFFFFF",
    "link": "#C2460B",
    "hover-bg": "#F3E5DB", // bg-hover
    "active-border": "#C9A48C", // border-focus
    // 状态色 → toast（rgb 与 ok/warn/danger/info 一致）
    "toast-info-bg": "rgba(67, 83, 184, 0.08)",
    "toast-info-border": "rgba(67, 83, 184, 0.20)",
    "toast-success-bg": "rgba(37, 117, 82, 0.08)",
    "toast-success-border": "rgba(37, 117, 82, 0.20)",
    "toast-error-bg": "rgba(194, 56, 46, 0.08)",
    "toast-error-border": "rgba(194, 56, 46, 0.20)",
    "toast-warning-bg": "rgba(138, 100, 16, 0.08)",
    "toast-warning-border": "rgba(138, 100, 16, 0.20)",
    "titlebar-gradient":
      "linear-gradient(90deg, transparent 0%, rgba(255, 106, 43, 0.3) 15%, rgba(255, 122, 61, 0.15) 50%, rgba(242, 87, 15, 0.1) 85%, transparent 100%)",
    // 状态色 → callout
    "obsidian-callout-note": "#4353B8", // info
    "obsidian-callout-abstract": "#4353B8",
    "obsidian-callout-info": "#4353B8",
    "obsidian-callout-todo": "#4353B8",
    "obsidian-callout-tip": "#257552", // ok
    "obsidian-callout-success": "#257552",
    "obsidian-callout-question": "#B2820B", // warn-fill
    "obsidian-callout-warning": "#8A6410", // warn
    "obsidian-callout-failure": "#C2382E", // danger
    "obsidian-callout-danger": "#C2382E",
    "obsidian-callout-bug": "#C2382E",
    "obsidian-callout-example": "#6B51C6", // queued
    "obsidian-callout-quote": "#706E69", // text-dim
  },
};
