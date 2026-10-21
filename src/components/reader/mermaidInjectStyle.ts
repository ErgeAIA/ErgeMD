/**
 * mermaid SVG 注入样式的作用域化工具。
 *
 * 抽成独立模块的原因：这两个函数只做字符串处理、无任何副作用依赖，
 * 便于单测覆盖（直接 import MermaidDiagram 会把 mermaid 运行时一起拉起）。
 */

/**
 * 给注入 mermaid SVG 内部 `<style>` 的 CSS 加「本图 id」作用域前缀。
 *
 * HTML 的 `<style>` 无论写在 DOM 的哪个位置都**对整个文档生效**。mermaid 给每张图
 * 单独注入 `<style>`，我们手工追加的规则若用裸选择器，就会污染同页其他图——典型案例：
 * ① 流程图的 `.node rect/.node circle/.node polygon{fill:白 !important;stroke:品牌色}`
 *    让思维导图中心变「白底 + 橙描边」（mindmap 节点 group 同样带 `.node` 类）；
 * ② 架构图的 `.node-bkg{stroke:品牌色}` 让思维导图所有子节点被强加橙色描边。
 * 只在流程图/架构图已渲染后才出现，而导出是全量渲染，故必然复现。
 * mermaid 自己注入的规则天然带 `#<svgId>` 前缀（dump 可见 `#mermaid-xxx .section-root
 * circle`），这里把手工注入对齐到同一口径。
 */
/**
 * 给一组选择器（逗号分隔）加作用域前缀。
 *
 * at-rule 前置（`@media (hover: hover)` 等）原样返回：它们不是选择器，加前缀会直接
 * 让整条规则非法。
 */
function prefixSelectors(sel: string, svgId: string): string {
  if (!sel.trim() || sel.trim().startsWith("@")) return sel;
  return sel
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      // 以 `svg` 开头的段指的就是根 SVG 自身（#svgId），必须**整体替换**：若只是
      // 「去掉 svg 再往前拼 #id」，`svg:has(g.node:hover)` 会变成 `#id :has(...)`——
      // 多出的空格使它从「根 SVG 且满足 :has」退化成「根 SVG 的后代中满足 :has 者」，
      // 语义完全不同。
      if (/^svg(?=\s|:)/.test(s)) return `#${svgId}${s.slice(3)}`;
      return `#${svgId} ${s}`;
    })
    .join(", ");
}

export function scopeInjectedCss(css: string, svgId: string): string {
  // 逐个扫描而非用正则：CSS 注释里可能没有 `{`，纯正则会把「注释 + @media + 一整串
  // 选择器」当成单个选择器段，把 @media 吞进选择器里 → 整条规则非法、样式静默失效
  // （MERMAID_HOVER_CSS 开头就是注释，曾因此导致 hover 高亮整体消失）。
  let out = "";
  let selStart = 0;
  let i = 0;
  let depth = 0;

  while (i < css.length) {
    // 注释：原样透传，绝不参与选择器解析
    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const stop = end === -1 ? css.length : end + 2;
      out += css.slice(selStart, stop);
      i = stop;
      selStart = stop;
      continue;
    }
    if (css[i] === "{") {
      const prefixed = prefixSelectors(css.slice(selStart, i), svgId);
      out += prefixed.trim() ? `${prefixed.trimEnd()} ` : prefixed;
      out += "{";
      selStart = i + 1;
      depth += 1;
      i += 1;
      continue;
    }
    if (css[i] === "}") {
      // 声明体（或未匹配的多余闭合）原样输出
      out += css.slice(selStart, i + 1);
      selStart = i + 1;
      depth = Math.max(0, depth - 1);
      i += 1;
      continue;
    }
    i += 1;
  }
  out += css.slice(selStart);
  return out;
}

/**
 * 把 CSS 注入 mermaid SVG 的第一个 `<style>`（没有则新建），并限定作用域到该 SVG。
 * 取不到根 svg 的 id 时退化为原样注入（保持旧行为，不做半吊子作用域化）。
 */
export function injectSvgStyle(svg: string, css: string): string {
  const idMatch = svg.match(/<svg[^>]*\sid="([^"]+)"/);
  const scoped = idMatch ? scopeInjectedCss(css, idMatch[1]) : css;
  if (svg.includes("<style>")) {
    return svg.replace("<style>", `<style>${scoped}`);
  }
  return svg.replace(/<svg([^>]*)>/, `<svg$1><style>${scoped}</style>`);
}
