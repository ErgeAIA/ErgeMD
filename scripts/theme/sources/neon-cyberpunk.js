/**
 * neon-cyberpunk 主题源色表 —— 本文件是 neon-cyberpunk 主题唯一的手写处。
 *
 * 值全部从 src/styles/themes/neon-cyberpunk.css 转录（2026-10-18 阶段 2 迁移）。
 * 主题特色：高饱和霓虹（青 #00FFFF、品红 #FF00FF、纯黄 #FFFF00、青绿 #00FF64）
 * 保留在标题色相、accent、代码语义色与图表描边/序列上。
 *
 * 生成物 src/styles/themes/neon-cyberpunk.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "neon-cyberpunk",
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
  // 高饱和霓虹强调色相（8 色，含 blue；rgb 三元组由生成器机械转换）
  accent: {
    cyan: "#00FFFF",
    pink: "#FF00FF",
    purple: "#BF00FF",
    green: "#00FF64",
    yellow: "#FFFF00",
    red: "#FF0040",
    orange: "#FF8000",
    blue: "#00AAFF",
  },
  brand: {
    primary: "#00FFFF",
    secondary: "#FF00FF",
    logo: "#00FFFF",
  },
  // 标题色相种子（生成时按画布调校至 ≥4.5:1；h6 现行 3.09:1 属本次迁移要修的项）
  headingHues: ["#FAFAFA", "#00FFFF", "#FF00FF", "#FFFF00", "#00FF64", "#787888"],
  // 图表类别色相（= 现行 chart-stroke-0..5）
  chartHues: ["#00FFFF", "#FF00FF", "#FFFF00", "#00FF64", "#FF8000", "#BF00FF"],
  // 数据序列色（= 现行 chart-series-0..5）
  seriesHues: ["#00FFFF", "#FF00FF", "#FFFF00", "#00FF64", "#FF8000", "#BF00FF"],
  chartNeutral: {
    edge: "#808090",
    labelBg: "#2E2E38",
    surface1: "#2E2E38",
    surface2: "#282830",
    surface3: "#262630",
    text: "#E0E0E0",
    textMuted: "#A6A6A6",
  },
  chartSpare: {
    fill6: "#284850",
    fill7: "#383850",
    stroke6: "#00AAFF",
    stroke7: "#FF0040",
    series6: "#00AAFF",
    series7: "#FF0040",
  },
  // 图表填充带（OKLCH）：按现行 chart-fill-0..5 实测中位校准（L 0.390 / C 0.058）。
  // CSS 内联 oklch 注释为近似值，不作为依据
  fillBand: { l: 0.39, c: 0.058 },
  code: {
    keyword: "#FF00FF",
    string: "#00FF64",
    number: "#FFFF00",
    comment: "#808096",
    function: "#00FFFF",
    text: "#E0E0E0",
    label: "#FF8000",
    copySuccess: "#00FF64",
  },
  scrollbar: {
    track: "transparent",
    thumb: "#585860",
    thumbHover: "#787880",
  },
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #00FFFF, #FF00FF)",
    "titlebar-gradient":
      "linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.6) 15%, rgba(255, 0, 255, 0.4) 50%, rgba(255, 0, 64, 0.3) 85%, transparent 100%)",
    "reader-bg-elevated": "#262630",
    "status-bar-bg": "rgba(40, 40, 48, 0.85)",
    "obsidian-callout-note": "#00ccff",
    "obsidian-callout-abstract": "#00ddff",
    "obsidian-callout-info": "#00ddcc",
    "obsidian-callout-todo": "#00ddcc",
    "obsidian-callout-tip": "#00ffaa",
    "obsidian-callout-success": "#00ff77",
    "obsidian-callout-question": "#77ff00",
    "obsidian-callout-warning": "#ff9900",
    "obsidian-callout-failure": "#ff3355",
    "obsidian-callout-danger": "#ff0033",
    "obsidian-callout-bug": "#ff0070",
    "obsidian-callout-example": "#9955ff",
    "obsidian-callout-quote": "#999999",
  },
};
