import { useTitleBar } from "@/hooks/useTitleBar";
import { useFileStore } from "@/stores/fileStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { detectPlatform } from "@/utils/platform";
import TabBar from "./TabBar";

interface TitleBarProps {
  visible: boolean;
  /** CSS transition 字符串，由 useAutoHide 提供 */
  transition: string;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  showLeftPanelButton?: boolean;
}

const TitleBar: React.FC<TitleBarProps> = memo(
  ({
    visible,
    transition,
    onToggleLeftPanel,
    onToggleRightPanel,
    showLeftPanelButton,
  }) => {
    const { startDrag } = useTitleBar();
    const { t } = useTranslation();
    const [isMaximized, setIsMaximized] = useState(false);
    // macOS 上使用系统自带红绿灯按钮，自绘按钮会与系统按钮位置冲突
    const isMacOS = detectPlatform() === "macos";

    useEffect(() => {
      const unlisten = getCurrentWindow().onResized(async () => {
        setIsMaximized(await getCurrentWindow().isMaximized());
      });
      return () => {
        unlisten.then((fn) => fn());
      };
    }, []);

    const [isPinned, setIsPinned] = useState(false);
    const handleMinimize = () => getCurrentWindow().minimize();
    const handleToggleMaximize = () => getCurrentWindow().toggleMaximize();
    const handleClose = () => getCurrentWindow().close();
    const handleTogglePin = async () => {
      const win = getCurrentWindow();
      const pinned = !isPinned;
      await win.setAlwaysOnTop(pinned);
      setIsPinned(pinned);
    };

    return (
      <div
        onMouseDown={startDrag}
        onContextMenu={(e) => e.preventDefault()}
        className="flex items-center select-none shrink-0 relative"
        style={{
          height: "36px",
          background: "var(--bg-sidebar, #1A1A2E)",
          opacity: visible ? 1 : 0,
          transition: transition,
          pointerEvents: "auto",
        }}
      >
        {/* 左侧：应用名 + 面板切换按钮 */}
        <div
          className="flex items-center shrink-0"
          style={{
            height: "100%",
            gap: "2px",
          }}
        >
          {/* 文件树切换按钮 */}
          {showLeftPanelButton && onToggleLeftPanel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLeftPanel();
              }}
              className="flex items-center justify-center cursor-pointer"
              style={{
                width: "32px",
                height: "100%",
                color: "var(--text-muted, #50505A)",
                background: "transparent",
                border: "none",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-secondary)";
                (e.currentTarget as HTMLElement).style.background =
                  "var(--hover-bg-light)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-muted, #50505A)";
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
              }}
              aria-label={t("titleBar.fileList")}
              title={t("titleBar.fileList")}
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              >
                <rect x="1" y="1" width="14" height="14" rx="2" />
                <line x1="5" y1="1" x2="5" y2="15" />
              </svg>
            </button>
          )}

          {/* 应用名 — 点击返回主页 */}
          <div
            className="flex items-center"
            style={{
              height: "100%",
              paddingLeft: "12px",
              paddingRight: "12px",
              borderRight: "1px solid var(--border-subtle)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span
              className="whitespace-nowrap shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                useFileStore.getState().goHome();
              }}
              style={{
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "var(--accent-cyan, #00FFFF)",
                cursor: "pointer",
                transition: "text-shadow 0.2s, opacity 0.2s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.textShadow = "0 0 8px var(--accent-cyan, #00FFFF)";
                el.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.textShadow = "none";
              }}
            >
              ErgeMD
            </span>
          </div>
        </div>

        {/* 中间：标签栏（tab 项内部已加 data-no-drag，容器本身不阻止拖拽） */}
        <div 
          className="flex-1" 
          style={{ minWidth: 0, height: "100%" }}
          onDoubleClick={(e) => {
            // 只在点击空白区域时触发
            const target = e.target as HTMLElement;
            if (target.closest('[data-tab-id]')) return;
            handleToggleMaximize();
          }}
        >
          <TabBar />
        </div>

        {/* 右侧：功能按钮 + 窗口控制按钮（button 元素已被 useTitleBar 自动排除拖拽） */}
        <div
          className="flex items-center shrink-0"
          style={{
            height: "100%",
            marginLeft: "auto",
          }}
        >
          {/* 置顶按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin();
            }}
            className="flex items-center justify-center cursor-pointer"
            style={{
              width: "32px",
              height: "100%",
              color: isPinned
                ? "var(--accent-cyan, #00FFFF)"
                : "var(--text-muted, #50505A)",
              background: "transparent",
              border: "none",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = isPinned
                ? "var(--accent-cyan, #00FFFF)"
                : "var(--text-secondary)";
              (e.currentTarget as HTMLElement).style.background =
                "var(--hover-bg-light)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = isPinned
                ? "var(--accent-cyan, #00FFFF)"
                : "var(--text-muted, #50505A)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
            aria-label={isPinned ? t("titleBar.unpin") : t("titleBar.pin")}
            title={isPinned ? t("titleBar.unpin") : t("titleBar.pin")}
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill={isPinned ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <path d="M8 1.5L10.5 6H5.5L8 1.5Z" />
              <line x1="3" y1="6" x2="13" y2="6" />
              <rect x="4" y="6" width="8" height="8.5" rx="1" />
            </svg>
          </button>

          {/* 阅读选项切换按钮 */}
          {onToggleRightPanel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleRightPanel();
              }}
              className="flex items-center justify-center cursor-pointer"
              style={{
                width: "32px",
                height: "100%",
                color: "var(--text-muted, #50505A)",
                background: "transparent",
                border: "none",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-secondary)";
                (e.currentTarget as HTMLElement).style.background =
                  "var(--hover-bg-light)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-muted, #50505A)";
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
              }}
              aria-label={t("settings.readingOptions")}
              title={t("settings.readingOptions")}
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              >
                <line x1="2" y1="4" x2="14" y2="4" />
                <line x1="2" y1="8" x2="10" y2="8" />
                <line x1="2" y1="12" x2="12" y2="12" />
                <circle cx="14" cy="12" r="1" fill="currentColor" />
              </svg>
            </button>
          )}

          {/* 窗口控制按钮 — macOS 上隐藏,避免与系统红绿灯冲突 */}
          {!isMacOS && (
            <>
              <button
                onClick={handleMinimize}
                aria-label={t("titleBar.minimize")}
                data-testid="titlebar-minimize"
                className="flex items-center justify-center cursor-pointer"
                style={{
                  width: "44px",
                  height: "100%",
                  color: "var(--text-secondary)",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--hover-bg-medium)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <svg
                  aria-hidden="true"
                  width="10"
                  height="1"
                  viewBox="0 0 10 1"
                  fill="currentColor"
                >
                  <rect width="10" height="1" />
                </svg>
              </button>
              <button
                onClick={handleToggleMaximize}
                aria-label={
                  isMaximized ? t("titleBar.restore") : t("titleBar.maximize")
                }
                data-testid="titlebar-maximize"
                className="flex items-center justify-center cursor-pointer"
                style={{
                  width: "44px",
                  height: "100%",
                  color: "var(--text-secondary)",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--hover-bg-medium)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {isMaximized ? (
                  <svg
                    aria-hidden="true"
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    <rect x="2" y="0" width="8" height="8" rx="1" />
                    <rect
                      x="0"
                      y="2"
                      width="8"
                      height="8"
                      rx="1"
                      fill="var(--bg-sidebar)"
                    />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    <rect x="0.5" y="0.5" width="9" height="9" rx="1" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleClose}
                aria-label={t("titleBar.close")}
                data-testid="titlebar-close"
                className="flex items-center justify-center cursor-pointer"
                style={{
                  width: "44px",
                  height: "100%",
                  color: "var(--text-secondary)",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--hover-close-bg)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary, #fff)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-secondary)";
                }}
              >
                <svg
                  aria-hidden="true"
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  stroke="currentColor"
                  strokeWidth="1.2"
                >
                  <line x1="0" y1="0" x2="10" y2="10" />
                  <line x1="10" y1="0" x2="0" y2="10" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* 赛博朋克渐变分隔线 */}
        <div
          className="absolute"
          style={{
            bottom: 0,
            left: 0,
            right: 0,
            height: "1px",
            background: "var(--titlebar-gradient)",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  },
);

TitleBar.displayName = "TitleBar";

export default TitleBar;
