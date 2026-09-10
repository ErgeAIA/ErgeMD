# Obsidian 语法兼容模块 Spec

## Why

ErgeMD 当前仅支持 9 种 Admonition 类型，不支持 Obsidian 的 13 种 Callout 类型、别名、折叠、嵌套、自定义标题，也不支持 Wikilink、Embed、高亮、注释、块 ID、Frontmatter 等 Obsidian 特有语法。需要添加 Obsidian Flavored Markdown 兼容层，按需加载，不污染现有渲染组件。

## What Changes

- 新建 `src/components/obsidian/` 模块目录，包含语法检测器、Callout/Wikilink/Embed/Highlight/BlockId/Frontmatter 组件、useObsidianModule hook、预处理函数、独立样式
- 修改 `src/types/markdownBlock.ts`：添加 `frontmatter` block 类型
- 修改 `src/utils/markdownBlocks.ts`：添加 frontmatter block 识别和解析逻辑
- 修改 `src/components/reader/MarkdownBlockView.tsx`：移除内联 Admonition 逻辑，改用 Obsidian 模块合并组件，添加 Frontmatter 渲染
- 修改 `src/styles/globals.css`：导入 obsidian.css
- 修改 `src/styles/themes/*.css`（14 个文件）：添加 Obsidian Callout 颜色 CSS 变量

## Impact

- Affected specs: 渲染链路（MarkdownBlockView → ReactMarkdown components 覆盖机制）
- Affected code:
  - `src/components/reader/MarkdownBlockView.tsx` — 移除 ADMONITION_TYPES 及 blockquote 内联检测，改用 useObsidianModule hook
  - `src/types/markdownBlock.ts` — 新增 frontmatter 类型
  - `src/utils/markdownBlocks.ts` — 新增 frontmatter block 解析
  - `src/styles/globals.css` — 新增 obsidian.css 导入
  - `src/styles/themes/*.css` — 新增 CSS 变量

## ADDED Requirements

### Requirement: Obsidian 语法检测器

系统 SHALL 提供 `detectObsidianSyntax()` 和 `hasObsidianSyntax()` 函数，扫描 Markdown 内容判断是否包含 Obsidian 特有语法（callout、wikilink、embed、highlight、comment、blockid、frontmatter），返回检测到的语法名称集合或布尔值。

#### Scenario: 内容包含 Obsidian 语法

- **WHEN** Markdown 内容包含 `> [!note]`、`[[link]]`、`![[file]]`、`==text==`、`%%text%%`、`^block-id`、`---\n...\n---` 中的任意一种
- **THEN** `hasObsidianSyntax()` 返回 `true`，`detectObsidianSyntax()` 返回包含对应语法名称的 Set

#### Scenario: 内容不包含 Obsidian 语法

- **WHEN** Markdown 内容不包含任何 Obsidian 特有语法
- **THEN** `hasObsidianSyntax()` 返回 `false`，`detectObsidianSyntax()` 返回空 Set

### Requirement: Obsidian Callout 组件

系统 SHALL 提供 `ObsidianCallout` 组件，支持 13 种内置类型（note、abstract、info、todo、tip、success、question、warning、failure、danger、bug、example、quote）及其别名（summary/tldr→abstract、hint/important→tip、check/done→success、help/faq→question、caution/attention→warning、fail/missing→failure、error→danger、cite→quote），支持自定义标题、折叠（`+` 展开 / `-` 收起）、嵌套。

#### Scenario: 渲染基本 Callout

- **WHEN** blockquote 首行包含 `[!note]` 标记
- **THEN** 渲染为带左侧边框和背景色的 Callout 组件，显示默认标题 "Note"

#### Scenario: 渲染带自定义标题的 Callout

- **WHEN** blockquote 首行包含 `[!tip] 技巧提示`
- **THEN** 渲染为 Callout 组件，标题显示 "技巧提示"

#### Scenario: 渲染可折叠 Callout

