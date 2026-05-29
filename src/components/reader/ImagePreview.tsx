import { useReaderStore } from "@/stores/readerStore";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";

/**
 * 全屏图片预览组件，功能与 SVGPreview 一致
 * - 滚轮缩放
 * - 鼠标拖拽平移
 * - 双击重置
 * - 右键另存为
 * - 顶部工具栏
 */
const ImagePreview: React.FC = memo(() => {
  const previewImage = useReaderStore((s) => s.previewImage);
  const setPreviewImage = useReaderStore((s) => s.setPreviewImage);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const lastContextMenuTime = useRef(0);
  const [loadError, setLoadError] = useState(false);

  const handleClose = useCallback(() => {
    setPreviewImage(null);
  }, [setPreviewImage]);

  useEffect(() => {
    if (previewImage) {
      setLoadError(false);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [previewImage]);

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

  const calculateAndSetScale = useCallback(
    (imgElement: HTMLImageElement) => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth * 0.9;
      const containerHeight = container.clientHeight * 0.9;

      const imgWidth = imgElement.naturalWidth || imgElement.width || 100;
      const imgHeight = imgElement.naturalHeight || imgElement.height || 100;

      const scaleX = containerWidth / imgWidth;
      const scaleY = containerHeight / imgHeight;
      const initialScale = Math.min(scaleX, scaleY);

      setScale(Math.min(5, Math.max(0.2, initialScale)));
      setPosition({ x: 0, y: 0 });
    },
    [],
  );

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const img = containerRef.current?.querySelector('img');
    if (img) {
      calculateAndSetScale(img);
    }
  }, [calculateAndSetScale]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    lastContextMenuTime.current = Date.now();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  const handleSaveImage = useCallback(async () => {
    try {
      if (!previewImage) return;

      let imgExt = 'png';
      if (previewImage.startsWith('http') || previewImage.startsWith('data:')) {
        if (previewImage.includes('.png')) {
          imgExt = 'png';
        } else if (previewImage.includes('.jpg') || previewImage.includes('.jpeg')) {
          imgExt = 'jpeg';
        } else if (previewImage.includes('.gif')) {
          imgExt = 'gif';
        } else if (previewImage.includes('.webp')) {
          imgExt = 'webp';
        }
      }
      
      const filePath = await save({
        defaultPath: `image.${imgExt}`,
        filters: [{ name: 'Image', extensions: [imgExt, 'png', 'jpg', 'jpeg', 'gif', 'webp'] }],
      });
      if (!filePath) {
        setShowContextMenu(false);
        return;
      }

      if (previewImage.startsWith('data:')) {
        const base64Data = previewImage.split(',')[1];
        await invoke("write_binary_file", { path: filePath, base64_data: base64Data });
      } else if (previewImage.startsWith('http')) {
        const response = await fetch(previewImage);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);
        await invoke("write_binary_file", { path: filePath, base64_data: base64Data });
      } else {
        alert("暂不支持保存本地图片");
      }
    } catch (err) {
      console.error("Failed to save image:", err);
    }
    setShowContextMenu(false);
  }, [previewImage]);

  const handleClickOutsideContextMenu = useCallback(
    (e: MouseEvent) => {
      if (Date.now() - lastContextMenuTime.current < 200) return;
      const target = e.target as HTMLElement;
      const isInsideMenu = target.closest(".image-context-menu");
      if (!isInsideMenu && showContextMenu) {
        setShowContextMenu(false);
      }
    },
    [showContextMenu],
  );

  useEffect(() => {
    const calculateScale = () => {
      const img = containerRef.current?.querySelector('img');
      if (!img) {
        setTimeout(calculateScale, 50);
        return;
      }
      if (img.complete) {
        calculateAndSetScale(img);
      } else {
        img.onload = () => calculateAndSetScale(img);
      }
    };

    requestAnimationFrame(() => {
      setTimeout(calculateScale, 100);
    });
  }, [previewImage, calculateAndSetScale]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showContextMenu) {
          setShowContextMenu(false);
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutsideContextMenu);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutsideContextMenu);
    };
  }, [handleClose, showContextMenu, handleClickOutsideContextMenu]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!previewImage) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: "var(--overlay-bg)" }}
      onClick={handleClose}
    >
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
          onClick={handleSaveImage}
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
          onClick={handleClose}
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
          className="absolute inset-0 flex items-center justify-center"
          style={{ userSelect: "none" }}
        >
          {loadError ? (
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>
              图片加载失败
            </div>
          ) : (
            <img
              src={previewImage}
              alt="预览图片"
              onError={() => setLoadError(true)}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: "center center",
                transition: isDragging.current ? "none" : "transform 0.15s ease-out",
                boxShadow: "0 0 40px var(--shadow-popup)",
                maxWidth: "none",
                maxHeight: "none",
                borderRadius: "8px",
              }}
              draggable={false}
            />
          )}
        </div>
      </div>

      {showContextMenu && (
        <div
          className="image-context-menu fixed z-[60] flex flex-col min-w-[160px] py-2 rounded-lg shadow-xl"
          style={{
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            background: "var(--bg-secondary)",
            border: "1px solid var(--divider)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleSaveImage}
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
            另存为图片
          </button>
        </div>
      )}

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

ImagePreview.displayName = "ImagePreview";

export default ImagePreview;
