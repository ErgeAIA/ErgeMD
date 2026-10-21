import markdownCss from "@/styles/markdown.css?inline";

/**
 * 灰度模式下的调色板覆盖。
 * 仅覆盖阅读器核心调色板变量；其它变量（如 --code-*）保留原值，
 * 以保持导出文档在灰度下的可读性与语义着色。
 */
const GRAYSCALE_OVERRIDES: Record<string, string> = {
  "bg-page": "#ffffff",
  "bg-reader": "#ffffff",
  "bg-code": "#f5f5f5",
  // BUG-067 修复后新增的历史消费方令牌（弹层表面）
  "bg-primary": "#ffffff",
  "text-primary": "#1a1a1a",
  "text-secondary": "#4a4a4a",
  "text-muted": "#808080",
  "text-heading": "#000000",
  // 六级标题全部落地：否则深色主题的浅色标题（如 monochrome 的 #FAFAFA）在灰底上不可见
  "h1-color": "#000000",
  "h2-color": "#1a1a1a",
  "h3-color": "#1a1a1a",
  "h4-color": "#1a1a1a",
  "h5-color": "#1a1a1a",
  "h6-color": "#1a1a1a",
  "list-number": "#1a1a1a",
  "accent-cyan": "#0066cc",
  "accent-pink": "#cc3366",
  "accent-purple": "#6633cc",
  "accent-green": "#2d7d46",
  "accent-yellow": "#998800",
  "accent-orange": "#cc6600",
  "accent-red": "#cc3333",
  divider: "#cccccc",
  "table-border": "#cccccc",
  "border-subtle": "#e8e8e8",
  "hover-bg": "#e8e8e8",
  // 图表：填充与文字入灰度（明度阶梯区分槽位，沿用「层级用明度」原则），
  // 描边与序列保留主题色以维持数据区分（与代码高亮保留语义着色同一口径）
  "chart-text": "#1a1a1a",
  "chart-text-muted": "#4a4a4a",
  "chart-fill-0": "#f2f2f2",
  "chart-fill-1": "#ebebeb",
  "chart-fill-2": "#f5f5f5",
  "chart-fill-3": "#e6e6e6",
  "chart-fill-4": "#f0f0f0",
  "chart-fill-5": "#ededed",
  "chart-fill-6": "#f4f4f4",
  "chart-fill-7": "#e9e9e9",
  "chart-text-on-fill-0": "#1a1a1a",
  "chart-text-on-fill-1": "#1a1a1a",
  "chart-text-on-fill-2": "#1a1a1a",
  "chart-text-on-fill-3": "#1a1a1a",
  "chart-text-on-fill-4": "#1a1a1a",
  "chart-text-on-fill-5": "#1a1a1a",
  "chart-text-on-fill-6": "#1a1a1a",
  "chart-text-on-fill-7": "#1a1a1a",
};

/**
 * 全量收集当前文档的计算样式中所有的 CSS 自定义属性（--*）。
 *
 * 不再依赖手写变量白名单：之前只收集 ~20 个精选变量，导致 --code-keyword /
 * --code-string 等高亮配色变量缺失，且 .markdown-body 排版所需的变量不全。
 * 这里直接从 document.documentElement（主题变量在此定义）与 .markdown-body
 * 元素（部分变量挂在它身上，如 --katex-font-size）读取全部 --* 计算值。
 *
 * @param grayscale 是否启用灰度覆盖
 */
export function collectAllCssVariables(
  grayscale: boolean,
): Record<string, string> {
  const result: Record<string, string> = {};

  const sources: (Element | null)[] = [
    document.documentElement,
    document.querySelector(".markdown-body"),
  ];

  for (const src of sources) {
    if (!src) continue;
    const computedStyle = getComputedStyle(src);
    for (let i = 0; i < computedStyle.length; i++) {
      const prop = computedStyle[i];
      if (!prop.startsWith("--")) continue;
      const value = computedStyle.getPropertyValue(prop).trim();
      if (!value) continue;
      const name = prop.slice(2);
      result[prop] = grayscale
        ? GRAYSCALE_OVERRIDES[name] ?? value
        : value;
    }
  }

  return result;
}

export interface BuildExportStylesOptions {
  inlineCss?: boolean;
  grayscale?: boolean;
  forPdf?: boolean;
  fontSize?: number;
}

/** 去掉选择器中的伪类/伪元素后缀，得到可用 querySelectorAll 匹配的基础选择器 */
function stripPseudo(selector: string): string {
  return selector
    .replace(/::[a-zA-Z-]+(\([^)]*\))?/g, "")
    .replace(/:[a-zA-Z-]+(\([^)]*\))?/g, "")
    .trim();
}

