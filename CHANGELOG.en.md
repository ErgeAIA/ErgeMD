# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-05-31

### Added

- PlantUML chart support: Added `@plantuml/core` rendering library, supporting 16+ diagram types (Sequence, Class, Activity, Component, State, Object, Use Case, Deployment, Timing, Network, ER, Mindmap, WBS Work Breakdown Structure, JSON/YAML visualization)
- PlantUML context menu: Support SVG preview and edit chart functionality
- PlantUML serial rendering queue: Solved concurrent rendering conflicts caused by `@plantuml/core` global variables
- Word export feature: Support exporting Markdown documents to `.docx` format
- PDF export optimization: Refactored export logic, using HTML intermediate + WebView2 PrintToPdf API instead of `window.print()`, supporting styled/grayscale dual modes, pagination and color preservation
- Auto update checker: Added `UpdateChecker` component for checking application updates

### Fixed

- PlantUML dark theme adaptation: Injected theme styles into SVG internals via `injectThemeStyles()` function, solving the problem that external CSS cannot override inline styles
- PlantUML timing/network/gantt/wireframe rendering failure: Confirmed supported diagram types by `@plantuml/core`, replaced unsupported diagrams with alternatives (WBS diagram, use case diagram)
- PlantUML concurrent rendering issue: Implemented serial rendering queue to ensure only one rendering task is processed at a time
- PlantUML `viz-global.js` loading failure: Loaded UMD module by dynamically creating `<script>` tags
- Word export failure: Fixed compatibility issues in `exportDocx.ts`
- Missing i18n translation keys: Added `common.preview`, `common.edit`, `common.cancel`, `common.save`, `quickEdit.unsavedWarning`, `quickEdit.unsaved`, `quickEdit.synced`, `reader.preview` translations

### Changed

- Markdown parsing logic: `parseMarkdownBlocks()` added PlantUML code block recognition (`plantuml`/`puml`)
- Export module refactored: `export.ts` refactored for unified processing flow
- i18n internationalization: Updated Chinese and English language files

### Optimized

- Status bar optimization: Display current editing status
- Reading experience optimization: Enhanced MarkdownBlockView component

## [0.2.2] - 2026-05-29

### Optimized

## [0.2.1] - 2026-05-29

### Fixed

- YAML Frontmatter parsing: Removed dependency on `gray-matter` library which is unavailable in browser environment (relies on Node.js Buffer), replaced with manual parsing solution
- YAML Frontmatter rendering: Fixed issue displaying raw content when parsing fails
- Table of contents generation: Added frontmatter area skip logic to prevent frontmatter fields from being incorrectly recognized as headings

## [0.2.0] - 2026-05-29

### Added

- Obsidian Callout: Support 13 built-in types (note/abstract/info/todo/tip/success/question/warning/failure/danger/bug/example/quote) with alias mapping, custom titles, collapsible (+/-), nested rendering
- Obsidian Wikilink: Support `[[note]]`, `[[note|text]]`, `[[note#heading]]`, `[[note#^blockId]]`, `[[#heading]]` format parsing and rendering
- Obsidian Embed: Support `![[file]]` embedded references, auto-detect image/PDF/audio/video/note types by extension, display fallback on image load failure
- Obsidian highlight syntax: `==text==` rendered as `<mark>` tags
- Obsidian comment syntax: `%%text%%` automatically hidden during rendering
- Obsidian block ID: `^block-id` rendered as invisible anchor
- Obsidian Frontmatter: YAML frontmatter (`---` wrapped) recognized as separate block and formatted rendering
- Obsidian on-demand loading: `useObsidianModule` hook activates component overrides only when Obsidian syntax is detected, zero overhead for plain Markdown files
- Code block protection: Preprocessing function automatically protects fenced code and inline code content from being mistakenly replaced
- 14 theme adaptations: Each theme added 13 `--obsidian-callout-*` CSS variables, Callout colors follow theme switching

### Changed

- Removed old Admonition system (9 types, inline detection logic), completely replaced by Obsidian Callout module
- `MarkdownBlockType` added `frontmatter` type
- Both parsing logic sets in `parseMarkdownBlocks()` support frontmatter block recognition

## [0.1.1] - 2026-05-22

### Fixed

- File association open failure: `tauri://file-open` event not triggered during Windows cold start, added command-line argument parsing as fallback
- Welcome page recent files not displayed: Race condition between `init_database` and `get_recent_files`, added `dbReady` state synchronization

### Changed

- README.md added "Build from Source" and "Download" sections, improved open-source documentation

## [0.1.0] - 2026-05-16

### Added

- Markdown rendering: GFM, math formulas (KaTeX), code highlighting, Mermaid charts, task lists
- Reading experience: Virtual scrolling, progress tracking, 14 themes
- Workspace management: Multiple tabs, file tree
- Export feature: HTML, DOCX, PDF
- Floating table of contents (TOC): Auto-generated chapter navigation
- Focus mode: Immersive reading
- Context menu: Copy, edit, export, image/link/code block specific operations
- Quick edit: Double-click paragraph to edit
- File association: Support `.md` and `.markdown` files
- Global shortcuts: Window management, tab navigation, reading control
