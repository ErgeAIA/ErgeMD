# Obsidian 语法兼容模块 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 ErgeMD 添加 Obsidian Flavored Markdown 兼容层，按需加载，不污染现有渲染组件，支持自动卸载。

**Architecture:** 独立模块目录 `src/components/obsidian/`，通过语法检测器 `detectObsidianSyntax()` 判断是否激活。激活后向 `ReactMarkdown` 注入自定义组件覆盖默认渲染；未激活时返回 `null`，零开销。现有 `MarkdownBlockView.tsx` 中的 Admonition 逻辑迁移到 Obsidian 模块，原位替换为模块调用。

**Tech Stack:** React 19 + TypeScript + react-markdown 组件覆盖机制 + CSS 变量主题适配

---

## 现有架构关键信息

### 渲染链路

```
MarkdownView / VirtualMarkdownView
  → parseMarkdownBlocks(content) → MarkdownBlock[]
  → MarkdownBlockView(block)
    → ReactMarkdown(remarkPlugins, rehypePlugins, components)
```

### 现有 Admonition 系统（需迁移）

`MarkdownBlockView.tsx` 第 35-72 行：`ADMONITION_TYPES` 定义 9 种类型
`MarkdownBlockView.tsx` 第 303-418 行：`blockquote` 组件内联检测 `[!NOTE|TIP|...]` 并渲染

**问题**：现有 Admonition 只支持 9 种类型，不支持 Obsidian 的 13 种类型、别名、折叠、嵌套、自定义标题。

### 现有插件链

```typescript
REMARK_PLUGINS = [remarkSupersub, [remarkGfm, { singleTilde: false }], remarkMath, remarkEmoji, remarkAbbr]
REHYPE_PLUGINS = [rehypeRaw, rehypeSlug, rehypeKatex]
```

### 主题系统

14 个主题文件位于 `src/styles/themes/`，通过 CSS 变量实现主题切换。

---

## 文件结构

### 新建文件

| 文件 | 职责 |
|------|------|
| `src/components/obsidian/index.ts` | 模块入口，导出 `useObsidianModule` 和 `detectObsidianSyntax` |
| `src/components/obsidian/detectors.ts` | 语法检测器，扫描内容判断是否包含 Obsidian 语法 |
| `src/components/obsidian/useObsidianModule.ts` | React hook，按需返回 components 或 null |
| `src/components/obsidian/ObsidianCallout.tsx` | Callout 组件（13 种类型 + 别名 + 折叠 + 嵌套 + 自定义标题） |
| `src/components/obsidian/ObsidianWikilink.tsx` | Wikilink `[[note]]` 渲染组件 |
| `src/components/obsidian/ObsidianEmbed.tsx` | Embed `![[file]]` 渲染组件 |
| `src/components/obsidian/ObsidianHighlight.tsx` | 高亮 `==text==` 渲染组件 |
| `src/components/obsidian/ObsidianBlockId.tsx` | 块 ID `^block-id` 渲染组件 |
| `src/components/obsidian/ObsidianFrontmatter.tsx` | Frontmatter `--- ... ---` 解析和渲染组件 |
| `src/components/obsidian/obsidian.css` | 独立样式文件，`.obsidian-*` 前缀，CSS 变量主题适配 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/components/reader/MarkdownBlockView.tsx` | 移除内联 Admonition 逻辑，改用 `useObsidianModule` hook 合并组件，添加 `ObsidianFrontmatter` 渲染 |
| `src/utils/markdownBlocks.ts` | 添加 `frontmatter` block 类型识别和解析 |
| `src/styles/globals.css` | 导入 `obsidian.css` |
| `src/styles/themes/*.css`（14 个文件） | 添加 Obsidian Callout 颜色 CSS 变量 |

---

## Task 1: 语法检测器

**Files:**
- Create: `src/components/obsidian/detectors.ts`

- [ ] **Step 1: 创建检测器文件**

```typescript
// src/components/obsidian/detectors.ts

/**
 * Obsidian 语法检测器
 * 扫描 Markdown 内容，判断是否包含 Obsidian 特有语法。
 * 所有正则仅做存在性检测，不做完整解析。
 */

export interface SyntaxDetector {
  /** 语法名称 */
  name: string;
  /** 检测函数，返回 true 表示内容包含该语法 */
  test: (content: string) => boolean;
}

/** Obsidian Callout 语法：> [!type] */
const calloutDetector: SyntaxDetector = {
  name: "callout",
  test: (content) => /^>\s*\[!\w+\]/m.test(content),
};

/** Obsidian Wikilink 语法：[[note]] */
const wikilinkDetector: SyntaxDetector = {
  name: "wikilink",
  test: (content) => /\[\[[^\]]+\]\]/.test(content),
};

/** Obsidian Embed 语法：![[file]] */
const embedDetector: SyntaxDetector = {
  name: "embed",
  test: (content) => /!\[\[[^\]]+\]\]/.test(content),
};

/** Obsidian 高亮语法：==text== */
const highlightDetector: SyntaxDetector = {
  name: "highlight",
  test: (content) => /==[^=\n]+==/.test(content),
};

/** Obsidian 注释语法：%%text%% */
const commentDetector: SyntaxDetector = {
  name: "comment",
  test: (content) => /%%/.test(content),
};

/** Obsidian 块 ID 语法：^block-id */
const blockIdDetector: SyntaxDetector = {
  name: "blockid",
  test: (content) => /\s\^[\w-]+\s*$/m.test(content),
};

/** Obsidian Frontmatter 语法：--- ... ---（文件开头） */
const frontmatterDetector: SyntaxDetector = {
  name: "frontmatter",
  test: (content) => /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content),
};

/** 所有检测器列表 */
export const OBSIDIAN_DETECTORS: SyntaxDetector[] = [
  calloutDetector,
  wikilinkDetector,
  embedDetector,
  highlightDetector,
  commentDetector,
  blockIdDetector,
  frontmatterDetector,
];

/**
 * 检测内容中包含的 Obsidian 语法
 * @param content Markdown 内容
 * @returns 检测到的语法名称集合，空集合表示无 Obsidian 语法
 */
export function detectObsidianSyntax(content: string): Set<string> {
  const found = new Set<string>();
  for (const detector of OBSIDIAN_DETECTORS) {
    if (detector.test(content)) {
      found.add(detector.name);
    }
  }
  return found;
}

