/**
 * 主题源色表的 TypeScript 契约。
 * 字段分工见 docs/theme-token-contract-design.md 第 5/6 节与 SDD 台账 R11：
 * - canvas/ink/accent/brand/headingHues/chartHues/seriesHues/fillBand/code/scrollbar：
 *   派生输入
 * - chartNeutral/chartSpare/passthrough：现行值透传（键为 CSS token 名或语义名）
 */

export interface ThemeSource {
  /** 主题名（= data-theme 值与文件名） */
  name: string;
  /** 画布阶（由内到外） */
  canvas: {
    reader: string;
    code: string;
    sidebar: string;
    page: string;
    secondary: string;
    tertiary: string;
  };
  /** 墨色阶 */
  ink: {
    heading: string;
    primary: string;
    secondary: string;
    muted: string;
  };
  /** 强调色族（hex；-rgb 三元组由生成器机械转换） */
  accent: Record<string, string>;
  /** 品牌色 */
  brand: { primary: string; secondary: string; logo: string };
  /** 六级标题色相种子（生成时调校至 ≥4.5:1） */
  headingHues: string[];
  /** 图表六类别色相种子（→ fill-0..5 派生 + stroke-0..5 恒等） */
  chartHues: string[];
  /** 数据序列六色相种子（→ series-0..5 恒等） */
  seriesHues: string[];
  /** 图表填充带（OKLCH 明度/彩度） */
  fillBand: { l: number; c: number };
  /** 代码高亮原配 */
  code: Record<string, string>;
  /** 滚动条 */
  scrollbar: { track: string; thumb: string; thumbHover: string };
  /** 图表中性组（现行值透传） */
  chartNeutral: Record<string, string>;
  /** 图表备用槽 6/7（现行值透传） */
  chartSpare: Record<string, string>;
  /** 其余 token 透传：键为 CSS token 名，值为现行字面量 */
  passthrough: Record<string, string>;
}
