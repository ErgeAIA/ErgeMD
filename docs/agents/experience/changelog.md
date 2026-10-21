---
title: 经验库变更日志
type: experience-changelog
project: ErgeMD
updated: 2026-10-20
description: >
  每轮蒸馏一条：原料、覆盖主题、产出与有意跳过；兼作蒸馏台账，用于避免重复蒸馏。
  AI 在本文件新增或修改任何条目后，必须同步更新 frontmatter 的 updated 字段为当日日期（YYYY-MM-DD）。
---

# 变更日志与蒸馏台账

> 每轮蒸馏追加一条，**兼台账**：写新条目之前先读本文件，比对本轮原料是否已蒸过。
> 只追加，不删除历史。

---

## 2026-10-17 · 首轮：docs/.ai 历史资产全量蒸馏

- **原料**：`docs/.ai/ERROR_LOG.md` 全本 53 节（最后编辑 2026-06-14）；`docs/.ai/session-lessons/01~08.md` 全 8 份；`docs/.ai/context-handover/` 7 份；`docs/.ai/session-snapshots/20260509-01.md`；`docs/.ai/naming-consistency-guide.md`；`docs/agents/debug-log.md` BUG-001~058；`docs/agents/decision-log.md` DEC-001~030（首次蒸馏，原料为工作区归档文件，非 commit 区间）
- **覆盖主题**：mermaid（themeVariables / SVG 后处理 / 图表变量 / 缓存）；tauri（无边框窗口 / IPC / CSP / 文件关联）；frontend（hooks 治理 / 事件 / 内联样式 / 布局）；markdown（块解析 / 标题渲染 / 导出）；workflow（CI 排查 / 交付校对 / 先读后写 / 提交规范）
- **产出**：新建 5 个域（mermaid / tauri / frontend / markdown / workflow）共 28 条（🔴12 / 🟡11 / 🟢5）；主索引 README 含 R1~R11 红线速查
- **有意跳过**：
  - `docs/.ai/2026-05-20-obsidian-compatibility.md`——已完成的实施计划，模块已落地于 `src/components/obsidian/`，用户明确表示不需要
  - `docs/.ai/obsidian-floating-toc-technical-analysis.md`——对外部插件 obsidian-floating-toc-plugin 的调研；本项目 TOC 已自主实现并历经 Phase 15~18 重构（DEC-019 / BUG-028/029/039 / lessons 03 已覆盖其有价值部分），可迁移设计模式已被自研方案取代
  - `docs/.ai/context-handover/` 与 `session-snapshots/` 原文件——内容已同步进 decision-log / project-progress，属会话级历史记录，不复制原件
  - ERROR_LOG.md 中已进 AGENTS.md Conventions 的规则——A 层已收，经验条目只留指针不复述

---

## 2026-10-19 · 第二轮：主题令牌契约重构 + mermaid 12.2.0 升级 + hover 高亮

- **原料**：`docs/agents/decision-log.md` DEC-033/034/035/036/037/038；`docs/agents/debug-log.md` BUG-067/068；commit `e21b1c6..c189dca`；代码 `scripts/theme/*`、`src/styles/__tests__/theme-*.test.ts`、`src/components/reader/mermaidHoverCss.ts`
- **覆盖主题**：frontend（主题令牌 / 配色工程 / 交互动效）；mermaid（渲染缓存版本键）；workflow（对比度门禁 / 迁移纪律）
- **产出**：新增 2 个域条目文件（`frontend/theme-tokens.md` F8~F11、`frontend/interaction.md` F12、`mermaid/theme-variables.md` 追加 M7）+ `workflow/engineering-discipline.md` 追加 W6/W7，共 8 条（🔴3 / 🟡5）；主索引 🔴 速查扩至 R13
- **有意跳过**：
  - mindmap 全局钉 `layout` 让默认放射布局失效（DEC-034）——mermaid 配置参数，M5 已含「钉 classic」，不 portable
  - 灰度导出覆盖表随契约令牌集同步（DEC-038）——导出管线专项，被 F8「令牌完整性」精神覆盖，不单独蒸馏
  - 派生色构建期生成 + `--check` 幂等校验（DEC-036/038）——机制细节，已并入 F8/F9 的做法
  - mermaid 12.2.0 钉 `dagre`+`classic`（DEC-033）——版本参数，M5 已知 Bug 清单已含
  - 视觉验收不可替代（用户实机验证）——W4「未验证声明」+ AGENTS.md 已覆盖

## 2026-10-19 · 第三轮：ER 图 mermaid ≥11 键名换代修复

