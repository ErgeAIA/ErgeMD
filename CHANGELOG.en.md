# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **macOS support**: ErgeMD now runs on macOS 11+, with a universal `.dmg` installer covering both Apple Silicon and Intel
- **Linux support**: ErgeMD now runs on Ubuntu 22.04+ / Debian 12+, with `.AppImage` and `.deb` packages
- **Platform detection utility**: `src/utils/platform.ts` provides a unified `detectPlatform()` and `getPlatformLabel()` helper
- **Cross-platform update check**: `update.rs` matches assets by `target_os` keyword (Windows NSIS, macOS DMG, Linux AppImage)
- **Cross-platform reveal_in_explorer**: macOS uses `open -R`, Linux uses `xdg-open`, Windows keeps `explorer /select,`
- **Unit test infrastructure**: Vitest (frontend) + cargo test (Rust) two-layer test suite, enforced in CI

### Changed

- **PDF export**: macOS / Linux now use the system print dialog (users manually choose "Save as PDF"); Windows still uses WebView2 PrintToPdf
- **TitleBar**: hides the custom minimize / maximize / close buttons on macOS to avoid conflict with the system traffic lights
- **tauri.conf.json**: `bundle.targets` extended to `["nsis", "app", "dmg", "appimage", "deb"]` to enable all three platform bundles
- **release.yml**: expanded from single-platform Windows to a 4-platform matrix (Windows x64 / macOS arm64 / macOS x64 / Linux x64)
- **rename-bundle.js**: branches by `process.platform` / `BUILD_PLATFORM` env to handle `.app` / `.dmg` / `.AppImage` / `.deb`

### Notes

- The first cross-platform release **does not enable** macOS code signing (free-software strategy); users need to right-click → Open to bypass Gatekeeper

## [0.3.7] - 2026-06-10

### Changed

- Removed MSI artifact from Windows installer builds: `tauri.conf.json` `bundle.targets` changed from `["nsis", "msi"]` to `["nsis"]`; CI now produces only the NSIS installer and portable zip. Reduces build time and release size (MSI has minimal end-user adoption; enterprise deployment is not enabled)
- Default update-check download URL switched to the NSIS installer: renamed Rust `pick_msi_download_url` to `pick_nsis_download_url`; it now prefers `*setup.exe` assets (NSIS installer), then falls back to `*-portable.zip` (portable build), then to the release html_url; `.msi` assets are no longer parsed

## [0.3.6] - 2026-06-10

### Added

- Mermaid ZenUML external plugin integration: added `@mermaid-js/mermaid-zenuml@0.2.3` dependency, enabling native rendering of the ZenUML sequence diagram (section 6.15). `MermaidDiagram` uses `ensureZenumlRegistered()` to idempotently register the plugin before `mermaid.initialize()`, with on-demand lazy loading of `@zenuml/core` triggered only when the `zenuml` keyword is detected
- Mermaid upgraded to 11.15.0: built-in Event Modeling support, the `eventmodeling` keyword (section 6.23) renders directly without external plugins
- MermaidDiagram theme type extensions: completed `ChartColors.zenuml` (text / border / bg) and the corresponding CSS variable passthrough in `getMermaidColors()`; also passes through base `fontColor` / `fontFamily` to keep ZenUML consistent with the global theme
- MermaidDiagram theme adaptation: added ZenUML and Event Modeling theme variable mappings (`mermaid-zenuml.css` / `mermaid-eventmodeling.css`); SVG post-processing injects `!important` rules to override the ZenUML plugin's hardcoded inline colors
- Theme CSS variable additions: `--mermaid-zenuml-lifeline` / `--mermaid-zenuml-message` for ZenUML; 15 `em*` series variables (5 box types: ui / processor / readmodel / command / event, plus relation / swimlane / arrowhead) for Event Modeling

### Changed

- `vite.config.ts` `chunkSizeWarningLimit` raised from 600 to 6500: the ZenUML plugin's `@zenuml/core@^3.47.0` dependency is large, expanding the mermaid chunk from ~1MB to ~6MB; this only silences the build warning — the actual artifact size is unchanged
- `UNSUPPORTED_DIAGRAM_TYPES` cleared: removed `zenuml` and `eventmodeling` entries; both diagram types are now supported
- `MarkdownSyntaxExample.md`: sections 6.15 (ZenUML) and 6.23 (Event Modeling) notes updated from "not supported" to "supported"