- **WHEN** blockquote 首行包含 `[!faq]-` 标记
- **THEN** 渲染为默认收起的 Callout，点击标题可展开/收起

#### Scenario: 渲染别名类型

- **WHEN** blockquote 首行包含 `[!hint]` 标记
- **THEN** 渲染为 tip 样式的 Callout

### Requirement: Obsidian Wikilink 组件

系统 SHALL 提供 `ObsidianWikilink` 组件和 `parseWikilink()` 解析函数，支持 `[[note]]`、`[[note|text]]`、`[[note#heading]]`、`[[note#^blockId]]`、`[[#heading]]` 格式。

#### Scenario: 渲染基本 Wikilink

- **WHEN** 内容包含 `[[内部链接]]`
- **THEN** 渲染为带样式的链接文本，显示 "内部链接"

#### Scenario: 渲染带显示文本的 Wikilink

- **WHEN** 内容包含 `[[笔记名|显示文本]]`
- **THEN** 渲染为带样式的链接文本，显示 "显示文本"

### Requirement: Obsidian Embed 组件

系统 SHALL 提供 `ObsidianEmbed` 组件和 `parseEmbed()` 解析函数，支持 `![[file]]`、`![[image.png|300]]`、`![[note#heading]]` 格式，按文件扩展名判断类型（image/pdf/audio/video/note）。

#### Scenario: 渲染图片 Embed

- **WHEN** 内容包含 `![[image.png]]`
- **THEN** 渲染为 `<img>` 标签，加载失败时显示为文本引用

#### Scenario: 渲染笔记 Embed

- **WHEN** 内容包含 `![[其他笔记]]`
- **THEN** 渲染为带样式的引用块

### Requirement: Obsidian 高亮组件

系统 SHALL 提供 `ObsidianHighlight` 组件，将 `==text==` 渲染为 `<mark>` 标签。

#### Scenario: 渲染高亮文本

- **WHEN** 内容包含 `==高亮文字==`
- **THEN** 渲染为带黄色背景的 `<mark>` 元素

### Requirement: Obsidian 块 ID 组件

系统 SHALL 提供 `ObsidianBlockId` 组件，将 `^block-id` 渲染为不可见的锚点标记。

#### Scenario: 渲染块 ID

- **WHEN** 内容包含 ` ^my-block-id`
- **THEN** 渲染为不可见的 `<span>` 锚点元素，不显示文本

### Requirement: Obsidian Frontmatter 组件

系统 SHALL 提供 `ObsidianFrontmatter` 组件和 `parseFrontmatter()` 解析函数，将 YAML frontmatter 渲染为格式化的元数据块。

#### Scenario: 渲染 Frontmatter

- **WHEN** 文件开头包含 `---\ntitle: Test\ndate: 2024-01-15\n---`
- **THEN** frontmatter 被识别为独立 block，渲染为带边框的元数据区域

### Requirement: 按需加载机制

系统 SHALL 通过 `useObsidianModule` hook 实现按需加载：仅当检测到 Obsidian 语法时返回 ReactMarkdown components 覆盖对象，未检测到时返回 null（零开销）。`preprocessObsidianSyntax()` 函数将内联语法（Wikilink/Embed/Highlight/Comment/BlockId）转换为 HTML 标签供 rehype-raw 解析，且必须保护代码块内容不被误替换。

#### Scenario: 无 Obsidian 语法的文件

- **WHEN** 打开不含 Obsidian 语法的普通 Markdown 文件
- **THEN** `useObsidianModule` 返回 null，渲染链路无变化，零开销

#### Scenario: 含 Obsidian 语法的文件

- **WHEN** 打开含 Obsidian 语法的文件
- **THEN** `useObsidianModule` 返回 components 覆盖对象，Callout/Wikilink 等正确渲染

### Requirement: 主题适配

系统 SHALL 为所有 14 个主题添加 Obsidian Callout 颜色 CSS 变量（`--obsidian-callout-*`），确保 Callout 颜色跟随主题切换。

#### Scenario: 切换主题

