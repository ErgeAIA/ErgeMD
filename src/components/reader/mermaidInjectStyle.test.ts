import { describe, expect, it } from "vitest";
import { MERMAID_HOVER_CSS } from "./mermaidHoverCss";
import { injectSvgStyle, scopeInjectedCss } from "./mermaidInjectStyle";

const ID = "mermaid-1-abc";

describe("scopeInjectedCss", () => {
  it("给单条规则的选择器加本图 id 前缀", () => {
    expect(scopeInjectedCss(".node circle { fill: red; }", ID)).toBe(
      `#${ID} .node circle { fill: red; }`,
    );
  });

  it("逗号分隔的多个选择器各自加前缀", () => {
    expect(scopeInjectedCss(".node rect,\n .node polygon { stroke: red; }", ID)).toBe(
      `#${ID} .node rect, #${ID} .node polygon { stroke: red; }`,
    );
  });

  it("去掉表示根 SVG 自身的 `svg` 前缀（否则变成 `#id svg …` 永远匹配不上）", () => {
    expect(scopeInjectedCss("svg g.node { opacity: 0.25; }", ID)).toBe(
      `#${ID} g.node { opacity: 0.25; }`,
    );
  });

  it("`svg:has(...)` 中的 svg 前缀同样去掉，保留伪类", () => {
    expect(scopeInjectedCss("svg:has(g.node:hover) g { opacity: 0.25; }", ID)).toBe(
      `#${ID}:has(g.node:hover) g { opacity: 0.25; }`,
    );
  });

  it("保留 @media 条件块，只作用域化其内部规则", () => {
    const out = scopeInjectedCss(
      "@media (hover: hover) { svg g.node { opacity: 0.25; } }",
      ID,
    );
    expect(out).toContain("@media (hover: hover)");
    expect(out).toContain(`#${ID} g.node`);
    // @media 自身不能被误加前缀
    expect(out).not.toContain(`#${ID} @media`);
  });

  it("不误伤声明块（含 #hex 颜色与 !important）", () => {
    const css = ".node-bkg { stroke: #FF6A2B !important; }";
    const out = scopeInjectedCss(css, ID);
    expect(out.startsWith(`#${ID} .node-bkg {`)).toBe(true);
    expect(out).toContain("stroke: #FF6A2B !important;");
  });

  it("多条规则连续时逐条作用域化", () => {
    const out = scopeInjectedCss(
      ".a { fill: red; }\n.b { fill: blue; }\n",
      ID,
    );
    expect(out).toContain(`#${ID} .a {`);
    expect(out).toContain(`#${ID} .b {`);
  });

  it("无规则文本（纯注释）原样返回", () => {
    const css = "/* 只有注释，没有规则 */";
    expect(scopeInjectedCss(css, ID)).toBe(css);
  });
});

describe("injectSvgStyle", () => {
  const svgWithId = `<svg id="${ID}" width="100%" viewBox="0 0 10 10"><style>orig{}</style></svg>`;

  it("把 CSS 注入到第一个 <style> 并作用域化", () => {
    const out = injectSvgStyle(svgWithId, ".node circle { fill: red; }");
    expect(out).toContain(`<style>#${ID} .node circle { fill: red; }orig{}`);
  });

  it("取不到 svg id 时退化为原样注入（不做半吊子作用域化）", () => {
    const svgNoId = `<svg viewBox="0 0 10 10"><style>orig{}</style></svg>`;
    expect(injectSvgStyle(svgNoId, ".node circle { fill: red; }")).toContain(
      "<style>.node circle { fill: red; }orig{}",
    );
  });

  it("作用域化后跨图选择器不会互相命中（回归：流程图污染思维导图）", () => {
    const flowId = "mermaid-flow-1";
    const flowSvg = injectSvgStyle(
      `<svg id="${flowId}" viewBox="0 0 10 10"><style></style></svg>`,
      ".node circle { fill: #FFFFFF !important; stroke: #FF6A2B !important; }",
    );
    const injected = flowSvg.slice(
      flowSvg.indexOf("<style>") + 7,
      flowSvg.indexOf("</style>"),
    );
    // 注入结果里不应残留无作用域的裸 `.node circle`
    // （带前缀的文本也含 `.node circle`，故按「选择器起始位置」判断：
    //  .node 前必须是 `^`、`{`/`}` 之后紧跟，才算裸选择器）
    expect(injected).not.toMatch(/(^|[{}])\s*\.node circle/);
    expect(injected).toContain(`#${flowId} .node circle`);
  });
});

describe("scopeInjectedCss 与 CSS 注释 / at-rule", () => {
  it("开头注释不会被当成选择器（@media 不能被吞进选择器）", () => {
    const css =
      "/* 说明 */\n@media (hover: hover) {\n  svg g.node { opacity: 0.25; }\n}";
    const out = scopeInjectedCss(css, ID);
    expect(out).toContain("/* 说明 */");
    expect(out).toContain("@media (hover: hover)");
    // `@media` 前不能出现作用域前缀，否则整条规则非法
    expect(out).not.toMatch(/#[\w-]+[^{]*@media/);
    expect(out).toContain(`#${ID} g.node`);
  });

  it("MERMAID_HOVER_CSS 作用域化后注释保留、at-rule 完好、目标全部带前缀", () => {
    const scoped = scopeInjectedCss(MERMAID_HOVER_CSS, ID);
    expect(scoped).toContain("/* ===== Mermaid hover 高亮");
    expect(scoped).toContain("@media (hover: hover)");
    expect(scoped).toContain("@media (prefers-reduced-motion: reduce)");
    // svg:has(...) 必须整体替换，不能出现 `#id :has(`（空格会把「根 SVG 且满足 :has」
    // 退化成「根 SVG 的后代中满足 :has 者」，语义完全不同）
    expect(scoped).not.toContain(`#${ID} :has(`);
    expect(scoped).toContain(`#${ID}:has(`);
    // 声明块数量不变（结构未被破坏）
    const braces = (s: string) => (s.match(/\{/g) || []).length;
    expect(braces(scoped)).toBe(braces(MERMAID_HOVER_CSS));
    // 作用域化后不应残留裸的 `svg ...` 起始选择器
    expect(scoped).not.toMatch(/(^|[{},])\s*svg\s+[a-z[]/);
  });
});