/**
 * 快速判断内容是否包含任何 Obsidian 语法
 * @param content Markdown 内容
 * @returns true 表示包含至少一种 Obsidian 语法
 */
export function hasObsidianSyntax(content: string): boolean {
  return OBSIDIAN_DETECTORS.some((d) => d.test(content));
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `pnpm build 2>&1 | Select-String -Pattern "detectors" -Context 0,2`
Expected: 无错误（文件未被引用，但应编译通过）

---

## Task 2: Callout 组件

**Files:**
- Create: `src/components/obsidian/ObsidianCallout.tsx`

这是最复杂的组件，需要支持：
- 13 种内置类型 + 别名
- 自定义标题
- 折叠（`+` 展开 / `-` 收起）
- 嵌套
- 主题适配（CSS 变量）

- [ ] **Step 1: 创建 Callout 类型定义和组件**

```tsx
// src/components/obsidian/ObsidianCallout.tsx

import React, { memo, useState } from "react";

// ── Callout 类型定义 ──────────────────────────────────

export interface CalloutTypeDef {
  /** 默认标题 */
  title: string;
  /** CSS 变量色值或直接色值 */
  color: string;
  /** Lucide 图标名（用于 CSS ::before 渲染） */
  icon: string;
}

/** Obsidian 内置 13 种 Callout 类型 + 别名映射 */
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

/** 解析 Callout 首行文本，提取类型、折叠状态、自定义标题 */
export function parseCalloutHeader(
  headerText: string,
): {
  type: string;
  fold: "+" | "-" | null;
  customTitle: string | null;
} {
  // 匹配 [!type]+ 或 [!type]- 或 [!type] 后跟自定义标题
  const match = headerText.match(
    /^\[!(\w+)\]([+-]?)(.*)/,
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

// ── Callout 组件 ──────────────────────────────────────

interface CalloutProps {
  type: string;
  fold: "+" | "-" | null;
  customTitle: string | null;
  children: React.ReactNode;
}

const ObsidianCalloutInner: React.FC<CalloutProps> = ({
  type,
  fold,
  customTitle,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(fold === "-");
  const typeDef = CALLOUT_TYPE_MAP[type] || CALLOUT_TYPE_MAP["note"]!;
  const displayTitle = customTitle ?? typeDef.title;
  const isFoldable = fold !== null;

  return (
    <div
      className={`obsidian-callout obsidian-callout-${type}`}
      data-callout={type}
      style={
        {
          "--callout-color": typeDef.color,
          borderLeft: `4px solid ${typeDef.color}`,
          // 注意：内联 style 中 color-mix() 兼容性由 CSS 类保证，
          // 此处仅作增强；不支持 color-mix 的浏览器回退到 CSS 中的 rgba
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

/** 导出类型映射供外部使用 */
export { CALLOUT_TYPE_MAP };
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `pnpm build 2>&1 | Select-String -Pattern "ObsidianCallout" -Context 0,2`
Expected: 无错误

---

## Task 3: Wikilink 组件

**Files:**
- Create: `src/components/obsidian/ObsidianWikilink.tsx`

> **设计说明：** Wikilink/Embed/Highlight/BlockId 的当前渲染走 `preprocessObsidianSyntax` → HTML `<span>` → rehype-raw 路径，
> 不经过这些 React 组件。但保留组件和 `parse*` 函数有两个目的：
> 1. `parseWikilink` / `parseEmbed` 等解析函数可被外部逻辑复用（如搜索、导航）
> 2. 未来实现交互功能（点击 Wikilink 跳转、Embed 预览）时，可切换为组件渲染路径

- [ ] **Step 1: 创建 Wikilink 组件**

```tsx
// src/components/obsidian/ObsidianWikilink.tsx

import React, { memo } from "react";

/**
 * 解析 Wikilink 语法
 * 支持格式：
 *   [[NoteName]]              → { target: "NoteName", display: "NoteName", heading: null, blockId: null }
 *   [[NoteName|显示文本]]      → { target: "NoteName", display: "显示文本", heading: null, blockId: null }
 *   [[NoteName#Heading]]      → { target: "NoteName", display: "Heading", heading: "Heading", blockId: null }
 *   [[NoteName#^blockId]]     → { target: "NoteName", display: "NoteName", heading: null, blockId: "blockId" }
 *   [[#Heading]]              → { target: "", display: "Heading", heading: "Heading", blockId: null }
 */
export function parseWikilink(raw: string): {
  target: string;
  display: string;
  heading: string | null;
  blockId: string | null;
} | null {
  const match = raw.match(/^\[\[([^\]]+)\]\]$/);
  if (!match) return null;

  let inner = match[1];
  let display = "";
  let heading: string | null = null;
  let blockId: string | null = null;

  // 分离显示文本 |
  const pipeIndex = inner.indexOf("|");
  if (pipeIndex !== -1) {
    display = inner.slice(pipeIndex + 1);
    inner = inner.slice(0, pipeIndex);
  }

  // 分离块 ID #^
  const blockIdIndex = inner.indexOf("#^");
  if (blockIdIndex !== -1) {
    blockId = inner.slice(blockIdIndex + 2);
    inner = inner.slice(0, blockIdIndex);
  } else {
    // 分离标题 #
    const headingIndex = inner.indexOf("#");
    if (headingIndex !== -1) {
      heading = inner.slice(headingIndex + 1);
      inner = inner.slice(0, headingIndex);
    }
  }

  // 如果没有自定义显示文本，使用标题或目标名
  if (!display) {
    display = heading || blockId || inner || "";
  }

  return { target: inner, display, heading, blockId };
}

interface WikilinkProps {
  raw: string;
}

const ObsidianWikilinkInner: React.FC<WikilinkProps> = ({ raw }) => {
  const parsed = parseWikilink(raw);

  if (!parsed) {
    return <span className="obsidian-wikilink obsidian-wikilink-invalid">{raw}</span>;
  }

  return (
    <span
      className="obsidian-wikilink"
      data-target={parsed.target}
      data-heading={parsed.heading ?? undefined}
      data-block-id={parsed.blockId ?? undefined}
      title={parsed.target ? `${parsed.target}${parsed.heading ? ` > ${parsed.heading}` : ""}` : parsed.heading}
    >
      {parsed.display}
    </span>
  );
};

