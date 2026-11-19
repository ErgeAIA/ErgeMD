import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReadingOptions from "./ReadingOptions";

interface RightPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;
const RESIZE_EDGE_WIDTH = 8;

/** 面板动效：进场快、退场慢并渐隐；与标题栏/状态栏同属「离开比回来慢」的节奏 */
const PANEL_TRANSITION_OPEN =
  "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 180ms ease-out, visibility 0s linear 0s";
const PANEL_TRANSITION_CLOSE =
  "transform 360ms cubic-bezier(0.4, 0, 0.2, 1), opacity 320ms ease-out, visibility 0s linear 360ms";

/**
 * 右侧阅读选项面板：
 * - 通过按钮切换显示/隐藏（非边缘触发）
 * - 使用 position: fixed 覆盖在正文上方，不挤压布局
 * - 从右侧滑入/滑出
 * - 非模态停靠面板：不加遮罩、不锁焦点，正文保持可交互与可读，
 *   否则用户无法一边调排版一边判断效果
 * - 支持左侧边缘拖拽调整宽度
 */
const RightPanel: React.FC<RightPanelProps> = memo(({ isOpen, onToggle }) => {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  // Esc 关闭；非模态面板不设焦点陷阱，正文需保持可交互
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggle();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onToggle]);

  // 点面板外任意位置收起：正文、空白、搜索栏都算；标题栏与开关按钮除外，
  // 免得拖窗口或点开关时先被收起、再被开关切回来
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest("[data-titlebar]")) return;
      onToggle();
    };

    // 放到下一拍注册，避免打开面板的那次点击立刻把它关掉
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, onToggle]);

  // 拖拽调整宽度逻辑
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    document.body.style.cursor = "ew-resize";
  }, []);

  return (
    <>
      {/* 面板 — 从右侧滑入；非模态，不加遮罩以免压暗正文 */}
      <div
        ref={panelRef}
        role="region"
        aria-label={t("settings.readingOptions")}
        aria-hidden={!isOpen}
        className="fixed right-0 z-40 overflow-hidden"
        style={{
          top: "40px",
          height: "calc(100vh - 80px)",
          width: `${panelWidth}px`,
          minWidth: `${MIN_WIDTH}px`,
          maxWidth: `${MAX_WIDTH}px`,
          background: "var(--bg-sidebar)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
          pointerEvents: isOpen ? "auto" : "none",
          transition: isOpen ? PANEL_TRANSITION_OPEN : PANEL_TRANSITION_CLOSE,
          willChange: "transform, opacity",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 左侧拖拽调整边缘 */}
        <div
          className="absolute left-0 top-0 bottom-0 cursor-ew-resize z-10 transition-colors duration-150"
          style={{
            width: `${RESIZE_EDGE_WIDTH}px`,
            background: "transparent",
          }}
          onMouseDown={handleResizeStart}
          onMouseEnter={() => {
            if (!isResizing) {
              document.body.style.cursor = "ew-resize";
            }
          }}
          onMouseLeave={() => {
            if (!isResizing) {
              document.body.style.cursor = "";
            }
          }}
          aria-label={t("settings.panelWidth")}
        />

        {/* 面板标题 */}
        <div
          className="px-4 py-3 text-[13px] font-medium tracking-wide uppercase"
          style={{
            color: "var(--text-muted)",
            borderBottom: "1px solid var(--divider)",
            paddingLeft: `${RESIZE_EDGE_WIDTH + 16}px`,
          }}
        >
          {t("settings.readingOptions")}
        </div>

        {/* 内容区域 */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            paddingLeft: `${RESIZE_EDGE_WIDTH}px`,
          }}
        >
          <ReadingOptions />
        </div>
      </div>
    </>
  );
});

RightPanel.displayName = "RightPanel";

export default RightPanel;
