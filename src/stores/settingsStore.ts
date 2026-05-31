import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ConfigLevel,
  DefaultReaderConfig,
  PresetConfigs,
  ReaderConfig,
} from "../config/readerConfig";
import type { ReadingSettings, ThemeMode } from "../types";

// ===== settingsStore 状态接口 =====
interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes: string;
}

interface SettingsState {
  readingSettings: ReadingSettings;
  configLevel: ConfigLevel;
  checkUpdateEnabled: boolean;
  lastCheckUpdateTime: number | null;
  updateInfo: UpdateInfo | null;

  updateReadingSettings: (partial: Partial<ReadingSettings>) => void;
  setTheme: (theme: ThemeMode) => void;
  setConfigLevel: (level: ConfigLevel) => void;
  getActiveConfig: () => ReaderConfig;
  setCheckUpdateEnabled: (enabled: boolean) => void;
  setLastCheckUpdateTime: (time: number) => void;
  setUpdateInfo: (info: UpdateInfo | null) => void;
}

// ===== 默认阅读设置 =====
const defaultReadingSettings: ReadingSettings = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  fontSize: 16,
  lineHeight: 1.8,
  letterSpacing: 0,
  paragraphSpacing: 16,
  pageWidth: 800,
  theme: "cyberpunk",
  language: "auto",
  autoSaveProgress: true,
};

// ===== 默认配置级别 =====
const defaultConfigLevel: ConfigLevel = "medium";
const defaultCheckUpdateEnabled = true;
const defaultLastCheckUpdateTime: number | null = null;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      readingSettings: defaultReadingSettings,
      configLevel: defaultConfigLevel,
      checkUpdateEnabled: defaultCheckUpdateEnabled,
      lastCheckUpdateTime: defaultLastCheckUpdateTime,
      updateInfo: null,

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

      // 设置配置级别
      setConfigLevel: (level: ConfigLevel) => {
        set({ configLevel: level });
      },

      // 获取当前活动配置
      getActiveConfig: (): ReaderConfig => {
        const level = get().configLevel;
        return PresetConfigs[level] || DefaultReaderConfig;
      },

      setCheckUpdateEnabled: (enabled: boolean) => {
        set({ checkUpdateEnabled: enabled });
      },

      setLastCheckUpdateTime: (time: number) => {
        set({ lastCheckUpdateTime: time });
      },

      setUpdateInfo: (info: UpdateInfo | null) => {
        set({ updateInfo: info });
      },
    }),
    {
      name: "ergemd-settings",
      partialize: (state: SettingsState) => ({
        readingSettings: state.readingSettings,
        configLevel: state.configLevel,
        checkUpdateEnabled: state.checkUpdateEnabled,
        lastCheckUpdateTime: state.lastCheckUpdateTime,
      }),
      merge: (
        persistedState: unknown,
        currentState: SettingsState,
      ): SettingsState => {
        const persisted = persistedState as
          | {
              readingSettings?: ReadingSettings;
              configLevel?: ConfigLevel;
              checkUpdateEnabled?: boolean;
              lastCheckUpdateTime?: number | null;
            }
          | undefined;
        return {
          ...currentState,
          readingSettings: {
            ...defaultReadingSettings,
            ...(persisted?.readingSettings || {}),
          },
          configLevel: persisted?.configLevel ?? defaultConfigLevel,
          checkUpdateEnabled:
            persisted?.checkUpdateEnabled ?? defaultCheckUpdateEnabled,
          lastCheckUpdateTime:
            persisted?.lastCheckUpdateTime ?? defaultLastCheckUpdateTime,
          updateInfo: null,
        };
      },
    },
  ),
);
