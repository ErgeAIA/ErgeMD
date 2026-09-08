import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FileNode, TabInfo, TocItem, TOCMeta } from "../types";
import { flushReadingProgress } from "../utils/readingProgress";

// ===== 扩展 TocItem，添加 isActive 运行时字段 =====
interface TocItemWithActive extends TocItem {
  isActive?: boolean;
}

// ===== fileStore 状态接口 =====
interface FileState {
  // 标签页
  tabs: TabInfo[];
  activeTabId: string | null;

  // 工作区
  workspacePath: string | null;
  workspaceName: string | null;
  fileTree: FileNode[] | null;

  // 当前阅读内容（从 activeTabId 派生）
  currentContent: string;
  currentFilePath: string | null;

  // TOC 数据
  tocItems: TocItemWithActive[];
  tocMeta: TOCMeta;

  // ===== Actions =====
  openFile: (filePath: string, fileName: string, content: string) => void;
  setActiveTab: (tabId: string) => void;
  goHome: () => void;
  closeTab: (tabId: string) => void;
  updateContent: (newContent: string) => void;
  pinTab: (tabId: string) => void;
  reorderTab: (fromIndex: number, toIndex: number) => void;
  setWorkspace: (
    folderPath: string,
    folderName: string,
    tree: FileNode[],
  ) => void;
  setTOCItems: (items: TocItemWithActive[]) => void;
  setTOCMeta: (meta: TOCMeta) => void;
}

