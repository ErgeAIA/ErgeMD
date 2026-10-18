/**
 * cyberpunk 主题源色表 —— 本文件是 cyberpunk 主题唯一的手写处。
 *
 * 值全部从 src/styles/themes/cyberpunk.css 转录（2026-10-18 阶段 2 迁移）；
 * 画布 / 墨色 / 滚动条三项原先继承自 theme-dark-base，转录为显式值使生成物自包含。
 * 主题特色赛博朋克霓虹（青 #00FFFF、品红 #FF00FF、橙 #FF8000、绿 #00FF00）保留在
 * 标题色相、accent、代码语义色与图表描边序列上。
 *
 * 生成物 src/styles/themes/cyberpunk.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "cyberpunk",
  // 画布阶（原继承 theme-dark-base）
  canvas: {
    reader: "#2E2E38",
    code: "#262630",
    sidebar: "#222230",
    page: "#282830",
    secondary: "#2E2E38",
    tertiary: "#262630",
  },
  // 墨色阶（原继承 theme-dark-base）
  ink: {
    heading: "#FAFAFA",
    primary: "#E0E0E0",
    secondary: "#A6A6A6",
    muted: "#808080",
  },
  // 赛博朋克霓虹强调色相（7 色，rgb 三元组由生成器机械转换）
  accent: {
    cyan: "#00FFFF",
    pink: "#FF6496",
    purple: "#FF00FF",
    green: "#00FF00",
    yellow: "#FFFF00",
    orange: "#FF8000",
    red: "#FF0040",
  },
  brand: {
    primary: "#00FFFF",
    secondary: "#FF00FF",
    logo: "#00FFFF",
  },
  // 标题色相种子（生成时按画布调校至 ≥4.5:1；h6 现行 2.78:1 属本次迁移要修的项）
  headingHues: ["#EBEBEB", "#00FFFF", "#FF00FF", "#FF8000", "#00FF00", "#6B7280"],
  // 图表类别色相（= 现行 chart-stroke-0..5；cyberpunk 的鲜明特色保留在描边/分支线上）
  chartHues: ["#00FFFF", "#FF00FF", "#00FF00", "#FF8000", "#FFFF00", "#FF6496"],
  // 数据序列色（= 现行 chart-series-0..5）
  seriesHues: ["#00FFFF", "#FF00FF", "#00FF00", "#FF8000", "#FFFF00", "#FF6496"],
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
  // 图表备用槽 6/7 透传现行值
  chartSpare: {
    fill6: "#262838",
    fill7: "#2A2A40",
    stroke6: "#7DCFFF",
    stroke7: "#F7768E",
    series6: "#FF0040",
    series7: "#BB9AF7",
  },
  // 图表填充带（OKLCH）：按现行 chart-fill-0..5 实测中位校准（L 0.298 / C 0.048）。
  // CSS 内联 oklch 注释为近似值，不作为依据——同 light/dark 的处理口径
  fillBand: { l: 0.298, c: 0.048 },
  // 代码高亮（赛博朋克霓虹原配，原样保留）
  code: {
    keyword: "#FF00FF",
    string: "#00FF00",
    number: "#FF8000",
    comment: "#6B7280",
    function: "#00FFFF",
    text: "#E0E0E0",
    label: "#FF8000",
    copySuccess: "#00FF00",
  },
  // 滚动条（原继承 theme-dark-base）
  scrollbar: {
    track: "transparent",
    thumb: "#585860",
    thumbHover: "#787880",
  },
  // 透传：现行字面量（渐变与语义状态族）
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #00FFFF, #FF00FF)",
    "titlebar-gradient":
      "linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.5) 15%, rgba(255, 0, 255, 0.3) 50%, rgba(255, 100, 150, 0.2) 85%, transparent 100%)",
    "obsidian-callout-note": "#00d4ff",
    "obsidian-callout-abstract": "#00e5ff",
    "obsidian-callout-info": "#00e5d0",
    "obsidian-callout-todo": "#00e5d0",
    "obsidian-callout-tip": "#00ffb3",
    "obsidian-callout-success": "#00ff88",
    "obsidian-callout-question": "#88ff00",
    "obsidian-callout-warning": "#ffaa00",
    "obsidian-callout-failure": "#ff4466",
    "obsidian-callout-danger": "#ff0044",
    "obsidian-callout-bug": "#ff0080",
    "obsidian-callout-example": "#aa66ff",
    "obsidian-callout-quote": "#aaaaaa",
  },
};
