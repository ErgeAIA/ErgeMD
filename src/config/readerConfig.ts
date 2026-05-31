/**
 * 阅读器配置参数
 *
 * 集中管理所有阅读相关的配置参数，提升代码可维护性和扩展性。
 * 这些参数可以根据需要暴露给用户进行自定义配置。
 */

export interface ReaderPerformanceConfig {
  /** 启用虚拟列表的行数阈值 */
  virtualThreshold: number;
  /** 启用分块解析的行数阈值 */
  chunkedThreshold: number;
  /** 分块解析时初始解析的行数 */
  initialParseLines: number;
  /** 分块解析时每块的大小 */
  chunkSize: number;
  /** Markdown blocks LRU 缓存大小 */
  maxCacheSize: number;
  /** 虚拟列表 overscan 数量（预渲染前后项数） */
  virtualOverscan: number;
}

export interface ReaderTOCConfig {
  /** 每个 TOC 项的高度（px） */
  itemHeight: number;
  /** TOC 视口高度（px） */
  viewportHeight: number;
  /** TOC 折叠状态宽度（px） */
  collapsedWidth: number;
  /** TOC 展开状态宽度（px） */
  expandedWidth: number;
  /** TOC 跳转后的滚动偏移量（px） */
  scrollOffset: number;
  /** TOC 动画过渡时间（ms） */
  animationDuration: number;
  /** 回弹动画系数（0-1，越小越慢） */
  snapBackFactor: number;
  /** 线条透明度衰减率 */
  lineFadeRate: number;
  /** 线条最小透明度 */
  minLineOpacity: number;
  /** 非活跃项透明度 */
  inactiveOpacity: number;
}

export interface ReaderInteractionConfig {
  /** 搜索输入防抖延迟（ms） */
  searchDebounceMs: number;
  /** 复制状态重置超时（ms） */
  copyStateTimeoutMs: number;
  /** 滚动停止检测延迟（ms） */
  scrollStopDelayMs: number;
}

export interface ReaderVirtualSizesConfig {
  /** 空白行估算高度（px） */
  blank: number;
  /** 分隔线估算高度（px） */
  thematicBreak: number;
  /** Mermaid 图表估算高度（px） */
  mermaid: number;
  /** PlantUML 图表估算高度（px） */
  plantuml: number;
  /** 代码块每行估算高度（px） */
  codeLine: number;
  /** 代码块基础高度（px） */
  codeBase: number;
  /** 表格每行估算高度（px） */
  tableLine: number;
  /** 表格基础高度（px） */
  tableBase: number;
  /** 默认块每行估算高度（px） */
  defaultLine: number;
  /** 默认块基础高度（px） */
  defaultBase: number;
  /** 标题基础高度（px） */
  headingBase: number;
  /** 标题层级高度差（px） */
  headingLevelDiff: number;
}

export interface ReaderConfig {
  performance: ReaderPerformanceConfig;
  toc: ReaderTOCConfig;
  interaction: ReaderInteractionConfig;
  virtualSizes: ReaderVirtualSizesConfig;
}

/**
 * 配置级别类型
 */
export type ConfigLevel = "low" | "medium" | "high";

/**
 * 配置级别描述
 */
export interface ConfigLevelInfo {
  id: ConfigLevel;
  name: string;
  description: string;
  scenario: string;
  effects: string[];
}

/**
 * 配置级别信息
 */
export const ConfigLevelInfoMap: Record<ConfigLevel, ConfigLevelInfo> = {
  low: {
    id: "low",
    name: "低档",
    description: "性能优先模式",
    scenario: "适用于低配置设备、大文件处理或资源受限环境",
    effects: [
      "更早启用虚拟滚动，减少内存占用",
      "更大的分块解析，降低CPU负担",
      "较小的缓存容量，节省内存",
      "流畅的基本阅读体验",
    ],
  },
  medium: {
    id: "medium",
    name: "中档",
    description: "平衡模式",
    scenario: "适用于主流配置设备和日常阅读场景",
    effects: [
      "平衡性能与体验的最佳选择",
      "适中的虚拟滚动阈值",
      "合理的缓存和分块策略",
      "流畅的动画效果",
    ],
  },
  high: {
    id: "high",
    name: "高档",
    description: "体验优先模式",
    scenario: "适用于高性能设备，追求极致阅读体验",
    effects: [
      "更少使用虚拟滚动，渲染更流畅",
      "更大的缓存，更快的响应",
      "更多的预渲染，滚动更平滑",
      "更细腻的动画效果",
    ],
  },
};

/**
 * 三级预设配置
 */
