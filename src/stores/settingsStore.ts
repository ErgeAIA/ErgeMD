import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ConfigLevel,
  ConfigMode,
  composeReaderConfig,
  DefaultReaderConfig,
  ReaderConfig,
} from "../config/readerConfig";
import { lowerLevel } from "../utils/autoConfig";
import type { ReadingSettings, ThemeMode } from "../types";

// ===== settingsStore 状态接口 =====
interface SettingsState {
  readingSettings: ReadingSettings;
  /** 自动（默认）或手动锁定档位 */
  configLevel: ConfigMode;
  /** 自动模式下当前生效的档位（会话内可被运行时降级，不持久化） */
  autoEffectiveLevel: ConfigLevel;
  checkUpdateEnabled: boolean;
  lastCheckUpdateTime: number | null;
  skippedVersion: string | null;

  updateReadingSettings: (partial: Partial<ReadingSettings>) => void;
  setTheme: (theme: ThemeMode) => void;
  setConfigLevel: (mode: ConfigMode) => void;
  setAutoEffectiveLevel: (level: ConfigLevel) => void;
  downgradeAutoLevel: () => void;
  getActiveConfig: () => ReaderConfig;
  setCheckUpdateEnabled: (enabled: boolean) => void;
  setLastCheckUpdateTime: (time: number) => void;
  setSkippedVersion: (version: string | null) => void;
}

// ===== 默认阅读设置 =====
export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  fontSize: 16,
  lineHeight: 1.8,
  letterSpacing: 0,
  paragraphSpacing: 16,
  pageWidth: 800,
  theme: "cyberpunk",
  language: "auto",
  autoSaveProgress: true,
  mindmapLayout: "radial",
  // 思维导图默认按层级分色（同层级同色、层级间递进），与主流思维导图读法一致
  mindmapStyle: "depth",
  pinToc: false,
};

// ===== 默认配置级别 =====
const defaultConfigLevel: ConfigMode = "auto";
const defaultAutoEffectiveLevel: ConfigLevel = "medium";
const defaultCheckUpdateEnabled = true;
const defaultLastCheckUpdateTime: number | null = null;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      readingSettings: DEFAULT_READING_SETTINGS,
      configLevel: defaultConfigLevel,
      autoEffectiveLevel: defaultAutoEffectiveLevel,
      checkUpdateEnabled: defaultCheckUpdateEnabled,
      lastCheckUpdateTime: defaultLastCheckUpdateTime,
      skippedVersion: null,

      // 局部更新阅读设置
      updateReadingSettings: (partial: Partial<ReadingSettings>) => {
        set((state: SettingsState) => ({
          readingSettings: { ...state.readingSettings, ...partial },
        }));
      },

      // 设置主题
      setTheme: (theme: ThemeMode) => {
        get().updateReadingSettings({ theme });
      },

      // 设置配置级别：auto = 自动（默认），其余为手动锁定
      setConfigLevel: (mode: ConfigMode) => {
        set({ configLevel: mode });
      },

      // 自动模式：文档打开时写入初始档位；手动模式下忽略
      setAutoEffectiveLevel: (level: ConfigLevel) => {
        if (get().configLevel !== "auto") return;
        set({ autoEffectiveLevel: level });
      },

      // 运行时只降不升：连续掉帧时下调一档，本次会话内保持
      downgradeAutoLevel: () => {
        const state = get();
        if (state.configLevel !== "auto") return;
        set({ autoEffectiveLevel: lowerLevel(state.autoEffectiveLevel) });
      },

      // 获取当前活动配置：视觉参数固定中档，仅 performance 随档位变化
      getActiveConfig: (): ReaderConfig => {
        const state = get();
        const level =
          state.configLevel === "auto"
            ? state.autoEffectiveLevel
            : state.configLevel;
        return composeReaderConfig(level) || DefaultReaderConfig;
      },

      setCheckUpdateEnabled: (enabled: boolean) => {
        set({ checkUpdateEnabled: enabled });
      },

      setLastCheckUpdateTime: (time: number) => {
        set({ lastCheckUpdateTime: time });
      },

      setSkippedVersion: (version: string | null) => {
        set({ skippedVersion: version });
      },
    }),
    {
      name: "ergemd-settings",
      partialize: (state: SettingsState) => ({
        readingSettings: state.readingSettings,
        configLevel: state.configLevel,
        checkUpdateEnabled: state.checkUpdateEnabled,
        lastCheckUpdateTime: state.lastCheckUpdateTime,
        skippedVersion: state.skippedVersion,
      }),
      merge: (
        persistedState: unknown,
        currentState: SettingsState,
      ): SettingsState => {
        const persisted = persistedState as
          | {
              readingSettings?: ReadingSettings;
              configLevel?: ConfigMode;
              checkUpdateEnabled?: boolean;
              lastCheckUpdateTime?: number | null;
              skippedVersion?: string | null;
            }
          | undefined;
        return {
          ...currentState,
          readingSettings: {
            ...DEFAULT_READING_SETTINGS,
            ...(persisted?.readingSettings || {}),
          },
          // 旧持久值 "medium" 是历史默认（几乎没人主动选过），迁移为自动；
          // 显式选过低/高档的用户保留其选择
          configLevel:
            persisted?.configLevel == null || persisted.configLevel === "medium"
              ? "auto"
              : persisted.configLevel,          checkUpdateEnabled:
            persisted?.checkUpdateEnabled ?? defaultCheckUpdateEnabled,
          lastCheckUpdateTime:
            persisted?.lastCheckUpdateTime ?? defaultLastCheckUpdateTime,
          skippedVersion: persisted?.skippedVersion ?? null,
        };
      },
    },
  ),
);
