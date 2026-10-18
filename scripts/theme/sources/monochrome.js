/**
 * monochrome 主题源色表 —— 本文件是 monochrome 主题唯一的手写处。
 *
 * 值全部从 src/styles/themes/monochrome.css 转录（2026-10-18 阶段 3 迁移）；
 * 画布 / 文字（除 text-heading）/ 滚动条 / 图表中性组继承自 theme-dark-base。
 *
 * 重要约束：本主题必须保持**纯灰度**，所有颜色 C（彩度）= 0。
 * 因此 fillBand.c 固定为 0，且不引入任何彩色色相——生成器的 fill 派生会沿用
 * 该彩度（色相在本主题下无意义），从而守住灰度层次对比这一主题存在的理由。
 *
 * 生成物 src/styles/themes/monochrome.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "monochrome",
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
  // 纯灰度强调色（C=0）
  accent: {
    cyan: "#B0B0B0",
    pink: "#C0C0C0",
    purple: "#A0A0A0",
    green: "#909090",
    yellow: "#D0D0D0",
    red: "#A8A8A8",
    orange: "#B8B8B8",
  },
  brand: {
    primary: "#B0B0B0",
    secondary: "#8A8A8A",
    logo: "#B0B0B0",
  },
  // 标题灰度层次种子（生成时按画布调校至 ≥4.5:1；h6 现行不达标，属本次迁移要修的项）
  headingHues: ["#FAFAFA", "#D0D0D0", "#B0B0B0", "#909090", "#808080", "#707070"],
  // 图表类别灰度（= 现行 chart-stroke-0..5）
  chartHues: ["#B0B0B0", "#A0A0A0", "#909090", "#C0C0C0", "#808080", "#D0D0D0"],
  // 数据序列灰度（= 现行 chart-series-0..5，与本主题 stroke 序列不同）
  seriesHues: ["#B0B0B0", "#909090", "#C0C0C0", "#808080", "#A0A0A0", "#D0D0D0"],
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
    fill6: "#262626",
    fill7: "#2E2E2E",
    stroke6: "#707070",
    stroke7: "#B8B8B8",
    series6: "#707070",
    series7: "#E0E0E0",
  },
  // 图表填充带（OKLCH）：按现行 chart-fill-0..5 实测中位校准（L 0.301 / C 0.000）。
  // C 必须为 0——本主题的存在理由就是纯灰度层次，派生不得引入任何彩度
  fillBand: { l: 0.301, c: 0 },
  code: {
    keyword: "#A0A0A0",
    string: "#C8C8C8",
    number: "#D8D8D8",
    comment: "#6B7280",
    function: "#B0B0B0",
    text: "#E0E0E0",
    label: "#B8B8B8",
    copySuccess: "#909090",
  },
  scrollbar: {
    track: "transparent",
    thumb: "#585860",
    thumbHover: "#787880",
  },
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #B0B0B0, #8A8A8A)",
    "titlebar-gradient": "linear-gradient(90deg, #B0B0B0, #8A8A8A, #A0A0A0)",
    "obsidian-callout-note": "#8888aa",
    "obsidian-callout-abstract": "#7777aa",
    "obsidian-callout-info": "#7777aa",
    "obsidian-callout-todo": "#7777aa",
    "obsidian-callout-tip": "#8888aa",
    "obsidian-callout-success": "#8888aa",
    "obsidian-callout-question": "#8888aa",
    "obsidian-callout-warning": "#aa8877",
    "obsidian-callout-failure": "#aa7777",
    "obsidian-callout-danger": "#aa6666",
    "obsidian-callout-bug": "#aa6688",
    "obsidian-callout-example": "#8877aa",
    "obsidian-callout-quote": "#777777",
  },
};
