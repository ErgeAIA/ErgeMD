# Tasks

- [x] Task 1: 创建语法检测器 `src/components/obsidian/detectors.ts`
  - [x] 创建文件，实现 `SyntaxDetector` 接口、7 个检测器（callout/wikilink/embed/highlight/comment/blockid/frontmatter）、`detectObsidianSyntax()` 和 `hasObsidianSyntax()` 函数
  - [x] 验证 TypeScript 编译通过

- [x] Task 2: 创建 Callout 组件 `src/components/obsidian/ObsidianCallout.tsx`
  - [x] 实现 13 种内置类型 + 别名映射（`CALLOUT_TYPE_MAP`）、`parseCalloutHeader()` 解析函数、`ObsidianCallout` 组件（支持自定义标题、折叠 +/-、嵌套）
  - [x] 验证 TypeScript 编译通过

- [x] Task 3: 创建 Wikilink 组件 `src/components/obsidian/ObsidianWikilink.tsx`
  - [x] 实现 `parseWikilink()` 解析函数（支持 `[[note]]`/`[[note|text]]`/`[[note#heading]]`/`[[note#^blockId]]`/`[[#heading]]`）、`ObsidianWikilink` 组件
  - [x] 验证 TypeScript 编译通过

- [x] Task 4: 创建 Embed 组件 `src/components/obsidian/ObsidianEmbed.tsx`
  - [x] 实现 `parseEmbed()` 解析函数（支持文件类型判断 image/pdf/audio/video/note、宽度参数、PDF 页码、标题链接）、`ObsidianEmbed` 组件（图片类型渲染 `<img>` + fallback，其他类型渲染引用块）
  - [x] 验证 TypeScript 编译通过

- [x] Task 5: 创建 Highlight/BlockId/Frontmatter 组件 + 修改 block 类型
  - [x] 创建 `src/components/obsidian/ObsidianHighlight.tsx`：`<mark>` 渲染
  - [x] 创建 `src/components/obsidian/ObsidianBlockId.tsx`：不可见锚点
  - [x] 创建 `src/components/obsidian/ObsidianFrontmatter.tsx`：`parseFrontmatter()` 简易 YAML 解析 + 元数据渲染
  - [x] 修改 `src/types/markdownBlock.ts`：`MarkdownBlockType` 新增 `"frontmatter"`
  - [x] 修改 `src/utils/markdownBlocks.ts`：在两套解析逻辑中添加 frontmatter block 识别（首行 `---` → 查找结束 `---` → 生成 frontmatter block）
  - [x] 验证 TypeScript 编译通过

- [x] Task 6: 创建 useObsidianModule Hook `src/components/obsidian/useObsidianModule.tsx`
  - [x] 实现 `useObsidianModule(content, blockRaw?)` hook：检测语法 → 按需返回 Components 覆盖（blockquote→Callout 检测+渲染）
  - [x] 实现 `preprocessObsidianSyntax(content)` 预处理函数：提取保护代码块 → 替换 Embed/Wikilink/Highlight/Comment/BlockId 为 HTML 标签 → 还原代码块
  - [x] 验证 TypeScript 编译通过

- [x] Task 7: 创建模块入口 `src/components/obsidian/index.ts`
  - [x] 导出所有公共 API：`detectObsidianSyntax`、`hasObsidianSyntax`、`useObsidianModule`、`preprocessObsidianSyntax`、`ObsidianCallout`、`parseCalloutHeader`、`CALLOUT_TYPE_MAP`、`ObsidianWikilink`、`parseWikilink`、`ObsidianEmbed`、`parseEmbed`、`ObsidianHighlight`、`ObsidianBlockId`、`ObsidianFrontmatter`、`parseFrontmatter`
  - [x] 验证 TypeScript 编译通过

- [x] Task 8: 创建 Obsidian 样式文件 `src/components/obsidian/obsidian.css`
  - [x] 创建样式文件：`.obsidian-callout` 系列（含折叠动画、嵌套缩进）、`.obsidian-wikilink` 系列、`.obsidian-embed` 系列、`.obsidian-highlight`、`.obsidian-block-id`、`.obsidian-frontmatter` 系列，所有颜色使用 CSS 变量，`color-mix()` 带 `rgba()` 回退
  - [x] 验证构建无 CSS 语法错误