### Fixed

- ZenUML message lines invisible after theme adaptation: the original `.fragment-border` CSS is `fill: none` (transparent), but the theme adaptation erroneously changed it to an opaque background color, which occluded the message lines. Restored `fill: none` while keeping the `stroke` theme adaptation

## [0.3.5] - 2026-06-06

### Added

- Latest version badge next to the version number in the About page: AboutPage now automatically invokes `forceCheckUpdate` on mount. When a new version is detected, a green `↑ v{latestVersion}` badge appears to the right of the `↻` button; clicking it opens the MSI installer download URL for the latest release
- Added `action` field to `ToastMessage`: Toasts can now carry a clickable button (e.g., "Download") that calls `openUrl` to open an external link
- Update check result now includes `download_url`: Rust `fetch_github_latest` / `fetch_gitee_latest` prefer the `.msi` asset's `browser_download_url` from the release's `assets` array, falling back to the release page's `html_url` if not found

### Fixed

- No visible feedback after clicking `↻` in the About page: explicitly setting the `latestAvailable` state on update detection makes the right-side badge appear immediately; the toast message can also carry a "Download" action button

## [0.3.4] - 2026-06-06

### Fixed

- Remote images failed to render: Added `fetch_remote_image_as_data_url` backend command that proxies remote image downloads through the Rust reqwest client, converting them to base64 data URLs to bypass Tauri WebView's CORS, hotlink protection, and network restrictions; the `ContextMenuImage` component now routes `http`-prefixed image srcs through the backend proxy, with fallback to direct WebView loading on backend failure

## [0.3.3] - 2026-06-04

### Added

- Manual update check button next to version number in About page: clicking the `↻` button immediately triggers the `check_update` backend command, bypassing the 24-hour cache limit. This resolves the issue where clients miss new version prompts because the cache window prevents re-checking
- New `forceCheckUpdate` utility function: exported from the `UpdateChecker` module, can be reused by any component to trigger a one-time forced update check

### Fixed

- Toast notifications not visible: removed `opacity: 0` / `transform: translateX(20px)` from the `ToastItem` inline style that was overriding the animation's terminal state, allowing the `toast-enter` keyframe's `forwards` mode to function correctly
- Toast occluded by About page overlay: Toast container z-index raised from `z-50` to `z-[400]` to ensure it covers the `AboutPage` background overlay (z-100) and QR code modal (z-300)

## [0.3.2] - 2026-06-04

### Fixed

- Welcome page recent files single-item close failure: Added `delete_recent_file` backend command, single-item close now synchronously deletes the database record, no longer reappears after refresh

## [0.3.1] - 2026-06-01

### Added

- F12 easter egg restored: Re-enabled F12 keyboard shortcut to open the easter egg page

### Fixed

- Obsidian Callout icon not displaying: Fixed Admonition callout icon rendering failure caused by escaped syntax `\[!NOTE]` in the example document
- Obsidian Callout escape compatibility: Added support for escaped `\[!TYPE]` syntax in detection regex
- Reader code block font not scaling: Removed `text-[13px]` hardcoded font size on `<pre>` element, changed to `0.9em` relative unit so code block font scales with reading settings

### Changed

- PDF export menu optimization: Marked grayscale mode as "recommended" and moved it after the styled mode

### Added (Chinese description for reference)

- PDF 导出独立管线：从复用阅读组件改为从 Markdown 原文直接生成完整 HTML，不再依赖虚拟滚动/IntersectionObserver/懒加载等阅读场景逻辑
- PlantUML 导出渲染：新增 `renderPlantUmlForExport` 函数，复用组件内串行队列渲染 SVG

### Fixed (Chinese description for reference)

- PDF 导出图表不渲染：彻底解决 Mermaid 和 PlantUML 图表在 PDF 导出中不显示的问题
- PDF 多文档导出错误：从 `useFileStore.getState().currentContent` 获取当前文档内容
- PDF 导出性能优化：渲染 HTML 与弹出保存位置对话框并行进行
- 内联 Markdown 解析：图片正则先于链接正则执行
- 内联 Markdown 转义：`renderInlineMarkdown` 先匹配正则再 HTML 转义

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
