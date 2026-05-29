import React, { memo, useMemo } from "react";

/**
 * 简单的 YAML frontmatter 解析器，不依赖任何外部库
 */
export function parseFrontmatter(raw: string): Record<string, unknown> | null {
  try {
    // 移除开头和结尾的 ---
    const lines = raw
      .trim()
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("---"));

    const result: Record<string, unknown> = {};
    let currentKey: string | null = null;
    let currentIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // 计算缩进
      let indent = 0;
      while (indent < line.length && line[indent] === " ") {
        indent++;
      }
      const trimmedLine = line.trim();

      // 首先检查是否是列表项
      if (trimmedLine.startsWith("-")) {
        if (currentKey && indent > currentIndent) {
          // 是当前键的列表项
          const arrayValue = trimmedLine.slice(1).trim();
          const currentValue = result[currentKey];
          if (Array.isArray(currentValue)) {
            currentValue.push(parseValue(arrayValue));
          } else {
            result[currentKey] = [parseValue(arrayValue)];
          }
        }
        continue;
      }

      // 检查是否是键值对
      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex > 0 && colonIndex < trimmedLine.length - 1) {
        const key = trimmedLine.slice(0, colonIndex).trim();
        const valueStr = trimmedLine.slice(colonIndex + 1).trim();

        // 普通键值对
        currentKey = key;
        currentIndent = indent;

        if (valueStr) {
          result[key] = parseValue(valueStr);
        } else {
          // 空值，可能是嵌套对象或数组，先设为 null，后面处理
          result[key] = null;
        }
      } else if (indent > currentIndent && currentKey) {
        // 可能是嵌套对象，这里简化处理
        if (trimmedLine.includes(":")) {
          // 嵌套对象，这里简化处理，不深入解析
          // 为了简单起见，我们先忽略嵌套对象
        }
      }
    }

    if (Object.keys(result).length === 0) {
      return null;
    }

    return result;
  } catch (e) {
    console.error("Error parsing frontmatter:", e);
    return null;
  }
}

/**
 * 解析单个值，处理布尔值、数字、字符串等
 */
function parseValue(valueStr: string): unknown {
  const trimmed = valueStr.trim();

  // 处理引号
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // 处理布尔值
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;
  if (trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "~") return null;

  // 处理数字
  if (/^-?\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // 默认返回字符串
  return trimmed;
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="obsidian-fm-null">null</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className={`obsidian-fm-boolean ${value ? "obsidian-fm-true" : "obsidian-fm-false"}`}>
        {value ? "true" : "false"}
      </span>
    );
  }
  if (typeof value === "number") {
    return <span className="obsidian-fm-number">{String(value)}</span>;
  }
  if (typeof value === "string") {
    return <span className="obsidian-fm-string">{value}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <span className="obsidian-fm-array">
        {value.map((item, idx) => (
          <span key={idx} className="obsidian-fm-tag">
            {String(item)}
          </span>
        ))}
      </span>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <span className="obsidian-fm-object">
        {entries.map(([k, v]) => (
          <span key={k} className="obsidian-fm-object-entry">
            <span className="obsidian-fm-object-key">{k}:</span>
            {renderValue(v)}
          </span>
        ))}
      </span>
    );
  }
  return <span className="obsidian-fm-string">{String(value)}</span>;
}

interface FrontmatterProps {
  raw: string;
}

const ObsidianFrontmatterInner: React.FC<FrontmatterProps> = ({ raw }) => {
  const data = useMemo(() => parseFrontmatter(raw), [raw]);

  if (!data) {
    // 如果解析失败，至少显示原始内容
    return (
      <div className="obsidian-frontmatter">
        <div className="obsidian-fm-header">
          <span className="obsidian-fm-header-icon">&#x2630;</span>
          <span className="obsidian-fm-header-title">Properties</span>
        </div>
        <div className="obsidian-fm-body" style={{ padding: "1em" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>
            {raw}
          </pre>
        </div>
      </div>
    );
  }

  const entries = Object.entries(data);

  return (
    <div className="obsidian-frontmatter">
      <div className="obsidian-fm-header">
        <span className="obsidian-fm-header-icon">&#x2630;</span>
        <span className="obsidian-fm-header-title">Properties</span>
      </div>
      <div className="obsidian-fm-body">
        {entries.map(([key, value]) => (
          <div key={key} className="obsidian-fm-row">
            <div className="obsidian-fm-key">{key}</div>
            <div className="obsidian-fm-value">{renderValue(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ObsidianFrontmatter = memo(ObsidianFrontmatterInner);
ObsidianFrontmatter.displayName = "ObsidianFrontmatter";
