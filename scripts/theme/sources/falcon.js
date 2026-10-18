/**
 * falcon 主题源色表 —— 本文件是 falcon 主题唯一的手写处。
 *
 * 值全部从 src/styles/themes/falcon.css 转录（2026-10-18 阶段 3 迁移）；
 * 画布 / 文字（除 text-heading）/ 滚动条 / 图表中性组继承自 theme-dark-base，
 * 转录为显式值使生成物自包含。
 * 主题特色：蓝紫调 + 青色点缀（#65BCD9 / #9876AA / #C58564 / #50A14F，类 Dracula/One Dark）。
 * 注意：本主题的 chart-series-0..5 与 chart-stroke-0..5 顺序不同，分别转录。
 *
 * 生成物 src/styles/themes/falcon.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "falcon",
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
    cyan: "#65BCD9",
    pink: "#FF79C6",
    purple: "#9876AA",
    green: "#50A14F",
    yellow: "#DFAE64",
    red: "#FF5555",
    orange: "#C58564",
  },
  brand: {
    primary: "#65BCD9",
    secondary: "#9876AA",
    logo: "#65BCD9",
  },
  // 标题色相种子（生成时按画布调校至 ≥4.5:1；h6 现行不达标，属本次迁移要修的项）
  headingHues: ["#EBEBEB", "#65BCD9", "#9876AA", "#C58564", "#50A14F", "#788795"],
  // 图表类别色相（= 现行 chart-stroke-0..5）
  chartHues: ["#65BCD9", "#9876AA", "#50A14F", "#DFAE64", "#C58564", "#FF79C6"],
  // 数据序列色（= 现行 chart-series-0..5，与本主题 stroke 序列不同）
  seriesHues: ["#65BCD9", "#50A14F", "#C58564", "#9876AA", "#DFAE64", "#FF79C6"],
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
    fill6: "#262838",
    fill7: "#2C2C40",
    stroke6: "#7DCFFF",
    stroke7: "#FF5555",
    series6: "#7DCFFF",
    series7: "#FF5555",
  },
  // 图表填充带（OKLCH）：按现行 chart-fill-0..5 实测中位校准（L 0.308 / C 0.032）。
  // CSS 内联 oklch 注释为近似值，不作为依据
  fillBand: { l: 0.308, c: 0.032 },
  code: {
    keyword: "#9876AA",
    string: "#50A14F",
    number: "#DFAE64",
    comment: "#6B7280",
    function: "#65BCD9",
    text: "#E0E0E0",
    label: "#C58564",
    copySuccess: "#50A14F",
  },
  scrollbar: {
    track: "transparent",
    thumb: "#585860",
    thumbHover: "#787880",
  },
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #65BCD9, #9876AA)",
    "titlebar-gradient": "linear-gradient(90deg, #65BCD9, #9876AA, #FF79C6)",
    "obsidian-callout-note": "#7090c0",
    "obsidian-callout-abstract": "#6090c0",
    "obsidian-callout-info": "#6080c0",
    "obsidian-callout-todo": "#6080c0",
    "obsidian-callout-tip": "#6090a0",
    "obsidian-callout-success": "#60a080",
    "obsidian-callout-question": "#70a060",
    "obsidian-callout-warning": "#c09050",
    "obsidian-callout-failure": "#c06060",
    "obsidian-callout-danger": "#c04040",
    "obsidian-callout-bug": "#b05070",
    "obsidian-callout-example": "#8060b0",
    "obsidian-callout-quote": "#808080",
  },
};
