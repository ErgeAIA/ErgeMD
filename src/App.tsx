import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ToastContainer from "./components/common/Toast";
import HoverHint from "./components/common/HoverHint";
import UpdateChecker from "./components/common/UpdateChecker";
import ContextMenu from "./components/context-menu/ContextMenu";
import { getReaderContextMenuItems } from "./components/context-menu/ReaderContextMenu";
import AppLayout from "./components/layout/AppLayout";
import StatusBar from "./components/layout/StatusBar";
import TitleBar from "./components/layout/TitleBar";
import { WindowResizeHandles } from "./components/layout/WindowResizeHandles";
import LeftPanel from "./components/panels/LeftPanel";
import RightPanel from "./components/panels/RightPanel";
import ImagePreview from "./components/reader/ImagePreview";
import QuickEdit from "./components/reader/QuickEdit";
import ReadingArea from "./components/reader/ReadingArea";
import SearchBar from "./components/reader/SearchBar";
import AboutPage from "./components/welcome/AboutPage";
import EasterEgg from "./components/welcome/EasterEgg";
import WelcomePage from "./components/welcome/WelcomePage";
import { useActiveConfig } from "./hooks/useActiveConfig";
import { useAutoHide } from "./hooks/useAutoHide";
import { useContextMenu } from "./hooks/useContextMenu";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useQuickEdit } from "./hooks/useQuickEdit";
import { useReadingProgress } from "./hooks/useReadingProgress";
import { useAutoConfig } from "./hooks/useAutoConfig";
import { useTheme } from "./hooks/useTheme";
import { useFileStore } from "./stores/fileStore";
import { useReaderStore } from "./stores/readerStore";
import i18n from "./i18n";
import type { DirListing, FileNode, TabInfo } from "./types";
import { exportHtml } from "./utils/export";
import { exportDocx } from "./utils/exportDocx";
import { exportPdf, exportPdfGrayscale } from "./utils/exportPdf";
import { queryActiveMarkdownBody } from "./utils/domUtils";
import { cacheWordCount, flushAllReadingProgress } from "./utils/readingProgress";
import { extractTOC } from "./utils/toc";
import { countWords } from "./utils/wordCount";

/** 常驻 Tab 上限（审计 M3）：活动 + 固定 + 最近活动的 N 个常驻，超出者卸载阅读区 */
const MAX_RESIDENT_TABS = 3;

/** 工作区根目录只取一层；深层目录由 FileList 按展开懒加载 */
async function scanRootEntries(dirPath: string): Promise<FileNode[]> {
  const listing = await invoke<DirListing>("scan_directory", { dirPath });
  return listing.entries;
}

