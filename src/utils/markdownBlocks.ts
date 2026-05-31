import {
  DefaultReaderConfig,
  type ReaderPerformanceConfig,
} from "@/config/readerConfig";
import type { MarkdownBlock, VirtualTocItem } from "@/types/markdownBlock";
import GithubSlugger from "github-slugger";

// ── 最近一次结果缓存 ──────────────────────────────────

interface ParsedBlocks {
  blocks: MarkdownBlock[];
  tocItems: VirtualTocItem[];
  referenceDefinitions: string;
}

let lastInput: string | null = null;
let lastResult: ParsedBlocks | null = null;

// ── helpers ──────────────────────────────────────────────

function isFenceOpener(line: string): { opened: boolean; lang: string } {
  const trimmed = line.trim();
  const m = /^\s{0,3}(`{3,}|~{3,})/.exec(trimmed);
  if (!m) return { opened: false, lang: "" };
  const info = trimmed.slice(m[0].length).trim();
  return { opened: true, lang: info.toLowerCase() };
}

function isFenceCloser(line: string, openerChar: string): boolean {
  const trimmed = line.trim();
  if (openerChar === "`") return /^\s{0,3}`{3,}\s*$/.test(trimmed);
  return /^\s{0,3}~{3,}\s*$/.test(trimmed);
}

function isMathDelimiter(line: string): boolean {
  const trimmed = line.trim();
  // 匹配数学公式块的开始和结束分隔符：
  // - 开头是 $$（开始分隔符）
  // - 结尾是 $$（结束分隔符）
  // - 或者整行就是 \[ 或 \]
  return (
    /^\$\$/.test(trimmed) ||
    /\$\$$/.test(trimmed) ||
    trimmed === "\\[" ||
    trimmed === "\\]"
  );
}

function isSetextUnderline(line: string): 1 | 2 | null {
  const trimmed = line.trim();
  if (/^=+\s*$/.test(trimmed)) return 1;
  if (/^-+\s*$/.test(trimmed)) return 2;
  return null;
}

function isThematicBreak(line: string): boolean {
  const trimmed = line.trim();
  return /^\s{0,3}(\*{3,}|-{3,}|_{3,})\s*$/.test(trimmed);
}

function isBlockquoteStart(line: string): boolean {
  return /^\s{0,3}>/.test(line);
}

function isListStart(line: string): boolean {
  const trimmed = line.trim();
  if (/^[-*+]\s/.test(trimmed)) return true;
  if (/^\d+[.)]\s/.test(trimmed)) return true;
  return false;
}

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return /^\|/.test(trimmed) || /\|/.test(trimmed);
}

function isHtmlBlockStart(line: string): {
  isStart: boolean;
  tagName: string | null;
} {
  const trimmed = line.trim();
  const match = /^<([a-z][a-z0-9-]*)\b/i.exec(trimmed);
  if (match) {
    return { isStart: true, tagName: match[1].toLowerCase() };
  }
  return { isStart: false, tagName: null };
}

function isHtmlBlockEnd(line: string, tagName: string): boolean {
  const trimmed = line.trim();
  const endTagRegex = new RegExp(`</${tagName}\\s*>`, "i");
  return endTagRegex.test(trimmed);
}

