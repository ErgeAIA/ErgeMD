/**
 * light 主题源色表 —— light 主题唯一的手写处。
 * 生成物 src/styles/themes/light.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 * 字段分工（design §5/§6 + SDD 台账 R11）：
 *   派生：headingHues→h1..6（调校至 ≥4.5:1）、chartHues→fill-0..5（fillBand）与
 *        stroke-0..5（恒等）、seriesHues→series-0..5（恒等）、text-on-fill-0..7（选墨）、
 *        divider/table-border/border-subtle（mixWith 固定比例）、accent/brand 的 -rgb 三元组
 *   透传：chartNeutral / chartSpare / passthrough（其余全部现行值）
 */
export default {
  name: "light",
  canvas: {
    reader: "#FFFFFF",
    code: "#F8F8F8",
    sidebar: "#F2F2F2",
    page: "#F7F7F7",
    secondary: "#FEFEFE",
    tertiary: "#F0F0F0",
  },
  ink: {
    heading: "#222222",
    primary: "#2D2D2D",
    secondary: "#4A4A4A",
    muted: "#6E6E6E",
  },
  accent: {
    cyan: "#0C9CB8",
    pink: "#DB2777",
    purple: "#7B38ED",
    green: "#179E49",
    yellow: "#B87F00",
    red: "#D92323",
    orange: "#E35410",
    blue: "#2666F0",
  },
  brand: {
    primary: "#2666F0",
    secondary: "#7B38ED",
    logo: "#2666F0",
  },
  // 六级标题色相种子（现行 h1..h6；生成时按画布调校至 ≥4.5:1，色相不变）
  headingHues: ["#1A1A1A", "#2666F0", "#E84093", "#E25610", "#19A04D", "#787D86"],
  // 图表类别色相种子（= 现行 chart-stroke-0..5）
  chartHues: ["#2666F0", "#7B38ED", "#179E49", "#B87F00", "#DB2777", "#E35410"],
  // 数据序列种子（= 现行 chart-series-0..5，为六色相的重排）
  seriesHues: ["#2666F0", "#179E49", "#B87F00", "#DB2777", "#7B38ED", "#E35410"],
  // 图表填充带（OKLCH）：现行 fill-0..5 的 L 0.92~0.94 / C 0.02~0.05 取中值
  fillBand: { l: 0.94, c: 0.04 },
  // 代码高亮（现行值原配透传）
  code: {
    keyword: "#2563EB",
    string: "#169A47",
    number: "#DF5010",
    comment: "#8F95A0",
    function: "#7B38ED",
    text: "#2D2D2D",
    label: "#E35410",
    copySuccess: "#179E49",
  },
  scrollbar: {
    track: "transparent",
    thumb: "#C4C4C4",
    thumbHover: "#A8A8A8",
  },
  // 图表中性组（现行 chart-* 中性值透传）
  chartNeutral: {
    edge: "#8F95A0",
    labelBg: "#F8F8F8",
    surface1: "#FFFFFF",
    surface2: "#F8F8F8",
    surface3: "#F0F0F0",
    text: "#2D2D2D",
    textMuted: "#6E6E6E",
  },
  // 图表备用槽 6/7（现行值透传；派生规则留待阶段 2 与高刺激组评估）
  chartSpare: {
    fill6: "#F8EEFF",
    fill7: "#F5F5F5",
    stroke6: "#0C9CB8",
    stroke7: "#6B7280",
    series6: "#0C9CB8",
    series7: "#D92323",
  },
  // 透传组：键为 CSS token 名，值为现行字面量
  passthrough: {
    "status-bar-bg": "rgba(255, 255, 255, 0.60)",
    "reader-bg-elevated": "#F2F2F2",
    "titlebar-gradient":
      "linear-gradient(90deg, transparent 0%, rgba(38, 102, 240, 0.3) 15%, rgba(123, 56, 237, 0.15) 50%, rgba(227, 84, 16, 0.1) 85%, transparent 100%)",
    "obsidian-callout-note": "#448aff",
    "obsidian-callout-abstract": "#00b0ff",
    "obsidian-callout-info": "#00b8d4",
    "obsidian-callout-todo": "#00b8d4",
    "obsidian-callout-tip": "#00bfa5",
    "obsidian-callout-success": "#00c853",
    "obsidian-callout-question": "#64dd17",
    "obsidian-callout-warning": "#ff9100",
    "obsidian-callout-failure": "#ff5252",
    "obsidian-callout-danger": "#ff1744",
    "obsidian-callout-bug": "#f50057",
    "obsidian-callout-example": "#7c4dff",
    "obsidian-callout-quote": "#9e9e9e",
  },
};
