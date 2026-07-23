import React, { memo, useCallback, useEffect, useRef, useState } from "react";

interface QuickEditProps {
  text: string;
  targetElement: HTMLElement;
  onSave: () => void;
  onCancel: () => void;
  onUpdate: (text: string) => void;
}

const QuickEdit: React.FC<QuickEditProps> = memo(
  ({ text, targetElement, onSave, onCancel, onUpdate }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const [height, setHeight] = useState(200);
    const isDraggingRef = useRef(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);

    useEffect(() => {
      const updatePosition = () => {
        // 目标元素脱离 DOM 时不跳位，保持当前位置
        if (!targetElement.isConnected) return;

        const rect = targetElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        const editHeight = height + 36;
        const editWidth = rect.width;

        const top = rect.top;
        let left = rect.left;

        if (left + editWidth > windowWidth) {
          left = windowWidth - editWidth - 16;
        }
        if (left < 0) {
          left = 16;
        }

        setPosition({
          top: Math.max(16, Math.min(top, windowHeight - editHeight - 16)),
          left: Math.max(16, left),
          width: Math.min(editWidth, windowWidth - 32),
        });
      };

      // 仅在 mount 时计算一次位置，锁定在当前视口
      updatePosition();

      // 仅监听 resize 重新计算（视口尺寸变化时调整）
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("resize", updatePosition);
      };
    }, [targetElement, height]);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const container = textareaRef.current?.parentElement;
        if (container && !container.contains(e.target as Node)) {
          onCancel();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [onCancel]);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.selectionStart = len;
        textareaRef.current.selectionEnd = len;
      }
    }, []);

    useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      };
      document.addEventListener("keydown", handleGlobalKeyDown);
      return () => document.removeEventListener("keydown", handleGlobalKeyDown);
    }, [onCancel]);

    const handleResizeStart = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingRef.current = true;
        startYRef.current = e.clientY;
        startHeightRef.current = height;
        document.body.style.cursor = "ns-resize";
        document.body.style.userSelect = "none";
      },
      [height],
    );

    useEffect(() => {
      const handleResizeMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const deltaY = e.clientY - startYRef.current;
        const newHeight = Math.min(
          400,
          Math.max(200, startHeightRef.current + deltaY),
        );
        setHeight(newHeight);
      };

      const handleResizeEnd = () => {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);

      return () => {
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
      };
    }, []);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          onSave();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      },
      [onSave, onCancel],
    );

    return (
      <div
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          width: position.width,
          zIndex: 999999,
          border: "1px solid var(--accent-cyan, #00FFFF)",
          borderRadius: "4px",
          boxShadow: "0 4px 24px var(--shadow-popup)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onUpdate(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            padding: "8px",
            background: "var(--bg-code, #16162A)",
            color: "var(--text-primary)",
            border: "none",
            outline: "none",
            height: `${height}px`,
            resize: "none",
            fontFamily: "inherit",
            lineHeight: "inherit",
            fontSize: "inherit",
            borderRadius: "4px 4px 0 0",
            boxSizing: "border-box",
          }}
        />
        <div
          onMouseDown={handleResizeStart}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "8px",
            background: "var(--bg-code, #16162A)",
            cursor: "ns-resize",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "3px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "2px",
                borderRadius: "1px",
                background: "var(--accent-cyan, #00FFFF)",
                opacity: 0.4,
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "4px 8px",
            background: "var(--bg-code, #16162A)",
            fontSize: "0.6875rem",
            color: "var(--text-muted)",
            borderRadius: "0 0 4px 4px",
          }}
        >
          <span>Ctrl+Enter 保存 / Esc 取消</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onCancel}
              style={{
                color: "var(--text-secondary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.6875rem",
                padding: "2px 4px",
              }}
            >
              取消
            </button>
            <button
              onClick={onSave}
              style={{
                color: "var(--accent-cyan)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.6875rem",
                padding: "2px 4px",
              }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  },
);

QuickEdit.displayName = "QuickEdit";

export default QuickEdit;
