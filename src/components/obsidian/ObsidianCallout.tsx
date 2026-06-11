import React, { memo, useState } from "react";

export interface CalloutTypeDef {
  title: string;
  color: string;
  icon: string;
}

const CALLOUT_TYPE_MAP: Record<string, CalloutTypeDef> = {
  note: { title: "Note", color: "var(--obsidian-callout-note, #448aff)", icon: "pencil" },
  abstract: { title: "Abstract", color: "var(--obsidian-callout-abstract, #00b0ff)", icon: "clipboard-list" },
  summary: { title: "Abstract", color: "var(--obsidian-callout-abstract, #00b0ff)", icon: "clipboard-list" },
  tldr: { title: "Abstract", color: "var(--obsidian-callout-abstract, #00b0ff)", icon: "clipboard-list" },
  info: { title: "Info", color: "var(--obsidian-callout-info, #00b8d4)", icon: "info" },
  todo: { title: "Todo", color: "var(--obsidian-callout-todo, #00b8d4)", icon: "check-circle-2" },
  tip: { title: "Tip", color: "var(--obsidian-callout-tip, #00bfa5)", icon: "flame" },
  hint: { title: "Tip", color: "var(--obsidian-callout-tip, #00bfa5)", icon: "flame" },
  important: { title: "Tip", color: "var(--obsidian-callout-tip, #00bfa5)", icon: "flame" },
  success: { title: "Success", color: "var(--obsidian-callout-success, #00c853)", icon: "check" },
  check: { title: "Success", color: "var(--obsidian-callout-success, #00c853)", icon: "check" },
  done: { title: "Success", color: "var(--obsidian-callout-success, #00c853)", icon: "check" },
  question: { title: "Question", color: "var(--obsidian-callout-question, #64dd17)", icon: "help-circle" },
  help: { title: "Question", color: "var(--obsidian-callout-question, #64dd17)", icon: "help-circle" },
  faq: { title: "Question", color: "var(--obsidian-callout-question, #64dd17)", icon: "help-circle" },
  warning: { title: "Warning", color: "var(--obsidian-callout-warning, #ff9100)", icon: "alert-triangle" },
  caution: { title: "Warning", color: "var(--obsidian-callout-warning, #ff9100)", icon: "alert-triangle" },
  attention: { title: "Warning", color: "var(--obsidian-callout-warning, #ff9100)", icon: "alert-triangle" },
  failure: { title: "Failure", color: "var(--obsidian-callout-failure, #ff5252)", icon: "x" },
  fail: { title: "Failure", color: "var(--obsidian-callout-failure, #ff5252)", icon: "x" },
  missing: { title: "Failure", color: "var(--obsidian-callout-failure, #ff5252)", icon: "x" },
  danger: { title: "Danger", color: "var(--obsidian-callout-danger, #ff1744)", icon: "zap" },
  error: { title: "Danger", color: "var(--obsidian-callout-danger, #ff1744)", icon: "zap" },
  bug: { title: "Bug", color: "var(--obsidian-callout-bug, #f50057)", icon: "bug" },
  example: { title: "Example", color: "var(--obsidian-callout-example, #7c4dff)", icon: "list" },
  quote: { title: "Quote", color: "var(--obsidian-callout-quote, #9e9e9e)", icon: "quote" },
  cite: { title: "Quote", color: "var(--obsidian-callout-quote, #9e9e9e)", icon: "quote" },
};

export function parseCalloutHeader(
  headerText: string,
): {
  type: string;
  fold: "+" | "-" | null;
  customTitle: string | null;
} {
  const match = headerText.match(
    /^\\?\[!(\w+)\]([+-]?)(.*)/,
  );
  if (!match) {
    return { type: "note", fold: null, customTitle: null };
  }
  const type = match[1].toLowerCase();
  const foldChar = match[2];
  const restTitle = match[3].trim();
  return {
    type: CALLOUT_TYPE_MAP[type] ? type : "note",
    fold: foldChar === "+" || foldChar === "-" ? foldChar : null,
    customTitle: restTitle || null,
  };
}

interface CalloutProps {
  type: string;
  fold: "+" | "-" | null;
  customTitle: string | null;
  children: React.ReactNode;
  /** 原始 Markdown 源码（含 `> ` 前缀与嵌套），用于 QuickEdit 等回写场景 */
  raw?: string;
  /** 源 markdown 起始行号（含），与 raw 配合用于精确定位 */
  startLine?: number;
  /** 源 markdown 结束行号（含），与 raw 配合用于精确定位 */
  endLine?: number;
}

const ObsidianCalloutInner: React.FC<CalloutProps> = ({
  type,
  fold,
  customTitle,
  children,
  raw,
  startLine,
  endLine,
}) => {
  const [collapsed, setCollapsed] = useState(fold === "-");
  const typeDef = CALLOUT_TYPE_MAP[type] || CALLOUT_TYPE_MAP["note"]!;
  const displayTitle = customTitle ?? typeDef.title;
  const isFoldable = fold !== null;

  // 把 startLine 和 endLine 编码进 data-raw：格式 `start|end|raw`
  // 优先用行号精确定位，回退到字符串 replace
  const dataRaw =
    raw && typeof startLine === "number" && typeof endLine === "number"
      ? encodeURIComponent(`${startLine}|${endLine}|${raw}`)
      : raw
        ? encodeURIComponent(raw)
        : undefined;

  return (
    <div
      className={`obsidian-callout obsidian-callout-${type}`}
      data-callout={type}
      data-raw={dataRaw}
      style={
        {
          "--callout-color": typeDef.color,
          borderLeft: `4px solid ${typeDef.color}`,
          backgroundColor: `color-mix(in srgb, ${typeDef.color} 8%, transparent)`,
        } as React.CSSProperties
      }
    >
      <div
        className="obsidian-callout-title"
        onClick={isFoldable ? () => setCollapsed(!collapsed) : undefined}
        style={{ cursor: isFoldable ? "pointer" : "default" }}
      >
        <span className={`obsidian-callout-icon obsidian-icon-${typeDef.icon}`} />
        <span className="obsidian-callout-title-text">{displayTitle}</span>
        {isFoldable && (
          <span className={`obsidian-callout-fold ${collapsed ? "obsidian-callout-fold-collapsed" : ""}`}>
            {collapsed ? "\u25B6" : "\u25BC"}
          </span>
        )}
      </div>
      {!collapsed && (
        <div className="obsidian-callout-body">{children}</div>
      )}
    </div>
  );
};

export const ObsidianCallout = memo(ObsidianCalloutInner);
ObsidianCallout.displayName = "ObsidianCallout";

export { CALLOUT_TYPE_MAP };
