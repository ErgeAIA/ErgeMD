# frontend/interaction — 交互与动效经验

## F12: 图表 hover 高亮用纯 CSS + :has() + 只动 opacity 🟡

- **主张**：图表（SVG）hover 高亮优先用「注入到 SVG 自身 `<style>` 的纯 CSS」实现：只用 `opacity`（配 `transition`），靠 `:has()` 精确触发同类淡出，不写一行 JS、不触发布局重排；选择器必须从框架 dist 取证而非凭记忆猜测。
- **适用**：Mermaid / 任意 SVG 图表的 hover 聚焦高亮；受「动画性能只动 transform/opacity」条款约束的项目。
- **Why**：JS 事件逐个绑定 SVG 节点既重又易漏；而纯 CSS `:has()` 能在「指针确实落在某图元」时才让同类淡出，掠过空白不触发。只动 opacity 不触发重排，满足性能条款。`@media (hover: hover)` 让触屏不残留、`prefers-reduced-motion` 去过渡照顾无障碍。
- **How**：`src/components/reader/mermaidHoverCss.ts` 导出 `MERMAID_HOVER_TARGETS`（逐图表类型从 mermaid 12.2.0 dist 取证的选择器：`g.node`/`g.cluster`/`path[data-et="edge"]`/sankey `g.link`/sequence `message` 等）+ `MERMAID_HOVER_CSS`（`:has()` 触发同组 `opacity:0.25`）；`MermaidDiagram.tsx` 在 SVG 后处理链路末尾注入（置 `<style>` 最前、靠 `:has()` 特异性不与主题冲突）；`mermaidHoverCss.test.ts` 六个守卫断言「只声明 opacity/transition、触屏/减弱动效、`:has()`/`:not(:hover)`、覆盖 sankey 与饼图、选择器无前导空格」。
- **反例**：① JS 给每个节点绑 hover 事件 → 几百节点性能差、与虚拟渲染脱节；② 猜测选择器如 `.node` 实际 mermaid 用 `g.node` 且 sankey 标签在兄弟组 `g.node-labels` → 误把文字淡出不可读（须取证 dist 才知 `g.link` 流量带淡出、标签组不淡）；③ 动 display/visibility 触发重排，违反性能条款。
- **事实源**：`MermaidDiagram.tsx` / `mermaidHoverCss.ts`；DEC-038；BUG-065（同类「须从框架取证」教训）

## F16: hover 目标必须核对 DOM 结构与遮挡关系 🟡

- **主张**：给图表补 hover 高亮时，光有「类名存在」不够，必须再核对三件事：① **元素类型与嵌套**——优先选「含文字的完整组」作 target（如 `g.treemapLeafGroup`、`g.ishikawa-sub-group`），避免淡出背景却留下文字；② **分类容器不能作 target**——`treemapNode`/`cynefin-backgrounds`/`em-swimlane` 这类父容器一旦入列，hover 子元素会连带淡出自身所在容器，聚焦反被破坏；③ **被遮挡的形状要补同级入口**——背景矩形常被其上的文字框覆盖（journey `rect.task` 被 foreignObject 完全盖住、packet 块被标签盖住、cynefin 域被条目盖住、gitGraph 圆点仅 20×20），把可命中的同级元素（`div.task`/`text.packetLabel`/`rect.cynefinItem`/提交标签）一并入列，hover 任一即整体淡出。
- **适用**：任何按「同类淡出」机制做的 SVG/图表 hover 高亮，尤其第三方引擎产出的 DOM。
- **Why**：`:hover` 只对指针实际命中的元素生效。类名存在但被遮挡 → 用户鼠标移上去毫无反应；容器入列 → hover 任意子项会让整个容器（含当前项）一起淡出；只淡背景不淡文字 → 视觉残留。这些都无法从「选择器能选中元素」推断出来，必须看真实渲染的 DOM 树。
- **How**：渲染真实示例后 dump「类名 + 元素标签 + 父子结构」（`host.querySelectorAll('[class]')` 统计 `tagName.classList`，再按深度打印树）；对每个候选 target 用 `elementFromPoint` 网格采样确认**存在可命中点**；验证用真实鼠标（`page.mouse.move`）触发 `:hover` 后读 `getComputedStyle(opacity)`——`dispatchEvent('mouseover')` **不能**触发 `:hover`。细线/空心几何（折线、箭头、分支线、空心多边形）命中精度天然受限，机制仍有效但不要宣称好用；类名带索引的用属性通配（`[class*="bar-plot-"]`）。
- **反例**：只按类名频次挑 target 就上线 → journey 任务条整块被文字框覆盖、鼠标移上去无任何反应（用户报「没有 hover 动画」）；把 `g.treemapNode` 当 target → hover 任一叶子会让所在节点组整体淡出，当前项也跟着变暗。
- **事实源**：2026-10-20 hover 补齐轮（`mermaidHoverCss.ts` 14→33 项）；真浏览器 `elementFromPoint` + `page.mouse.move` 实测
