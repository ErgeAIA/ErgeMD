---
title: Project Progress
type: project-progress
project: ErgeMD
updated: 2026-10-18
description: >
  项目开发进度实时记录：阶段、分支、代码状态、最近进展。每次会话更新。
  AI 在本文件新增进展或修改当前状态后，必须同步更新 frontmatter 的 updated 字段为当日日期（YYYY-MM-DD）。
---

# Project Progress

> 记录当前任务状态、分支和最近进展。每次会话更新。
> 新进展插在「当前状态」之后、旧「最后更新」之前。

---

## 当前状态

- **当前分支**：fix/audit-round-1（从 main 切出）
- **阶段**：vibe-audit 修复轮 1（正确性 → 单一解析源 → 按需常驻 → 卫生项）
- **代码**：已有完整可运行代码（Tauri 2 + React 19，v0.4.4；codegraph 索引 112 文件）
- **工具链**：pnpm@11.16.0 / Node 22（CI）/ Rust stable（CI）/ vitest 3.2.7
- 2026-10-17 文档任务：丰富 docs/TestCase/MarkdownSyntaxExample.md——H1/H2/H3 共 69 个标题下补充测试范围与检查要点（Mermaid 28 种图表逐节标注回归重点，标注已知上游问题）；仅改文档，未动代码与构建配置，待用户实机验证
- 2026-10-17 文档与测试（接上条）：MarkdownSyntaxExample.md 补入泳道图 / 用例图 / Cynefin 框架图三节（6.29~6.31，取官方最新语法），章节计数与文末清单同步为 31 种；修正 mermaid-zenuml.css 注释中的 zenuml 版本（0.2.3 → 1.0.1）；新增 src/components/reader/mermaidSyntaxDoc.test.ts 固化「文档全部 mermaid 块可 parse」回归（33/33 通过，含镜像站链接防护）；实测发现官方用例图示例 `usecase-beta direction LR`（同行）在 12.2.0 解析失败，direction 须独立成行，已在文档记录该坑
- 2026-10-17 主题适配（接上条）：为泳道图 / 用例图 / Cynefin 框架图三种新图表补齐 Mermaid 主题变量适配——新增 mermaid-swimlane.css / mermaid-usecase.css / mermaid-cynefin.css（沿用 chart palette 令牌：surface 承载文字、stroke 描边、edge 连线、fill-N 语义着色），并在 ChartColors 接口、getMermaidColors、normalizeChartType 映射、themeVariables 注入块四处补齐；顺带修正 ishikawa 映射（关键字 ishikawa-beta 此前漏映射，石川图主题块从未命中）；vite.config.ts 注释 ZenUML 版本 0.2.3→1.0.1（用户授权改构建配置）。人类阅读性：五域按语义着色（复杂=紫/繁杂=蓝/清晰=绿/混沌=橙/混乱=中性），include/extend 虚线分色区分；用例图 actor 文字沿用 primaryTextColor 与 eventmodeling 同套 fill-N+text 配对原则。tsc --noEmit 通过、eslint 仅存量 as-any warning、回归测试 33/33。14 主题 × 三图视觉可读性仍待用户实机
- 2026-10-17 主题适配（接上条）：为泳道图 / 用例图 / Cynefin 框架图三种新图表补齐 Mermaid 主题变量适配——新增 mermaid-swimlane.css / mermaid-usecase.css / mermaid-cynefin.css（沿用 chart palette 令牌：surface 承载文字、stroke 描边、edge 连线、fill-N 语义着色），并在 ChartColors 接口、getMermaidColors、normalizeChartType 映射、themeVariables 注入块四处补齐；顺带修正 ishikawa 映射（关键字 ishikawa-beta 此前漏映射，石川图主题块从未命中）；vite.config.ts 注释 ZenUML 版本 0.2.3→1.0.1（用户授权改构建配置）。人类阅读性：五域按语义着色（复杂=紫/繁杂=蓝/清晰=绿/混沌=橙/混乱=中性），include/extend 虚线分色区分；用例图 actor 文字沿用 primaryTextColor 与 eventmodeling 同套 fill-N+text 配对原则。tsc --noEmit 通过、eslint 仅存量 as-any warning、回归测试 33/33。14 主题 × 三图视觉可读性仍待用户实机
- 2026-10-18 思维导图布局切换（见 DEC-034）：定位 6.13 观感变化根因——DEC-033 全局钉 dagre 使 mindmap 12.x 的默认放射布局 cose-bilkent 失效、落入层级树；新增阅读设置 mindmapLayout（radial 默认 / tree），阅读与导出两处 initialize 对 mindmap 放行放射布局，布局参与缓存键；设置面板 ReadingOptions 增选择器 + 双语 i18n；文档 6.13 检查要点同步。tsc --noEmit 通过、eslint 仅存量 as-any warning、vitest 全量 57/57；两种布局的实际观感与导出一致性待用户实机
- 2026-10-18 主题契约重构设计阶段：与用户两轮可视化对比（浏览器伴侣）确认两条核心规则——思维导图配色（6 色相封顶 + 层级明度 + text-on-fill 绑定，现状 18 节点对比度无一达 4.5:1 → 规则版全部达标）与正文元素分界（标题/功能位带色过护栏、正文与分隔线中性）；产出 docs/theme-token-contract-design.md（待评审），经独立 builder 检查 7 问（6 问自行定断记录于文档第 11 节）；决策记录 DEC-035。开放问题 1 项待用户定夺：派生色构建期生成 vs 运行时注入。未动任何代码
- **最后更新**：2026-10-17 审计修复轮 1 代码改动完成（未提交）
  - H1 chunk 缓存键加文档指纹 + FIFO 淘汰；H2 isTableLine 收紧（BUG-030 修复恢复）；H3 新增 queryActiveMarkdownBody 替换 4 处裸 querySelector
  - M1/M2 单一解析源：大文档跳过 extractTOC；virtualTocItems 改由 VirtualMarkdownView 经 onTocReady 上行；FloatingTOC 新增 items 注入（DEC-031）
  - M3 常驻 Tab 上限 = 活动 + 固定 + 最近 3 个，超出者卸载（DEC-032）
  - L1 关闭零使用 assetProtocol；L2 移除 workspaces 死表；L4 wordCount 真实持久化 + 吞错改 console.error；L6 pinTab 死分支合并；L8 恢复 BUG-028 中部索引
  - 留痕：debug-log BUG-059~062；decision-log DEC-031/032
  - lint 全绿（9 个改动文件）；未跑构建/测试，待用户实机验证
  - 验证通过（用户授权）：pnpm lint 0 错误（36 个存量 warning 均不在改动文件）、tsc --noEmit 通过、vitest 24/24 通过、cargo check 通过
  - L7 默认折叠完成：FileTreeNode 仅根层（depth 0）默认展开，更深层级按需展开
  - BUG-063 修复（用户实测反馈）：虚拟模式 TOC 跳转改收敛循环（scrollToHeading.ts 新增 jumpToHeadingWithRetry：目标未渲染重发 scrollToIndex，已渲染按实测位置 auto 校正至收敛），替换原定点补救
  - BUG-064 修复（用户实测反馈）：Mermaid 预览缺文字——SVGPreview 新增 skipSanitize，mermaid 预览不再二次消毒（DOMPurify 剥 foreignObject 内容，配置层无解，已实测）
  - Mermaid 升级评估完成（未执行）：12.2.0 破坏性变更 ELK 默认布局 / 默认主题 redux-color+neo；需 ZenUML 0.2.3→1.0.1；硬阻碍为 Safari 17.4+（macOS 12 Monterey/2021 起），与 minimumSystemVersion 10.15 冲突，待用户决策
  - Mermaid 升级已执行（DEC-033）：12.2.0 + zenuml 1.0.1，initialize 钉 layout:'dagre' + look:'classic'；用户确认 macOS 用户量少、接受 ≤11 系统图表降级（变更日志已声明）；chunk 6MB→8.2MB（ELK 内置），chunkSizeWarningLimit→8500；lint/tsc/vitest/build 全过；**14 主题 × 图表类型视觉回归待用户实机**（重点：MarkdownSyntaxExample.md 全图表 + ZenUML/C4/packet 等依赖 DOM 结构的后处理）
  - BUG-065 修复（用户实测反馈）：neo 外观 drop-shadow 污影——缓存键 _version v36→v37 作废旧键，classic 钉位经浏览器实测彻底消除阴影；待实机确认切 Tab 无残留