/**
 * 选择器是否在导出 DOM（scope 子树）内命中。
 * 先试原始选择器（覆盖 `:root` / `:is()` / `:not()` 等），再试去伪类版本
 * （`:hover` 等静态状态下不命中，需还原为基础选择器匹配）。
 * 选择器语法不受支持时保守返回 true（宁可留着也不误删）。
 */
function selectorMatchesInScope(selector: string, scope: Element): boolean {
  const candidates = [selector, stripPseudo(selector)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      if (scope.matches(candidate)) return true;
      if (scope.querySelectorAll(candidate).length > 0) return true;
    } catch {
      return true;
    }
  }
  return false;
}

/** 动画相关属性名（含 animation-name / animation-delay 等子属性） */
const ANIMATION_PROP_RE = /^animation(-[a-z]+)?$/i;

/**
 * 取样式规则自身的声明串，剔除动画相关属性。
 * 用 `style` 而非 cssText 解析：cssText 在 CSS 嵌套场景下会混入子规则文本。
 */
function declarationsOf(rule: CSSStyleRule): string {
  const style = rule.style;
  if (!style || style.length === 0) return "";
  const parts: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (ANIMATION_PROP_RE.test(prop)) continue;
    const value = style.getPropertyValue(prop).trim();
    if (!value) continue;
    const priority = style.getPropertyPriority(prop);
    parts.push(`${prop}: ${value}${priority ? ` ${priority}` : ""}`);
  }
  return parts.length > 0 ? `${parts.join(";\n  ")};` : "";
}

/**
 * 按导出 DOM 过滤单条 CSS 规则；未命中返回空字符串。
 *
 * 四类必删内容：
 * 1. @keyframes / animation-* 属性——入场动画在应用里由 JS 挂载时触发，
 *    静态导出没有触发者，元素可能永久停在动画初始态（表现为"闪一下就没了"）；
 * 2. @starting-style——同样是过渡/动画的初始帧，脱离运行时必导致元素停在初始态；
 * 3. @font-face / @import——引用的是应用运行时资源（tauri:// 等），
 *    在独立打开的 HTML 里必然加载失败，徒增体积与请求延迟；
 * 4. 选择器在导出 DOM 内零命中的规则——Tailwind 全量工具类里绝大多数用不上。
 *
 * @property 需保留：Tailwind v4 部分变量依赖它定义初始值与继承行为。
 *
 * 注意：Chromium 下 CSSStyleRule 因支持 CSS 嵌套而带有 `cssRules`，
 * 不能靠「有没有 cssRules」判容器规则，必须先看 selectorText。
 */
function pruneRule(rule: CSSRule, scope: Element): string {
  const ctorName = rule.constructor?.name ?? "";
  if (
    ctorName === "CSSKeyframesRule" ||
    ctorName === "CSSFontFaceRule" ||
    ctorName === "CSSImportRule" ||
    ctorName === "CSSStartingStyleRule"
  ) {
    return "";
  }

  const anyRule = rule as CSSRule & {
    cssRules?: CSSRuleList;
    selectorText?: string;
  };
  const hasChildren = !!anyRule.cssRules && anyRule.cssRules.length > 0;
  const ownSelector =
    typeof anyRule.selectorText === "string" ? anyRule.selectorText : null;

  let childrenText = "";
  if (hasChildren) {
    const kept: string[] = [];
    for (const child of Array.from(anyRule.cssRules!)) {
      const text = pruneRule(child, scope);
      if (text) kept.push(text);
    }
    childrenText = kept.join("\n");
  }

  if (ownSelector !== null) {
    const selectors = ownSelector
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const keptSelectors = selectors.filter((s) =>
      selectorMatchesInScope(s, scope),
    );
    const declarations = declarationsOf(rule as CSSStyleRule);
    const ownText =
      keptSelectors.length > 0 && declarations
        ? `${keptSelectors.join(", ")} {\n  ${declarations}${
            childrenText ? `\n${childrenText}` : ""
          }\n}`
        : "";

    if (ownText) return ownText;
    // 自身选择器未命中时，仅保留其子规则（罕见：嵌套里有命中项）
    return childrenText;
  }

  // 无 selectorText 的容器规则（@media / @supports / @layer block / @container）
  if (hasChildren) {
    const preludeMatch = rule.cssText.match(/^([^{]+)\{/);
    const prelude = preludeMatch ? preludeMatch[1].trim() : "@media all";
    return `${prelude} {\n${childrenText}\n}`;
  }

  // 其余规则（@property、@layer 语句、@charset 等）原样保留
  return rule.cssText;
}

/**
 * 序列化当前文档 CSSOM，并按导出 DOM 做剪枝。
 *
 * 为什么不靠"注入 markdown.css"就够：阅读区 DOM 由许多组件拼成，
 * 组件级样式分散在各自的 CSS 文件里（如 obsidian.css 的 .obsidian-fm-row
 * 网格布局、Tailwind 工具类），逐个枚举必然遗漏——Properties 块在导出后
 * 布局塌陷正是这样漏掉的。DOM 复制导出的第一性原则：导出的 DOM 是应用
 * 渲染的，CSS 也必须是应用的。直接读 CSSOM 是唯一不会随组件演进而漂移的做法。
 *
 * 剪枝（pruneRule）在此基础上把 3MB 的 CSSOM 压到实际命中的规则集合，
 * 同时剔除依赖应用运行时的动画与字体规则。
 *
 * 同源样式表（Vite dev 注入的 <style> 与打包产物的 <link>）均可读 cssRules；
 * 跨域样式表会抛异常，按张跳过（导出内容不依赖它们）。
 *
 * @param scope 导出 DOM 的根元素，默认取文档中的 .markdown-body
 */
export function serializeAppStylesheets(scope?: Element): string {
  const target = scope ?? document.querySelector(".markdown-body");
  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (target) {
          const pruned = pruneRule(rule, target);
          if (!pruned) continue;
          css += pruned + "\n";
        } else {
          // 无导出 DOM（异常场景）时退化为全量序列化，保证样式不丢
          css += rule.cssText + "\n";
        }
      }
    } catch {
      // 跨域样式表：SecurityError，跳过
    }
  }
  return css;
}

