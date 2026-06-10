import React, { memo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/useTheme";
import SVGPreview from "./SVGPreview";

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

        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
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
    branches: string[];
    level1Bg: string;
    level1Text: string;
    level2Bg: string;
    level2Text: string;
    level3Bg: string;
    level3Text: string;
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
}

function getCSSVar(name: string, fallback: string = ""): string {
  if (typeof document === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

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
        branches: [
          getCSSVar("--mermaid-mindmap-branch-0", accentCyan),
          getCSSVar("--mermaid-mindmap-branch-1", accentPink),
          getCSSVar("--mermaid-mindmap-branch-2", accentYellow),
          getCSSVar("--mermaid-mindmap-branch-3", accentGreen),
          getCSSVar("--mermaid-mindmap-branch-4", accentOrange),
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
        sectionBg: getCSSVar("--mermaid-gantt-section-bg", tertiaryColor),
        sectionLine: lineColor,
        taskBg: getCSSVar("--mermaid-gantt-task-bg", primaryColor),
        taskBorder: getCSSVar(
          "--mermaid-gantt-task-border",
          primaryBorderColor,
        ),
        taskText: getCSSVar("--mermaid-gantt-task-text", primaryTextColor),
        milestoneBg: getCSSVar("--mermaid-gantt-milestone-bg", primaryColor),
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
    // Ishikawa
    ishikawa: "ishikawa",
    // Wardley
    "wardley-beta": "wardley",
    // TreeView
    "treeview-beta": "treeview",
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
    // Mermaid Mindmap
    "--mermaid-mindmap-center-bg",
    "--mermaid-mindmap-center-text",
    "--mermaid-mindmap-l1-bg",
    "--mermaid-mindmap-l1-text",
    "--mermaid-mindmap-l2-bg",
    "--mermaid-mindmap-l2-text",
    "--mermaid-mindmap-l3-bg",
    "--mermaid-mindmap-l3-text",
    "--mermaid-mindmap-branch-0",
    "--mermaid-mindmap-branch-1",
    "--mermaid-mindmap-branch-2",
    "--mermaid-mindmap-branch-3",
    "--mermaid-mindmap-branch-4",
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

    const resolvedTheme = getResolvedTheme();

    const themeSignature = getMermaidThemeSignature();
    const cacheKey = JSON.stringify({
      theme: resolvedTheme,
      signature: themeSignature,
      chart,
      _version: "v36",
    });

    useEffect(() => {
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
    }, []);

    useEffect(() => {
      if (!isVisible) return;

      const cached = mermaidCache.get(cacheKey);
      if (cached) {
        setSvgHtml(cached.svgHtml);
        setError(false);
        return;
      }

      let cancelled = false;
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

          const mermaidTheme = "base";

          let erThemeCSS = "";

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
            nodeBorder: colors.primaryBorderColor,
            nodeBg: colors.primaryColor,
            nodeText: colors.primaryTextColor,
            actorBorder: colors.primaryBorderColor,
            actorBg: colors.primaryColor,
            actorTextColor: colors.primaryTextColor,
            signalColor: colors.lineColor,
            decisionBg: colors.primaryColor,
            decisionBorder: colors.primaryBorderColor,
            decisionTextColor: colors.primaryTextColor,
            edgeLabelBg: colors.primaryColor,
            edgeLabelTextColor: colors.primaryTextColor,
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
          const isIshikawa = chartType === "ishikawa";
          const isZenuml = chartType === "zenuml";
          const isEventModeling = chartType === "eventmodeling";

          if (isTimeline) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const timelineColors = colors.charts.timeline;
            vars.cScale0 = timelineColors.cScale[0];
            vars.cScale1 = timelineColors.cScale[1];
            vars.cScale2 = timelineColors.cScale[2];
            vars.cScale3 = timelineColors.cScale[3];
            vars.cScaleLabel0 = timelineColors.cScaleLabel[0];
            vars.cScaleLabel1 = timelineColors.cScaleLabel[1];
            vars.cScaleLabel2 = timelineColors.cScaleLabel[2];
            vars.cScaleLabel3 = timelineColors.cScaleLabel[3];
          }

          if (isMindmap) {
            const vars = themeVariables as any;

            vars.darkMode = isLight ? false : true;

            const mindmapColors = colors.charts.mindmap;

            vars.git0 = mindmapColors.centerColor;
            vars.gitBranchLabel0 = mindmapColors.centerText;

            const branches = mindmapColors.branches;
            for (let i = 0; i < branches.length && i < 12; i++) {
              vars[`cScale${i}`] = branches[i % branches.length];
              vars[`cScaleLabel${i}`] =
                i === 0
                  ? mindmapColors.level1Text
                  : i === 1
                    ? mindmapColors.level2Text
                    : i === 2
                      ? mindmapColors.level3Text
                      : colors.primaryTextColor;
              vars[`cScaleInv${i}`] = mindmapColors.centerText;
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

            vars.git0 = gitgraphColors.branchColors[0];
            vars.git1 = gitgraphColors.branchColors[1];
            vars.git2 = gitgraphColors.branchColors[2];
            vars.git3 = gitgraphColors.branchColors[3];
            vars.commitLabelColor = gitgraphColors.commitLabelColor;
            vars.commitLabelBackground = gitgraphColors.commitLabelBg;
            vars.tagLabelColor = gitgraphColors.tagLabelColor;
            vars.tagLabelBackground = gitgraphColors.tagLabelBg;
            vars.tagLabelBorder = gitgraphColors.tagLabelBorder;
            vars.commitNodeColor = gitgraphColors.commitNodeColor;
            vars.commitNodeBorderColor = gitgraphColors.commitNodeBorderColor;
            vars.branchLabelColor = gitgraphColors.branchLabelColor;
            vars.branchLabelBackground = gitgraphColors.branchLabelBg;
          }

          if (isSankey) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const sankeyColors = colors.charts.sankey;

            vars.sankeyNodeBorderColor = sankeyColors.nodeBorderColor;
            vars.sankeyNodeBkgColor = sankeyColors.nodeBkgColor;
            vars.sankeyNodeTextColor = sankeyColors.nodeTextColor;
            vars.sankeyLinkColorMode = "gradient";
          }

          if (isRequirement) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const requirementColors = colors.charts.requirement;

            vars.requirementBkgColor = requirementColors.requirementBkg;
            vars.requirementTextColor = requirementColors.requirementText;
            vars.requirementBorderColor = requirementColors.requirementBorder;
            vars.elementBkgColor = requirementColors.elementBkg;
            vars.elementTextColor = requirementColors.elementText;
            vars.elementBorderColor = requirementColors.elementBorder;
          }

          if (isFlowchart && colors.charts.flowchart) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const flowchartColors = colors.charts.flowchart;

            vars.nodeBorder = flowchartColors.nodeBorder;
            vars.nodeBg = flowchartColors.nodeBg;
            vars.nodeText = flowchartColors.nodeText;
            vars.edgeColor = flowchartColors.edgeColor;
            vars.edgeLabelBg = flowchartColors.edgeLabelBg;
            vars.edgeLabelTextColor = flowchartColors.edgeLabelText;
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

            vars.entityBkg = erDiagramColors.entityBg;
            vars.entityBorder = erDiagramColors.entityBorder;
            vars.entityTextColor = erDiagramColors.entityText;
            vars.relationshipColor = erDiagramColors.relationshipColor;

            if (erDiagramColors.attributeBg) {
              vars.entityAttributeBkg = erDiagramColors.attributeBg;
              vars.entityAttributeText = erDiagramColors.attributeText;
              vars.entityAttributeBkgAlt = erDiagramColors.attributeBg;
              vars.entityAttributeTextAlt = erDiagramColors.attributeText;

              vars.entityText = erDiagramColors.entityText;
              vars.attributeText = erDiagramColors.attributeText;
              vars.attributeBkg = erDiagramColors.attributeBg;
              vars.textColor = erDiagramColors.attributeText;
              vars.primaryTextColor = erDiagramColors.entityText;

              erThemeCSS = `
                .er .attributeBoxOdd rect,
                .er .attributeBoxEven rect {
                  fill: ${erDiagramColors.attributeBg} !important;
                }
                .er .attributeBoxOdd text,
                .er .attributeBoxEven text {
                  fill: ${erDiagramColors.attributeText} !important;
                }
              `;
            }
          }

          if (isJourney && colors.charts.journey) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const journeyColors = colors.charts.journey;

            vars.journeyBkg = journeyColors.journeyBg;
            vars.journeyBorder = journeyColors.journeyBorder;
            vars.journeyTextColor = journeyColors.journeyText;
            vars.journeyFillColor = journeyColors.fillColor;
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

            vars.treemapTextColor = treemapColors.text;
            vars.treemapGroupBkgColor = treemapColors.groupBg;
            vars.treemapLeaf0Color = treemapColors.leaf0;
            vars.treemapLeaf1Color = treemapColors.leaf1;
            vars.treemapLeaf2Color = treemapColors.leaf2;
            vars.treemapLeaf3Color = treemapColors.leaf3;
            vars.treemapLeaf4Color = treemapColors.leaf4;
            vars.treemapLeaf5Color = treemapColors.leaf5;
            vars.treemapBorderColor = treemapColors.border;
          }

          if (isBlock && colors.charts.block) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const blockColors = colors.charts.block;

            vars.blockTextColor = blockColors.text;
            vars.blockBkgColor = blockColors.bg;
            vars.blockBorderColor = blockColors.border;
            vars.blockArrowColor = blockColors.line;
          }

          if (isKanban && colors.charts.kanban) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const kanbanColors = colors.charts.kanban;

            vars.kanbanTextColor = kanbanColors.text;
            vars.kanbanColumnBkgColor = kanbanColors.columnBg;
            vars.kanbanCardBkgColor = kanbanColors.cardBg;
            vars.kanbanCardBorderColor = kanbanColors.cardBorder;
            vars.kanbanDividerColor = kanbanColors.divider;
          }

          if (isQuadrant && colors.charts.quadrant) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const quadrantColors = colors.charts.quadrant;

            vars.quadrantBkgColor = quadrantColors.bg;
            vars.quadrantTitleColor = quadrantColors.title;
            vars.quadrantAxisLabelColor = quadrantColors.axisLabel;
            vars.quadrantAxisColor = quadrantColors.axisLine;
            vars.quadrantDivisionsColor = quadrantColors.divider;
            vars.quadrantPoint0Color = quadrantColors.point0;
            vars.quadrantPoint1Color = quadrantColors.point1;
            vars.quadrantPoint2Color = quadrantColors.point2;
            vars.quadrantPoint3Color = quadrantColors.point3;
            vars.quadrantPoint4Color = quadrantColors.point4;
            vars.quadrantPoint5Color = quadrantColors.point5;
          }

          if (isTreeview && colors.charts.treeview) {
            const vars = themeVariables as any;
            vars.darkMode = isLight ? false : true;
            const treeviewColors = colors.charts.treeview;

            vars.treeviewLabelColor = treeviewColors.label;
            vars.treeviewDescriptionColor = treeviewColors.description;
            vars.treeviewLineColor = treeviewColors.line;
            vars.treeviewIconColor = treeviewColors.icon;
            vars.treeviewBkgColor = treeviewColors.bg;
            vars.treeviewHighlightBackgroundColor = treeviewColors.highlightBg;
            vars.treeviewHighlightBorderColor = treeviewColors.highlightStroke;
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

          mermaid.initialize({
            startOnLoad: false,
            theme: mermaidTheme,
            themeVariables,
            themeCSS: erThemeCSS,
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
              svg = svg.replace("<style>", `<style>${wardleyStyle}`);
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
              svg = svg.replace("<style>", `<style>${ishikawaStyle}`);
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
              svg = svg.replace("<style>", `<style>${zenumlStyle}`);
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
              svg = svg.replace("<style>", `<style>${eventModelingStyle}`);
            } else {
              svg = svg.replace(/<svg([^>]*)>/, `<svg$1><style>${eventModelingStyle}</style>`);
            }
          }

          if (isTreemap && colors.charts.treemap) {
            const treemapColors = colors.charts.treemap;

            const treemapInlineStyle = `
              .treemap-text text,
              text {
                fill: ${treemapColors.text} !important;
              }

              .treemap-group rect {
                fill: ${treemapColors.groupBg} !important;
              }

              .treemap-leaf rect {
                fill: ${treemapColors.leaf0} !important;
                stroke: ${treemapColors.border} !important;
              }
            `;

            svg = svg.replace("<style>", `<style>${treemapInlineStyle}`);
          }

          if (isErDiagram && colors.charts.erDiagram) {
            const erDiagramColors = colors.charts.erDiagram;

            const inlineStyle = `
              .er text,
              .er .entityBox text,
              .er .attributeBoxOdd text,
              .er .attributeBoxEven text,
              .er entityBox text,
              .er attributeBoxOdd text,
              .er attributeBoxEven text,
              text {
                fill: ${erDiagramColors.attributeText} !important;
              }

              .er .entityBox rect,
              .er entityBox rect {
                fill: ${erDiagramColors.entityBg} !important;
                stroke: ${erDiagramColors.entityBorder} !important;
              }

              .er .attributeBoxOdd rect,
              .er attributeBoxOdd rect,
              .er .attributeBoxEven rect,
              .er attributeBoxEven rect {
                fill: ${erDiagramColors.attributeBg} !important;
              }
            `;

            svg = svg.replace("<style>", `<style>${inlineStyle}`);
          }

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

            svg = svg.replace("<style>", `<style>${inlineStyle}`);
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

            svg = svg.replace("<style>", `<style>${inlineStyle}`);
          }

          if (isGantt && colors.charts.gantt) {
            const ganttColors = colors.charts.gantt;
            const textColor = colors.primaryTextColor;
            const taskBg = ganttColors.taskBg;
            const taskBorder = ganttColors.taskBorder;

            const ganttInlineStyle = `
              .taskText,
              .sectionTitle,
              .todayText,
              text {
                fill: ${textColor} !important;
              }

              .task,
              .task rect,
              .task .taskText {
                fill: ${taskBg} !important;
              }

              .task rect {
                stroke: ${taskBorder} !important;
              }

              .milestone,
              .milestone rect,
              .milestone path {
                fill: ${taskBg} !important;
                stroke: ${taskBorder} !important;
              }
            `;

            svg = svg.replace("<style>", `<style>${ganttInlineStyle}`);
          }

          if (isGitGraph && colors.charts.gitgraph) {
            const gitgraphColors = colors.charts.gitgraph;
            const textColor = colors.primaryTextColor;

            const gitgraphInlineStyle = `
              .commit-id,
              .commit-msg,
              .branch-label,
              .tag-label,
              text {
                fill: ${textColor} !important;
              }

              .gitGraph .branch0 path,
              .gitGraph .branch0 line {
                stroke: ${gitgraphColors.branchColors[0]} !important;
              }
              .gitGraph .branch1 path,
              .gitGraph .branch1 line {
                stroke: ${gitgraphColors.branchColors[1]} !important;
              }
              .gitGraph .branch2 path,
              .gitGraph .branch2 line {
                stroke: ${gitgraphColors.branchColors[2]} !important;
              }
              .gitGraph .branch3 path,
              .gitGraph .branch3 line {
                stroke: ${gitgraphColors.branchColors[3]} !important;
              }

              .gitGraph .commit circle {
                fill: ${gitgraphColors.commitNodeColor} !important;
                stroke: ${gitgraphColors.commitNodeBorderColor} !important;
              }

              .gitGraph .branch-label rect,
              .gitGraph .branch-label rect:first-child {
                fill: ${gitgraphColors.branchLabelBg} !important;
                stroke: ${gitgraphColors.branchColors[0]} !important;
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

              .gitGraph path,
              .gitGraph line {
                stroke: ${gitgraphColors.branchColors[0]} !important;
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

            svg = svg.replace("<style>", `<style>${gitgraphInlineStyle}`);
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

            svg = svg.replace("<style>", `<style>${universalStyle}`);
          }

          if (isMindmap) {
            const mindmapColors = colors.charts.mindmap;

            const mindmapStyle = `
              /* ===== Mindmap 节点背景 - 使用 levelBg 而非 branch 色 ===== */
              .mindmap .root rect {
                fill: ${mindmapColors.centerColor} !important;
              }
              .mindmap .node rect {
                fill: ${mindmapColors.level1Bg} !important;
              }
              .mindmap .node.depth-1 rect {
                fill: ${mindmapColors.level2Bg} !important;
              }
              .mindmap .node.depth-2 rect {
                fill: ${mindmapColors.level3Bg} !important;
              }
              .mindmap .node.depth-3 rect {
                fill: ${mindmapColors.level3Bg} !important;
              }

              /* ===== Mindmap 文字颜色 - 使用 level 语义色 ===== */
              .mindmap .root text,
              .mindmap .node text {
                fill: ${mindmapColors.centerText} !important;
              }

              /* ===== Mindmap 分支线 - 使用 branches 颜色 ===== */
              .mindmap path,
              .mindmap .branch-0 path {
                stroke: ${mindmapColors.branches[0]} !important;
              }
              .mindmap .branch-1 path {
                stroke: ${mindmapColors.branches[1]} !important;
              }
              .mindmap .branch-2 path {
                stroke: ${mindmapColors.branches[2]} !important;
              }
              .mindmap .branch-3 path {
                stroke: ${mindmapColors.branches[3]} !important;
              }
              .mindmap .branch-4 path {
                stroke: ${mindmapColors.branches[4]} !important;
              }
            `;

            svg = svg.replace("<style>", `<style>${mindmapStyle}`);
          }

          if (!cancelled) {
            if (svg && svg.includes("<svg")) {
              cleanupCache();
              mermaidCache.set(cacheKey, {
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
          <SVGPreview svgHtml={svgHtml} onClose={() => setShowPreview(false)} />
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
