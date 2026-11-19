import type { ConfigLevel } from "@/config/readerConfig";

export interface AutoConfigInput {
  /** 文档行数；0 表示未知（面板等无文档场景） */
  lines: number;
  /** navigator.hardwareConcurrency，未知传 undefined */
  cores?: number;
  /** navigator.deviceMemory（GB），Chromium 独有，未知传 undefined */
  memoryGb?: number;
}

/** 统计行数；只扫换行，不 split（大文档避免额外数组） */
export function countLines(content: string): number {
  if (!content) return 0;
  let lines = 1;
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) lines++;
  }
  return lines;
}

/**
 * 自动档位：设备弱或文档巨大时偏向省内存，设备强且文档不大时放开缓存。
 * 规则保持保守——误判时用户仍可在「高级」里手动锁定。
 */
export function resolveAutoLevel({
  lines,
  cores,
  memoryGb,
}: AutoConfigInput): ConfigLevel {
  const weakCores = typeof cores === "number" && cores <= 4;
  const weakMemory = typeof memoryGb === "number" && memoryGb <= 4;
  const strongCores = typeof cores === "number" && cores >= 12;
  const strongMemory = typeof memoryGb === "number" && memoryGb >= 8;

  if (weakCores || weakMemory) return "low";
  if (lines >= 30000 && !(strongCores && strongMemory)) return "low";
  if (strongCores && strongMemory) return "high";
  return "medium";
}

export function readDeviceProfile(): { cores?: number; memoryGb?: number } {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    cores:
      typeof nav.hardwareConcurrency === "number"
        ? nav.hardwareConcurrency
        : undefined,
    memoryGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined,
  };
}

/** high → medium → low；已在 low 则不变 */
export function lowerLevel(level: ConfigLevel): ConfigLevel {
  if (level === "high") return "medium";
  if (level === "medium") return "low";
  return "low";
}