export const ObsidianWikilink = memo(ObsidianWikilinkInner);
ObsidianWikilink.displayName = "ObsidianWikilink";
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `pnpm build 2>&1 | Select-String -Pattern "ObsidianWikilink" -Context 0,2`
Expected: 无错误

---

## Task 4: Embed 组件

**Files:**
- Create: `src/components/obsidian/ObsidianEmbed.tsx`

- [ ] **Step 1: 创建 Embed 组件**

```tsx
// src/components/obsidian/ObsidianEmbed.tsx

import React, { memo } from "react";

/**
 * 解析 Embed 语法
 * 支持格式：
 *   ![[NoteName]]              → { target: "NoteName", type: "note", heading: null, width: null }
 *   ![[NoteName#Heading]]      → { target: "NoteName", type: "note", heading: "Heading", width: null }
 *   ![[image.png]]             → { target: "image.png", type: "image", heading: null, width: null }
 *   ![[image.png|300]]         → { target: "image.png", type: "image", heading: null, width: "300" }
 *   ![[document.pdf#page=3]]   → { target: "document.pdf", type: "pdf", heading: null, width: null, page: 3 }
 */
export function parseEmbed(raw: string): {
  target: string;
  type: "note" | "image" | "pdf" | "audio" | "video" | "unknown";
  heading: string | null;
  width: string | null;
  page?: number;
} | null {
  const match = raw.match(/^!\[\[([^\]]+)\]\]$/);
  if (!match) return null;

  let inner = match[1];
  let width: string | null = null;

  // 分离宽度参数 |300 或 |300x200
  const pipeIndex = inner.lastIndexOf("|");
  if (pipeIndex !== -1) {
    const afterPipe = inner.slice(pipeIndex + 1).trim();
    if (/^\d+/.test(afterPipe)) {
      width = afterPipe;
      inner = inner.slice(0, pipeIndex);
    }
  }

  // 分离 PDF 页码
  let page: number | undefined;
  const pdfPageMatch = inner.match(/#page=(\d+)$/);
  if (pdfPageMatch) {
    page = parseInt(pdfPageMatch[1], 10);
    inner = inner.slice(0, inner.length - pdfPageMatch[0].length);
  }

  // 分离标题
  let heading: string | null = null;
  const headingIndex = inner.indexOf("#");
  if (headingIndex !== -1) {
    heading = inner.slice(headingIndex + 1);
    inner = inner.slice(0, headingIndex);
  }

  // 判断文件类型
  const ext = inner.split(".").pop()?.toLowerCase() || "";
  let type: "note" | "image" | "pdf" | "audio" | "video" | "unknown" = "note";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"].includes(ext)) {
    type = "image";
  } else if (ext === "pdf") {
    type = "pdf";
  } else if (["mp3", "wav", "ogg", "m4a"].includes(ext)) {
    type = "audio";
  } else if (["mp4", "webm", "mov", "avi"].includes(ext)) {
    type = "video";
  }

  return { target: inner, type, heading, width, page };
}

interface EmbedProps {
  raw: string;
}

const ObsidianEmbedInner: React.FC<EmbedProps> = ({ raw }) => {
  const parsed = parseEmbed(raw);

  if (!parsed) {
    return <span className="obsidian-embed obsidian-embed-invalid">{raw}</span>;
  }

  // 阅读器模式：Embed 显示为带样式的引用块
  // 图片类型尝试渲染为 <img>
  if (parsed.type === "image") {
    return (
      <span className="obsidian-embed obsidian-embed-image">
        <img
          src={parsed.target}
          alt={parsed.target}
          style={parsed.width ? { width: parsed.width.includes("x") ? undefined : `${parsed.width}px` } : undefined}
          onError={(e) => {
            // 图片加载失败时显示为文本引用
            const el = e.currentTarget;
            el.style.display = "none";
            const fallback = el.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "inline";
          }}
        />
        <span className="obsidian-embed-fallback" style={{ display: "none" }}>
          {raw}
        </span>
      </span>
    );
  }

  // 其他类型显示为引用块
  return (
    <span className="obsidian-embed obsidian-embed-ref" data-target={parsed.target}>
      {parsed.heading ? `${parsed.target} > ${parsed.heading}` : parsed.target}
    </span>
  );
};

export const ObsidianEmbed = memo(ObsidianEmbedInner);
ObsidianEmbed.displayName = "ObsidianEmbed";
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `pnpm build 2>&1 | Select-String -Pattern "ObsidianEmbed" -Context 0,2`
Expected: 无错误

---

##### Task 5: Highlight / BlockId / Frontmatter 组件

**Files:**
- Create: `src/components/obsidian/ObsidianHighlight.tsx`
- Create: `src/components/obsidian/ObsidianBlockId.tsx`
- Create: `src/components/obsidian/ObsidianFrontmatter.tsx`
- Modify: `src/utils/markdownBlocks.ts` — 添加 `frontmatter` block 类型识别

> **Note:** Comment `%%text%%` 不需要独立组件。注释在 `preprocessObsidianSyntax` 阶段直接移除，
> 无需渲染组件，因此省略 `ObsidianComment.tsx`。

- [ ] **Step 1: 创建 Highlight 组件**

```tsx
// src/components/obsidian/ObsidianHighlight.tsx

import React, { memo } from "react";

interface HighlightProps {
  children: React.ReactNode;
}

const ObsidianHighlightInner: React.FC<HighlightProps> = ({ children }) => {
  return (
    <mark className="obsidian-highlight">
      {children}
    </mark>
  );
};

export const ObsidianHighlight = memo(ObsidianHighlightInner);
ObsidianHighlight.displayName = "ObsidianHighlight";
```

- [ ] **Step 2: 创建 BlockId 组件**

```tsx
// src/components/obsidian/ObsidianBlockId.tsx

import React, { memo } from "react";

/**
 * Obsidian 块 ID 组件
 * ^block-id 在阅读视图中作为锚点标记，不显示文本
 */
interface BlockIdProps {
  id: string;
}

const ObsidianBlockIdInner: React.FC<BlockIdProps> = ({ id }) => {
  return <span className="obsidian-block-id" data-block-id={id} id={`^${id}`} />;
};

