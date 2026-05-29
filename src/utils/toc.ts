import type { TocItem, TOCMeta } from "@/types";
import GithubSlugger from "github-slugger";

function stripInlineCode(line: string): string {
  return line.replace(/`[^`]*`/g, "");
}

function normalizeHeadingText(text: string): string {
  // 移除末尾的 # 符号
  const stripped = text.replace(/\s*#+\s*$/g, "").trim();

  // 移除 Markdown 链接格式，只保留链接文本
  // 匹配 [链接文本](链接地址) 格式
  const withoutLinks = stripped.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 匹配 [链接文本][引用] 格式
  const withoutReferenceLinks = withoutLinks.replace(
    /\[([^\]]+)\]\[[^\]]+\]/g,
    "$1",
  );

  // 匹配 [链接文本] 隐式引用格式
  const withoutImplicitLinks = withoutReferenceLinks.replace(
    /\[([^\]]+)\](?=\s|$)/g,
    "$1",
  );

  return withoutImplicitLinks.trim();
}

function isFenceStart(line: string): boolean {
  return /^\s{0,3}(```|~~~)/.test(line);
}

function isMathBlockDelimiter(line: string): boolean {
  const trimmed = line.trim();
  // $$ 或 \[ 或 \] 单独一行
  return /^\$\$/.test(trimmed) || trimmed === "\\[" || trimmed === "\\]";
}

function isSetextUnderline(line: string): 1 | 2 | null {
  const trimmed = line.trim();

  if (/^=+\s*$/.test(trimmed)) return 1;
  if (/^-+\s*$/.test(trimmed)) return 2;

  return null;
}

function isLikelyPlainTextHeading(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) return false;
  if (trimmed.length > 80) return false;

  // 排除列表正文中明显不是标题的情况
  if (/^[-*+]\s+/.test(trimmed)) return false;
  if (/^>\s+/.test(trimmed)) return false;
  if (/^\|.*\|$/.test(trimmed)) return false;

  return true;
}

function matchFallbackHeading(line: string): {
  level: number;
  text: string;
} | null {
  const trimmed = line.trim();

  if (!trimmed) return null;
  if (trimmed.length > 80) return null;

  // 第一章 标题 / 第 1 章 标题 / 第十二节 标题
  if (
    /^第\s*[一二三四五六七八九十百千万\d]+\s*[章节篇部卷]\s*.+/.test(trimmed)
  ) {
    return {
      level: 1,
      text: trimmed,
    };
  }

  // 一、标题 / 二、标题
  if (/^[一二三四五六七八九十]+[、.．]\s*.+/.test(trimmed)) {
    return {
      level: 2,
      text: trimmed,
    };
  }

  // （一）标题 / (一)标题
  if (/^[（(][一二三四五六七八九十]+[）)]\s*.+/.test(trimmed)) {
    return {
      level: 3,
      text: trimmed,
    };
  }

  // 1. 标题 / 1、标题
  if (/^\d+[.、．]\s*.+/.test(trimmed)) {
    return {
      level: 2,
      text: trimmed,
    };
  }

  // 1.1 标题 / 1.1.1 标题
  if (/^\d+(?:\.\d+)+\s+.+/.test(trimmed)) {
    return {
      level: 3,
      text: trimmed,
    };
  }

  return null;
}

export function extractTOC(markdown: string): {
  items: TocItem[];
  meta: TOCMeta;
} {
  const slugger = new GithubSlugger();
  const lines = markdown.split(/\r?\n/);
  const items: TocItem[] = [];

  let inFence = false;
  let inMathBlock = false;
  let frontmatterEndIndex = -1;

  // 跳过 frontmatter 区域
  if (lines.length > 0 && lines[0].trim() === "---") {
    for (let fi = 1; fi < lines.length; fi++) {
      if (lines[fi].trim() === "---") {
        frontmatterEndIndex = fi;
        break;
      }
    }
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    // 跳过 frontmatter 区域
    if (frontmatterEndIndex > 0 && lineIndex <= frontmatterEndIndex) {
      continue;
    }
    const rawLine = lines[lineIndex];

    if (isFenceStart(rawLine)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    // 跳过块级数学公式 $$...$$ 和 \[...\]
    if (isMathBlockDelimiter(rawLine)) {
      inMathBlock = !inMathBlock;
      continue;
    }

    if (inMathBlock) continue;

    const line = stripInlineCode(rawLine);

    // ATX heading:
    // # 标题
    // #标题
    // ## 标题 ##
    const atxMatch = /^\s{0,3}(#{1,6})\s*(.+?)\s*#*\s*$/.exec(line);

    if (atxMatch) {
      const level = atxMatch[1].length;
      const text = normalizeHeadingText(atxMatch[2]);

      if (!text) continue;

      items.push({
        id: slugger.slug(text),
        text,
        level,
        logicalOffset: lineIndex,
      });

      continue;
    }

    // Setext heading:
    // 标题
    // ===
    // 标题
    // ---
    const nextLine = lines[lineIndex + 1];

    if (nextLine !== undefined) {
      const setextLevel = isSetextUnderline(nextLine);

      if (setextLevel && isLikelyPlainTextHeading(line)) {
        const text = normalizeHeadingText(line);

        if (text) {
          items.push({
            id: slugger.slug(text),
            text,
            level: setextLevel,
            logicalOffset: lineIndex,
          });
        }

        lineIndex += 1;
      }
    }
  }

  // 如果没有任何 Markdown 标题，启用弱 fallback。
  // 注意：只有 items.length === 0 时才启用，避免污染正常 Markdown 文档。
  if (items.length === 0) {
    const fallbackSlugger = new GithubSlugger();
    let fallbackInFence = false;
    let fallbackInMathBlock = false;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      // 跳过 frontmatter 区域
      if (frontmatterEndIndex > 0 && lineIndex <= frontmatterEndIndex) {
        continue;
      }
      
      const rawLine = lines[lineIndex];

      if (isFenceStart(rawLine)) {
        fallbackInFence = !fallbackInFence;
        continue;
      }

      if (fallbackInFence) continue;

      if (isMathBlockDelimiter(rawLine)) {
        fallbackInMathBlock = !fallbackInMathBlock;
        continue;
      }

      if (fallbackInMathBlock) continue;

      const line = stripInlineCode(rawLine);
      const matched = matchFallbackHeading(line);

      if (!matched) continue;

      items.push({
        id: fallbackSlugger.slug(matched.text),
        text: matched.text,
        level: matched.level,
        logicalOffset: lineIndex,
      });
    }
  }

  return {
    items,
    meta: {
      totalLogicalLength: Math.max(lines.length, 1),
    },
  };
}
