---
title: Decision Log
type: decision-log
project: ErgeMD
updated: 2026-10-23
priority: higher-than-prd
description: >
  开发过程决策日志，优先级高于 PRD；冲突时以本文件最新条目为准并回写 PRD/ADR。
  只追加，不删除或改写历史。AI 在本文件新增或修改任何条目后，必须同步更新 frontmatter 的 updated 字段为当日日期（YYYY-MM-DD）。
---

# Decision Log

> 偏离 PRD 或做出重要技术选择时在此追加记录。只追加，不删除或改写历史。
> **优先级高于 PRD**：冲突时以本文件最新决策为准，并回写 PRD/ADR。
> 格式：`## DEC-NNN: 标题`，新条目置顶，NNN 三位递增。
> 字段：`- **日期**：` / `- **背景**：` / `- **决策**：` / `- **验证**：`

---

## DEC-041: 更新链路三改——每次启动检查、updates-dist 全量镜像、更新卡片重设计

- **日期**：2026-10-23（用户需求：updates-dist 与主仓库保持同步且额外发布一份全量产物；启动自动检测更新，无需手动点「关于」；更新提示 UI 重设计）
- **背景**：① `UpdateChecker` 启动虽有自动检查但带 24h 节流（`TWENTY_FOUR_HOURS`），用户感知为「必须手动点关于」；② updates-dist 的 `ergemd-<tag>` release 只有 updater 三件套（nsis exe / app.tar.gz / AppImage + sig），主仓库 Release 的 dmg / deb / portable.zip 无镜像；③ 更新卡片为初版样式，底部居中悬浮且展开态信息层级弱。
- **决策**：① 去掉 24h 节流，改为每次启动（挂载后 3s）检查一次，`checkUpdateEnabled` 与静默失败语义不变；`lastCheckUpdateTime` 仍写入但不再作为节流依据。② 构建期 artifact 扩展为全量产物（追加 dmg / deb / portable.zip 的 glob），`publish-updater` 组装阶段把三件额外产物按 Release 同名复制进 `RELEASE_DIR` 一并上传，updater manifest 三件套规范名不变——updates-dist 从「更新通道」升级为「全量镜像」。③ 卡片重设计：定位从底部居中改为右下角（`bottom-14 right-6`，不再需要 translateX 补偿）、420px 窄卡、展开态加图标徽章 + 版本胶囊 + 分组圆点 + 百分比进度条 + 分隔线页脚；「跳过此版本」从折叠态移入展开态页脚。全部沿用既有主题 token（`--toast-info-*` / `--accent-cyan` / `--bg-code` / `--text-*`），未新增依赖与 i18n key。
- **验证**：`tsc --noEmit` 0 错误、`pnpm lint` 0 错误（47 存量 warning）、`pnpm test` 329/329；release.yml YAML 校验通过。**UI 观感与启动检查行为待用户实机验证；updates-dist 全量镜像待下次发版实机验证**。遗留：`src-tauri/src/commands/update.rs` 的 `check_update` 命令为前端已弃用的遗留双源轮询实现（lib.rs 仍注册），暂不清理，待单独决定。

---

## DEC-040: 分发收敛为 GitHub 单一来源，下线 Gitee 产物 / Release / 更新检测

- **日期**：2026-10-23（用户决定：「产物只放到 GitHub 上，Gitee 的取消，不做双线支持了」）
- **背景**：v0.5.0 发版期间 Gitee 链路暴露三个结构性问题——① 删旧 tag 建新 tag 时 GitHub 会把原 Release 降级为 draft，导致补跑新建的 Release 缺 mac/Windows 产物，需人工从草稿捞产物补传；② Gitee 附件上传是 best-effort，境外 runner 超时即静默缺资产，国内下载链路实际不可靠；③ 更新检测双 endpoint（GitHub raw + Gitee raw）下，Gitee 清单缺资产时 updater 回退行为难以观测。产物与源码镜像的收益不对称：源码镜像（git push gitee）零成本且有价值，产物镜像成本高、故障点多。
- **决策**：① CI 删除 `sync-gitee` job 与 `publish-updater` 内的「Publish Gitee updates-dist (best-effort)」步骤，不再生成 `updates-gitee.json`、不再向 Gitee 上传附件或建发行版；`workflow_dispatch` 输入说明与 job 注释同步改为 GitHub 单一来源。② `src-tauri/tauri.conf.json` 的 `plugins.updater.endpoints` 只保留 GitHub raw 清单。③ 源码双平台托管与 tag 双推口径不变（AGENTS.md「双平台托管」不动），仅「发布流程固定」去掉「Gitee 手动建发行版」。④ GITEE_ACCESS_TOKEN secret 暂留（仓库源码仍走 Gitee 推送不需要它；后续如清理 secret 需单独决定）。
- **验证**：`python yaml.safe_load` 校验 release.yml 合法；全仓检索 gitee 仅剩 workflow 内一处说明性注释；本地 `pnpm build` 未受影响。**下一次发版（v0.5.1 或更高）实机验证：GitHub Release 五产物齐全、updater 只查 GitHub 源**（本次 v0.5.0 已按新口径人工补齐产物）

