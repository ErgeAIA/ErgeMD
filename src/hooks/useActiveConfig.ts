import { useSettingsStore } from "@/stores/settingsStore";
import type { ReaderConfig } from "@/config/readerConfig";

/**
 * 获取当前活动配置的 Hook
 * 
 * 该 Hook 会自动响应配置级别变化，返回当前级别的完整配置。
 * 
 * @returns 当前活动配置对象
 */
export function useActiveConfig(): ReaderConfig {
  useSettingsStore((state) => state.configLevel);
  const getActiveConfig = useSettingsStore((state) => state.getActiveConfig);

  // 使用 configLevel 作为依赖，确保配置变化时重新计算
  return getActiveConfig();
}

/**
 * 获取 TOC 配置的 Hook
 */
export function useTOCConfig() {
  const config = useActiveConfig();
  return config.toc;
}

/**
 * 获取交互配置的 Hook
 */
export function useInteractionConfig() {
  const config = useActiveConfig();
  return config.interaction;
}