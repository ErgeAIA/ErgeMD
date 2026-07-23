import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useFileStore } from "@/stores/fileStore";
import { renderMermaidForExport } from "@/components/reader/MermaidDiagram";
import { decodeBlockDataRaw } from "@/utils/quickEditLines";

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
  "bg-code": "#f5f5f5",
  "text-primary": "#1a1a1a",
  "text-secondary": "#4a4a4a",
  "text-muted": "#808080",
  "text-heading": "#000000",
  "h2-color": "#1a1a1a",
  "h3-color": "#1a1a1a",
  "h4-color": "#1a1a1a",
  "accent-cyan": "#0066cc",
  "accent-pink": "#cc3366",
  "accent-purple": "#6633cc",
  "accent-green": "#2d7d46",
  "accent-yellow": "#998800",
  "accent-orange": "#cc6600",
  "accent-red": "#cc3333",
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
    ? `    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    background-color: var(--bg-page) !important;
    color: var(--text-primary) !important;`
    : "";

  const pdfCodeStyles = forPdf
    ? `  pre {
    background: var(--bg-code);
    border-radius: 8px;
    padding: 1em;
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    overflow-x: visible !important;
  }
  pre code {
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
  }`
    : `  pre { background: var(--bg-code); border-radius: 8px; padding: 1em; overflow-x: auto; }`;

  return `<style>
  ${pageRules}
  :root {
    ${CSS_VARIABLE_NAMES.map((name) => `--${name}: ${cssVariables[name]};`).join("\n    ")}
  }
  *, *::before, *::after {
    ${forPdf ? `print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;` : ""}
  }
  html, body {
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif;
    background-color: var(--bg-page) !important;
    color: var(--text-primary) !important;
    line-height: 1.8;
    max-width: 800px;
    margin: 2em auto;
    padding: 0 2em;
${bodyExtra}
  }
  ${pdfCodeStyles}
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

/**
 * 导出前补救渲染未渲染的 mermaid block。
 *
 * 虚拟滚动 + IntersectionObserver 懒加载场景下，不可见区域的 mermaid block
 * 在 DOM 中只有 placeholder（无 SVG），直接复制 innerHTML 导出会丢失图表。
 * 此函数遍历所有 `data-block-type="mermaid"` 元素，对未渲染（不含 svg）的
 * block 从 `data-raw` 提取 chart 代码并同步渲染，将 SVG 注入 DOM。
 */
async function renderUnrenderedMermaidBlocks(): Promise<void> {
  const mermaidBlocks = document.querySelectorAll<HTMLDivElement>(
    '[data-block-type="mermaid"]',
  );
  const renderTasks: Promise<void>[] = [];

  mermaidBlocks.forEach((block) => {
    // 已渲染（包含 svg）则跳过
    if (block.querySelector("svg")) return;

    const rawAttr = block.getAttribute("data-raw");
    if (!rawAttr) return;

    // data-raw 编码格式：`startLine|endLine|raw` 或纯 raw（均经 encodeURIComponent）
    const parsed = decodeBlockDataRaw(rawAttr);
    const rawText = parsed?.raw ?? safeDecodeUri(rawAttr);
    if (!rawText) return;

    // 从 fence 代码中提取 mermaid chart 内容
    // 兼容 ```mermaid / ```mermaid{...} 等 fence 形式
    const chartMatch = rawText.match(/```(?:mermaid)[^\n]*\n([\s\S]*?)\n```/);
    const chart = chartMatch ? chartMatch[1].trim() : "";

    if (!chart) return;

    renderTasks.push(
      (async () => {
        const svg = await renderMermaidForExport(chart);
        if (!svg) return;

        // 找到内层 .mermaid 容器（MermaidDiagram 组件渲染的 div），替换其内容
        const innerMermaid = block.querySelector<HTMLElement>(".mermaid");
        if (innerMermaid) {
          innerMermaid.innerHTML = svg;
        } else {
          // 兜底：直接在 block 内创建 .mermaid 容器
          const svgContainer = document.createElement("div");
          svgContainer.className = "mermaid";
          svgContainer.innerHTML = svg;
          block.innerHTML = "";
          block.appendChild(svgContainer);
        }
      })(),
    );
  });

  await Promise.all(renderTasks);
}

function safeDecodeUri(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
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
  const fileStore = useFileStore.getState();
  const defaultFileName = fileStore.currentFilePath
    ? fileStore.currentFilePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "export"
    : "export";

  // 补救渲染虚拟滚动下未渲染的 mermaid block，避免导出 HTML 丢失图表
  await renderUnrenderedMermaidBlocks();

  const fullHtml = generateHtmlContent(containerSelector, options);

  const filePath = await save({
    filters: [{ name: "HTML", extensions: ["html"] }],
    defaultPath: `${defaultFileName}.html`,
  });

  if (!filePath) return;

  await invoke("write_file", {
    path: filePath as string,
    content: fullHtml,
  });
}