---

## DEC-039: 导出统一为 DOM 复制单管线，PDF 复用阅读视图产物（废止 DEC-023/024/026 对 PDF 的约束）

- **日期**：2026-10-21
- **背景**：导出长期分裂为两条渲染管线——HTML/章节导出走 DOM 复制 + CSSOM 序列化（管线 A），PDF 却走 `generateExportHtml.ts` 的 Markdown 二次解析渲染（管线 B）。管线 B 重新实现了 callout/表格/列表/数学/代码块渲染，与真实阅读器必然漂移，用户反馈「PDF 与屏幕上看到的不一致」。第一性原理：导出的文档应是「屏幕上所见的忠实投影」，渲染只能有一处真相；管线 A 早已是 HTML 导出路径且质量更高。MD1/DEC-023~026 当年确立「独立管线、禁 DOM query」的两个理由（虚拟滚动残缺 DOM、多 Tab 命中错误）现已被 `VirtualMarkdownView` 的 exportMode（导出时全量渲染 block）与 `domUtils.queryActiveMarkdownBody()`（取第一个可见 body、规避非活动 Tab）分别化解；但 `export.ts` 的 `extractHtmlContent` 与 `exportStyles` 两处此前仍用裸 `document.querySelector`，未接安全选择器，多 Tab（DEC-032：活动+固定+最近 3 个常驻）下存在命中错误文档的潜在 bug。
- **决策**：① 删除管线 B `generateExportHtml.ts`，PDF 改走管线 A。② 抽出唯一 seam `captureExportDocument(options)`（进入 exportMode → 等 rAF/图表渲染 → 生成自包含 HTML），HTML 文件导出、章节导出、PDF 导出全部从同一份产物派生；`exportPdf` 以 `{ forPdf: true, fontSize }` 调用。③ `generateHtmlContent`/`extractHtmlContent` 及 `exportStyles` 的 `collectAllCssVariables`/`serializeAppStylesheets` 一律改走 `queryActiveMarkdownBody()`，章节导出也限定在活动 Tab 子树内查 id，修掉多 Tab 命中隐患。④ `buildExportStyles` 补全打印分页规则（svg/表格行/数学块避免页内断裂）。⑤ Rust 打印引擎维持 `PrintToPdf` + `document.write`：前端 `@page` + `print-color-adjust:exact` 叠加 Chromium `PrintToPdf` 默认已覆盖 A4/边距/背景/无页眉页脚；显式 `PrintSettings`（需 Environment6 强转）与就绪轮询（unsafe PWSTR）增益边际且无法在本环境运行时验证，推迟到可实机生成 PDF 验证时再做（见 issue #5）。灰度 PDF 直接复用既有 `GRAYSCALE_OVERRIDES`。
- **验证**：tsc --noEmit 0 错误；vitest 全量 316/316（exportPdf.test.ts 的 mock 已从被删的 `generateExportHtml` 切到 `captureExportDocument`）。PDF 实际观感与三端（Windows 落盘 / macOS / Linux）打印效果**待用户实机生成 PDF 验证**。

---

## DEC-001: Git 推送授权口径统一为「用户显式授权后执行」

- **日期**：2026-10-17
- **背景**：旧 AGENTS.md「双平台同步」节写「推送到已配置的 remote → AI 可自行执行」，与同文件「安全边界 → Git 操作（push、commit、branch）必须先询问」直接冲突
- **决策**：统一为严格口径——commit / push / branch / 删除文件 / 完整构建均须经用户明确授权后执行
- **验证**：与本会话实际协作一致（用户每次显式指示后才执行 commit 与双平台推送）

