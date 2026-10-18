/**
 * desert-sunset 主题源色表 —— 本文件是 desert-sunset 主题唯一的手写处。
 *
 * 值全部从 src/styles/themes/desert-sunset.css 转录（2026-10-18 阶段 2 迁移）；
 * 画布 / 文字（除 text-heading）/ 滚动条 / 图表中性组原先继承自 theme-dark-base，
 * 转录为显式值使生成物自包含。
 * 主题特色：沙漠日落暖色（沙金 #F2CC8F、珊瑚 #E07A5F、沙漠橙 #FFB347）+ 青色点缀 #4DD0E1。
 * 注意：本主题的 chart-series-0..5 与 chart-stroke-0..5 顺序不同，分别转录。
 *
 * 生成物 src/styles/themes/desert-sunset.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "desert-sunset",
  // 画布阶（原继承 theme-dark-base）
  canvas: {
    reader: "#2E2E38",
    code: "#262630",
    sidebar: "#222230",
    page: "#282830",
    secondary: "#2E2E38",
    tertiary: "#262630",
  },
  ink: {
    heading: "#F0E8E0",
    primary: "#E0E0E0",
    secondary: "#A6A6A6",
    muted: "#808080",
  },
  accent: {
    cyan: "#4DD0E1",
    pink: "#F48FB1",
    purple: "#CE93D8",
    green: "#81C784",
    yellow: "#FFD54F",
    red: "#E57373",
    orange: "#FFB347",
  },
  brand: {
    primary: "#4DD0E1",
    secondary: "#CE93D8",
    logo: "#4DD0E1",
  },
  // 标题色相种子（生成时按画布调校至 ≥4.5:1；h6 现行 3.02:1 属本次迁移要修的项）
  headingHues: ["#F0E8E0", "#FFB347", "#E07A5F", "#F2CC8F", "#81C784", "#787870"],
  // 图表类别色相（= 现行 chart-stroke-0..5）
  chartHues: ["#FFB347", "#E07A5F", "#F2CC8F", "#4DD0E1", "#81C784", "#CE93D8"],
  // 数据序列色（= 现行 chart-series-0..5，与本主题 stroke 序列不同）
  seriesHues: ["#FFB347", "#81C784", "#E07A5F", "#4DD0E1", "#F2CC8F", "#CE93D8"],
  // 图表中性组（原继承 theme-dark-base）
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
    fill6: "#2C3030",
    fill7: "#303030",
    stroke6: "#FFD54F",
    stroke7: "#F48FB1",
    series6: "#FFD54F",
    series7: "#F48FB1",
  },
  // 图表填充带（OKLCH）：按现行 chart-fill-0..5 实测中位校准（L 0.298 / C 0.022）。
  // CSS 内联 oklch 注释为近似值，不作为依据
  fillBand: { l: 0.298, c: 0.022 },
  code: {
    keyword: "#CE93D8",
    string: "#81C784",
    number: "#FFD54F",
    comment: "#808070",
    function: "#FFB347",
    text: "#E0D6C8",
    label: "#FFB347",
    copySuccess: "#81C784",
  },
  // 滚动条（原继承 theme-dark-base）
  scrollbar: {
    track: "transparent",
    thumb: "#585860",
    thumbHover: "#787880",
  },
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #4DD0E1, #CE93D8)",
    "titlebar-gradient": "linear-gradient(90deg, #4DD0E1, #CE93D8, #F48FB1)",
    "obsidian-callout-note": "#d09050",
    "obsidian-callout-abstract": "#c08050",
    "obsidian-callout-info": "#b08060",
    "obsidian-callout-todo": "#b08060",
    "obsidian-callout-tip": "#c09050",
    "obsidian-callout-success": "#a0b060",
    "obsidian-callout-question": "#90b050",
    "obsidian-callout-warning": "#d0a040",
    "obsidian-callout-failure": "#d07050",
    "obsidian-callout-danger": "#d05040",
    "obsidian-callout-bug": "#c06060",
    "obsidian-callout-example": "#a070c0",
    "obsidian-callout-quote": "#a09090",
  },
};