- **原料**：`docs/agents/debug-log.md` BUG-069；代码 `src/components/reader/MermaidDiagram.tsx`；mermaid 12.2.0 dist 检索记录
- **覆盖主题**：mermaid（官方键核实方法论）
- **产出**：`mermaid/theme-variables.md` M3 速查表 ER 行改写为 v2 渲染器官方键 + 新增 M8（「注入前先在 dist 检索键名」方法论 + ER v2 键清单）
- **有意跳过**：architecture / packet / venn 的 themeVariables 补齐——官方键已探明（architecture 走统一渲染器 `mainBkg`/`nodeBorder` 系；packet 消费 `packet.*` 配置组，默认值派生自 `primaryTextColor`/`background`；venn 消费 `vennTitleTextColor` 等专属键），留待下一阶段按 M3/M8 方法论实施；M2 的 ER 示例保留（方法论仍有效，仅示例不再对应 ER 现状，已由 M8 注明 ER 回归 themeVariables 路径）

## 2026-10-19 · 第四轮：全类型 themeVariables 键名换正（BUG-070 批量死键清理）

- **原料**：`docs/agents/debug-log.md` BUG-070；mermaid 12.2.0 各类型懒加载 chunk 的样式模板提取（journeyDiagram / quadrantDiagram / gitGraphDiagram / timeline-definition / kanban-definition / sankeyDiagram / requirementDiagram / blockDiagram / vennDiagram / architectureDiagram / diagram-* 等）
- **覆盖主题**：mermaid（M3 速查表全量修订 + chunk 内样式模板提取方法论）
- **产出**：`mermaid/theme-variables.md` M3 速查表扩至 15 行——按类型给出官方键清单与死键名单；新增「packet / c4 / zenuml：themeVariables 不适用」与「全类型连线标签 edgeLabelBackground」两行
- **方法论增量**：各类型为独立懒加载 chunk（3 份构建变体取其一即可），在 chunk 内定位 `getStyles` 模板串读 `options.*` 键；用正则 `/<类型前缀>[A-Z]\w+/g` 全文枚举可快速确认该类型是否有专属主题键（有专属键前缀但无 Color 键 → 通用键组）
- **有意跳过**：sankey 节点色/流量带、architecture 服务节点填充、packet 配色——由 config 组控制（themeVariables 无键）；C4 / ZenUML 维持既有结论（源码样式 / 后处理）

## 2026-10-19 · 第五轮：Cynefin/象限四分区底色取主题状态色

- **原料**：用户实机对比官方 Cynefin 渲染后拍板「四分区背景色选主题色板的状态色」；代码 `MermaidDiagram.tsx` readableTextOnFill 助手、`mermaid-cynefin.css` / `mermaid-quadrant.css`
- **覆盖主题**：mermaid（状态色作图表填充时的文字对比度自动选取）
- **产出**：`mermaid/theme-variables.md` M3 速查表新增 cynefin 行 + quadrant 行补状态色与文字自动选取说明
- **有意跳过**：sankey 节点色/流量带、architecture 服务节点填充（config 组，无 themeVariables 键）；为混乱中心圆单拆文字色——五域底色同属一个明度类（亮色主题全深、暗色主题全中亮），单一选取值可通吃，拆键只会增加维护面

## 2026-10-19 · 第六轮：gitGraph/Requirement 品牌化 + 象限/Cynefin 暗色文字对比度

- **原料**：用户实机报告 6.10/6.11「品牌色识别错误 变青色」、6.9 象限暗色文字糊；代码 `MermaidDiagram.tsx` 的 gitgraph SVG 后处理补丁、`mixToward` 助手
- **覆盖主题**：mermaid（品牌系列色注入 + 后处理 `!important` 范围控制 + 状态色填充暗色加深）
- **产出**：gitGraph 注入 `git0~7` 改取 `chart-series-0~7`（主分支/提交点=品牌橙），后处理删除 over-broad `.gitGraph path,.gitGraph line{stroke:branchColors[0]}` 压色规则、改为逐分支着色；requirement 关系线 `relationColor` 取 `chart-series-0`（橙）；象限/Cynefin 暗色下用 `mixToward(画布色, 状态色, 0.45)` 向画布加深填充使白字达 AA；新增 `mixToward` 助手
- **验证方法论**：node + jsdom 真渲染 mermaid（补 `getBBox`/`getComputedTextLength` 桩、自解析 `var()` 链），可突破「键是否生效 / 实际填充色」的静态分析盲区——实测 gitGraph light 主分支=#FF6A2B、象限 dark 白字对比度>5:1、kanban 基础主题对比度 19:1/5.7:1
- **有意跳过**：kanban 「文字不清晰」在基础主题无法复现（疑 v39 前旧构建缓存回退 mermaid 默认深蓝/紫填充），待用户重建确认；其余同第五轮

