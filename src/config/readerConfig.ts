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

interface ReaderTOCConfig {
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

interface ReaderInteractionConfig {
  /** 搜索输入防抖延迟（ms） */
  searchDebounceMs: number;
  /** 复制状态重置超时（ms） */
  copyStateTimeoutMs: number;
  /** 滚动停止检测延迟（ms） */
  scrollStopDelayMs: number;
}

interface ReaderVirtualSizesConfig {
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

/** 用户可选：自动（默认）或手动锁定某一档 */
export type ConfigMode = ConfigLevel | "auto";

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
 * 组合当前生效配置：视觉与排版参数固定取中档，只有 performance 组随档位变化。
 * 否则换档会连带改变目录行高、虚拟块高度等观感——设备不同、观感不该不同。
 */
export function composeReaderConfig(level: ConfigLevel): ReaderConfig {
  const base = PresetConfigs.medium;
  return {
    ...base,
    performance: PresetConfigs[level].performance,
  };
}
