import { describe, it, expect } from "vitest";
import { MERMAID_HOVER_CSS, MERMAID_HOVER_TARGETS } from "./mermaidHoverCss";

/** 提取 CSS 中所有声明的属性名（形如 `prop: value;`；值不含 `(`/`{`，排除 @media 条件里的 hover: hover） */
function declaredProperties(css: string): string[] {
  return [...css.matchAll(/([a-z-]+)\s*:\s*[^;({]+;/g)].map((m) => m[1]);
}

describe("mermaidHoverCss", () => {
  it("只声明 opacity 与 transition（不碰任何会触发重排的属性）", () => {
    const props = new Set(declaredProperties(MERMAID_HOVER_CSS));
    // 选择器里出现的 `svg`、`g.node` 等不带冒号，不会被计入声明
    for (const p of props) {
      expect(["opacity", "transition"]).toContain(p);
    }
  });

  it("hover 规则包裹在 @media (hover: hover) 内（触屏不残留）", () => {
    expect(MERMAID_HOVER_CSS).toContain("@media (hover: hover)");
  });

  it("减弱动效偏好下去掉过渡", () => {
    expect(MERMAID_HOVER_CSS).toContain("@media (prefers-reduced-motion: reduce)");
    expect(MERMAID_HOVER_CSS).toContain("transition: none");
  });

  it("用 :has() 精确触发，且对非悬停图元用 :not(:hover) 淡出", () => {
    expect(MERMAID_HOVER_CSS).toContain(":has(");
    expect(MERMAID_HOVER_CSS).toContain(":not(:hover)");
  });

  it("覆盖桑基图（用户点名的类型）与饼图选择器", () => {
    expect(MERMAID_HOVER_TARGETS).toContain("g.link"); // sankey 流量带
    expect(MERMAID_HOVER_TARGETS).toContain("g.node"); // sankey 节点（统一管线节点同用此名）
    expect(MERMAID_HOVER_TARGETS).toContain("path.pieCircle");
  });

  it("选择器均不带前导空格（避免 mermaid 类名串的前导空格导致匹配失败）", () => {
    for (const sel of MERMAID_HOVER_TARGETS) {
      expect(sel.startsWith(" ")).toBe(false);
    }
  });
});