---

## 2026-10-17 历史同步 — 自 docs/.ai/context-handover、session-snapshots、session-lessons

> 以下 DEC-002~DEC-030 为迁移前历史决策，按源文件记录日期回填；「验证」字段照实录（含「待用户验证」状态），不补写。

## DEC-002: 桌面框架选型 Tauri 2 而非 Electron

- **日期**：2026-05-08
- **背景**：需要跨平台桌面框架承载 Markdown 阅读器
- **决策**：选 Tauri 2；理由：安装包约 4MB（Electron 约 100MB）、性能更好、Rust 安全性
- **验证**：已确认（源文件记录「已确认」）

## DEC-003: 状态管理选型 Zustand 而非 Redux

- **日期**：2026-05-08
- **背景**：前端状态管理选型
- **决策**：选 Zustand；理由：更轻量、API 简洁、基于选择器的订阅机制
- **验证**：已确认

## DEC-004: 主题系统采用 CSS 变量方案

- **日期**：2026-05-08
- **背景**：14+ 主题需要零成本切换与动态主题能力
- **决策**：CSS 变量主题系统；理由：主题切换零重渲染、支持动态主题、与 Tailwind 兼容
- **验证**：已确认

## DEC-005: Mermaid 主题通过 CSS 变量映射

- **日期**：2026-05-08
- **背景**：Mermaid 图表需跟随 14 个主题切换
- **决策**：Mermaid 颜色经 CSS 变量映射（`--mermaid-*` → `--chart-*`），不用独立 JS 配置文件；理由：与主题体系统一、支持动态切换
- **验证**：已确认

## DEC-006: 统一项目文档入口为 AGENTS.md 并整合 CLAUDE.md

- **日期**：2026-05-08
- **背景**：项目级 AI 协作文档双入口（AGENTS.md + CLAUDE.md）并存
- **决策**：合并为 AGENTS.md 唯一入口，删除 CLAUDE.md（当时已删过一次；后再度并存，最终于 2026-10-17 由 vibe-init 受控迁移真正完成）
- **验证**：2026-10-17 迁移完成（见 DEC-001 同期 init-report）

## DEC-007: 完成 14 主题 Mermaid 完整变量体系同步

- **日期**：2026-05-08
- **背景**：仅 aurora 主题完成 Mermaid 配置，其余 13 主题图表不跟随主题
- **决策**：全部 14 个主题同步完整 Mermaid 变量体系（forest / cyberpunk / cherry-blossom 本轮补齐）
- **验证**：已合入本地，待用户本地验证主题切换效果

## DEC-008: Markdown 大文件采用基于块的虚拟化渲染

- **日期**：2026-04-30
- **背景**：完整 DOM 渲染长文档性能不可接受
- **决策**：≥500 行文档启用基于块的虚拟化（`@tanstack/react-virtual`）；被否决方案：继续完整渲染（不可行）
- **验证**：已确认

## DEC-009: Mermaid 版本锁定 11.14.0

- **日期**：2026-04-30
- **背景**：需要 xychart 正式支持
- **决策**：锁定 11.14.0；被否决方案：11.4.1（仅支持 xychart-beta）
- **验证**：已确认（后因 ZenUML 插件升级至 11.15.0/11.16.1，见 package.json）

## DEC-010: details/summary 使用原生 HTML

- **日期**：2026-04-30
- **背景**：自定义折叠组件破坏 details 折叠行为
- **决策**：移除自定义组件，使用原生 HTML details/summary
- **验证**：已确认

## DEC-011: 「在资源管理器中显示」由 Rust 后端实现

- **日期**：2026-04-30
- **背景**：Tauri 前端无法直接调用系统级操作
- **决策**：Rust `std::process::Command` 注册 `reveal_in_explorer` 命令，前端 invoke 调用；跨平台条件编译（Windows explorer / Unix xdg-open）
- **验证**：已确认

## DEC-012: HTML 块解析跟踪标签闭合状态

- **日期**：2026-04-30
- **背景**：空行不是 HTML 块的可靠分隔符，嵌套标签被错误分割
- **决策**：解析时维护标签栈，开始标签压栈、结束标签弹栈；自闭合标签（br/hr/img）特殊处理
- **验证**：已确认

