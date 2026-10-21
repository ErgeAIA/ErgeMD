/**
 * Mermaid 图表 hover 高亮样式（注入到 SVG 自身的 <style> 内）。
 *
 * 效果：指针落在某个图元上时，该图元保持不透明，**同类图元淡出**（形成聚焦）。
 *
 * 设计取舍：
 * 1. **纯 CSS，零监听**：沿用本项目的 SVG 后处理注入机制（与主题适配同一条链路），
 *    不引入事件监听——图表是缓存的 HTML 字符串 + 虚拟滚动，挂监听易泄漏且需随挂载清理。
 * 2. **只动 opacity**：遵守 AGENTS.md「动画性能」条款，绝不触发布局重排。
 *    （`mermaidHoverCss.test.ts` 会断言本文件只产出 opacity/transition 声明。）
 * 3. **`:has()` 精确触发**：只有指针确实落在图元上才淡出同类；掠过画布空白不会让整图变暗。
 *    WebView2 / WKWebView / 现代 WebKitGTK 均支持。
 * 4. **`@media (hover: hover)`**：触屏设备不套用，避免点按后残留 hover 态。
 * 5. **`prefers-reduced-motion`**：系统偏好减弱动效时去掉过渡（状态仍变，只是瞬变）。
 *
 * 选择器来源：逐类型从 mermaid 12.2.0 dist 取证 + 真实渲染产物 DOM 结构核对
 * （见 project-progress 2026-10-19 / 2026-10-20 条目），未取证的类型不写选择器——
 * 错选择器等于坏功能。类名带索引的（bar-plot-N / radarCurve-N）用属性通配；
 * 分类容器（treemapNode / cynefin-backgrounds / em-swimlane 等）刻意不作 target，
 * 否则 hover 子元素会连带淡出自身所在容器，破坏聚焦。
 */
export const MERMAID_HOVER_TARGETS = [
  // 统一渲染管线（flowchart / swimlane / class / state / er / mindmap / usecase / requirement / kanban）
  // 节点 g 内已包含标签文本，淡出即整体淡出
  "g.node",
  "g.cluster",
  'path[data-et="edge"]',
  "path.relationshipLine",
  // sankey：节点与流量带（节点标签在兄弟组 g.node-labels，不在此淡出——读图时文字始终可读）
  "g.link",
  // 时序图：消息线 + actor 框与 actor 名（名字 DOM 在框之上，会遮挡框；
  // 两者都入 target，hover 任一即让其他 actor 的框与名一起淡出）
  '[data-et="message"]',
  "rect.actor",
  "text.actor",
  // pie 扇区与其数值标签（二者为兄弟节点，同步过渡下视觉上一起淡）
  "path.pieCircle",
  "text.slice",
  // gantt / journey 任务：rect.task 为背景，其余为同任务的文字、脸谱与连接线
  // （平级关系，靠同步 transition 达到整体淡出观感）
  "rect.task",
  "div.task",
  "text.task",
  "circle.face",
  "line.task-line",
  // 象限图数据点 / 时间线节点 / 韦恩图集合与交集 / 架构图服务
  "g.data-point",
  "g.timeline-node",
  "g.venn-circle",
  "g.venn-intersection",
  "g.architecture-service",
  // 沃德利地图：组件节点组（g.wardley-node 内含 circle + 标签，整体淡出；
  // 节点圆仅 r=6 偏小，但 g 组命中区含标签，悬停即触发）
  "g.wardley-node",
  // gitGraph：提交点 + 提交标签（圆点仅约 20×20 难命中，标签背景更易点）+
  // 分支线 + 箭头（后两者为细线几何，命中精度有限但机制有效）
  ".commit",
  "rect.commit-label-bkg",
  "text.commit-label",
  "path.arrow",
  "line.branch",
  // XY 图表：柱（g.bar-plot-N 内的 rect）与折线（g.line-plot-N 内的 path）。
  // 用单元素选择器而非组选择器——单序列示例里悬停一根柱即可让其余柱淡出，
  // 而不只是把整个折线组淡掉；类名带索引，用属性通配
  'g[class*="bar-plot-"] rect',
  'g[class*="line-plot-"] path',
  // 数据包图数据块与其标签、位号文字
  "rect.packetBlock",
  "text.packetLabel",
  "text.packetByte",
  // 雷达图曲线（类名带索引 radarCurve-N；网格 radarGraticule 是背景参考，刻意不淡）
  'polygon[class*="radarCurve-"]',
  // 事件建模图事件框与关系线（em-swimlane 是容器，不作 target）
  "g.em-box",
  "path.em-relation",
  // 树状图叶子组（rect.treemapLeaf + text.treemapLabel + text.treemapValue 同组，整体淡出）
  "g.treemapLeafGroup",
  // 石川图因果组（ishikawa-sub-branch + ishikawa-label-group 同组）
  "g.ishikawa-sub-group",
  // Cynefin 域底色、域标签、子标题与域内条目徽标（条目在域之上、会遮挡域底色，
  // 故一并入 target；g.cynefin-backgrounds / -labels / -subtitles 是分类容器，不作 target）
  "rect.cynefinDomain",
  "text.cynefinDomainLabel",
  "text.cynefinSubtitle",
  "rect.cynefinItem",
] as const;

/** 淡出后的不透明度（明暗主题通用） */
const DIM_OPACITY = 0.25;
/** 过渡时长（ms） */
const TRANSITION_MS = 160;

const transitionTargets = MERMAID_HOVER_TARGETS.map((sel) => `svg ${sel}`).join(
  ",\n            ",
);

const dimTargets = MERMAID_HOVER_TARGETS.map(
  (sel) => `svg:has(${sel}:hover) ${sel}:not(:hover)`,
).join(",\n            ");

// 悬停图元本身保持满不透明（与 dim 配对：其余淡出、当前项保持 1）。
// 对绝大多数图表是 no-op（基础 opacity 已是 1），仅对饼图这类被 mermaid 用
// #id 作用域设了非 1 基础 opacity（.pieCircle{opacity:0.7}）的图元有意义。
const keepTargets = MERMAID_HOVER_TARGETS.map(
  (sel) => `svg:has(${sel}:hover) ${sel}:hover`,
).join(",\n            ");

export const MERMAID_HOVER_CSS = `
          /* ===== Mermaid hover 高亮（仅 opacity，不触发重排） ===== */
          @media (hover: hover) {
            ${transitionTargets} {
              transition: opacity ${TRANSITION_MS}ms ease-out;
            }

            /* 仅在指针确实落在图元上时淡出同类；掠过空白不触发。
               !important 必要：饼图等图表由 mermaid 用 #id 作用域设了基础
               opacity（如 .pieCircle{opacity:0.7}），无作用域的淡出规则会被其
               更高特异性覆盖，导致淡出完全失效 */
            ${dimTargets} {
              opacity: ${DIM_OPACITY} !important;
            }

            /* 悬停项保持满不透明：饼图基础 opacity 为 0.7，需显式拉回 1 */
            ${keepTargets} {
              opacity: 1 !important;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            ${transitionTargets} {
              transition: none;
            }
          }
        `;