export const PresetConfigs: Record<ConfigLevel, ReaderConfig> = {
  low: {
    performance: {
      virtualThreshold: 1000,
      chunkedThreshold: 10000,
      initialParseLines: 5000,
      chunkSize: 20000,
      maxCacheSize: 10,
      virtualOverscan: 5,
    },
    toc: {
      itemHeight: 28,
      viewportHeight: 400,
      collapsedWidth: 64,
      expandedWidth: 200,
      scrollOffset: 40,
      animationDuration: 200,
      snapBackFactor: 0.15,
      lineFadeRate: 0.1,
      minLineOpacity: 0.1,
      inactiveOpacity: 0.7,
    },
    interaction: {
      searchDebounceMs: 200,
      copyStateTimeoutMs: 2500,
      scrollStopDelayMs: 600,
    },
    virtualSizes: {
      blank: 14,
      thematicBreak: 40,
      mermaid: 180,
      plantuml: 180,
      codeLine: 20,
      codeBase: 35,
      tableLine: 28,
      tableBase: 70,
      defaultLine: 24,
      defaultBase: 35,
      headingBase: 35,
      headingLevelDiff: 14,
    },
  },
  medium: {
    performance: {
      virtualThreshold: 5000,
      chunkedThreshold: 50000,
      initialParseLines: 10000,
      chunkSize: 10000,
      maxCacheSize: 20,
      virtualOverscan: 15,
    },
    toc: {
      itemHeight: 32,
      viewportHeight: 560,
      collapsedWidth: 72,
      expandedWidth: 240,
      scrollOffset: 48,
      animationDuration: 120,
      snapBackFactor: 0.2,
      lineFadeRate: 0.08,
      minLineOpacity: 0.14,
      inactiveOpacity: 0.85,
    },
    interaction: {
      searchDebounceMs: 150,
      copyStateTimeoutMs: 2000,
      scrollStopDelayMs: 500,
    },
    virtualSizes: {
      blank: 16,
      thematicBreak: 48,
      mermaid: 200,
      plantuml: 200,
      codeLine: 22,
      codeBase: 40,
      tableLine: 32,
      tableBase: 80,
      defaultLine: 28,
      defaultBase: 40,
      headingBase: 40,
      headingLevelDiff: 16,
    },
  },
  high: {
    performance: {
      virtualThreshold: 15000,
      chunkedThreshold: 100000,
      initialParseLines: 20000,
      chunkSize: 5000,
      maxCacheSize: 50,
      virtualOverscan: 25,
    },
    toc: {
      itemHeight: 36,
      viewportHeight: 640,
      collapsedWidth: 80,
      expandedWidth: 280,
      scrollOffset: 56,
      animationDuration: 80,
      snapBackFactor: 0.3,
      lineFadeRate: 0.06,
      minLineOpacity: 0.18,
      inactiveOpacity: 0.9,
    },
    interaction: {
      searchDebounceMs: 100,
      copyStateTimeoutMs: 1500,
      scrollStopDelayMs: 300,
    },
    virtualSizes: {
      blank: 18,
      thematicBreak: 56,
      mermaid: 240,
      plantuml: 240,
      codeLine: 24,
      codeBase: 45,
      tableLine: 36,
      tableBase: 90,
      defaultLine: 32,
      defaultBase: 45,
      headingBase: 45,
      headingLevelDiff: 18,
    },
  },
};

/**
 * 默认阅读器配置（中档）
 */
export const DefaultReaderConfig: ReaderConfig = PresetConfigs.medium;

/**
 * 获取标题估算高度
 * @param level 标题层级（1-6）
 * @param config 配置对象（可选，默认为默认配置）
 * @returns 估算高度（px）
 */
export function getEstimatedHeadingHeight(
  level: number,
  config: ReaderVirtualSizesConfig = DefaultReaderConfig.virtualSizes,
): number {
  const { headingBase, headingLevelDiff } = config;
  return headingBase + (4 - level) * headingLevelDiff;
}

/**
 * 获取代码块估算高度
 * @param lineCount 代码行数
 * @param config 配置对象（可选，默认为默认配置）
 * @returns 估算高度（px）
 */
export function getEstimatedCodeHeight(
  lineCount: number,
  config: ReaderVirtualSizesConfig = DefaultReaderConfig.virtualSizes,
): number {
  const { codeLine, codeBase } = config;
  return Math.max(codeBase, lineCount * codeLine + codeBase);
}

/**
 * 获取表格估算高度
 * @param lineCount 表格行数
 * @param config 配置对象（可选，默认为默认配置）
 * @returns 估算高度（px）
 */
export function getEstimatedTableHeight(
  lineCount: number,
  config: ReaderVirtualSizesConfig = DefaultReaderConfig.virtualSizes,
): number {
  const { tableLine, tableBase } = config;
  return Math.max(tableBase, lineCount * tableLine);
}

/**
 * 获取默认块估算高度
 * @param lineCount 行数
 * @param config 配置对象（可选，默认为默认配置）
 * @returns 估算高度（px）
 */
export function getEstimatedDefaultHeight(
  lineCount: number,
  config: ReaderVirtualSizesConfig = DefaultReaderConfig.virtualSizes,
): number {
  const { defaultLine, defaultBase } = config;
  return Math.max(defaultBase, lineCount * defaultLine);
}