/**
 * 构建导出 HTML 的 <style> 块。
 *
 * 关键修复点（对比旧实现）：
 * 1. 注入应用完整 CSSOM（serializeAppStylesheets），涵盖 markdown.css 排版、
 *    .hljs-* 语法高亮配色、组件级样式（obsidian.css 等）与 Tailwind 工具类——
 *    旧实现手写 22 变量 + 少量规则，导致代码高亮与组件布局全部丢失。
 * 2. 通过 collectAllCssVariables 注入全部 --* 计算变量，置于 CSSOM 之后，
 *    保证灰度覆盖生效，且主题选择器（如 [data-theme]）未命中时变量仍可用。
 * 3. shell 规则中和应用全局样式的副作用（overflow hidden / height 100% /
 *    user-select none），使导出文件在独立浏览器中可正常滚动、选择文本。
 * 4. 由调用方将正文包在 <div class="markdown-body"> 中，并在 <html> 上
 *    复制根节点 class/data-theme，保证主题作用域规则命中。
 *
 * @param options.inlineCss 为 false 时返回空字符串（不内联样式）
 * @param options.grayscale 灰度模式
 * @param options.forPdf    是否为 PDF 导出（附加 @page 与 print-color-adjust）
 * @param options.fontSize  PDF 正文字号
 */
export function buildExportStyles(
  options: BuildExportStylesOptions = {},
): string {
  const { inlineCss = true, grayscale = false, forPdf = false, fontSize } =
    options;
  if (!inlineCss) return "";

  const vars = collectAllCssVariables(grayscale);
  const rootVars = Object.entries(vars)
    .map(([name, value]) => `    ${name}: ${value};`)
    .join("\n");

  const pageRules = forPdf
    ? `@page { size: A4; margin: 15mm 20mm; }`
    : "";

  const colorAdjust = forPdf
    ? `  *, *::before, *::after {
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
  }`
    : "";

  const shell = `
  html, body {
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif;
    background-color: var(--bg-page) !important;
    color: var(--text-primary) !important;
    line-height: 1.8;
    height: auto !important;
    overflow: visible !important;
    user-select: text;
    -webkit-user-select: text;
    ${
      forPdf
        ? "width: 100%; margin: 0; padding: 0;"
        : "max-width: 800px; margin: 2em auto; padding: 0 2em;"
    }
    ${fontSize ? `font-size: ${fontSize}px;` : ""}
  }
  code { font-family: "Cascadia Code", "Fira Code", Consolas, monospace; }
  a { color: var(--link, var(--accent-cyan)); }
  img { max-width: 100%; page-break-inside: avoid; }
  h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
  pre, table { page-break-inside: avoid; }
  ${
    forPdf
      ? `pre {
    background: var(--bg-code);
    border-radius: 8px;
    padding: 1em;
    font-size: 0.9em;
    line-height: 1.6;
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    overflow-x: visible !important;
  }
  pre code {
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    font-size: 1em;
  }`
      : `pre { background: var(--bg-code); border-radius: 8px; padding: 1em; overflow-x: auto; }`
  }
`;

  const appCss = serializeAppStylesheets();

  return `<style>
${appCss}
  ${pageRules}
  ${colorAdjust}
  :root {
${rootVars}
  }
${shell}
</style>`;
}

// 供 PDF 导出路径（generateExportHtml.ts）复用同一份 markdown.css 文本，
// 保证 HTML 与 PDF 导出的排版/高亮配色来源一致。
export { markdownCss };
