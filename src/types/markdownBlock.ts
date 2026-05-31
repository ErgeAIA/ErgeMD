export type MarkdownBlockType =
  | "heading"
  | "paragraph"
  | "blockquote"
  | "list"
  | "code"
  | "mermaid"
  | "plantuml"
  | "table"
  | "html"
  | "thematicBreak"
  | "blank"
  | "math"
  | "frontmatter";

export interface MarkdownBlock {
  id: string;
  type: MarkdownBlockType;
  raw: string;
  startLine: number;
  endLine: number;
  headingLevel?: number;
  headingText?: string;
  tocId?: string;
}

export interface VirtualTocItem {
  id: string;
  text: string;
  level: number;
  blockIndex: number;
  startLine: number;
}
