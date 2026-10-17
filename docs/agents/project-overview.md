# Project Overview — ErgeMD

> 层 B 项目概览：关键文件路径索引、目录结构、开源信息与发布 Tag 明细。
> 本文件由 vibe-init 于 2026-10-17 从 CLAUDE.md（272 行）与旧 AGENTS.md 受控迁移而成，只追加不重写。

## 目录结构

```
src/
├── main.tsx              # App 入口
├── App.tsx               # 主 UI
├── components/           # React 组件（reader / layout / panels / welcome / obsidian 等）
├── stores/               # Zustand stores
├── styles/               # 样式（themes 14+ 主题 / core 核心样式）
├── hooks/                # 自定义 hooks
├── utils/                # 工具函数
├── config/               # 配置
└── i18n/                 # 国际化

src-tauri/
├── src/
│   ├── lib.rs            # Tauri 主入口
│   ├── main.rs           # Rust main
│   ├── commands/         # Tauri 命令（fonts / window / pdf / update）
│   └── db/               # 数据库（init / models）
└── tauri.conf.json       # Tauri 配置
```

构建脚本：`scripts/sync-version.js`（从 package.json 同步版本）、`scripts/rename-bundle.js`（打包后重命名产物）。

## 关键文件索引

### 前端核心

| 功能                     | 文件                                                                           |
| ------------------------ | ------------------------------------------------------------------------------ |
| App 入口                 | [main.tsx](./src/main.tsx)                                                     |
| 主 UI                    | [App.tsx](./src/App.tsx)                                                       |
| 欢迎页（含最近打开列表） | [components/welcome/WelcomePage.tsx](./src/components/welcome/WelcomePage.tsx) |
| 关于页                   | [components/welcome/AboutPage.tsx](./src/components/welcome/AboutPage.tsx)     |
| 彩蛋页（F12）            | [components/welcome/EasterEgg.tsx](./src/components/welcome/EasterEgg.tsx)     |
| App 图标                 | [components/welcome/AppIcon.tsx](./src/components/welcome/AppIcon.tsx)         |

### 阅读器

| 功能            | 文件                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------- |
| 阅读器主容器    | [components/reader/ReadingArea.tsx](./src/components/reader/ReadingArea.tsx)                 |
| 小文档渲染      | [components/reader/MarkdownView.tsx](./src/components/reader/MarkdownView.tsx)               |
| 大文档虚拟滚动  | [components/reader/VirtualMarkdownView.tsx](./src/components/reader/VirtualMarkdownView.tsx) |
| Block 渲染      | [components/reader/MarkdownBlockView.tsx](./src/components/reader/MarkdownBlockView.tsx)     |
| 浮动目录        | [components/reader/FloatingTOC.tsx](./src/components/reader/FloatingTOC.tsx)                 |
| 搜索栏          | [components/reader/SearchBar.tsx](./src/components/reader/SearchBar.tsx)                     |
| 快速编辑        | [components/reader/QuickEdit.tsx](./src/components/reader/QuickEdit.tsx)                     |
| 图片预览        | [components/reader/ImagePreview.tsx](./src/components/reader/ImagePreview.tsx)               |
| 图片编辑弹窗    | [components/reader/ImageEditModal.tsx](./src/components/reader/ImageEditModal.tsx)           |
| 链接编辑弹窗    | [components/reader/LinkEditModal.tsx](./src/components/reader/LinkEditModal.tsx)             |
| SVG 预览        | [components/reader/SVGPreview.tsx](./src/components/reader/SVGPreview.tsx)                   |
| 代码块          | [components/reader/CodeBlock.tsx](./src/components/reader/CodeBlock.tsx)                     |
| Mermaid 图表    | [components/reader/MermaidDiagram.tsx](./src/components/reader/MermaidDiagram.tsx)           |
| Mermaid 懒加载  | [components/reader/LazyMermaidBlock.tsx](./src/components/reader/LazyMermaidBlock.tsx)       |
| PlantUML 图表   | [components/reader/PlantUMLDiagram.tsx](./src/components/reader/PlantUMLDiagram.tsx)         |
| PlantUML 懒加载 | [components/reader/LazyPlantUMLBlock.tsx](./src/components/reader/LazyPlantUMLBlock.tsx)     |

### 布局 / 面板

