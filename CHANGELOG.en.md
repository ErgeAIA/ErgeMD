# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Mindmap "logic (horizontal)" layout**: MindmapLayout gains a `logic` option (root on the left, all branches flowing right). mermaid 12.2.0 hardcodes the mindmap direction to `TB` with no config hook, so this registers a custom wrapper layout that delegates to the dagre renderer after flipping `data4Layout.direction` to `LR`; both the reading and export render paths switch accordingly, and the deep-linked internal chunk is covered by a `declare module` declaration with a graceful fallback on load failure
- **Mindmap style system**: Reading options gain a "mindmap style" preference (brand / depth / outline / classic), covering per-branch accent fill, layer-to-canvas gradient, and contrast-aware ink — orthogonal to the existing layout preference
- **Pinned floating TOC**: New global preference `readingSettings.pinToc` with three entry points — a hover pin badge (fixed to the panel's top-right corner, not scrolling with the list), a "Pin TOC" toggle in reading options, and the `Ctrl/Cmd+Shift+L` shortcut; once pinned the TOC stays expanded after the mouse leaves

### Fixed

- **Fixed missing text in Mermaid diagram preview**: When clicking a diagram to open the full-screen preview, node frames rendered but their labels were entirely missing — saved SVG files had the same problem. The preview path sanitized mermaid's output a second time, and DOMPurify strips the contents of the htmlLabels text container (foreignObject); the preview now shares the document view's trust model (mermaid's strict output is already sanitized) and no longer re-sanitizes
- **Precise TOC jumps in very large documents**: Clicking a table-of-contents entry in documents of 10k+ lines used to land off-target, requiring a second manual scroll. Root cause: the virtual list positions blocks by estimated heights (unmeasured error accumulates to thousands of pixels), and the old correction silently gave up when the target block was not yet rendered. Replaced with a convergence loop: if the target is not rendered, the scroll is re-issued until it enters the render window; once rendered, the position is corrected from measured geometry until it lands within pixel tolerance. Verified against an 8,000+ line document across all heading levels
- **Chunked parse cache could cross documents**: The cache key lacked a document identity, so two different documents with the same line range and identical first/last line lengths hit the same entry and received each other's parsed blocks; the cache also had no size cap and grew with every document opened. The key now includes a document fingerprint (line count + total characters) with bounded eviction
- **Pipes in plain text misdetected as tables**: Paragraphs containing `|` (e.g. `a | b`, shell pipelines) were merged into table blocks, bloating the parse of long documents; table row detection is now tightened (line starts/ends with `|`, or still has at least two pipes after stripping inline code)
- **Search / select-all acted on the wrong tab**: All tabs' reading areas stay mounted in the DOM, so global queries could match an inactive tab; search, highlight clearing, and select-all now target only the visible document
- **TOC highlight could drift one section in virtual scrolling**: The active section is now derived from the middle of the viewport instead of its top edge
- **Word count in saved reading progress was always 0**: The value was hardcoded on persist and the database column never updated; real word counts are now saved, and persist failures are no longer silently swallowed (visible in the console)
- **Exported headings rendered black**: the export stylesheet serializer dropped the exclamation mark when appending `!important`, making the declaration invalid so headings fell back to default black; fixed
- **Charts scaled up or cropped in PDF (BUG-078)**: the print layout doesn't evaluate an SVG's inline `max-width`, so `width="100%"` filled the content box and blew small diagrams up several times past the page edge; PDF export now pins each root SVG to explicit pixel dimensions
- **Color blocks missing from most charts in PDF (BUG-080)**: `* { height: auto !important }` under `@media print` overrides an SVG `<rect>`'s `height` presentation attribute and resolves to 0, so rectangles were never painted; the SVG subtree is now excluded. Same round: Sankey flow gradients were baked into a flat color, which removed the colored bands
- **Chart styles leaking across diagrams (BUG-079)**: manually injected CSS used bare selectors while a `<style>` element applies document-wide, so flowchart / architecture rules overrode mind map colors; all injections are now scoped to `#<svgId>`, and the leftover outline on solid-fill mind map nodes is gone
- **Chart hover highlight stopped working (BUG-081)**: the scoping parser swallowed a CSS comment and an `@media` prelude into the selector, invalidating the whole rule; replaced with a scanner-based parser plus regression tests
- **Floating TOC panel background detached from the theme canvas (BUG-074)**: The panel background was hardcoded pure white / slate regardless of theme; it now composites the theme canvas color with alpha (the theme generator emits a new `bg-page-rgb` triplet per theme)
- **Floating TOC highlight used the brand color in only some themes (BUG-075)**: The indicator line / glow / active text now all use the theme brand color; and fixed the secondary root cause where `--alpha-toc-*` coefficient variables were only defined under `html:not([data-theme])`, so `rgba(var(--brand-primary-rgb), var(--alpha-toc-text-active))` silently failed and fell back to the inherited color under any active theme
- **Mindmap font size now scales by level + hover animations extended to more chart types**: Mindmap labels used to share one size across the whole map; they now grow toward the center (18px at the root, then 16 / 15 / 14 / 13px outward), matching how mind maps are normally read. Because shapes are measured at the original font size, only the center level is enlarged and its long text is allowed to wrap, so nothing breaks out of the node background. Chart hover highlighting grew from 14 to 33 selectors, adding focus-dimming for user journeys, XY charts, packet diagrams, radar charts, event modeling, treemaps, Ishikawa diagrams and the Cynefin framework, plus easier-to-hit entry points for sequence actors and Git commit labels. The mechanism is still pure CSS + `:has()` touching only opacity — no event listeners, no layout reflow
- **Fixed pie and Wardley-map hover not working + pie black outline**: Pie hover was completely dead because mermaid's `#id .pieCircle{opacity:0.7}` scope (id specificity) overrode our unscoped focus rule; the dimming rule now uses `!important` to win, and a `:hover{opacity:1!important}` brings the hovered slice back to 1 from 0.7. The Wardley map was never wired for hover at all (the wrong `g.wardley-component` selector hit nothing; the real node class is `g.wardley-node`) and is now included. XY-chart hover switched from whole-group to individual bar / line, so even a single-series example focuses clearly. The pie's black outline (mermaid's default `pieStrokeColor:black`, with the outer ring using a separate `pieOuterStroke*` variable that was never injected) is now removed by zeroing the stroke width; Wardley strokes were already colored by post-processing (not black). Render cache version bumped v48→v49 to force stale charts to re-render
- **Removed black outlines across more chart types, with a full chart-type sweep**: Audited every Mermaid chart type for black/near-black outlines and fixed them uniformly — Gantt grid lines (the renderer writes an inline `stroke="currentColor"` that resolves to black and can't be overridden by theme variables, so it's now forced to the theme line color in post-processing), user-journey actor circles, architecture service-node borders, C4 relationship lines, Git merge arrows, and the treemap (its post-processing selector didn't match Mermaid's real class casing, so it had never taken effect and is now corrected). All of these previously fell back to Mermaid's default near-black strokes. Verified chart-by-chart in a real browser that the sample document now has no black outlines; render cache version bumped v49→v50 to force stale charts to re-render
- **Fixed stray arcs in Git graphs, washed-out Gantt charts, and non-themed Sankey colors**: The extra arcs at Git connection points were a regression (post-processing on merge arrows wrongly overrode the branch color with neutral gray and filled the arc path) and have been reverted — merge arrows are already branch-colored. The Gantt task-bar background was nearly identical to the section background in most themes, so bars blended into sections and looked washed out; it now uses a fill that contrasts with sections. Sankey node and flow colors used a fixed palette that ignored the theme, looking faint on dark backgrounds; the fixed palette is now mapped to theme brand colors so nodes and flows adapt to the theme. Also hardened theme-switch cache invalidation so charts update immediately when the theme changes instead of needing a manual refresh
- **Gantt task bars now use the brand color, and Sankey flows no longer vanish on dark themes**: Gantt task bars previously used a background too close to the section background and looked washed out in every theme; they now use the brand primary color for maximum recognizability, with the on-bar text auto-picked for contrast against the fill. Sankey flows were nearly invisible on dark themes because they used "multiply" blend mode, which darkens flows further against a dark background; dark themes now use normal blending with higher opacity so flows are clearly visible (light-theme appearance unchanged)
- **Fixed Gantt charts rendering as large black bars in every theme**: An unsupported comment syntax was mistakenly used when injecting chart styles, which broke style parsing and disabled the chart's own color rules, causing section backgrounds to fall back to the default black (hence theme-independent and black in every theme). The correct comment syntax is now used, restoring Gantt colors and grid lines
- **Fixed some charts not refreshing after switching themes until a manual reload**: The theme fingerprint inside the chart cache key was computed during render, before the page's theme attribute had been applied, so after a theme switch the chart could hit the previous theme's cache and skip re-rendering (typically seen as a mindmap root node showing only an outline or a near-white fill). Rendering now first verifies the page theme has been applied (retrying one frame later if not) and re-validates the cache with the latest theme fingerprint, so all charts update immediately on theme switch
- **Fixed remaining cases where individual charts still occasionally failed to refresh**: The previous theme-sync approach waited and retried, but once retries were exhausted it still rendered with the stale theme, causing occasional failures. The current theme is now written directly, guaranteeing charts always read up-to-date theme colors when rendering. Also hardened Sankey gradient identifiers against collisions and fixed an edge case where a fallback color could break gradients
- **Added a visibility safeguard for Sankey links**: Sankey flows are colored via gradients, and if a gradient failed the links would not render at all, making them vanish; even when gradient replacement doesn't fully take effect, an explicit theme stroke is now forced on the links so they always stay visible
- **Fixed unreadable Kanban card text on dark themes**: Ordinary Kanban cards had a hardcoded near-white background from the renderer, while the card text followed the theme text color (light on dark themes), producing white-on-white text that was completely illegible. Cards are now forced to use the theme card background with the matching contrast color, so they read correctly in every theme (column headers were always fine and are unaffected)
- **Pin badge scrolled away with the TOC (BUG-076)**: The pin was wrongly placed inside the scrolling list container; it now lives as an overlay on the relative panel, always staying in view
- **Mindmap colors returned to the token contract + dimmed text contrast fixed (BUG-077)**: Mindmap node backgrounds were painted with the *stroke* palette (`--chart-stroke-*`, i.e. pure #00FFFF / #FF00FF / #FFFF00 on Neon Cyberpunk) as large solid areas, which was glaring on high-saturation themes and left the text unreadable. Colors now come from tokens again: node backgrounds use `--chart-fill-*` and their text the index-matched `--chart-text-on-fill-*` (the generator pairs each fill with its best ink and guarantees ≥4.5:1); the root node moves to the center slot; branch lines keep `--chart-stroke-*` so each theme keeps its character. The per-node depth blending (which had never actually taken effect) is retired. `text-muted` (the weakest text tier) is now auto-tuned to ≥4.5:1 by the generator, lifting 13 themes from 2.93–4.15 up to 4.52+. Root cause of the earlier "no effect" rounds also fixed: changing render output without bumping the cache version key kept serving stale diagrams. **Default coloring is now by depth** (it was by branch): nodes of the same level share one color and hues progress per level, matching how mind maps are normally read; the "Brand Branch" style keeps per-branch coloring as an option. Both styles share the same token palette — only the mapping basis differs. 晨光/夜灯 (Light/Dark) additionally get a dedicated **brand + status** palette for the mind map (root/L2 = brand orange, then status colors per level, hues progressing warm→cold). The two themes now diverge by canvas lightness — **the light canvas takes the brighter `-fill` status values with black text, the dark canvas takes the deeper values with white text** — instead of sharing identical backgrounds everywhere except the root and only swapping text color; backgrounds are auto-tuned by the generator for contrast (hue fixed, lightness yields), e.g. `#2E8A5F` pushed to `#359065` in place of the previous low-chroma fill band with no character; text colors are paired to each background by the generator (black on the orange levels, white on the deeper ones), and a contrast gate now covers the mind map palette. Also fixed two stacked issues that stopped themes from overriding the core mind map defaults: the core selector had the same specificity as the theme's while being imported later (core now uses `:where([data-theme])` so its defaults sit at specificity 0), and a `*/` inside a core comment closed the comment early, silently swallowing the `--mermaid-mindmap-branch-0` declaration. The mind map background/text tokens are now part of the render cache signature

### Changed

- **Mermaid engine upgraded to 12.2.0**: The chart engine is upgraded from 11.16.1 to 12.2.0 (ZenUML plugin to 1.0.1), bringing mindmap sizing/centering fixes, scoped swimlane DOM ids, sequence diagram parsing fixes, and readable error messages; the dagre layout and classic look are pinned to preserve the existing rendering. **Note: the new engine requires Safari 17.4+ — chart rendering works on macOS 12 Monterey (2021) and newer; charts will not render on macOS 11 Big Sur (2020) and earlier** (Windows / Linux unaffected)
- **Faster opening of very large documents**: TOC extraction no longer performs a redundant full-document scan — for large documents the TOC is produced by the chunked parser as a single source shared by rendering and jumping, saving one full pass on open
- **Steadier memory with many open tabs**: Reading areas are now resident on demand — only the active, pinned, and 3 most recently used tabs stay rendered; the rest are unmounted and restore their scroll position when revisited
- **File tree collapsed by default**: Opening a workspace expands only the root level, with subfolders expanded on demand, so huge workspaces no longer render every node at once
- **Code font unified to the system monospace stack**: Code blocks previously specified JetBrains Mono (not installed on most systems, so it silently fell back anyway); the font is now a centrally defined system monospace variable — consistent across platforms with zero bundle cost. Users who have JetBrains Mono installed can still select it in font settings
- **Reading options theme section tidied**: Removed the light/dark grouping (all themes are built-in) and moved the default brand-color pair (晨光 / 夜灯, formerly 亮色 / 暗色) to the top; theme names follow the "concrete imagery evoking color mood" naming logic
- **Larger initial window size**: Raised from 1200×800 to 1480×920, with the minimum size raised from 800×600 to 900×640
- **Title bar drag accepts the middle button**: Title bar dragging now also responds to the middle button (Tauri native `startDragging`, DPI-correct across displays)
- **Export unified onto the DOM-copy pipeline (DEC-039)**: removed the second `generateExportHtml.ts` render path — HTML, section and PDF exports now all derive from the same reading-view output, so PDF matches what's on screen; print paging rules added so charts, table rows and math blocks no longer break across pages

### Security

- **Disabled the unused asset protocol**: Since local images switched to base64 inlining, the asset protocol had no consumers while still exposing the full path scope; it is now disabled on both the config and Rust feature sides to shrink the attack surface

### Removed

- Removed the never-read, never-written workspaces table

## [0.4.4] - 2026-09-10

### Added

- **In-app auto-update**: Integrated the official Tauri updater — when an update is available, download it directly inside the app (with a progress bar) and silently install & restart, no more jumping to the browser to download the installer manually; update manifests are distributed via dual sources (GitHub / Gitee static mirrors, immune to API rate limiting), with domestic users served through the Gitee path; all update packages are verified with minisign signatures

### Fixed

- **GitHub update source now avoids anonymous API rate limiting**: When the GitHub CLI (gh) is installed and logged in, update checks automatically reuse its credentials (5,000 req/h on a dedicated quota instead of the shared 60/h anonymous pool); silently falls back to anonymous requests when gh is absent

## [0.4.3] - 2026-09-10

### Added

- **Update card**: The update notification now shows a summary of what changed in the new version (entries grouped by Security/Added/Fixed, plus the release date), with actions to download now (direct platform installer link), view the full changelog, and "Skip this version" (no more reminders for that version); manually checking for updates from the About page opens the card expanded

### Security

- **Fixed an XSS chain in the Markdown renderer**: Raw HTML in documents is now sanitized against a whitelist (preserving attributes required by wikilinks, callouts, task lists, and inline styles); Mermaid / PlantUML / SVG preview output is sanitized via DOMPurify; Mermaid `securityLevel` tightened from `loose` to `strict`; production CSP no longer allows `unsafe-eval`
- **Fixed XSS carriers in exported HTML / PDF**: Raw HTML blocks in the export pipeline were previously emitted without sanitization, so an exported HTML/PDF file from a malicious document could execute scripts when opened in a browser; the export path now applies the same sanitization as the reading path, and inline img/a passthrough only rebuilds safe attributes (alt/src/href)
- **File type whitelist for webview writes**: `write_file` / `write_binary_file` now only accept document and image types (md / html / svg / docx / pdf / images, etc.), and `export_pdf` validates the `.pdf` extension, preventing a compromised renderer from overwriting system executables
- **Reduced plugin permission surface**: Removed the never-used fs plugin (npm package, Rust registration, and all 9 `fs:*` capabilities)
- **Dependency security updates**: vitest 3.2.7 (fixes Vitest UI arbitrary file read), mermaid 11.16.1 (fixes 5 rendering-related vulnerabilities), sharp 0.35, plus Rust transitive dependency fixes for h2 / quick-xml

### Fixed

- **Fixed update detection silently reporting "already latest" when both sources fail**: ① The Gitee source requested the non-existent `/releases/latest` endpoint (always 404 — the 0.4.1 changelog recorded a fix that never actually landed), now switched to the list API taking the newest entry; ② When both sources are unreachable (GitHub anonymous API rate limiting / no Gitee release / no network), the check now returns a real error — manual checks show a "check failed" notice instead of falsely claiming up-to-date, while automatic checks stay silent
- **No more crashes on symlink loops or deeply nested workspace folders**: The file tree scan now enforces a 32-level depth limit with path de-duplication; affected branches return as empty folders instead of overflowing the stack
- **Font settings no longer freeze the UI**: System font enumeration now runs on a background thread
- **Documents with oversized remote images can no longer exhaust memory**: Remote image loading now enforces a 20MB size limit (response header pre-check plus a fallback on actual bytes)

### Removed

- Removed ~870 lines of dead code (including 4 unwired Obsidian components) and 40 unreferenced UI strings (zh/en in sync), reducing installer size

## [0.4.2] - 2026-07-23

### Fixed

- **titleBar.pin displayed the i18n key literal**: The `titleBar` object was missing `pin` / `unpin` i18n keys, causing `t()` to fall back to the key string. Added `pin` / `unpin` fields to `zh-CN.json` / `en-US.json`; `TitleBar.tsx` now dynamically switches the i18n key based on `isPinned` state. Also fixed the missing `about.easterEggClose` key in `EasterEgg.tsx`
- **Exported HTML filename hardcoded as "export"**: `export.ts`'s `exportHtml` used a hardcoded defaultPath. Now reads `currentFilePath` from `useFileStore` to extract the filename as the default save name
- **Content block edit window not locked to viewport**: `QuickEdit.tsx` listened to scroll events, causing the edit window to follow the target element on scroll. Removed scroll listeners, only calculates position on mount + resize; skips updates when the target element is disconnected from the DOM
- **Mermaid diagrams 6.1-6.12 not rendered in exported HTML**: Virtual scrolling + lazy loading caused off-screen Mermaid blocks to never trigger `IntersectionObserver`, leaving only placeholders in the DOM at export time. Added `renderUnrenderedMermaidBlocks` to `export.ts`, which iterates `.mermaid-block[data-raw]` and calls `renderMermaidForExport` before generating HTML
- **Admonition callout emoji icons missing**: `obsidian.css` had insufficient styling for `.obsidian-callout-icon` and incorrect Unicode mappings. Adjusted `display: inline-flex` layout, added `::before` pseudo-element rules, corrected Unicode codepoints for `clipboard-list` / `flame` / `list` icons
- **Installed version: right-click to open MD file only shows window without loading the document**: (1) Introduced `tauri-plugin-single-instance` for hot-start scenarios — the running instance receives argv from the new process and emits a `file-opened` event to the frontend; (2) For cold-start, `setup` now extracts the file path via `std::env::args_os()` into `AppState.pending_file`, and the frontend pulls it via the `get_pending_file` command on mount; (3) Removed cold-start `emit` (webview not ready, event would be lost)
- **Vite dev server port 1420 reserved by Hyper-V**: Windows Hyper-V dynamically reserves port ranges including 1420, causing `EACCES` on startup. Changed dev port from 1420 to 5173 in `vite.config.ts` and `tauri.conf.json`

## [0.4.1] - 2026-06-12

### Fixed

- **QuickEdit save failure "No matching text found"**: When double-clicking to edit and save block-level elements (ZenUML / Mermaid / PlantUML / Callout), the string-based `replace` failed to find the original text due to CRLF/LF line ending inconsistencies or whitespace normalization. Added `quickEditLines.ts` utility with line-number-based precise replacement; `LazyMermaidBlock`, `LazyPlantUMLBlock`, and `ObsidianCallout` are now integrated; `useQuickEdit` uses line-number positioning when available, falling back to string replacement otherwise
- **Update check fails in network-restricted environments**: When both GitHub + Gitee APIs are unreachable, instead of throwing, the app now silently returns "no update available" (instead of the "check failed" toast); added `release_url` so the version badge opens the release page instead of downloading installer
- **Lint errors**: invalid regex escape in `generateExportHtml.ts`; empty catch block in `useKeyboardShortcuts.ts`
- **macOS universal dmg / app.tar.gz 404 (revised 2026-06-14)**: `rename-bundle.js` now (1) tars the `.app` directory into `ErgeMD-v{ver}-macos.app.tar.gz` for CLI-friendly installs; (2) copies the `macos-arm64.dmg` to `macos.dmg` as a fallback so the README's "universal installer" link no longer 404s (the file is still arm64-only — Intel Mac has no native build). README (CN/EN) explicitly notes "macOS CI builds only Apple Silicon"

## [0.4.0] - 2026-06-10

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

### Fixed

- Floating TOC misaligned on the ZenUML section: the `@mermaid-js/mermaid-zenuml` plugin injects @zenuml/core's bundled CSS via `vite-plugin-css-injected-by-js`, which contains an unlayered universal selector `*, ::before, ::after { --tw-translate-y: 0; }` that outranks the host's Tailwind v4 `@layer utilities` rule and resets `--tw-translate-y` to 0, breaking the `.-translate-y-1/2` utility. The nav then starts at the 50% top anchor and extends straight down to the bottom-right corner. FloatingTOC's `-translate-y-1/2` is replaced with an inline `transform: translateY(-50%)`; the same latent risk in `SearchBar` / `UpdateChecker` (`-translate-x-1/2`) is replaced with inline `transform: translateX(-50%)` as well
- "Update check failed, please check your network" misreported in the About page: traced to three layered bugs — (1) Gitee Open API has no `/releases/latest` subpath (only GitHub does), the endpoint returned 404; (2) the repo has tags but no releases, the empty `/releases` list was parsed as an object and yielded empty fields; (3) GitHub's anonymous API limit (60/h) was exhausted by repeated dev-mode checks, all returning 403. All three fixed: Gitee switched to the list endpoint `/releases?per_page=1&page=1&direction=desc` taking the first item, with an empty array treated as "no release" and returning `Err` so `pick_latest` falls back gracefully; GitHub 403 now parses the `x-ratelimit-remaining` / `x-ratelimit-reset` headers, returning a clear "resets in ~X minutes" message on rate-limit hits (remaining=0), distinct from generic 403s; the `pick_latest` `(Ok, Ok)` arm's semantic misuse of `is_newer_version(gh, gi)` (which selected the smaller version, since `is_newer_version(a, b)` means `b > a`) is fixed by swapping to `is_newer_version(gi, gh)` to select the larger version

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
