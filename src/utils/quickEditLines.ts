/**
 * QuickEdit 共享工具：按行号精确定位 / 替换内容。
 *
 * 设计动机：字符串 `replace` 在以下场景不可靠：
 *   - 行尾 CRLF / LF 混用（Windows 文件被其他工具规范化）
 *   - ReactMarkdown 渲染后空白规范化
 *   - raw 中包含正则元字符需要转义
 *
 * 行号约定：与 `markdownBlocks.ts` 保持一致 —— 0-based，包含起止行。
 */

export interface LineRange {
  startLine: number;
  endLine: number;
}

/**
 * 把 `startLine|endLine|raw` 编码进 data-raw，让消费方能走行号定位。
 * 行号缺失时回退到纯 raw 编码。
 */
export function encodeBlockDataRaw(
  raw: string,
  startLine?: number,
  endLine?: number,
): string {
  if (typeof startLine === "number" && typeof endLine === "number") {
    return encodeURIComponent(`${startLine}|${endLine}|${raw}`);
  }
  return encodeURIComponent(raw);
}

/**
 * 解析 data-raw 中的行号前缀。
 *
 * @returns 行号范围 + raw；如未带前缀返回 null（消费方需自行降级到字符串 replace）。
 */
export function decodeBlockDataRaw(
  encoded: string,
): { startLine: number; endLine: number; raw: string } | null {
  try {
    const decoded = decodeURIComponent(encoded);
    const m = decoded.match(/^(\d+)\|(\d+)\|/);
    if (!m) return null;
    return {
      startLine: parseInt(m[1], 10),
      endLine: parseInt(m[2], 10),
      raw: decoded.slice(m[0].length),
    };
  } catch {
    return null;
  }
}

/**
 * 按行号精确替换内容。
 *
 * 行号越界时返回原 content（不修改），由调用方决定是否降级到字符串 replace。
 *
 * @param content 完整文档内容
 * @param range 行号范围（0-based，包含 endLine）
 * @param replacement 新内容（不含行号）
 * @returns 替换后的完整文档内容
 */
export function replaceLinesByRange(
  content: string,
  range: LineRange,
  replacement: string,
): string {
  const { startLine, endLine } = range;
  const lines = content.split("\n");
  if (startLine < 0 || endLine >= lines.length || startLine > endLine) {
    return content;
  }
  const before = lines.slice(0, startLine).join("\n");
  const after = lines.slice(endLine + 1).join("\n");
  return (
    before +
    (before.length > 0 ? "\n" : "") +
    replacement +
    (after.length > 0 ? "\n" + after : "")
  );
}