| 功能         | 文件                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------- |
| 整体布局     | [components/layout/AppLayout.tsx](./src/components/layout/AppLayout.tsx)                     |
| 标题栏       | [components/layout/TitleBar.tsx](./src/components/layout/TitleBar.tsx)                       |
| 标签栏       | [components/layout/TabBar.tsx](./src/components/layout/TabBar.tsx)                           |
| 状态栏       | [components/layout/StatusBar.tsx](./src/components/layout/StatusBar.tsx)                     |
| 窗口调整手柄 | [components/layout/WindowResizeHandles.tsx](./src/components/layout/WindowResizeHandles.tsx) |
| 左面板       | [components/panels/LeftPanel.tsx](./src/components/panels/LeftPanel.tsx)                     |
| 右面板       | [components/panels/RightPanel.tsx](./src/components/panels/RightPanel.tsx)                   |
| 文件树       | [components/panels/FileList.tsx](./src/components/panels/FileList.tsx)                       |
| 阅读设置     | [components/panels/ReadingOptions.tsx](./src/components/panels/ReadingOptions.tsx)           |

### 右键菜单

| 功能           | 文件                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| 通用菜单       | [components/context-menu/ContextMenu.tsx](./src/components/context-menu/ContextMenu.tsx)                   |
| 阅读器菜单     | [components/context-menu/ReaderContextMenu.tsx](./src/components/context-menu/ReaderContextMenu.tsx)       |
| 标签页菜单     | [components/context-menu/TabContextMenu.tsx](./src/components/context-menu/TabContextMenu.tsx)             |
| 文件列表菜单   | [components/context-menu/FileListContextMenu.tsx](./src/components/context-menu/FileListContextMenu.tsx)   |
| 目录菜单       | [components/context-menu/TOCContextMenu.tsx](./src/components/context-menu/TOCContextMenu.tsx)             |
| 代码块菜单     | [components/context-menu/CodeBlockContextMenu.tsx](./src/components/context-menu/CodeBlockContextMenu.tsx) |
| 图片菜单       | [components/context-menu/ImageContextMenu.tsx](./src/components/context-menu/ImageContextMenu.tsx)         |
| 链接菜单       | [components/context-menu/LinkContextMenu.tsx](./src/components/context-menu/LinkContextMenu.tsx)           |
| 阅读器图片菜单 | [components/reader/ContextMenuImage.tsx](./src/components/reader/ContextMenuImage.tsx)                     |
| 阅读器链接菜单 | [components/reader/ContextMenuLink.tsx](./src/components/reader/ContextMenuLink.tsx)                       |

### 通用组件

| 功能           | 文件                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------ |
| 错误边界       | [components/common/ErrorBoundary.tsx](./src/components/common/ErrorBoundary.tsx)                 |
| 进度条         | [components/common/ProgressBar.tsx](./src/components/common/ProgressBar.tsx)                     |
| Toast 通知     | [components/common/Toast.tsx](./src/components/common/Toast.tsx)                                 |
| 自动更新检测   | [components/common/UpdateChecker.tsx](./src/components/common/UpdateChecker.tsx)                 |
| 配置级别选择器 | [components/settings/ConfigLevelSelector.tsx](./src/components/settings/ConfigLevelSelector.tsx) |
| 传送门         | [components/Portal.tsx](./src/components/Portal.tsx)                                             |

### Obsidian 扩展

| 功能               | 文件                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Callout 提示框     | [components/obsidian/ObsidianCallout.tsx](./src/components/obsidian/ObsidianCallout.tsx)         |
| Wikilink 内链      | [components/obsidian/ObsidianWikilink.tsx](./src/components/obsidian/ObsidianWikilink.tsx)       |
| Embed 嵌入         | [components/obsidian/ObsidianEmbed.tsx](./src/components/obsidian/ObsidianEmbed.tsx)             |
| Frontmatter 元数据 | [components/obsidian/ObsidianFrontmatter.tsx](./src/components/obsidian/ObsidianFrontmatter.tsx) |
| 高亮               | [components/obsidian/ObsidianHighlight.tsx](./src/components/obsidian/ObsidianHighlight.tsx)     |
| 块 ID              | [components/obsidian/ObsidianBlockId.tsx](./src/components/obsidian/ObsidianBlockId.tsx)         |
| 语法检测器         | [components/obsidian/detectors.ts](./src/components/obsidian/detectors.ts)                       |
| 模块入口           | [components/obsidian/index.ts](./src/components/obsidian/index.ts)                               |
| 按需加载 Hook      | [components/obsidian/useObsidianModule.tsx](./src/components/obsidian/useObsidianModule.tsx)     |
| Obsidian 样式      | [components/obsidian/obsidian.css](./src/components/obsidian/obsidian.css)                       |

### 状态管理（Zustand）

