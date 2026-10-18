/**
 * solar-flare 主题源色表 —— 本文件是 solar-flare 主题唯一的手写处。
 *
 * 值全部从 src/styles/themes/solar-flare.css 转录（2026-10-18 阶段 2 迁移）。
 * 主题特色：太阳耀斑暖色调（金 #FFD740、橙 #FF9100、珊瑚 #FF7040、暖绿 #69F0AE）。
 * 注意：本主题的 chart-series-0..5 与 chart-stroke-0..5 顺序不同，分别转录。
 *
 * 生成物 src/styles/themes/solar-flare.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "solar-flare",
  canvas: {
    reader: "#2E2E38",
    code: "#262630",
    sidebar: "#222230",
    page: "#282830",
    secondary: "#2E2E38",
    tertiary: "#262630",
  },
  ink: {
    heading: "#FAFAFA",
    primary: "#E0E0E0",
    secondary: "#A6A6A6",
    muted: "#808080",
  },
  accent: {
    cyan: "#4DD0E1",
    pink: "#FF80AB",
    purple: "#B388FF",
    green: "#69F0AE",
    yellow: "#FFD740",
    red: "#FF5252",
    orange: "#FF9100",
    blue: "#4DD0E1",
  },
  brand: {
    primary: "#4DD0E1",
    secondary: "#B388FF",
    logo: "#4DD0E1",
  },
  // 标题色相种子（生成时按画布调校至 ≥4.5:1；h6 现行 3.09:1 属本次迁移要修的项）
  headingHues: ["#FAFAFA", "#FFD740", "#FFAB40", "#FF9100", "#69F0AE", "#787888"],
  // 图表类别色相（= 现行 chart-stroke-0..5）
  chartHues: ["#FFD740", "#FFAB40", "#FF9100", "#FF7040", "#FF5252", "#FF80AB"],
  // 数据序列色（= 现行 chart-series-0..5，与本主题 stroke 序列不同）
  seriesHues: ["#FFD740", "#FF9100", "#FF5252", "#69F0AE", "#FF80AB", "#B388FF"],
  chartNeutral: {
    edge: "#9090A0",
    labelBg: "#2E2E38",
    surface1: "#2E2E38",
    surface2: "#282830",
    surface3: "#262630",
    text: "#E0E0E0",
    textMuted: "#A6A6A6",
  },
  chartSpare: {
    fill6: "#6A4838",
    fill7: "#5A4040",
    stroke6: "#69F0AE",
    stroke7: "#B388FF",
    series6: "#4DD0E1",
    series7: "#FFAB40",
  },
  // 图表填充带（OKLCH）：按现行 chart-fill-0..5 实测中位校准（L 0.434 / C 0.043）。
  // 现行 fill 明度跨度较大（0.33–0.52），统一入带后各槽明度趋于一致——这正是
  // text-on-fill 可预测的前提。CSS 内联 oklch 注释为近似值，不作为依据
  fillBand: { l: 0.434, c: 0.043 },
  code: {
    keyword: "#B388FF",
    string: "#69F0AE",
    number: "#FFAB40",
    comment: "#909096",
    function: "#4DD0E1",
    text: "#E0E0E0",
    label: "#FF9100",
    copySuccess: "#69F0AE",
  },
  scrollbar: {
    track: "transparent",
    thumb: "#585860",
    thumbHover: "#787880",
  },
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #4DD0E1, #B388FF)",
    "titlebar-gradient": "linear-gradient(90deg, #4DD0E1, #B388FF, #FF80AB)",
    "reader-bg-elevated": "#262630",
    "status-bar-bg": "rgba(40, 40, 48, 0.80)",
    "obsidian-callout-note": "#d07050",
    "obsidian-callout-abstract": "#c06050",
    "obsidian-callout-info": "#b06060",
    "obsidian-callout-todo": "#b06060",
    "obsidian-callout-tip": "#c07050",
    "obsidian-callout-success": "#a0b050",
    "obsidian-callout-question": "#90b040",
    "obsidian-callout-warning": "#d0a030",
    "obsidian-callout-failure": "#d06050",
    "obsidian-callout-danger": "#d03030",
    "obsidian-callout-bug": "#c05060",
    "obsidian-callout-example": "#9060c0",
    "obsidian-callout-quote": "#908080",
  },
};