---

## 2026-10-20 · 第七轮：思维导图配色回归 token 契约（BUG-077 全链路）

- **原料**：`docs/agents/debug-log.md` BUG-077 全链路（含「元凶」「定稿」「第三重坑」三段）；commit `c189dca..工作区（未提交）`；代码 `scripts/theme/generate-themes.js`（text-muted 调校、mindmapHues 生成与底色调校）、`scripts/theme/sources/dark.js` / `light.js`（mindmapHues）、`src/components/reader/MermaidDiagram.tsx`（brand/depth 档 token 化、`getMermaidThemeSignature`、缓存 `_version`）、`src/styles/themes/core/mermaid/mermaid-mindmap.css`（`:where()` 与注释修正）、`src/styles/__tests__/theme-contrast.test.ts`（mindmap 色板门禁）；真浏览器探针（复刻 app 的 `theme:"base"` / `look:"classic"` / `colorBy`）实测记录
- **覆盖主题**：mermaid（缓存纪律扩展 / 派生色被覆盖 / 文字载体 / colorBy）；frontend（`:where()` 特异性 / 注释 `*/` / 颜色决策留 token 层）；workflow（诚实性红线 / 排查优先级）
- **产出**：**修订 1 条**——M7 由「引擎升级 bump」扩展为「任何渲染产出变更必须 bump + 缓存签名必须纳入全部影响产出的 token」；**新增 8 条**——M9（🔴 派生色被主题基类无条件重写）、M10（🟡 文字载体可能是 HTML span）、M11（🟡 mindmap `colorBy:"depth"` 按层级分色）、F13（🟡 `:where()` 降特异性，与 F11 适用条件不同并存）、F14（🟡 CSS 注释内 `*/` 吞声明）、F15（🔴 颜色决策必须留在 token 层）、W8（🔴 读不到的内容禁止编造）、W9（🔴 「改了没效果」先查缓存与覆盖）。主索引 🔴 速查扩至 R17
- **与既有条目的关系**：F11（同特异性后声明者胜）已覆盖原理，本轮 F13 是**不同适用条件下的第二种解法**（F11：派生层删重复声明；F13：默认层包 `:where()` 让覆盖生效），两条并存并各自标注；M7 属正文修订，旧结论（引擎升级 bump）仍保留在新正文内
- **有意跳过**：
  - `readableTextOnFillStrict` 的三选优取墨（深墨 / 白 / 黑）——最终方案已不用它做 mindmap 取墨（回归 `pickTextColor` token 配对），且 F9 已覆盖「调校到阈值边界」的方法论，该函数只剩 depth 档与象限/Cynefin 消费，无独立可迁移结论
  - 霓虹赛博等主题的 `chart-stroke` 纯原色刺眼——已由 F15「色板按画布明暗分化」与 F10「主题身份优先」覆盖，不单列
  - 14 套主题 `text-muted`（text-dim）由生成器 `tuneForContrast` 收口至 ≥4.5——F9 的既有做法在新 token 上的复用，非新结论
  - `themeSignature` 的具体 token 清单与缓存 `_version` 当前值（v47）——项目参数，已并入 M7 的 How
  - 「ThemeVault 是唯一权威色源」等既有项目约定——已在 AGENTS.md / 决策记录中，经验库不复述

---

## 2026-10-20 · 增量：hover 目标取证方法论（F16）

- **原料**：2026-10-20「思维导图字号层级递增 + 12 类图表 hover 补齐」开发轮；`mermaidHoverCss.ts` 14→33 项选择器；从 `docs/TestCase/MarkdownSyntaxExample.md` 提取真实示例渲染 dump DOM（类名+元素标签+父子结构）；真浏览器 `elementFromPoint` 网格采样 + `page.mouse.move` 实测
- **覆盖主题**：frontend/interaction（F16 新增）
- **产出**：新增 F16（hover 目标必须核对 DOM 结构与遮挡关系：优先选含文字的完整组、分类容器不作 target、被遮挡形状补同级入口、`:hover` 须真实鼠标触发）
- **有意跳过**：
  - mindmap 字号层级递增的具体数值（18/16/15/14/13）——项目参数，且「图形尺寸按原字号测量、只放大中心一级配换行保护」的结论依赖 mermaid 的测量机制，不 portable
  - 细线/空心几何（xychart 折线、gitGraph 箭头与分支线）命中精度受限——已在 F16 的 How 里作为注意事项，不单列条目
  - esbuild 打包 mermaid 为 IIFE 用于真浏览器验证——一次性验证手段，非稳定做法
