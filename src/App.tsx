import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import React, { useCallback, useEffect, useState } from "react";
import ToastContainer from "./components/common/Toast";
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
import { useAutoHide } from "./hooks/useAutoHide";
import { useContextMenu } from "./hooks/useContextMenu";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useQuickEdit } from "./hooks/useQuickEdit";
import { useReadingProgress } from "./hooks/useReadingProgress";
import { useTheme } from "./hooks/useTheme";
import { useFileStore } from "./stores/fileStore";
import { useReaderStore } from "./stores/readerStore";
import type { FileNode, TabInfo } from "./types";
import { exportHtml } from "./utils/export";
import { exportDocx } from "./utils/exportDocx";
import { exportPdf } from "./utils/exportPdf";
import { flushAllReadingProgress } from "./utils/readingProgress";
import { extractTOC } from "./utils/toc";
import { countWords } from "./utils/wordCount";

function App() {
  // 主题切换 — 自动同步 data-theme 属性到 <html>
  useTheme();

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

  // 初始化数据库（最近文件、阅读进度等持久化功能依赖）
  useEffect(() => {
    invoke("init_database")
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error("Failed to initialize database:", err);
        useReaderStore
          .getState()
          .addToast({ type: "error", message: "数据库初始化失败" });
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
            const result = await invoke<{ content: string }>("read_file", {
              path: tab.file_path,
            });
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
            const tree = await invoke<FileNode[]>("scan_workspace", {
              folderPath: state.workspacePath,
            });
            if (!cancelled) {
              useFileStore.setState({ fileTree: tree });
            }
          } catch {
            if (!cancelled) {
              useFileStore.setState({
                workspacePath: null,
                workspaceName: null,
                fileTree: null,
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

  // TOC：所有文档都由 App.tsx 用 extractTOC 生成
  useEffect(() => {
    if (!currentContent) {
      setTOCItems([]);
      setTOCMeta({ totalLogicalLength: 1 });
      return;
    }

    const { items, meta } = extractTOC(currentContent);
    setTOCItems(items);
    setTOCMeta(meta);
  }, [currentContent, setTOCItems, setTOCMeta]);

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

  // StatusBar 透明度控制：鼠标移到底部时显示，离开时淡出
  const [statusBarHovered, setStatusBarHovered] = useState(false);
  const statusBarOpacity = React.useMemo(() => {
    if (statusBarHovered) return 0.8;
    if (isScrolling) return 0.6;
    return 0.2;
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
        const result = await invoke<{ content: string }>("read_file", {
          path: filePath,
        }).catch(() => null);
        if (cancelled || !result) return;
        const fileName = filePath.split(/[/\\]/).pop() || "Untitled";
        useFileStore.getState().openFile(filePath, fileName, result.content);
      }
      if (workspacePath) {
        const tree = await invoke<FileNode[]>("scan_workspace", {
          folderPath: workspacePath,
        }).catch(() => null);
        if (cancelled || !tree) return;
        const folderName = workspacePath.split(/[/\\]/).pop() || "Workspace";
        useFileStore.getState().setWorkspace(workspacePath, folderName, tree);
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
        const result = await invoke<{ content: string }>("read_file", {
          path: filePath,
        });
        if (cancelled) return;
        const fileName = filePath.split(/[/\\]/).pop() || "Untitled";
        useFileStore.getState().openFile(filePath, fileName, result.content);
      } catch {
        if (!cancelled) {
          useReaderStore
            .getState()
            .addToast({ type: "error", message: "文件读取失败" });
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
          const markdownBody = document.querySelector(".markdown-body");
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
              .addToast({ type: "error", message: "导出失败" });
          });
        },
        onExportPdf: () => {
          exportPdf().catch(() => {
            useReaderStore
              .getState()
              .addToast({ type: "error", message: "导出失败" });
          });
        },
        onExportDocx: () => {
          const content = useFileStore.getState().currentContent;
          exportDocx(content || "").catch(() => {
            useReaderStore
              .getState()
              .addToast({ type: "error", message: "导出失败" });
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
          const result = await invoke<{ content: string; encoding: string }>(
            "read_file",
            {
              path: selectedPath,
            },
          );
          const fileName = selectedPath.split(/[/\\]/).pop() || "Untitled";
          openFile(selectedPath, fileName, result.content);
          // 记录最近打开的文件
          invoke("add_recent_file", {
            filePath: selectedPath,
            fileName: fileName,
          }).catch((err) => console.error("Failed to save recent file:", err));
        } catch (err) {
          const msg = String(err);
          console.error("Failed to read file:", err);
          let toastMsg = "文件读取失败";
          if (msg.includes("not found") || msg.includes("File not found")) {
            toastMsg = "文件不存在";
          } else if (msg.includes("permission") || msg.includes("Permission")) {
            toastMsg = "权限不足";
          } else if (msg.includes("encoding")) {
            toastMsg = "无法识别文件编码";
          }
          useReaderStore
            .getState()
            .addToast({ type: "error", message: toastMsg });
        }
      }
    },
    [openFile],
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
        const tree = await invoke<FileNode[]>("scan_workspace", {
          folderPath: selectedPath,
        });
        const folderName = selectedPath.split(/[/\\]/).pop() || "Workspace";
        setWorkspace(selectedPath, folderName, tree);
        setLeftPanelOpen(true);
      } catch (err) {
        console.error("Failed to scan workspace:", err);
        useReaderStore
          .getState()
          .addToast({ type: "error", message: "文件夹打开失败" });
      }
    },
    [setWorkspace],
  );

  // F12 打开彩蛋页面
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (e.key === "F12") {
  //       e.preventDefault();
  //       setShowEasterEgg((v) => !v);
  //     }
  //   };
  //   window.addEventListener("keydown", handleKeyDown);
  //   return () => window.removeEventListener("keydown", handleKeyDown);
  // }, []);

  const handleFileSelect = useCallback(
    async (filePath: string, fileName: string) => {
      try {
        const result = await invoke<{ content: string; encoding: string }>(
          "read_file",
          {
            path: filePath,
          },
        );
        openFile(filePath, fileName, result.content);
        invoke("add_recent_file", {
          filePath: filePath,
          fileName: fileName,
        }).catch((err) => console.error("Failed to save recent file:", err));
      } catch (err) {
        console.error("Failed to read file:", err);
        useReaderStore
          .getState()
          .addToast({ type: "error", message: "文件读取失败" });
      }
    },
    [openFile],
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
    onToggleSidebar: () => setLeftPanelOpen((v) => !v),
  });

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
          onToggleRightPanel={() => setRightPanelOpen((v) => !v)}
          showLeftPanelButton={hasWorkspace}
        />
      </div>

      {/* 搜索栏 */}
      <SearchBar />

      {/* ReadingArea 容器：恢复完成后才渲染，hasOpenFile=false 时整体隐藏 */}
      <div
        onContextMenu={handleReaderContextMenu}
        style={{ display: hasOpenFile && !isRestoring ? "block" : "none" }}
      >
        {!isRestoring &&
          tabs.map((tab) => (
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
            onToggle={() => setRightPanelOpen((v) => !v)}
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