| 功能                    | 文件                                                     |
| ----------------------- | -------------------------------------------------------- |
| 文件 / 标签 / 目录      | [stores/fileStore.ts](./src/stores/fileStore.ts)         |
| 搜索 / Toast / 图片预览 | [stores/readerStore.ts](./src/stores/readerStore.ts)     |
| 阅读设置（持久化）      | [stores/settingsStore.ts](./src/stores/settingsStore.ts) |

> 注意：**最近打开记录的状态在 `WelcomePage` 组件内 useState 管理，未抽到 store。**

### Hooks

| 功能       | 文件                                                                 |
| ---------- | -------------------------------------------------------------------- |
| 主题       | [hooks/useTheme.ts](./src/hooks/useTheme.ts)                         |
| 键盘快捷键 | [hooks/useKeyboardShortcuts.ts](./src/hooks/useKeyboardShortcuts.ts) |
| 阅读进度   | [hooks/useReadingProgress.ts](./src/hooks/useReadingProgress.ts)     |
| 右键菜单   | [hooks/useContextMenu.ts](./src/hooks/useContextMenu.ts)             |
| 标题栏     | [hooks/useTitleBar.ts](./src/hooks/useTitleBar.ts)                   |
| 快速编辑   | [hooks/useQuickEdit.ts](./src/hooks/useQuickEdit.ts)                 |
| 自动隐藏   | [hooks/useAutoHide.ts](./src/hooks/useAutoHide.ts)                   |
| 活跃配置   | [hooks/useActiveConfig.ts](./src/hooks/useActiveConfig.ts)           |

### 工具 / 导出 / 解析

| 功能             | 文件                                                             |
| ---------------- | ---------------------------------------------------------------- |
| Markdown 解析    | [utils/markdownBlocks.ts](./src/utils/markdownBlocks.ts)         |
| 目录生成         | [utils/toc.ts](./src/utils/toc.ts)                               |
| 滚动到标题       | [utils/scrollToHeading.ts](./src/utils/scrollToHeading.ts)       |
| 阅读进度         | [utils/readingProgress.ts](./src/utils/readingProgress.ts)       |
| 字数统计         | [utils/wordCount.ts](./src/utils/wordCount.ts)                   |
| 导出入口         | [utils/export.ts](./src/utils/export.ts)                         |
| Word 导出        | [utils/exportDocx.ts](./src/utils/exportDocx.ts)                 |
| PDF 导出         | [utils/exportPdf.ts](./src/utils/exportPdf.ts)                   |
| 导出 HTML 生成器 | [utils/generateExportHtml.ts](./src/utils/generateExportHtml.ts) |
| 阅读器配置       | [config/readerConfig.ts](./src/config/readerConfig.ts)           |
| 类型定义         | [types/index.ts](./src/types/index.ts)                           |
| Block 类型       | [types/markdownBlock.ts](./src/types/markdownBlock.ts)           |
| PlantUML 类型    | [types/plantuml.d.ts](./src/types/plantuml.d.ts)                 |

### 样式 / 主题

| 功能          | 文件                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------ |
| 全局样式      | [styles/globals.css](./src/styles/globals.css)                                                   |
| Markdown 样式 | [styles/markdown.css](./src/styles/markdown.css)                                                 |
| 右键菜单样式  | [styles/context-menu.css](./src/styles/context-menu.css)                                         |
| 动画          | [styles/animations.css](./src/styles/animations.css)                                             |
| 主题核心      | [styles/themes/core/theme-core.css](./src/styles/themes/core/theme-core.css)                     |
| 深色基底      | [styles/themes/core/theme-dark-base.css](./src/styles/themes/core/theme-dark-base.css)           |
| 浅色基底      | [styles/themes/core/theme-light-base.css](./src/styles/themes/core/theme-light-base.css)         |
| 派生变量      | [styles/themes/core/theme-derived.css](./src/styles/themes/core/theme-derived.css)               |
| Mermaid 通用  | [styles/themes/core/mermaid/mermaid-base.css](./src/styles/themes/core/mermaid/mermaid-base.css) |
| PlantUML      | [styles/themes/core/plantuml.css](./src/styles/themes/core/plantuml.css)                         |
| 14 个主题     | [styles/themes/](./src/styles/themes/)                                                           |

### 国际化

| 功能     | 文件                                     |
| -------- | ---------------------------------------- |
| 简体中文 | [i18n/zh-CN.json](./src/i18n/zh-CN.json) |
| English  | [i18n/en-US.json](./src/i18n/en-US.json) |
| 入口     | [i18n/index.ts](./src/i18n/index.ts)     |

### Rust 后端

