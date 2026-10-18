# frontend/interaction — 交互与动效经验

## F12: 图表 hover 高亮用纯 CSS + :has() + 只动 opacity 🟡

- **主张**：图表（SVG）hover 高亮优先用「注入到 SVG 自身 `<style>` 的纯 CSS」实现：只用 `opacity`（配 `transition`），靠 `:has()` 精确触发同类淡出，不写一行 JS、不触发布局重排；选择器必须从框架 dist 取证而非凭记忆猜测。
- **适用**：Mermaid / 任意 SVG 图表的 hover 聚焦高亮；受「动画性能只动 transform/opacity」条款约束的项目。
- **Why**：JS 事件逐个绑定 SVG 节点既重又易漏；而纯 CSS `:has()` 能在「指针确实落在某图元」时才让同类淡出，掠过空白不触发。只动 opacity 不触发重排，满足性能条款。`@media (hover: hover)` 让触屏不残留、`prefers-reduced-motion` 去过渡照顾无障碍。
- **How**：`src/components/reader/mermaidHoverCss.ts` 导出 `MERMAID_HOVER_TARGETS`（逐图表类型从 mermaid 12.2.0 dist 取证的选择器：`g.node`/`g.cluster`/`path[data-et="edge"]`/sankey `g.link`/sequence `message` 等）+ `MERMAID_HOVER_CSS`（`:has()` 触发同组 `opacity:0.25`）；`MermaidDiagram.tsx` 在 SVG 后处理链路末尾注入（置 `<style>` 最前、靠 `:has()` 特异性不与主题冲突）；`mermaidHoverCss.test.ts` 六个守卫断言「只声明 opacity/transition、触屏/减弱动效、`:has()`/`:not(:hover)`、覆盖 sankey 与饼图、选择器无前导空格」。
- **反例**：① JS 给每个节点绑 hover 事件 → 几百节点性能差、与虚拟渲染脱节；② 猜测选择器如 `.node` 实际 mermaid 用 `g.node` 且 sankey 标签在兄弟组 `g.node-labels` → 误把文字淡出不可读（须取证 dist 才知 `g.link` 流量带淡出、标签组不淡）；③ 动 display/visibility 触发重排，违反性能条款。
- **事实源**：`MermaidDiagram.tsx` / `mermaidHoverCss.ts`；DEC-038；BUG-065（同类「须从框架取证」教训）