function stripInlineCode(line: string): string {
  return line.replace(/`[^`]*`/g, "");
}

function stripMarkdownLinks(text: string): string {
  // 移除 Markdown 链接格式，只保留链接文本
  // 匹配 [链接文本](链接地址) 格式
  let result = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 匹配 [链接文本][引用] 格式
  result = result.replace(/\[([^\]]+)\]\[[^\]]+\]/g, "$1");

  // 匹配 [链接文本] 隐式引用格式
  result = result.replace(/\[([^\]]+)\](?=\s|$)/g, "$1");

  return result;
}

function isReferenceDefinition(line: string): boolean {
  const trimmed = line.trim();
  return /^\[([^\]]+)\]:\s+(\S+|<[^>]+>)/.test(trimmed);
}

function isAbbreviationDefinition(line: string): boolean {
  const trimmed = line.trim();
  return /^\*\[([^\]]+)\]:\s+/.test(trimmed);
}

export function parseMarkdownBlocks(markdown: string): {
  blocks: MarkdownBlock[];
  tocItems: VirtualTocItem[];
  referenceDefinitions: string;
} {
  if (typeof markdown !== "string") markdown = "";
  if (markdown === lastInput && lastResult !== null) return lastResult;

  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  const tocItems: VirtualTocItem[] = [];
  const slugger = new GithubSlugger();
  const refDefLines: string[] = [];

  let i = 0;

  if (lines.length > 0 && lines[0].trim() === "---") {
    let closeIdx = -1;
    for (let fi = 1; fi < lines.length; fi++) {
      if (lines[fi].trim() === "---") {
        closeIdx = fi;
        break;
      }
    }
    if (closeIdx > 0) {
      const fmLines = lines.slice(0, closeIdx + 1);
      const fmBlock: MarkdownBlock = {
        id: `frontmatter-0`,
        type: "frontmatter",
        raw: fmLines.join("\n"),
        startLine: 0,
        endLine: closeIdx,
      };
      blocks.push(fmBlock);
      i = closeIdx + 1;
    }
  }

  while (i < lines.length) {
    const rawLine = lines[i];

    if (rawLine.trim() === "") {
      blocks.push({
        id: `blank-${i}`,
        type: "blank",
        raw: rawLine,
        startLine: i,
        endLine: i,
      });
      i += 1;
      continue;
    }

    if (isMathDelimiter(rawLine)) {
      const startLine = i;
      const contentLines: string[] = [rawLine];

      i += 1;
      while (i < lines.length) {
        contentLines.push(lines[i]);
        if (isMathDelimiter(lines[i])) break;
        i += 1;
      }

      blocks.push({
        id: `math-${startLine}`,
        type: "math",
        raw: contentLines.join("\n"),
        startLine,
        endLine: i,
      });

      i += 1;
      continue;
    }

    const fence = isFenceOpener(rawLine);
    if (fence.opened) {
      const openerChar = fence.lang
        ? (rawLine.trim().match(/^(`{3,}|~{3,})/)?.[1]?.[0] ?? "`")
        : "`";
      const lang = fence.lang;
      const startLine = i;
      const contentLines: string[] = [rawLine];

      i += 1;
      while (i < lines.length) {
        contentLines.push(lines[i]);
        if (isFenceCloser(lines[i], openerChar)) break;
        i += 1;
      }

      const raw = contentLines.join("\n");
      const isMermaid = lang === "mermaid" || lang === "mmd";
      const isPlantUML = lang === "plantuml" || lang === "puml";
      let blockType: MarkdownBlock["type"] = "code";
      if (isMermaid) blockType = "mermaid";
      else if (isPlantUML) blockType = "plantuml";

      blocks.push({
        id: `code-${startLine}`,
        type: blockType,
        raw,
        startLine,
        endLine: i,
      });

      i += 1;
      continue;
    }

    if (isThematicBreak(rawLine)) {
      blocks.push({
        id: `hr-${i}`,
        type: "thematicBreak",
        raw: rawLine,
        startLine: i,
        endLine: i,
      });
      i += 1;
      continue;
    }

    const stripped = stripInlineCode(rawLine);
    const atxMatch = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(stripped);
    if (atxMatch) {
      const level = atxMatch[1].length;
      const rawText = atxMatch[2].trim();
      const cleanText = stripMarkdownLinks(rawText);
      const id = slugger.slug(cleanText);
      const blockIndex = blocks.length;

      blocks.push({
        id: `heading-${i}`,
        type: "heading",
        raw: rawLine,
        startLine: i,
        endLine: i,
        headingLevel: level,
        headingText: cleanText,
        tocId: id,
      });

      if (level >= 1 && level <= 6) {
        tocItems.push({
          id,
          text: cleanText,
          level,
          blockIndex,
          startLine: i,
        });
      }

      i += 1;
      continue;
    }

    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const setextLevel = isSetextUnderline(nextLine);

      if (setextLevel && rawLine.trim().length > 0) {
        const rawText = rawLine.trim();
        const cleanText = stripMarkdownLinks(rawText);
        const id = slugger.slug(cleanText);
        const blockIndex = blocks.length;

        blocks.push({
          id: `heading-${i}`,
          type: "heading",
          raw: rawLine + "\n" + nextLine,
          startLine: i,
          endLine: i + 1,
          headingLevel: setextLevel,
          headingText: cleanText,
          tocId: id,
        });

        if (setextLevel >= 1 && setextLevel <= 3) {
          tocItems.push({
            id,
            text: cleanText,
            level: setextLevel,
            blockIndex,
            startLine: i,
          });
        }

        i += 2;
        continue;
      }
    }

    if (isTableLine(rawLine)) {
      const startLine = i;
      const contentLines: string[] = [rawLine];

      i += 1;
      while (i < lines.length) {
        const next = lines[i];
        if (next.trim() === "" || !isTableLine(next)) break;
        contentLines.push(next);
        i += 1;
      }

      blocks.push({
        id: `table-${startLine}`,
        type: "table",
        raw: contentLines.join("\n"),
        startLine,
        endLine: i - 1,
      });
      continue;
    }

    if (isBlockquoteStart(rawLine)) {
      const startLine = i;
      const contentLines: string[] = [rawLine];

      i += 1;
      while (i < lines.length) {
        const next = lines[i];
        if (next.trim() === "") {
          if (i + 1 < lines.length && isBlockquoteStart(lines[i + 1])) {
            contentLines.push(next);
            i += 1;
            continue;
          }
          break;
        }
        if (!isBlockquoteStart(next) && !/^\s*$/.test(next)) break;
        contentLines.push(next);
        i += 1;
      }

      blocks.push({
        id: `blockquote-${startLine}`,
        type: "blockquote",
        raw: contentLines.join("\n"),
        startLine,
        endLine: i - 1,
      });
      continue;
    }

    if (isListStart(rawLine)) {
      const startLine = i;
      const contentLines: string[] = [rawLine];

      i += 1;
      while (i < lines.length) {
        const next = lines[i];
        if (next.trim() === "") {
          if (i + 1 < lines.length) {
            const after = lines[i + 1];
            if (/^\s{2,}/.test(after) || isListStart(after)) {
              contentLines.push(next);
              i += 1;
              continue;
            }
          }
          break;
        }
        if (/^\s{2,}/.test(next)) {
          contentLines.push(next);
          i += 1;
          continue;
        }
        if (isListStart(next)) {
          contentLines.push(next);
          i += 1;
          continue;
        }
        break;
      }

      blocks.push({
        id: `list-${startLine}`,
        type: "list",
        raw: contentLines.join("\n"),
        startLine,
        endLine: i - 1,
      });
      continue;
    }

    const htmlStart = isHtmlBlockStart(rawLine);
    if (htmlStart.isStart) {
      const startLine = i;
      const contentLines: string[] = [rawLine];
      const tagName = htmlStart.tagName;
      let foundEnd = false;

      const isSelfClosing =
        /\/>$/.test(rawLine.trim()) ||
        ["br", "hr", "img", "input", "meta", "link"].includes(tagName || "");

      i += 1;

      if (!isSelfClosing && tagName) {
        while (i < lines.length) {
          const next = lines[i];
          contentLines.push(next);

          if (isHtmlBlockEnd(next, tagName)) {
            foundEnd = true;
            i += 1;
            break;
          } else {
            i += 1;
          }
        }
      }

      if (!foundEnd && !isSelfClosing) {
        i = startLine + 1;
        contentLines.length = 1;

        while (i < lines.length) {
          const next = lines[i];
          if (next.trim() === "") break;
          contentLines.push(next);
          i += 1;
        }
      }

      blocks.push({
        id: `html-${startLine}`,
        type: "html",
        raw: contentLines.join("\n"),
        startLine,
        endLine: i - 1,
      });
      continue;
    }

    if (isReferenceDefinition(rawLine) || isAbbreviationDefinition(rawLine)) {
      refDefLines.push(rawLine);
      i += 1;
      while (
        i < lines.length &&
        (isReferenceDefinition(lines[i]) || isAbbreviationDefinition(lines[i]))
      ) {
        refDefLines.push(lines[i]);
        i += 1;
      }
      continue;
    }

    {
      const startLine = i;
      const contentLines: string[] = [rawLine];

      i += 1;
      while (i < lines.length) {
        const next = lines[i];
        if (next.trim() === "") break;
        if (
          isFenceOpener(next).opened ||
          isThematicBreak(next) ||
          /^\s{0,3}#{1,6}\s/.test(stripInlineCode(next))
        ) {
          break;
        }
        contentLines.push(next);
        i += 1;
      }

      blocks.push({
        id: `paragraph-${startLine}`,
        type: "paragraph",
        raw: contentLines.join("\n"),
        startLine,
        endLine: i - 1,
      });
    }
  }

  const result = {
    blocks,
    tocItems,
    referenceDefinitions: refDefLines.join("\n"),
  };
  lastInput = markdown;
  lastResult = result;
  return result;
}

