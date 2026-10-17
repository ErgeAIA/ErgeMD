import { invoke } from "@tauri-apps/api/core";

/**
 * 模块级缓存：每个文件的滚动百分比。
 * 在 scroll 事件中实时更新，在 goHome/setActiveTab/closeTab 时写入数据库。
 * 标签切换时直接读取缓存恢复，不依赖 DOM。
 */
const percentageCache = new Map<string, number>();
const wordCountCache = new Map<string, number>();

/** 更新缓存中某文件的百分比（scroll 事件中调用） */
export function cacheScrollPercentage(filePath: string, percentage: number) {
  if (filePath) {
    percentageCache.set(filePath, Math.min(100, Math.max(0, percentage)));
  }
}

/** 更新缓存中某文件的字数（App 侧 wordCount 变化时调用，供持久化使用，审计 L4） */
export function cacheWordCount(filePath: string, wordCount: number) {
  if (filePath) {
    wordCountCache.set(filePath, wordCount);
  }
}

/** 读取缓存中某文件的百分比（标签切换恢复时调用） */
export function getCachedPercentage(filePath: string): number | undefined {
  return percentageCache.get(filePath);
}

/**
 * 将缓存中的百分比写入数据库。
 * 在 goHome / setActiveTab / closeTab 时调用。
 * 不需要 DOM 元素，直接读缓存。
 */
export async function flushReadingProgress(filePath: string): Promise<void> {
  if (!filePath) return;
  const percentage = percentageCache.get(filePath);
  if (percentage === undefined || percentage <= 0) return;
  await invoke("save_reading_progress", {
    filePath,
    scrollPercentage: percentage,
    wordCount: wordCountCache.get(filePath) ?? 0,
  }).catch((err) => {
    console.error("Failed to save reading progress:", err);
  });
}

/**
 * 将缓存中所有文件的百分比写入数据库。
 * 在 beforeunload / visibilitychange 时调用，确保所有 Tab 的进度都被持久化。
 */
export async function flushAllReadingProgress(): Promise<void> {
  const entries = Array.from(percentageCache.entries());
  if (entries.length === 0) return;
  await Promise.all(
    entries.map(([filePath, percentage]) =>
      percentage > 0
        ? invoke("save_reading_progress", {
            filePath,
            scrollPercentage: percentage,
            wordCount: wordCountCache.get(filePath) ?? 0,
          }).catch((err) => {
            console.error("Failed to save reading progress:", err);
          })
        : Promise.resolve(),
    ),
  );
}

/**
 * 从数据库加载阅读进度（首次打开文件时调用）。
 */
export async function loadReadingProgress(
  filePath: string,
): Promise<number | null> {
  if (!filePath) return null;
  // 优先返回缓存值
  const cached = percentageCache.get(filePath);
  if (cached !== undefined && cached > 0) return cached;
  // 缓存没有，从数据库加载
  try {
    const progress = await invoke<{
      file_path: string;
      scroll_percentage: number;
      last_read_at: number;
      word_count: number;
    } | null>("get_reading_progress", { filePath });
    const pct =
      progress && progress.scroll_percentage > 0
        ? progress.scroll_percentage
        : null;
    if (pct !== null) {
      percentageCache.set(filePath, pct);
    }
    return pct;
  } catch {
    return null;
  }
}