- [x] Task 9: 集成到 MarkdownBlockView
  - [x] 删除 `MarkdownBlockView.tsx` 中的 `ADMONITION_TYPES`（第 35-72 行）、`getTextContent`（第 74-85 行）、`cloneElementWithText`（第 87-92 行）
  - [x] 添加 import：`useObsidianModule`、`preprocessObsidianSyntax`、`ObsidianFrontmatter`
  - [x] 在组件内添加 hook 调用：`const obsidianComponents = useObsidianModule(block.raw, block.raw)`
  - [x] 添加预处理：`const processedRaw = useMemo(() => preprocessObsidianSyntax(block.raw), [block.raw])`
  - [x] 替换 blockquote 组件（第 307-423 行）：移除内联 Admonition 检测，改为简单 blockquote 渲染
  - [x] 合并 Obsidian components：`{ ...baseComponents, ...obsidianComponents }`
  - [x] 使用 `processedRaw` 替代 `block.raw` 传入 ReactMarkdown
  - [x] 在 block.type switch 中添加 `frontmatter` case：`<ObsidianFrontmatter raw={block.raw} />`
  - [x] 验证 TypeScript 编译通过（`pnpm build`）

- [x] Task 10: 导入样式到 globals.css
  - [x] 在 `src/styles/globals.css` 中添加 `@import "../components/obsidian/obsidian.css";`
  - [x] 验证样式加载

- [x] Task 11: 主题变量适配（14 个主题文件）
  - [x] 在 `src/styles/themes/light.css` 中添加 `--obsidian-callout-*` 变量（13 个，亮色值）
  - [x] 在 `src/styles/themes/dark.css` 中添加 `--obsidian-callout-*` 变量（13 个，暗色更亮值）
  - [x] 在其余 12 个主题文件中添加 `--obsidian-callout-*` 变量（根据各主题色调调整）
  - [x] 验证主题切换时 Callout 颜色跟随变化

- [x] Task 12: 端到端验证
  - [x] 创建 Obsidian 语法测试 Markdown 文件（包含 frontmatter/callout/wikilink/embed/highlight/comment/blockid）
  - [x] 在 Tauri 中打开测试文件，逐项验证所有语法渲染正确
  - [ ] 验证不含 Obsidian 语法的文件渲染无回归（需人工测试）
  - [x] 运行 `pnpm build` 确认无编译错误
  - [x] 运行 `pnpm lint` 确认无 lint 错误（Obsidian 模块零错误，已有文件的 error/warning 为预存问题）

# Task Dependencies

- [Task 2] depends on [Task 1] — Callout 组件被 useObsidianModule 引用
- [Task 3] depends on [Task 1] — Wikilink 解析被 preprocessObsidianSyntax 引用
- [Task 4] depends on [Task 1] — Embed 解析被 preprocessObsidianSyntax 引用
- [Task 5] depends on [Task 1] — Frontmatter 检测器被 detectors.ts 导出
- [Task 6] depends on [Task 1, Task 2] — useObsidianModule 引用 detectors 和 ObsidianCallout
- [Task 7] depends on [Task 1-6] — 入口文件导出所有模块
- [Task 8] depends on nothing — 样式文件可独立创建
- [Task 9] depends on [Task 5, Task 6, Task 7] — 集成需要所有组件和 hook 就绪
- [Task 10] depends on [Task 8] — 导入样式需要样式文件存在
- [Task 11] depends on [Task 8] — 主题变量需要 obsidian.css 中使用这些变量
- [Task 12] depends on [Task 9, Task 10, Task 11] — 端到端验证需要所有集成完成

# Parallelizable Work

- Task 1-5 可并行创建（组件文件互相独立）
- Task 8 可与 Task 1-7 并行创建
- Task 5 中的三个组件文件可并行创建
- Task 11 中 14 个主题文件的变量添加可并行