- 2026-10-18 HTML 导出修复（BUG-066，用户实测反馈 + 我方无头浏览器实测）：`readerStore` 加 `exportMode` → `VirtualMarkdownView` 导出模式全量渲染 block 并保存/恢复滚动 → `CodeBlock` / `MermaidDiagram` / `PlantUMLDiagram` 导出模式跳过 IntersectionObserver 立即渲染 → `exportHtml` 改为「置模式 → 双 rAF → 轮询图表就绪 → 补救错误炸弹/未渲染块 → 复制 → `finally` 复原」；新增 `utils/exportStyles.ts`（`collectAllCssVariables` 全量收 `--*`、`serializeAppStylesheets` 序列化整个 CSSOM、shell 中和全局样式副作用、导出 `<html>` 复制 `data-theme`），替换原 22 变量白名单 + 手写规则；`MermaidDiagram` 渲染失败退避重试 2 次；PDF 路径 `generateExportHtml.ts` 复用同源变量与 markdown.css。产物 `<body>` 包 `.markdown-body` 使 scoped 规则生效。实测 `MarkdownSyntaxExample2.html`：31 张 mermaid 齐全 0 炸弹、15 个 hljs 代码块分色（27 类 token 均解析到 `--code-*`）、Properties 键值为 `:root` 网格同行、KaTeX 724 处；tsc/lint(0 error)/vitest 57 全绿。CSS 剪枝已完成（同日追加）：`serializeAppStylesheets` 按导出 DOM 命中裁剪——剔除选择器零命中的规则、`@keyframes`/`animation-*`/`@starting-style`（静态文档无 JS 触发者，元素会停在动画初始态，正是"闪一下就没了"的成因）、`@font-face`/`@import`（tauri:// 运行时资源必然加载失败），变量与 `@property` 保留。踩坑：Chromium 的 `CSSStyleRule` 因支持 CSS 嵌套而自带 `cssRules`（length=0），用「有无 cssRules」判容器会把全部样式规则当 @media 递归后丢弃——必须先看 `selectorText`。无头 A/B 实测（同一份导出替换样式前后对比计算样式）：1.59MB CSSOM → 77KB（-95%），含 h1/heading 配色、hljs 分词色、obsidian 网格、图表尺寸在内全部一致，仅 body/pre 背景与 heading 变量差异由 shell 与全量 `:root` 变量兜底。tsc/lint(0 error)/vitest 57 全绿。待办：多主题与大文档导出耗时复核、用户重新导出确认体积降到 ~1.2MB 且"闪一下"消失
- **下一步**：用户本地验证（`pnpm tauri dev`：多 Tab 搜索/切换、大小文档 TOC、大文档打开速度、导出 FILE_SIZE 接受度）→ 提交到 fix/audit-round-1 → 合并 main → 双平台推送
- **本阶段禁止**：改动 .trae/rules/、docs/phase/
- **本轮有意 deferred**：L3 db_pool 直注（需 cargo check，构建需授权）、L5 App.tsx 拆分（独立重构）、L7 文件树虚拟化（UX 变更待定）、H3 后半「搜索走数据层」（功能级改动）

