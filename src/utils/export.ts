import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export interface ExportHtmlOptions {
  inlineCss?: boolean;
  sectionId?: string;
  grayscale?: boolean;
}

const CSS_VARIABLE_NAMES = [
  "bg-page",
  "bg-reader",
  "bg-sidebar",
  "bg-code",
  "text-primary",
  "text-secondary",
  "text-muted",
  "text-heading",
  "h2-color",
  "h3-color",
  "h4-color",
  "accent-cyan",
  "accent-pink",
  "accent-purple",
  "accent-green",
  "accent-yellow",
  "accent-orange",
  "accent-red",
  "divider",
  "hover-bg",
];

const GRAYSCALE_OVERRIDES: Record<string, string> = {
  "bg-page": "#ffffff",
  "bg-reader": "#ffffff",
  "bg-sidebar": "#f5f5f5",
  "bg-code": "#f0f0f0",
  "text-primary": "#1a1a1a",
  "text-secondary": "#4a4a4a",
  "text-muted": "#808080",
  "text-heading": "#000000",
  "h2-color": "#1a1a1a",
  "h3-color": "#1a1a1a",
  "h4-color": "#1a1a1a",
  "accent-cyan": "#333333",
  "accent-pink": "#555555",
  "accent-purple": "#444444",
  "accent-green": "#3a3a3a",
  "accent-yellow": "#666666",
  "accent-orange": "#555555",
  "accent-red": "#333333",
  "divider": "#cccccc",
  "hover-bg": "#e8e8e8",
};

function collectCssVariables(
  grayscale: boolean,
): Record<string, string> {
  const computedStyle = getComputedStyle(document.documentElement);
  const result: Record<string, string> = {};

  for (const name of CSS_VARIABLE_NAMES) {
    if (grayscale) {
      result[name] = GRAYSCALE_OVERRIDES[name] ?? "#888888";
    } else {
      result[name] = computedStyle.getPropertyValue(`--${name}`).trim();
    }
  }

  return result;
}

function buildInlineStyles(
  cssVariables: Record<string, string>,
  inlineCss: boolean,
  forPdf: boolean = false,
): string {
  if (!inlineCss) return "";

  const pageRules = forPdf
    ? `@page { size: A4; margin: 15mm 20mm; }`
    : "";

  const bodyExtra = forPdf
    ? `    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;`
    : "";

  return `<style>
  ${pageRules}
  :root {
    ${CSS_VARIABLE_NAMES.map((name) => `--${name}: ${cssVariables[name]};`).join("\n    ")}
  }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif;
    background-color: var(--bg-page);
    color: var(--text-primary);
    line-height: 1.8;
    max-width: 800px;
    margin: 2em auto;
    padding: 0 2em;
${bodyExtra}
  }
  pre { background: var(--bg-code); border-radius: 8px; padding: 1em; overflow-x: auto; }
  code { font-family: "Cascadia Code", "Fira Code", Consolas, monospace; }
  a { color: var(--accent-cyan); }
  blockquote { border-left: 3px solid var(--accent-purple); padding: 0.5em 1em; color: var(--text-secondary); }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid var(--divider); padding: 0.5em 1em; }
  img { max-width: 100%; page-break-inside: avoid; }
  h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
  pre, table { page-break-inside: avoid; }
</style>`;
}

function extractHtmlContent(
  containerSelector: string,
  sectionId?: string,
): string {
  if (sectionId) {
    const sectionEl = document.querySelector(`#${CSS.escape(sectionId)}`);
    if (!sectionEl) {
      throw new Error(`Section not found: ${sectionId}`);
    }
    return sectionEl.outerHTML;
  }

  const container = document.querySelector(containerSelector);
  if (!container) {
    throw new Error(`Container not found: ${containerSelector}`);
  }
  return container.innerHTML;
}

export function generatePdfHtml(
  containerSelector: string = ".markdown-body",
  options: ExportHtmlOptions = {},
): string {
  const { inlineCss = true, sectionId, grayscale = false } = options;
  const htmlContent = extractHtmlContent(containerSelector, sectionId);
  const cssVariables = collectCssVariables(grayscale);
  const inlineStyles = buildInlineStyles(cssVariables, inlineCss, true);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ErgeMD Export</title>
  ${inlineStyles}
</head>
<body>
  ${htmlContent}
</body>
</html>`;
}

export function generateHtmlContent(
  containerSelector: string = ".markdown-body",
  options: ExportHtmlOptions = {},
): string {
  const { inlineCss = true, sectionId, grayscale = false } = options;
  const htmlContent = extractHtmlContent(containerSelector, sectionId);
  const cssVariables = collectCssVariables(grayscale);
  const inlineStyles = buildInlineStyles(cssVariables, inlineCss, false);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ErgeMD Export</title>
  ${inlineStyles}
</head>
<body>
  ${htmlContent}
</body>
</html>`;
}

export async function exportHtml(
  containerSelector: string = ".markdown-body",
  options: ExportHtmlOptions = {},
): Promise<void> {
  const fullHtml = generateHtmlContent(containerSelector, options);

  const filePath = await save({
    filters: [{ name: "HTML", extensions: ["html"] }],
    defaultPath: "export.html",
  });

  if (!filePath) return;

  await invoke("write_file", {
    path: filePath as string,
    content: fullHtml,
  });
}