## DEC-013: 表格对齐通过 align 属性传递

- **日期**：2026-04-30
- **背景**：remark-gfm 通过 HTML align 属性传递对齐信息
- **决策**：自定义 th/td 从 `props.align` 或 `node.properties.align` 读取，不用 style.textAlign；需 `as any` 断言
- **验证**：已确认

## DEC-014: Mermaid 图表主题适配采用三层架构

- **日期**：2026-05-09
- **背景**：14 个主题各自维护一套完整 mermaid 变量导致 328 个重复定义
- **决策**：三层分离——① `core/mermaid/*.css` 定义 `--mermaid-*` 统一引用 `var(--chart-*)`；② `getMermaidColors()` 读取 CSS 变量；③ `getMermaidThemeSignature()` 追踪变量用于缓存失效；themeVariables 失效的图表用 SVG 后处理注入 scoped CSS
- **验证**：Phase 13.7 移除 328 个重复变量，TS 通过 + 运行时验收通过

## DEC-015: Packet 图表用 SVG 后处理覆盖（Mermaid Bug 规避）

- **日期**：2026-05-09
- **背景**：Mermaid 11.14.0 Packet themeVariables 存在官方 Bug（issue #7058），变量传入不生效
- **决策**：`patchPacketSvg` 注入 scoped CSS，用 `aria-roledescription="packet"` 检测 + `#<svgId>` 作用域限定，新样式追加在 `</style>` 后；已否决方案：继续用 themeVariables（无效）、全局 CSS 覆盖（污染其他图表）
- **验证**：15A-R5 修复 + 15A-V 集中复验通过

## DEC-016: Radar 曲线颜色使用 cScale0~cScale4

- **日期**：2026-05-09
- **背景**：`radarCurve0`~`radarCurve4` 变量名不被 Mermaid 识别
- **决策**：Radar 曲线颜色用 `cScale0`~`cScale4`（唯一有效变量），背景/轴标签等仍需 CSS 覆盖
- **验证**：15A-R4 修正 + Tauri 验证通过

## DEC-017: Treemap 用 classDef important 方式配色

- **日期**：2026-05-09
- **背景**：Mermaid 11.14.0 不暴露任何 Treemap themeVariables
- **决策**：classDef important 方式；已否决方案：猜测 themeVariables 命名（无效）
- **验证**：随 15B 系列验证

## DEC-018: Phase 17B 设计原则——阅读优先

- **日期**：2026-05-09
- **背景**：Markdown 强调文字主题适配范围拿捏
- **决策**：阅读优先，正文永远是视觉中心；strong/em 不变彩色只改字重/继承色，链接用 text-decoration-color 过渡，mark 用 --search-highlight，新增 kbd/samp/del/ins 轻量样式；回滚列表 li 显式 color 改自然继承
- **验证**：TS: 0 + 多主题人工验证通过

## DEC-019: TOC 初始点击定位采用「延迟可点击 + 二次校准」

- **日期**：2026-05-09
- **背景**：Phase 18-Audit 确认根因：Mermaid 异步渲染完成后容器高度变化，TOC 点击时 DOM 偏移量不准确
- **决策**：新建 `scrollToHeading.ts` 的 `scheduleScrollCorrection()`，点击后 280/650/1200ms 多次校准，1500ms 布局稳定窗口，柔化偏差分级（≤6px 不校、6~480px smooth、≥480px auto），wheel/touchmove 取消后续校准
- **验证**：TS: 0，待 Tauri 人工验证

## DEC-020: Wardley 背景主题适配根因修复方案

- **日期**：2026-05-10
- **背景**：Wardley 背景固定浅灰
- **决策**：三个根因同时修——① 传递 `vars.wardley` 子对象（渲染器从 themeVariables.wardley 读取）；② SVG 后处理选择器去掉不存在的 `.wardley-map` 前缀，改用实际 class；③ Wardley 加入 universal text fallback 排除列表；`<style>` 不存在时用 replace `<svg>` 兜底
- **验证**：tsc Exit Code 0，多主题截图验证通过

## DEC-021: Ishikawa 石川图轻量适配方案

