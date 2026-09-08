import DOMPurify from "dompurify";

// SVG 来自 mermaid/plantuml/本地 .svg 文件，统一过 DOMPurify 再进 dangerouslySetInnerHTML
// 用默认 profile（html+svg+mathml）以保留 foreignObject 内的 htmlLabels
export function sanitizeSvg(html: string): string {
  return DOMPurify.sanitize(html);
}