export const useFileStore = create<FileState>()(
  persist(
    (set, get) => ({
      // 初始状态
      tabs: [],
      activeTabId: null,
      workspacePath: null,
      workspaceName: null,
      fileTree: null,
      currentContent: "",
      currentFilePath: null,
      tocItems: [],
      tocMeta: { totalLogicalLength: 1 },

      // 打开文件：创建或切换到标签页
      openFile: (filePath, fileName, content) => {
        const state = get();

        // 检查是否已打开
        const existingTab = state.tabs.find((t) => t.file_path === filePath);
        if (existingTab) {
          set({
            activeTabId: existingTab.id,
            currentContent: content,
            currentFilePath: filePath,
            tabs: state.tabs.map((t) => {
              if (t.id !== existingTab.id) return t;
              if (t.content === content) return t;
              return { ...t, content };
            }),
          });
          return;
        }

        // 创建新标签页
        const newTab: TabInfo = {
          id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file_path: filePath,
          file_name: fileName,
          content,
        };

        // 插入到最后一个固定 tab 之后
        let lastPinnedIndex = -1;
        for (let i = state.tabs.length - 1; i >= 0; i--) {
          if (state.tabs[i].pinned) {
            lastPinnedIndex = i;
            break;
          }
        }
        const insertIndex = lastPinnedIndex + 1;
        const newTabs = [...state.tabs];
        newTabs.splice(insertIndex, 0, newTab);

        set({
          tabs: newTabs,
          activeTabId: newTab.id,
          currentContent: content,
          currentFilePath: filePath,
        });
      },

      // 切换活跃标签页
      setActiveTab: (tabId) => {
        const state = get();
        if (state.currentFilePath && state.activeTabId !== tabId) {
          flushReadingProgress(state.currentFilePath);
        }
        const tab = state.tabs.find((t) => t.id === tabId);
        if (tab) {
          set({
            activeTabId: tabId,
            currentContent: tab.content,
            currentFilePath: tab.file_path,
          });
        }
      },

      // 返回主页（保留已打开的标签）
      goHome: () => {
        const state = get();
        if (state.currentFilePath) {
          flushReadingProgress(state.currentFilePath);
        }
        set({
          activeTabId: null,
          currentContent: "",
          currentFilePath: null,
        });
      },

      // 关闭标签页
      closeTab: (tabId) => {
        const state = get();
        const closingTab = state.tabs.find((t) => t.id === tabId);
        if (closingTab?.file_path) {
          flushReadingProgress(closingTab.file_path);
        }
        const newTabs = state.tabs.filter((t) => t.id !== tabId);

        let newActiveId = state.activeTabId;
        if (state.activeTabId === tabId) {
          const closedIndex = state.tabs.findIndex((t) => t.id === tabId);
          if (newTabs.length > 0) {
            const nextIndex = Math.min(closedIndex, newTabs.length - 1);
            newActiveId = newTabs[nextIndex].id;
          } else {
            newActiveId = null;
          }
        }

        let newContent = "";
        let newFilePath: string | null = null;
        if (newActiveId) {
          const activeTab = newTabs.find((t) => t.id === newActiveId);
          if (activeTab) {
            newContent = activeTab.content;
            newFilePath = activeTab.file_path;
          }
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveId,
          currentContent: newContent,
          currentFilePath: newFilePath,
        });
      },

      // 更新当前标签页内容（快速编辑保存后调用）
      updateContent: (newContent) => {
        const state = get();
        if (!state.activeTabId) return;

        set({
          currentContent: newContent,
          tabs: state.tabs.map((t) =>
            t.id === state.activeTabId ? { ...t, content: newContent } : t,
          ),
        });
      },

      // 固定/取消固定标签
      pinTab: (tabId) => {
        const state = get();
        const tab = state.tabs.find((t) => t.id === tabId);
        if (!tab) {
          return;
        }

        const newPinned = !tab.pinned;
        const filtered = state.tabs.filter((t) => t.id !== tabId);
        const updated = { ...tab, pinned: newPinned };

        if (newPinned) {
          let lastPinnedIndex = -1;
          for (let i = filtered.length - 1; i >= 0; i--) {
            if (filtered[i].pinned) {
              lastPinnedIndex = i;
              break;
            }
          }
          filtered.splice(lastPinnedIndex + 1, 0, updated);
        } else {
          let lastPinnedIndex = -1;
          for (let i = filtered.length - 1; i >= 0; i--) {
            if (filtered[i].pinned) {
              lastPinnedIndex = i;
              break;
            }
          }
          filtered.splice(lastPinnedIndex + 1, 0, updated);
        }

        set({ tabs: filtered });
      },

      // 拖拽排序
      reorderTab: (fromIndex, toIndex) => {
        const state = get();
        const tabs = state.tabs;
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= tabs.length) return;
        if (toIndex < 0 || toIndex >= tabs.length) return;

        const movingTab = tabs[fromIndex];
        const pinnedCount = tabs.filter((t) => t.pinned).length;
        if (!movingTab.pinned && toIndex < pinnedCount) return;
        if (movingTab.pinned && toIndex >= pinnedCount) return;

        const newTabs = [...tabs];
        newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movingTab);
        set({ tabs: newTabs });
      },

      // 设置工作区
      setWorkspace: (folderPath, folderName, tree) => {
        set({
          workspacePath: folderPath,
          workspaceName: folderName,
          fileTree: tree,
        });
      },

      // 设置 TOC 条目（含高亮状态）
      setTOCItems: (items) => {
        set({ tocItems: items });
      },

      // 设置 TOC 元数据
      setTOCMeta: (meta) => {
        set({ tocMeta: meta });
      },
    }),
    {
      name: "ergemd-file-store-v1",
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version < 2 && Array.isArray(state.tabs)) {
          state.tabs = (state.tabs as Record<string, unknown>[]).map((t) => ({
            ...t,
            content: t.content ?? "",
          }));
        }
        return state as unknown as FileState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.currentContent = "";
          state.currentFilePath = null;
        }
      },
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
      partialize: (state) =>
        ({
          tabs: state.tabs.map((t) => ({
            id: t.id,
            file_path: t.file_path,
            file_name: t.file_name,
            pinned: t.pinned,
            content: "",
          })),
          activeTabId: state.activeTabId,
          workspacePath: state.workspacePath,
          workspaceName: state.workspaceName,
        }) as unknown as FileState,
    },
  ),
);