- **日期**：2026-05-10
- **背景**：Ishikawa（beta 新图表）暗色可读性差
- **决策**：轻量适配——ChartColors 增加 ishikawa 字段 + SVG 内部 style 注入（text fill + line/path stroke + rect/polygon stroke），加入 universal fallback 排除列表；示例用官方 `ishikawa-beta` 缩进语法
- **验证**：tsc Exit Code 0 + 多主题截图验证通过

## DEC-022: Mermaid 新图表适配原则

- **日期**：2026-05-10
- **背景**：Mermaid 图表类型多且各版本支持度不一
- **决策**：新图表先查官方 themeVariables 支持度；通用变量能生效的用 themeVariables，不生效的走 SVG 后处理兜底；SVG style 注入需处理 `<style>` 缺失的 fallback
- **验证**：已确立为适配原则

## DEC-023: PDF 导出使用 HTML 中转独立管线

- **日期**：2026-06-01
- **背景**：PDF 导出长期不稳定：虚拟滚动、懒加载、样式丢失、图表不渲染
- **决策**：从 Markdown 原文直接生成完整 HTML，经 WebView2 PrintToPdf 生成 PDF；支持带样式/灰度双模式；所有图表导出前渲染完成
- **验证**：代码完成（19-A~19-G），待用户本地实机测试

## DEC-024: 导出不复用阅读组件逻辑

- **日期**：2026-06-01
- **背景**：复用阅读组件时虚拟滚动卸载导致图表未渲染
- **决策**：导出独立管线，与阅读组件彻底分离；删除 exportMode.ts 脏补丁
- **验证**：tsc Exit Code 0

## DEC-025: PlantUML 导出用串行队列渲染

- **日期**：2026-06-01
- **背景**：并发渲染 PlantUML 冲突
- **决策**：串行队列渲染（复用阅读侧队列）
- **验证**：代码完成，待用户验证

## DEC-026: 导出内容从 fileStore 获取

- **日期**：2026-06-01
- **背景**：多文档导出始终导出第一个文档（DOM 查询选错 Tab）
- **决策**：必须从 fileStore 获取 currentContent，禁止 querySelector 取内容
- **验证**：代码完成，待用户验证

## DEC-027: 导出时并行处理渲染与保存对话框

- **日期**：2026-06-01
- **背景**：优化导出等待体验
- **决策**：渲染流程与保存对话框并行
- **验证**：代码完成，待用户验证

## DEC-028: 本地图片用 Rust 命令 + base64 而非 asset 协议

- **日期**：2026-05-19
- **背景**：asset 协议在 Windows 绝对路径 scope 匹配上不可靠（glob `**` 不匹配驱动器号路径）
- **决策**：`read_image_as_data_url` 命令返回 base64 data URL；被否决方案：convertFileSrc + asset 协议（Windows 不可靠，见 BUG-048）
- **验证**：build 产物待 F12 验证 CSP 无违规

## DEC-029: CI 构建放弃 tauri-action 改用显式 pnpm tauri build

- **日期**：2026-06-13
- **背景**：tauri-action@v0 在当前配置下不跑 build，整个 release pipeline 损坏 5+ 次迭代
- **决策**：release.yml 改用 `pnpm tauri build --target ${{ matrix.target }}`（shell: pwsh）；macos-x64 跨编译暂时移除，只保留 macos-arm64
- **验证**：v0.4.1 起 CI 正常产出（见 BUG-051）

## DEC-030: 命名一致性——一个概念一个名字

- **日期**：未标注（源文件 docs/.ai/naming-consistency-guide.md 无日期）
- **背景**：AI 协作开发中同义词漂移导致类型/字段/Store 命名不一致
- **决策**：建立命名字典并全局遵守：类型 `TabInfo`/`ReadingProgress`/`RecentFile`/`FileNode`/`TocItem`/`ThemeMode`/`Language`（不用 Tab/TOCItem/Theme）；Store `useFileStore`/`useReaderStore`/`useSettingsStore`；跨语言字段显式映射（user_id ↔ userId）
- **验证**：规范已并入 AGENTS.md Conventions「类型与 Store 命名」行

## DEC-031: TOC 单一解析源（大文档跳过 extractTOC，虚拟模式 TOC 由块解析器产出）

