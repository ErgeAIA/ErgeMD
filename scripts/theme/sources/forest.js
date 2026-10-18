/**
 * forest 主题源色表 —— 本文件是 forest 主题唯一的手写处。
 *
 * 值全部从 src/styles/themes/forest.css 转录（2026-10-18 阶段 3 迁移）。
 * 主题特色：森林绿基色画布（#1A2820 / #222E28）+ 苔藓绿、橄榄绿图表填充。
 * 注意：本主题的 chart-series-0..5 与 chart-stroke-0..5 顺序不同，分别转录。
 *
 * 生成物 src/styles/themes/forest.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "forest",
  canvas: {
    reader: "#222E28",
    code: "#1E2A24",
    sidebar: "#1A2420",
    page: "#1A2820",
    secondary: "#222E28",
    tertiary: "#1E2A24",
  },
  ink: {
    heading: "#E8F0E8",
    primary: "#D8E8D8",
    secondary: "#8AAA80",
    muted: "#808870",
  },
  accent: {
    cyan: "#4DB6AC",
    pink: "#F48FB1",
    purple: "#9575CD",
    green: "#50A14F",
    yellow: "#C0CA33",
    red: "#E57373",
    orange: "#FFA726",
    blue: "#4DB6AC",
  },
  brand: {
    primary: "#66BB6A",
    secondary: "#9575CD",
    logo: "#66BB6A",
  },
  // 标题色相种子（生成时按画布调校至 ≥4.5:1）
  headingHues: ["#E8F0E8", "#66BB6A", "#AED581", "#C0CA33", "#81C784", "#788778"],
  // 图表类别色相（= 现行 chart-stroke-0..5）
  chartHues: ["#66BB6A", "#81C784", "#AED581", "#C0CA33", "#4DB6AC", "#9575CD"],
  // 数据序列色（= 现行 chart-series-0..5，与本主题 stroke 序列不同）
  seriesHues: ["#66BB6A", "#AED581", "#C0CA33", "#4DB6AC", "#9575CD", "#F48FB1"],
  chartNeutral: {
    edge: "#808870",
    labelBg: "#222E28",
    surface1: "#222E28",
    surface2: "#1E2A24",
    surface3: "#1A2820",
    text: "#D8E8D8",
    textMuted: "#8AAA80",
  },
  chartSpare: {
    fill6: "#385850",
    fill7: "#385860",
    stroke6: "#F48FB1",
    stroke7: "#FFA726",
    series6: "#FFA726",
    series7: "#81C784",
  },
  // 图表填充带（OKLCH）：按现行 chart-fill-0..5 实测中位校准（L 0.460 / C 0.047）。
  // 现行 fill 明度跨度 0.29–0.52（fill-4 #4A7850 偏亮，与 chart-text 仅 4.02:1 不达标，
  // BUG-068）；统一入带后各槽明度一致，text-on-fill 由公式选定后对比度达标
  fillBand: { l: 0.46, c: 0.047 },
  code: {
    keyword: "#9575CD",
    string: "#50A14F",
    number: "#C0CA33",
    comment: "#6B7280",
    function: "#66BB6A",
    text: "#D8E8D8",
    label: "#FFA726",
    copySuccess: "#50A14F",
  },
  scrollbar: {
    track: "transparent",
    thumb: "#506858",
    thumbHover: "#708878",
  },
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #66BB6A, #9575CD)",
    "titlebar-gradient": "linear-gradient(90deg, #66BB6A, #9575CD, #4DB6AC)",
    "reader-bg-elevated": "#1E2A24",
    "status-bar-bg": "rgba(34, 46, 40, 0.80)",
    "obsidian-callout-note": "#50a070",
    "obsidian-callout-abstract": "#40a080",
    "obsidian-callout-info": "#409080",
    "obsidian-callout-todo": "#409080",
    "obsidian-callout-tip": "#50a070",
    "obsidian-callout-success": "#50b060",
    "obsidian-callout-question": "#70b040",
    "obsidian-callout-warning": "#c0a040",
    "obsidian-callout-failure": "#c06050",
    "obsidian-callout-danger": "#c04040",
    "obsidian-callout-bug": "#b05060",
    "obsidian-callout-example": "#7060b0",
    "obsidian-callout-quote": "#707070",
  },
};
