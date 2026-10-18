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
 * 选择器来源：逐类型从 mermaid 12.2.0 dist 取证（见 project-progress 2026-10-19 条目），
 * 未取证的类型不写选择器——错选择器等于坏功能。
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
  // 时序图消息线
  '[data-et="message"]',
  // pie 扇区 / gantt 任务条 / journey 任务（含同组文字）
  "path.pieCircle",
  "rect.task",
  // 象限图数据点 / 时间线节点 / 韦恩图集合与交集 / 架构图服务 / gitGraph 提交点
  "g.data-point",
  "g.timeline-node",
  "g.venn-circle",
  "g.venn-intersection",
  "g.architecture-service",
  ".commit",
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

export const MERMAID_HOVER_CSS = `
          /* ===== Mermaid hover 高亮（仅 opacity，不触发重排） ===== */
          @media (hover: hover) {
            ${transitionTargets} {
              transition: opacity ${TRANSITION_MS}ms ease-out;
            }

            /* 仅在指针确实落在图元上时淡出同类；掠过空白不触发 */
            ${dimTargets} {
              opacity: ${DIM_OPACITY};
            }
          }

          @media (prefers-reduced-motion: reduce) {
            ${transitionTargets} {
              transition: none;
            }
          }
        `;