- **日期**：2026-10-17
- **背景**：审计 M1/M2——大文档打开时 extractTOC 全文扫描 + ReadingArea 全文 parseMarkdownBlocks + chunked 初始解析三路并行；且 FloatingTOC 展示用 toc.ts 列表、跳转用 parseMarkdownBlocks 列表，两套标题检测正则有差异，存在索引错位风险
- **决策**：① 大文档（行数 ≥ virtualThreshold）App 跳过 extractTOC，store tocItems 置空；② ReadingArea 移除自有的全文 parseMarkdownBlocks，virtualTocItems 改由 VirtualMarkdownView 经 onTocReady 上行（chunked 初始解析覆盖 5000~20000 行，绝大多数文档即完整）；③ FloatingTOC 新增 items 注入属性，虚拟模式下展示与跳转共用同一份列表
- **验证**：lint 通过；待实机验证（大小文档 TOC 显示/跳转/高亮、chunked 渐进 TOC）
- **已知取舍**：toc.ts 的中文标题 fallback（「第一章 / 一、」等，仅在没有 Markdown 标题时触发）在大文档下不再生效；如遇真实场景再将 fallback 下沉为共享模块

## DEC-032: 阅读区按需常驻（活动 + 固定 + 最近 3 个 Tab）

- **日期**：2026-10-17
- **背景**：审计 M3——所有 Tab 的 ReadingArea 常驻挂载，各持解析结果与完整 DOM，内存随 Tab 数线性增长
- **决策**：常驻窗口 = 最近活动的 3 个 + 全部固定 Tab；超出者卸载阅读区，切回时经 percentageCache 恢复滚动位置
- **验证**：lint 通过；待多 Tab 大文档实测（切换流畅度、滚动恢复）
- **已知取舍**：非常驻 Tab 切回需重新解析与渲染（首次切换有成本）；固定 Tab 永远常驻，不受上限约束

## DEC-033: Mermaid 升级 12.2.0 并钉 dagre + classic

- **日期**：2026-10-17
- **背景**：mermaid 停留在 11.16.1；12.x 带来 mindmap 尺寸/居中修复（#8390/#8409）、泳道 DOM id 作用域化（#8161）、序列图解析修复、错误信息可读性等。评估确认 12.0.0 的破坏性变更（ELK 默认布局、默认主题 redux-color + neo 外观、移除 defaultRenderer）中前两项会影响本项目全部图表
- **决策**：① mermaid 11.16.1 → 12.2.0，@mermaid-js/mermaid-zenuml 0.2.3 → 1.0.1（peer 已支持 ^12，导出形态仍为 default，注册代码兼容）；② 两处 `mermaid.initialize`（阅读 + 导出）钉 `layout: "dagre"` + `look: "classic"`，冻结 12.0 的默认布局/外观变更——本项目三层主题适配与 SVG 后处理按 11.x 的 DOM 结构校准，ELK/neo 的尝鲜另行单独评估；③ 已知代价并已在变更日志声明：新引擎要求 Safari 17.4+，macOS 12 Monterey（2021）起正常，macOS 11 Big Sur（2020）及更早图表不可用（用户确认 macOS 用户量少，接受降级；minimumSystemVersion 暂维持 10.15 不变）；mermaid chunk 6MB → 8.2MB（ELK 内置且无法从标准包导入剔除，动态加载，gzip 约 2.2MB），`chunkSizeWarningLimit` 调至 8500
- **验证**：lint 0 错误、tsc 通过、vitest 24/24、vite build 通过（无 chunk 警告）；ZenUML 注册与导出形态已核查兼容
- **待办**：14 主题 × 图表类型视觉回归需用户实机确认（MarkdownSyntaxExample.md 全图表走查）；通过后再走一轮 vibe-distill 更新 experience/mermaid 的版本前提

## DEC-035: 主题色板契约重构（三层分权 + 源色表 + 图表四层 + 对比度门禁）