## 已知未决事项（迁移时从历史交接文档回收，均待处理）

| # | 事项 | 来源 | 状态 |
| --- | --- | --- | --- |
| 1 | PDF 导出 SVG 链接问题：带图片链接的文档导出 PDF 出现大量横线，疑与导出失败日志 `localhost-*.txt` 有关 | 20260601-01 交接 §10 | 待调查；PDF 导出后经 v0.4.x 迭代，需先复现确认是否仍存在 |
| 2 | Event Modeling 图表暂不支持（Mermaid runtime capability，报 UnknownDiagramError） | Phase 16A 调研（20260509-02 交接） | 暂缓，未排期 |
| 3 | Mermaid v11 中文/CJK 字符宽度计算错误，每节点缺最后一个字符 | BUG-015 | 上游 Bug，等官方修复；勿降级 v10（esbuild 不兼容） |
| 4 | portable zip 命名不一致：README 写 `ErgeMD-v{x}-portable.zip`，实际 asset 为 `ErgeMD-v{x}-windows-x64-portable.zip` | BUG-052 | 遗留未修，下次改 README 时顺手统一 |
| 5 | macOS x64 跨编译缺失：CI 矩阵只跑 macos-arm64，Intel Mac 无原生包 | BUG-051 / DEC-029 | 临时方案（README 已标注 arm64-only），待补跨编译工具链 |