| 功能         | 文件                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| Tauri 主入口 | [src-tauri/src/lib.rs](./src-tauri/src/lib.rs)                               |
| Rust main    | [src-tauri/src/main.rs](./src-tauri/src/main.rs)                             |
| 命令入口     | [src-tauri/src/commands/mod.rs](./src-tauri/src/commands/mod.rs)             |
| 字体命令     | [src-tauri/src/commands/fonts.rs](./src-tauri/src/commands/fonts.rs)         |
| 窗口命令     | [src-tauri/src/commands/window.rs](./src-tauri/src/commands/window.rs)       |
| PDF 导出命令 | [src-tauri/src/commands/pdf.rs](./src-tauri/src/commands/pdf.rs)             |
| 更新命令     | [src-tauri/src/commands/update.rs](./src-tauri/src/commands/update.rs)       |
| 数据库初始化 | [src-tauri/src/db/mod.rs](./src-tauri/src/db/mod.rs)                         |
| 数据库模型   | [src-tauri/src/db/models.rs](./src-tauri/src/db/models.rs)                   |
| Tauri 配置   | [src-tauri/tauri.conf.json](./src-tauri/tauri.conf.json)                     |
| Rust 依赖    | [src-tauri/Cargo.toml](./src-tauri/Cargo.toml)                               |
| 能力声明     | [src-tauri/capabilities/default.json](./src-tauri/capabilities/default.json) |

### 最近打开 / 阅读进度相关命令

定义在 [lib.rs](./src-tauri/src/lib.rs)：

- `get_recent_files(limit)` — 获取最近打开文件列表
- `add_recent_file(filePath, fileName)` — 添加 / 更新最近打开记录（upsert）
- `delete_recent_file(filePath)` — 删除单条最近打开记录
- `clear_recent_files()` — 清空全部最近打开
- `get_reading_progress(filePath)` — 读取阅读进度
- `save_reading_progress(filePath, scrollPercentage, wordCount)` — 保存阅读进度
- `delete_reading_progress(filePath)` — 删除单条阅读进度
- `clear_all_reading_progress()` — 清空全部阅读进度

### 构建脚本

| 功能       | 文件                                                   |
| ---------- | ------------------------------------------------------ |
| 版本同步   | [scripts/sync-version.js](./scripts/sync-version.js)   |
| 打包重命名 | [scripts/rename-bundle.js](./scripts/rename-bundle.js) |

### 根目录配置

| 功能            | 文件                                                     |
| --------------- | -------------------------------------------------------- |
| 包配置          | [package.json](./package.json)                           |
| Vite 配置       | [vite.config.ts](./vite.config.ts)                       |
| TypeScript 配置 | [tsconfig.json](./tsconfig.json)                         |
| ESLint 配置     | [eslint.config.js](./eslint.config.js)                   |
| Tauri 配置      | [src-tauri/tauri.conf.json](./src-tauri/tauri.conf.json) |
| 入口 HTML       | [index.html](./index.html)                               |

### 项目文档

| 功能               | 文件                                       |
| ------------------ | ------------------------------------------ |
| 项目规范（**主**） | [AGENTS.md](./AGENTS.md)                   |
| 项目说明           | [README.md](./README.md)                   |
| 英文说明           | [README.en.md](./README.en.md)             |
| 技术规格           | [TECH-SPEC.md](./TECH-SPEC.md)             |
| 产品需求           | [docs/ErgeMD-pdr.md](./docs/ErgeMD-pdr.md) |
| 错误记录（全本）   | [error-log-archive.md](./error-log-archive.md) |
| 命名规范           | [naming-consistency-guide.md](./naming-consistency-guide.md) |
| 更新日志           | [CHANGELOG.md](./CHANGELOG.md)             |
| 英文更新日志       | [CHANGELOG.en.md](./CHANGELOG.en.md)       |
| 阶段计划           | [docs/phase/](./docs/phase/)               |
| AI 规则            | [.trae/rules/](./.trae/rules/)             |

## 开源与许可

- 许可证：**AGPL-3.0**（[LICENSE](./LICENSE)）
- 约束：AGPL 为强 copyleft，衍生作品须以同一协议开源；网络服务场景同样触发开源义务
- 新增依赖须核对许可证与 AGPL-3.0 兼容，警惕 GPL / AGPL / SSPL 等强约束许可证混入
- 贡献约定：提交信息遵循 Conventional Commits；改动须可审查、范围最小

## 发布与 Tag 约定（明细）

> 本节约定版本升级与 Git Tag 的关系，影响 `.github/workflows/release.yml`
> （该工作流仅在推送 `v*` tag 时触发打包：Windows NSIS 安装包 + portable zip）。

