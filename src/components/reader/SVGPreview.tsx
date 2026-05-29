import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";

interface SVGPreviewProps {
  svgHtml: string;
  onClose: () => void;
}

const SVGPreview: React.FC<SVGPreviewProps> = memo(({ svgHtml, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const lastContextMenuTime = useRef(0);

  // 拖拽平移
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      positionStart.current = { ...position };
    },
    [position],
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({
      x: positionStart.current.x + dx,
      y: positionStart.current.y + dy,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // 计算并设置缩放
  const calculateAndSetScale = useCallback(
    (svgElement: SVGElement, container: HTMLElement) => {
      const containerWidth = container.clientWidth * 0.9;
      const containerHeight = container.clientHeight * 0.9;

      // 获取SVG实际尺寸
      const rect = svgElement.getBoundingClientRect();
      let svgWidth = rect.width;
      let svgHeight = rect.height;

      // 如果获取不到尺寸，尝试从SVG属性获取
      if (svgWidth === 0 || svgHeight === 0) {
        svgWidth = parseFloat(svgElement.getAttribute("width") || "800");
        svgHeight = parseFloat(svgElement.getAttribute("height") || "600");
      }

      // 计算缩放比例：确保SVG完全适应视口
      const scaleX = containerWidth / svgWidth;
      const scaleY = containerHeight / svgHeight;
      const initialScale = Math.min(scaleX, scaleY);

      setScale(Math.min(5, Math.max(0.2, initialScale)));
      setPosition({ x: 0, y: 0 });
    },
    [],
  );

  // 双击重置
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const container = containerRef.current;
      if (!container) return;

      const svgElement = container.querySelector("svg");
      if (!svgElement) return;

      calculateAndSetScale(svgElement, container);
    },
    [calculateAndSetScale],
  );

  // 右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    lastContextMenuTime.current = Date.now();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  // 保存SVG
  const handleSaveSvg = useCallback(async () => {
    try {
      const filePath = await save({
        defaultPath: "diagram.svg",
        filters: [{ name: "SVG Files", extensions: ["svg"] }],
      });
      if (!filePath) {
        setShowContextMenu(false);
        return;
      }

      await invoke("write_file", {
        path: filePath,
        content: svgHtml,
      });
    } catch (err) {
      console.error("Failed to save SVG:", err);
    }
    setShowContextMenu(false);
  }, [svgHtml]);

  // 点击其他地方关闭右键菜单
  const handleClickOutsideContextMenu = useCallback(
    (e: MouseEvent) => {
      if (Date.now() - lastContextMenuTime.current < 200) return;
      const target = e.target as HTMLElement;
      const isInsideMenu = target.closest(".svg-context-menu");
      if (!isInsideMenu && showContextMenu) {
        setShowContextMenu(false);
      }
    },
    [showContextMenu],
  );

  // 初始化时计算缩放
  useEffect(() => {
    const initScale = () => {
      const container = containerRef.current;
      const svgElement = container?.querySelector("svg");

      if (!container || !svgElement) {
        setTimeout(initScale, 50);
        return;
      }

      calculateAndSetScale(svgElement, container);
    };

    requestAnimationFrame(() => {
      setTimeout(initScale, 100);
    });
  }, [calculateAndSetScale]);

  // Esc关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showContextMenu) {
          setShowContextMenu(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutsideContextMenu);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutsideContextMenu);
    };
  }, [onClose, showContextMenu, handleClickOutsideContextMenu]);

  // 绑定全局鼠标事件
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: "var(--overlay-bg)" }}
      onClick={onClose}
    >
      {/* 顶部工具栏 */}
      <div
        className="absolute left-1/2 flex items-center gap-3 px-4 py-2 rounded-lg"
        style={{
          top: "50px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--divider)",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setScale((s) => Math.max(0.2, s - 0.2))}
          className="hover-btn-icon flex items-center justify-center w-7 h-7 rounded border-none cursor-pointer"
          style={{
            background: "var(--hover-bg-subtle)",
            color: "var(--text-secondary)",
            fontSize: "16px",
          }}
        >
          −
        </button>
        <span
          className="text-xs tabular-nums"
          style={{
            color: "var(--text-muted)",
            minWidth: "40px",
            textAlign: "center",
          }}
        >
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(5, s + 0.2))}
          className="hover-btn-icon flex items-center justify-center w-7 h-7 rounded border-none cursor-pointer"
          style={{
            background: "var(--hover-bg-subtle)",
            color: "var(--text-secondary)",
            fontSize: "16px",
          }}
        >
          +
        </button>
        <button
          onClick={handleDoubleClick}
          className="hover-btn-icon flex items-center justify-center h-7 px-2 rounded border-none cursor-pointer"
          style={{
            background: "var(--hover-bg-subtle)",
            color: "var(--text-muted)",
            fontSize: "11px",
          }}
        >
          重置
        </button>
        <div className="w-px h-5 bg-[var(--divider)]" />
        <button
          onClick={handleSaveSvg}
          className="hover-btn-icon flex items-center justify-center h-7 px-2 rounded border-none cursor-pointer gap-1.5"
          style={{
            background: "var(--hover-bg-subtle)",
            color: "var(--text-secondary)",
            fontSize: "11px",
          }}
        >
          <span>保存</span>
        </button>
        <button
          onClick={onClose}
          className="hover-btn-icon flex items-center justify-center w-7 h-7 rounded-full border-none cursor-pointer"
          style={{
            background: "var(--hover-bg-medium)",
            color: "var(--text-secondary)",
          }}
          aria-label="关闭预览"
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <line x1="0" y1="0" x2="14" y2="14" />
            <line x1="14" y1="0" x2="0" y2="14" />
          </svg>
        </button>
      </div>

      {/* SVG容器 */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ padding: "60px 20px 40px" }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onWheel={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const delta = e.deltaY > 0 ? -0.15 : 0.15;
          setScale((prev) => Math.max(0.2, Math.min(5, prev + delta)));
        }}
      >
        <div
          ref={svgWrapperRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
            userSelect: "none",
            transition: isDragging.current
              ? "none"
              : "transform 0.15s ease-out",
          }}
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </div>

      {/* 右键菜单 */}
      {showContextMenu && (
        <div
          className="svg-context-menu fixed z-[60] flex flex-col min-w-[160px] py-2 rounded-lg shadow-xl"
          style={{
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            background: "var(--bg-secondary)",
            border: "1px solid var(--divider)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleSaveSvg}
            className="text-left text-sm border-none cursor-pointer rounded"
            style={{
              background: "transparent",
              color: "var(--text-primary)",
              padding: "10px 16px",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg-medium)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            另存为SVG
          </button>
        </div>
      )}

      {/* 底部提示 */}
      <div
        className="absolute left-1/2 text-sm rounded"
        style={{
          bottom: "32px",
          background: "var(--bg-secondary)",
          color: "var(--text-muted)",
          border: "1px solid var(--divider)",
          transform: "translateX(-50%)",
          paddingLeft: "10px",
          paddingRight: "10px",
          paddingTop: "6px",
          paddingBottom: "6px",
          opacity: 0.9,
        }}
      >
        滚轮缩放，拖拽平移，双击重置，右键保存
      </div>
    </div>
  );
});

SVGPreview.displayName = "SVGPreview";

export default SVGPreview;