import { getCodeBlockContextMenuItems } from "@/components/context-menu/CodeBlockContextMenu";
import ContextMenu from "@/components/context-menu/ContextMenu";
import { useInteractionConfig } from "@/hooks/useActiveConfig";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useReaderStore } from "@/stores/readerStore";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import css from "highlight.js/lib/languages/css";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import scala from "highlight.js/lib/languages/scala";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import {
  default as html,
  default as xml,
} from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("java", java);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("c", c);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("php", php);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("shell", shell);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", html);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("scala", scala);
hljs.registerLanguage("dockerfile", dockerfile);
hljs.registerLanguage("powershell", powershell);

const highlightCache = new Map<string, string>();

function highlightCode(code: string, language: string): string {
  const cacheKey = `${language}:${code}`;
  const cached = highlightCache.get(cacheKey);
  if (cached) return cached;

  try {
    let result: string;
    if (language && hljs.getLanguage(language)) {
      result = hljs.highlight(code, { language }).value;
    } else {
      result = hljs.highlightAuto(code).value;
    }
    highlightCache.set(cacheKey, result);
    return result;
  } catch {
    return code;
  }
}

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = memo(({ language, code }) => {
  const interactionConfig = useInteractionConfig();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState(code);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);
  const {
    menuState,
    menuRef,
    show: showContextMenu,
    hide: hideContextMenu,
    adjustPosition,
  } = useContextMenu();

  useEffect(() => {
    const el = codeRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsHighlighted(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditing]);

  const highlightedCode = isHighlighted ? highlightCode(code, language) : null;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), interactionConfig.copyStateTimeoutMs);
    } catch (err) {
      console.error("Failed to copy code:", err);
      useReaderStore.getState().addToast({
        type: "error",
        message: "复制失败",
        duration: 2000,
      });
    }
  }, [code]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const selection = window.getSelection();
      const hasSelection =
        selection !== null && selection.toString().length > 0;

      const items = getCodeBlockContextMenuItems({
        codeContent: code,
        hasSelection,
        onCopyCode: handleCopy,
        onCopySelection: () => {
          if (hasSelection) {
            navigator.clipboard.writeText(selection.toString());
          }
        },
        onEditCodeBlock: () => {
          setEditCode(code);
          setIsEditing(true);
        },
      });

      showContextMenu(e, items);
    },
    [code, handleCopy, showContextMenu],
  );

  return (
    <>
      <div
        ref={codeRef}
        className="relative my-4 rounded-md overflow-hidden"
        style={{
          background: "var(--bg-code, #16162A)",
          border: "1px solid var(--code-border)",
        }}
        onContextMenu={handleContextMenu}
      >
        {/* 语言标签 — 左上角 */}
        {!isEditing && (
          <div
            className="absolute top-0 left-0 px-3 py-1 text-[11px] z-[1] select-none rounded-br-md"
            style={{
              color: "var(--accent-orange, #FF8000)",
              background: "var(--code-label-bg)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            {language}
          </div>
        )}

        {/* 复制按钮 — 右上角悬浮图标 */}
        <button
          onClick={handleCopy}
          className="hover-btn-icon absolute top-1.5 right-2 z-[2] flex items-center justify-center w-7 h-7 rounded-sm border-none cursor-pointer bg-transparent p-0"
          style={{
            color: copied
              ? "var(--accent-green, #00FF64)"
              : "var(--text-muted, #50505A)",
            opacity: 0.6,
            transition: "color 150ms ease-out",
          }}
          aria-label={copied ? "已复制" : "复制代码"}
          title={copied ? "Copied!" : "Copy"}
        >
          {copied ? (
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M11 3.5L5.5 9L3 6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <rect x="5" y="5" width="7" height="7" rx="1.5" />
              <path
                d="M9 5V3.5A1.5 1.5 0 007.5 2h-4A1.5 1.5 0 002 3.5v4A1.5 1.5 0 003.5 9H5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        {/* 代码内容 / 编辑模式 */}
        {isEditing ? (
          <div className="px-4 pt-4 pb-4">
            <textarea
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              className="w-full bg-transparent border-none outline-none resize-y text-sm"
              style={{
                fontFamily: "var(--font-mono)",
                lineHeight: 1.6,
                color: "var(--text-primary)",
                minHeight: "200px",
                caretColor: "var(--accent-cyan)",
              }}
              autoFocus
              spellCheck={false}
            />
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-sm rounded border-none cursor-pointer"
                style={{
                  background: "var(--hover-bg-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  useReaderStore.getState().addToast({
                    type: "success",
                    message: "代码已更新（仅当前会话）",
                  });
                }}
                className="px-3 py-1.5 text-sm rounded border-none cursor-pointer"
                style={{
                  background: "var(--accent-cyan)",
                  color: "var(--bg-page)",
                }}
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <pre className="overflow-x-auto px-4 pt-8 pb-4 m-0 [scrollbar-width:thin]" style={{ fontSize: "0.9em" }}>
            <code
              className="hljs"
              style={{
                fontFamily: "var(--font-mono)",
                lineHeight: 1.6,
              }}
              dangerouslySetInnerHTML={{
                __html: highlightedCode ?? code,
              }}
            />
          </pre>
        )}
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

CodeBlock.displayName = "CodeBlock";

export default CodeBlock;