### 何时打 Tag

| 场景                                                  | 是否打 Tag                                  | 推送方式                                                                      |
| ----------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| **版本号变更**（升级/降级，含 patch / minor / major） | **必须打 Tag**                              | `git tag v{x.y.z}` 然后 `git push origin v{x.y.z} && git push gitee v{x.y.z}` |
| 仅文档 / 重构 / 内部调整，版本号未变                  | **不打 Tag**                                | 仅 `git push origin main && git push gitee main`                              |
| 实验性 / 预发布版本                                   | 用 `v{x.y.z}-rc.N` / `v{x.y.z}-beta.N` 形式 | 同样需要推送 tag                                                              |

### Tag 命名规范

- 格式严格 `v{version}`，其中 `{version}` 与 `package.json` / `Cargo.toml` / `tauri.conf.json` 完全一致
- 例：`package.json` 升到 `0.3.2` → tag 必须为 `v0.3.2`
- 禁止 `0.3.2` / `release-0.3.2` / `v0.3.2.0` 等其他形式

### Tag 必须双平台同步

Tag 推送与 commit 推送一样，必须**同时**推送到 GitHub（origin）和 Gitee（gitee）：

```powershell
git tag v{x.y.z}                              # 本地打 tag
git push origin v{x.y.z}                      # GitHub
git push gitee v{x.y.z}                       # Gitee
```

任一平台缺漏会导致另一平台 release 工作流无法触发，或用户在 Gitee 下载页找不到对应版本。

### 完整发布流程

1. 升级版本号（`package.json` / `Cargo.toml` / `tauri.conf.json` 三处一致）
2. 更新 `CHANGELOG.md` 与 `CHANGELOG.en.md`，将 Unreleased 内容归档到新版本
3. 检查 `README.md` 下载链接版本号
4. `git add` + `git commit`（含版本升级的 commit）
5. `git push origin main && git push gitee main`
6. **额外执行**：`git tag v{x.y.z}` → `git push origin v{x.y.z} && git push gitee v{x.y.z}`
7. GitHub Actions 自动触发 `.github/workflows/release.yml`，构建并发布到 GitHub Releases
8. Gitee 需手动在 Gitee 仓库「发行版」页面创建对应版本

### 不要做的事

- 不要在版本未升级时打 tag（会触发无意义 release 构建）
- 不要忘了推送 tag——commit 已 push 但 tag 没 push，release 工作流不会触发
- 不要在打 tag 后又修改版本号——会导致 tag 与代码版本不一致，需删除旧 tag 后重新打

## 文档归档与迁移（2026-10-17 终态）

> `docs/.ai/` 历史资产已全部处置：有价值文档迁入 `docs/agents/`，其余内容蒸馏/同步进过程文档，原目录待用户删除。本表为终态登记。

### 已迁入 docs/agents/ 的文档

| 原位置（docs/.ai/） | 迁入后 | 形态 |
| --- | --- | --- |
| ERROR_LOG.md（53 节全本） | [error-log-archive.md](./error-log-archive.md) | 全本归档；结构化活跃记录为 [debug-log.md](./debug-log.md) |
| TECH-SPEC.md | [TECH-SPEC.md](./TECH-SPEC.md) | 原样迁移（2026-05 期历史规格，改动前以代码与 decision-log 为准） |
| naming-consistency-guide.md | [naming-consistency-guide.md](./naming-consistency-guide.md) | 原样迁移（规则已入 AGENTS.md Conventions「类型与 Store 命名」行） |

### 内容已蒸馏/同步、不复制原件的

| 原位置 | 内容去向 |
| --- | --- |
| context-handover/（7 份，2026-05-08 ~ 06-01） | 决策 → [decision-log.md](./decision-log.md)（DEC-002~030）；进度 → [project-progress.md](./project-progress.md) 历史阶段脉络 |
| session-snapshots/（1 份） | 已锁定结论 → decision-log.md（DEC-015~017） |
| session-lessons/（8 份） | 决策 → decision-log.md（DEC-008~014）；可复用经验 → [experience/](./experience/) 五域 28 条 |

### 有意不迁移

| 原位置 | 理由 |
| --- | --- |
| 2026-05-20-obsidian-compatibility.md | 已完成的实施计划，模块已落地于 `src/components/obsidian/` |
| obsidian-floating-toc-technical-analysis.md | 对外部插件 obsidian-floating-toc-plugin 的调研；自研 TOC 已历经 Phase 15~18 重构，可迁移模式已被取代（DEC-019 / BUG-028/029/039 / lessons 03 已覆盖其有价值部分） |