## 历史阶段脉络（2026-04 ~ 2026-06，同步自 docs/.ai/context-handover）

| 时间 | 阶段 | 内容 |
| ---- | ---- | ---- |
| 2026-04-30 | 收尾 Bug 修复 | details 折叠失效、Tab 右键无效；确定基于块虚拟化（≥500 行）、Mermaid 锁定 11.14.0、HTML 块解析标签栈 |
| 2026-05-08 前 | Phase 1-6 | 项目结构 / Markdown 渲染 / 主题系统 / 虚拟滚动 + TOC / 14 主题 CSS 变量架构 / 导出 + 国际化 + 右键菜单，全部通过 |
| 2026-05-08 | Phase 6 优化 | AGENTS.md 建立并整合 CLAUDE.md（当时决策，2026-10-17 才真正落地）；14 主题 Mermaid 完整变量体系同步完成 |
| 2026-05-09 | Phase 13.7 / 15 / 16A / 17 / 18 | Mermaid 变量架构清理（移除 328 个重复变量）；Packet/Radar/Treemap 修复；ZenUML/Event Modeling 调研判定暂不支持；Markdown 列表与强调文字主题适配；TOC 点击定位修复 |
| 2026-05-10 | Phase 18-R3 | Wardley 背景根因修复、Ishikawa 轻量适配、Mermaid 适配原则确立 |
| 2026-05-19 | 生产构建修复 | Tauri 2 production build 图片无法加载（CSP + asset 协议 scope 双根因，DEC-028） |
| 2026-05-22 | Windows 文件关联 | 冷启动 file-open 不触发 + 最近文件竞态（dbReady）修复 |
| 2026-06-01 | Phase 19 | PDF 导出重构为独立管线；PlantUML 导出渲染；多文档/内联解析/Callout 修复（待用户实机验证） |
| 2026-06-10 | ZenUML + CI | fragment-border 遮挡消息线修复；tauri-action@v0 不跑 build，改用 pnpm tauri build |
| 2026-06-13 前 | 发布修边 | macOS dmg / app.tar.gz 链接 404 修复（rename-bundle.js 补 tar 打包） |
| 2026-06-14 后 | v0.4.1 → v0.4.4 | 版本迭代至 0.4.4（含 createUpdaterArtifacts 自动更新签名链路，私钥约定见 AGENTS.md） |
| 2026-10-17 | 协作契约初始化 | vibe-init 状态 D 受控迁移；docs/.ai 历史过程文档同步入 docs/agents |
