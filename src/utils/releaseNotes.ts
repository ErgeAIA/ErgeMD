// release body（Keep a Changelog 风格 markdown）→「分类 + 条目标题」纯文本摘要。
// 输出全部为纯文本，由 React 转义渲染，天然免疫注入，无需消毒层。

export interface ReleaseNoteGroup {
  category: string;
  items: string[];
}

export function parseReleaseNotes(body: string): ReleaseNoteGroup[] {
  const groups: ReleaseNoteGroup[] = [];
  let current: ReleaseNoteGroup | null = null;

  for (const rawLine of (body ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();

    const heading = /^#{2,4}\s+(.+)$/.exec(line);
    if (heading) {
      current = { category: stripMd(heading[1]), items: [] };
      groups.push(current);
      continue;
    }

    if (!current) continue;
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (!item) continue;
    if (item[1].startsWith("![")) continue; // 跳过图片条目

    const title = extractTitle(item[1]);
    if (title) current.items.push(title);
  }

  return groups.filter((g) => g.items.length > 0);
}

// 取条目「**标题**：描述」的标题部分；无粗体时剥语法取全文（超长截断）
function extractTitle(text: string): string {
  const bold = /^\*\*(.+?)\*\*/.exec(text);
  if (bold) return stripMd(bold[1]).trim();
  const plain = stripMd(text).trim();
  return plain.length > 80 ? `${plain.slice(0, 77)}…` : plain;
}

function stripMd(s: string): string {
  return s
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim();
}

// ISO 8601 → YYYY-MM-DD；无效输入返回空串
export function formatReleaseDate(iso: string): string {
  if (!iso) return "";
  const date = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}
