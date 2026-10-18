/**
 * cherry-blossom 主题源色表 —— 本文件是 cherry-blossom 主题唯一的手写处。
 *
 * 值全部从 src/styles/themes/cherry-blossom.css 转录（2026-10-18 阶段 3 迁移）；
 * 画布 / 滚动条中未定义而继承自 theme-dark-base 的部分转录为显式值使生成物自包含。
 * 主题特色：樱花粉 / 柔和紫（#F8BBD9 / #CE93D8 / #F48FB1 / #B39DDB）。
 *
 * 生成物 src/styles/themes/cherry-blossom.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "cherry-blossom",
  canvas: {
    reader: "#2E2E38",
    code: "#262630",
    sidebar: "#222230",
    page: "#282830",
    secondary: "#2E2E38",
    tertiary: "#262630",
  },
  ink: {
    heading: "#EBEBEB",
    primary: "#E0E0E0",
    secondary: "#A6A6A6",
    muted: "#808080",
  },
  accent: {
    cyan: "#B39DDB",
    pink: "#F48FB1",
    purple: "#CE93D8",
    green: "#81C784",
    yellow: "#FFF59D",
    red: "#EF9A9A",
    orange: "#FFAB91",
    blue: "#9FA8DA",
  },
  brand: {
    primary: "#F8BBD9",
    secondary: "#CE93D8",
    logo: "#F8BBD9",
  },
  // 标题色相种子（生成时按画布调校至 ≥4.5:1；h6 现行不达标，属本次迁移要修的项）
  headingHues: ["#EBEBEB", "#F8BBD9", "#CE93D8", "#F48FB1", "#F06292", "#6B7280"],
  // 图表类别色相（= 现行 chart-stroke-0..5）
  chartHues: ["#F8BBD9", "#CE93D8", "#F48FB1", "#B39DDB", "#F06292", "#FFAB91"],
  // 数据序列色（= 现行 chart-series-0..5）
  seriesHues: ["#F8BBD9", "#CE93D8", "#F48FB1", "#B39DDB", "#F06292", "#FFAB91"],
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
    fill6: "#302840",
    fill7: "#383040",
    stroke6: "#81C784",
    stroke7: "#EF9A9A",
    series6: "#81C784",
    series7: "#FFF59D",
  },
  // 图表填充带（OKLCH）：按现行 chart-fill-0..5 实测中位校准（L 0.302 / C 0.035）。
  // CSS 内联 oklch 注释为近似值，不作为依据
  fillBand: { l: 0.302, c: 0.035 },
  code: {
    keyword: "#CE93D8",
    string: "#81C784",
    number: "#FFF59D",
    comment: "#6B7280",
    function: "#F8BBD9",
    text: "#E0E0E0",
    label: "#FFAB91",
    copySuccess: "#81C784",
  },
  scrollbar: {
    track: "transparent",
    thumb: "#586575",
    thumbHover: "#768696",
  },
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #F8BBD9, #CE93D8)",
    "titlebar-gradient": "linear-gradient(90deg, #F8BBD9, #CE93D8, #F48FB1)",
    "logo-bg":
      "linear-gradient(135deg, rgba(248, 187, 217, 0.15), rgba(206, 147, 216, 0.10))",
    "logo-border": "rgba(248, 187, 217, 0.15)",
    "reader-bg-elevated": "#262630",
    "status-bar-bg": "rgba(40, 40, 48, 0.80)",
    "obsidian-callout-note": "#d070a0",
    "obsidian-callout-abstract": "#c070b0",
    "obsidian-callout-info": "#b070c0",
    "obsidian-callout-todo": "#b070c0",
    "obsidian-callout-tip": "#c080a0",
    "obsidian-callout-success": "#a0c080",
    "obsidian-callout-question": "#90c070",
    "obsidian-callout-warning": "#d0a060",
    "obsidian-callout-failure": "#d07070",
    "obsidian-callout-danger": "#d05050",
    "obsidian-callout-bug": "#c06080",
    "obsidian-callout-example": "#a070d0",
    "obsidian-callout-quote": "#a0a0a0",
  },
};
