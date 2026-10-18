/**
 * ocean 主题源色表 —— 本文件是 ocean 主题唯一的手写处。
 *
 * 值全部从 src/styles/themes/ocean.css 转录（2026-10-18 阶段 3 迁移）；
 * 画布 / 文字（除 text-heading）/ 滚动条 / 图表中性组继承自 theme-dark-base。
 * 主题特色：海洋蓝色调（#42A5F5 / #26C6DA / #80DEEA）+ 青色点缀。
 *
 * 生成物 src/styles/themes/ocean.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "ocean",
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
    cyan: "#26C6DA",
    pink: "#F48FB1",
    purple: "#7E57C2",
    green: "#66BB6A",
    yellow: "#FFEE58",
    red: "#EF5350",
    orange: "#FFA726",
  },
  brand: {
    primary: "#26C6DA",
    secondary: "#7E57C2",
    logo: "#26C6DA",
  },
  // 标题色相种子（生成时按画布调校至 ≥4.5:1；h6 现行不达标，属本次迁移要修的项）
  headingHues: ["#FAFAFA", "#42A5F5", "#26C6DA", "#80DEEA", "#66BB6A", "#788090"],
  // 图表类别色相（= 现行 chart-stroke-0..5）
  chartHues: ["#42A5F5", "#26C6DA", "#80DEEA", "#66BB6A", "#7E57C2", "#FFA726"],
  // 数据序列色（= 现行 chart-series-0..5）
  seriesHues: ["#42A5F5", "#26C6DA", "#80DEEA", "#66BB6A", "#7E57C2", "#FFA726"],
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
    fill6: "#263038",
    fill7: "#283040",
    stroke6: "#F48FB1",
    stroke7: "#EF5350",
    series6: "#F48FB1",
    series7: "#FFEE58",
  },
  // 图表填充带（OKLCH）：按现行 chart-fill-0..5 实测中位校准（L 0.311 / C 0.030）。
  // CSS 内联 oklch 注释为近似值，不作为依据
  fillBand: { l: 0.311, c: 0.03 },
  code: {
    keyword: "#7E57C2",
    string: "#66BB6A",
    number: "#FFEE58",
    comment: "#808096",
    function: "#42A5F5",
    text: "#E0E0E0",
    label: "#FFA726",
    copySuccess: "#66BB6A",
  },
  scrollbar: {
    track: "transparent",
    thumb: "#585860",
    thumbHover: "#787880",
  },
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #26C6DA, #7E57C2)",
    "titlebar-gradient": "linear-gradient(90deg, #26C6DA, #7E57C2, #F48FB1)",
    "obsidian-callout-note": "#4090d0",
    "obsidian-callout-abstract": "#3080d0",
    "obsidian-callout-info": "#3080c0",
    "obsidian-callout-todo": "#3080c0",
    "obsidian-callout-tip": "#3090b0",
    "obsidian-callout-success": "#30a090",
    "obsidian-callout-question": "#50a070",
    "obsidian-callout-warning": "#d09040",
    "obsidian-callout-failure": "#d06060",
    "obsidian-callout-danger": "#d04040",
    "obsidian-callout-bug": "#c05070",
    "obsidian-callout-example": "#7060c0",
    "obsidian-callout-quote": "#708080",
  },
};
