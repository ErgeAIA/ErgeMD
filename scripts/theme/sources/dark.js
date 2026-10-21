/**
 * dark 主题源色表 —— dark 主题唯一的手写处。
 * 生成物 src/styles/themes/dark.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 * 值源：ThemeVault themes/erge/dark（ErgeAIA #151）按语义组映射：
 *   背景/文本/边框 → canvas/ink；强调色 → brand / headingHues / link
 *   状态色 → accent 各槽（-on-dark 派生值预计算为 hex：parseHex 不接受 color-mix()）
 *   语法高亮 → code（浅底原值在代码底 #2C2620 上 ≤2.2:1 不可读，
 *     沿用状态色同款「白混 on-dark」模式派生，配比见各注释）
 * 注意：dark.css 中的 --accent-cyan-dim/--accent-cyan-glow 为派生层
 * （theme-derived.css:121-122）的重复定义，此处不收录，由派生层继续提供。
 */
export default {
  name: "dark",
  canvas: {
    reader: "#241F1B", // bg-surface
    code: "#2C2620", // bg-surface-2
    sidebar: "#1A1714", // bg
    page: "#1A1714", // bg
    secondary: "#2E2823", // bg-elevated
    tertiary: "#2C2620", // bg-surface-2
  },
  ink: {
    heading: "#F3EDE7", // text
    primary: "#F3EDE7", // text
    secondary: "#C9C2B8", // text-muted
    muted: "#858079", // text-dim
  },
  // 状态色落槽（-on-dark 预计算）+ 缺失槽近邻：cyan→info、pink→accent-secondary、purple→queued
  accent: {
    cyan: "#7480CB", // info-on-dark（info 74% + 白 26%）
    pink: "#FF7A3D", // accent-secondary（行内代码文字位）
    purple: "#8A76D2", // queued-on-dark（79% + 白 21%）
    green: "#519175", // ok-on-dark（ok 80% + 白 20%）
    yellow: "#9F803B", // warn-on-dark（warn 82% + 白 18%）
    orange: "#F2570F", // accent
    red: "#CF645C", // danger-on-dark（danger 78% + 白 22%）
  },
  brand: {
    primary: "#F2570F", // accent
    secondary: "#FF7A3D", // accent-secondary
    logo: "#F2570F", // accent
  },
  // 六级标题：强调色阶 h2 accent → h3 accent-secondary → h4 accent-hover；h1/h5/h6 中性墨
  // （生成时按画布调校至 ≥4.5:1，色相不变）
  headingHues: ["#F3EDE7", "#F2570F", "#FF7A3D", "#C2460B", "#C9C2B8", "#858079"],
  // 图表类别：accent + 状态色 -on-dark
  chartHues: ["#F2570F", "#519175", "#7480CB", "#9F803B", "#8A76D2", "#CF645C"],
  // 思维导图层级色板（root/L2、L3、L4、L5、L6）：品牌色 + 状态色，色相按
  // 暖→冷递进（橙→黄→绿→蓝→紫）。取状态色**基础值**而非 -on-dark 派生值：
  // mindmap 是大块实底，-on-dark 派生值属中明度，黑/白两端都只到 4.4 配不到
  // 4.5:1；基础值配白字可稳达 4.8–5.7。文字色由生成器按底色自动配对。
  // 覆盖 core 的 chart-fill 映射——chart-fill 走 fillBand 低彩度填充带，用作
  // mindmap 主色会让本主题失去品牌与语义识别度
  mindmapHues: ["#F2570F", "#8A6410", "#257552", "#4353B8", "#6B51C6"],
  // 数据序列：同上重排
  seriesHues: ["#F2570F", "#519175", "#9F803B", "#7480CB", "#8A76D2", "#CF645C"],
  // 图表填充带（OKLCH）：按 theme-dark-base 现行 fill-0..5 实测中位校准（L 0.38 / C 0.021）。
  // 注意：CSS 内联 oklch 注释为近似值（实测 #3A3A4A 为 L 0.36/C 0.028，注释写 0.22/0.08），
  // 不作为依据；本带使派生 fill 与现行值肉眼一致（色相来自 chartHues，允许微小差异）
  fillBand: { l: 0.38, c: 0.02 },
  // 代码高亮：语法高亮组 + 状态色同款 -on-dark 白混派生（hex 为 color-mix 预计算）
  code: {
    keyword: "#B773C9", // syntax-keyword + 白 36%
    string: "#6CA470", // syntax-string + 白 30%
    number: "#AD894D", // syntax-literal + 白 30%
    comment: "#87909B", // syntax-comment + 白 25%
    function: "#6D90DB", // syntax-title + 白 35%
    text: "#F3EDE7", // text
    label: "#62A5B7", // syntax-attr + 白 35%
    copySuccess: "#519175", // ok-on-dark
  },
  scrollbar: {
    track: "transparent",
    thumb: "#4A4339", // border-strong
    thumbHover: "#C2460B", // border-focus
  },
  // 图表中性组：调色板中性面
  chartNeutral: {
    edge: "#858079", // text-dim
    labelBg: "#241F1B", // bg-surface
    surface1: "#2E2823", // bg-elevated
    surface2: "#241F1B", // bg-surface
    surface3: "#2C2620", // bg-surface-2
    text: "#F3EDE7", // text
    textMuted: "#C9C2B8", // text-muted
  },
  // 图表备用槽 6/7（fill 槽保留现行中性；色槽落状态色/中性墨）
  chartSpare: {
    fill6: "#423A48",
    fill7: "#484848",
    stroke6: "#6478D9", // info-fill
    stroke7: "#858079", // text-dim
    series6: "#6478D9", // info-fill
    series7: "#CF645C", // danger-on-dark
  },
  // 透传组：键为 CSS token 名，值为字面量（dark.css 全量，accent-*-dim/glow 除外；
  // divider/table-border/border-subtle 按 R12 统一走 mixWith 派生，不在此透传）
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #F2570F, #FF7A3D)",
    // toc-hover-bg / toc-text-active 已删：随 theme-dark-base 统一规则（bg-page/brand-primary + alpha，BUG-074/075）
    "toc-hover-shadow": "0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06)",
    "toc-text-inactive": "rgba(166, 166, 166, 0.65)",
    "hover-bg": "#322A24", // bg-hover
    "selected-bg": "rgba(242, 87, 15, 0.18)",
    "active-border": "#C2460B", // border-focus
    "selection-bg": "rgba(242, 87, 15, 0.25)",
    "selection-text": "#F3EDE7",
    "search-highlight": "rgba(220, 220, 170, 0.25)",
    "search-highlight-active": "rgba(220, 220, 170, 0.50)",
    "reader-bg-elevated": "#2E2823",
    "link": "#FF7A3D",
    "status-bar-bg": "rgba(40, 40, 48, 0.80)",
    "blockquote-bg": "rgba(255, 122, 61, 0.10)", // accent-secondary 染
    "blockquote-text": "#C9C2B8",
    "inline-code-bg": "rgba(255, 122, 61, 0.15)", // accent-secondary 染
    "inline-code-text": "#FF7A3D",
    "table-header-bg": "rgba(242, 87, 15, 0.08)",
    "table-header-text": "#F2570F",
    "table-hover-bg": "rgba(255, 255, 255, 0.03)",
    "hover-bg-subtle": "rgba(242, 87, 15, 0.03)",
    "hover-bg-light": "rgba(255, 255, 255, 0.05)",
    "hover-bg-medium": "rgba(255, 255, 255, 0.10)",
    "hover-close-bg": "rgba(194, 56, 46, 0.6)", // danger
    "shadow-popup": "0 4px 24px rgba(0, 0, 0, 0.5)",
    "shadow-menu": "0 4px 16px rgba(0, 0, 0, 0.4)",
    "overlay-bg": "rgba(0, 0, 0, 0.85)",
    "danger-hover-bg": "rgba(194, 56, 46, 0.15)", // danger
    "titlebar-gradient":
      "linear-gradient(90deg, transparent 0%, rgba(242, 87, 15, 0.4) 15%, rgba(255, 122, 61, 0.2) 50%, rgba(206, 145, 120, 0.15) 85%, transparent 100%)",
    "code-label-bg": "rgba(242, 87, 15, 0.03)",
    "code-border": "rgba(242, 87, 15, 0.08)",
    "logo-bg": "linear-gradient(135deg, rgba(242, 87, 15, 0.15), rgba(255, 122, 61, 0.1))",
    "logo-border": "rgba(242, 87, 15, 0.10)",
    "drop-zone-border": "rgba(242, 87, 15, 0.15)",
    "drop-zone-hover-border": "rgba(242, 87, 15, 0.30)",
    "btn-primary-bg": "rgba(242, 87, 15, 0.10)",
    "btn-primary-border": "rgba(242, 87, 15, 0.20)",
    "btn-primary-hover-bg": "rgba(242, 87, 15, 0.15)",
    "btn-secondary-bg": "rgba(255, 255, 255, 0.05)",
    "btn-secondary-border": "rgba(255, 255, 255, 0.10)",
    "btn-secondary-hover-bg": "rgba(255, 255, 255, 0.10)",
    // 状态色 → toast
    "toast-info-bg": "rgba(67, 83, 184, 0.08)", // info
    "toast-info-border": "rgba(67, 83, 184, 0.20)",
    "toast-success-bg": "rgba(37, 117, 82, 0.08)", // ok
    "toast-success-border": "rgba(37, 117, 82, 0.20)",
    "toast-error-bg": "rgba(194, 56, 46, 0.08)", // danger
    "toast-error-border": "rgba(194, 56, 46, 0.20)",
    "toast-warning-bg": "rgba(138, 100, 16, 0.08)", // warn
    "toast-warning-border": "rgba(138, 100, 16, 0.20)",
    "slider-glow": "0 0 4px rgba(242, 87, 15, 0.3)",
    "pulse-glow-dim": "0 0 5px rgba(242, 87, 15, 0.2)",
    "pulse-glow-bright": "0 0 20px rgba(242, 87, 15, 0.4)",
    // 状态色 → callout（-on-dark）
    "obsidian-callout-note": "#7480CB", // info
    "obsidian-callout-abstract": "#7480CB",
    "obsidian-callout-info": "#7480CB",
    "obsidian-callout-todo": "#7480CB",
    "obsidian-callout-tip": "#519175", // ok
    "obsidian-callout-success": "#519175",
    "obsidian-callout-question": "#B2820B", // warn-fill
    "obsidian-callout-warning": "#9F803B", // warn-on-dark
    "obsidian-callout-failure": "#CF645C", // danger
    "obsidian-callout-danger": "#CF645C",
    "obsidian-callout-bug": "#CF645C",
    "obsidian-callout-example": "#8A76D2", // queued
    "obsidian-callout-quote": "#858079", // text-dim
  },
};
