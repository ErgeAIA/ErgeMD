/**
 * solarized-light 主题源色表 —— 本文件是 solarized-light 主题唯一的手写处。
 *
 * 值全部从 src/styles/themes/solarized-light.css 转录（2026-10-18 阶段 3 迁移）。
 * 本主题属**亮色族**（暖黄底 #fdf6e3 / #fefcf5），填充带为高亮度低彩度（L 0.957 / C 0.019），
 * 与 dark 族的低亮度带相反——这正是同一套派生公式在两种模式下各自成立的地方。
 * 主题特色：Solarized 标准色（蓝 #268bd2、青 #2aa198、绿 #859900、黄 #b58900、橙 #cb4b16）。
 *
 * 生成物 src/styles/themes/solarized-light.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "solarized-light",
  canvas: {
    reader: "#fefcf5",
    code: "#f5efdc",
    sidebar: "#eee8d5",
    page: "#fdf6e3",
    secondary: "#fdf6e3",
    tertiary: "#f5efdc",
  },
  ink: {
    heading: "#073642",
    primary: "#263640",
    secondary: "#586e75",
    muted: "#839496",
  },
  accent: {
    cyan: "#2aa198",
    pink: "#d33682",
    purple: "#6c71c4",
    green: "#859900",
    yellow: "#b58900",
    red: "#dc322f",
    orange: "#cb4b16",
    blue: "#268bd2",
  },
  brand: {
    primary: "#268bd2",
    secondary: "#6c71c4",
    logo: "#268bd2",
  },
  // 标题色相种子（生成时按画布调校至 ≥4.5:1；h6 现行不达标，属本次迁移要修的项）
  headingHues: ["#073642", "#268bd2", "#2aa198", "#b58900", "#2aa198", "#6B7280"],
  // 图表类别色相（= 现行 chart-stroke-0..5）
  chartHues: ["#268bd2", "#2aa198", "#859900", "#b58900", "#cb4b16", "#d33682"],
  // 数据序列色（= 现行 chart-series-0..5）
  seriesHues: ["#268bd2", "#2aa198", "#859900", "#b58900", "#cb4b16", "#d33682"],
  chartNeutral: {
    edge: "#93a1a1",
    labelBg: "#f5efdc",
    surface1: "#fefcf5",
    surface2: "#f5efdc",
    surface3: "#eee8d5",
    text: "#263640",
    textMuted: "#586e75",
  },
  chartSpare: {
    fill6: "#e8eef5",
    fill7: "#f0f0e8",
    stroke6: "#6c71c4",
    stroke7: "#dc322f",
    series6: "#6c71c4",
    series7: "#dc322f",
  },
  // 图表填充带（OKLCH）：按现行 chart-fill-0..5 实测中位校准（L 0.957 / C 0.019）。
  // 亮色族：高亮度低彩度，与 dark 族方向相反，同一公式两模式各自成立
  fillBand: { l: 0.957, c: 0.019 },
  code: {
    keyword: "#859900",
    string: "#2aa198",
    number: "#d33682",
    comment: "#93a1a1",
    function: "#268bd2",
    text: "#263640",
    label: "#cb4b16",
    copySuccess: "#859900",
  },
  scrollbar: {
    track: "transparent",
    thumb: "rgba(147, 161, 161, 0.40)",
    thumbHover: "rgba(147, 161, 161, 0.60)",
  },
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #268bd2, #6c71c4)",
    "titlebar-gradient":
      "linear-gradient(90deg, transparent 0%, rgba(38, 139, 210, 0.25) 15%, rgba(42, 161, 152, 0.15) 50%, rgba(181, 137, 0, 0.1) 85%, transparent 100%)",
    "reader-bg-elevated": "#f5efdc",
    "status-bar-bg": "rgba(253, 246, 227, 0.60)",
    "obsidian-callout-note": "#448aff",
    "obsidian-callout-abstract": "#00b0ff",
    "obsidian-callout-info": "#00b8d4",
    "obsidian-callout-todo": "#00b8d4",
    "obsidian-callout-tip": "#00bfa5",
    "obsidian-callout-success": "#00c853",
    "obsidian-callout-question": "#64dd17",
    "obsidian-callout-warning": "#ff9100",
    "obsidian-callout-failure": "#ff5252",
    "obsidian-callout-danger": "#ff1744",
    "obsidian-callout-bug": "#f50057",
    "obsidian-callout-example": "#7c4dff",
    "obsidian-callout-quote": "#9e9e9e",
  },
};
