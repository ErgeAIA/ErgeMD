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

  it("覆盖用户点名的补充类型（journey / xychart / packet / radar / eventmodeling / treemap / ishikawa / cynefin / sequence / gitGraph）", () => {
    // 用户旅程图：任务背景 + 文字 + 脸谱 + 连接线
    expect(MERMAID_HOVER_TARGETS).toContain("rect.task");
    expect(MERMAID_HOVER_TARGETS).toContain("div.task");
    expect(MERMAID_HOVER_TARGETS).toContain("text.task");
    expect(MERMAID_HOVER_TARGETS).toContain("circle.face");
    expect(MERMAID_HOVER_TARGETS).toContain("line.task-line");
    // 饼图数值标签（扇区 path.pieCircle 已有）
    expect(MERMAID_HOVER_TARGETS).toContain("text.slice");
    // 象限图数据点（已有）
    expect(MERMAID_HOVER_TARGETS).toContain("g.data-point");
    // 时序图 actor 框与名
    expect(MERMAID_HOVER_TARGETS).toContain("rect.actor");
    expect(MERMAID_HOVER_TARGETS).toContain("text.actor");
    // gitGraph 提交点 + 提交标签 + 分支线 + 箭头
    expect(MERMAID_HOVER_TARGETS).toContain(".commit");
    expect(MERMAID_HOVER_TARGETS).toContain("rect.commit-label-bkg");
    expect(MERMAID_HOVER_TARGETS).toContain("text.commit-label");
    expect(MERMAID_HOVER_TARGETS).toContain("path.arrow");
    expect(MERMAID_HOVER_TARGETS).toContain("line.branch");
    // XY 图表：单柱 / 单线（非组选择器——单序列也能清晰 hover；类名带索引，用属性通配）
    expect(MERMAID_HOVER_TARGETS).toContain('g[class*="bar-plot-"] rect');
    expect(MERMAID_HOVER_TARGETS).toContain('g[class*="line-plot-"] path');
    // 沃德利地图组件节点组（g.wardley-node 内含 circle + 标签，整体淡出）
    expect(MERMAID_HOVER_TARGETS).toContain("g.wardley-node");
    // 数据包图
    expect(MERMAID_HOVER_TARGETS).toContain("rect.packetBlock");
    expect(MERMAID_HOVER_TARGETS).toContain("text.packetLabel");
    expect(MERMAID_HOVER_TARGETS).toContain("text.packetByte");
    // 雷达图曲线（类名带索引）
    expect(MERMAID_HOVER_TARGETS).toContain('polygon[class*="radarCurve-"]');
    // 事件建模图
    expect(MERMAID_HOVER_TARGETS).toContain("g.em-box");
    expect(MERMAID_HOVER_TARGETS).toContain("path.em-relation");
    // 树状图叶子组与石川图因果组（均为含文字的完整组）
    expect(MERMAID_HOVER_TARGETS).toContain("g.treemapLeafGroup");
    expect(MERMAID_HOVER_TARGETS).toContain("g.ishikawa-sub-group");
    // Cynefin 域、标签、子标题与条目
    expect(MERMAID_HOVER_TARGETS).toContain("rect.cynefinDomain");
    expect(MERMAID_HOVER_TARGETS).toContain("text.cynefinDomainLabel");
    expect(MERMAID_HOVER_TARGETS).toContain("text.cynefinSubtitle");
    expect(MERMAID_HOVER_TARGETS).toContain("rect.cynefinItem");
  });

  it("选择器均不带前导空格（避免 mermaid 类名串的前导空格导致匹配失败）", () => {
    for (const sel of MERMAID_HOVER_TARGETS) {
      expect(sel.startsWith(" ")).toBe(false);
    }
  });
});
