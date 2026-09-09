import DOMPurify from "dompurify";

// SVG 来自 mermaid/plantuml/本地 .svg 文件，统一过 DOMPurify 再进 dangerouslySetInnerHTML
// mermaid htmlLabels 用 <foreignObject> 包裹文字，默认 profile 会把整个
// foreignObject 剥掉，必须 ADD_TAGS 放行；内部 div/span/p 属默认允许的 HTML 标签
export function sanitizeSvg(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["foreignObject"],
    ADD_ATTR: ["xmlns"],
  });
}
