import { useEffect } from "react";
import { useFileStore } from "@/stores/fileStore";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  countLines,
  readDeviceProfile,
  resolveAutoLevel,
} from "@/utils/autoConfig";

const LONG_TASK_MS = 60;
const SCROLL_ACTIVE_MS = 600;
const DOWNGRADE_WINDOW_MS = 4000;
const DOWNGRADE_THRESHOLD = 3;

/**
 * 自动档位：
 * 1) 文档打开时按行数与设备能力选一个初始档（仅自动模式）；
 * 2) 滚动期间连续出现长任务时下调一档，只降不升、带滞回，不写回设置。
 * 手动锁定档位时整个 Hook 不介入。
 */
export function useAutoConfig(): void {
  const currentFilePath = useFileStore((s) => s.currentFilePath);
  const configLevel = useSettingsStore((s) => s.configLevel);
  const setAutoEffectiveLevel = useSettingsStore((s) => s.setAutoEffectiveLevel);
  const downgradeAutoLevel = useSettingsStore((s) => s.downgradeAutoLevel);

  // 换文档时重算初始档；编辑正文不触发（避免大文档每次按键扫全量）
  useEffect(() => {
    if (configLevel !== "auto") return;
    const { currentContent } = useFileStore.getState();
    const lines = countLines(currentContent);
    const device = readDeviceProfile();
    setAutoEffectiveLevel(resolveAutoLevel({ lines, ...device }));
  }, [currentFilePath, configLevel, setAutoEffectiveLevel]);

  useEffect(() => {
    if (configLevel !== "auto") return;
    if (typeof PerformanceObserver === "undefined") return;

    let lastScrollAt = 0;
    let hits: number[] = [];
    let observer: PerformanceObserver | null = null;

    const onScroll = () => {
      lastScrollAt = performance.now();
    };

    const onEntries = (list: PerformanceObserverEntryList) => {
      const now = performance.now();
      // 只统计「正在滚动」时的长任务：文档加载、图表渲染造成的卡顿不算
      if (now - lastScrollAt > SCROLL_ACTIVE_MS) return;
      for (const entry of list.getEntries()) {
        if (entry.duration >= LONG_TASK_MS) hits.push(now);
      }
      hits = hits.filter((t) => now - t <= DOWNGRADE_WINDOW_MS);
      if (hits.length >= DOWNGRADE_THRESHOLD) {
        hits = [];
        downgradeAutoLevel();
      }
    };

    try {
      observer = new PerformanceObserver(onEntries);
      observer.observe({ entryTypes: ["longtask"] });
    } catch {
      observer = null; // WebKit / 不支持 longtask 的环境：只保留自动初值
    }

    document.addEventListener("scroll", onScroll, true);
    return () => {
      observer?.disconnect();
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [configLevel, downgradeAutoLevel]);
}