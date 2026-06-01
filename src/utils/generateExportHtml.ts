import { parseMarkdownBlocks } from "./markdownBlocks";
import { renderMermaidForExport } from "@/components/reader/MermaidDiagram";
import { renderPlantUmlForExport } from "@/components/reader/PlantUMLDiagram";

export interface ExportHtmlOptions {
  grayscale?: boolean;
  fontSize?: number;
}

const CSS_VARIABLE_NAMES = [
  "bg-page", "bg-reader", "bg-code",
  "text-primary", "text-secondary", "text-muted", "text-heading",
  "h2-color", "h3-color", "h4-color",
  "accent-cyan", "accent-pink", "accent-purple", "accent-green",
  "accent-yellow", "accent-orange", "accent-red",
  "divider", "hover-bg",
];

const GRAYSCALE_OVERRIDES: Record<string, string> = {
  "bg-page": "#ffffff", "bg-reader": "#ffffff", "bg-code": "#f5f5f5",
  "text-primary": "#1a1a1a", "text-secondary": "#4a4a4a",
  "text-muted": "#808080", "text-heading": "#000000",
  "h2-color": "#1a1a1a", "h3-color": "#1a1a1a", "h4-color": "#1a1a1a",
  "accent-cyan": "#0066cc", "accent-pink": "#cc3366",
  "accent-purple": "#6633cc", "accent-green": "#2d7d46",
  "accent-yellow": "#998800", "accent-orange": "#cc6600",
  "accent-red": "#cc3333", "divider": "#cccccc", "hover-bg": "#e8e8e8",
};

function collectCssVariables(grayscale: boolean): Record<string, string> {
  const computedStyle = getComputedStyle(document.documentElement);
  const result: Record<string, string> = {};
  for (const name of CSS_VARIABLE_NAMES) {
    result[name] = grayscale
      ? (GRAYSCALE_OVERRIDES[name] ?? "#888888")
      : computedStyle.getPropertyValue(`--${name}`).trim();
  }
  return result;
}

function escapeForHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInlineMarkdown(text: string): string {
  const rawEscaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  let html = rawEscaped;

  html = html.replace(/\\(\[!\w+\])/g, "$1");

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
    return `<img alt="${escapeForHtml(unescapeHtml(alt))}" src="${escapeForHtml(unescapeHtml(src))}">`;
  });

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, linkText, href) => {
    return `<a href="${escapeForHtml(unescapeHtml(href))}">${escapeForHtml(unescapeHtml(linkText))}</a>`;
  });

  html = html.replace(/===\s*(.+?)\s*===/g, "<mark>$1</mark>");
  html = html.replace(/==([^=\n]+)==/g, "<mark>$1</mark>");

  html = html.replace(/\^([^\^]+)\^/g, "<sup>$1</sup>");

  html = html.replace(/~([^~\n]+)~/g, "<sub>$1</sub>");

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  html = html.replace(/&lt;kbd&gt;(.+?)&lt;\/kbd&gt;/g, "<kbd>$1</kbd>");
  html = html.replace(/&lt;mark&gt;(.+?)&lt;\/mark&gt;/g, "<mark>$1</mark>");
  html = html.replace(/&lt;samp&gt;(.+?)&lt;\/samp&gt;/g, "<samp>$1</samp>");
  html = html.replace(/&lt;strong&gt;(.+?)&lt;\/strong&gt;/g, "<strong>$1</strong>");
  html = html.replace(/&lt;em&gt;(.+?)&lt;\/em&gt;/g, "<em>$1</em>");
  html = html.replace(/&lt;code&gt;(.+?)&lt;\/code&gt;/g, "<code>$1</code>");
  html = html.replace(/&lt;del&gt;(.+?)&lt;\/del&gt;/g, "<del>$1</del>");
  html = html.replace(/&lt;a([^>]*)&gt;(.+?)&lt;\/a&gt;/g, "<a$1>$2</a>");
  html = html.replace(/&lt;img([^>]*)&gt;/g, "<img$1>");

  return html;
}

async function renderMermaidToSvg(code: string): Promise<string> {
  const svg = await renderMermaidForExport(code);
  if (svg) return svg;
  return `<pre style="background:#f5f5f5;padding:1em;border-radius:8px;overflow-x:auto;"><code>${escapeHtml(code)}</code></pre>`;
}