- **WHEN** 在包含 Callout 的文件中切换主题
- **THEN** Callout 颜色跟随主题变化

### Requirement: 代码块保护

`preprocessObsidianSyntax()` 函数 SHALL 在替换 Obsidian 内联语法前提取并保护 fenced code blocks（```...``` 和 ~~~...~~~）和 inline code（`...`），替换后再还原，避免代码块内的 Obsidian 语法被误替换。

#### Scenario: 代码块内包含 Obsidian 语法

- **WHEN** 内容包含代码块且代码块内有 `[[link]]` 或 `==text==`
- **THEN** 代码块内的内容不被替换，保持原样

## MODIFIED Requirements

### Requirement: MarkdownBlockType 类型

`MarkdownBlockType` 新增 `"frontmatter"` 值，用于标识 YAML frontmatter block。

### Requirement: MarkdownBlockView blockquote 渲染

移除 `MarkdownBlockView.tsx` 中的内联 `ADMONITION_TYPES` 定义（9 种类型）和 `blockquote` 组件内的 Admonition 检测逻辑，改由 `useObsidianModule` hook 提供的 blockquote 覆盖组件处理 Callout 渲染。`getTextContent` 和 `cloneElementWithText` 辅助函数从 `MarkdownBlockView.tsx` 中移除，由 `useObsidianModule.ts` 内部提供。

### Requirement: markdownBlocks 解析器

`parseMarkdownBlocks()` 函数新增 frontmatter block 识别逻辑：当文件首行为 `---` 时，查找结束标记 `---`，将中间内容识别为 `frontmatter` 类型 block。

## REMOVED Requirements

### Requirement: 内联 Admonition 系统

**Reason**: 由 Obsidian Callout 模块完全替代，支持更多类型、别名、折叠、嵌套、自定义标题。
**Migration**: `ADMONITION_TYPES` 和 blockquote 内的 Admonition 检测逻辑移除，由 `useObsidianModule` hook 的 blockquote 覆盖组件替代。现有 `--admonition-*` CSS 变量由 `--obsidian-callout-*` 替代。

---

## 审查发现的问题

以下问题在实施时需注意：

1. **`MarkdownBlockType` 定义位置**：计划文档 Task 5 Step 4 提到修改 `markdownBlocks.ts` 添加类型，但实际类型定义在 `src/types/markdownBlock.ts`，需修改正确文件。

2. **frontmatter 解析代码需适配实际解析器结构**：计划中给出的 frontmatter 解析伪代码使用 `startLine === 1` 和 `lines` 数组，需适配 `markdownBlocks.ts` 中实际的变量名和行号计算方式。`markdownBlocks.ts` 中有两套解析逻辑（快速路径和慢速路径），两处都需添加 frontmatter 识别。

3. **`useObsidianModule` 参数冗余**：hook 签名 `useObsidianModule(content: string, blockRaw?: string)` 中 `content` 和 `blockRaw` 在 Task 9 集成时都传入 `block.raw`，存在冗余。`content` 应该是 block 的 Markdown 内容（用于语法检测），`blockRaw` 用于 data-raw 属性。需确认两者是否总是相同。

4. **`preprocessObsidianSyntax` 在每个 block 上独立运行**：由于虚拟滚动架构下每个 block 独立渲染，`preprocessObsidianSyntax` 在每个 block 的 `block.raw` 上运行。但 frontmatter 是文件级别的（只在第一个 block），其他内联语法（Wikilink/Highlight 等）可能跨 block 边界。当前设计下，frontmatter 预处理实际上由 block 解析器处理（作为独立 block），`preprocessObsidianSyntax` 只需处理内联语法，这是合理的。

5. **零宽断言兼容性**：`preprocessObsidianSyntax` 中使用了 `(?<=\n)` 和 `(?<!!)` 等零宽断言，需确认目标浏览器（Tauri 内嵌 WebView，基于 Chromium）支持这些特性。Chromium 62+ 支持 lookbehind，Tauri 2 的 WebView 版本远高于此，无兼容性问题。