- **日期**：2026-10-18
- **背景**：用户提出从第一性原理审查配色体系——14 套主题手写约 60 变量漂移不可控；cyberpunk 类主题高彩度/发光长读疲劳（用户实证）；图表 fill 与文字色无绑定，实测暗色下思维导图 18 个彩色节点对比度无一达 4.5:1；导出公众号要求内联字面量。经两轮可视化对比（思维导图配色规则、正文元素分界）与用户逐屏确认（均选 A）
- **决策**：完整方案见 `docs/theme-token-contract-design.md`（待评审）。核心：① 三层分权（UI 外壳高唤醒 / 正文画布低唤醒 / 代码高亮保留 VS Code 原配）；② 标题为主题身份主战场，六级保留色相但过 ≥4.5:1 护栏；功能位（链接/行内代码/表头/引用/序号）带色过护栏，正文与分隔线近中性；③ 图表色板扩第四层 text-on-fill-N，类别色相封顶 6（仅限承载文字的并置类别）、层级用明度；④ 每主题只交源色（画布阶/墨色阶/主强调/标题色阶/代码原配），其余规则推导；⑤ 对比度门禁进 vitest（解析 CSS 源文本 + 自实现 WCAG，不新增依赖）；⑥ 第一阶段 = 契约表 + 公式 + 门禁 + light/dark 基准，完成即停
- **验证**：设计文档经独立 builder 检查（7 问，6 问已在项目约束内定断并记录于文档第 11 节）；1 项开放问题（派生色构建期生成 vs 运行时注入）待用户定夺后进入计划阶段
- **已知取舍**：门禁不覆盖 UI 外壳（D1 授权高唤醒，显式豁免清单）；主题文件可能变为生成物（取决于开放问题的答案，需为 AGENTS.md「禁整文件重写」开生成物例外）

## DEC-036: 主题契约第一阶段落地（源色表 + 生成器 + 门禁 + mindmap 接线）

- **日期**：2026-10-18
- **背景**：DEC-035 的设计经用户批准（派生色构建期生成，方案 A）后，按 `docs/superpowers/plans/2026-10-18-theme-token-contract.md` 以 subagent-driven 方式实施第一阶段（实现内联 + 每任务独立评审，因环境无通用实现型 subagent，裁定 R6）
- **决策落地**：① `scripts/theme/`：color-science（WCAG/OKLCH/text-on-fill/tuneForContrast，12 单测）+ sources（light/dark 源色表，现行值全量转录）+ generate-themes（派生全部 token，`--check` 供 CI）；② light/dark 改为 GENERATED 生成物（108/155 tokens），AGENTS.md 开生成物例外并登记 changelog；③ 三级测试门禁：源色表结构、生成物消费完整性（无兜底消费 ⊆ 定义 ∪ 豁免）+ 黄金往返、CI 对比度门禁（正文 ≥7:1，标题/图表文字 ≥4.5:1，反例守卫实证可抓红）；④ 思维导图接线：节点背景=cScale=fill + 文字=同索引 text-on-fill，连线色经 SVG 后处理按 `.section-edge-k` 覆盖为 stroke（渲染器连线实际由 cScale 上色，cScaleInv/lineColor 在 classic 外观下视觉无效——反编译实证）
- **验证**：lint 0 错误、tsc 通过、vitest 98/98、`theme:generate --check` 幂等；每任务经独立评审（Task 1/2/3/5 有修复轮，共裁定 R1-R16）
- **已知取舍/缺口**：① R12 的 divider/table-border 派生在运行时被 theme-derived.css 覆盖（12 套手写主题依赖派生层提供），阶段 3 全部主题生成后收口；② 黄金往返测试不抓源色表自身转录笔误（R15，由 Task 2 独立核对 + 实机验收兜底）；③ 12 套主题仍手写、无 text-on-fill；④ BUG-067（bg-primary 7 处无兜底消费从未定义）已修复并记入 debug-log
- **待办**：light/dark 实机验收（重点：思维导图节点文字可读性与连线鲜明度、六级标题色相、功能位配色）；通过后阶段 2（高刺激组迁移）

## DEC-037: 阶段 2 迁移方式——批量源色表转录 + 逐套门禁接入，仅修正不达标项

