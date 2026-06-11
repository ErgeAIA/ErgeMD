import { useFileStore } from "@/stores/fileStore";
import { useReaderStore } from "@/stores/readerStore";
import { invoke } from "@tauri-apps/api/core";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { encodeBlockDataRaw, replaceLinesByRange } from "@/utils/quickEditLines";
import MermaidDiagram from "./MermaidDiagram";

interface LazyMermaidBlockProps {
  code: string;
  raw?: string;
  startLine?: number;
  endLine?: number;
}

const activeMermaidEditRef = { current: "" as string };

let mermaidIdCounter = 0;

const LazyMermaidBlock: React.FC<LazyMermaidBlockProps> = memo(
  ({ code, raw, startLine, endLine }) => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [editCode, setEditCode] = useState(code);
    const [showWarning, setShowWarning] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const blockId = useRef(`mermaid-${++mermaidIdCounter}`);

    const isOwner = activeMermaidEditRef.current === blockId.current;
    const hasUnsaved = editCode !== code;

    useEffect(() => {
      if (isEditing && !isOwner) {
        setIsEditing(false);
        setShowWarning(false);
      }
    }, [isEditing, isOwner]);

    const cleanup = useCallback(() => {
      setIsEditing(false);
      setShowWarning(false);
      activeMermaidEditRef.current = "";
    }, []);

    const handleEditRequest = useCallback(() => {
      activeMermaidEditRef.current = blockId.current;
      setEditCode(code);
      setIsEditing(true);
    }, [code]);

    const handleSave = useCallback(async () => {
      const { currentFilePath, currentContent, updateContent } =
        useFileStore.getState();
      const { addToast } = useReaderStore.getState();

      if (!currentFilePath || !raw) {
        addToast({
          type: "error",
          message: t("quickEdit.filePathLost"),
        });
        cleanup();
        return;
      }

      if (editCode === code) {
        cleanup();
        return;
      }

      try {
        const codeLines = raw.split("\n");
        const firstLine = codeLines[0];
        const lastLine = codeLines[codeLines.length - 1];
        const newRaw = `${firstLine}\n${editCode}\n${lastLine}`;

        // 优先按行号精确定位（处理 mermaid fence 周围可能被规范化的问题）
        let newContent: string;
        if (
          typeof startLine === "number" &&
          typeof endLine === "number"
        ) {
          newContent = replaceLinesByRange(
            currentContent,
            { startLine, endLine },
            newRaw,
          );
        } else {
          newContent = currentContent.replace(raw, newRaw);
        }

        if (newContent === currentContent) {
          addToast({
            type: "warning",
            message: t("quickEdit.noMatch"),
          });
          cleanup();
          return;
        }

        await invoke("write_file", {
          path: currentFilePath,
          content: newContent,
        });

        updateContent(newContent);
        addToast({
          type: "success",
          message: t("quickEdit.saveSuccess"),
        });
      } catch (error) {
        console.error("Save failed:", error);
        addToast({
          type: "error",
          message: t("quickEdit.saveFailed"),
        });
      }

      cleanup();
    }, [cleanup, code, editCode, raw, startLine, endLine]);

    const handleCancel = useCallback(() => {
      cleanup();
    }, [cleanup]);

    const handleWarnConfirm = useCallback(() => {
      cleanup();
    }, [cleanup]);

    const handleWarnCancel = useCallback(() => {
      setShowWarning(false);
    }, []);

    useEffect(() => {
      if (!isEditing || showWarning) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          cleanup();
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.stopPropagation();
          e.preventDefault();
          handleSave();
        }
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [isEditing, showWarning, cleanup, handleSave]);

    useEffect(() => {
      return () => {
        if (activeMermaidEditRef.current === blockId.current) {
          activeMermaidEditRef.current = "";
        }
      };
    }, []);

    const warningModal = showWarning ? (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={handleWarnCancel}
      >
        <div
          className="rounded-lg p-6 max-w-sm w-full"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--divider)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p
            className="text-base font-medium mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            有未保存的修改，确定要关闭吗？
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={handleWarnCancel}
              className="px-4 py-2 rounded text-sm border-none cursor-pointer"
              style={{
                background: "var(--hover-bg)",
                color: "var(--text-secondary)",
              }}
            >
              取消
            </button>
            <button
              onClick={handleWarnConfirm}
              className="px-4 py-2 rounded text-sm border-none cursor-pointer"
              style={{
                background: "var(--accent-red, #ff6b6b)",
                color: "#fff",
              }}
            >
              确认关闭
            </button>
          </div>
        </div>
      </div>
    ) : null;

    if (isEditing) {
      return (
        <>
          {warningModal}
          <div
            ref={containerRef}
            style={{
              background: "var(--bg-code, #16162A)",
              border: "1px solid var(--code-border)",
              borderRadius: 8,
              maxHeight: "min(80vh, 900px)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="px-4 pt-4 pb-2"
              style={{ overflow: "auto", flex: "1 1 auto" }}
            >
              <textarea
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                className="w-full bg-transparent border-none outline-none resize-y text-sm"
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  lineHeight: 1.6,
                  color: "var(--text-primary)",
                  minHeight: 200,
                  maxHeight: "40vh",
                  caretColor: "var(--accent-cyan)",
                }}
                autoFocus
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    cleanup();
                  } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.stopPropagation();
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
            </div>
            <div
              className="flex justify-center items-center gap-3 py-2"
              style={{
                borderTop: "1px solid var(--divider)",
                borderBottom: "1px solid var(--divider)",
              }}
            >
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {hasUnsaved ? (
                  <span style={{ color: "var(--accent-amber, #f59e0b)" }}>
                    ● 未保存
                  </span>
                ) : (
                  "已同步"
                )}
              </div>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm rounded border-none cursor-pointer"
                style={{
                  background: "var(--hover-bg)",
                  color: "var(--text-secondary)",
                }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm rounded border-none cursor-pointer"
                style={{
                  background: "var(--accent-cyan)",
                  color: "var(--bg-page)",
                }}
              >
                保存
              </button>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                Ctrl+Enter / Esc
              </div>
            </div>
            <div
              className="px-4 pb-4 pt-2"
              style={{ overflow: "auto", flex: "0 1 auto" }}
            >
              <div
                className="text-xs mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                实时预览
              </div>
              <MermaidDiagram chart={editCode} />
            </div>
          </div>
        </>
      );
    }

    return (
      <div
        ref={containerRef}
        className="my-4"
        data-block-type="mermaid"
        data-raw={encodeBlockDataRaw(raw ?? code, startLine, endLine)}
      >
        <MermaidDiagram chart={code} onEdit={handleEditRequest} />
      </div>
    );
  },
);

LazyMermaidBlock.displayName = "LazyMermaidBlock";

export default LazyMermaidBlock;
