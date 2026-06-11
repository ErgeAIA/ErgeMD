import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalPosition } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef } from "react";
import { useFileStore } from "../stores/fileStore";
import { useReaderStore } from "../stores/readerStore";
import { useSettingsStore } from "../stores/settingsStore";
import type { ThemeMode } from "../types";

interface ShortcutHandlers {
  onOpenFile: (filePath?: string) => Promise<void>;
  onOpenFolder: (folderPath?: string) => Promise<void>;
  onToggleRightPanel?: () => void;
  onExportHtml?: () => void;
  onExportDocx?: () => void;
  onExportPdf?: () => void;
  onExportPdfGrayscale?: () => void;
  onToggleSidebar?: () => void;
  onToggleReadingPanel?: () => void;
  onToggleFullscreen?: () => void;
}

/**
 * 键盘快捷键系统。
 *
 * 快捷键列表：
 * - Ctrl+O: 打开文件
 * - Ctrl+Alt+O: 打开文件夹
 * - Ctrl+W: 关闭当前标签
 * - Ctrl+Tab / Ctrl+Shift+Tab: 切换标签
 * - Ctrl+F: 搜索（切换）
 * - Ctrl+Shift+T: 切换主题
 * - Ctrl+,: 打开设置面板
 * - Esc: 关闭搜索/弹窗
 * - Ctrl+↑/↓: 调整字体大小
 * - Ctrl+0: 重置字体大小
 * - Ctrl+滚轮: 缩放字体大小
 * - Ctrl+N: 新建窗口
 * - Ctrl+P: 导出 PDF（带样式）
 * - Ctrl+Shift+P: 导出 PDF（黑白）
 * - Ctrl+Shift+C: 复制当前文件路径
 * - Ctrl+Shift+D: 在资源管理器中显示
 * - Ctrl+S: 保存提示（只读模式）
 * - Ctrl+Shift+S: 另存为
 * - Ctrl+E: 导出 HTML
 * - Ctrl+Shift+E: 导出 Word
 * - Ctrl+L: 切换侧边栏
 * - Ctrl+Shift+R: 回到欢迎页
 * - F11: 全屏切换
 * - 中键拖拽: 移动窗口
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const closeTab = useFileStore((s) => s.closeTab);
  const setActiveTab = useFileStore((s) => s.setActiveTab);
  const pinTab = useFileStore((s) => s.pinTab);
  const goHome = useFileStore((s) => s.goHome);
  const openSearch = useReaderStore((s) => s.openSearch);
  const closeSearch = useReaderStore((s) => s.closeSearch);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const updateReadingSettings = useSettingsStore(
    (s) => s.updateReadingSettings,
  );

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const storeRef = useRef({
    closeTab,
    setActiveTab,
    pinTab,
    openSearch,
    closeSearch,
    setTheme,
    updateReadingSettings,
  });
  storeRef.current = {
    closeTab,
    setActiveTab,
    pinTab,
    openSearch,
    closeSearch,
    setTheme,
    updateReadingSettings,
  };

  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;

    const {
      closeTab: ct,
      setActiveTab: sat,
      openSearch: os,
      closeSearch: cs,
      setTheme: st,
      updateReadingSettings: urs,
    } = storeRef.current;
    const {
      onOpenFile: of,
      onOpenFolder: oof,
      onToggleRightPanel: otrp,
      onExportHtml: oeh,
      onExportDocx: oed,
      onExportPdf: ofr,
      onExportPdfGrayscale: ofrg,
      onToggleSidebar: ots,
      onToggleFullscreen: otf,
    } = handlersRef.current;

    const { activeTabId, tabs } = useFileStore.getState();
    const { isSearchOpen } = useReaderStore.getState();
    const { readingSettings } = useSettingsStore.getState();

    const isOKey =
      e.key === "o" || e.key === "O" || e.keyCode === 79 || e.code === "KeyO";
    const isDKey =
      e.key === "d" || e.key === "D" || e.keyCode === 68 || e.code === "KeyD";
    const isPKey =
      e.key === "p" || e.key === "P" || e.keyCode === 80 || e.code === "KeyP";
    const isEKey =
      e.key === "e" || e.key === "E" || e.keyCode === 69 || e.code === "KeyE";
    const isCKey =
      e.key === "c" || e.key === "C" || e.keyCode === 67 || e.code === "KeyC";
    const isSKey =
      e.key === "s" || e.key === "S" || e.keyCode === 83 || e.code === "KeyS";
    const isTKey =
      e.key === "t" || e.key === "T" || e.keyCode === 84 || e.code === "KeyT";

    // Ctrl+O: 打开文件
    if (ctrl && isOKey && !e.shiftKey) {
      e.preventDefault();
      of();
      return;
    }

    // Ctrl+Alt+O: 打开文件夹
    if (ctrl && e.altKey && isOKey) {
      e.preventDefault();
      oof();
      return;
    }

    // Ctrl+W: 关闭当前标签
    if (ctrl && e.key === "w") {
      e.preventDefault();
      if (activeTabId) {
        ct(activeTabId);
      }
      return;
    }

    // Ctrl+Tab: 下一个标签
    if (ctrl && e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      if (tabs.length > 1) {
        const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
        const nextIdx = (currentIdx + 1) % tabs.length;
        sat(tabs[nextIdx].id);
      }
      return;
    }

    // Ctrl+Shift+Tab: 上一个标签
    if (ctrl && e.shiftKey && e.key === "Tab") {
      e.preventDefault();
      if (tabs.length > 1) {
        const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
        const prevIdx = (currentIdx - 1 + tabs.length) % tabs.length;
        sat(tabs[prevIdx].id);
      }
      return;
    }

    // Ctrl+F: 搜索（切换）
    if (ctrl && e.key === "f") {
      e.preventDefault();
      if (isSearchOpen) {
        cs();
      } else {
        os();
      }
      return;
    }

    // Ctrl+Shift+T: 切换主题
    if (ctrl && e.shiftKey && isTKey) {
      e.preventDefault();
      e.stopPropagation();
      const themeOrder: ThemeMode[] = [
        "cyberpunk",
        "dark",
        "light",
        "system",
        "falcon",
        "aurora",
        "cherry-blossom",
        "desert-sunset",
        "forest",
        "monochrome",
        "ocean",
        "solar-flare",
        "tokyo-night",
        "neon-cyberpunk",
        "solarized-light",
      ];
      const currentIdx = themeOrder.indexOf(readingSettings.theme);
      const nextIdx = (currentIdx + 1) % themeOrder.length;
      const nextTheme = themeOrder[nextIdx];
      st(nextTheme);
      return;
    }

    // Ctrl+,: 打开设置面板
    if (ctrl && e.key === ",") {
      e.preventDefault();
      otrp?.();
      return;
    }

    // Esc: 关闭搜索
    if (e.key === "Escape") {
      if (isSearchOpen) {
        cs();
      }
      return;
    }

    // Ctrl+↑/↓: 调整字体大小
    if (ctrl && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const delta = e.key === "ArrowUp" ? 1 : -1;
      const newSize = Math.max(
        14,
        Math.min(32, readingSettings.fontSize + delta),
      );
      urs({ fontSize: newSize });
      return;
    }

    // Ctrl+0: 重置字体大小
    if (ctrl && e.key === "0") {
      e.preventDefault();
      urs({ fontSize: 16 });
      return;
    }

    // Ctrl+N: 新建窗口
    if (ctrl && e.key === "n") {
      e.preventDefault();
      try {
        invoke("new_window", {});
      } catch (err) {
        console.error("Failed to create new window:", err);
      }
      return;
    }

    // Ctrl+Shift+P: 导出 PDF（黑白）
    if (ctrl && e.shiftKey && isPKey) {
      e.preventDefault();
      ofrg?.();
      return;
    }

    // Ctrl+P: 导出 PDF（带样式）
    if (ctrl && isPKey && !e.shiftKey) {
      e.preventDefault();
      ofr?.();
      return;
    }

    // Ctrl+Shift+C: 复制当前文件路径
    if (ctrl && e.shiftKey && isCKey) {
      e.preventDefault();
      const fp = useFileStore.getState().currentFilePath;
      if (fp) {
        navigator.clipboard.writeText(fp);
      }
      return;
    }

    // Ctrl+Shift+D: 在资源管理器中显示当前文件
    if (ctrl && e.shiftKey && isDKey) {
      e.preventDefault();
      const fp = useFileStore.getState().currentFilePath;
      if (fp) {
        invoke("reveal_in_explorer", { filePath: fp }).catch((err) => {
          console.error("Failed to reveal in explorer:", err);
        });
      } else {
        useReaderStore
          .getState()
          .addToast({ type: "warning", message: "当前没有打开的文件" });
      }
      return;
    }

    // Ctrl+S: 保存提示（只读模式）
    if (ctrl && isSKey && !e.shiftKey) {
      e.preventDefault();
      useReaderStore
        .getState()
        .addToast({ type: "info", message: "当前为只读模式，无需保存" });
      return;
    }

    // Ctrl+Shift+S: 另存为
    if (ctrl && e.shiftKey && isSKey) {
      e.preventDefault();
      return;
    }

    // Ctrl+E: 导出 HTML
    if (ctrl && isEKey && !e.shiftKey) {
      e.preventDefault();
      oeh?.();
      return;
    }

    // Ctrl+Shift+E: 导出 Word
    if (ctrl && e.shiftKey && isEKey) {
      e.preventDefault();
      oed?.();
      return;
    }

    // Ctrl+L: 切换侧边栏
    if (ctrl && e.key === "l") {
      e.preventDefault();
      ots?.();
      return;
    }

    // Ctrl+Shift+R: 回到欢迎页
    if (ctrl && e.shiftKey && e.key === "R") {
      e.preventDefault();
      goHome();
      return;
    }

    // F11: 全屏切换
    if (e.key === "F11") {
      e.preventDefault();
      otf?.();
      return;
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Ctrl+滚轮：缩放界面字体大小
  // Shift+滚轮：缩放行间距
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const { readingSettings } = useSettingsStore.getState();
        const current = readingSettings.lineHeight || 1.8;
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newLH = Math.max(
          1.0,
          Math.min(3.0, parseFloat((current + delta).toFixed(1))),
        );
        if (newLH !== current) {
          useSettingsStore
            .getState()
            .updateReadingSettings({ lineHeight: newLH });
        }
        return;
      }

      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const { readingSettings } = useSettingsStore.getState();
      const currentSize = readingSettings.fontSize || 16;
      const delta = e.deltaY > 0 ? -1 : 1;
      const newSize = Math.max(12, Math.min(32, currentSize + delta));

      if (newSize !== currentSize) {
        useSettingsStore
          .getState()
          .updateReadingSettings({ fontSize: newSize });
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // 中键按住拖拽移动窗口
  useEffect(() => {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startPos: { x: number; y: number } | null = null;

    const handleMouseDown = async (e: MouseEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();

      isDragging = true;
      startX = e.screenX;
      startY = e.screenY;

      try {
        startPos = await getCurrentWindow().outerPosition();
      } catch {
        startPos = null;
      }
    };

    const handleMouseMove = async (e: MouseEvent) => {
      if (!isDragging || !startPos) return;

      const dx = e.screenX - startX;
      const dy = e.screenY - startY;

      try {
        await getCurrentWindow().setPosition(
          new LogicalPosition(startPos.x + dx, startPos.y + dy),
        );
      } catch (err) {
        console.warn("setPosition failed:", err);
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
      startPos = null;
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);
}