- **日期**：2026-10-18（高刺激组四套迁移时定断）
- **背景**：阶段 2 需迁移 cyberpunk / neon-cyberpunk / solar-flare / desert-sunset 四套手写主题。四套的共同问题是六级标题中的 H6（2.78–3.09:1）与部分标题不达 4.5:1；同时它们的 chart-fill 为「统一压暗色」（cyberpunk/desert-sunset 深紫灰、neon 压暗霓虹、solar-flare 暖棕），不承载类别信息
- **决策**：① 迁移按「源色表现行值全量转录 + 填充带实测校准（不抄 CSS 内联 oklch 注释）+ 生成器派生」批量执行，每套配 `.d.ts` 声明；② 画布/墨色/滚动条/图表中性组中继承自族 base 的部分转录为显式值，使生成物自包含；③ 标题仅在实测不达标时才由 tuneForContrast 调校（色相彩度不动、只推明度），达标的一律原样——实测结果：四套中仅 H6（及 neon 的 H3 品红）被调校，其余标题色全部逐字节保留；④ chart-fill 改为按类别色相着色（fillBand 明度/彩度入带），主题鲜明色相保留在 stroke/series 与分支连线上；⑤ 每迁一套即加入对比度门禁的已迁移列表（迁一套、验一套）
- **验证**：四套迁移后对比度门禁全绿；实测前后数据见 project-progress 阶段 2 条目
- **已知取舍**：类别着色使图表节点底色从「统一定制色」变为「类别色相淡/暗色」，这是契约的预期变化（类别用色相、层级用明度），cyberpunk 已由用户实机确认满意；若某套主题希望保留统一定制底色，需为该主题单设 fillBand 例外（当前无此类需求）

## DEC-038: 全量迁移收口（14/14）+ 功能位与灰度随契约扩展

- **日期**：2026-10-18（阶段 3 完成）
- **背景**：阶段 2 后仍有 8 套手写主题；此外设计 §5/§11.3 的 `--list-number` 功能位令牌、§11.6 的灰度导出覆盖表扩展、R14 的分隔线收口均待办
- **决策**：① 按阶段 2 同一流程批量迁移剩余 8 套（aurora / cherry-blossom / falcon / forest / monochrome / ocean / tokyo-night / solarized-light），每套一份源色表 + `.d.ts`，填充带一律按现行值实测校准（不抄 CSS 内联 oklch 注释）；② monochrome 的 `fillBand.c` 固定为 0 以守住「纯灰度」这一主题存在理由（实测生成物 fill 最大彩度 0.000）；③ solarized-light 属亮色族，填充带 L 0.957 / C 0.019——与 dark 族方向相反，同一套派生公式在明暗两模式各自成立；④ 14 套全部生成后从 `theme-derived.css` 移除 `--divider`/`--table-border` 完成 R14 收口；⑤ `--list-number` 按「色相取品牌主色 + 明度调校至 ≥4.5:1」派生（与标题同口径），并加入门禁；⑥ 灰度导出覆盖表补齐 h1/h5/h6（深色主题浅色标题在灰底会不可见）、bg-primary、table-border/border-subtle、chart 填充与文字，描边/序列与代码高亮一样保留主题色
- **验证**：门禁新断言实测抓出 solarized-light 序号色 3.59:1 不达标，改调校派生后达标——功能位色必须过护栏，不能只取原始品牌色。最终 tsc / eslint / vitest 295/295 / `--check` 十四主题一致
- **已知取舍**：`level*Bg` 字段与 `l1..l3-bg` 令牌在旧后处理规则移除后无消费者（保留作色板文档与缓存键敏感项）；`globals.css` 遗留高饱和默认块整体待清理；导出兜底路径 `renderMermaidForExport` 不带 themeVariables（既有问题，仅影响未渲染块的补救路径）

## DEC-034: mindmap 布局按设置放行（radial 默认 / dagre 层级树可选）

- **日期**：2026-10-18
- **背景**：DEC-033 全局钉 `layout: "dagre"` 冻结布局后，用户反馈 6.13 思维导图从升级前的发散放射状变成层级树。核查 12.2.0 源码：mindmap 渲染器仅在顶层 `layout` **未被用户定义**时才启用默认的 `cose-bilkent` 放射布局（`getUserDefinedConfig().layout === undefined` 判断），全局钉 dagre 使该默认失效、mindmap 落入 dagre TB 层级树
- **决策**：新增阅读设置 `ReadingSettings.mindmapLayout`（`"radial" | "tree"`，默认 `"radial"` 即升级前观感），阅读与导出两处 `mermaid.initialize` 对 mindmap 放行 `cose-bilkent`，其余图表维持 dagre 钉定不变；布局参与 MermaidDiagram 缓存键，切换即重渲染
- **验证**：tsc 通过、eslint 无错误、vitest 33/33；两种布局的实际观感与导出一致性待用户实机
- **已知取舍**：cose-bilkent 为 mermaid 动态 import 的独立 chunk（构建自动分包，Tauri 离线可用）；ELK 作第三种布局暂不提供，待需求出现再评估