const CHUNK_PARSE_CACHE = new Map<string, MarkdownBlock[]>();

function buildChunkCacheKey(
  lines: string[],
  startLine: number,
  endLine: number,
): string {
  const firstLine = lines[startLine] ?? "";
  const lastLine = lines[endLine] ?? "";
  return `${startLine}-${endLine}:${firstLine.length}:${lastLine.length}`;
}

function parseChunk(
  lines: string[],
  startLine: number,
  endLine: number,
  slugger: GithubSlugger,
  baseBlockIndex: number,
): {
  blocks: MarkdownBlock[];
  tocItems: VirtualTocItem[];
  refDefLines: string[];
  nextLine: number;
} {
  const cacheKey = buildChunkCacheKey(lines, startLine, endLine);
  const cached = CHUNK_PARSE_CACHE.get(cacheKey);
  if (cached) {
    const tocItems: VirtualTocItem[] = [];
    const refDefLines: string[] = [];
    cached.forEach((block, idx) => {
      if (block.type === "heading" && block.tocId) {
        tocItems.push({
          id: block.tocId,
          text: block.headingText ?? "",
          level: block.headingLevel ?? 1,
          blockIndex: baseBlockIndex + idx,
          startLine: block.startLine,
        });
      }
    });
    return { blocks: cached, tocItems, refDefLines, nextLine: endLine + 1 };
  }

  const blocks: MarkdownBlock[] = [];
  const tocItems: VirtualTocItem[] = [];
  const refDefs: string[] = [];

  let i = startLine;

  if (startLine === 0 && lines.length > 0 && lines[0].trim() === "---") {
    let closeIdx = -1;
    for (let fi = 1; fi <= endLine && fi < lines.length; fi++) {
      if (lines[fi].trim() === "---") {
        closeIdx = fi;
        break;
      }
    }
    if (closeIdx > 0) {
      const fmLines = lines.slice(0, closeIdx + 1);
      const fmBlock: MarkdownBlock = {
        id: `frontmatter-0`,
        type: "frontmatter",
        raw: fmLines.join("\n"),
        startLine: 0,
        endLine: closeIdx,
      };
      blocks.push(fmBlock);
      i = closeIdx + 1;
    }
  }

  while (i <= endLine && i < lines.length) {
    const rawLine = lines[i];

    if (rawLine.trim() === "") {
      blocks.push({
        id: `blank-${i}`,
        type: "blank",
        raw: rawLine,
        startLine: i,
        endLine: i,
      });
      i += 1;
      continue;
    }

    if (isMathDelimiter(rawLine)) {
      const start = i;
      const contentLines: string[] = [rawLine];

      i += 1;
      while (i <= endLine && i < lines.length) {
        contentLines.push(lines[i]);
        if (isMathDelimiter(lines[i])) break;
        i += 1;
      }

      blocks.push({
        id: `math-${start}`,
        type: "math",
        raw: contentLines.join("\n"),
        startLine: start,
        endLine: i,
      });

      i += 1;
      continue;
    }

    const fence = isFenceOpener(rawLine);
    if (fence.opened) {
      const openerChar = fence.lang
        ? (rawLine.trim().match(/^(`{3,}|~{3,})/)?.[1]?.[0] ?? "`")
        : "`";
      const lang = fence.lang;
      const start = i;
      const contentLines: string[] = [rawLine];

      i += 1;
      while (i <= endLine && i < lines.length) {
        contentLines.push(lines[i]);
        if (isFenceCloser(lines[i], openerChar)) break;
        i += 1;
      }

      const raw = contentLines.join("\n");
      const isMermaid = lang === "mermaid" || lang === "mmd";
      const isPlantUML = lang === "plantuml" || lang === "puml";
      let blockType: MarkdownBlock["type"] = "code";
      if (isMermaid) blockType = "mermaid";
      else if (isPlantUML) blockType = "plantuml";

      blocks.push({
        id: `code-${start}`,
        type: blockType,
        raw,
        startLine: start,
        endLine: i,
      });

      i += 1;
      continue;
    }

    if (isThematicBreak(rawLine)) {
      blocks.push({
        id: `hr-${i}`,
        type: "thematicBreak",
        raw: rawLine,
        startLine: i,
        endLine: i,
      });
      i += 1;
      continue;
    }

    const stripped = stripInlineCode(rawLine);
    const atxMatch = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(stripped);
    if (atxMatch) {
      const level = atxMatch[1].length;
      const rawText = atxMatch[2].trim();
      const cleanText = stripMarkdownLinks(rawText);
      const id = slugger.slug(cleanText);
      const blockIndex = baseBlockIndex + blocks.length;

      blocks.push({
        id: `heading-${i}`,
        type: "heading",
        raw: rawLine,
        startLine: i,
        endLine: i,
        headingLevel: level,
        headingText: cleanText,
        tocId: id,
      });

      if (level >= 1 && level <= 6) {
        tocItems.push({
          id,
          text: cleanText,
          level,
          blockIndex,
          startLine: i,
        });
      }

      i += 1;
      continue;
    }

    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const setextLevel = isSetextUnderline(nextLine);

      if (setextLevel && rawLine.trim().length > 0) {
        const rawText = rawLine.trim();
        const cleanText = stripMarkdownLinks(rawText);
        const id = slugger.slug(cleanText);
        const blockIndex = baseBlockIndex + blocks.length;

        blocks.push({
          id: `heading-${i}`,
          type: "heading",
          raw: rawLine + "\n" + nextLine,
          startLine: i,
          endLine: i + 1,
          headingLevel: setextLevel,
          headingText: cleanText,
          tocId: id,
        });

        if (setextLevel >= 1 && setextLevel <= 3) {
          tocItems.push({
            id,
            text: cleanText,
            level: setextLevel,
            blockIndex,
            startLine: i,
          });
        }

        i += 2;
        continue;
      }
    }

    if (isTableLine(rawLine)) {
      const start = i;
      const contentLines: string[] = [rawLine];

      i += 1;
      while (i <= endLine && i < lines.length) {
        const next = lines[i];
        if (next.trim() === "" || !isTableLine(next)) break;
        contentLines.push(next);
        i += 1;
      }

      blocks.push({
        id: `table-${start}`,
        type: "table",
        raw: contentLines.join("\n"),
        startLine: start,
        endLine: i - 1,
      });
      continue;
    }

    if (isBlockquoteStart(rawLine)) {
      const start = i;
      const contentLines: string[] = [rawLine];

      i += 1;
      while (i <= endLine && i < lines.length) {
        const next = lines[i];
        if (next.trim() === "") {
          if (i + 1 < lines.length && isBlockquoteStart(lines[i + 1])) {
            contentLines.push(next);
            i += 1;
            continue;
          }
          break;
        }
        if (!isBlockquoteStart(next) && !/^\s*$/.test(next)) break;
        contentLines.push(next);
        i += 1;
      }

      blocks.push({
        id: `blockquote-${start}`,
        type: "blockquote",
        raw: contentLines.join("\n"),
        startLine: start,
        endLine: i - 1,
      });
      continue;
    }

    if (isListStart(rawLine)) {
      const start = i;
      const contentLines: string[] = [rawLine];

      i += 1;
      while (i <= endLine && i < lines.length) {
        const next = lines[i];
        if (next.trim() === "") {
          if (i + 1 < lines.length) {
            const after = lines[i + 1];
            if (/^\s{2,}/.test(after) || isListStart(after)) {
              contentLines.push(next);
              i += 1;
              continue;
            }
          }
          break;
        }
        if (/^\s{2,}/.test(next)) {
          contentLines.push(next);
          i += 1;
          continue;
        }
        if (isListStart(next)) {
          contentLines.push(next);
          i += 1;
          continue;
        }
        break;
      }

      blocks.push({
        id: `list-${start}`,
        type: "list",
        raw: contentLines.join("\n"),
        startLine: start,
        endLine: i - 1,
      });
      continue;
    }

    const htmlStart = isHtmlBlockStart(rawLine);
    if (htmlStart.isStart) {
      const start = i;
      const contentLines: string[] = [rawLine];
      const tagName = htmlStart.tagName;
      let foundEnd = false;

      const isSelfClosing =
        /\/>$/.test(rawLine.trim()) ||
        ["br", "hr", "img", "input", "meta", "link"].includes(tagName || "");

      i += 1;

      if (!isSelfClosing && tagName) {
        while (i <= endLine && i < lines.length) {
          const next = lines[i];
          contentLines.push(next);

          if (isHtmlBlockEnd(next, tagName)) {
            foundEnd = true;
            i += 1;
            break;
          } else {
            i += 1;
          }
        }
      }

      if (!foundEnd && !isSelfClosing) {
        i = start + 1;
        contentLines.length = 1;

        while (i <= endLine && i < lines.length) {
          const next = lines[i];
          if (next.trim() === "") break;
          contentLines.push(next);
          i += 1;
        }
      }

      blocks.push({
        id: `html-${start}`,
        type: "html",
        raw: contentLines.join("\n"),
        startLine: start,
        endLine: i - 1,
      });
      continue;
    }

    if (isReferenceDefinition(rawLine) || isAbbreviationDefinition(rawLine)) {
      refDefs.push(rawLine);
      i += 1;
      while (
        i <= endLine &&
        i < lines.length &&
        (isReferenceDefinition(lines[i]) || isAbbreviationDefinition(lines[i]))
      ) {
        refDefs.push(lines[i]);
        i += 1;
      }
      continue;
    }

    {
      const start = i;
      const contentLines: string[] = [rawLine];

      i += 1;
      while (i <= endLine && i < lines.length) {
        const next = lines[i];
        if (next.trim() === "") break;
        if (
          isFenceOpener(next).opened ||
          isThematicBreak(next) ||
          /^\s{0,3}#{1,6}\s/.test(stripInlineCode(next))
        ) {
          break;
        }
        contentLines.push(next);
        i += 1;
      }

      blocks.push({
        id: `paragraph-${start}`,
        type: "paragraph",
        raw: contentLines.join("\n"),
        startLine: start,
        endLine: i - 1,
      });
    }
  }

  CHUNK_PARSE_CACHE.set(cacheKey, blocks);

  return { blocks, tocItems, refDefLines: refDefs, nextLine: i };
}

export function parseMarkdownBlocksChunked(
  markdown: string,
  options?: {
    initialLines?: number;
    chunkSize?: number;
    performanceConfig?: ReaderPerformanceConfig;
  },
): {
  lines: string[];
  initialBlocks: MarkdownBlock[];
  initialTocItems: VirtualTocItem[];
  referenceDefinitions: string;
  parseNextChunk: (currentBlockCount: number) => {
    blocks: MarkdownBlock[];
    tocItems: VirtualTocItem[];
    refDefLines: string[];
    done: boolean;
  };
  totalLines: number;
} {
  if (typeof markdown !== "string") markdown = "";
  const lines = markdown.split(/\r?\n/);
  const totalLines = lines.length;
  const config = options?.performanceConfig ?? DefaultReaderConfig.performance;
  const initialLinesCount = options?.initialLines ?? config.initialParseLines;
  const chunkSize = options?.chunkSize ?? config.chunkSize;

  const slugger = new GithubSlugger();

  const initialEndLine = Math.min(initialLinesCount, totalLines) - 1;
  const {
    blocks: initialBlocks,
    tocItems: initialTocItems,
    refDefLines,
  } = parseChunk(lines, 0, initialEndLine, slugger, 0);

  let currentParseLine = initialEndLine + 1;
  const accumulatedSlugger = slugger;

  const parseNextChunk = (currentBlockCount: number) => {
    if (currentParseLine >= totalLines) {
      return {
        blocks: [],
        tocItems: [],
        refDefLines: [],
        done: true,
      };
    }

    const endLine = Math.min(currentParseLine + chunkSize - 1, totalLines - 1);

    const {
      blocks,
      tocItems,
      refDefLines: chunkRefDefs,
      nextLine,
    } = parseChunk(
      lines,
      currentParseLine,
      endLine,
      accumulatedSlugger,
      currentBlockCount,
    );

    currentParseLine = nextLine;

    return {
      blocks,
      tocItems,
      refDefLines: chunkRefDefs,
      done: currentParseLine >= totalLines,
    };
  };

  return {
    lines,
    initialBlocks: initialBlocks,
    initialTocItems: initialTocItems,
    referenceDefinitions: refDefLines.join("\n"),
    parseNextChunk,
    totalLines,
  };
}