export const ObsidianBlockId = memo(ObsidianBlockIdInner);
ObsidianBlockId.displayName = "ObsidianBlockId";
```

- [ ] **Step 3: 创建 Frontmatter 组件**

```tsx
// src/components/obsidian/ObsidianFrontmatter.tsx

import React, { memo, useMemo } from "react";

/**
 * 解析 YAML frontmatter
 * 返回解析后的键值对对象
 *
 * 局限性说明：
 * - 不支持多行字符串（| 和 > 折叠/保留块）
 * - 不支持嵌套对象（仅支持一层键值对和数组）
 * - 不支持行内对象 {key: value}
 * - 不支持锚点 &、别名 *、合并键 << 等 YAML 高级特性
 * - 不支持带引号的多行值
 * 对于 Obsidian frontmatter 的常见用法（title/date/tags/aliases/cssclasses），
 * 以上限制不影响正常使用。如需完整 YAML 支持，可引入 js-yaml 库。
 */
export function parseFrontmatter(raw: string): Record<string, unknown> | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;

  const yamlContent = match[1];
  const result: Record<string, unknown> = {};

  // 简单的 YAML 解析（支持基本类型、数组、嵌套）
  // 格式：key: value 或 key: | 或 key: >
  // 数组格式：key: [item1, item2] 或 key:\n  - item1\n  - item2
  const lines = yamlContent.split("\n");
  let currentKey: string | null = null;
  let currentIndent = 0;
  const arrayItems: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过空行
    if (!trimmed) continue;

    // 检测键值对
    const kvMatch = trimmed.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kvMatch) {
      // 保存上一个数组
      if (currentKey && arrayItems.length > 0) {
        result[currentKey] = arrayItems;
        arrayItems.length = 0;
      }

      currentKey = kvMatch[1];
      const value = kvMatch[2];

      if (value) {
        // 内联值
        if (value.startsWith("[") && value.endsWith("]")) {
          // 内联数组
          result[currentKey] = value
            .slice(1, -1)
            .split(",")
            .map((v) => v.trim().replace(/^["']|["']$/g, ""));
        } else {
          // 普通字符串值
          result[currentKey] = value.replace(/^["']|["']$/g, "");
        }
        currentKey = null;
      } else {
        // 多行值，等待后续处理
        currentIndent = line.length - line.trimStart().length;
      }
    } else if (currentKey && (trimmed.startsWith("- ") || trimmed.match(/^\d+\.\s/))) {
      // 数组项
      const item = trimmed.replace(/^-\s*/, "").replace(/^\d+\.\s*/, "").replace(/^["']|["']$/g, "");
      arrayItems.push(item);
    }
  }

  // 保存最后一个数组
  if (currentKey && arrayItems.length > 0) {
    result[currentKey] = arrayItems;
  }

  return result;
}

interface FrontmatterProps {
  raw: string;
}

const ObsidianFrontmatterInner: React.FC<FrontmatterProps> = ({ raw }) => {
  const data = useMemo(() => parseFrontmatter(raw), [raw]);

  if (!data) return null;

  return (
    <div className="obsidian-frontmatter">
      <pre className="obsidian-frontmatter-content">
        {Object.entries(data)
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return `${key}: [${value.join(", ")}]`;
            }
            return `${key}: ${value}`;
          })
          .join("\n")}
      </pre>
    </div>
  );
};

export const ObsidianFrontmatter = memo(ObsidianFrontmatterInner);
ObsidianFrontmatter.displayName = "ObsidianFrontmatter";
```

- [ ] **Step 4: 修改 markdownBlocks.ts 添加 frontmatter block 类型**

在 `markdownBlocks.ts` 中：

1. 添加 `frontmatter` 到 `MarkdownBlockType`：
```typescript
export type MarkdownBlockType =
  | "heading"
  | "paragraph"
  | "blockquote"
  | "list"
  | "code"
  | "mermaid"
  | "table"
  | "html"
  | "thematicBreak"
  | "blank"
  | "math"
  | "frontmatter";  // 新增
```

2. 添加 `isFrontmatterStart` 函数：
```typescript
function isFrontmatterStart(line: string): boolean {
  return line.trim() === "---";
}
```

3. 在块解析循环中，检测文件开头是否有 frontmatter：
```typescript
// 在解析开始时检测 frontmatter
if (startLine === 1 && isFrontmatterStart(rawLine)) {
  // 查找结束标记
  let endLine = -1;
  for (let i = startLine + 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endLine = i;
      break;
    }
  }
  if (endLine > startLine) {
    // 收集 frontmatter 内容
    const frontmatterLines = lines.slice(startLine - 1, endLine + 1);
    blocks.push({
      id: `fm-${startLine}`,
      type: "frontmatter",
      raw: frontmatterLines.join("\n"),
      startLine,
      endLine: endLine + 1,
    });
    // 跳过 frontmatter 部分，继续解析后续内容
    currentLine = endLine + 1;
    continue;
  }
}
```

4. 在 `MarkdownBlockView.tsx` 的 `switch (block.type)` 中添加 `frontmatter` case：
```typescript
// ── Frontmatter block ──
if (block.type === "frontmatter") {
  return <ObsidianFrontmatter raw={block.raw} />;
}
```

- [ ] **Step 5: 验证 TypeScript 编译**

Run: `pnpm build 2>&1 | Select-String -Pattern "ObsidianFrontmatter|markdownBlockType" -Context 0,2`
Expected: 无错误

---

## Task 6: useObsidianModule Hook

**Files:**
- Create: `src/components/obsidian/useObsidianModule.ts`

此 hook 是核心集成点，负责：
1. 检测内容中的 Obsidian 语法
2. 按需返回 `ReactMarkdown` 的 `components` 覆盖
3. 无语法时返回 `null`（零开销）

- [ ] **Step 1: 创建 Hook**

```tsx
// src/components/obsidian/useObsidianModule.ts

import React, { useMemo } from "react";
import type { Components } from "react-markdown";
import { detectObsidianSyntax } from "./detectors";
import { ObsidianCallout, parseCalloutHeader } from "./ObsidianCallout";

// ── 辅助：从 ReactNode 提取纯文本 ──────────────────

function getTextContent(element: React.ReactNode): string {
  let text = "";
  React.Children.forEach(element, (child) => {
    if (typeof child === "string") {
      text += child;
    } else if (typeof child === "number") {
      text += String(child);
    } else if (React.isValidElement(child)) {
      const childProps = child.props as { children?: React.ReactNode };
      text += getTextContent(childProps.children);
    }
  });
  return text;
}

function cloneElementWithText(
  element: React.ReactElement,
  newText: string,
): React.ReactElement {
  return React.cloneElement(element, {}, newText || "\u00A0");
}

/**
 * 按需加载的 Obsidian 兼容模块 Hook
 * @param content 当前 block 的原始 Markdown 内容
 * @param blockRaw 当前 block 的原始文本（用于 data-raw 属性，保持与原始 blockquote 一致）
 * @returns ReactMarkdown components 覆盖对象，无 Obsidian 语法时返回 null
 */
export function useObsidianModule(content: string, blockRaw?: string): Components | null {
  const syntaxes = useMemo(() => detectObsidianSyntax(content), [content]);

  return useMemo(() => {
    if (syntaxes.size === 0) return null;

    const components: Components = {};

    // ── Callout 覆盖 blockquote ──
    if (syntaxes.has("callout")) {
      components.blockquote = function ObsidianBlockquote(
        props: React.HTMLAttributes<HTMLQuoteElement> & { children?: React.ReactNode },
      ) {
        const { children, style, ...rest } = props;
        const incomingStyle = style as React.CSSProperties | undefined;

        // 检测首行是否是 Callout 标记
        const childrenArray = React.Children.toArray(children);
        let isCallout = false;
        let calloutType = "note";
        let calloutFold: "+" | "-" | null = null;
        let calloutCustomTitle: string | null = null;
        let calloutHeaderIndex = -1;

        for (let i = 0; i < childrenArray.length; i++) {
          const child = childrenArray[i];
          if (React.isValidElement(child)) {
            const childText = getTextContent(child);
            // 匹配 [!type]+/- 可选标题
            const calloutMatch = childText.match(
              /^\[!(\w+)\]([+-]?)(.*)/,
            );
            if (calloutMatch) {
              isCallout = true;
              calloutHeaderIndex = i;
              const parsed = parseCalloutHeader(childText);
              calloutType = parsed.type;
              calloutFold = parsed.fold;
              calloutCustomTitle = parsed.customTitle;
              break;
            }
          }
        }

        if (isCallout) {
          // 移除 [!type] 标记文本
          const filteredChildren = React.Children.map(
            childrenArray,
            (child, idx) => {
              if (idx === calloutHeaderIndex && React.isValidElement(child)) {
                const text = getTextContent(child);
                const newText = text.replace(
                  /^\[!\w+\][+-]?.*/,
                  calloutCustomTitle || "",
                );
                return cloneElementWithText(child, newText);
              }
              return child;
            },
          );

          return (
            <ObsidianCallout
              type={calloutType}
              fold={calloutFold}
              customTitle={calloutCustomTitle}
            >
              {filteredChildren}
            </ObsidianCallout>
          );
        }

        // 非Callout的普通blockquote
        return (
          <blockquote
            {...rest}
            data-raw={blockRaw ? encodeURIComponent(blockRaw) : undefined}
            style={{
              borderLeft: "3px solid var(--accent-purple)",
              paddingLeft: "1em",
              marginLeft: 0,
              marginRight: 0,
              marginBottom: "1em",
              color: "var(--text-secondary)",
              fontStyle: "italic",
              ...incomingStyle,
            }}
          >
            {children}
          </blockquote>
        );
      };
    }

    // ── Wikilink / Embed：覆盖 a 标签和文本节点 ──
    // 注意：Wikilink [[text]] 不是标准 Markdown 链接，
    // 需要通过 rehype-raw 或自定义文本处理来识别。
    // 由于 react-markdown 不直接处理 [[text]]，
    // 我们在 pre-process 阶段将 [[text]] 转换为 <span class="obsidian-wikilink">text</span>
    // 这个转换在 useObsidianModule 的 preprocess 函数中完成（见 Task 7）

    return components;
  }, [syntaxes, blockRaw]);
}

/**
 * 预处理 Markdown 内容，将 Obsidian 内联语法转换为 HTML 标签
 * 这样 rehype-raw 可以正确解析它们
 *
 * 重要：先提取并保护代码块（fenced code + inline code），
 * 替换后再还原，避免代码块内的 Obsidian 语法被误替换。
 */
export function preprocessObsidianSyntax(content: string): string {
  // 检测是否需要预处理
  const syntaxes = detectObsidianSyntax(content);
  if (syntaxes.size === 0) return content;

  // ── Step 1: 提取代码块，用占位符替换 ──
  const codeBlocks: string[] = [];
  let result = content;

  // 提取 fenced code blocks (```...``` 和 ~~~...~~~)
  // 使用零宽断言避免吞掉前导换行符
  result = result.replace(
    /(^|(?<=\n))(```[\s\S]*?```|~~~[\s\S]*?~~~)/gm,
    (match) => {
      const index = codeBlocks.length;
      codeBlocks.push(match);
      return `\x00CODE_BLOCK_${index}\x00`;
    },
  );

  // 提取 inline code (`...` 和 ``...``)
  // 使用零宽断言避免吞掉相邻字符
  result = result.replace(
    /(?<=^|[^`])(`+)(.+?)\1(?=[^`]|$)/gm,
    (match) => {
      const index = codeBlocks.length;
      codeBlocks.push(match);
      return `\x00CODE_BLOCK_${index}\x00`;
    },
  );

  // ── Step 2: 对非代码区域执行 Obsidian 语法替换 ──

  // Embed: ![[file]] → <span class="obsidian-embed" data-raw="!&#91;&#91;file&#93;&#93;">file</span>
  if (syntaxes.has("embed")) {
    result = result.replace(
      /!\[\[([^\]]+)\]\]/g,
      (_match, p1) =>
        `<span class="obsidian-embed" data-raw="!&#91;&#91;${p1}&#93;&#93;">${p1}</span>`,
    );
  }

  // Wikilink: [[note]] → <span class="obsidian-wikilink" data-raw="&#91;&#91;note&#93;&#93;">note</span>
  // 必须在 Embed 之后处理，避免匹配 ![[ 的情况
  if (syntaxes.has("wikilink")) {
    result = result.replace(
      /(?<!!)\[\[([^\]]+)\]\]/g,
      (_match, p1) =>
        `<span class="obsidian-wikilink" data-raw="&#91;&#91;${p1}&#93;&#93;">${p1}</span>`,
    );
  }

  // Highlight: ==text== → <mark class="obsidian-highlight">text</mark>
  if (syntaxes.has("highlight")) {
    result = result.replace(
      /==([^=\n]+)==/g,
      '<mark class="obsidian-highlight">$1</mark>',
    );
  }

  // Comment: %%text%% → 隐藏（替换为空）
  if (syntaxes.has("comment")) {
    // 块级注释
    result = result.replace(
      /^%%\n([\s\S]*?)\n%%$/gm,
      "",
    );
    // 行内注释
    result = result.replace(
      /%%([^%]*?)%%/g,
      "",
    );
  }

  // Block ID: ^block-id → <span class="obsidian-block-id" id="^block-id"></span>
  if (syntaxes.has("blockid")) {
    result = result.replace(
      /\s\^([\w-]+)\s*$/gm,
      '<span class="obsidian-block-id" id="^$1"></span>',
    );
  }

  // ── Step 3: 还原代码块 ──
  result = result.replace(
    /\x00CODE_BLOCK_(\d+)\x00/g,
    (_match, indexStr) => codeBlocks[parseInt(indexStr, 10)] ?? "",
  );

  return result;
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `pnpm build 2>&1 | Select-String -Pattern "useObsidianModule" -Context 0,2`
Expected: 无错误

---

## Task 7: 模块入口

**Files:**
- Create: `src/components/obsidian/index.ts`

- [ ] **Step 1: 创建入口文件**

```typescript
// src/components/obsidian/index.ts

/**
 * Obsidian 语法兼容模块
 *
 * 按需加载：仅当检测到 Obsidian 特有语法时才激活。
 * 不污染现有渲染组件，所有样式使用 .obsidian-* 前缀。
 */

export { detectObsidianSyntax, hasObsidianSyntax } from "./detectors";
export { useObsidianModule, preprocessObsidianSyntax } from "./useObsidianModule";
export { ObsidianCallout, parseCalloutHeader, CALLOUT_TYPE_MAP } from "./ObsidianCallout";
export { ObsidianWikilink, parseWikilink } from "./ObsidianWikilink";
export { ObsidianEmbed, parseEmbed } from "./ObsidianEmbed";
export { ObsidianHighlight } from "./ObsidianHighlight";
export { ObsidianBlockId } from "./ObsidianBlockId";
export { ObsidianFrontmatter, parseFrontmatter } from "./ObsidianFrontmatter";
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `pnpm build 2>&1 | Select-String -Pattern "obsidian" -Context 0,2`
Expected: 无错误

---

## Task 8: Obsidian 样式文件

**Files:**
- Create: `src/components/obsidian/obsidian.css`

- [ ] **Step 1: 创建样式文件**

```css
/* ===== Obsidian 兼容模块样式 ===== */
/* 所有选择器使用 .obsidian-* 前缀，不污染现有样式 */
/* 颜色使用 CSS 变量，支持主题适配 */

/* ── Callout ────────────────────────────────────── */

.obsidian-callout {
  border-left: 4px solid var(--callout-color, var(--accent-cyan));
  /* color-mix() 回退：不支持 color-mix 的浏览器使用 rgba 半透明 */
  background-color: rgba(100, 200, 255, 0.08);
  background-color: color-mix(in srgb, var(--callout-color, var(--accent-cyan)) 8%, transparent);
  padding: 0.75em 1em;
  margin: 1em 0;
  border-radius: 0 6px 6px 0;
  font-size: inherit;
  line-height: inherit;
}

.obsidian-callout-title {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.3em;
  font-weight: 600;
  color: var(--callout-color, var(--accent-cyan));
}

.obsidian-callout-title-text {
  flex: 1;
}

.obsidian-callout-icon {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* 默认图标：使用 CSS ::before + Unicode 符号 */
.obsidian-icon-pencil::before { content: "\270E"; }
.obsidian-icon-clipboard-list::before { content: "\2630"; }
.obsidian-icon-info::before { content: "\2139"; }
.obsidian-icon-check-circle-2::before { content: "\2611"; }
.obsidian-icon-flame::before { content: "\2728"; }
.obsidian-icon-check::before { content: "\2713"; }
.obsidian-icon-help-circle::before { content: "\2753"; }
.obsidian-icon-alert-triangle::before { content: "\26A0"; }
.obsidian-icon-x::before { content: "\2717"; }
.obsidian-icon-zap::before { content: "\26A1"; }
.obsidian-icon-bug::before { content: "\1F41B"; }
.obsidian-icon-list::before { content: "\1F4CB"; }
.obsidian-icon-quote::before { content: "\275D"; }

.obsidian-callout-fold {
  font-size: 0.7em;
  opacity: 0.6;
  transition: transform 0.15s ease;
  transform: rotate(90deg); /* 展开态箭头朝下 */
}

.obsidian-callout-fold-collapsed {
  transform: rotate(0deg); /* 折叠态箭头朝右 */
}

.obsidian-callout-body {
  color: var(--text-primary);
  font-style: normal;
}

.obsidian-callout-body p {
  margin: 0.3em 0;
}

/* 嵌套 Callout 缩进 */
.obsidian-callout .obsidian-callout {
  margin: 0.5em 0;
}

/* ── Wikilink ────────────────────────────────────── */

.obsidian-wikilink {
  color: var(--accent-cyan);
  background-color: rgba(0, 200, 255, 0.1);
  background-color: color-mix(in srgb, var(--accent-cyan) 10%, transparent);
  padding: 1px 4px;
  border-radius: 3px;
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.15s ease;
}

.obsidian-wikilink:hover {
  background-color: rgba(0, 200, 255, 0.2);
  background-color: color-mix(in srgb, var(--accent-cyan) 20%, transparent);
  text-decoration: underline;
}

.obsidian-wikilink-invalid {
  color: var(--text-muted);
  background: none;
  cursor: default;
}

/* ── Embed ──────────────────────────────────────── */

.obsidian-embed {
  display: inline;
}

.obsidian-embed-image {
  display: block;
  margin: 0.5em 0;
}

.obsidian-embed-image img {
  max-width: 100%;
  border-radius: 6px;
}

.obsidian-embed-ref {
  display: inline-block;
  color: var(--accent-purple);
  background-color: rgba(160, 100, 255, 0.08);
  background-color: color-mix(in srgb, var(--accent-purple) 8%, transparent);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
  cursor: pointer;
}

.obsidian-embed-ref:hover {
  background-color: rgba(160, 100, 255, 0.15);
  background-color: color-mix(in srgb, var(--accent-purple) 15%, transparent);
}

.obsidian-embed-fallback {
  color: var(--text-muted);
  font-style: italic;
}

.obsidian-embed-invalid {
  color: var(--text-muted);
}

/* ── Highlight ──────────────────────────────────── */

.obsidian-highlight {
  background-color: var(--accent-yellow, #f9e74a);
  color: var(--bg-page, #1a1a2e);
  padding: 1px 4px;
  border-radius: 2px;
  font-weight: 500;
}

/* ── Block ID ───────────────────────────────────── */

.obsidian-block-id {
  display: none; /* 阅读视图中不显示块 ID 标记 */
}

/* ── Frontmatter ───────────────────────────────── */

.obsidian-frontmatter {
  margin: 1em 0;
  padding: 0.75em 1em;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 6px;
  background-color: rgba(128, 128, 128, 0.05);
  background-color: color-mix(in srgb, var(--text-muted, #888) 5%, transparent);
}

.obsidian-frontmatter-content {
  margin: 0;
  font-size: 0.85em;
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-word;
}
```

- [ ] **Step 2: 验证样式文件无语法错误**

Run: `pnpm build 2>&1 | Select-String -Pattern "obsidian.css" -Context 0,2`
Expected: 无错误

---

## Task 9: 集成到 MarkdownBlockView

**Files:**
- Modify: `src/components/reader/MarkdownBlockView.tsx`

这是关键集成步骤，改动点：
1. 移除内联 `ADMONITION_TYPES` 和 `blockquote` 中的 Admonition 检测逻辑
2. 导入 `useObsidianModule` 和 `preprocessObsidianSyntax`
3. 合并 Obsidian components 到现有 components
4. 对 block.raw 进行预处理

- [ ] **Step 1: 修改 MarkdownBlockView.tsx**

改动 1 — 删除旧的 Admonition 相关代码（第 33-72 行 `ADMONITION_TYPES`、第 74-92 行 `getTextContent`/`cloneElementWithText`）

改动 2 — 添加 import：

```typescript
// 新增 import
import { useObsidianModule, preprocessObsidianSyntax, ObsidianFrontmatter } from "@/components/obsidian";
```

改动 3 — 在组件内部添加 hook 调用和预处理：

```typescript
const MarkdownBlockView: React.FC<MarkdownBlockViewProps> = memo(
  ({ block, referenceDefinitions }) => {
    const { startEdit } = useQuickEdit();
    const paragraphSpacing = useSettingsStore(
      (s) => s.readingSettings.paragraphSpacing,
    );

    // ── Obsidian 兼容模块 ──
    const obsidianComponents = useObsidianModule(block.raw, block.raw);
    const processedRaw = useMemo(
      () => preprocessObsidianSyntax(block.raw),
      [block.raw],
    );
```

改动 4 — 替换 blockquote 组件（第 303-418 行），移除内联 Admonition 检测，改为简单 blockquote 渲染（Callout 由 Obsidian 模块处理）：

```typescript
blockquote(
  props: React.HTMLAttributes<HTMLQuoteElement> & {
    children?: React.ReactNode;
  },
) {
  const { children, style, ...rest } = props;
  const incomingStyle = style as React.CSSProperties | undefined;
  return (
    <blockquote
      {...rest}
      data-raw={encodeURIComponent(block.raw)}
      style={{
        borderLeft: "3px solid var(--accent-purple)",
        paddingLeft: "1em",
        marginLeft: 0,
        marginRight: 0,
        marginBottom: "1em",
        color: "var(--text-secondary)",
        fontStyle: "italic",
        ...incomingStyle,
      }}
    >
      {children}
    </blockquote>
  );
},
```

改动 5 — 合并 Obsidian components 到最终 components：

```typescript
const baseComponents = useMemo(
  () => ({
    // ... 现有的 h1, h2, p, ul, ol, li, a, blockquote, ... 等组件
  }),
  [paragraphSpacing, block.raw],
);

const components = useMemo(
  () => ({
    ...baseComponents,
    ...obsidianComponents, // Obsidian 组件覆盖默认组件
  }),
  [baseComponents, obsidianComponents],
);
```

改动 6 — 使用预处理后的内容：

```typescript
<ReactMarkdown
  remarkPlugins={REMARK_PLUGINS}
  rehypePlugins={REHYPE_PLUGINS}
  components={components}
>
  {referenceDefinitions
    ? `${processedRaw}\n\n${referenceDefinitions}`
    : processedRaw}
</ReactMarkdown>
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `pnpm build`
Expected: Exit code 0

- [ ] **Step 3: 验证无回归**

Run: `pnpm tauri dev`
手动测试：
1. 打开一个不含 Obsidian 语法的普通 Markdown 文件，确认渲染正常
2. 打开一个包含 `> [!note]` Callout 的文件，确认 Callout 正确渲染
3. 切换主题，确认 Callout 颜色跟随主题变化

---

## Task 10: 导入样式

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: 在 globals.css 顶部添加导入**

```css
@import "../components/obsidian/obsidian.css";
```

- [ ] **Step 2: 验证样式加载**

Run: `pnpm dev`
在浏览器中检查 `<style>` 标签是否包含 `.obsidian-callout` 规则

---

## Task 11: 主题变量适配

**Files:**
- Modify: `src/styles/themes/light.css`
- Modify: `src/styles/themes/dark.css`
- Modify: 其他 12 个主题文件

为每个主题添加 Obsidian Callout 颜色变量。

- [ ] **Step 1: 在 light.css 中添加变量**

```css
/* Obsidian Callout 主题变量 */
--obsidian-callout-note: #448aff;
--obsidian-callout-abstract: #00b0ff;
--obsidian-callout-info: #00b8d4;
--obsidian-callout-todo: #00b8d4;
--obsidian-callout-tip: #00bfa5;
--obsidian-callout-success: #00c853;
--obsidian-callout-question: #64dd17;
--obsidian-callout-warning: #ff9100;
--obsidian-callout-failure: #ff5252;
--obsidian-callout-danger: #ff1744;
--obsidian-callout-bug: #f50057;
--obsidian-callout-example: #7c4dff;
--obsidian-callout-quote: #9e9e9e;
```

- [ ] **Step 2: 在 dark.css 中添加变量（暗色主题使用更亮的颜色）**

```css
/* Obsidian Callout 主题变量 */
--obsidian-callout-note: #6c9bff;
--obsidian-callout-abstract: #40c8ff;
--obsidian-callout-info: #40d4e8;
--obsidian-callout-todo: #40d4e8;
--obsidian-callout-tip: #40d9b5;
--obsidian-callout-success: #40d863;
--obsidian-callout-question: #80e830;
--obsidian-callout-warning: #ffa840;
--obsidian-callout-failure: #ff6c6c;
--obsidian-callout-danger: #ff4060;
--obsidian-callout-bug: #ff4080;
--obsidian-callout-example: #9c70ff;
--obsidian-callout-quote: #b0b0b0;
```

- [ ] **Step 3: 为其余 12 个主题文件添加变量**

每个主题根据自身色调调整颜色值，保持主题视觉一致性。

- [ ] **Step 4: 验证主题切换**

Run: `pnpm tauri dev`
手动测试：在包含 Callout 的文件中切换所有 14 个主题，确认颜色跟随变化

---

## Task 12: 端到端验证

- [ ] **Step 1: 创建测试用 Markdown 文件**

```markdown
---
title: Obsidian 语法测试
date: 2024-01-15
tags:
  - project
  - active
aliases:
  - Alternative Name
cssclasses:
  - custom-class
---

# Obsidian 语法兼容测试

## Frontmatter 测试

上方已展示 frontmatter，包含 title/date/tags/aliases/cssclasses。

## Callout 测试

> [!note] 笔记标注
> 这是一个 note 类型的标注

> [!tip] 技巧
> 这是一个 tip 类型的标注

> [!warning] 警告
> 这是一个 warning 类型的标注

> [!danger] 危险
> 这是一个 danger 类型的标注

> [!faq]- 可折叠标注（默认收起）
> 收起的内容

> [!question]+ 可折叠标注（默认展开）
> 展开的内容

> [!question] 标注可以嵌套吗？
> > [!todo] 可以。
> > > [!example] 你甚至可以使用多层嵌套。

## Wikilink 测试

这是一个 [[内部链接]] 示例。

这是一个 [[笔记名|显示文本]] 示例。

这是一个 [[笔记名#标题]] 示例。

## Embed 测试

![[其他笔记]]

![[image.png|300]]

## 高亮测试

这是一段 ==高亮文字== 示例。

## 注释测试

可见 %%隐藏%% 文字。

%%
整块隐藏
%%

## 块 ID 测试

这是一个可引用的段落。 ^my-block-id
```

- [ ] **Step 2: 在 Tauri 中打开测试文件，逐项验证**

验证清单：
- [ ] **Frontmatter** `--- ... ---` 正确识别为 frontmatter block，不显示为 thematic break
- [ ] Frontmatter 属性（title/date/tags/aliases/cssclasses）正确解析
- [ ] Callout 13 种类型正确渲染
- [ ] Callout 别名生效（如 `[!hint]` 渲染为 tip 样式）
- [ ] Callout 自定义标题显示
- [ ] Callout 折叠功能正常
- [ ] Callout 嵌套正常
- [ ] Wikilink 显示为带样式的链接文本
- [ ] Embed 显示为引用块
- [ ] 高亮 `==text==` 正确渲染
- [ ] 注释 `%%text%%` 正确隐藏
- [ ] 块 ID `^block-id` 不显示文本
- [ ] 14 个主题切换正常
- [ ] 不含 Obsidian 语法的文件渲染无回归

- [ ] **Step 3: 运行 pnpm build 确认无编译错误**

Run: `pnpm build`
Expected: Exit code 0

- [ ] **Step 4: 运行 pnpm lint 确认无 lint 错误**

Run: `pnpm lint`
Expected: Exit code 0

---

## 自检清单

### Spec 覆盖

| 需求 | 对应 Task |
|------|-----------|
| Callout 13 种类型 + 别名 | Task 2 |
| Callout 自定义标题 | Task 2 |
| Callout 折叠 +/- | Task 2 |
| Callout 嵌套 | Task 2 |
| Wikilink [[note]] | Task 3 |
| Wikilink [[note\|text]] | Task 3 |
| Wikilink [[note#heading]] | Task 3 |
| Wikilink [[note#^blockId]] | Task 3 |
| Embed ![[file]] | Task 4 |
| Embed ![[image\|width]] | Task 4 |
| Highlight ==text== | Task 5 |
| Comment %%text%% | Task 6 |
| Block ID ^id | Task 5 |
| **Frontmatter --- ... ---** | **Task 5 (Step 3-5)** |
| Frontmatter 属性解析 | Task 5 |
| 按需加载 | Task 6 |
| 自动卸载 | Task 6 |
| 不污染现有组件 | Task 9 |
| 主题适配 | Task 11 |

### Placeholder 扫描

无 TBD / TODO / "implement later" / "add appropriate error handling" 等占位符。

### 类型一致性

- `parseCalloutHeader` 返回 `{ type: string; fold: "+" | "-" | null; customTitle: string | null }` — Task 2 定义，Task 6 使用，一致
- `parseWikilink` 返回 `{ target: string; display: string; heading: string | null; blockId: string | null } | null` — Task 3 定义，一致
- `parseEmbed` 返回 `{ target: string; type: ...; heading: string | null; width: string | null; page?: number } | null` — Task 4 定义，一致
- `useObsidianModule` 接受 `(content: string, blockRaw?: string)` 返回 `Components | null` — Task 6 定义，Task 9 使用，一致
- `preprocessObsidianSyntax` 接受和返回 `string` — Task 6 定义，Task 9 使用，一致
