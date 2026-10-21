import React, { memo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/useTheme";
import SVGPreview from "./SVGPreview";
import { useReaderStore } from "@/stores/readerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { MERMAID_HOVER_CSS } from "./mermaidHoverCss";
import { injectSvgStyle } from "./mermaidInjectStyle";

/**
 * Mermaid 渲染结果缓存（内存级别，页面刷新失效）。
 * key: JSON.stringify({ theme, chart }), value: { svgHtml, timestamp }
 */
const mermaidCache = new Map<string, { svgHtml: string; timestamp: number }>();
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24小时
const CACHE_MAX_SIZE = 100; // 最多缓存100个图表

/**
 * Mermaid 全局串行队列
 * mermaid.initialize() 和 render() 必须全局串行执行，避免并发污染 themeVariables
 */
type Task = () => Promise<void>;
const mermaidRenderQueue: Task[] = [];
let isRendering = false;

let mermaidModulePromise: Promise<any> | null = null;
let zenumlModulePromise: Promise<any> | null = null;
let zenumlRegistered = false;

/**
 * 幂等注册 ZenUML 外部插件
 * 必须在 mermaid.initialize() 之前调用
 * 使用模块级标志避免重复注册覆盖 detector
 */
async function ensureZenumlRegistered(mermaid: any): Promise<void> {
  if (zenumlRegistered) return;
  if (!zenumlModulePromise) {
    zenumlModulePromise = import("@mermaid-js/mermaid-zenuml");
  }
  const zenuml = (await zenumlModulePromise).default;
  await mermaid.registerExternalDiagrams([zenuml]);
  zenumlRegistered = true;
}

/**
 * 思维导图「横向逻辑图」布局（全朝右，dagre LR）。
 *
 * mermaid 12.2.0 的 mindmap 把方向硬编码为 "TB"（mindmap-definition chunk 的
 * getData 返回 `direction: "TB"`），顶层 config 无任何方向口子，因此原生只能出
 * 放射（cose-bilkent）与向下层级树（dagre TB），无法出「全朝右」逻辑图。
 *
 * 绕过方案：注册一个包装布局，渲染前把 `data4Layout.direction` 改为 "LR" 再委托
 * dagre 渲染器（dagre 只读 `rankdir: data4Layout.direction`）。dagre 内部 chunk
 * 导出了完整 `render`，且 mermaid 的 package.json `exports` 含 `./*`，深链导入放行。
 *
 * 防护：mermaid 升级若改了 chunk 哈希文件名，动态 import 会失败 → 此处 try/catch 把
 * lrLayoutReady 置否，调用点降级为 dagre TB（层级树），不会使图表崩溃。
 */
const MINDMAP_LR_LAYOUT = "mindmap-tree-lr";
let lrLayoutRegistered = false;
let lrLayoutReady = false;

async function ensureMindmapLrLayout(mermaid: any): Promise<void> {
  if (lrLayoutRegistered) return;
  lrLayoutRegistered = true;
  try {
    await mermaid.registerLayoutLoaders([
      {
        name: MINDMAP_LR_LAYOUT,
        loader: async () => {
          const mod = await import(
            "mermaid/dist/chunks/mermaid.esm/dagre-WMVPSHVI.mjs"
          );
          const dagreRender = (mod as any).render;
          return {
            render: (
              data4Layout: any,
              svg: any,
              helpers: any,
              opts: any,
            ) => {
              data4Layout.direction = "LR";
              return dagreRender(data4Layout, svg, helpers, opts);
            },
          };
        },
      },
    ]);
    lrLayoutReady = true;
  } catch (e) {
    console.warn(
      "[MermaidDiagram] 注册横向逻辑图布局失败，已降级为层级树:",
      e,
    );
    lrLayoutReady = false;
  }
}

const runNextTask = async () => {
  if (isRendering || mermaidRenderQueue.length === 0) return;
  isRendering = true;
  const task = mermaidRenderQueue.shift()!;
  try {
    await task();
  } finally {
    isRendering = false;
    runNextTask();
  }
};

const enqueueMermaidRender = (task: Task) => {
  mermaidRenderQueue.push(task);
  runNextTask();
};

export function renderMermaidForExport(chart: string): Promise<string> {
  return new Promise<string>((resolve) => {
    enqueueMermaidRender(async () => {
      try {
        if (!mermaidModulePromise) {
          mermaidModulePromise = import("mermaid");
        }
        const mermaid = (await mermaidModulePromise).default;

        await ensureZenumlRegistered(mermaid);
        await ensureMindmapLrLayout(mermaid);

        // 与阅读路径保持一致：钉 dagre + classic，避免导出与文档观感漂移；
        // mindmap 按用户设置放行放射布局（cose-bilkent），导出与阅读视图同步
        const readingSettings = useSettingsStore.getState().readingSettings;
        const mindmapLayout = readingSettings.mindmapLayout ?? "radial";
        const mindmapStyle = readingSettings.mindmapStyle ?? "depth";
        const isMindmapChart = normalizeChartType(chart) === "mindmap";

        // 兜底渲染也必须带 themeVariables：历史上这里裸 initialize 出 mermaid 默认配色，
        // 一旦竞态中兜底胜出，思维导图中心节点（git0）无填充、泳道/节点发空或默认色。
        // 与阅读路径同源取色（getMermaidColors）：base 通用色覆盖所有图表，思维导图/泳道
        // 再按类型补关键键（取值与阅读路径一致：git0=centerColor、cScale=branches）。
        const colors = getMermaidColors();
        const themeVariables: Record<string, unknown> = {
          fontFamily: colors.fontFamily,
          fontSize: "16px",
          primaryColor: colors.primaryColor,
          primaryTextColor: colors.primaryTextColor,
          primaryBorderColor: colors.primaryBorderColor,
          lineColor: colors.lineColor,
          secondaryColor: colors.secondaryColor,
          tertiaryColor: colors.tertiaryColor,
          backgroundColor: colors.backgroundColor,
          nodeBorder: colors.primaryBorderColor,
          nodeText: colors.primaryTextColor,
          mainBkg: colors.backgroundColor,
          edgeColor: colors.lineColor,
          edgeLabelBackground: colors.backgroundColor,
          actorBg: colors.primaryColor,
          actorBorder: colors.primaryBorderColor,
          actorTextColor: colors.primaryTextColor,
          signalColor: colors.lineColor,
          clusterBkg: colors.backgroundColor,
          clusterBorder: colors.primaryBorderColor,
        };
        const exportChartType = normalizeChartType(chart);
        if (exportChartType === "mindmap" && colors.charts.mindmap) {
          const mc = colors.charts.mindmap;
          themeVariables.git0 = mc.centerColor;
          themeVariables.gitBranchLabel0 = mc.centerText;
          const fills = mc.branches;
          const texts = [
            mc.centerText,
            mc.level1Text,
            mc.level2Text,
            mc.level3Text,
            mc.level4Text,
          ];
          const lines = mc.branchLines;
          for (let i = 0; i < 12; i++) {
            themeVariables[`cScale${i}`] = fills[i % fills.length];
            themeVariables[`cScaleLabel${i}`] = texts[i % texts.length];
            themeVariables[`cScaleInv${i}`] = lines[i % lines.length];
          }
        }
        if (exportChartType === "swimlane" && colors.charts.swimlane) {
          const sc = colors.charts.swimlane;
          themeVariables.nodeBorder = sc.nodeBorder;
          themeVariables.nodeText = sc.nodeText;
          themeVariables.clusterBkg = sc.laneBg;
          themeVariables.clusterBorder = sc.laneBorder;
          themeVariables.edgeColor = sc.edgeColor;
          themeVariables.edgeLabelBackground = sc.edgeLabelBg;
        }

        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "strict",
          themeVariables,
          layout:
            isMindmapChart
              ? mindmapLayout === "logic"
                ? lrLayoutReady
                  ? MINDMAP_LR_LAYOUT
                  : "dagre"
                : mindmapLayout !== "tree"
                  ? "cose-bilkent"
                  : "dagre"
              : "dagre",
          look: "classic",
          // depth 风格在导出兜底路径下 section 也按层级分配，与阅读路径一致
          mindmap: {
            colorBy: mindmapStyle === "depth" ? "depth" : "branch",
          },
          flowchart: { useMaxWidth: false, htmlLabels: true },
        });

        const id = `export-mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, chart);
        resolve(svg);
      } catch (err) {
        console.error("Mermaid export render failed:", err);
        resolve("");
      }
    });
  });
}

/** 清理过期和超出容量的缓存 */
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of mermaidCache.entries()) {
    if (now - value.timestamp > CACHE_MAX_AGE) {
      mermaidCache.delete(key);
    }
  }
  if (mermaidCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(mermaidCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - CACHE_MAX_SIZE);
    toDelete.forEach(([key]) => mermaidCache.delete(key));
  }
};

/**
 * 将十六进制颜色转换为 RGB
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

/**
 * 计算颜色的相对亮度（使用 sRGB 标准）
 * 返回值范围 0-1，值越高表示颜色越亮
 */
const getRelativeLuminance = (hexColor: string): number => {
  const { r, g, b } = hexToRgb(hexColor);

  const sR = r / 255;
  const sG = g / 255;
  const sB = b / 255;

  const R = sR <= 0.03928 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4);
  const G = sG <= 0.03928 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4);
  const B = sB <= 0.03928 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

/**
 * 判断主题是否为亮色主题
 * 基于背景色的相对亮度，阈值设为 0.5（WCAG 标准）
 */
const isLightTheme = (bgColor: string, explicitIsLight?: boolean): boolean => {
  if (explicitIsLight !== undefined) {
    return explicitIsLight;
  }

  const luminance = getRelativeLuminance(bgColor);
  return luminance > 0.5;
};

interface MermaidDiagramProps {
  chart: string;
  onEdit?: () => void;
}

/**
 * 图表类型专用配色接口
 */
interface ChartColors {
  timeline: {
    cScale: string[];
    cScaleLabel: string[];
  };
  mindmap: {
    centerColor: string;
    centerText: string;
    /** 节点背景序列（chart-fill，承载文字，→ mermaid cScale） */
    branches: string[];
    /** 分支线序列（chart-stroke，装饰性连线，→ mermaid cScaleInv / lineColor） */
    branchLines: string[];
    level1Bg: string;
    level1Text: string;
    level2Bg: string;
    level2Text: string;
    level3Bg: string;
    level3Text: string;
    level4Text: string;
  };
  xychart: {
    backgroundColor: string;
    titleColor: string;
    labelColor: string;
    gridColor: string;
    borderColor: string;
    plotColors: string[];
  };
  gitgraph: {
    branchColors: string[];
    commitLabelColor: string;
    commitLabelBg: string;
    tagLabelColor: string;
    tagLabelBg: string;
    tagLabelBorder: string;
    commitNodeColor: string;
    commitNodeBorderColor: string;
    branchLabelColor: string;
    branchLabelBg: string;
  };
  sankey: {
    nodeBorderColor: string;
    nodeBkgColor: string;
    nodeTextColor: string;
  };
  requirement: {
    requirementBkg: string;
    requirementText: string;
    requirementBorder: string;
    elementBkg: string;
    elementText: string;
    elementBorder: string;
  };
  flowchart?: {
    nodeBg: string;
    nodeBorder: string;
    nodeText: string;
    edgeColor: string;
    edgeLabelBg: string;
    edgeLabelText: string;
    subgraphBorderColor: string;
  };
  sequence?: {
    actorBg: string;
    actorBorder: string;
    actorText: string;
    signalColor: string;
    noteBg: string;
    noteText: string;
  };
  gantt?: {
    sectionBg: string;
    sectionLine: string;
    taskBg: string;
    taskBorder: string;
    taskText: string;
    milestoneBg: string;
    milestoneBorder: string;
    milestoneText: string;
  };
  classDiagram?: {
    classBg: string;
    classBorder: string;
    classText: string;
    interfaceBg: string;
    interfaceBorder: string;
    interfaceText: string;
  };
  stateDiagram?: {
    stateBg: string;
    stateBorder: string;
    stateText: string;
    transitionColor: string;
  };
  erDiagram?: {
    entityBg: string;
    entityBorder: string;
    entityText: string;
    relationshipColor: string;
    attributeBg: string;
    attributeText: string;
    attributeBgAlt: string;
    attributeTextAlt: string;
  };
  journey?: {
    journeyBg: string;
    journeyBorder: string;
    journeyText: string;
    fillColor: string;
  };
  c4?: {
    personBg: string;
    personBorder: string;
    personText: string;
    systemBg: string;
    systemBorder: string;
    systemText: string;
    containerBg: string;
    containerBorder: string;
    containerText: string;
    componentBg: string;
    componentBorder: string;
    componentText: string;
  };
  packet?: {
    text: string;
  };
  radar?: {
    curve0: string;
    curve1: string;
    curve2: string;
    curve3: string;
    curve4: string;
  };
  treemap?: {
    text: string;
    groupBg: string;
    leaf0: string;
    leaf1: string;
    leaf2: string;
    leaf3: string;
    leaf4: string;
    leaf5: string;
    border: string;
  };
  block?: {
    text: string;
    bg: string;
    border: string;
    line: string;
  };
  kanban?: {
    text: string;
    columnBg: string;
    cardBg: string;
    cardBorder: string;
    divider: string;
  };
  quadrant?: {
    bg: string;
    title: string;
    axisLabel: string;
    axisLine: string;
    divider: string;
    point0: string;
    point1: string;
    point2: string;
    point3: string;
    point4: string;
    point5: string;
  };
  treeview?: {
    label: string;
    description: string;
    line: string;
    icon: string;
    bg: string;
    highlightBg: string;
    highlightStroke: string;
  };
  wardley?: {
    text: string;
    nodeBg: string;
    nodeBorder: string;
    line: string;
    bg: string;
  };
  ishikawa?: {
    text: string;
    line: string;
    border: string;
    causeBg: string;
    effectBg: string;
  };
  zenuml?: {
    text: string;
    border: string;
    bg: string;
    lifeline: string;
    message: string;
  };
  eventmodeling?: {
    text: string;
    uiFill: string;
    uiStroke: string;
    processorFill: string;
    processorStroke: string;
    readmodelFill: string;
    readmodelStroke: string;
    commandFill: string;
    commandStroke: string;
    eventFill: string;
    eventStroke: string;
    relationStroke: string;
    swimlaneBg: string;
    swimlaneStroke: string;
    arrowhead: string;
  };
  swimlane?: {
    nodeBg: string;
    nodeBorder: string;
    nodeText: string;
    laneBg: string;
    laneBorder: string;
    edgeColor: string;
    edgeLabelBg: string;
    edgeLabelText: string;
  };
  usecase?: {
    actorBg: string;
    actorBorder: string;
    bg: string;
    border: string;
    boundaryBg: string;
    boundaryBorder: string;
    includeLine: string;
    extendLine: string;
  };
  cynefin?: {
    complexBg: string;
    complicatedBg: string;
    clearBg: string;
    chaoticBg: string;
    confusionBg: string;
    boundaryColor: string;
    cliffColor: string;
    arrowColor: string;
    labelColor: string;
    textColor: string;
  };
}

function getCSSVar(name: string, fallback: string = ""): string {
  if (typeof document === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

// ===== 状态色填充上的文字色自动选择 =====
// Cynefin / 象限图的四分区底色取主题状态色（绿/蓝/红/黄/紫），亮色主题下
// 状态色为深饱和（白字可读），暗色主题下为中亮（深墨可读）——单一文字色
// 无法通吃，按 WCAG 对比度在白 / 深墨之间自动取更优者。深墨取画布深色
// #241F1B（palette bg-surface），与色板同族。

const INK_ON_FILL = "#241F1B";
const PAPER_ON_FILL = "#FFFFFF";

function parseColorToken(
  value: string,
): [number, number, number] | null {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) {
      return [
        parseInt(h[0] + h[0], 16),
        parseInt(h[1] + h[1], 16),
        parseInt(h[2] + h[2], 16),
      ];
    }
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  return null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** 取白 / 深墨中与底色对比度更高的一方；解析失败回落白色 */
function readableTextOnFill(bg: string): string {
  const c = parseColorToken(bg);
  if (!c) return PAPER_ON_FILL;
  const ink = parseColorToken(INK_ON_FILL) as [number, number, number];
  return contrastRatio(c, ink) >= contrastRatio(c, [255, 255, 255])
    ? INK_ON_FILL
    : PAPER_ON_FILL;
}

/**
 * 保底 4.5:1 的取墨：在深墨 / 纯白 / 纯黑三者中取对比度最高者。
 * 纯白与纯黑的可用区间无缝衔接（白覆盖 L≤0.183、黑覆盖 L≥0.175），对任意
 * 底色恒 ≥4.5:1。二选一版本在中间明度的高饱和填充上两边都可能落在 4.5 以下
 * （如橙 L≈0.24：墨 4.47 / 白 3.57），thin 文字观感即「看不清」（BUG-077：
 * 太阳耀斑 / 紫柚明亮 / 霓虹赛博 / 樱花）。quadrant / cynefin 沿用二选一版不动。
 */
function readableTextOnFillStrict(bg: string): string {
  const c = parseColorToken(bg);
  if (!c) return PAPER_ON_FILL;
  const candidates: Array<[
    string,
    [number, number, number],
  ]> = [
    [INK_ON_FILL, parseColorToken(INK_ON_FILL) as [number, number, number]],
    [PAPER_ON_FILL, [255, 255, 255]],
    ["#000000", [0, 0, 0]],
  ];
  let best = PAPER_ON_FILL;
  let bestRatio = -1;
  for (const [hex, rgb] of candidates) {
    const r = contrastRatio(c, rgb);
    if (r > bestRatio) {
      bestRatio = r;
      best = hex;
    }
  }
  return best;
}

/**
 * 把颜色 target 按 ratio 向 canvas 混合（ratio=1 即完全靠拢 canvas）。
 * 用于暗色主题下状态色填充过亮、白字对比度不达标（<4.5:1）时，将填充
 * 适当加深，使白字可读性达到 AA 标准；亮色主题直接原样返回。
 */
function mixToward(canvas: string, target: string, ratio: number): string {
  const t = parseColorToken(target);
  const c = parseColorToken(canvas);
  if (!t || !c) return target;
  const hx = (n: number) =>
    Math.round(n).toString(16).padStart(2, "0");
  return `#${hx(t[0] + (c[0] - t[0]) * ratio)}${hx(
    t[1] + (c[1] - t[1]) * ratio,
  )}${hx(t[2] + (c[2] - t[2]) * ratio)}`;
}

/**
 * 【已停用】思维导图 brand 风格逐节点深度混色。
 *
 * 原实现从 SVG 串解析「节点 id→section」与「子节点 id→depth」，逐节点向画布混色
 * 落实「分支定色相、层级定明度」。停用原因有两点：
 * ① 混色会改掉节点底色，使它与生成器配对的 chart-text-on-fill 不再对应——想要
 *    文字继续达标就得再按混色结果重算取墨，等于把颜色决策搬进渲染层（内联取墨），
 *    绕开 token 契约，与项目「颜色一律由 tokens 决定」的原则冲突；
 * ② 深度解析依赖 `<path id="edge_父_子">`，但 mermaid 实际边 id 带渲染前缀
 *    （如 `mm-xxx-edge_0_1`），该正则从未命中，nodeDepth 恒空，所有节点 r=0，
 *    即「层级明度」从未真正生效——混色逻辑一直是空转。
 *
 * 现由「brand 档 = 分支色相（chart-fill × chart-text-on-fill 配对）、
 * depth 档 = 层级明度（mermaid 原生 colorBy='depth'）」分别承担，职责清晰。
 * （实现已移除：保留空转会误导后来者，需要时可据此说明在 token 层引入
 * 「层级明度」令牌后重写。）
 */

function getMermaidColors(): {
  primaryColor: string;
  primaryTextColor: string;
  primaryBorderColor: string;
  lineColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  fontFamily: string;
  isLight?: boolean;
  pieColors: string[];
  backgroundColor: string;
  pieTextColor: string;
  charts: ChartColors;
} {
  const primaryColor = getCSSVar("--mermaid-label-bg", "#3A3A4A");
  const primaryTextColor = getCSSVar("--mermaid-text", "#E4E4E8");
  const primaryBorderColor = getCSSVar("--mermaid-node-stroke", "#6AB0FF");
  const lineColor = getCSSVar("--mermaid-edge", "#9090A0");
  const backgroundColor = getCSSVar("--mermaid-cluster-fill", "#1E1E2E");
  const secondaryColor = getCSSVar("--bg-sidebar", "#2A2A3A");
  const tertiaryColor = getCSSVar("--bg-tertiary", "#202030");

  const isLight = getRelativeLuminance(backgroundColor) > 0.5;

  const accentCyan = getCSSVar("--accent-cyan", "#6AB0FF");
  const accentPink = getCSSVar("--accent-pink", "#C586C0");
  const accentPurple = getCSSVar("--accent-purple", "#C586C0");
  const accentGreen = getCSSVar("--accent-green", "#6A9955");
  const accentYellow = getCSSVar("--accent-yellow", "#DCDCAA");
  const accentOrange = getCSSVar("--accent-orange", "#CE9178");
  const accentRed = getCSSVar("--accent-red", "#F44747");

  const mindmapCenterBg = getCSSVar("--mermaid-mindmap-center-bg", accentCyan);
  const mindmapCenterText = getCSSVar(
    "--mermaid-mindmap-center-text",
    isLight ? "#FFFFFF" : backgroundColor,
  );

  return {
    primaryColor,
    primaryTextColor,
    primaryBorderColor,
    lineColor,
    secondaryColor,
    tertiaryColor,
    fontFamily: "inherit",
    isLight,
    backgroundColor,
    pieTextColor: primaryTextColor,
    pieColors: [
      getCSSVar("--mermaid-pie-0", accentCyan),
      getCSSVar("--mermaid-pie-1", accentGreen),
      getCSSVar("--mermaid-pie-2", accentOrange),
      getCSSVar("--mermaid-pie-3", accentRed),
      getCSSVar("--mermaid-pie-4", accentPurple),
      getCSSVar("--mermaid-pie-5", accentYellow),
    ],
    charts: {
      timeline: {
        cScale: [
          getCSSVar("--mermaid-timeline-cscale-0", tertiaryColor),
          getCSSVar("--mermaid-timeline-cscale-1", secondaryColor),
          getCSSVar("--mermaid-timeline-cscale-2", primaryColor),
          getCSSVar("--mermaid-timeline-cscale-3", backgroundColor),
        ],
        cScaleLabel: [
          getCSSVar("--mermaid-timeline-label", primaryTextColor),
          getCSSVar("--mermaid-timeline-label", primaryTextColor),
          getCSSVar("--mermaid-timeline-label", primaryTextColor),
          getCSSVar("--mermaid-timeline-label", primaryTextColor),
        ],
      },
      mindmap: {
        centerColor: mindmapCenterBg,
        centerText: mindmapCenterText,
        // 节点背景走 fill（承载文字）；分支线走 stroke（视觉身份）
        branches: [
          getCSSVar("--mermaid-mindmap-branch-0", accentCyan),
          getCSSVar("--mermaid-mindmap-branch-1", accentPink),
          getCSSVar("--mermaid-mindmap-branch-2", accentYellow),
          getCSSVar("--mermaid-mindmap-branch-3", accentGreen),
          getCSSVar("--mermaid-mindmap-branch-4", accentOrange),
        ],
        branchLines: [
          getCSSVar("--mermaid-mindmap-branch-line-0", accentCyan),
          getCSSVar("--mermaid-mindmap-branch-line-1", accentPink),
          getCSSVar("--mermaid-mindmap-branch-line-2", accentYellow),
          getCSSVar("--mermaid-mindmap-branch-line-3", accentGreen),
          getCSSVar("--mermaid-mindmap-branch-line-4", accentOrange),
        ],
        level1Bg: getCSSVar("--mermaid-mindmap-l1-bg", accentCyan),
        level1Text: getCSSVar(
          "--mermaid-mindmap-l1-text",
          isLight ? "#FFFFFF" : backgroundColor,
        ),
        level2Bg: getCSSVar("--mermaid-mindmap-l2-bg", accentPink),
        level2Text: getCSSVar("--mermaid-mindmap-l2-text", "#FFFFFF"),
        level3Bg: getCSSVar("--mermaid-mindmap-l3-bg", accentYellow),
        level3Text: getCSSVar(
          "--mermaid-mindmap-l3-text",
          isLight ? "#1F2937" : backgroundColor,
        ),
        level4Text: getCSSVar(
          "--mermaid-mindmap-l4-text",
          isLight ? "#1F2937" : backgroundColor,
        ),
      },
      xychart: {
        backgroundColor: getCSSVar("--mermaid-xychart-bg", backgroundColor),
        titleColor: getCSSVar("--mermaid-xychart-title", primaryTextColor),
        labelColor: getCSSVar("--mermaid-xychart-label", primaryTextColor),
        gridColor: getCSSVar("--mermaid-xychart-grid", primaryColor),
        borderColor: getCSSVar("--mermaid-xychart-border", primaryBorderColor),
        plotColors: [
          getCSSVar("--mermaid-xychart-plot-0", accentCyan),
          getCSSVar("--mermaid-xychart-plot-1", accentGreen),
          getCSSVar("--mermaid-xychart-plot-2", accentYellow),
          getCSSVar("--mermaid-xychart-plot-3", accentPink),
          getCSSVar("--mermaid-xychart-plot-4", accentOrange),
        ],
      },
      gitgraph: {
        branchColors: [
          getCSSVar("--mermaid-git-branch-0", lineColor),
          getCSSVar("--mermaid-git-branch-1", accentCyan),
          getCSSVar("--mermaid-git-branch-2", accentGreen),
          getCSSVar("--mermaid-git-branch-3", accentYellow),
        ],
        commitLabelColor: getCSSVar(
          "--mermaid-git-label-text",
          primaryTextColor,
        ),
        commitLabelBg: getCSSVar("--mermaid-git-label-bg", secondaryColor),
        tagLabelColor: getCSSVar(
          "--mermaid-git-tag-text",
          isLight ? "#FFFFFF" : backgroundColor,
        ),
        tagLabelBg: getCSSVar("--mermaid-git-tag-bg", accentCyan),
        tagLabelBorder: primaryBorderColor,
        commitNodeColor: getCSSVar("--mermaid-git-commit", accentCyan),
        commitNodeBorderColor: getCSSVar(
          "--mermaid-git-commit-border",
          primaryBorderColor,
        ),
        branchLabelColor: primaryTextColor,
        branchLabelBg: getCSSVar("--mermaid-git-label-bg", primaryColor),
      },
      sankey: {
        nodeBorderColor: getCSSVar(
          "--mermaid-sankey-node-border",
          primaryBorderColor,
        ),
        nodeBkgColor: getCSSVar("--mermaid-sankey-node-bg", primaryColor),
        nodeTextColor: getCSSVar(
          "--mermaid-sankey-node-text",
          primaryTextColor,
        ),
      },
      requirement: {
        requirementBkg: getCSSVar("--mermaid-requirement-bg", secondaryColor),
        requirementText: getCSSVar("--mermaid-requirement-text", accentCyan),
        requirementBorder: getCSSVar(
          "--mermaid-requirement-border",
          accentCyan,
        ),
        elementBkg: getCSSVar(
          "--mermaid-requirement-element-bg",
          tertiaryColor,
        ),
        elementText: getCSSVar(
          "--mermaid-requirement-element-text",
          accentYellow,
        ),
        elementBorder: getCSSVar(
          "--mermaid-requirement-element-border",
          accentYellow,
        ),
      },
      erDiagram: {
        entityBg: getCSSVar("--mermaid-er-entity-bg", secondaryColor),
        entityBorder: getCSSVar(
          "--mermaid-er-entity-border",
          primaryBorderColor,
        ),
        entityText: getCSSVar("--mermaid-er-entity-text", primaryTextColor),
        relationshipColor: getCSSVar("--mermaid-er-relationship", lineColor),
        attributeBg: getCSSVar("--mermaid-er-attribute-bg", primaryColor),
        attributeText: getCSSVar(
          "--mermaid-er-attribute-text",
          primaryTextColor,
        ),
        attributeBgAlt: getCSSVar("--mermaid-er-attribute-bg", primaryColor),
        attributeTextAlt: getCSSVar(
          "--mermaid-er-attribute-text",
          primaryTextColor,
        ),
      },
      gantt: {
        // section 行底色直读 --chart-surface-3（与 taskBg 直读 chart-series-0 同策略，
        // 绕开 --mermaid-gantt-section-bg 间接映射——globals.css 的 html:not([data-theme])
        // 兜底块把它硬编码成深色 #16162A，时序/缓存下可能读到兜底值致 section 行变黑）
        sectionBg: getCSSVar(
          "--chart-surface-3",
          getCSSVar("--mermaid-gantt-section-bg", tertiaryColor),
        ),
        sectionLine: lineColor,
        // 任务条底色直接取主题品牌主色 chart-series-0（最高识别度，从淡表面分区跳出）。
        // 早先经 mermaid-gantt.css 的 --mermaid-gantt-task-bg→var(--chart-series-0) 间接取，
        // 但该 CSS 映射文件在 HMR/缓存场景可能不随 JS 热更新 → 任务条回落旧值（chart-surface-1
        // 深色）呈「大黑条」。改为 JS 直读 chart-series-0（git/sankey 同款、确认随主题最新），
        // 保留 --mermaid-gantt-task-bg 作兜底（若某主题显式定制了甘特专用色则仍尊重）
        taskBg: getCSSVar(
          "--chart-series-0",
          getCSSVar("--mermaid-gantt-task-bg", primaryColor),
        ),
        taskBorder: getCSSVar(
          "--mermaid-gantt-task-border",
          primaryBorderColor,
        ),
        taskText: getCSSVar("--mermaid-gantt-task-text", primaryTextColor),
        milestoneBg: getCSSVar(
          "--chart-series-1",
          getCSSVar("--mermaid-gantt-milestone-bg", primaryColor),
        ),
        milestoneBorder: getCSSVar(
          "--mermaid-gantt-milestone-border",
          primaryBorderColor,
        ),
        milestoneText: primaryTextColor,
      },
      flowchart: {
        nodeBg: getCSSVar("--mermaid-flowchart-node-bg", primaryColor),
        nodeBorder: getCSSVar(
          "--mermaid-flowchart-node-border",
          primaryBorderColor,
        ),
        nodeText: getCSSVar("--mermaid-flowchart-node-text", primaryTextColor),
        edgeColor: getCSSVar("--mermaid-flowchart-edge", lineColor),
        edgeLabelBg: getCSSVar(
          "--mermaid-flowchart-edge-label-bg",
          secondaryColor,
        ),
        edgeLabelText: primaryTextColor,
        subgraphBorderColor: getCSSVar(
          "--mermaid-flowchart-subgraph-border",
          primaryBorderColor,
        ),
      },
      packet: {
        text: getCSSVar("--mermaid-packet-text", primaryTextColor),
      },
      radar: {
        curve0: getCSSVar("--mermaid-radar-curve-0", accentCyan),
        curve1: getCSSVar("--mermaid-radar-curve-1", accentGreen),
        curve2: getCSSVar("--mermaid-radar-curve-2", accentOrange),
        curve3: getCSSVar("--mermaid-radar-curve-3", accentPink),
        curve4: getCSSVar("--mermaid-radar-curve-4", accentPurple),
      },
      treemap: {
        text: getCSSVar("--mermaid-treemap-text", primaryTextColor),
        groupBg: getCSSVar("--mermaid-treemap-group-bg", secondaryColor),
        leaf0: getCSSVar("--mermaid-treemap-leaf-0", accentCyan),
        leaf1: getCSSVar("--mermaid-treemap-leaf-1", accentGreen),
        leaf2: getCSSVar("--mermaid-treemap-leaf-2", accentOrange),
        leaf3: getCSSVar("--mermaid-treemap-leaf-3", accentPink),
        leaf4: getCSSVar("--mermaid-treemap-leaf-4", accentPurple),
        leaf5: getCSSVar("--mermaid-treemap-leaf-5", accentYellow),
        border: getCSSVar("--mermaid-treemap-border", primaryBorderColor),
      },
      block: {
        text: getCSSVar("--mermaid-block-text", primaryTextColor),
        bg: getCSSVar("--mermaid-block-bg", primaryColor),
        border: getCSSVar("--mermaid-block-border", primaryBorderColor),
        line: getCSSVar("--mermaid-block-line", lineColor),
      },
      kanban: {
        text: getCSSVar("--mermaid-kanban-text", primaryTextColor),
        columnBg: getCSSVar("--mermaid-kanban-column-bg", secondaryColor),
        cardBg: getCSSVar("--mermaid-kanban-card-bg", primaryColor),
        cardBorder: getCSSVar("--mermaid-kanban-card-border", primaryBorderColor),
        divider: getCSSVar("--mermaid-kanban-divider", lineColor),
      },
      quadrant: {
        bg: getCSSVar("--mermaid-quadrant-bg", secondaryColor),
        title: getCSSVar("--mermaid-quadrant-title", primaryTextColor),
        axisLabel: getCSSVar("--mermaid-quadrant-axis-label", primaryTextColor),
        axisLine: getCSSVar("--mermaid-quadrant-axis-line", lineColor),
        divider: getCSSVar("--mermaid-quadrant-divider", lineColor),
        point0: getCSSVar("--mermaid-quadrant-point-0", accentCyan),
        point1: getCSSVar("--mermaid-quadrant-point-1", accentGreen),
        point2: getCSSVar("--mermaid-quadrant-point-2", accentOrange),
        point3: getCSSVar("--mermaid-quadrant-point-3", accentPink),
        point4: getCSSVar("--mermaid-quadrant-point-4", accentPurple),
        point5: getCSSVar("--mermaid-quadrant-point-5", accentYellow),
      },
      treeview: {
        label: getCSSVar("--mermaid-treeview-label", primaryTextColor),
        description: getCSSVar("--mermaid-treeview-description", getCSSVar("--chart-text-muted", "#A0A0A0")),
        line: getCSSVar("--mermaid-treeview-line", lineColor),
        icon: getCSSVar("--mermaid-treeview-icon", primaryBorderColor),
        bg: getCSSVar("--mermaid-treeview-bg", primaryColor),
        highlightBg: getCSSVar("--mermaid-treeview-highlight-bg", primaryColor),
        highlightStroke: getCSSVar("--mermaid-treeview-highlight-stroke", primaryBorderColor),
      },
      wardley: {
        text: getCSSVar("--mermaid-wardley-text", primaryTextColor),
        nodeBg: getCSSVar("--mermaid-wardley-node-bg", primaryColor),
        nodeBorder: getCSSVar("--mermaid-wardley-node-border", primaryBorderColor),
        line: getCSSVar("--mermaid-wardley-line", lineColor),
        bg: getCSSVar("--mermaid-wardley-bg", getCSSVar("--chart-surface-1", backgroundColor)),
      },
      ishikawa: {
        text: getCSSVar("--mermaid-ishikawa-text", primaryTextColor),
        line: getCSSVar("--mermaid-ishikawa-line", lineColor),
        border: getCSSVar("--mermaid-ishikawa-border", primaryBorderColor),
        causeBg: getCSSVar("--mermaid-ishikawa-cause-bg", primaryColor),
        effectBg: getCSSVar("--mermaid-ishikawa-effect-bg", secondaryColor),
      },
      zenuml: {
        text: getCSSVar("--mermaid-zenuml-text", primaryTextColor),
        border: getCSSVar("--mermaid-zenuml-border", primaryBorderColor),
        bg: getCSSVar("--mermaid-zenuml-bg", primaryColor),
        lifeline: getCSSVar("--mermaid-zenuml-lifeline", lineColor),
        message: getCSSVar("--mermaid-zenuml-message", lineColor),
      },
      eventmodeling: {
        text: getCSSVar("--mermaid-eventmodeling-text", primaryTextColor),
        uiFill: getCSSVar("--mermaid-eventmodeling-ui-fill", "#FFFFFF"),
        uiStroke: getCSSVar("--mermaid-eventmodeling-ui-stroke", primaryBorderColor),
        processorFill: getCSSVar("--mermaid-eventmodeling-processor-fill", accentPurple),
        processorStroke: getCSSVar("--mermaid-eventmodeling-processor-stroke", primaryBorderColor),
        readmodelFill: getCSSVar("--mermaid-eventmodeling-readmodel-fill", accentGreen),
        readmodelStroke: getCSSVar("--mermaid-eventmodeling-readmodel-stroke", primaryBorderColor),
        commandFill: getCSSVar("--mermaid-eventmodeling-command-fill", accentCyan),
        commandStroke: getCSSVar("--mermaid-eventmodeling-command-stroke", primaryBorderColor),
        eventFill: getCSSVar("--mermaid-eventmodeling-event-fill", accentOrange),
        eventStroke: getCSSVar("--mermaid-eventmodeling-event-stroke", primaryBorderColor),
        relationStroke: getCSSVar("--mermaid-eventmodeling-relation", lineColor),
        swimlaneBg: getCSSVar("--mermaid-eventmodeling-swimlane-bg", secondaryColor),
        swimlaneStroke: getCSSVar("--mermaid-eventmodeling-swimlane-stroke", lineColor),
        arrowhead: getCSSVar("--mermaid-eventmodeling-arrowhead", lineColor),
      },
      swimlane: {
        nodeBg: getCSSVar("--mermaid-swimlane-node-bg", backgroundColor),
        nodeBorder: getCSSVar("--mermaid-swimlane-node-border", primaryBorderColor),
        nodeText: getCSSVar("--mermaid-swimlane-node-text", primaryTextColor),
        laneBg: getCSSVar("--mermaid-swimlane-lane-bg", secondaryColor),
        laneBorder: getCSSVar("--mermaid-swimlane-lane-border", primaryBorderColor),
        edgeColor: getCSSVar("--mermaid-swimlane-edge", lineColor),
        edgeLabelBg: getCSSVar("--mermaid-swimlane-edge-label-bg", backgroundColor),
        edgeLabelText: getCSSVar("--mermaid-swimlane-edge-label-text", primaryTextColor),
      },
      usecase: {
        actorBg: getCSSVar("--mermaid-usecase-actor-bg", primaryColor),
        actorBorder: getCSSVar("--mermaid-usecase-actor-border", primaryBorderColor),
        bg: getCSSVar("--mermaid-usecase-bg", backgroundColor),
        border: getCSSVar("--mermaid-usecase-border", primaryBorderColor),
        boundaryBg: getCSSVar("--mermaid-usecase-boundary-bg", secondaryColor),
        boundaryBorder: getCSSVar("--mermaid-usecase-boundary-border", primaryBorderColor),
        includeLine: getCSSVar("--mermaid-usecase-include-line", lineColor),
        extendLine: getCSSVar("--mermaid-usecase-extend-line", primaryColor),
      },
      cynefin: {
        complexBg: getCSSVar("--mermaid-cynefin-complex-bg", primaryColor),
        complicatedBg: getCSSVar("--mermaid-cynefin-complicated-bg", primaryColor),
        clearBg: getCSSVar("--mermaid-cynefin-clear-bg", secondaryColor),
        chaoticBg: getCSSVar("--mermaid-cynefin-chaotic-bg", primaryColor),
        confusionBg: getCSSVar("--mermaid-cynefin-confusion-bg", secondaryColor),
        boundaryColor: getCSSVar("--mermaid-cynefin-boundary", primaryBorderColor),
        cliffColor: getCSSVar("--mermaid-cynefin-cliff", primaryColor),
        arrowColor: getCSSVar("--mermaid-cynefin-arrow", lineColor),
        labelColor: getCSSVar("--mermaid-cynefin-label", primaryTextColor),
        textColor: getCSSVar("--mermaid-cynefin-text", primaryTextColor),
      },
    },
  };
}

/**
 * 标准化图表类型
 * 支持 Mermaid 各种图表类型的别名和变体
 */
/**
 * 剥离 Mermaid frontmatter，获取用于类型检测的文本
 * Mermaid frontmatter 格式:
 * ---
 * title: "xxx"
 * ---
 * gitGraph
 * ...
 */
function getMermaidSourceForTypeDetection(chart: string): string {
  const trimmed = chart.trim();
  if (!trimmed.startsWith("---")) {
    return chart;
  }
  const endIndex = trimmed.indexOf("\n---", 3);
  if (endIndex === -1) {
    return chart;
  }
  return trimmed.slice(endIndex + 4);
}

function normalizeChartType(chart: string): string {
  const sourceForDetection = getMermaidSourceForTypeDetection(chart);
  const firstLine = sourceForDetection.trim().split("\n")[0].toLowerCase();
  const firstToken = firstLine.split(/\s+/)[0];

  const typeMap: Record<string, string> = {
    // Flowchart
    flowchart: "flowchart",
    "flowchart-v2": "flowchart",
    graph: "flowchart",
    // Sequence
    sequencediagram: "sequence",
    sequence: "sequence",
    // Class
    classdiagram: "class",
    class: "class",
    // State
    statediagram: "state",
    "statediagram-v2": "state",
    // ER
    erdiagram: "er",
    er: "er",
    // Gantt
    gantt: "gantt",
    // Pie
    pie: "pie",
    // Mindmap
    mindmap: "mindmap",
    // Git
    gitgraph: "git",
    git: "git",
    // Timeline
    timeline: "timeline",
    // Sankey
    sankey: "sankey",
    "sankey-beta": "sankey",
    // XY Chart
    xychart: "xychart",
    "xychart-beta": "xychart",
    // Requirement
    requirementdiagram: "requirement",
    // Journey
    journey: "journey",
    // C4
    c4context: "c4",
    // Quadrant
    quadrantchart: "quadrant",
    // ZenUML (通过外部插件 @mermaid-js/mermaid-zenuml 注册)
    zenuml: "zenuml",
    // Block
    "block-beta": "block",
    block: "block",
    // Packet
    packet: "packet",
    // Kanban
    kanban: "kanban",
    // Architecture
    "architecture-beta": "architecture",
    // Radar
    "radar-beta": "radar",
    // Event Modeling (Mermaid 11.15.0 内置支持)
    eventmodeling: "eventmodeling",
    // Treemap
    "treemap-beta": "treemap",
    // Venn
    "venn-beta": "venn",
    // Ishikawa (Mermaid 关键字为 ishikawa-beta，需显式映射才能命中主题适配)
    "ishikawa-beta": "ishikawa",
    // Wardley
    "wardley-beta": "wardley",
    // TreeView
    "treeview-beta": "treeview",
    // Swimlane (Mermaid 11.16.0+ 新增)
    "swimlane-beta": "swimlane",
    // Use Case (Mermaid 12.0.0+ 全新类型)
    "usecase-beta": "usecase",
    // Cynefin (Mermaid 11.16.0+ 新增)
    "cynefin-beta": "cynefin",
  };

  return typeMap[firstToken] || firstToken;
}

/**
 * 获取 Mermaid 主题签名，用于缓存键
 * 读取所有关键 CSS 变量，确保主题变化时缓存失效
 * 包含 chart palette 和 mermaid 最终变量
 */
function getMermaidThemeSignature(): string {
  const cssVars = [
    // 基础图表变量
    "--chart-text",
    "--chart-text-muted",
    "--chart-edge",
    "--chart-label-bg",
    "--chart-surface-1",
    "--chart-surface-2",
    "--chart-surface-3",
    // Chart fill
    "--chart-fill-0",
    "--chart-fill-1",
    "--chart-fill-2",
    "--chart-fill-3",
    "--chart-fill-4",
    "--chart-fill-5",
    "--chart-fill-6",
    "--chart-fill-7",
    // Chart stroke
    "--chart-stroke-0",
    "--chart-stroke-1",
    "--chart-stroke-2",
    "--chart-stroke-3",
    "--chart-stroke-4",
    "--chart-stroke-5",
    "--chart-stroke-6",
    "--chart-stroke-7",
    // Chart series
    "--chart-series-0",
    "--chart-series-1",
    "--chart-series-2",
    "--chart-series-3",
    "--chart-series-4",
    "--chart-series-5",
    "--chart-series-6",
    "--chart-series-7",
    // Mermaid 基础变量
    "--mermaid-text",
    "--mermaid-edge",
    "--mermaid-node-stroke",
    "--mermaid-cluster-fill",
    "--mermaid-label-bg",
    // Mermaid 节点背景
    "--mermaid-flowchart-node-bg",
    "--mermaid-flowchart-node-border",
    "--mermaid-flowchart-node-text",
    "--mermaid-flowchart-edge",
    "--mermaid-flowchart-edge-label-bg",
    "--mermaid-flowchart-subgraph-border",
    // 功能位（design D3：序号带主题色）
    "--list-number",
    // Mermaid Mindmap
    "--mermaid-mindmap-center-bg",
    "--mermaid-mindmap-center-text",
    "--mermaid-mindmap-l1-bg",
    "--mermaid-mindmap-l1-text",
    "--mermaid-mindmap-l2-bg",
    "--mermaid-mindmap-l2-text",
    "--mermaid-mindmap-l3-bg",
    "--mermaid-mindmap-l3-text",
    "--mermaid-mindmap-l4-text",
    "--mermaid-mindmap-branch-0",
    "--mermaid-mindmap-branch-1",
    "--mermaid-mindmap-branch-2",
    "--mermaid-mindmap-branch-3",
    "--mermaid-mindmap-branch-4",
    "--mermaid-mindmap-branch-line-0",
    "--mermaid-mindmap-branch-line-1",
    "--mermaid-mindmap-branch-line-2",
    "--mermaid-mindmap-branch-line-3",
    "--mermaid-mindmap-branch-line-4",
    // 思维导图节点底与文字槽：dark/light 等主题经源色表 mindmapHues 覆盖 core 的
    // chart-fill 映射，文字改由 l*-text 直接提供（不再经 chart-text-on-fill 链）。
    // 这批 token 必须入签名——否则改源色表重生成后签名不变，缓存继续复用旧 SVG
    // （「重启后还是老样子」即此因，与 BUG-077 的缓存坑同源）
    "--mermaid-mindmap-center-bg",
    "--mermaid-mindmap-center-text",
    "--mermaid-mindmap-branch-0",
    "--mermaid-mindmap-branch-1",
    "--mermaid-mindmap-branch-2",
    "--mermaid-mindmap-branch-3",
    "--mermaid-mindmap-branch-4",
    "--mermaid-mindmap-l1-text",
    "--mermaid-mindmap-l2-text",
    "--mermaid-mindmap-l3-text",
    "--mermaid-mindmap-l4-text",
    // 思维导图节点文字直接消费 text-on-fill（经 l*-text 链），入签名保证缓存正确失效
    "--chart-text-on-fill-0",
    "--chart-text-on-fill-1",
    "--chart-text-on-fill-2",
    "--chart-text-on-fill-3",
    "--chart-text-on-fill-4",
    "--chart-text-on-fill-5",
    "--chart-text-on-fill-6",
    "--chart-text-on-fill-7",
    // Mermaid Sequence
    "--mermaid-sequence-actor-bg",
    "--mermaid-sequence-actor-border",
    "--mermaid-sequence-actor-text",
    "--mermaid-sequence-signal",
    "--mermaid-sequence-note-bg",
    "--mermaid-sequence-note-text",
    // Mermaid Gantt
    "--mermaid-gantt-section-bg",
    "--mermaid-gantt-task-bg",
    "--mermaid-gantt-task-border",
    "--mermaid-gantt-task-text",
    "--mermaid-gantt-milestone-bg",
    "--mermaid-gantt-milestone-border",
    // Mermaid Pie
    "--mermaid-pie-0",
    "--mermaid-pie-1",
    "--mermaid-pie-2",
    "--mermaid-pie-3",
    "--mermaid-pie-4",
    "--mermaid-pie-5",
    // Mermaid ER
    "--mermaid-er-entity-bg",
    "--mermaid-er-entity-border",
    "--mermaid-er-entity-text",
    "--mermaid-er-attribute-bg",
    "--mermaid-er-attribute-text",
    "--mermaid-er-relationship",
    // Mermaid Git
    "--mermaid-git-branch-0",
    "--mermaid-git-branch-1",
    "--mermaid-git-branch-2",
    "--mermaid-git-branch-3",
    "--mermaid-git-commit",
    "--mermaid-git-commit-border",
    "--mermaid-git-label-bg",
    "--mermaid-git-label-text",
    "--mermaid-git-tag-bg",
    "--mermaid-git-tag-text",
    // Mermaid Timeline
    "--mermaid-timeline-cscale-0",
    "--mermaid-timeline-cscale-1",
    "--mermaid-timeline-cscale-2",
    "--mermaid-timeline-cscale-3",
    "--mermaid-timeline-label",
    // Mermaid Sankey
    "--mermaid-sankey-node-bg",
    "--mermaid-sankey-node-border",
    "--mermaid-sankey-node-text",
    // Mermaid XY Chart
    "--mermaid-xychart-bg",
    "--mermaid-xychart-title",
    "--mermaid-xychart-label",
    "--mermaid-xychart-grid",
    "--mermaid-xychart-border",
    "--mermaid-xychart-plot-0",
    "--mermaid-xychart-plot-1",
    "--mermaid-xychart-plot-2",
    "--mermaid-xychart-plot-3",
    "--mermaid-xychart-plot-4",
    // Mermaid Requirement
    "--mermaid-requirement-bg",
    "--mermaid-requirement-text",
    "--mermaid-requirement-border",
    "--mermaid-requirement-element-bg",
    "--mermaid-requirement-element-text",
    "--mermaid-requirement-element-border",
    // Mermaid Quadrant
    "--mermaid-quadrant-bg",
    "--mermaid-quadrant-title",
    "--mermaid-quadrant-axis-label",
    "--mermaid-quadrant-axis-line",
    "--mermaid-quadrant-divider",
    "--mermaid-quadrant-point-0",
    "--mermaid-quadrant-point-1",
    "--mermaid-quadrant-point-2",
    "--mermaid-quadrant-point-3",
    "--mermaid-quadrant-point-4",
    "--mermaid-quadrant-point-5",
    // Mermaid ZenUML
    "--mermaid-zenuml-text",
    "--mermaid-zenuml-border",
    "--mermaid-zenuml-bg",
    "--mermaid-zenuml-lifeline",
    "--mermaid-zenuml-message",
    // Mermaid Block
    "--mermaid-block-text",
    "--mermaid-block-bg",
    "--mermaid-block-border",
    "--mermaid-block-line",
    // Mermaid Packet
    "--mermaid-packet-text",
    // Mermaid Kanban
    "--mermaid-kanban-text",
    "--mermaid-kanban-column-bg",
    "--mermaid-kanban-card-bg",
    "--mermaid-kanban-card-border",
    "--mermaid-kanban-divider",
    // Mermaid Architecture
    "--mermaid-architecture-text",
    "--mermaid-architecture-group-bg",
    "--mermaid-architecture-service-bg",
    "--mermaid-architecture-border",
    "--mermaid-architecture-line",
    // Mermaid Radar
    "--mermaid-radar-curve-0",
    "--mermaid-radar-curve-1",
    "--mermaid-radar-curve-2",
    "--mermaid-radar-curve-3",
    "--mermaid-radar-curve-4",
    // Mermaid Event Modeling
    "--mermaid-eventmodeling-text",
    "--mermaid-eventmodeling-data-bg",
    "--mermaid-eventmodeling-data-border",
    "--mermaid-eventmodeling-line",
    // Mermaid Treemap
    "--mermaid-treemap-text",
    "--mermaid-treemap-group-bg",
    "--mermaid-treemap-leaf-0",
    "--mermaid-treemap-leaf-1",
    "--mermaid-treemap-leaf-2",
    "--mermaid-treemap-leaf-3",
    "--mermaid-treemap-leaf-4",
    "--mermaid-treemap-leaf-5",
    "--mermaid-treemap-border",
    // Mermaid Venn
    "--mermaid-venn-text",
    "--mermaid-venn-set-0",
    "--mermaid-venn-set-1",
    "--mermaid-venn-set-2",
    "--mermaid-venn-set-3",
    "--mermaid-venn-border",
    // Mermaid Ishikawa
    "--mermaid-ishikawa-text",
    "--mermaid-ishikawa-cause-bg",
    "--mermaid-ishikawa-effect-bg",
    "--mermaid-ishikawa-border",
    "--mermaid-ishikawa-line",
    // Mermaid Wardley
    "--mermaid-wardley-text",
    "--mermaid-wardley-node-bg",
    "--mermaid-wardley-node-border",
    "--mermaid-wardley-line",
    "--mermaid-wardley-bg",
    // Mermaid TreeView
    "--mermaid-treeview-label",
    "--mermaid-treeview-description",
    "--mermaid-treeview-line",
    "--mermaid-treeview-icon",
    "--mermaid-treeview-bg",
    "--mermaid-treeview-highlight-bg",
    "--mermaid-treeview-highlight-stroke",
    // Accent 色（用于 fallback）
    "--accent-cyan",
    "--accent-pink",
    "--accent-purple",
    "--accent-green",
    "--accent-yellow",
    "--accent-orange",
    "--accent-red",
    // 基础变量
    "--bg-sidebar",
    "--bg-tertiary",
  ];
  const values = cssVars.map((v) => getCSSVar(v, ""));
  return values.join("|");
}

/**
 * Packet SVG 后处理：基于真实 class 名称修复暗色主题可读性
 * Mermaid 11.14.0 Packet 真实 class:
 *   .packetBlock    - 字段矩形背景
 *   .packetLabel    - 字段名称文本
 *   .packetByte     - bit 编号文本
 *   .packetTitle    - 标题文本
 */
function patchPacketSvg(svg: string): string {
  if (!svg.includes('aria-roledescription="packet"')) {
    return svg;
  }

  const idMatch = svg.match(/<svg[^>]*\sid="([^"]+)"/);
  const svgId = idMatch?.[1];

  if (!svgId) {
    return svg;
  }

  const selector = `#${svgId}`;

  const packetPatchStyle = `
<style>
${selector} .packetBlock {
  fill: var(--mermaid-packet-block-bg, var(--bg-tertiary, #262630)) !important;
  stroke: var(--mermaid-packet-block-border, var(--mermaid-edge, #808080)) !important;
  stroke-width: 1px !important;
}

${selector} .packetLabel {
  fill: var(--mermaid-packet-label-text, var(--text-primary, #E0E0E0)) !important;
  font-size: 12px !important;
}

${selector} .packetByte,
${selector} .packetByte.start,
${selector} .packetByte.end {
  fill: var(--mermaid-packet-byte-text, var(--text-primary, #E0E0E0)) !important;
  font-size: 10px !important;
}

${selector} .packetTitle {
  fill: var(--mermaid-packet-title-text, var(--text-primary, #E0E0E0)) !important;
  font-size: 14px !important;
}
</style>`;

  return svg.replace("</style>", `</style>${packetPatchStyle}`);
}

const UNSUPPORTED_DIAGRAM_TYPES = new Set<string>([]);

const MermaidDiagram: React.FC<MermaidDiagramProps> = memo(
  ({ chart, onEdit }) => {
    const [svgHtml, setSvgHtml] = useState("");
    const [error, setError] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const lastContextMenuTime = useRef(0);
    const { getResolvedTheme } = useTheme();
    const { t } = useTranslation();
    const exportMode = useReaderStore((s) => s.exportMode);
    // 思维导图布局偏好（radial=发散放射 / tree=层级树），旧持久化数据由 merge 兜底
    const mindmapLayout =
      useSettingsStore((s) => s.readingSettings.mindmapLayout) ?? "radial";
    // 思维导图样式偏好（depth=按层级分色，默认 / brand=按分支分色 / outline=素雅描边 / classic=经典）
    const mindmapStyle =
      useSettingsStore((s) => s.readingSettings.mindmapStyle) ?? "depth";

    const resolvedTheme = getResolvedTheme();

    const themeSignature = getMermaidThemeSignature();
    const cacheKey = JSON.stringify({
      theme: resolvedTheme,
      signature: themeSignature,
      chart,
      // 思维导图布局参与缓存键：切换布局后旧 SVG 立即失效重渲染
      mindmapLayout,
      // 思维导图样式参与缓存键：切换样式后旧 SVG 立即失效重渲染
      mindmapStyle,
      // v40：Cynefin/象限四分区底色换主题状态色 + 文字色按对比度自动选取
      // v41：gitgraph 分支线/提交点改用品牌系列色（chart-series-0~7，主分支橙）
      // 消除「青色/错色」并强化品牌识别；requirement 关系线改品牌橙；象限图与
      // Cynefin 五域在暗色主题下把状态色填充向画布加深 ~45%，白字达 AA 对比度
      // v48：mindmap depth 档字号层级递增（中心最大逐级递减）；hover 覆盖扩至
      // sequence actor / journey / xychart / packet / radar / eventmodeling /
      // treemap / ishikawa / cynefin 等类型，渲染产物变化，作废旧键
      // v47：晨光（light）mindmap 层级色板改用状态色 -fill 亮版（与夜灯的深版
      // 区分开），渲染产物变化，作废旧键
      // v46：晨光/夜灯定制 mindmap「品牌色+状态色」层级色板（源色表 mindmapHues），
      // 渲染产物变化；同时把 mindmap 节点底/文字 token 纳入 themeSignature，
      // 今后改这批 token 会自动失效缓存，不必再依赖手动 bump
      // v45：思维导图默认档改为「按层级分色」（depth，colorBy='depth'），
      // 与 brand 档「按分支分色」并列；渲染产物变化，作废旧键
      // v44：思维导图回归 token 契约——brand 档节点底改 chart-fill、文字改
      // chart-text-on-fill（取消逐节点深度混色与内联取墨），渲染产物变化，作废旧键
      // v43：思维导图文字改「内联 text-on-fill」（BUG-077），渲染产物结构变化
      // （文字元素带内联 color/fill），必须作废旧键——否则缓存命中会直接复用
      // 修复前的白字 SVG，后处理整段被跳过（前三轮修复"无变化"的根因）
      // v42：思维导图新增「样式」偏好（brand=强调色实底 / depth=层级渐变 /
      // outline=素雅描边 / classic=经典）；brand 逐分支高饱和实底 + 层级向画布
      // 渐变 + 隐藏下划线；depth 走 mermaid 原生 colorBy=depth 单色明度推进
      // v40：Cynefin/象限四分区底色换主题状态色 + 文字色按对比度自动选取
      // v39：全类型 themeVariables 键名换正（BUG-070 批量死键清理，含 ER
      // v38 的同一根因；edgeLabelBackground 全局生效修复连线标签黑底）
      // v38：ER 主题注入换 mermaid ≥11 v2 渲染器官方键（entityBkg 系旧键
      // 在 12.2.0 中已不存在，v37 及以前缓存的是默认配色），作废旧键
      // v37：mermaid 12 升级轮。v36 及以前的缓存可能含 neo 外观的 drop-shadow
      // 残留（未钉 look 时渲染产出），升版一次性作废旧键（BUG-065）
      // v49：① 饼图去黑色描边（pieStrokeWidth:0）；② hover 淡出规则加 !important
      // （治饼图 .pieCircle{opacity:0.7} 的 #id 作用域覆盖）+ 悬停项显式 opacity:1；
      // ③ 补沃德利地图组件节点 hover（g.wardley-node，此前漏加）；渲染产物变化，作废旧键
      // v50：多图去黑描边——旅程图 actor 圆、架构图服务节点（.node-bkg）、C4 关系线
      // （path:not([class])）、treemap 矩形（treemapLeaf/treemapSection，此前后处理误用
      // kebab 类致空操作）；均 mermaid 无 themeVariables 键可注入、回落默认近黑，改用
      // !important 后处理覆盖；渲染产物变化，作废旧键
      // v51：① 回退 Git 合并箭头后处理（path[class*="arrow"] 是上轮回归——误覆盖分支色
      // 并 fill 填充弧线，箭头本就由 themeVariables.gitN 着色）；② 桑基 colorScheme 硬编码
      // Tableau10 不读主题，后处理全局映射到 chart-series；③ 主题切换清空渲染缓存兜底；
      // 渲染产物变化，作废旧键
      // v52：① 甘特任务条底色 chart-fill-0→chart-series-0（品牌主色，高识别度，彻底解决
      // 任务条融进分区、全主题发模糊）+ 条上文字按填充算对比色；② 桑基深色主题流量发虚
      // 真因是 mermaid 默认 .link{mix-blend-mode:multiply}——深色底上相乘成更暗近不可见，
      // 深色主题改 normal + stroke-opacity 0.85；渲染产物变化，作废旧键
      // v53：甘特任务条/里程碑色改 JS 直读 --chart-series-0/1（不再经 mermaid-gantt.css 的
      // --mermaid-gantt-task-bg 间接映射——该 CSS 映射在 HMR/缓存场景可能不随 JS 热更新，
      // 致任务条回落旧值 chart-surface-1 呈「大黑条」；直读 chart-series 与 git/sankey 同源、
      // 确认随主题最新）；渲染产物变化，作废旧键
      // v54：甘特 section 行底色同样改 JS 直读 --chart-surface-3 + 后处理强制 rect.section
      // 填充（globals.css 的 html:not([data-theme]) 兜底块把 --mermaid-gantt-section-bg
      // 硬编码为深色 #16162A，时序/缓存下会读到兜底值致 section 行变黑）；渲染产物变化，作废旧键
      // v55：甘特去黑的「全场兜底」错误方案已删除（见 v56，系误诊）
      // v56：甘特「全主题大黑条」真根因——注入 <style> 的 CSS 里误写了双斜杠注释。
      // CSS 不认 // 注释，它会把「// 网格…」连同后面的选择器一起当作非法选择器，
      // 整条规则被丢弃；更糟的是解析器错位会吞掉 mermaid 原有样式，section 矩形失去
      // 填充规则后回落 SVG 默认 fill:black → 与主题无关、全主题呈「大黑条」（v54/v55
      // 针对性覆盖 section/rect 全部无效即因此，规则本身也被吞）。现把该注释改为 CSS
      // 合法的 斜杠星号 注释，并删除 v55 的 rect 全场兜底与 svg 背景透明（误诊产物，
      // 且 rect{fill} 会抹平 section 交替底色）。实测：黑色 rect 4→0，网格线规则恢复生效。
      // 【教训】所有 svg.replace("<style>", ...) 注入的 CSS 一律只能用 /* */ 注释。
      // v57：修复「切主题后个别图表不刷新、要按 F5」（典型症状：思维导图根节点只剩边框/
      // 近白色，即 git0 取到了 chart-fill-0 而非 center-bg）。根因是 cacheKey 里的
      // themeSignature 在**渲染期**计算，而 data-theme 由 useTheme 的 useLayoutEffect 应用，
      // React 渲染早于 layout effect → 签名仍是旧主题 → 命中上一主题缓存直接返回不重渲染。
      // 修法：渲染 effect 内先校验 data-theme 是否已同步（未同步则 rAF 延后一帧重试，上限 3 次），
      // 再用实时 getMermaidThemeSignature() 重算并替换缓存键后查/存缓存。
      // v58：① 上述「等待重试」改为**主动同步** data-theme（重试 3 次后会放弃、仍用旧 CSS
      // 渲染，是遗留的偶发窗口）；② 桑基给通用渐变 id 加 svg 唯一前缀（多图同页时编号撞车
      // 会让 url(#linearGradient-N) 指向失效定义，实测同页两图未复现，作预防性加固）；
      // ③ 桑基兜底色防 pieColors 空数组除零（会替换成 "undefined" 使渐变失效）；
      // ④ 桑基连线保底降级——Tableau 替换后若仍残留 Tableau 色或 url(#id) 引用悬空，
      // 强制给 path 明确主题 stroke，避免渐变失效导致 SVG 整条线不渲染（观感「连线没有」）。
      // v59：修复看板图（kanban）暗色主题卡片白底白字——mermaid 给普通卡片的
      // rect.label-container 硬编码近白底（≈#f4f4f4），无 themeVariables 键可注入，而卡片
      // 文字继承 textColor（暗色主题为浅色）→ 白底白字不可读（列头有 cScaleN 故正常）。
      // 新增 kanban 后处理：强制卡片底为 cardBg、卡片文字按 text 取色。
      // 渲染产物变化，作废旧键
      // v60：修复「思维导图中心色块丢失只剩描边、子节点全带橙色描边」（阅读与导出均中招，
      // 导出是全量渲染故必然复现）。真根因不是主题/缓存，而是**注入样式跨图污染**：
      // HTML 的 <style> 无论写在 DOM 哪个位置都对整个文档生效，而我们手工注入的规则
      // 是裸选择器——流程图的 `.node rect/.node circle/.node polygon{fill:白 !important;
      // stroke:品牌色}` 会命中思维导图（mindmap 节点 group 同样带 .node 类），把中心圆
      // 压成白底；架构图的 `.node-bkg{stroke:品牌色}` 会给思维导图所有子节点加橙描边。
      // （这也解释了 v57 那条「切主题/F5 才对」的悬案：虚拟滚动下流程图未渲染时不污染，
      // 一渲染或导出全量渲染就中招。）修法：新增 injectSvgStyle/scopeInjectedCss，把全部
      // 手工注入对齐到 mermaid 自身的 `#<svgId>` 作用域口径。渲染产物变化，作废旧键
      // v61：思维导图实心底档（brand/depth）去掉节点中性描边（用户实机：子节点全带描边）。
      // 渲染产物变化，作废旧键
      // v62：修复 hover 高亮整体失效——scopeInjectedCss 首版用正则解析选择器，会把 CSS
      // 注释连同后面的 @media 一起当成选择器段，@media 被吞进选择器导致整条规则非法。
      // MERMAID_HOVER_CSS 开头正是注释，故 hover 是第一个受害者（其余注入 CSS 开头无
      // 注释才逃过）。改为扫描式解析（注释原样透传、@media 前置不加前缀）。渲染产物变化
      _version: "v62",
    });

    useEffect(() => {
      // 导出模式：跳过 IntersectionObserver 懒渲染，立即渲染（离屏图表必须进入产物）
      if (exportMode) {
        setIsVisible(true);
        return;
      }
      const el = containerRef.current;
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { rootMargin: "200px 0px" },
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, [exportMode]);

    // 主题切换防御性兜底：resolvedTheme 变化时清空渲染缓存，确保所有图表用新主题
    // 重渲染（缓存键已含 resolvedTheme + themeSignature，理论上切主题即失效；此处
    // 再兜一层，杜绝「切换主题后图表不刷新、需按 F5」的边界情况）。
    // 用 ref 跳过挂载首跑——否则文档内多图表逐个挂载会互相清缓存、初始加载反复重渲染
    const prevResolvedThemeRef = useRef(resolvedTheme);
    useEffect(() => {
      if (prevResolvedThemeRef.current === resolvedTheme) return;
      prevResolvedThemeRef.current = resolvedTheme;
      mermaidCache.clear();
    }, [resolvedTheme]);

    useEffect(() => {
      if (!isVisible) return;

      // ① 主题同步：data-theme 由 useTheme 的 useLayoutEffect 应用，而 React 先渲染、
      // 后跑 layout effect，本 effect 触发时 documentElement 上可能仍是旧主题 → 此后所有
      // getCSSVar 与 isLight 判断都基于旧主题（表现为切换主题后个别图颜色不对、桑基流量
      // 不可见，刷新才恢复）。这里主动同步一次（写相同值无副作用），确保本次渲染读到的
      // 一定是当前主题。相比「等待重试」，主动同步无竞态、无放弃兜底。
      const themeAttr = document.documentElement.getAttribute("data-theme");
      if (themeAttr !== resolvedTheme) {
        document.documentElement.setAttribute("data-theme", resolvedTheme);
      }

      // ② 用实时签名修正缓存键：即便 data-theme 已就绪，cacheKey 仍是渲染期算出的旧签名，
      // 直接使用仍会命中上一主题的缓存。这里按当前 CSS 变量重算签名并替换后再查/存。
      const liveSignature = getMermaidThemeSignature();
      const effectiveCacheKey =
        liveSignature === themeSignature
          ? cacheKey
          : JSON.stringify({ ...JSON.parse(cacheKey), signature: liveSignature });

      const cached = mermaidCache.get(effectiveCacheKey);
      if (cached) {
        setSvgHtml(cached.svgHtml);
        setError(false);
        return;
      }

      let cancelled = false;
      let renderRetryCount = 0;
      if (!svgHtml) setIsLoading(true);

      const queueTask = async () => {
        try {
          await new Promise((resolve) => requestAnimationFrame(resolve));

          if (cancelled) return;

          const colors = getMermaidColors();
          const isLight = isLightTheme(colors.backgroundColor, colors.isLight);

          if (!mermaidModulePromise) {
            mermaidModulePromise = import("mermaid");
          }
          const mermaid = (await mermaidModulePromise).default;

          if (cancelled) return;

          await ensureZenumlRegistered(mermaid);
          await ensureMindmapLrLayout(mermaid);

          const mermaidTheme = "base";

          // ER 曾通过 themeCSS 注入属性行配色；mermaid ≥11 该 DOM 类已移除，
          // 且官方键 attributeBackgroundColorOdd/Even 已覆盖，置空即可
          const erThemeCSS = "";

          const themeVariables = {
            fontFamily: colors.fontFamily,
            fontSize: "16px",
            primaryColor: colors.primaryColor,
            primaryTextColor: colors.primaryTextColor,
            primaryBorderColor: colors.primaryBorderColor,
            lineColor: colors.lineColor,
            secondaryColor: colors.secondaryColor,
            tertiaryColor: colors.tertiaryColor,
            backgroundColor: colors.backgroundColor,
            pie1: colors.pieColors[0],
            pie2: colors.pieColors[1],
            pie3: colors.pieColors[2],
            pie4: colors.pieColors[3],
            pie5: colors.pieColors[4],
            pie6: colors.pieColors[5],
            pieTextColor: colors.pieTextColor,
            // 去掉饼图黑色描边：mermaid 默认 pieStrokeColor:black / pieStrokeWidth:2px，
            // 且最外圈用独立的 pieOuterStrokeColor:black / pieOuterStrokeWidth:2px；
            // 宽度均置 0 彻底移除，颜色兜底设为画布底色
            pieStrokeWidth: "0px",
            pieStrokeColor: colors.backgroundColor,
            pieOuterStrokeWidth: "0px",
            pieOuterStrokeColor: colors.backgroundColor,
            nodeBorder: colors.primaryBorderColor,
            nodeText: colors.primaryTextColor,
            titleColor: colors.primaryTextColor,
            actorBorder: colors.primaryBorderColor,
            actorBg: colors.primaryColor,
            actorTextColor: colors.primaryTextColor,
            signalColor: colors.lineColor,
            decisionBg: colors.primaryColor,
            decisionBorder: colors.primaryBorderColor,
            decisionTextColor: colors.primaryTextColor,
            // 官方键为 edgeLabelBackground（edgeLabelBg/edgeLabelTextColor 在
            // 12.2.0 dist 0 命中，为死键已删）；取画布色让连线标签底融入页面
            edgeLabelBackground: colors.backgroundColor,
            labelBoxBgColor: colors.primaryColor,
            labelTextColor: colors.primaryTextColor,
            classDefBg: colors.primaryColor,
            classDefBorder: colors.primaryBorderColor,
            classDefText: colors.primaryTextColor,
            mainBkg: colors.backgroundColor,
            edgeColor: colors.lineColor,
            nodeBkg: colors.primaryColor,
            nodeTextColor: colors.primaryTextColor,
            mindmapLevel1BgColor: colors.primaryColor,
            mindmapLevel1TextColor: colors.primaryTextColor,
            mindmapLevel2BgColor: colors.secondaryColor,
            mindmapLevel2TextColor: colors.primaryTextColor,
            mindmapLevel3BgColor: colors.tertiaryColor,
            mindmapLevel3TextColor: colors.primaryTextColor,
            timelineGroupBg: colors.primaryColor,
            timelineGroupBorder: colors.primaryBorderColor,
            timelineGroupTextColor: colors.primaryTextColor,
            timelineEventBg: colors.secondaryColor,
            timelineEventBorder: colors.primaryBorderColor,
            timelineEventTextColor: colors.primaryTextColor,
            timelineBackground: colors.backgroundColor,
            timelineLineColor: colors.lineColor,
            timelineLabelColor: colors.primaryTextColor,
            sectionBkgColor: colors.primaryColor,
            sectionLineColor: colors.lineColor,
            taskBkgColor: colors.secondaryColor,
            taskBorderColor: colors.primaryBorderColor,
            taskTextColor: colors.primaryTextColor,
            milestoneBkgColor: colors.primaryColor,
            milestoneBorderColor: colors.primaryBorderColor,
            milestoneTextColor: colors.primaryTextColor,
          };

          const chartType = normalizeChartType(chart);
          const isMindmap = chartType === "mindmap";
          const isTimeline = chartType === "timeline";
          const isXychart = chartType === "xychart";
          const isGitGraph = chartType === "git";
          const isSankey = chartType === "sankey";
          const isRequirement = chartType === "requirement";
          const isFlowchart = chartType === "flowchart";
          const isSequence = chartType === "sequence";
          const isGantt = chartType === "gantt";
          const isClassDiagram = chartType === "class";
          const isStateDiagram = chartType === "state";
          const isErDiagram = chartType === "er";
          const isJourney = chartType === "journey";
          const isC4Context = chartType === "c4";
          const isPieChart = chartType === "pie";
          const isPacket = chartType === "packet";
          const isRadar = chartType === "radar";
          const isTreemap = chartType === "treemap";
          const isBlock = chartType === "block";
          const isKanban = chartType === "kanban";
          const isQuadrant = chartType === "quadrant";
          const isTreeview = chartType === "treeview";
          const isWardley = chartType === "wardley";
          const isVenn = chartType === "venn";
          const isArchitecture = chartType === "architecture";
          const isIshikawa = chartType === "ishikawa";
          const isZenuml = chartType === "zenuml";
          const isEventModeling = chartType === "eventmodeling";
          const isSwimlane = chartType === "swimlane";
          const isUsecase = chartType === "usecase";
          const isCynefin = chartType === "cynefin";

          if (isTimeline) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const timelineColors = colors.charts.timeline;

            // mermaid ≥11 timeline 官方键（12.2.0 dist 实测）：分区 cScaleN/
            // cScaleLabelN（genSections 按 THEME_COLOR_LIMIT 循环）、根节点
            // git0/gitBranchLabel0；只注入 4 槽会漏掉多分区场景
            for (let i = 0; i < 12; i++) {
              vars[`cScale${i}`] =
                timelineColors.cScale[i % timelineColors.cScale.length];
              vars[`cScaleLabel${i}`] =
                timelineColors.cScaleLabel[
                  i % timelineColors.cScaleLabel.length
                ];
            }
            vars.git0 = timelineColors.cScale[0];
            vars.gitBranchLabel0 = timelineColors.cScaleLabel[0];
          }

          if (isMindmap) {
            const vars = themeVariables as any;

            vars.darkMode = isLight ? false : true;

            const mindmapColors = colors.charts.mindmap;
            // 强调色带（高饱和，视觉身份）：各档连线/描边来源
            const saturated = mindmapColors.branchLines;
            // 安全填充带（chart-fill）：brand / depth / classic 的节点底来源
            const branchBg = mindmapColors.branches;
            // 按底色对比度自动取白/深墨（承载文字的填充必须 text-on-fill 绑定）
            // BUG-077：取墨须保底 4.5:1（outline 透明底分支与根节点兜底用）
            const inkFor = (bg: string) => readableTextOnFillStrict(bg);

            // 四档样式分别确定 cScale（节点底）/ cScaleLabel（文字）/ cScaleInv+lineColor（下划线/连线）
            let fillSlots: string[];
            let textSlots: string[];
            let lineSlots: string[];

            if (mindmapStyle === "outline") {
              // 透明底 + 彩色描边/文字，下划线由后处理消隐
              fillSlots = saturated.map(() => "transparent");
              textSlots = saturated.slice();
              lineSlots = saturated;
            } else if (mindmapStyle === "depth") {
              // 按层级分色（默认档）：同层级同色、层级间色相递进，符合思维导图
              // 「层级即分类」的常规读法。colorBy='depth' 下 mermaid 把 section 按
              // 层级分配，节点底取 cScale(depth-1)、连线取 cScaleInv(depth-1)。
              // 与 brand 档共用同一套 token 色板，唯一区别是映射依据：
              // brand 按分支、depth 按层级
              fillSlots = branchBg.slice();
              textSlots = [
                mindmapColors.centerText,
                mindmapColors.level1Text,
                mindmapColors.level2Text,
                mindmapColors.level3Text,
                mindmapColors.level4Text,
              ];
              lineSlots = saturated;
            } else if (mindmapStyle === "classic") {
              // 低饱和底 + 彩色下划线（历史默认观感）；注意 branches 含 5 槽且与 branchLines 等长
              fillSlots = branchBg.slice();
              textSlots = [
                mindmapColors.centerText,
                mindmapColors.level1Text,
                mindmapColors.level2Text,
                mindmapColors.level3Text,
                mindmapColors.level4Text,
              ];
              lineSlots = saturated;
            } else {
              // brand（默认）：分支定色相 —— 节点底取 chart-fill（契约里承载文字的
              // 安全填充），文字取同索引 chart-text-on-fill（生成器按「每底色绑定
              // 最优墨色」配对并保 ≥4.5:1）；连线取 chart-stroke 保留主题视觉身份。
              // 曾在此把 chart-stroke（霓虹主题即纯 #00FFFF/#FF00FF）当大面积实底，
              // 高饱和主题下刺眼；层级明度交给 depth 档（原生 colorBy='depth'），
              // 此处不再自行混色，避免破坏 fill × text-on-fill 的配对关系
              fillSlots = branchBg.slice();
              textSlots = [
                mindmapColors.centerText,
                mindmapColors.level1Text,
                mindmapColors.level2Text,
                mindmapColors.level3Text,
                mindmapColors.level4Text,
              ];
              lineSlots = saturated;
            }

            // 根节点：brand/classic 用 center 槽（chart-fill-0 × chart-text-on-fill-0
            // 配对，与品牌档分支底色同源，避免霓虹类主题拿纯 #00FFFF 当实底刺眼）；
            // 根节点：brand/depth/classic 统一用 center 槽（chart-fill-0 ×
            // chart-text-on-fill-0 配对），霓虹类主题不拿纯 #00FFFF 当实底；
            // outline 透明底保留彩色描边/文字
            const rootFill =
              mindmapStyle === "outline"
                ? "transparent"
                : mindmapColors.centerColor;
            vars.git0 = rootFill;
            vars.gitBranchLabel0 =
              mindmapStyle === "outline"
                ? inkFor(rootFill)
                : mindmapColors.centerText;

            for (let i = 0; i < 12; i++) {
              const slot = i % fillSlots.length;
              vars[`cScale${i}`] = fillSlots[slot];
              vars[`cScaleLabel${i}`] = textSlots[slot];
              vars[`cScaleInv${i}`] = lineSlots[slot];
              vars[`lineColor${i}`] = lineSlots[slot];
            }

            vars.textColor = colors.primaryTextColor;
            vars.mindmapTextColor = colors.primaryTextColor;
            vars.mindmapSecondaryColor = colors.primaryColor;
          }

          if (isXychart) {
            const vars = themeVariables as any;
            const xychartColors = colors.charts.xychart;

            vars.darkMode = isLight ? false : true;
            vars.xyChart = {};

            vars.backgroundColor = xychartColors.backgroundColor;
            vars.textColor = xychartColors.labelColor;
            vars.lineColor = colors.lineColor;
            vars.primaryColor = colors.primaryColor;
            vars.secondaryColor = colors.secondaryColor;
            vars.gridColor = xychartColors.gridColor;
            vars.borderColor = xychartColors.borderColor;

            vars.xyChart.backgroundColor = xychartColors.backgroundColor;
            vars.xyChart.titleColor = xychartColors.titleColor;
            vars.xyChart.dataLabelColor = xychartColors.labelColor;
            vars.xyChart.xAxisLabelColor = xychartColors.labelColor;
            vars.xyChart.xAxisTitleColor = xychartColors.titleColor;
            vars.xyChart.xAxisTickColor = colors.lineColor;
            vars.xyChart.xAxisLineColor = colors.lineColor;
            vars.xyChart.yAxisLabelColor = xychartColors.labelColor;
            vars.xyChart.yAxisTitleColor = xychartColors.titleColor;
            vars.xyChart.yAxisTickColor = colors.lineColor;
            vars.xyChart.yAxisLineColor = colors.lineColor;
            vars.xyChart.plotColorPalette = xychartColors.plotColors.join(", ");
          }

          if (isGitGraph) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const gitgraphColors = colors.charts.gitgraph;

            // mermaid ≥11 gitgraph 官方键（12.2.0 dist 实测）：分支线与提交点
            // git0..7、分支标签文字 gitBranchLabel0..7、提交标签 commitLabelColor/
            // commitLabelBackground、tagLabel*。分支线/提交点统一走品牌系列色
            // （chart-series-0..7），避免落回中性 chart-edge 或 mermaid 默认青色，
            // 直接对齐「品牌色识别」诉求；commitNodeColor 已删除（提交点由后处理
            // 统一压成 commitNodeColor/chart-stroke-0，保持与分支同族）
            for (let i = 0; i < 8; i++) {
              vars[`git${i}`] = getCSSVar(
                `--chart-series-${i}`,
                gitgraphColors.branchColors[i % 4],
              );
            }
            for (let i = 0; i < 8; i++) {
              vars[`gitBranchLabel${i}`] = gitgraphColors.branchLabelColor;
            }
            vars.commitLabelColor = gitgraphColors.commitLabelColor;
            vars.commitLabelBackground = gitgraphColors.commitLabelBg;
            vars.tagLabelColor = gitgraphColors.tagLabelColor;
            vars.tagLabelBackground = gitgraphColors.tagLabelBg;
            vars.tagLabelBorder = gitgraphColors.tagLabelBorder;
          }

          if (isSankey) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const sankeyColors = colors.charts.sankey;

            // mermaid ≥11 sankey 官方主题键仅 textColor（标签文字）与 mainBkg
            // （标签光晕描边，12.2.0 dist 实测）；节点/流量带颜色由 config.sankey
            // 控制（无 themeVariables 键），sankeyNodeBkgColor 系为死键已删
            vars.textColor = sankeyColors.nodeTextColor;
            vars.mainBkg = sankeyColors.nodeBkgColor;
          }

          if (isRequirement) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const requirementColors = colors.charts.requirement;

            // mermaid ≥11 requirement 官方键（12.2.0 dist 实测）：requirementBackground/
            // requirementBorderColor/requirementTextColor、关系线 relationColor、
            // 关系标签 relationLabelBackground/relationLabelColor、edgeLabelBackground；
            // requirementBkgColor/elementBkgColor 系为死键已删（元素框由统一渲染器
            // shapes 着色，走 mainBkg/nodeBorder/nodeTextColor）
            vars.requirementBackground = requirementColors.requirementBkg;
            vars.requirementTextColor = requirementColors.requirementText;
            vars.requirementBorderColor = requirementColors.requirementBorder;
            vars.mainBkg = requirementColors.elementBkg;
            vars.nodeBorder = requirementColors.elementBorder;
            vars.nodeTextColor = requirementColors.elementText;
            // 关系线走品牌系列色（chart-series-0 橙）而非中性 lineColor，避免落回
            // mermaid 默认关系色被用户识别为「青色」；关系标签随文字色保证可读
            vars.relationColor = getCSSVar(
              "--chart-series-0",
              colors.lineColor,
            );
            vars.relationLabelBackground = requirementColors.elementBkg;
            vars.relationLabelColor = requirementColors.elementText;
            vars.edgeLabelBackground = colors.backgroundColor;
          }

          if (isFlowchart && colors.charts.flowchart) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const flowchartColors = colors.charts.flowchart;

            vars.nodeBorder = flowchartColors.nodeBorder;
            vars.nodeText = flowchartColors.nodeText;
            vars.edgeColor = flowchartColors.edgeColor;
            // 官方键 edgeLabelBackground（nodeBg/edgeLabelBg/edgeLabelTextColor
            // 为死键已删，标签文字色由下方 SVG 后处理兜底）
            vars.edgeLabelBackground = flowchartColors.edgeLabelBg;
            vars.subgraphBorderColor = flowchartColors.subgraphBorderColor;
            vars.subgraphBgColor = "transparent";
          }

          if (isSequence && colors.charts.sequence) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const sequenceColors = colors.charts.sequence;

            vars.actorBg = sequenceColors.actorBg;
            vars.actorBorder = sequenceColors.actorBorder;
            vars.actorTextColor = sequenceColors.actorText;
            vars.signalColor = sequenceColors.signalColor;
            vars.noteBg = sequenceColors.noteBg;
            vars.noteTextColor = sequenceColors.noteText;
          }

          if (isGantt) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;

            if (colors.charts.gantt) {
              const ganttColors = colors.charts.gantt;
              vars.sectionBkgColor = ganttColors.sectionBg;
              vars.sectionLineColor = ganttColors.sectionLine;
              vars.taskBkgColor = ganttColors.taskBg;
              vars.taskBorderColor = ganttColors.taskBorder;
              vars.taskTextColor = ganttColors.taskText;
              vars.milestoneBkgColor = ganttColors.milestoneBg;
              vars.milestoneBorderColor = ganttColors.milestoneBorder;
              vars.milestoneTextColor = ganttColors.milestoneText;
            } else {
              vars.sectionBkgColor = colors.tertiaryColor;
              vars.sectionLineColor = colors.lineColor;
              vars.taskBkgColor = colors.primaryColor;
              vars.taskBorderColor = colors.primaryBorderColor;
              vars.taskTextColor = colors.primaryTextColor;
              vars.milestoneBkgColor = colors.primaryColor;
              vars.milestoneBorderColor = colors.primaryBorderColor;
              vars.milestoneTextColor = colors.primaryTextColor;
            }

            vars.textColor = colors.primaryTextColor;
            vars.primaryTextColor = colors.primaryTextColor;
          }

          if (isClassDiagram && colors.charts.classDiagram) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const classDiagramColors = colors.charts.classDiagram;

            vars.classDefBg = classDiagramColors.classBg;
            vars.classDefBorder = classDiagramColors.classBorder;
            vars.classDefText = classDiagramColors.classText;
          }

          if (isStateDiagram && colors.charts.stateDiagram) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const stateDiagramColors = colors.charts.stateDiagram;

            vars.stateBkg = stateDiagramColors.stateBg;
            vars.stateBorder = stateDiagramColors.stateBorder;
            vars.stateTextColor = stateDiagramColors.stateText;
            vars.transitionColor = stateDiagramColors.transitionColor;
          }

          if (isErDiagram && colors.charts.erDiagram) {
            const vars = themeVariables as any;
            const erDiagramColors = colors.charts.erDiagram;

            vars.darkMode = isLight ? false : true;

            // mermaid ≥11 的 ER v2 渲染器官方键（12.2.0 dist 实测，
            // entityBkg/entityBorder/entityTextColor/relationshipColor 为
            // v10 旧键，注入无效）：
            // 实体框 mainBkg/nodeBorder；属性行 attributeBackgroundColorOdd/Even；
            // 关系线 lineColor；标签底 tertiaryColor/edgeLabelBackground；
            // 文字 textColor/nodeTextColor/titleColor
            vars.mainBkg = erDiagramColors.entityBg;
            vars.nodeBorder = erDiagramColors.entityBorder;
            vars.attributeBackgroundColorOdd = erDiagramColors.attributeBg;
            vars.attributeBackgroundColorEven = erDiagramColors.attributeBgAlt;
            vars.lineColor = erDiagramColors.relationshipColor;
            vars.edgeColor = erDiagramColors.relationshipColor;
            vars.edgeLabelBackground = colors.primaryColor;
            vars.textColor = erDiagramColors.attributeText;
            vars.nodeTextColor = erDiagramColors.entityText;
            vars.titleColor = erDiagramColors.entityText;
          }

          if (isJourney && colors.charts.journey) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const journeyColors = colors.charts.journey;

            // mermaid ≥11 journey 官方键（12.2.0 dist 实测 journeyDiagram 样式模板）：
            // 分区/任务 fillType0..7（可透传覆盖，缺省自 primary/secondary 派生）、
            // 人物 actor0..3、脸谱底 faceColor、节点 mainBkg/nodeBorder、
            // 文字 textColor/titleColor、连线 lineColor；journeyBkg 等为死键已删
            for (let i = 0; i < 8; i++) {
              const series = getCSSVar(
                `--chart-series-${i}`,
                journeyColors.fillColor,
              );
              vars[`fillType${i}`] = series;
              vars[`actor${i}`] = series;
            }
            vars.faceColor = colors.backgroundColor;
            vars.mainBkg = journeyColors.journeyBg;
            vars.nodeBorder = journeyColors.journeyBorder;
            vars.lineColor = colors.lineColor;
            vars.edgeColor = colors.lineColor;
            vars.edgeLabelBackground = colors.backgroundColor;
            vars.textColor = journeyColors.journeyText;
            vars.titleColor = journeyColors.journeyText;
          }

          if (isC4Context && colors.charts.c4) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const c4Colors = colors.charts.c4;

            vars.c4PersonBkg = c4Colors.personBg;
            vars.c4PersonBorder = c4Colors.personBorder;
            vars.c4PersonTextColor = c4Colors.personText;
            vars.c4SystemBkg = c4Colors.systemBg;
            vars.c4SystemBorder = c4Colors.systemBorder;
            vars.c4SystemTextColor = c4Colors.systemText;
            vars.c4ContainerBkg = c4Colors.containerBg;
            vars.c4ContainerBorder = c4Colors.containerBorder;
            vars.c4ContainerTextColor = c4Colors.containerText;
            vars.c4ComponentBkg = c4Colors.componentBg;
            vars.c4ComponentBorder = c4Colors.componentBorder;
            vars.c4ComponentTextColor = c4Colors.componentText;
          }

          if (isRadar && colors.charts.radar) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const radarColors = colors.charts.radar;

            vars.cScale0 = radarColors.curve0;
            vars.cScale1 = radarColors.curve1;
            vars.cScale2 = radarColors.curve2;
            vars.cScale3 = radarColors.curve3;
            vars.cScale4 = radarColors.curve4;
          }

          if (isTreemap && colors.charts.treemap) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const treemapColors = colors.charts.treemap;

            // mermaid ≥11 treemap 官方键（12.2.0 dist 实测）：层级填充 cScale0..7
            // （渲染器按深度取槽位）、文字 textColor/titleColor；
            // treemapLeaf0Color 系为死键已删。矩形上承载文字 → text-on-fill 配对
            for (let i = 0; i < 8; i++) {
              vars[`cScale${i}`] = getCSSVar(
                `--chart-series-${i}`,
                treemapColors.leaf0,
              );
              vars[`cScaleLabel${i}`] = getCSSVar(
                `--chart-text-on-fill-${i}`,
                treemapColors.text,
              );
            }
            vars.textColor = treemapColors.text;
            vars.titleColor = treemapColors.text;
          }

          if (isBlock && colors.charts.block) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const blockColors = colors.charts.block;

            // mermaid ≥11 block 官方键 = 通用组（12.2.0 dist 实测）：mainBkg/
            // nodeBorder/textColor/nodeTextColor/titleColor/lineColor/
            // arrowheadColor/edgeLabelBackground/clusterBkg/clusterBorder；
            // blockBkgColor 系为死键已删
            vars.mainBkg = blockColors.bg;
            vars.nodeBorder = blockColors.border;
            vars.textColor = blockColors.text;
            vars.nodeTextColor = blockColors.text;
            vars.titleColor = blockColors.text;
            vars.lineColor = blockColors.line;
            vars.edgeColor = blockColors.line;
            vars.arrowheadColor = blockColors.line;
            vars.edgeLabelBackground = colors.backgroundColor;
            vars.clusterBkg = blockColors.bg;
            vars.clusterBorder = blockColors.border;
          }

          if (isKanban && colors.charts.kanban) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const kanbanColors = colors.charts.kanban;

            // mermaid ≥11 kanban 官方键与 timeline 同族（12.2.0 dist 实测）：
            // 列头 cScaleN/cScaleLabelN（genSections）、根卡片 git0/gitBranchLabel0、
            // 文字 textColor；kanbanColumnBkgColor 系为死键已删。
            // 节点背景走 chart-fill × text-on-fill 配对（同思维导图硬指标）
            for (let i = 0; i < 12; i++) {
              vars[`cScale${i}`] = getCSSVar(
                `--chart-fill-${i % 8}`,
                kanbanColors.cardBg,
              );
              vars[`cScaleLabel${i}`] = getCSSVar(
                `--chart-text-on-fill-${i % 8}`,
                kanbanColors.text,
              );
              vars[`cScaleInv${i}`] = kanbanColors.cardBorder;
            }
            vars.git0 = kanbanColors.columnBg;
            vars.gitBranchLabel0 = kanbanColors.text;
            vars.textColor = kanbanColors.text;
          }

          if (isQuadrant && colors.charts.quadrant) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const quadrantColors = colors.charts.quadrant;

            // mermaid ≥11 quadrant 官方键（12.2.0 dist 实测）：四象限 quadrant1-4Fill/
            // quadrant1-4TextFill、散点 quadrantPointFill/quadrantPointTextFill、
            // 轴文字 quadrantXAxisTextFill/quadrantYAxisTextFill、标题 quadrantTitleFill、
            // 边框 quadrantInternalBorderStrokeFill/quadrantExternalBorderStrokeFill；
            // quadrantBkgColor 系为死键已删。四象限底色取主题状态色
            // （绿/蓝/红/黄，用户 2026-10-19 拍板，对齐官方 Cynefin 语义：
            // 1=左上 2=右上 3=左下 4=右下），象限文字按对比度自动取白/深墨。
            // 暗色主题下状态色为中亮色，白字对比度 <4.5:1（偏糊），故把填充
            // 向画布色加深 ~45%，使白字达 AA；亮色主题直接取状态色（深底白字）
            const quadrantFills = [
              getCSSVar("--mermaid-quadrant-fill-1", quadrantColors.point0),
              getCSSVar("--mermaid-quadrant-fill-2", quadrantColors.point3),
              getCSSVar("--mermaid-quadrant-fill-3", quadrantColors.point2),
              getCSSVar("--mermaid-quadrant-fill-4", quadrantColors.point1),
            ].map((f) => (isLight ? f : mixToward(colors.backgroundColor, f, 0.45)));
            for (let i = 1; i <= 4; i++) {
              vars[`quadrant${i}Fill`] = quadrantFills[i - 1];
              vars[`quadrant${i}TextFill`] = readableTextOnFill(
                quadrantFills[i - 1],
              );
            }
            vars.quadrantPointFill = isLight
              ? quadrantColors.point0
              : mixToward(colors.backgroundColor, quadrantColors.point0, 0.45);
            vars.quadrantPointTextFill = readableTextOnFill(
              vars.quadrantPointFill,
            );
            vars.quadrantXAxisTextFill = quadrantColors.axisLabel;
            vars.quadrantYAxisTextFill = quadrantColors.axisLabel;
            vars.quadrantTitleFill = quadrantColors.title;
            vars.quadrantInternalBorderStrokeFill = quadrantColors.divider;
            vars.quadrantExternalBorderStrokeFill = quadrantColors.axisLine;
          }

          if (isTreeview && colors.charts.treeview) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const treeviewColors = colors.charts.treeview;

            // mermaid ≥11 treeView 官方消费仅通用 textColor/lineColor
            // （12.2.0 dist 实测，图标 fill=currentColor 随文字色）；
            // treeviewLabelColor 系为死键已删
            vars.textColor = treeviewColors.label;
            vars.nodeTextColor = treeviewColors.description;
            vars.lineColor = treeviewColors.line;
          }

          if (isVenn) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;

            // mermaid ≥11 venn 官方键（12.2.0 dist 实测）：圆填充 cScale0..12
            // （渲染器按集合取槽位）、文字 vennSetTextColor、标题 vennTitleTextColor。
            // 圆填充用 chart-series（强色相，此前无注入块、全默认配色）
            for (let i = 0; i <= 12; i++) {
              vars[`cScale${i}`] = getCSSVar(
                `--chart-series-${i % 8}`,
                colors.pieColors[i % colors.pieColors.length],
              );
              vars[`cScaleLabel${i}`] = getCSSVar(
                `--chart-text-on-fill-${i % 8}`,
                colors.primaryTextColor,
              );
            }
            vars.vennSetTextColor = getCSSVar(
              "--mermaid-venn-text",
              colors.primaryTextColor,
            );
            vars.vennTitleTextColor = getCSSVar(
              "--mermaid-venn-text",
              colors.primaryTextColor,
            );
          }

          if (isArchitecture) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;

            // mermaid ≥11 architecture 官方键（12.2.0 dist 实测）：连线 archEdgeColor、
            // 箭头 archEdgeArrowColor、分组边界 archGroupBorderColor（服务节点填充
            // 由 config.architecture 控制，无 themeVariables 键）
            vars.archEdgeColor = getCSSVar(
              "--mermaid-architecture-line",
              colors.lineColor,
            );
            vars.archEdgeArrowColor = getCSSVar(
              "--mermaid-architecture-line",
              colors.lineColor,
            );
            vars.archGroupBorderColor = getCSSVar(
              "--mermaid-architecture-border",
              colors.primaryBorderColor,
            );
          }

          if (isWardley && colors.charts.wardley) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const wardleyColors = colors.charts.wardley;

            vars.lineColor = wardleyColors.line;
            vars.primaryColor = wardleyColors.nodeBg;
            vars.primaryTextColor = wardleyColors.text;
            vars.primaryBorderColor = wardleyColors.nodeBorder;

            vars.wardley = {
              backgroundColor: wardleyColors.bg,
              axisColor: wardleyColors.line,
              axisTextColor: wardleyColors.text,
              gridColor: wardleyColors.line,
              componentFill: wardleyColors.nodeBg,
              componentStroke: wardleyColors.nodeBorder,
              componentLabelColor: wardleyColors.text,
              linkStroke: wardleyColors.line,
              evolutionStroke: wardleyColors.line,
              annotationStroke: wardleyColors.nodeBorder,
              annotationTextColor: wardleyColors.text,
              annotationFill: wardleyColors.bg,
            };
          }

          if (isZenuml && colors.charts.zenuml) {
            const vars = themeVariables as any;
            const zenumlColors = colors.charts.zenuml;
            // ZenUML 插件不接受 mermaid themeVariables（已确认：源码中无 themeVariables 引用）
            // 仅透传基础文本色与字体，确保与全局主题风格一致；
            // 真正的颜色控制通过下方 SVG 后处理 style 注入实现。
            vars.zenumlFontColor = zenumlColors.text;
            vars.zenumlFontFamily = colors.fontFamily;
          }

          if (isEventModeling && colors.charts.eventmodeling) {
            const vars = themeVariables as any;
            const emColors = colors.charts.eventmodeling;
            // Mermaid 11.15.0 Event Modeling 渲染器会直接消费这些 themeVariables
            // 并应用到 SVG 内联 fill/stroke 属性（无法用 CSS 变量覆盖）
            // 参考: mermaid/dist/chunks/mermaid.core/diagram-KO2AKTUF.mjs calculateEntityVisualProps
            vars.darkMode = isLight ? false : true;
            vars.emUiFill = emColors.uiFill;
            vars.emUiStroke = emColors.uiStroke;
            vars.emProcessorFill = emColors.processorFill;
            vars.emProcessorStroke = emColors.processorStroke;
            vars.emReadModelFill = emColors.readmodelFill;
            vars.emReadModelStroke = emColors.readmodelStroke;
            vars.emCommandFill = emColors.commandFill;
            vars.emCommandStroke = emColors.commandStroke;
            vars.emEventFill = emColors.eventFill;
            vars.emEventStroke = emColors.eventStroke;
            vars.emRelationStroke = emColors.relationStroke;
            vars.emSwimlaneBackgroundOdd = emColors.swimlaneBg;
            vars.emSwimlaneBackgroundStroke = emColors.swimlaneStroke;
            vars.emArrowhead = emColors.arrowhead;
          }

          if (isSwimlane && colors.charts.swimlane) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const sc = colors.charts.swimlane;
            vars.nodeBorder = sc.nodeBorder;
            vars.nodeText = sc.nodeText;
            vars.clusterBkg = sc.laneBg;
            vars.clusterBorder = sc.laneBorder;
            vars.edgeColor = sc.edgeColor;
            // 官方键 edgeLabelBackground（nodeBg/edgeLabelBg/edgeLabelTextColor
            // 为死键已删）——泳道连线标签黑底即因死键落回 mermaid 默认深色
            vars.edgeLabelBackground = sc.edgeLabelBg;
            vars.textColor = sc.nodeText;
          }

          if (isUsecase && colors.charts.usecase) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const uc = colors.charts.usecase;
            vars.usecaseActorBkg = uc.actorBg;
            vars.usecaseActorBorder = uc.actorBorder;
            vars.usecaseBkg = uc.bg;
            vars.usecaseBorder = uc.border;
            vars.usecaseBoundaryBkg = uc.boundaryBg;
            vars.usecaseBoundaryBorder = uc.boundaryBorder;
            vars.usecaseIncludeLine = uc.includeLine;
            vars.usecaseExtendLine = uc.extendLine;
          }

          if (isCynefin && colors.charts.cynefin) {
            const vars = themeVariables as any;
            const cf = colors.charts.cynefin;
            // 五域底色取主题状态色（用户 2026-10-19 拍板，对齐官方 Cynefin
            // 渲染语义：复杂=绿 / 繁杂=蓝 / 混乱=红 / 清晰=黄 / 混乱中心=紫）。
            // 条目徽标与域名标签都直接压在同色域底色上（dist 实测
            // fill-opacity 0.95），五块底色同属一个明度类，单一文字色即可
            // 通吃——按对比度在白 / 深墨间自动选取。暗色主题下状态色为中亮色，
            // 白字对比度 <4.5:1，故把五域填充向画布色加深 ~45% 使白字达 AA
            const deepen = (c: string) =>
              isLight ? c : mixToward(colors.backgroundColor, c, 0.45);
            const onCynefinText = readableTextOnFill(deepen(cf.complexBg));
            vars.cynefin = {
              complexBg: deepen(cf.complexBg),
              complicatedBg: deepen(cf.complicatedBg),
              clearBg: deepen(cf.clearBg),
              chaoticBg: deepen(cf.chaoticBg),
              confusionBg: deepen(cf.confusionBg),
              boundaryColor: cf.boundaryColor,
              boundaryWidth: 2,
              cliffColor: cf.cliffColor,
              cliffWidth: 3,
              arrowColor: cf.arrowColor,
              arrowWidth: 2,
              labelColor: onCynefinText,
              textColor: onCynefinText,
              domainFontSize: 16,
              itemFontSize: 14,
            };
          }

          mermaid.initialize({
            startOnLoad: false,
            theme: mermaidTheme,
            themeVariables,
            themeCSS: erThemeCSS,
            // mermaid 12 起 ELK 成为默认布局、neo 成为默认外观，会改变全部图表
            // 的布局与观感；本项目主题适配体系按 11.x 的 DOM 结构校准，先钉回
            // dagre + classic 冻结现状，ELK/neo 的评估另行单独进行。
            // mindmap 例外：12.x 仅当顶层 layout 未被用户定义时才用默认放射
            // 布局 cose-bilkent，钉 dagre 会把它压成层级树——按用户设置放行
            layout:
              isMindmap
                ? mindmapLayout === "logic"
                  ? lrLayoutReady
                    ? MINDMAP_LR_LAYOUT
                    : "dagre"
                  : mindmapLayout !== "tree"
                    ? "cose-bilkent"
                    : "dagre"
                : "dagre",
            look: "classic",
            // 思维导图「层级渐变」风格走 mermaid 原生 colorBy='depth'：section 改为按
            // 层级分配，配合注入的 lineSlots 单色明度推进；其余风格保持按分支着色
            mindmap: {
              colorBy: mindmapStyle === "depth" ? "depth" : "branch",
            },
            flowchart: {
              useMaxWidth: false,
              htmlLabels: true,
              curve: "basis",
              diagramPadding: 20,
              padding: 15,
              nodeSpacing: 50,
              rankSpacing: 50,
            },
            sankey: {
              showValues: true,
            },
          });

          const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const firstLine = chart.trim().split("\n")[0];
          const sourceForDetection = getMermaidSourceForTypeDetection(chart);
          const detectedFirstLine = sourceForDetection.trim().split("\n")[0];
          const normalizedType = chartType;

          let svg: string;
          try {
            const result = await mermaid.render(id, chart);
            svg = result.svg;
          } catch (error) {
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.debug("[Mermaid Debug] render failed", {
                id,
                firstLine,
                detectedFirstLine,
                normalizedType,
                errorName: error instanceof Error ? error.name : String(error),
                errorMessage: error instanceof Error ? error.message : String(error),
                error,
              });
            }
            throw error;
          }

          if (cancelled) return;

          if (isPacket) {
            svg = patchPacketSvg(svg);
          }

          if (isWardley && colors.charts.wardley) {
            const wardleyColors = colors.charts.wardley;
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.debug("[Wardley Debug] colors", JSON.stringify(wardleyColors));
              console.debug("[Wardley Debug] SVG has <style>:", svg.includes("<style>"));
              console.debug("[Wardley Debug] SVG first 200 chars:", svg.substring(0, 200));
            }
            const wardleyStyle = `
              .wardley-background {
                fill: ${wardleyColors.bg} !important;
              }
              .wardley-axes line, .wardley-axes path {
                stroke: ${wardleyColors.line} !important;
              }
              .wardley-axis-label, .wardley-stage-label {
                fill: ${wardleyColors.text} !important;
              }
              .wardley-node circle {
                fill: ${wardleyColors.nodeBg} !important;
                stroke: ${wardleyColors.nodeBorder} !important;
              }
              .wardley-node-label {
                fill: ${wardleyColors.text} !important;
              }
              .wardley-link {
                stroke: ${wardleyColors.line} !important;
              }
            `;
            if (svg.includes("<style>")) {
              svg = injectSvgStyle(svg, wardleyStyle);
            } else {
              svg = svg.replace(/<svg([^>]*)>/, `<svg$1><style>${wardleyStyle}</style>`);
            }
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.debug("[Wardley Debug] After inject, SVG has wardley-background rule:", svg.includes("wardley-background"));
            }
          }

          if (isIshikawa && colors.charts.ishikawa) {
            const ishikawaColors = colors.charts.ishikawa;
            const ishikawaStyle = `
              text {
                fill: ${ishikawaColors.text} !important;
              }
              line, path {
                stroke: ${ishikawaColors.line} !important;
              }
              rect, polygon {
                stroke: ${ishikawaColors.border} !important;
              }
            `;
            if (svg.includes("<style>")) {
              svg = injectSvgStyle(svg, ishikawaStyle);
            } else {
              svg = svg.replace(/<svg([^>]*)>/, `<svg$1><style>${ishikawaStyle}</style>`);
            }
          }

          if (isZenuml && colors.charts.zenuml) {
            const zenumlColors = colors.charts.zenuml;
            // ZenUML 插件不接受 mermaid themeVariables（源码中无 themeVariables 引用），
            // 且使用内联 style="fill:..." 硬编码颜色，CSS 变量无法生效。
            // 通过 !important 覆盖内联 style 和 presentation attribute 实现主题适配。
            // 同时去硬编码：frame-border-inner(#fff)、frame-border-outer(#666)、
            // fragment-section-label(#222)、arrow-head(#000)
            const idMatch = svg.match(/<svg[^>]*\sid="([^"]+)"/);
            const svgId = idMatch?.[1];
            const scope = svgId ? `#${svgId}` : "";
            const zenumlStyle = `
              ${scope} .participant-box {
                fill: ${zenumlColors.bg} !important;
                stroke: ${zenumlColors.border} !important;
              }
              ${scope} .participant-label,
              ${scope} .stereotype-label {
                fill: ${zenumlColors.text} !important;
              }
              ${scope} .lifeline {
                stroke: ${zenumlColors.lifeline} !important;
              }
              ${scope} .message-line {
                stroke: ${zenumlColors.message} !important;
              }
              ${scope} .message-label,
              ${scope} .seq-number {
                fill: ${zenumlColors.text} !important;
              }
              ${scope} .fragment-border {
                fill: none !important;
                stroke: ${zenumlColors.border} !important;
              }
              ${scope} .fragment-header {
                fill: ${zenumlColors.border} !important;
              }
              ${scope} .fragment-label,
              ${scope} .fragment-section-label {
                fill: ${zenumlColors.text} !important;
              }
              ${scope} .fragment-section-label + rect,
              ${scope} g:has(> .fragment-section-label) > rect {
                fill: ${zenumlColors.bg} !important;
                opacity: 0.85 !important;
              }
              ${scope} .fragment-separator {
                stroke: ${zenumlColors.border} !important;
              }
              ${scope} .frame-border-inner,
              ${scope} .frame-border-outer {
                fill: transparent !important;
              }
              ${scope} .return-line {
                stroke: ${zenumlColors.message} !important;
              }
              ${scope} .return-arrow {
                fill: none !important;
                stroke: ${zenumlColors.message} !important;
              }
              ${scope} .return-label {
                fill: ${zenumlColors.text} !important;
              }
              ${scope} .return-icon {
                fill: ${zenumlColors.message} !important;
              }
              ${scope} [class*="arrow-head"] {
                fill: ${zenumlColors.message} !important;
                stroke: ${zenumlColors.message} !important;
              }
              ${scope} [class*="arrow-head"] path {
                fill: ${zenumlColors.message} !important;
                stroke: ${zenumlColors.message} !important;
              }
              ${scope} .divider-line {
                stroke: ${zenumlColors.border} !important;
              }
              ${scope} .divider-bg {
                fill: ${zenumlColors.bg} !important;
                stroke: ${zenumlColors.border} !important;
              }
              ${scope} .divider-label {
                fill: ${zenumlColors.text} !important;
              }
            `;
            if (svg.includes("<style>")) {
              svg = injectSvgStyle(svg, zenumlStyle);
            } else {
              svg = svg.replace(/<svg([^>]*)>/, `<svg$1><style>${zenumlStyle}</style>`);
            }
          }

          if (isEventModeling && colors.charts.eventmodeling) {
            const emColors = colors.charts.eventmodeling;
            // Event Modeling 的 mermaid 渲染器已消费 themeVariables.em* 字段，
            // 这里做一层保险性覆盖，确保暗色主题下默认值的"白色 UI"被正确替换。
            const eventModelingStyle = `
              g[role="listitem"] > g > g > rect,
              rect.em-box {
                stroke: ${emColors.uiStroke} !important;
              }
              text {
                fill: ${emColors.text} !important;
              }
            `;
            if (svg.includes("<style>")) {
              svg = injectSvgStyle(svg, eventModelingStyle);
            } else {
              svg = svg.replace(/<svg([^>]*)>/, `<svg$1><style>${eventModelingStyle}</style>`);
            }
          }

          if (isTreemap && colors.charts.treemap) {
            const treemapColors = colors.charts.treemap;

            // 注意：mermaid 实际 class 是 camelCase（treemapLeaf / treemapSection），
            // 此前用 kebab（.treemap-leaf / .treemap-group）匹配不到 → 后处理空操作，
            // 描边回落 mermaid 名哈希色（可近黑）。改用 camelCase 选中矩形本体
            const treemapInlineStyle = `
              .treemap-text text,
              text {
                fill: ${treemapColors.text} !important;
              }

              .treemapLeaf,
              .treemapSection {
                stroke: ${treemapColors.border} !important;
              }
            `;

            svg = injectSvgStyle(svg, treemapInlineStyle);
          }

          if (isSankey) {
            // 桑基图（节点矩形 + 流量渐变描边）的 colorScheme 硬编码 Tableau10 色板，
            // 完全不读主题（themeVariables.sankey.* 对填充/描边均无效）—— 导致整张图
            // 不随主题变，且固定中灰系 Tableau 色在深色底上对比不足、发虚。
            // 后处理把每个 Tableau10 色全局替换为对应主题 chart-series 色（同索引一致映射，
            // 覆盖 stop-color/fill/stroke 属性与 <style> 块），节点与流量统一主题自适应；
            // 节点标签在页面底上（不在填充上），文字对比度不受影响。
            // 兜底防除零：pieColors 为空时 i % 0 = NaN 会取到 undefined，
            // 使下面 replace 把颜色替换成字符串 "undefined"（无效色 → 渐变失效）
            const pieFallback = colors.pieColors.length
              ? colors.pieColors
              : ["#FF6A2B"];
            const sankeySeries = Array.from({ length: 8 }, (_, i) =>
              getCSSVar(`--chart-series-${i}`, pieFallback[i % pieFallback.length]),
            );
            const tableau10 = [
              "#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f",
              "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab",
            ];
            for (let i = 0; i < tableau10.length; i++) {
              svg = svg.replace(
                new RegExp(tableau10[i], "gi"),
                sankeySeries[i % sankeySeries.length],
              );
            }

            // 桑基流量渐变的 <linearGradient> 用的是**通用编号 id**（如 linearGradient-49），
            // 不带 svg 唯一前缀。页面同时存在多个图表时编号会撞车，浏览器只解析第一个匹配
            // id → 后渲染的图其 url(#linearGradient-N) 指向别的 SVG 的定义（或已被移除的
            // 定义）→ 流量带渐变不显示/错色。该现象天然「偶发」：取决于懒加载后 DOM 里 SVG
            // 的顺序与数量，刷新后顺序变化就表现为「有时好、有时要 F5」。
            // 这里给桑基 SVG 内所有通用 id 加上本 svg 的唯一前缀，并同步改写 url(#...) 引用。
            const svgIdMatch = svg.match(/<svg[^>]*\sid="([^"]+)"/);
            const uidPrefix = svgIdMatch
              ? svgIdMatch[1]
              : `mm${Math.random().toString(36).slice(2, 10)}`;
            const genericIds = [
              ...new Set(
                [
                  ...svg.matchAll(
                    /\sid="((?:linearGradient|filter|clipPath|marker|pattern)[-\w]*)"/g,
                  ),
                ].map((mm) => mm[1]),
              ),
            ];
            for (const gid of genericIds) {
              const nid = `${uidPrefix}-${gid}`;
              svg = svg.split(`id="${gid}"`).join(`id="${nid}"`);
              svg = svg.split(`url(#${gid})`).join(`url(#${nid})`);
            }

            // 保底降级：桑基连线是 path（无 class）带内联 stroke="url(#linearGradient-N)"，
            // 一旦渐变失效（stop 色无效 / 定义被破坏 / **引用悬空**），SVG 会因 paint server
            // 无效而**整条线不渲染**（用户观感「连线没有」：首屏打开文档时无线，F5 后恢复）。
            // 两道检测：① Tableau 色残留（替换未覆盖）；② url(#id) 引用悬空（定义缺失）。
            // 任一命中即强制给 path 明确主题 stroke —— 牺牲渐变也要保证连线可见。
            const definedIds = new Set(
              [...svg.matchAll(/\sid="([^"]+)"/g)].map((mm) => mm[1]),
            );
            const danglingRefs = [
              ...new Set(
                [...svg.matchAll(/url\(#([^)]+)\)/g)]
                  .map((mm) => mm[1])
                  .filter((id) => !definedIds.has(id)),
              ),
            ];
            const hasResidualTableau = tableau10.some((c) =>
              new RegExp(c, "i").test(svg),
            );
            if (hasResidualTableau || danglingRefs.length > 0) {
              svg = injectSvgStyle(
                svg,
                `svg path { stroke: ${sankeySeries[0]} !important; }`,
              );
            }

            // 深色主题流量发虚的真因：mermaid 默认 .link{stroke-opacity:0.5;
            // mix-blend-mode:multiply}。multiply 在浅色底上正常（流量压暗可见），
            // 但在深色底上与暗底相乘 → 流量被压得更暗、几乎不可见（用户观感「深色不明显」）。
            // 深色主题改 normal 混合 + 提高不透明度；浅色主题 multiply 观感正常，保持不变。
            if (!isLight) {
              svg = injectSvgStyle(
                svg,
                `.link { stroke-opacity: 0.85 !important; mix-blend-mode: normal !important; }`,
              );
            }
          }

          // ER 无需 SVG 后处理：themeVariables 已用 v2 渲染器官方键
          // （attributeBoxOdd/Even 等 DOM 类在 mermaid ≥11 已移除，旧补丁失效已删）

          if (isFlowchart && colors.charts.flowchart) {
            const flowchartColors = colors.charts.flowchart;
            const textColor = colors.primaryTextColor;

            const inlineStyle = `
              .nodeLabel text,
              .edgeLabel text,
              text {
                fill: ${textColor} !important;
              }

              .node rect,
              .node circle,
              .node polygon {
                fill: ${flowchartColors.nodeBg} !important;
                stroke: ${flowchartColors.nodeBorder} !important;
              }

              .edgePath path,
              .edgePath line {
                stroke: ${flowchartColors.edgeColor} !important;
              }

              .edgeLabel {
                background-color: ${flowchartColors.edgeLabelBg} !important;
                color: ${flowchartColors.edgeLabelText} !important;
              }

              .label rect {
                fill: ${flowchartColors.edgeLabelBg} !important;
              }

              .label text {
                fill: ${flowchartColors.edgeLabelText} !important;
              }

              .cluster rect {
                fill: ${colors.tertiaryColor} !important;
                stroke: ${flowchartColors.subgraphBorderColor} !important;
              }
            `;

            svg = injectSvgStyle(svg, inlineStyle);
          }

          if (isJourney && colors.charts.journey) {
            // journey 分区标题文字在样式模板中硬编码 #333（暗色主题下不可读），
            // 后处理覆盖为令牌文字色（.label text 同时覆盖任务标签文字）；
            // actor 圆（circle.actor-N）描边/填充 mermaid 回落默认近黑，需显式覆盖
            const jc = colors.charts.journey;
            svg = injectSvgStyle(
              svg,
              `
                .label text { fill: ${jc.journeyText} !important; }
                circle[class*="actor"] {
                  stroke: ${jc.journeyBorder} !important;
                  fill: ${jc.journeyBg} !important;
                }
              `,
            );
          }

          if (isSequence) {
            const textColor = colors.primaryTextColor;

            const inlineStyle = `
              .actor text,
              .messageText,
              .noteText,
              text {
                fill: ${textColor} !important;
              }

              .actor line,
              .signal line,
              .note rect,
              line {
                stroke: ${colors.lineColor} !important;
              }

              .actor rect,
              .note rect {
                fill: ${colors.primaryColor} !important;
              }
            `;

            svg = injectSvgStyle(svg, inlineStyle);
          }

          if (isGantt && colors.charts.gantt) {
            const ganttColors = colors.charts.gantt;
            const textColor = colors.primaryTextColor;
            const taskBg = ganttColors.taskBg;
            const taskBorder = ganttColors.taskBorder;
            const milestoneBg = ganttColors.milestoneBg;
            // 任务条/里程碑为品牌主色填充（chart-series-0/1），条上文字需按填充算对比色，
            // 保证高识别度填充上的可读性（≥4.5:1）
            const taskTextOnFill = readableTextOnFillStrict(taskBg);
            const milestoneTextOnFill = readableTextOnFillStrict(milestoneBg);

            const ganttInlineStyle = `
              .taskText {
                fill: ${taskTextOnFill} !important;
              }

              .milestoneText {
                fill: ${milestoneTextOnFill} !important;
              }

              .sectionTitle,
              .todayText,
              text {
                fill: ${textColor} !important;
              }

              .task,
              .task rect {
                fill: ${taskBg} !important;
              }

              .task rect {
                stroke: ${taskBorder} !important;
              }

              .milestone,
              .milestone rect,
              .milestone path {
                fill: ${milestoneBg} !important;
                stroke: ${taskBorder} !important;
              }

              /* 网格/坐标轴描边：mermaid 给 line 写内联 stroke=currentColor（解析为黑），
                 themeVariables.gridColor 无法覆盖，用 !important 强制改为主题线色。
                 【重要】注入 style 的 CSS 只能用 斜杠星号 注释，绝不可写双斜杠：
                 双斜杠在 CSS 里不是注释，会被当作非法选择器，导致整条规则被丢弃，
                 甚至吞掉 mermaid 原有样式 —— 曾致 section 回落 SVG 默认 fill 黑，
                 全主题呈现「大黑条」。 */
              .grid line,
              .grid .tick {
                stroke: ${ganttColors.sectionLine} !important;
              }
            `;

            svg = injectSvgStyle(svg, ganttInlineStyle);
          }

          if (isKanban && colors.charts.kanban) {
            const kc = colors.charts.kanban;
            /* kanban 普通卡片的 rect 是 mermaid 硬编码近白底（rect.label-container ≈ #f4f4f4），
               而卡片文字继承 textColor（暗色主题下为浅色）→ 白底白字完全不可读。
               列头（.section-N）有 cScaleN 显式填色故正常，仅普通卡片受影响、无主题键可注入。
               强制卡片底为 cardBg、卡片文字按 text 取色，保证任意主题下可读。 */
            svg = svg.replace(
              "<style>",
              `<style>
                rect.label-container { fill: ${kc.cardBg} !important; }
                .node .label,
                .node foreignObject,
                .node foreignObject * {
                  color: ${kc.text} !important;
                  fill: ${kc.text} !important;
                }
              `,
            );
          }

          if (isArchitecture) {
            // 架构图服务节点矩形（rect.node-bkg）描边 mermaid 无 themeVariables 键可注入，
            // 回落默认近黑；用主题边框色覆盖（仅描边，不碰填充，避免误改分组底色）
            svg = injectSvgStyle(
              svg,
              `.node-bkg { stroke: ${colors.primaryBorderColor} !important; }`,
            );
          }

          if (isC4Context) {
            // C4 关系线为裸 <path>（无 class），mermaid 回落默认近黑；
            // 后处理仅覆盖无 class 的 path（path.basic 已着色，不受影响）
            svg = injectSvgStyle(
              svg,
              `path:not([class]) { stroke: ${colors.lineColor} !important; }`,
            );
          }

          if (isGitGraph && colors.charts.gitgraph) {
            const gitgraphColors = colors.charts.gitgraph;
            const textColor = colors.primaryTextColor;
            // 与 themeVariables 注入一致：分支线/提交点走品牌系列色（chart-series-0..7），
            // 逐分支独立着色，避免回退中性 chart-edge 或 mermaid 默认青色；
            // 旧版的 over-broad `.gitGraph path{stroke:branchColors[0]}` 会把所有分支
            // 线强制压成同一种色，已删除
            const branchColors = Array.from({ length: 8 }, (_, i) =>
              getCSSVar(`--chart-series-${i}`, gitgraphColors.branchColors[i % 4]),
            );
            let branchRules = "";
            for (let i = 0; i < 8; i++) {
              branchRules += `
              .gitGraph .branch${i} path,
              .gitGraph .branch${i} line {
                stroke: ${branchColors[i]} !important;
              }`;
            }

            const gitgraphInlineStyle = `
              .commit-id,
              .commit-msg,
              .branch-label,
              .tag-label,
              text {
                fill: ${textColor} !important;
              }

              ${branchRules}

              .gitGraph .commit circle {
                fill: ${gitgraphColors.commitNodeColor} !important;
                stroke: ${gitgraphColors.commitNodeBorderColor} !important;
              }

              .gitGraph .branch-label rect,
              .gitGraph .branch-label rect:first-child {
                fill: ${gitgraphColors.branchLabelBg} !important;
                stroke: ${branchColors[0]} !important;
              }

              .gitGraph .branch-label text {
                fill: ${gitgraphColors.branchLabelColor} !important;
              }

              .gitGraph .commit-msg rect,
              .gitGraph .commit-id rect {
                fill: ${gitgraphColors.commitLabelBg} !important;
              }

              .gitGraph .commit-msg text,
              .gitGraph .commit-id text {
                fill: ${gitgraphColors.commitLabelColor} !important;
              }

              .gitGraph .tag-label rect {
                fill: ${gitgraphColors.tagLabelBg} !important;
                stroke: ${gitgraphColors.tagLabelBorder} !important;
              }

              .gitGraph .tag-label text {
                fill: ${gitgraphColors.tagLabelColor} !important;
              }

              [class*="branch"] path,
              [class*="branch"] line {
                stroke-width: 3 !important;
              }

              .gitGraph .commit circle {
                r: 6 !important;
                stroke-width: 2 !important;
              }
            `;

            svg = injectSvgStyle(svg, gitgraphInlineStyle);
          }

          if (
            !isPieChart &&
            !isMindmap &&
            !isFlowchart &&
            !isSequence &&
            !isGantt &&
            !isGitGraph &&
            !isErDiagram &&
            !isWardley &&
            !isIshikawa &&
            !isZenuml &&
            !isEventModeling
          ) {
            const textColor = colors.primaryTextColor;

            const universalStyle = `
              /* ===== 基础文字颜色 - 仅对无专用处理的图表生效 ===== */
              text {
                fill: ${textColor} !important;
              }
            `;

            svg = injectSvgStyle(svg, universalStyle);
          }

          if (isMindmap) {
            const mc = colors.charts.mindmap;
            const saturated = mc.branchLines;
            let extra = "";

            // classic 保留下划线；其余三档下划线（mermaid 默认贴底整宽 line）与实底冗余，消隐
            if (mindmapStyle !== "classic") {
              extra += `.mindmap-node line { display: none !important; }`;
            }

            if (mindmapStyle === "depth") {
              // colorBy='depth' 下 section 已是层级，连线由注入的 lineSlots 上色，无需覆盖

              // 字号层级递增（常规思维导图读法）：中心节点最大，逐级递减。
              // 仅 depth 档注入——brand/classic 档的 section 是「分支」而非层级，
              // 按 section 设字号会让不同分支字号不同，与层级语义相反。
              // mermaid 基准字号 16px（`#<id> svg{font-size:16px}`），文字容器
              // div 无内联 font-size，故 CSS 可直接覆盖并继承到 span。
              //
              // 幅度取舍：mermaid 的形状尺寸按 16px 文字测量，任何层级放大都有
              // 撑破背景的风险（文字 nowrap）。实测 root 18px 时 6 字 ≈108px，
              // 已接近 119px 的圆形背景。故只放大中心一级，并允许其长文字换行
              // （圆高 119px 可容两行）；L2 维持基准不放大；L3/L4 递减（变小
              // 绝不会溢出）。既满足「中心稍大 + 向外递减」，又不破布局。
              extra += `.mindmap-node foreignObject { overflow: visible !important; }`;
              const fontTiers = [18, 16, 15, 14, 13]; // root / L2 / L3 / L4 / L5+
              const fontSel = (sel: string, px: number) =>
                `${sel} foreignObject div, ${sel} foreignObject span { font-size: ${px}px !important; }`;
              // 中心节点：放大 + 长文字允许换行（配合 max-width 收行，防横向撑出圆形）
              extra += fontSel(".section-root", fontTiers[0]);
              extra += `.section-root foreignObject div { white-space: normal !important; }`;
              extra += fontSel(".section-0", fontTiers[1]);
              extra += fontSel(".section-1", fontTiers[2]);
              extra += fontSel(".section-2", fontTiers[3]);
              // L5 及更深（section-3..11）统一取最后一档，避免无限列举
              const deepSel = [3, 4, 5, 6, 7, 8, 9, 10, 11]
                .map((k) => `.section-${k}`)
                .join(",");
              extra += `${deepSel} foreignObject div, ${deepSel} foreignObject span { font-size: ${fontTiers[4]}px !important; }`;
            } else {
              // 连线按分支色覆盖（section-edge-k ↔ saturated[(k+1) % n]），保留主题视觉身份
              for (let k = 0; k < 11; k++) {
                extra += `.section-edge-${k} { stroke: ${saturated[(k + 1) % saturated.length]} !important; }`;
              }
            }

            // brand 档不再做逐节点深度混色，也不再注入任何文字色规则：
            // 节点底 = chart-fill、文字 = chart-text-on-fill，二者由生成器配对并
            // 保证 ≥4.5:1；渲染层只负责连线着色与下划线消隐，不参与颜色决策

            if (mindmapStyle === "outline") {
              // 透明底 + 彩色描边 + 彩色文字；描边取 (k+1)%n 与同分支连线一致
              for (let k = 0; k < saturated.length; k++) {
                const hue = saturated[(k + 1) % saturated.length];
                extra += `.section-${k} path { fill: transparent !important; stroke: ${hue} !important; stroke-width: 2 !important; }`;
                extra += `.section-${k} text { fill: ${hue} !important; }`;
              }
            }

            // 实心底档（brand/depth）去掉节点描边：mermaid 默认给节点 path 补一道中性描边
            // （chart-stroke 灰），在彩色实心块上割裂感明显（用户实机反馈「子节点全带描边」）。
            // outline 档本就靠描边表达语义、classic 档以「经典默认」为准，两者保持原样。
            if (mindmapStyle === "brand" || mindmapStyle === "depth") {
              extra += `.mindmap-node path.node-bkg, .mindmap-node circle.label-container { stroke: none !important; }`;
            }

            if (extra) {
              svg = injectSvgStyle(svg, extra);
            }
          }

          // hover 高亮：纯 CSS 注入（同类图元淡出、悬停项保持不透明），与主题注入同一机制。
          // 放在最后注入 → 出现在 <style> 最前面；因规则用 :has()/:not(:hover) 提升特异性，
          // 且只声明 opacity/transition，不会与主题规则冲突
          svg = injectSvgStyle(svg, MERMAID_HOVER_CSS);

          if (!cancelled) {
            if (svg && svg.includes("<svg")) {
              cleanupCache();
              mermaidCache.set(effectiveCacheKey, {
                svgHtml: svg,
                timestamp: Date.now(),
              });
            }
            setSvgHtml(svg);
            setError(false);
            setIsLoading(false);
          }
        } catch (err) {
          if (!cancelled) {
            const chartType = normalizeChartType(chart);
            if (UNSUPPORTED_DIAGRAM_TYPES.has(chartType)) {
              if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                console.debug(`[Mermaid] ${chartType} diagram not supported in current version`);
              }
              setSvgHtml("");
              setError(true);
            } else {
              console.error("Mermaid render error:", err);
              if (!svgHtml) {
                // 批量渲染（如导出模式一次性挂载全部图表）时存在瞬时竞态：
                // 懒加载的图表模块尚未就绪导致 parse/render 失败。
                // 有限次退避重试（走完整主题管线，配色不漂移），仍失败才展示错误。
                if (renderRetryCount < 2) {
                  renderRetryCount += 1;
                  setIsLoading(true);
                  window.setTimeout(() => {
                    if (!cancelled) enqueueMermaidRender(queueTask);
                  }, 400 * renderRetryCount);
                  return;
                }
                setError(true);
              }
            }
            setIsLoading(false);
          }
        }
      };

      enqueueMermaidRender(queueTask);
      return () => {
        cancelled = true;
      };
    }, [isVisible, cacheKey]);

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      lastContextMenuTime.current = Date.now();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    };

    const handleClickOutsideContextMenu = (e: MouseEvent) => {
      if (Date.now() - lastContextMenuTime.current < 200) return;
      const target = e.target as HTMLElement;
      const isInsideMenu = contextMenuRef.current?.contains(target);
      if (!isInsideMenu && showContextMenu) {
        setShowContextMenu(false);
      }
    };

    useEffect(() => {
      document.addEventListener("mousedown", handleClickOutsideContextMenu);
      return () => {
        document.removeEventListener(
          "mousedown",
          handleClickOutsideContextMenu,
        );
      };
    }, [showContextMenu]);

    const placeholder = (
      <div
        ref={containerRef}
        className="mermaid"
        style={{
          margin: "1.5em -1.5em",
          width: "calc(100% + 3em)",
          maxWidth: "none",
          height: "120px",
          borderRadius: "8px",
          background: "var(--bg-code, rgba(255,255,255,0.03))",
          border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "normal",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            color: "var(--text-muted, #50505A)",
          }}
        >
          图表
        </span>
      </div>
    );

    const loadingIndicator = (
      <div
        ref={containerRef}
        className="mermaid"
        style={{
          margin: "1.5em -1.5em",
          width: "calc(100% + 3em)",
          maxWidth: "none",
          height: "120px",
          borderRadius: "8px",
          background: "var(--bg-code, rgba(255,255,255,0.03))",
          border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "normal",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            color: "var(--text-muted, #50505A)",
          }}
        >
          正在渲染图表...
        </span>
      </div>
    );

    if (error) {
      const chartType = normalizeChartType(chart);
      const isUnsupported = UNSUPPORTED_DIAGRAM_TYPES.has(chartType);
      return (
        <div
          style={{
            margin: "1em 0",
            padding: "1em",
            borderRadius: "6px",
            fontSize: "13px",
            background: isUnsupported
              ? "rgba(255, 180, 0, 0.05)"
              : "rgba(255, 0, 64, 0.05)",
            border: isUnsupported
              ? "1px solid rgba(255, 180, 0, 0.15)"
              : "1px solid rgba(255, 0, 64, 0.1)",
            color: isUnsupported
              ? "var(--accent-amber, #FFB400)"
              : "var(--accent-red, #FF0040)",
          }}
        >
          {isUnsupported
            ? `当前 Mermaid 版本不支持 ${chartType} 图表`
            : "图表渲染失败"}
        </div>
      );
    }

    if (!isVisible) {
      const cached = mermaidCache.get(cacheKey);
      if (cached) {
        return (
          <div
            ref={containerRef}
            className="mermaid"
            style={{
              margin: "1.5em -1.5em",
              width: "calc(100% + 3em)",
              maxWidth: "none",
              overflowX: "auto",
              overflowY: "hidden",
              letterSpacing: "normal",
              display: "flex",
              justifyContent: "center",
            }}
            // securityLevel strict 下 mermaid 已用内置 DOMPurify 消毒输出；
            // 外层再过 DOMPurify 会剥掉 foreignObject 内的 htmlLabels 文字，故直接渲染
            dangerouslySetInnerHTML={{ __html: cached.svgHtml }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest("svg")) {
                setShowPreview(true);
              }
            }}
            onContextMenu={handleContextMenu}
            title={t("chart.clickToZoom")}
          />
        );
      }
      return placeholder;
    }

    if (isLoading || !svgHtml) {
      return loadingIndicator;
    }

    return (
      <>
        <div
          ref={containerRef}
          className="mermaid"
          style={{
            margin: "1.5em -1.5em",
            width: "calc(100% + 3em)",
            maxWidth: "none",
            overflowX: "auto",
            overflowY: "hidden",
            letterSpacing: "normal",
            display: "flex",
            justifyContent: "center",
          }}
          // 同上：mermaid strict 输出已消毒，二次消毒会丢失 htmlLabels 文字
          dangerouslySetInnerHTML={{ __html: svgHtml }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("svg")) {
              setShowPreview(true);
            }
          }}
          onContextMenu={handleContextMenu}
          title={t("chart.clickToZoom")}
        />
        {showPreview && (
          <SVGPreview
            svgHtml={svgHtml}
            skipSanitize
            onClose={() => setShowPreview(false)}
          />
        )}
        {showContextMenu && onEdit && (
          <div
            ref={contextMenuRef}
            className="fixed z-[60] flex flex-col min-w-[140px] py-2 rounded-lg shadow-xl"
            style={{
              left: contextMenuPos.x,
              top: contextMenuPos.y,
              background: "var(--bg-secondary)",
              border: "1px solid var(--divider)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowContextMenu(false);
                onEdit();
              }}
              className="text-left text-sm border-none cursor-pointer rounded"
              style={{
                background: "transparent",
                color: "var(--text-primary)",
                padding: "10px 16px",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg-medium)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              编辑图表
            </button>
          </div>
        )}
      </>
    );
  },
);

MermaidDiagram.displayName = "MermaidDiagram";

export default MermaidDiagram;
