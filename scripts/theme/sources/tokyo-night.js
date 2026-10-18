/**
 * tokyo-night 主题源色表 —— 本文件是 tokyo-night 主题唯一的手写处。
 *
 * 值全部从 src/styles/themes/tokyo-night.css 转录（2026-10-18 阶段 3 迁移）；
 * 画布 / 文字（除 text-heading）/ 滚动条 / 图表中性组继承自 theme-dark-base。
 * 主题特色：Tokyo Night 蓝紫调（#7AA2F7 / #BB9AF7 / #7DCFFF / #9ECE6A）。
 *
 * 生成物 src/styles/themes/tokyo-night.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "tokyo-night",
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
    cyan: "#7DCFFF",
    pink: "#F7768E",
    purple: "#BB9AF7",
    green: "#9ECE6A",
    yellow: "#E0AF68",
    red: "#F7768E",
    orange: "#FF9E64",
  },
  brand: {
    primary: "#7DCFFF",
    secondary: "#BB9AF7",
    logo: "#7DCFFF",
  },
  // 标题色相种子（生成时按画布调校至 ≥4.5:1；h6 现行不达标，属本次迁移要修的项）
  headingHues: ["#FAFAFA", "#7AA2F7", "#BB9AF7", "#7DCFFF", "#9ECE6A", "#788090"],
  // 图表类别色相（= 现行 chart-stroke-0..5）
  chartHues: ["#7AA2F7", "#BB9AF7", "#7DCFFF", "#9ECE6A", "#E0AF68", "#F7768E"],
  // 数据序列色（= 现行 chart-series-0..5）
  seriesHues: ["#7AA2F7", "#BB9AF7", "#7DCFFF", "#9ECE6A", "#E0AF68", "#F7768E"],
  chartNeutral: {
    edge: "#808080",
    labelBg: "#282830",
    surface1: "#2E2E38",
    surface2: "#282830",
    surface3: "#262630",
    text: "#E0E0E0",
    textMuted: "#A6A6A6",
  },
  chartSpare: {
    fill6: "#262838",
    fill7: "#2A2C40",
    stroke6: "#FF9E64",
    stroke7: "#C586C0",
    series6: "#FF9E64",
    series7: "#C586C0",
  },
  // 图表填充带（OKLCH）：按现行 chart-fill-0..5 实测中位校准（L 0.302 / C 0.033）。
  // CSS 内联 oklch 注释为近似值，不作为依据
  fillBand: { l: 0.302, c: 0.033 },
  code: {
    keyword: "#BB9AF7",
    string: "#9ECE6A",
    number: "#FF9E64",
    comment: "#909096",
    function: "#7DCFFF",
    text: "#E0E0E0",
    label: "#FF9E64",
    copySuccess: "#9ECE6A",
  },
  scrollbar: {
    track: "transparent",
    thumb: "#585860",
    thumbHover: "#787880",
  },
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #7DCFFF, #BB9AF7)",
    "titlebar-gradient": "linear-gradient(90deg, #7DCFFF, #BB9AF7, #F7768E)",
    "obsidian-callout-note": "#7070d0",
    "obsidian-callout-abstract": "#6060d0",
    "obsidian-callout-info": "#6070c0",
    "obsidian-callout-todo": "#6070c0",
    "obsidian-callout-tip": "#6080b0",
    "obsidian-callout-success": "#60a090",
    "obsidian-callout-question": "#70a070",
    "obsidian-callout-warning": "#d09050",
    "obsidian-callout-failure": "#d06060",
    "obsidian-callout-danger": "#d04050",
    "obsidian-callout-bug": "#c05070",
    "obsidian-callout-example": "#9060c0",
    "obsidian-callout-quote": "#808080",
  },
};
