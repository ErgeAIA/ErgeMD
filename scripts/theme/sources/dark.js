/**
 * dark 主题源色表 —— dark 主题唯一的手写处。
 * 生成物 src/styles/themes/dark.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 * 值源：现行 src/styles/themes/dark.css 全量转录；图表色板取 theme-dark-base.css
 * （dark.css 自身不定义 chart-*，生成物将补齐并按契约派生）。
 * 注意：dark.css 中的 --accent-cyan-dim/--accent-cyan-glow 为派生层
 * （theme-derived.css:121-122）的重复定义，此处不收录，由派生层继续提供。
 */
export default {
  name: "dark",
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
    cyan: "#569CD6",
    pink: "#C586C0",
    purple: "#C586C0",
    green: "#6A9955",
    yellow: "#DCDCAA",
    orange: "#CE9178",
    red: "#F44747",
  },
  brand: {
    primary: "#569CD6",
    secondary: "#C586C0",
    logo: "#569CD6",
  },
  // 六级标题色相种子（现行 h1..h6；生成时按画布调校至 ≥4.5:1，色相不变）
  headingHues: ["#EBEBEB", "#569CD6", "#DCDCAA", "#CE9178", "#6A9955", "#6B7280"],
  // 图表类别色相种子（= theme-dark-base 现行 chart-stroke-0..5）
  chartHues: ["#7AA2F7", "#BB9AF7", "#9ECE6A", "#E0AF68", "#F7768E", "#FF9E64"],
  // 数据序列种子（= theme-dark-base 现行 chart-series-0..5）
  seriesHues: ["#7DCFFF", "#9ECE6A", "#E0AF68", "#F7768E", "#BB9AF7", "#FF9E64"],
  // 图表填充带（OKLCH）：按 theme-dark-base 现行 fill-0..5 的内联 oklch 区间
  // （L 0.22~0.24 / C 0.06~0.08）取中位值；派生值与现行值允许有契约预期内的微小差异
  fillBand: { l: 0.23, c: 0.07 },
  // 代码高亮（VSCode Dark+ 原配透传）
  code: {
    keyword: "#569CD6",
    string: "#CE9178",
    number: "#DCDCAA",
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
  // 图表中性组（theme-dark-base 现行 chart-* 中性值透传）
  chartNeutral: {
    edge: "#808080",
    labelBg: "#282830",
    surface1: "#2E2E38",
    surface2: "#282830",
    surface3: "#262630",
    text: "#E0E0E0",
    textMuted: "#A6A6A6",
  },
  // 图表备用槽 6/7（theme-dark-base 现行值透传；派生规则留待阶段 2 评估）
  chartSpare: {
    fill6: "#423A48",
    fill7: "#484848",
    stroke6: "#7DCFFF",
    stroke7: "#C586C0",
    series6: "#7AA2F7",
    series7: "#C586C0",
  },
  // 透传组：键为 CSS token 名，值为现行字面量（dark.css 全量，accent-*-dim/glow 除外；
  // divider/table-border/border-subtle 按 R12 统一走 mixWith 派生，不在此透传）
  passthrough: {
    "brand-gradient": "linear-gradient(135deg, #569CD6, #C586C0)",
    "toc-hover-bg": "rgba(46, 46, 56, 0.92)",
    "toc-hover-shadow": "0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06)",
    "toc-text-active": "rgba(86, 156, 214, 1)",
    "toc-text-inactive": "rgba(166, 166, 166, 0.65)",
    "hover-bg": "rgba(255, 255, 255, 0.06)",
    "selected-bg": "rgba(86, 156, 214, 0.18)",
    "active-border": "rgba(86, 156, 214, 0.40)",
    "selection-bg": "rgba(86, 156, 214, 0.25)",
    "selection-text": "#EBEBEB",
    "search-highlight": "rgba(220, 220, 170, 0.25)",
    "search-highlight-active": "rgba(220, 220, 170, 0.50)",
    "reader-bg-elevated": "#262630",
    "status-bar-bg": "rgba(40, 40, 48, 0.80)",
    "blockquote-bg": "rgba(197, 133, 192, 0.10)",
    "blockquote-text": "#A6A6A6",
    "inline-code-bg": "rgba(197, 133, 192, 0.15)",
    "inline-code-text": "#C586C0",
    "table-header-bg": "rgba(86, 156, 214, 0.08)",
    "table-header-text": "#569CD6",
    "table-hover-bg": "rgba(255, 255, 255, 0.03)",
    "hover-bg-subtle": "rgba(86, 156, 214, 0.03)",
    "hover-bg-light": "rgba(255, 255, 255, 0.05)",
    "hover-bg-medium": "rgba(255, 255, 255, 0.10)",
    "hover-close-bg": "rgba(244, 71, 71, 0.6)",
    "shadow-popup": "0 4px 24px rgba(0, 0, 0, 0.5)",
    "shadow-menu": "0 4px 16px rgba(0, 0, 0, 0.4)",
    "overlay-bg": "rgba(0, 0, 0, 0.85)",
    "danger-hover-bg": "rgba(244, 71, 71, 0.15)",
    "titlebar-gradient":
      "linear-gradient(90deg, transparent 0%, rgba(86, 156, 214, 0.4) 15%, rgba(197, 134, 192, 0.2) 50%, rgba(206, 145, 120, 0.15) 85%, transparent 100%)",
    "code-label-bg": "rgba(86, 156, 214, 0.03)",
    "code-border": "rgba(86, 156, 214, 0.08)",
    "logo-bg": "linear-gradient(135deg, rgba(86, 156, 214, 0.15), rgba(197, 134, 192, 0.1))",
    "logo-border": "rgba(86, 156, 214, 0.10)",
    "drop-zone-border": "rgba(86, 156, 214, 0.15)",
    "drop-zone-hover-border": "rgba(86, 156, 214, 0.30)",
    "btn-primary-bg": "rgba(86, 156, 214, 0.10)",
    "btn-primary-border": "rgba(86, 156, 214, 0.20)",
    "btn-primary-hover-bg": "rgba(86, 156, 214, 0.15)",
    "btn-secondary-bg": "rgba(255, 255, 255, 0.05)",
    "btn-secondary-border": "rgba(255, 255, 255, 0.10)",
    "btn-secondary-hover-bg": "rgba(255, 255, 255, 0.10)",
    "toast-info-bg": "rgba(86, 156, 214, 0.08)",
    "toast-info-border": "rgba(86, 156, 214, 0.20)",
    "toast-success-bg": "rgba(106, 153, 85, 0.08)",
    "toast-success-border": "rgba(106, 153, 85, 0.20)",
    "toast-error-bg": "rgba(244, 71, 71, 0.08)",
    "toast-error-border": "rgba(244, 71, 71, 0.20)",
    "toast-warning-bg": "rgba(206, 145, 120, 0.08)",
    "toast-warning-border": "rgba(206, 145, 120, 0.20)",
    "slider-glow": "0 0 4px rgba(86, 156, 214, 0.3)",
    "pulse-glow-dim": "0 0 5px rgba(86, 156, 214, 0.2)",
    "pulse-glow-bright": "0 0 20px rgba(86, 156, 214, 0.4)",
    "obsidian-callout-note": "#6c9bff",
    "obsidian-callout-abstract": "#40c8ff",
    "obsidian-callout-info": "#40d4e8",
    "obsidian-callout-todo": "#40d4e8",
    "obsidian-callout-tip": "#40d9b5",
    "obsidian-callout-success": "#40d863",
    "obsidian-callout-question": "#80e830",
    "obsidian-callout-warning": "#ffa840",
    "obsidian-callout-failure": "#ff6c6c",
    "obsidian-callout-danger": "#ff4060",
    "obsidian-callout-bug": "#ff4080",
    "obsidian-callout-example": "#9c70ff",
    "obsidian-callout-quote": "#b0b0b0",
  },
};