function App() {
  const { t } = useTranslation();
  /** 同一条编码提醒每个会话只提示一次，避免恢复多标签时刷屏 */
  const notifiedEncodingRef = useRef(new Set<string>());
  /** 每个已打开文件的 mtime 基线，用于窗口重新聚焦时判断外部改动 */
  const fileMtimeRef = useRef(new Map<string, number>());

  // 主题切换 — 自动同步 data-theme 属性到 <html>
  useTheme();

  // 自动性能档：按文档与设备选初始档，滚动掉帧时只降不升
  useAutoConfig();

  // 阅读器配置（虚拟滚动阈值等，与 ReadingArea 同一来源）
  const readerConfig = useActiveConfig();

  // 右键菜单
  const {
    menuState,
    menuRef,
    show: showContextMenu,
    hide: hideContextMenu,
    adjustPosition,
  } = useContextMenu();

  const hasOpenFile = useFileStore((s) => s.currentFilePath !== null);
  const hasWorkspace = useFileStore((s) => s.workspacePath !== null);
  const openFile = useFileStore((s) => s.openFile);
  const setWorkspace = useFileStore((s) => s.setWorkspace);
  const setTOCItems = useFileStore((s) => s.setTOCItems);
  const setTOCMeta = useFileStore((s) => s.setTOCMeta);
  const currentFilePath = useFileStore((s) => s.currentFilePath);
  const externalFileChanged = useReaderStore((s) => s.fileChanged);
  const currentContent = useFileStore((s) => s.currentContent);
  const tabs = useFileStore((s) => s.tabs);
  const activeTabId = useFileStore((s) => s.activeTabId);

  // scrollElement 通过 onScrollReady 回调获取（非 RefObject）
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  // About / EasterEgg 显示状态
  const [showAbout, setShowAbout] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  // 恢复期间防闪
  const [isRestoring, setIsRestoring] = useState(true);

  // 面板切换状态
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const toggleRightPanel = useCallback(
    () => setRightPanelOpen((v) => !v),
    [],
  );

  // TitleBar 自动隐藏（顶部触发）
  const { visible: titleBarVisible, transition: titleBarTransition } =
    useAutoHide(scrollElement, {
      triggerHeight: 40,
      triggerPosition: "top",
    });

  // 右键菜单打开时，强制 TitleBar 可见（防止菜单随标题栏渐隐）
  const effectiveTitleBarVisible =
    titleBarVisible || (menuState?.visible ?? false);

  // 数据库就绪状态（解决 init_database 与 get_recent_files 的竞态条件）
  const [dbReady, setDbReady] = useState(false);

  /**
   * 读取 Markdown（含编码探测结果）。非 UTF-8 解码或存在替换字符时提示一次：
   * Rust 侧按 BOM → UTF-8 → GB18030 → UTF-8 lossy 顺序解码，避免 GBK 文档整页乱码。
   */
  const readMarkdown = useCallback(async (path: string) => {
    const result = await invoke<{
      content: string;
      word_count: number;
      encoding: string;
      had_errors: boolean;
    }>("read_file", { path });

    // 记录读取时刻的 mtime，作为外部改动的比较基线
    try {
      const mtime = await invoke<number>("get_file_mtime", { path });
      fileMtimeRef.current.set(path, mtime);
    } catch {
      // 取不到 mtime 只是失去改动感知，不影响阅读
    }

    const key = result.had_errors
      ? "lossy"
      : result.encoding !== "utf-8"
        ? result.encoding
        : null;
    if (key && !notifiedEncodingRef.current.has(key)) {
      notifiedEncodingRef.current.add(key);
      useReaderStore.getState().addToast({
        type: result.had_errors ? "warning" : "info",
        message: result.had_errors
          ? i18n.t("reader.encodingLossy")
          : i18n.t("reader.encodingFallback", {
              encoding: result.encoding.toUpperCase(),
            }),
      });
    }
    useReaderStore.getState().setFileChanged(null);
    return result;
  }, []);

  /** 窗口重新获得焦点时对比 mtime；变了只提示，不自动刷新（避免打断阅读） */
  const checkFileChanged = useCallback(async () => {
    const path = useFileStore.getState().currentFilePath;
    if (!path) {
      useReaderStore.getState().setFileChanged(null);
      return;
    }
    try {
      const mtime = await invoke<number>("get_file_mtime", { path });
      const base = fileMtimeRef.current.get(path);
      if (base !== undefined && mtime !== base) {
        useReaderStore.getState().setFileChanged(path);
      }
    } catch {
      // 文件被删除或暂时不可读时静默，交给下一次读取报错
    }
  }, []);

  /** 重新读取当前文件（提示条点击与 Ctrl/Cmd+R） */
  const reloadCurrentFile = useCallback(async () => {
    const state = useFileStore.getState();
    const path = state.currentFilePath;
    if (!path) return;
    const tab = state.tabs.find((t) => t.file_path === path);
    const fileName = tab?.file_name ?? path.split(/[/\\]/).pop() ?? "Untitled";
    try {
      const result = await readMarkdown(path);
      state.openFile(path, fileName, result.content);
    } catch {
      useReaderStore
        .getState()
        .addToast({ type: "error", message: i18n.t("reader.readFailed") });
    }
  }, [readMarkdown]);

  // 窗口重新聚焦 / 标签页可见时检查一次外部改动（不轮询、不用文件监听）
  useEffect(() => {
    const handleCheck = () => {
      void checkFileChanged();
    };
    const handleVisibility = () => {
      if (!document.hidden) void checkFileChanged();
    };
    window.addEventListener("focus", handleCheck);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleCheck);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkFileChanged]);

  // Ctrl/Cmd+R 重新读取当前文件（README 已承诺该快捷键）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isR = e.key === "r" || e.key === "R";
      if (!isR || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      if (!useFileStore.getState().currentFilePath) return;
      e.preventDefault();
      void reloadCurrentFile();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reloadCurrentFile]);

  // 切换到别的文件时清掉上一份文件的改动提示
  useEffect(() => {
    const { fileChanged, setFileChanged } = useReaderStore.getState();
    if (fileChanged && fileChanged !== currentFilePath) setFileChanged(null);
  }, [currentFilePath]);

  // 最近活动的 Tab 记录（常驻窗口用，审计 M3）
  const [recentTabIds, setRecentTabIds] = useState<string[]>([]);

  // 初始化数据库（最近文件、阅读进度等持久化功能依赖）
  useEffect(() => {
    invoke("init_database")
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error("Failed to initialize database:", err);
        useReaderStore
          .getState()
          .addToast({ type: "error", message: i18n.t("reader.dbInitFailed") });
      });
  }, []);

  // 启动时恢复持久化的 tab 内容
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const state = useFileStore.getState();
        const tabs = state.tabs;
        const activeTabId = state.activeTabId;

        if (tabs.length === 0) {
          return;
        }

        const validTabs: TabInfo[] = [];
        for (const tab of tabs) {
          try {
            const result = await readMarkdown(tab.file_path);
            if (cancelled) return;
            validTabs.push({
              ...tab,
              content: result.content,
            });
          } catch {
            if (cancelled) return;
          }
        }

        if (cancelled) return;

        let newActiveTabId = activeTabId;
        if (newActiveTabId && !validTabs.find((t) => t.id === newActiveTabId)) {
          newActiveTabId = validTabs.length > 0 ? validTabs[0].id : null;
        }

        const activeTab = validTabs.find((t) => t.id === newActiveTabId);

        useFileStore.setState({
          tabs: validTabs,
          activeTabId: newActiveTabId,
          currentContent: activeTab?.content ?? "",
          currentFilePath: activeTab?.file_path ?? null,
        });

        if (state.workspacePath) {
          try {
            // 只验证目录仍可读；根层条目由 FileList 自行懒加载
            await scanRootEntries(state.workspacePath);
          } catch {
            if (!cancelled) {
              useFileStore.setState({
                workspacePath: null,
                workspaceName: null,
                expandedPaths: [],
              });
            }
          }
        }
      } catch {
        // 恢复失败时静默处理，不抛异常
      } finally {
        if (!cancelled) {
          setIsRestoring(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 记录最近活动的 Tab（常驻窗口用，审计 M3）
  useEffect(() => {
    if (!activeTabId) return;
    setRecentTabIds((prev) =>
      [activeTabId, ...prev.filter((id) => id !== activeTabId)].slice(
        0,
        MAX_RESIDENT_TABS,
      ),
    );
  }, [activeTabId]);

  // 关窗 / 页面隐藏时 flush 所有 Tab 的阅读进度到数据库
  useEffect(() => {
    const flushAll = () => {
      flushAllReadingProgress();
    };
    window.addEventListener("beforeunload", flushAll);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flushAll();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("beforeunload", flushAll);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // TOC：小文档用 extractTOC 生成；
  // 大文档（虚拟模式）跳过全文扫描——TOC 由 VirtualMarkdownView 的解析器单源产出（审计 M1/M2）
  useEffect(() => {
    if (!currentContent) {
      setTOCItems([]);
      setTOCMeta({ totalLogicalLength: 1 });
      return;
    }

    const lineCount = currentContent.split(/\r?\n/).length;
    if (lineCount >= readerConfig.performance.virtualThreshold) {
      setTOCItems([]);
      setTOCMeta({ totalLogicalLength: Math.max(lineCount, 1) });
      return;
    }

    const { items, meta } = extractTOC(currentContent);
    setTOCItems(items);
    setTOCMeta(meta);
  }, [currentContent, setTOCItems, setTOCMeta, readerConfig.performance.virtualThreshold]);

  // 阅读进度
  const { percentage, isScrolling } = useReadingProgress(
    scrollElement,
    currentFilePath,
  );

  // 字数统计
  const wordCount = React.useMemo(
    () => countWords(currentContent),
    [currentContent],
  );

  // 字数写入进度缓存，供 flush 时持久化真实 wordCount（审计 L4）
  useEffect(() => {
    if (currentFilePath) {
      cacheWordCount(currentFilePath, wordCount);
    }
  }, [currentFilePath, wordCount]);

  // StatusBar 透明度控制：鼠标移到底部时显示，离开时淡出
  const [statusBarHovered, setStatusBarHovered] = useState(false);
  const statusBarOpacity = React.useMemo(() => {
    if (statusBarHovered) return 0.8;
    if (isScrolling) return 0.6;
    // 静止态下限 0.45：0.2 时字数/进度在深色画布上约 1.3:1，等于看不见
    return 0.45;
  }, [statusBarHovered, isScrolling]);

  // ReadingArea scroll 容器就绪回调
  const handleScrollReady = useCallback((el: HTMLElement | null) => {
    setScrollElement(el);
  }, []);

  // 多窗口启动参数处理（Task 11）
  useEffect(() => {
    const url = new URL(window.location.href);
    const filePath = url.searchParams.get("file");
    const workspacePath = url.searchParams.get("workspace");

    if (!filePath && !workspacePath) return;

    let cancelled = false;
    (async () => {
      if (filePath) {
        const result = await readMarkdown(filePath).catch(() => null);
        if (cancelled || !result) return;
        const fileName = filePath.split(/[/\\]/).pop() || "Untitled";
        useFileStore.getState().openFile(filePath, fileName, result.content);
      }
      if (workspacePath) {
        const tree = await scanRootEntries(workspacePath).catch(() => null);
        if (cancelled || !tree) return;
        const folderName = workspacePath.split(/[/\\]/).pop() || "Workspace";
        useFileStore.getState().setWorkspace(workspacePath, folderName);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 文件关联打开处理：冷启动时从 Rust 端取 pending 文件 + 热启动时监听事件
  useEffect(() => {
    let cancelled = false;

    const openFilePath = async (filePath: string) => {
      try {
        const result = await readMarkdown(filePath);
        if (cancelled) return;
        const fileName = filePath.split(/[/\\]/).pop() || "Untitled";
        useFileStore.getState().openFile(filePath, fileName, result.content);
      } catch {
        if (!cancelled) {
          useReaderStore
            .getState()
            .addToast({ type: "error", message: i18n.t("reader.readFailed") });
        }
      }
    };

    // 冷启动：前端就绪后从 Rust 端获取 pending 文件路径
    invoke<string | null>("get_pending_file")
      .then((filePath) => {
        if (!cancelled && filePath) {
          openFilePath(filePath);
        }
      })
      .catch(() => {});

    // 热启动：监听 Rust 端 emit 的 file-opened 事件
    const unlisten = listen<string>("file-opened", (event) => {
      if (!cancelled && event.payload) {
        openFilePath(event.payload);
      }
    });

    return () => {
      cancelled = true;
      unlisten.then((fn) => fn());
    };
  }, []);

  // 阅读区右键菜单处理
  const handleReaderContextMenu = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // 检查是否在Mermaid图表区域内，如果是则不处理，让MermaidDiagram组件自己处理
      const isMermaidArea = !!(
        target.closest('[data-block-type="mermaid"]') ||
        target.closest(".mermaid")
      );
      if (isMermaidArea) {
        return; // 完全不处理Mermaid区域的右键菜单
      }

      const selection = window.getSelection();
      const hasSelection =
        selection !== null && selection.toString().length > 0;
      const selectedText = selection?.toString() || "";

      // 判断是否可以编辑此段落
      // 支持：段落、标题、列表项、表格、引用、数学公式
      // 不支持：Mermaid图表、代码块、链接、图片、按钮等
      // 存储编辑目标，供 MarkdownView 直接使用
      useReaderStore.getState().setContextMenuEditTarget(target);
      const canEditParagraph =
        !!(
          target.closest("p") ||
          target.closest("h1") ||
          target.closest("h2") ||
          target.closest("h3") ||
          target.closest("h4") ||
          target.closest("h5") ||
          target.closest("h6") ||
          target.closest("li") ||
          target.closest("table") ||
          target.closest("blockquote") ||
          target.closest('[data-block-type="math"]')
        ) &&
        !!(
          !target.closest('[data-block-type="mermaid"]') &&
          !target.closest("pre") &&
          !target.closest("code") &&
          !target.closest("a") &&
          !target.closest("img") &&
          !target.closest("button") &&
          !target.closest("input") &&
          !target.closest("textarea")
        );

      const items = getReaderContextMenuItems({
        hasSelection,
        selectedText,
        onCopy: () => {
          if (hasSelection) navigator.clipboard.writeText(selectedText);
        },
        onSelectAll: () => {
          const markdownBody = queryActiveMarkdownBody();
          if (markdownBody) {
            const range = document.createRange();
            range.selectNodeContents(markdownBody);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        },
        onSearch: (query) => {
          useReaderStore.getState().openSearch();
          useReaderStore.getState().setSearchQuery(query);
        },
        onEditParagraph: () => {
          useReaderStore.getState().triggerQuickEdit();
        },
        canEditParagraph,
        onExportHtml: () => {
          exportHtml().catch(() => {
            useReaderStore
              .getState()
              .addToast({ type: "error", message: i18n.t("reader.exportFailed") });
          });
        },
        onExportPdf: () => {
          exportPdf().catch(() => {
            useReaderStore
              .getState()
              .addToast({ type: "error", message: i18n.t("reader.exportFailed") });
          });
        },
        onExportPdfGrayscale: () => {
          exportPdfGrayscale().catch(() => {
            useReaderStore
              .getState()
              .addToast({ type: "error", message: i18n.t("reader.exportFailed") });
          });
        },
        onExportDocx: () => {
          const content = useFileStore.getState().currentContent;
          exportDocx(content || "").catch(() => {
            useReaderStore
              .getState()
              .addToast({ type: "error", message: i18n.t("reader.exportFailed") });
          });
        },
        onOpenInNewWindow: () => {
          const fp = useFileStore.getState().currentFilePath;
          if (fp) {
            invoke("new_window", { filePath: fp, workspacePath: null }).catch(
              () => {},
            );
          }
        },
        onShowAbout: () => setShowAbout(true),
      });

      showContextMenu(e, items);
    },
    [showContextMenu],
  );

  const handleOpenFile = useCallback(
    async (filePath?: string) => {
      let selectedPaths: string[];
      if (filePath) {
        selectedPaths = [filePath];
      } else {
        const result = await open({
          multiple: true,
          filters: [
            { name: "Markdown", extensions: ["md", "markdown", "mdx"] },
          ],
        });
        if (!result) return;
        selectedPaths = Array.isArray(result) ? result : [result];
      }

      for (const selectedPath of selectedPaths) {
        try {
          const result = await readMarkdown(selectedPath);
          const fileName = selectedPath.split(/[/\\]/).pop() || "Untitled";
          openFile(selectedPath, fileName, result.content);
          // 记录最近打开的文件
          invoke("add_recent_file", {
            filePath: selectedPath,
            fileName: fileName,
          }).catch((err) => console.error("Failed to save recent file:", err));
        } catch (err) {
          console.error("Failed to read file:", err);
          const fileName = selectedPath.split(/[/\\]/).pop() || "Untitled";
          // 先确认文件是否还在：不存在就是「失效的快捷方式」，按移除处理而不是报读取失败
          const exists = await invoke<boolean>("file_exists", {
            path: selectedPath,
          }).catch(() => true);
          if (!exists) {
            invoke("delete_recent_file", { filePath: selectedPath }).catch(
              () => {},
            );
            window.dispatchEvent(new CustomEvent("ergemd:recent-files-changed"));
            useReaderStore.getState().addToast({
              type: "warning",
              message: i18n.t("reader.fileMissingRemoved", { name: fileName }),
            });
            continue;
          }
          const msg = String(err);
          let toastMsg = i18n.t("reader.readFailed");
          if (msg.includes("permission") || msg.includes("Permission")) {
            toastMsg = i18n.t("reader.permissionDenied");
          } else if (msg.includes("encoding")) {
            toastMsg = i18n.t("reader.encodingLossy");
          }
          useReaderStore
            .getState()
            .addToast({ type: "error", message: toastMsg });
        }
      }
    },
    [openFile, readMarkdown],
  );

  const handleOpenFolder = useCallback(
    async (folderPath?: string) => {
      let selectedPath = folderPath;
      if (!selectedPath) {
        const result = await open({ directory: true, multiple: false });
        if (!result) return;
        selectedPath = result as string;
      }

      try {
        await scanRootEntries(selectedPath);
        const folderName = selectedPath.split(/[/\\]/).pop() || "Workspace";
        setWorkspace(selectedPath, folderName);
        setLeftPanelOpen(true);
      } catch (err) {
        console.error("Failed to scan workspace:", err);
        useReaderStore
          .getState()
          .addToast({ type: "error", message: i18n.t("reader.folderOpenFailed") });
      }
    },
    [setWorkspace],
  );

  // F12 打开彩蛋页面
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        setShowEasterEgg((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleFileSelect = useCallback(
    async (filePath: string, fileName: string) => {
      try {
        const result = await readMarkdown(filePath);
        openFile(filePath, fileName, result.content);
        invoke("add_recent_file", {
          filePath: filePath,
          fileName: fileName,
        }).catch((err) => console.error("Failed to save recent file:", err));
      } catch (err) {
        console.error("Failed to read file:", err);
        const fileName = filePath.split(/[/\\]/).pop() || "Untitled";
        // 树/最近列表都可能已陈旧：先确认文件是否还在，再决定文案
        const exists = await invoke<boolean>("file_exists", { path: filePath }).catch(
          () => true,
        );
        if (!exists) {
          invoke("delete_recent_file", { filePath }).catch(() => {});
          window.dispatchEvent(new CustomEvent("ergemd:recent-files-changed"));
          window.dispatchEvent(new CustomEvent("ergemd:workspace-refresh"));
          useReaderStore.getState().addToast({
            type: "warning",
            message: i18n.t("reader.fileMissingRemoved", { name: fileName }),
          });
          return;
        }
        useReaderStore
          .getState()
          .addToast({ type: "error", message: i18n.t("reader.readFailed") });
      }
    },
    [openFile, readMarkdown],
  );

  // 拖拽文件打开
  const handleDropFiles = useCallback(
    async (filePaths: string[]) => {
      for (const filePath of filePaths) {
        await handleOpenFile(filePath);
      }
    },
    [handleOpenFile],
  );

  // 拖拽文件夹打开
  const handleDropFolder = useCallback(
    async (folderPath: string) => {
      await handleOpenFolder(folderPath);
    },
    [handleOpenFolder],
  );

  // ===== 拖拽文件处理（使用 Tauri 原生 onDragDropEvent）=====
  // ⚠️ ERROR-LOG 规则：禁止使用 DOM drag 事件（onDragEnter/Over/Leave/Drop），
  //    DOM drag 事件会干扰 Tauri 无边框窗口的 startDragging()。
  //    必须使用 getCurrentWebview().onDragDropEvent() 原生 API。
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      const payload = event.payload as {
        type: string;
        paths?: string[];
        position?: { x: number; y: number };
      };
      const { type, paths } = payload;

      if (type === "over") {
        setIsDragging(true);
      } else if (type === "drop") {
        setIsDragging(false);
        if (paths && paths.length > 0) {
          const mdFiles = paths.filter(
            (p) =>
              p.endsWith(".md") ||
              p.endsWith(".markdown") ||
              p.endsWith(".mdx"),
          );
          if (mdFiles.length > 0) {
            handleDropFiles(mdFiles);
          } else if (paths.length === 1) {
            handleDropFolder(paths[0]);
          }
        }
      } else {
        // "leave" or "cancel"
        setIsDragging(false);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [handleDropFiles, handleDropFolder]);

  // QuickEdit
  const { editState, saveEdit, cancelEdit, updateEditText } = useQuickEdit();

  // 全屏切换 - 使用浏览器原生全屏 API
  const toggleFullscreen = useCallback(async () => {
    try {
      const doc = document.documentElement;
      if (!document.fullscreenElement) {
        await doc.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Failed to toggle fullscreen:", err);
    }
  }, []);

  // 键盘快捷键
  useKeyboardShortcuts({
    onOpenFile: handleOpenFile,
    onOpenFolder: handleOpenFolder,
    onToggleRightPanel: () => setRightPanelOpen((v) => !v),
    onToggleFullscreen: toggleFullscreen,
    onExportHtml: () => exportHtml().catch(() => {}),
    onExportDocx: () => {
      const currentContent = useFileStore.getState().currentContent;
      exportDocx(currentContent || "").catch(() => {});
    },
    onExportPdf: () => {
      exportPdf().catch(() => {});
    },
    onExportPdfGrayscale: () => {
      exportPdfGrayscale().catch(() => {});
    },
    onToggleSidebar: () => setLeftPanelOpen((v) => !v),
  });

  // 常驻 Tab 集合：最近活动的 N 个 + 全部固定 Tab（固定是用户显式保留意图）；
  // 非常驻 Tab 的阅读区卸载，滚动位置经 percentageCache 在切回时恢复（审计 M3）
  const residentTabs = React.useMemo(() => {
    if (!activeTabId) return [];
    const residentIds = new Set(recentTabIds);
    for (const tab of tabs) {
      if (tab.pinned) residentIds.add(tab.id);
    }
    return tabs.filter((tab) => residentIds.has(tab.id));
  }, [tabs, activeTabId, recentTabIds]);

  return (
    <AppLayout>
      {/* 窗口边缘拉伸触发区域 */}
      <WindowResizeHandles edgeSize={8} />

      {/* 拖拽遮罩 */}
      {isDragging && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-page, #0A0A0F)",
            opacity: 0.95,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              padding: "32px 48px",
              borderRadius: "12px",
              border: "2px dashed var(--active-border, rgba(0, 255, 255, 0.4))",
              background: "var(--hover-bg, rgba(0, 255, 255, 0.03))",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              stroke="var(--accent-cyan, #00FFFF)"
              strokeWidth="1.5"
            >
              <path d="M24 32V16M24 16L18 22M24 16L30 22" />
              <path d="M8 32V38C8 39.1046 8.89543 40 10 40H38C39.1046 40 40 39.1046 40 38V32" />
            </svg>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 500,
                color: "var(--accent-cyan, #00FFFF)",
              }}
            >
              释放以打开文件
            </span>
            <span
              style={{
                fontSize: "14px",
                color: "var(--text-muted, #50505A)",
              }}
            >
              支持 .md / .markdown / .mdx 文件
            </span>
          </div>
        </div>
      )}
      {/* TitleBar — position: fixed, top: 0, 始终渲染（确保任何状态下都能拖拽窗口） */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
        }}
      >
        <TitleBar
          visible={effectiveTitleBarVisible}
          transition={titleBarTransition}
          onToggleLeftPanel={() => setLeftPanelOpen((v) => !v)}
          onToggleRightPanel={toggleRightPanel}
          showLeftPanelButton={hasWorkspace}
        />
      </div>

      {/* 搜索栏 */}
      <SearchBar />

      {/* 外部改动提示：非阻塞，只提示不自动刷新 */}
      {hasOpenFile && externalFileChanged && (
        <div
          className="fixed left-1/2 z-[55] flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            top: "92px",
            transform: "translateX(-50%)",
            background: "var(--bg-sidebar)",
            border: "1px solid var(--toast-warning-border)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
            fontSize: "12px",
            color: "var(--text-primary)",
          }}
        >
          <span>{t("reader.fileChanged")}</span>
          <button
            type="button"
            onClick={() => void reloadCurrentFile()}
            style={{
              background: "transparent",
              border: "none",
              padding: "0 2px",
              color: "var(--accent-cyan)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {t("reader.reload")}
          </button>
        </div>
      )}

      {/* ReadingArea 容器：恢复完成后才渲染，hasOpenFile=false 时整体隐藏 */}
      <div
        onContextMenu={handleReaderContextMenu}
        style={{ display: hasOpenFile && !isRestoring ? "block" : "none" }}
      >
        {!isRestoring &&
          residentTabs.map((tab) => (
            <ReadingArea
              key={tab.id}
              filePath={tab.file_path}
              content={tab.content}
              isActive={hasOpenFile && tab.id === activeTabId}
              onScrollReady={
                hasOpenFile && tab.id === activeTabId
                  ? handleScrollReady
                  : undefined
              }
            />
          ))}
        {hasOpenFile && (
          <RightPanel
            isOpen={rightPanelOpen}
            onToggle={toggleRightPanel}
          />
        )}
      </div>

      {/* WelcomePage：仅在没有打开文件且恢复完成时显示 */}
      {!hasOpenFile && !isRestoring && (
        <WelcomePage
          onOpenFile={handleOpenFile}
          onOpenFolder={handleOpenFolder}
          onShowAbout={() => setShowAbout(true)}
          dbReady={dbReady}
        />
      )}

      {/* LeftPanel — 独立于 hasOpenFile，打开文件夹后也可显示文件树 */}
      {hasWorkspace && (
        <LeftPanel
          isOpen={leftPanelOpen}
          onToggle={() => setLeftPanelOpen((v) => !v)}
          onFileSelect={handleFileSelect}
        />
      )}

      {/* StatusBar — position: fixed, bottom: 0, 浮动叠加 */}
      {hasOpenFile && (
        <StatusBar
          wordCount={wordCount}
          percentage={percentage}
          opacity={statusBarOpacity}
          onHoverChange={setStatusBarHovered}
        />
      )}

      {/* 图片预览 */}
      <ImagePreview />

      {/* 主题化悬停提示（替代原生 title） */}
      <HoverHint />

      {/* 快速编辑 */}
      {editState.isEditing && editState.editingElement && (
        <QuickEdit
          text={editState.editText}
          targetElement={editState.editingElement}
          onSave={saveEdit}
          onCancel={cancelEdit}
          onUpdate={updateEditText}
        />
      )}

      {/* 右键菜单 */}
      {menuState && menuState.visible && (
        <ContextMenu
          menuState={menuState}
          menuRef={menuRef}
          adjustPosition={adjustPosition}
          onClose={hideContextMenu}
        />
      )}

      {/* Toast 通知 */}
      <ToastContainer />

      {/* 版本更新检测 */}
      <UpdateChecker />

      {/* 关于页面 */}
      {showAbout && <AboutPage onClose={() => setShowAbout(false)} />}

      {/* 彩蛋页面 */}
      {showEasterEgg && <EasterEgg onClose={() => setShowEasterEgg(false)} />}
    </AppLayout>
  );
}

export default App;
