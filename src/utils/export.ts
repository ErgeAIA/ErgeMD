import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useFileStore } from "@/stores/fileStore";
import { useReaderStore } from "@/stores/readerStore";
import { renderMermaidForExport } from "@/components/reader/MermaidDiagram";
import { decodeBlockDataRaw } from "@/utils/quickEditLines";
import { buildExportStyles } from "./exportStyles";
import { queryActiveMarkdownBody } from "./domUtils";

export interface ExportHtmlOptions {
  inlineCss?: boolean;
  sectionId?: string;
  grayscale?: boolean;
  /** 是否为 PDF 打印导出：注入 @page 与 print-color-adjust、强制全宽排版 */
  forPdf?: boolean;
  /** 正文字号（px），PDF 导出透传阅读设置 */
  fontSize?: number;
}

/**
 * 从当前活动 Tab 的渲染 DOM 提取导出正文。
 *
 * 必须走 queryActiveMarkdownBody() 而非裸 document.querySelector：所有 Tab 的
 * 阅读区常驻 DOM（非活动 Tab 经 display:none 隐藏），querySelector 按文档序取值，
 * 多 Tab 下会命中非活动 Tab 而导出错误文档（MD1 / BUG-053~054 病灶）。
 * 章节导出同样限定在活动 Tab 子树内查找，避免跨 Tab 命中同名 id。
 */
/**
 * 导出前把各 SVG 元素的计算后 paint 样式（fill/stroke/stop-color/color）烘焙为内联样式。
 *
 * mermaid 主题大量依赖 #id 作用域规则 + 层叠 + SVG 后处理；DOM 复制导出后这些规则
 * 能否命中受序列化剪枝、id 匹配、特异性竞争影响——曾出现思维导图中心节点（.section-root
 * circle 规则未生效而发白）、桑基色带、ER/类图品牌色丢失。内联样式优先级最高且随 SVG
 * 一起被复制，彻底自包含、不受层叠影响；读取的是 App 内已应用主题的计算值，故烘焙结果
 * 即阅读视图所见。用完即恢复原 style，避免污染阅读视图（其 SVG 会被缓存复用）。
 */
