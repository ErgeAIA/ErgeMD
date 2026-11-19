import { useFileStore } from "@/stores/fileStore";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import FileList from "./FileList";

interface LeftPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onFileSelect: (filePath: string, fileName: string) => void;
}

const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 240;
const WIDTH_STORAGE_KEY = "ergemd:left-panel-width";

function clampWidth(width: number): number {
  return Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
}

function readStoredWidth(): number {
  try {
    const raw = localStorage.getItem(WIDTH_STORAGE_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? clampWidth(value) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

/**
 * 左侧文件面板（非模态停靠面板）：
 * - 与 RightPanel 同一交互模型：不加遮罩、不锁焦点，点面板外即收起
 * - position: fixed 覆盖在正文上，不挤压布局；从左侧滑入滑出
 * - 目录树按展开懒加载，面板首次打开时才挂载，关闭后保留实例以恢复展开状态
 * - 拖拽右边缘调整宽度（180–480），宽度持久化到 localStorage
 */
const LeftPanel: React.FC<LeftPanelProps> = memo(
  ({ isOpen, onToggle, onFileSelect }) => {
    const { t } = useTranslation();
    const hasWorkspace = useFileStore((s) => s.workspacePath !== null);
    const [panelWidth, setPanelWidth] = useState(readStoredWidth);
    const [hasMounted, setHasMounted] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const widthRef = useRef(panelWidth);
    const dragCleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
      widthRef.current = panelWidth;
    }, [panelWidth]);

    useEffect(() => {
      if (isOpen) setHasMounted(true);
    }, [isOpen]);

    // Esc 收起；非模态面板不设焦点陷阱，正文保持可交互
    useEffect(() => {
      if (!isOpen) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onToggle();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onToggle]);

    // 点面板外任意位置收起；标题栏（含面板开关）除外
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

    useEffect(
      () => () => {
        dragCleanupRef.current?.();
      },
      [],
    );

    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = widthRef.current;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextWidth = clampWidth(startWidth + delta);
        widthRef.current = nextWidth;
        setPanelWidth(nextWidth);
      };
      const handleMouseUp = () => {
        dragCleanupRef.current?.();
        dragCleanupRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        try {
          localStorage.setItem(WIDTH_STORAGE_KEY, String(widthRef.current));
        } catch {
          // 存储不可用时仅丢失宽度记忆
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      dragCleanupRef.current = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }, []);

    if (!hasWorkspace) return null;

    return (
      <div
        ref={panelRef}
        role="region"
        aria-label={t("files.projectFiles")}
        aria-hidden={!isOpen}
        className="fixed z-40 left-0 flex flex-col overflow-hidden"
        style={{
          top: "40px",
          height: "calc(100vh - 80px)",
          width: `${panelWidth}px`,
          minWidth: `${MIN_WIDTH}px`,
          maxWidth: `${MAX_WIDTH}px`,
          background: "var(--bg-sidebar)",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          visibility: isOpen ? "visible" : "hidden",
          transition: "transform 150ms ease-out",
          willChange: "transform",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        {/* 文件树：首次打开后常驻，关闭时只做位移 */}
        {hasMounted && (
          <div className="flex-1 min-h-0">
            <FileList onFileSelect={onFileSelect} isOpen={isOpen} />
          </div>
        )}

        {/* 右边缘拖拽把手 */}
        {isOpen && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("settings.panelWidth")}
            onMouseDown={handleResizeMouseDown}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize"
          />
        )}
      </div>
    );
  },
);

LeftPanel.displayName = "LeftPanel";

export default LeftPanel;