async function renderMathToHtml(raw: string): Promise<string> {
  try {
    const katex = await import("katex");
    let displayMath = raw.trim();
    if (displayMath.startsWith("$$")) {
      displayMath = displayMath.slice(2);
    }
    if (displayMath.endsWith("$$")) {
      displayMath = displayMath.slice(0, -2);
    }
    if (displayMath.startsWith("\\[")) {
      displayMath = displayMath.slice(2);
    }
    if (displayMath.endsWith("\\]")) {
      displayMath = displayMath.slice(0, -2);
    }
    displayMath = displayMath.trim();
    const html = katex.default.renderToString(displayMath, {
      displayMode: true,
      throwOnError: false,
    });
    return `<div class="math-block">${html}</div>`;
  } catch (err) {
    console.error("KaTeX render failed for export:", err);
    return `<div class="math-block"><pre>${escapeHtml(raw)}</pre></div>`;
  }
}

const CALLOUT_TYPE_MAP: Record<string, { title: string; color: string }> = {
  note: { title: "Note", color: "#448aff" },
  abstract: { title: "Abstract", color: "#00b0ff" },
  summary: { title: "Abstract", color: "#00b0ff" },
  tldr: { title: "Abstract", color: "#00b0ff" },
  info: { title: "Info", color: "#00b8d4" },
  todo: { title: "Todo", color: "#00b8d4" },
  tip: { title: "Tip", color: "#00bfa5" },
  hint: { title: "Tip", color: "#00bfa5" },
  important: { title: "Important", color: "#00bfa5" },
  success: { title: "Success", color: "#00c853" },
  check: { title: "Success", color: "#00c853" },
  done: { title: "Success", color: "#00c853" },
  question: { title: "Question", color: "#64dd17" },
  help: { title: "Question", color: "#64dd17" },
  faq: { title: "Question", color: "#64dd17" },
  warning: { title: "Warning", color: "#ff9100" },
  caution: { title: "Caution", color: "#ff9100" },
  attention: { title: "Attention", color: "#ff9100" },
  failure: { title: "Failure", color: "#ff5252" },
  fail: { title: "Failure", color: "#ff5252" },
  missing: { title: "Failure", color: "#ff5252" },
  danger: { title: "Danger", color: "#ff1744" },
  error: { title: "Error", color: "#ff1744" },
  bug: { title: "Bug", color: "#f50057" },
  example: { title: "Example", color: "#7c4dff" },
  quote: { title: "Quote", color: "#9e9e9e" },
  cite: { title: "Quote", color: "#9e9e9e" },
};

function parseCalloutHeader(headerText: string): { type: string; title: string | null } {
  const match = headerText.match(/^\\?\[!(\w+)\]([+-]?)(.*)/);
  if (!match) {
    return { type: "note", title: null };
  }
  const type = match[1].toLowerCase();
  const restTitle = match[3].trim();
  const mapped = CALLOUT_TYPE_MAP[type];
  return {
    type: mapped ? type : "note",
    title: restTitle || null,
  };
}

function isCallout(raw: string): boolean {
  const lines = raw.split("\n");
  const firstLine = lines[0]?.replace(/^>\s*/, "").trim();
  return /^\\?\[!\w+\]/.test(firstLine || "");
}

