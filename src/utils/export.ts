import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useFileStore } from "@/stores/fileStore";
import { useReaderStore } from "@/stores/readerStore";
import { renderMermaidForExport } from "@/components/reader/MermaidDiagram";
import { decodeBlockDataRaw } from "@/utils/quickEditLines";
import { buildExportStyles } from "./exportStyles";

export interface ExportHtmlOptions {
  inlineCss?: boolean;
  sectionId?: string;
  grayscale?: boolean;
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
 * 导出前补救渲染未渲染的 mermaid block（安全网）。
 *
 * 当 exportMode 为真时，VirtualMarkdownView 会渲染全部 block，且 MermaidDiagram
 * 会立即渲染（跳过 IntersectionObserver），绝大多数 mermaid 已在 DOM 中带 svg。
 * 此函数作为兜底：对仍然缺 svg 的 mermaid block 从 data-raw 提取 chart 同步渲染。
 */
async function renderUnrenderedMermaidBlocks(): Promise<void> {
  const mermaidBlocks = document.querySelectorAll<HTMLDivElement>(
    '[data-block-type="mermaid"]',
  );
  const renderTasks: Promise<void>[] = [];

  mermaidBlocks.forEach((block) => {
    // 已正常渲染则跳过；无 svg（错误占位）或 mermaid 解析失败的错误炸弹图
    // （svg 文本含 "Syntax error in text" / "mermaid version"）都视为未渲染，
    // 需要重渲染补救，避免错误炸弹进入导出产物。
    const existingSvg = block.querySelector("svg");
    if (existingSvg) {
      const svgText = existingSvg.textContent ?? "";
      const isErrorBomb =
        svgText.includes("Syntax error in text") ||
        svgText.includes("mermaid version");
      if (!isErrorBomb) return;
    }

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

/**
 * 等待离屏/懒渲染的图表（mermaid、plantuml）完成渲染。
 * 代码高亮为同步渲染，无需在此等待。
 */
async function waitForExportRender(timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const blocks = document.querySelectorAll(
      '[data-block-type="mermaid"], [data-block-type="plantuml"]',
    );
    let pending = 0;
    blocks.forEach((b) => {
      if (!b.querySelector("svg")) pending++;
    });
    if (pending === 0) return;
    await new Promise((r) => setTimeout(r, 150));
  }
}

/**
 * 复制应用根节点（documentElement）的主题相关属性到导出 <html>。
 * 应用 CSS 中的主题作用域规则（如 .dark、[data-theme="..."]）依赖这些属性，
 * 不复制则注入的 CSSOM 中对应规则无法命中。
 */
function buildRootAttributes(): string {
  const el = document.documentElement;
  let attrs = "";
  const cls = el.getAttribute("class");
  if (cls) attrs += ` class="${cls}"`;
  const theme = el.getAttribute("data-theme");
  if (theme) attrs += ` data-theme="${theme}"`;
  return attrs;
}

/**
 * 从捕获到的 DOM 片段中剔除 data-raw 属性。
 *
 * data-raw 只服务 App 内的快捷编辑（行号 + 源码定位），浏览器里毫无用处：
 * 1. 它会把原始 Markdown 源码（含 mermaid 图表源码）带进导出产物——体积膨胀，
 *    且外部阅读器可能读取它、用它自己的 mermaid 重新渲染（表现为"版本号错误炸弹"）；
 * 2. 属于阅读器内部元数据，不应出现在交付物里。
 * 用克隆节点处理，不影响 App 自身的 DOM（快捷编辑仍可用）。
 */
function stripInternalMetadata(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("[data-raw]").forEach((el) => {
    el.removeAttribute("data-raw");
  });
  return template.innerHTML;
}

function generateHtmlContent(
  containerSelector: string = ".markdown-body",
  options: ExportHtmlOptions = {},
): string {
  const { inlineCss = true, sectionId, grayscale = false } = options;
  const rawHtml = extractHtmlContent(containerSelector, sectionId);
  const htmlContent = stripInternalMetadata(rawHtml);
  const inlineStyles = buildExportStyles({ inlineCss, grayscale, forPdf: false });

  return `<!DOCTYPE html>
<html lang="zh-CN"${buildRootAttributes()}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ErgeMD Export</title>
  ${inlineStyles}
</head>
<body>
  <div class="markdown-body">
  ${htmlContent}
  </div>
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

  // 进入导出模式：VirtualMarkdownView 渲染全部 block，CodeBlock / MermaidDiagram /
  // PlantUMLDiagram 跳过 IntersectionObserver 立即渲染，确保离屏内容（尤其 mermaid）
  // 进入导出产物，且代码块同步高亮。
  const readerStore = useReaderStore.getState();
  readerStore.setExportMode(true);

  let fullHtml: string;
  try {
    // 等待 React 提交完整（非虚拟化的）渲染
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    // 等待异步图表（mermaid / plantuml）渲染完成
    await waitForExportRender();

    // 安全网：补救任何仍未渲染的 mermaid block（含错误炸弹图）
    await renderUnrenderedMermaidBlocks();

    fullHtml = generateHtmlContent(containerSelector, options);
  } finally {
    // 退出导出模式，恢复阅读视图（VirtualMarkdownView 会复原滚动位置）。
    // finally 保证即使捕获阶段抛异常也不会卡死在导出模式。
    readerStore.setExportMode(false);
  }

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
