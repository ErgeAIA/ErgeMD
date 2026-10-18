/**
 * aurora 主题源色表 —— 本文件是 aurora 主题唯一的手写处。
 *
 * 值全部从 src/styles/themes/aurora.css 转录（2026-10-18 阶段 3 迁移）；
 * 画布 / 滚动条中未定义而继承自 theme-dark-base 的部分转录为显式值使生成物自包含。
 * 主题特色：青蓝色调（类似 One Dark：#4FC3F7 / #569CD6 / #DCDCAA / #CE9178 / #6A9955）。
 * 注意：本主题的 chart-series-0..5 与 chart-stroke-0..5 顺序不同，分别转录。
 *
 * 生成物 src/styles/themes/aurora.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "aurora",
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
    heading: "#EBEBEB",
    primary: "#E0E0E0",
    secondary: "#A6A6A6",
    muted: "#808080",
  },
  accent: {
    cyan: "#4FC3F7",
    pink: "#F48FB1",
    purple: "#C586C0",
    green: "#6A9955",
    yellow: "#DCDCAA",
    red: "#F44747",
    orange: "#CE9178",
    blue: "#569CD6",
  },
  brand: {
    primary: "#4FC3F7",
    secondary: "#C586C0",
    logo: "#4FC3F7",
  },
  // 标题色相种子（生成时按画布调校至 ≥4.5:1；h6 现行不达标，属本次迁移要修的项）
  headingHues: ["#4FC3F7", "#569CD6", "#DCDCAA", "#CE9178", "#6A9955", "#6B7280"],
  // 图表类别色相（= 现行 chart-stroke-0..5）
  chartHues: ["#4FC3F7", "#569CD6", "#6A9955", "#DCDCAA", "#CE9178", "#C586C0"],
  // 数据序列色（= 现行 chart-series-0..5，与本主题 stroke 序列不同）
  seriesHues: ["#4FC3F7", "#6A9955", "#DCDCAA", "#F48FB1", "#569CD6", "#CE9178"],
  chartNeutral: {
    edge: "#6B7280",
    labelBg: "#282830",
    surface1: "#2E2E38",
    surface2: "#282830",
    surface3: "#262630",
    text: "#E0E0E0",
    textMuted: "#A6A6A6",
  },
  chartSpare: {
    fill6: "#252838",
    fill7: "#303038",
    stroke6: "#F48FB1",
    stroke7: "#F44747",
    series6: "#C586C0",
    series7: "#F44747",
  },
  // 图表填充带（OKLCH）：按现行 chart-fill-0..5 实测中位校准（L 0.328 / C 0.032）。
  // CSS 内联 oklch 注释为近似值，不作为依据
  fillBand: { l: 0.328, c: 0.032 },
  code: {
    keyword: "#569CD6",
    string: "#6A9955",
    number: "#CE9178",
    comment: "#6B7280",
    function: "#4FC3F7",
    text: "#E0E0E0",
    label: "#CE9178",
    copySuccess: "#6A9955",
  },
  scrollbar: {
    track: "transparent",
    thumb: "#586575",
    thumbHover: "#768696",
  },
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #4FC3F7, #C586C0)",
    "titlebar-gradient": "linear-gradient(90deg, #4FC3F7, #C586C0, #F48FB1)",
    "logo-bg":
      "linear-gradient(135deg, rgba(79, 195, 247, 0.15), rgba(197, 133, 192, 0.10))",
    "logo-border": "rgba(79, 195, 247, 0.15)",
    "reader-bg-elevated": "#262630",
    "status-bar-bg": "rgba(40, 40, 48, 0.80)",
    "obsidian-callout-note": "#5ec4c4",
    "obsidian-callout-abstract": "#4dd8c0",
    "obsidian-callout-info": "#4dd8b8",
    "obsidian-callout-todo": "#4dd8b8",
    "obsidian-callout-tip": "#50d8a0",
    "obsidian-callout-success": "#50d890",
    "obsidian-callout-question": "#80d850",
    "obsidian-callout-warning": "#d8a050",
    "obsidian-callout-failure": "#d86060",
    "obsidian-callout-danger": "#d84040",
    "obsidian-callout-bug": "#d85080",
    "obsidian-callout-example": "#9070d8",
    "obsidian-callout-quote": "#909090",
  },
};