function renderCalloutToHtml(raw: string): string {
  const lines = raw.split("\n");
  const groups: string[][] = [];
  let currentGroup: string[] = [];

  for (const line of lines) {
    const stripped = line.replace(/^>\s*/, "").trim();
    if (/^\\?\[!\w+\]/.test(stripped)) {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [stripped];
    } else {
      currentGroup.push(stripped);
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  return groups.map((group) => {
    const firstLine = group[0] || "";
    const { type, title } = parseCalloutHeader(firstLine);
    const typeDef = CALLOUT_TYPE_MAP[type] || CALLOUT_TYPE_MAP["note"]!;
    const displayTitle = title ?? typeDef.title;
    const bodyLines = group.slice(1).filter(Boolean);
    const bodyHtml = bodyLines.map((line) => `<p>${renderInlineMarkdown(line)}</p>`).join("");
    return `<div style="border-left:4px solid ${typeDef.color};background:${typeDef.color}14;padding:0.75em 1em;margin:1em 0;border-radius:0 4px 4px 0;"><div style="font-weight:600;color:${typeDef.color};margin-bottom:0.5em;">${displayTitle}</div><div style="color:var(--text-secondary);font-style:italic;">${bodyHtml}</div></div>`;
  }).join("");
}

async function renderBlockToHtml(
  block: ReturnType<typeof parseMarkdownBlocks>["blocks"][0],
): Promise<string> {
  const raw = block.raw;

  switch (block.type) {
    case "blank":
      return "";

    case "heading": {
      const level = block.headingLevel ?? 1;
      const content = raw.replace(/^\s{0,3}#{1,6}\s*/, "").replace(/\s*#+\s*$/, "").trim();
      const id = block.tocId || "";
      return `<h${level}${id ? ` id="${id}"` : ""}>${renderInlineMarkdown(content)}</h${level}>`;
    }

    case "mermaid": {
      const code = raw.split("\n").slice(1, -1).join("\n").trim();
      return await renderMermaidToSvg(code);
    }

    case "plantuml": {
      const code = raw.split("\n").slice(1, -1).join("\n").trim();
      return await renderPlantUmlForExport(code);
    }

    case "math":
      return await renderMathToHtml(raw);

    case "frontmatter":
      return "";

    case "thematicBreak":
      return '<hr style="margin: 2em 0; border: none; border-top: 1px solid var(--divider);">';

    case "code": {
      const lines = raw.split("\n");
      const langMatch = lines[0].match(/^```(\w+)?/);
      const lang = langMatch?.[1] || "";
      const code = lines.slice(1, -1).join("\n");
      return `<pre><code${lang ? ` class="language-${lang}"` : ""}>${escapeHtml(code)}</code></pre>`;
    }

    case "table": {
      const lines = raw.split("\n").filter(l => l.trim());
      if (lines.length < 2) return `<p>${renderInlineMarkdown(raw)}</p>`;
      const headerCells = lines[0].split("|").map(c => c.trim()).filter(c => c);
      const bodyRows = lines.slice(2);
      let html = "<table><thead><tr>";
      headerCells.forEach(cell => {
        html += `<th>${renderInlineMarkdown(cell)}</th>`;
      });
      html += "</tr></thead><tbody>";
      bodyRows.forEach(row => {
        const cells = row.split("|").map(c => c.trim()).filter(c => c);
        html += "<tr>";
        cells.forEach(cell => {
          html += `<td>${renderInlineMarkdown(cell)}</td>`;
        });
        html += "</tr>";
      });
      html += "</tbody></table>";
      return html;
    }

    case "blockquote": {
      if (isCallout(raw)) {
        return renderCalloutToHtml(raw);
      }
      const content = raw.replace(/^>\s?/gm, "").trim();
      const lines = content.split("\n");
      const rendered = lines.map(line => renderInlineMarkdown(line)).join("<br>");
      return `<blockquote>${rendered}</blockquote>`;
    }

    case "list": {
      const lines = raw.split("\n");
      const isOrdered = /^\s*\d+[.)]\s/.test(lines[0]);
      const items: string[] = [];
      let currentItem = "";
      lines.forEach(line => {
        const trimmed = line.trim();
        if (/^\s*[-*+]\s/.test(trimmed) || /^\s*\d+[.)]\s/.test(trimmed)) {
          if (currentItem) items.push(currentItem);
          currentItem = trimmed.replace(/^\s*[-*+\d.)]+\s/, "");
        } else if (trimmed) {
          currentItem += " " + trimmed;
        }
      });
      if (currentItem) items.push(currentItem);
      const tag = isOrdered ? "ol" : "ul";
      return `<${tag}>${items.map(item => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${tag}>`;
    }

    case "html":
      return raw;

    case "paragraph":
    default: {
      if (raw.startsWith(">")) {
        const content = raw.replace(/^>\s?/gm, "").trim();
        if (isCallout(raw)) {
          return renderCalloutToHtml(raw);
        }
        return `<blockquote>${renderInlineMarkdown(content)}</blockquote>`;
      }
      const lines = raw.split("\n");
      if (lines.every(l => /^\s*[-*+]\s/.test(l.trim()) || l.trim() === "")) {
        const items = lines.filter(l => l.trim()).map(l => l.trim().replace(/^\s*[-*+]\s/, ""));
        return `<ul>${items.map(item => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`;
      }
      if (lines.every(l => /^\s*\d+[.)]\s/.test(l.trim()) || l.trim() === "")) {
        const items = lines.filter(l => l.trim()).map(l => l.trim().replace(/^\s*\d+[.)]\s/, ""));
        return `<ol>${items.map(item => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ol>`;
      }
      return raw.split("\n").map(line => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        return `<p>${renderInlineMarkdown(trimmed)}</p>`;
      }).filter(Boolean).join("");
    }
  }
}

function buildKatexCssLink(): string {
  return `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">`;
}

export async function generateExportHtml(
  content: string,
  options: ExportHtmlOptions = {},
): Promise<string> {
  const { grayscale = false, fontSize = 16 } = options;

  const { blocks } = parseMarkdownBlocks(content);
  const cssVariables = collectCssVariables(grayscale);

  const cssVarsString = CSS_VARIABLE_NAMES.map((name) => `    --${name}: ${cssVariables[name]};`).join("\n");

  const bodyHtmlParts = await Promise.all(
    blocks.map((block) => renderBlockToHtml(block)),
  );
  const bodyHtml = bodyHtmlParts.filter(Boolean).join("\n");

  const hasMath = blocks.some(b => b.type === "math");
  const katexCssLink = hasMath ? buildKatexCssLink() : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ErgeMD Export</title>
  <style>
  @page { size: A4; margin: 15mm 20mm; }
  :root {
${cssVarsString}
  }
  *, *::before, *::after {
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  html, body {
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif;
    font-size: ${fontSize}px;
    background-color: var(--bg-page) !important;
    color: var(--text-primary) !important;
    line-height: 1.8;
    width: 100%;
    margin: 0;
    padding: 0;
  }
  pre {
    background: var(--bg-code);
    border-radius: 8px;
    padding: 1em;
    font-size: 0.9em;
    line-height: 1.6;
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    overflow-x: visible !important;
  }
  pre code {
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    font-size: 1em;
  }
  code {
    font-family: "Cascadia Code", "Fira Code", Consolas, monospace;
    background: var(--inline-code-bg, var(--bg-code));
    color: var(--accent-pink);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.9em;
  }
  pre > code {
    padding: 0;
    background: transparent;
    color: inherit;
  }
  a { color: var(--accent-cyan); }
  blockquote {
    border-left: 3px solid var(--accent-purple);
    padding: 0.5em 1em;
    color: var(--text-secondary);
    font-style: italic;
    margin: 1em 0;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1em;
    color: var(--text-primary);
    font-size: 0.95em;
  }
  th, td {
    border: 1px solid var(--divider);
    padding: 0.5em 1em;
  }
  th {
    font-weight: 600;
    color: var(--text-heading);
    border-bottom: 1px solid var(--divider);
  }
  img { max-width: 100%; page-break-inside: avoid; }
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
    color: var(--text-heading);
  }
  h1 { font-size: 2em; margin: 0.67em 0; }
  h2 { font-size: 1.5em; margin: 0.75em 0; color: var(--h2-color); }
  h3 { font-size: 1.25em; margin: 0.83em 0; color: var(--h3-color); }
  h4 { font-size: 1em; margin: 1.12em 0; color: var(--h4-color); }
  p { margin: 0 0 1em 0; color: var(--text-primary); }
  ul, ol {
    color: var(--text-primary);
    padding-left: 1.5em;
    margin-bottom: 1em;
  }
  li { margin-bottom: 0.3em; }
  strong { color: var(--text-heading); font-weight: 600; }
  em { color: var(--text-primary); font-style: italic; }
  del { color: var(--text-secondary); text-decoration: line-through; }
  .math-block {
    margin: 1.5em 0;
    text-align: center;
    page-break-inside: avoid;
  }
  .katex-display {
    margin: 1.5em 0;
    page-break-inside: avoid;
  }
  svg { max-width: 100%; height: auto; page-break-inside: avoid; }
  pre, table { page-break-inside: avoid; }
  </style>
  ${katexCssLink}
</head>
<body>
  <div class="markdown-body">
    ${bodyHtml}
  </div>
</body>
</html>`;
}