function bakeSvgInlineStyles(
  root: HTMLElement,
  fit?: { width: number; height: number },
): () => void {
  const PAINT = ["fill", "stroke", "stop-color", "stop-opacity", "color"];
  const restores: Array<() => void> = [];
  root.querySelectorAll("svg").forEach((svg) => {
    // 根 SVG 尺寸控制。
    //
    // mermaid 以 width="100%" + 内联 max-width:<固有宽度>px 输出（实测固有宽度最小
    // 139px、最大 1814px）。打印时 Blink 不会像屏幕那样把 max-width 求值到固有宽度，
    // width="100%" 直接撑满内容区：193px 的状态图被放大成整页宽、高度同比涨到 1247px
    // （页面内容区仅 ~1000px），于是「图放得特别大 / 只剩底部一点 / 整块空白」。
    //
    // 解法：只在 PDF 模式下把根 SVG 固化成明确的 px 宽高（min(固有宽, 可用宽)，再按
    // viewBox 比例算高、超高则等比缩小），布局与打印都不再依赖百分比 + max-width 求值。
    // HTML 导出保持响应式，只用 min() 把固定上限换成「取小」，窄图不会被拉伸。
    const declared = svg.style.getPropertyValue("max-width").trim();
    const widthAttr = (svg.getAttribute("width") ?? "").trim();
    const viewBox = (svg.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
    const hasBox = viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0;
    const intrinsic = /^\d+(\.\d+)?px$/.test(declared)
      ? Number.parseFloat(declared)
      : /^\d+(\.\d+)?$/.test(widthAttr)
        ? Number.parseFloat(widthAttr)
        : hasBox
          ? viewBox[2]
          : NaN;

    if (fit && hasBox && Number.isFinite(intrinsic) && intrinsic > 0) {
      let w = Math.min(intrinsic, fit.width);
      let h = (viewBox[3] * w) / viewBox[2];
      if (h > fit.height) {
        const k = fit.height / h;
        w *= k;
        h *= k;
      }
      const prevStyle = svg.getAttribute("style");
      const prevWidth = svg.getAttribute("width");
      const prevHeight = svg.getAttribute("height");
      restores.push(() => {
        if (prevStyle === null) svg.removeAttribute("style");
        else svg.setAttribute("style", prevStyle);
        if (prevWidth === null) svg.removeAttribute("width");
        else svg.setAttribute("width", prevWidth);
        if (prevHeight === null) svg.removeAttribute("height");
        else svg.setAttribute("height", prevHeight);
      });
      svg.setAttribute("width", w.toFixed(2));
      svg.setAttribute("height", h.toFixed(2));
      svg.style.removeProperty("max-width");
    } else if (/^\d+(\.\d+)?px$/.test(declared)) {
      const prevRoot = svg.getAttribute("style");
      restores.push(() => {
        if (prevRoot === null) svg.removeAttribute("style");
        else svg.setAttribute("style", prevRoot);
      });
      svg.style.setProperty("max-width", `min(${declared}, 100%)`);
    }

    svg.querySelectorAll<SVGElement>("*").forEach((el) => {
      const cs = getComputedStyle(el);
      const prev = el.getAttribute("style");
      restores.push(() => {
        if (prev === null) el.removeAttribute("style");
        else el.setAttribute("style", prev);
      });
      for (const p of PAINT) {
        const v = cs.getPropertyValue(p);
        // paint server 引用（渐变/图案）必须保留属性本身：烘焙成计算值会退化成单色，
        // 桑基图的彩色流量带（stroke=url(#linearGradient-N)）会整片变灰/无色。
        // 引用随 SVG 一起复制仍然有效（定义在同一个 <svg> 内），无需内联。
        if (!v || v.includes("url(")) continue;
        el.style.setProperty(p, v);
      }
    });
  });
  return () => restores.forEach((r) => r());
}

/** A4 打印可用内容区宽：210mm 减去 @page 左右各 20mm 边距 ≈ 642px（96dpi）。 */
const PDF_FIT_WIDTH = 642;
/** 单图高度上限：约等于 A4 内容区高度（297mm - 上下各 15mm）留出余量，避免跨页被裁。 */
const PDF_FIT_HEIGHT = 950;

function extractHtmlContent(
  sectionId?: string,
  fit?: { width: number; height: number },
): string {
  const container = queryActiveMarkdownBody();
  if (!container) {
    throw new Error("Active markdown body not found");
  }

  if (sectionId) {
    const sectionEl = container.querySelector(`#${CSS.escape(sectionId)}`);
    if (!sectionEl) {
      throw new Error(`Section not found: ${sectionId}`);
    }
    const restore = bakeSvgInlineStyles(sectionEl as HTMLElement, fit);
    try {
      return sectionEl.outerHTML;
    } finally {
      restore();
    }
  }

  const restore = bakeSvgInlineStyles(container, fit);
  try {
    return container.innerHTML;
  } finally {
    restore();
  }
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
    const hadSvg = existingSvg !== null;
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

        // 入队时本就无 svg 的块（缺失、可能仍在 App 渲染队列中排队）：
        // renderMermaidForExport 排在同一串行队列且位于 App 主题渲染之后，等待期间
        // App 的主题渲染可能已出图——若已有 svg 则不覆盖，保留带 themeVariables 的主题
        // 渲染（无主题兜底会丢中心节点填充 git0 等）。错误炸弹（入队时已有 svg）不进此
        // 分支，仍需覆盖修复。
        if (!hadSvg && block.querySelector("svg")) return;

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
 *
 * 超时按图表块数自适应放大：图表经全局串行队列逐个渲染，块数越多耗时越长。
 * 超时过短会误触 renderUnrenderedMermaidBlocks 兜底——该兜底走
 * renderMermaidForExport（不带 themeVariables）且排在同一条队列里、会覆盖尚未
 * 出图的主题渲染，表现为思维导图中心节点等丢失填充（git0 = center-bg）。
 */
async function waitForExportRender(): Promise<void> {
  const blocks = document.querySelectorAll(
    '[data-block-type="mermaid"], [data-block-type="plantuml"]',
  );
  // 超时按图表块数自适应放大：图表经全局串行队列逐个渲染，复杂图（桑基/时间线/
  // 甘特等带渐变与后处理）单个可达数秒，块数越多耗时越长。超时过短会让复杂图落入
  // renderUnrenderedMermaidBlocks 兜底——该兜底无主题/无 SVG 后处理，表现为图表丢色。
  const timeoutMs = Math.max(20000, blocks.length * 3000);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
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

function generateHtmlContent(options: ExportHtmlOptions = {}): string {
  const {
    inlineCss = true,
    sectionId,
    grayscale = false,
    forPdf = false,
    fontSize,
  } = options;
  const rawHtml = extractHtmlContent(
    sectionId,
    forPdf ? { width: PDF_FIT_WIDTH, height: PDF_FIT_HEIGHT } : undefined,
  );
  const htmlContent = stripInternalMetadata(rawHtml);
  const inlineStyles = buildExportStyles({
    inlineCss,
    grayscale,
    forPdf,
    fontSize,
  });

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

/**
 * 统一导出文档捕获：进入导出模式、等待异步图表渲染完成，返回自包含 HTML 字符串。
 *
 * 这是 HTML 文件导出、章节导出与 PDF 导出的唯一 seam——三者从同一份「屏幕上
 * 所见的忠实投影」派生，杜绝渲染管线漂移（PDF 与 HTML/阅读视图不一致的根因）。
 * 调用方负责把返回的 HTML 落盘为文件、喂给打印引擎或写入剪贴板。
 */
export async function captureExportDocument(
  options: ExportHtmlOptions = {},
): Promise<string> {
  const readerStore = useReaderStore.getState();
  readerStore.setExportMode(true);

  try {
    // 等待 React 提交完整（非虚拟化的）渲染
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    // 等待异步图表（mermaid / plantuml）渲染完成
    await waitForExportRender();
    // 安全网：补救任何仍未渲染的 mermaid block（含错误炸弹图）
    await renderUnrenderedMermaidBlocks();

    return generateHtmlContent(options);
  } finally {
    // 退出导出模式，恢复阅读视图（VirtualMarkdownView 会复原滚动位置）。
    // finally 保证即使捕获阶段抛异常也不会卡死在导出模式。
    readerStore.setExportMode(false);
  }
}

export async function exportHtml(options: ExportHtmlOptions = {}): Promise<void> {
  const fileStore = useFileStore.getState();
  const defaultFileName = fileStore.currentFilePath
    ? fileStore.currentFilePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "export"
    : "export";

  const fullHtml = await captureExportDocument(options);

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
