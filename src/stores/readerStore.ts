import { create } from "zustand";
import type { ToastMessage } from "../types";

// ===== readerStore 状态接口 =====
interface ReaderState {
  // 搜索状态
  searchQuery: string;
  searchResults: number[];
  currentSearchIndex: number;
  isSearchOpen: boolean;

  // Toast 通知
  toasts: ToastMessage[];

  // 图片预览
  previewImage: string | null;

  // 文件变更提示
  fileChanged: string | null;

  // QuickEdit 触发信号（右键菜单"编辑此段落"使用）
  quickEditSignal: number;
  // 右键菜单触发的编辑目标元素
  contextMenuEditTarget: HTMLElement | null;

  // QuickEdit 状态
  isQuickEditing: boolean;
  quickEditElement: HTMLElement | null;
  quickEditOriginalText: string;
  quickEditText: string;

  // ===== Actions =====
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: number[]) => void;
  setCurrentSearchIndex: (index: number) => void;
  clearSearch: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  nextMatch: () => void;
  prevMatch: () => void;
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
  setPreviewImage: (url: string | null) => void;
  setFileChanged: (path: string | null) => void;
  triggerQuickEdit: () => void;
  setContextMenuEditTarget: (el: HTMLElement | null) => void;
  quickEditLineRange: { startLine: number; endLine: number } | null;
  startQuickEdit: (
    element: HTMLElement,
    originalText: string,
    lineRange?: { startLine: number; endLine: number },
  ) => void;
  updateQuickEditText: (text: string) => void;
  cancelQuickEdit: () => void;
  finishQuickEdit: () => void;
}

// Toast 定时器管理
const toastTimers = new Map<string, number>();

export const useReaderStore = create<ReaderState>((set, get) => ({
  searchQuery: "",
  searchResults: [],
  currentSearchIndex: -1,
  isSearchOpen: false,
  toasts: [],
  previewImage: null,
  fileChanged: null,
  quickEditSignal: 0,
  contextMenuEditTarget: null,
  isQuickEditing: false,
  quickEditElement: null,
  quickEditOriginalText: "",
  quickEditText: "",
  quickEditLineRange: null,

  setSearchQuery: (query) => {
    set({ searchQuery: query, searchResults: [], currentSearchIndex: -1 });
  },

  setSearchResults: (results) => {
    set({
      searchResults: results,
      currentSearchIndex: results.length > 0 ? 0 : -1,
    });
  },

  setCurrentSearchIndex: (index) => {
    set({ currentSearchIndex: index });
  },

  clearSearch: () => {
    set({
      searchQuery: "",
      searchResults: [],
      currentSearchIndex: -1,
      isSearchOpen: false,
    });
  },

  openSearch: () => {
    set({
      isSearchOpen: true,
      searchQuery: "",
      searchResults: [],
      currentSearchIndex: -1,
    });
  },

  closeSearch: () => {
    // 复用 clearSearch 逻辑，避免重复代码
    get().clearSearch();
  },

  nextMatch: () => {
    const { searchResults, currentSearchIndex } = get();
    if (searchResults.length === 0) return;
    const next =
      currentSearchIndex >= searchResults.length - 1
        ? 0
        : currentSearchIndex + 1;
    set({ currentSearchIndex: next });
  },

  prevMatch: () => {
    const { searchResults, currentSearchIndex } = get();
    if (searchResults.length === 0) return;
    const prev =
      currentSearchIndex <= 0
        ? searchResults.length - 1
        : currentSearchIndex - 1;
    set({ currentSearchIndex: prev });
  },

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    // 自动移除
    const duration = toast.duration ?? 3000;
    if (duration > 0) {
      const timer = window.setTimeout(() => {
        toastTimers.delete(id);
        get().removeToast(id);
      }, duration);
      toastTimers.set(id, timer);
    }
  },

  removeToast: (id) => {
    // 清除定时器（如果尚未触发）
    const timer = toastTimers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      toastTimers.delete(id);
    }
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  setPreviewImage: (url) => {
    set({ previewImage: url });
  },

  setFileChanged: (path) => {
    set({ fileChanged: path });
  },

  triggerQuickEdit: () => {
    set({ quickEditSignal: Date.now() });
  },

  setContextMenuEditTarget: (el) => {
    set({ contextMenuEditTarget: el });
  },

  startQuickEdit: (element, originalText, lineRange) => {
    set({
      isQuickEditing: true,
      quickEditElement: element,
      quickEditOriginalText: originalText,
      quickEditText: originalText,
      quickEditLineRange: lineRange ?? null,
    });
  },

  updateQuickEditText: (text) => {
    set({ quickEditText: text });
  },

  cancelQuickEdit: () => {
    set({
      isQuickEditing: false,
      quickEditElement: null,
      quickEditOriginalText: "",
      quickEditText: "",
      quickEditLineRange: null,
      contextMenuEditTarget: null,
    });
  },

  finishQuickEdit: () => {
    set({
      isQuickEditing: false,
      quickEditElement: null,
      quickEditOriginalText: "",
      quickEditText: "",
      quickEditLineRange: null,
      contextMenuEditTarget: null,
    });
  },
}));
