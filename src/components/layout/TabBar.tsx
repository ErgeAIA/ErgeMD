import ContextMenu from "@/components/context-menu/ContextMenu";
import { getTabContextMenuItems } from "@/components/context-menu/TabContextMenu";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useFileStore } from "@/stores/fileStore";
import { invoke } from "@tauri-apps/api/core";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * TabBar — ARIA Tabs 模式 + 拖拽排序
 *
 * 拖拽排序使用纯 pointer 事件实现（不使用 DOM drag 事件，
 * 不使用 CSS transform/will-change，避免与 Tauri 窗口拖拽冲突）。
 */
const TabBar: React.FC = memo(() => {
  const { t } = useTranslation();
  const tabs = useFileStore((s) => s.tabs);
  const activeTabId = useFileStore((s) => s.activeTabId);
  const setActiveTab = useFileStore((s) => s.setActiveTab);
  const closeTab = useFileStore((s) => s.closeTab);
  const pinTab = useFileStore((s) => s.pinTab);
  const reorderTab = useFileStore((s) => s.reorderTab);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const {
    menuState,
    menuRef,
    show: showContextMenu,
    hide: hideContextMenu,
    adjustPosition,
  } = useContextMenu();

  // ── 拖拽排序状态 ──
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStartIndexRef = useRef<number>(-1);
  const dragOverIndexRef = useRef<number | null>(null);

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (draggingId) return; // 拖拽中不触发点击
      setActiveTab(tabId);
    },
    [setActiveTab, draggingId],
  );

  const handleClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      closeTab(tabId);
    },
    [closeTab],
  );

  // ARIA Tabs 键盘导航
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, tabId: string) => {
      const tabIds = tabs.map((t) => t.id);
      const currentIndex = tabIds.indexOf(tabId);

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setActiveTab(tabIds[(currentIndex + 1) % tabIds.length]);
          tabRefs.current
            .get(tabIds[(currentIndex + 1) % tabIds.length])
            ?.focus();
          break;
        case "ArrowLeft":
          e.preventDefault();
          setActiveTab(
            tabIds[(currentIndex - 1 + tabIds.length) % tabIds.length],
          );
          tabRefs.current
            .get(tabIds[(currentIndex - 1 + tabIds.length) % tabIds.length])
            ?.focus();
          break;
        case "Home":
          e.preventDefault();
          setActiveTab(tabIds[0]);
          tabRefs.current.get(tabIds[0])?.focus();
          break;
        case "End":
          e.preventDefault();
          setActiveTab(tabIds[tabIds.length - 1]);
          tabRefs.current.get(tabIds[tabIds.length - 1])?.focus();
          break;
        default:
          return;
      }
    },
    [tabs, setActiveTab],
  );

  // Tab 右键菜单
  const handleTabContextMenu = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.preventDefault();
      const tabIndex = tabs.findIndex((t) => t.id === tabId);
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      const items = getTabContextMenuItems({
        hasMultipleTabs: tabs.length > 1,
        hasRightTabs: tabIndex < tabs.length - 1,
        isPinned: tab.pinned,
        onPinTab: () => pinTab(tabId),
        onCloseTab: () => closeTab(tabId),
        onCloseOtherTabs: () => {
          tabs
            .filter((t) => t.id !== tabId && !t.pinned)
            .forEach((t) => closeTab(t.id));
        },
        onCloseRightTabs: () => {
          tabs
            .slice(tabIndex + 1)
            .filter((t) => !t.pinned)
            .forEach((t) => closeTab(t.id));
        },
        onOpenInNewWindow: () => {
          invoke("new_window", {
            filePath: tab.file_path,
            workspacePath: null,
          }).catch(() => {});
        },
        onCopyFilePath: () => {
          navigator.clipboard.writeText(tab.file_path);
        },
        onRevealInExplorer: () => {
          invoke("reveal_in_explorer", { filePath: tab.file_path }).catch(
            () => {},
          );
        },
      });

      showContextMenu(e, items);
    },
    [tabs, closeTab, pinTab, showContextMenu],
  );

  // ── 拖拽排序：pointer 事件处理 ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, tabId: string, index: number) => {
      // 只响应左键（右键不启动拖拽，让 onContextMenu 正常触发）
      if (e.button !== 0) return;
      // 如果点击的是关闭按钮或📌图标，不启动拖拽
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest('[role="button"]') ||
        target.closest(".hover-tab-close")
      ) {
        return;
      }

      // 不调用 e.preventDefault()，避免阻止后续 click 和 contextmenu 事件
      dragStartIndexRef.current = index;
      setDraggingId(tabId);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        // 找到鼠标下方的 tab
        const elements = document.querySelectorAll("[data-tab-id]");
        let overIndex: number | null = null;
        elements.forEach((el, i) => {
          const rect = el.getBoundingClientRect();
          if (
            moveEvent.clientX >= rect.left &&
            moveEvent.clientX <= rect.right &&
            moveEvent.clientY >= rect.top &&
            moveEvent.clientY <= rect.bottom
          ) {
            overIndex = i;
          }
        });
        setDragOverIndex(overIndex);
        dragOverIndexRef.current = overIndex;
      };

      const handlePointerUp = () => {
        const overIdx = dragOverIndexRef.current;
        if (overIdx !== null && overIdx !== dragStartIndexRef.current) {
          reorderTab(dragStartIndexRef.current, overIdx);
        }
        setDraggingId(null);
        setDragOverIndex(null);
        dragOverIndexRef.current = null;
        dragStartIndexRef.current = -1;
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    },
    [reorderTab],
  );

  // 拖拽中阻止 Tauri 窗口拖拽
  useEffect(() => {
    if (draggingId) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [draggingId]);

  if (tabs.length === 0) return null;

  return (
    <>
      <div
        role="tablist"
        aria-label={t("files.openFiles")}
        className="flex items-center h-full overflow-x-auto ml-2 [scrollbar-width:none]"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const isPinned = tab.pinned;
          const isDragging = tab.id === draggingId;
          const isDragOver = dragOverIndex === index;
          // 检查是否需要在固定区域和非固定区域之间加分隔线
          const showSeparator =
            isPinned && index < tabs.length - 1 && !tabs[index + 1].pinned;
          return (
            <React.Fragment key={tab.id}>
              <div
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el);
                  else tabRefs.current.delete(tab.id);
                }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                data-tab-id={tab.id}
                data-no-drag
                onClick={() => handleTabClick(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                onMouseEnter={() => {
                  setHoveredTabId(tab.id);
                }}
                onMouseLeave={() => {
                  setHoveredTabId(null);
                }}
                onPointerDown={(e) => handlePointerDown(e, tab.id, index)}
                className="hover-tab-item flex items-center gap-2 px-3 h-full cursor-pointer min-w-0 max-w-[180px]"
                style={{
                  fontSize: "13px",
                  color: isActive
                    ? "var(--accent-cyan, #00FFFF)"
                    : "var(--text-secondary, #787882)",
                  borderBottom: isActive
                    ? "2px solid var(--accent-cyan, #00FFFF)"
                    : "2px solid transparent",
                  background: isActive
                    ? "rgba(0, 255, 255, 0.05)"
                    : "transparent",
                  opacity: isDragging ? 0.5 : 1,
                  cursor: isDragging ? "grabbing" : "pointer",
                  borderLeft: isDragOver
                    ? "2px solid var(--accent-cyan, #00FFFF)"
                    : "2px solid transparent",
                }}
              >
                {/* 文件图标 */}
                <svg
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  className="shrink-0 opacity-60"
                >
                  <path d="M2 1C1.44772 1 1 1.44772 1 2V10C1 10.5523 1.44772 11 2 11H8C8.55228 11 9 10.5523 9 10V4L6 1H2Z" />
                  <path
                    d="M6 1V4H9"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    fill="none"
                  />
                </svg>

                {/* 文件名 */}
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {tab.file_name}
                </span>

                {/* 关闭按钮 / 固定图标 */}
                <div className="flex items-center gap-0.5">
                  {!isPinned && hoveredTabId === tab.id && (
                    <span
                      role="button"
                      aria-label={t("tab.pin")}
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        pinTab(tab.id);
                      }}
                      className="flex items-center justify-center w-4 h-4 cursor-pointer select-none"
                      style={{
                        fontSize: "10px",
                        opacity: 0.6,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = "0.6";
                      }}
                    >
                      📌
                    </span>
                  )}
                  {isPinned ? (
                    <span
                      role="button"
                      aria-label={t("tab.unpin")}
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        pinTab(tab.id);
                      }}
                      className="flex items-center justify-center w-4 h-4 cursor-pointer select-none"
                      style={{
                        opacity: hoveredTabId === tab.id ? 1 : 0.6,
                        fontSize: "10px",
                      }}
                    >
                      📌
                    </span>
                  ) : (
                    <button
                      onClick={(e) => handleClose(e, tab.id)}
                      aria-label={t("tab.close", { fileName: tab.file_name })}
                      tabIndex={-1}
                      className="hover-tab-close flex items-center justify-center w-4 h-4 rounded-sm border-none cursor-pointer bg-transparent p-0"
                      style={{
                        color: "var(--text-muted, #50505A)",
                        opacity: hoveredTabId === tab.id ? 1 : 0,
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        width="8"
                        height="8"
                        viewBox="0 0 8 8"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      >
                        <line x1="0" y1="0" x2="8" y2="8" />
                        <line x1="8" y1="0" x2="0" y2="8" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {/* 固定区域与非固定区域之间的分隔线 */}
              {showSeparator && (
                <div
                  className="shrink-0"
                  style={{
                    width: "1px",
                    height: "16px",
                    background:
                      "var(--border-secondary, rgba(255,255,255,0.1))",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 右键菜单 */}
      {menuState && menuState.visible && (
        <ContextMenu
          menuState={menuState}
          menuRef={menuRef}
          adjustPosition={adjustPosition}
          onClose={hideContextMenu}
        />
      )}
    </>
  );
});

TabBar.displayName = "TabBar";

export default TabBar;
