---
title: 主题色板契约重构设计（Theme Token Contract）
type: design
project: ErgeMD
updated: 2026-10-18
status: 已批准（2026-10-18 用户选定方案 A）
description: >
  从第一性原理重构 ErgeMD 主题配色体系：三层分权、源色契约表、图表四层色板
  （新增 text-on-fill）、对比度硬指标，使 14 套主题的切换、适配与公众号导出
  共用同一张可测量、可推导的 token 表。
---

# 主题色板契约重构设计

- **日期**：2026-10-18
- **状态**：待评审（讨论阶段结论已与用户逐屏确认：思维导图配色规则 A、正文元素分界 A）
- **关联决策**：DEC-033（mermaid 12 升级并钉 dagre + classic）、DEC-034（mindmap 布局按设置放行）

## 1. 意图与为什么

**现状问题**（均来自代码勘查与实机截图，非臆测）：

1. 14 套主题各自手写约 60 个变量，同名 token 在不同主题间漂移，无法逐一套验；
2. cyberpunk / neon-cyberpunk 类主题高彩度 + 发光元素，短看有冲击力，长阅读疲劳（用户实证："时间长了看着就累眼"）；
3. 图表色板 fill/stroke/series 三层中，**承载文字的 fill 与文字色无绑定关系**——实测思维导图 18 个彩色节点在暗色主题下**无一达到 WCAG 4.5:1**（最低 1.8:1）；
4. 六级标题五色相中，亮色主题下 H3–H6 三个不达标（3.4–4.0:1）、行内代码 4.3:1、链接与表头压线；
5. 导出目标（公众号）只认内联样式，要求每个 token 在导出时可解析为字面量颜色——手写漂移的变量表无法支撑。

**目标状态**：主题 = 少量**源色** + 固定**推导规则**；切换主题、适配新主题、导出到公众号共用同一张契约表；可读性是硬指标而非审美话术。

## 2. 目标 / 非目标 / 反目标

**目标**：
- G1 对比度硬指标进 CI：正文 ≥ 7:1（现状 12.6:1 保持）；标题、功能位、图表文字 ≥ 4.5:1；大字标题兜底 ≥ 3:1
- G2 主题个性保留在正确位置：标题色相、功能位色、图表类别色；正文与结构性装饰近中性
- G3 每套主题只交源色（画布/墨色/主强调/标题色阶/代码原配），其余全部推导，漂移只可能来自源色
- G4 同一张契约表同时服务阅读渲染与 HTML 导出（公众号）
- G5 图表类别色相封顶 6，层级用明度阶梯，新增 text-on-fill-N 色层。**封顶语义**：指同一图表中并置且**承载文字**的可区分类别上限（如思维导图一级分支、流程节点填充）；纯数据序列（pie 扇区、radar 曲线等不承载文字、靠位置/面积区分的场景）保留 series-0..7 不设此上限，但其上一旦承载文字（sankey showValues、treemap 叶子、象限点标签），同样受 text-on-fill 约束

**非目标**：不改组件库与 Rust 后端；不新增运行时依赖；不做主题编辑器/主题市场；不重写既有图表 DOM 适配层（32 个 mermaid 映射文件只换取值来源）。

**反目标**：
- 把 14 套主题统一成一套中性皮肤（杀死主题存在的意义）
- 用手写覆盖代替规则（漂移复发，回到现状）
- 为暗色模式单独写一套公式（双维护必然分叉）

## 3. 约束

- CSS 变量体系：`[data-theme="..."]` 作用域 + globals.css 按层导入（base → theme → derived → markdown/mermaid 映射）
- 注入点固定：`MermaidDiagram.tsx` 两处 `mermaid.initialize`（阅读路径 + `renderMermaidForExport` 导出路径，DEC-034 已建立同源先例）
- 导出链路：`exportStyles.ts` 的 `collectAllCssVariables` 全量收集 + markdown.css 内联；公众号编辑器只认内联样式，**颜色需可解析为 rgb/hex 字面量**（oklch/color-mix 派生值在导出时必须落地为字面量）
- AGENTS.md：前端只做 UI 渲染；最小精确补丁禁整文件重写；仅 pnpm；每阶段完成即停等用户验证
- 14 套主题迁移必须逐套经用户实机抽查，禁止批量宣称完成

## 4. 已定设计决策（讨论结论，含理由）

**D1 三层分权（按停留时长分配唤醒度）**
- UI 外壳（标题栏/侧栏/按钮）：主题个性全保留，可高唤醒——停留短，要辨识度
- 正文画布（标题/段落/表格/引用/列表）：低唤醒——一次停留几十分钟
- 代码高亮：保留 VS Code 出身原配语法色；仅容器（背景/边框/行号）按画布规则校准
- 理由：唤醒度应与停留时长成反比；代码区行短、密度高、着色即信息，与长文正文视觉科学不同

**D2 标题 = 主题身份主战场**
- 六级标题保留多色相（每主题 6 色），但每色必须过对比度护栏（≥ 4.5:1 于画布上）
- 理由：彩色文本的阅读成本随字号增大显著下降；大号标题彩色的辨识代价小到可忽略，收益（层级身份、主题相、扫读导航）大

**D3 功能位带色，正文中性**
- 带主题色且过护栏：链接、行内代码（底+字）、表头（底+字）、引用边框、列表序号
- 近中性不漂移：正文墨色、分割线、表格线（按画布固定明度差推导，不进手写表）
- 发光（glow / text-shadow）从正文与图表全部移除，仅保留在外壳

**D4 图表色板四层**
- fill-N（承载文字）/ stroke-N（边框连线）/ series-N（数据序列）/ **text-on-fill-N（新增）**
- 类别用色相（封顶 6），层级用明度（父子同色相，深度只调明度）
- 连线、边界、轴线用中性色，不与域填充抢视觉

**D5 源色契约表**：每套主题只提供五组源色——画布阶（3–4 阶）、墨色阶、主强调色相、标题色阶（6）、代码高亮原配。其余 token 全部规则推导。

**D6 对比度硬指标**：正文 ≥ 7:1；标题/功能位/图表文字 ≥ 4.5:1；大字标题兜底 ≥ 3:1；连线不设文字门槛。

**D7 导出同源**：阅读与导出共用契约表；`renderMermaidForExport` 已按同一设置渲染（DEC-034 先例），导出色 = 阅读色。

## 5. Token 契约表（规范草案）

| 分组 | Token（例） | 用途 | 来源 | 对比度要求 |
| --- | --- | --- | --- | --- |
| 画布族 | bg-page / bg-reader / bg-sidebar / bg-code | 各级容器背景 | 源色·画布阶 | — |
| 墨色族 | text-primary / secondary / muted / heading | 正文与标题墨色 | 源色·墨色阶 | primary ≥ 7:1，secondary ≥ 4.5:1 |
| 标题族 | h1-color … h6-color | 六级标题 | 源色·标题色阶（推导调校） | ≥ 4.5:1 |
| 功能位族 | link / inline-code-bg+text / table-header-bg+text / blockquote-border / list-number | 链接、行内代码、表头、引用、序号 | 主强调色相推导 | ≥ 4.5:1 |
| 图表四层 | chart-fill-N / chart-stroke-N / chart-series-N / **chart-text-on-fill-N** | 图表填充/描边/序列/填充上文字 | fill 源色推导；text-on-fill 公式选定 | 填充上文字 ≥ 4.5:1（大字 ≥ 3:1） |
| 装饰族 | divider / table-border / border-subtle | 分割线、表格线 | 画布明度 ±4–6% 推导 | 不设文字门槛 |

> **已知缺口（2026-10-18，评审发现）**：`theme-derived.css` 的导入顺序晚于主题文件且选择器特异性相同，它对全部 14 套主题重新定义了 `--divider`/`--table-border`——因此本契约生成物中的这两个派生值在**运行时被派生层覆盖**（`border-subtle` 派生层未定义，已生效）。12 套手写主题自身均不定义这三个 token（派生层是它们的唯一来源），现阶段从派生层移除会破坏它们，故推迟到阶段 3 处理：全部主题生成后，从派生层移除这三个 token（或改为「主题文件已定义则不覆盖」）。阶段 1 无回归：运行时观感与改动前完全一致。
| 代码族 | code-keyword / string / number / comment / function | 语法高亮 | 源色·代码原配（VS Code 出身） | 代码文字 ≥ 4.5:1（原配已校准的除外，逐套校验） |

## 6. 推导规则（公式草案，常数待定）

- **明度阶梯**：沿用现有 OKLCH 注释体系（fill L 85–95 / stroke C 0.12–0.18 / series C 0.15–0.22 等分带），暗色模式镜像翻转
- **text-on-fill-N**：按 fill-N 相对亮度自动选墨——`luminance(fill) > T ? 深墨 : 浅墨`（T ≈ 0.4，由校验脚本回归确定）
- **标题色**：主强调色相 ±30° 内取 6 色；冲突时**彩度优先保、明度让位**（向背景方向压明度直至达标）
- **图表层级**：每深一级 ΔL ≈ 8–10%，同色相内推进，不引入新色相
- **装饰线**：与画布保持固定明度差 4–6%

## 7. 14 套主题迁移顺序

1. **light**（亮色模式公式基准）
2. **dark / tokyo-night**（暗色模式公式基准）
3. **高刺激组**：cyberpunk、neon-cyberpunk、solar-flare、desert-sunset（洗刺激、保色相——用户最关心的组）
4. **低刺激组**：monochrome、solarized-light、forest、ocean
5. **其余**：aurora、cherry-blossom、falcon

每步流程：填源色 → 跑对比度校验 → 用户实机抽查（MarkdownSyntaxExample.md 全图表 + 正文元素）→ 通过再下一套。

## 8. 验证方式（把可读性变成门禁）

- **自动**：vitest 新增主题对比度测试。机制为**解析主题 CSS 源文本**（jsdom 不加载样式表、不解析 `var()`，无法用 getComputedStyle 读变量）：正则提取每套主题 `[data-theme]` 块内的 `--token: #hex` 字面量，测试内自实现 WCAG 相对亮度与对比度计算（不新增依赖），对「承载文字的 token × 其所在画布背景」逐组合断言。非颜色值（`--accent-*-rgb` 三元组、`linear-gradient`）不参与断言，按字面量类型跳过
- **断言范围**：正文画布（markdown.css 消费的 token × bg-reader/bg-code）+ 图表四层中承载文字处（fill-N × text-on-fill-N、series-N 承载文字处）。UI 外壳（标题栏/侧栏/按钮/TOC 装饰）按 D1 授权高唤醒，不进门禁，但以豁免清单显式列出，避免"漏测"与"放行"混淆
- **视觉**：14 主题 × 测试文档全图表走查（延续现有回归习惯）
- **导出**：每主题导出一份 HTML，核对内联样式为字面量颜色，并实测公众号编辑器粘贴效果；灰度导出（`GRAYSCALE_OVERRIDES`）的覆盖表随契约表同步扩展，新增 token 必须进覆盖清单，灰度模式同样受对比度契约

## 9. 留给 builder 的决定

- 全部阈值常数（ΔL、色相夹角、luminance 阈值 T、装饰线明度差）
- 源色表最终字段命名与在主题 CSS 中的落位（如 `--src-canvas-1` 前缀区）
- 对比度测试的放置位置与运行方式（建议 `src/styles/__tests__/theme-contrast.test.ts`）
- 既有 `--chart-fill-N` 等值的改写策略：公式重算后逐套微调，还是公式生成即定稿
- oklch/color-mix 派生值在导出时的字面量落地机制（导出链路已有 collectAllCssVariables，需确认其能否解析计算值）

## 11. Builder 检查处置（2026-10-18，审阅者为未接触讨论的独立 agent）

检查共提出 7 问，处置如下。标注「我的决定」者为设计者在项目约束内自行定断并写入文档；「待用户定夺」者见文末开放问题。

1. **text-on-fill 服务范围与 N 的取值**（原问：只解决思维导图还是所有 fill 消费者；N 沿用 8 还是砍到 6）
   → 我的决定：text-on-fill-N 覆盖**所有承载文字的填充**（mindmap/timeline/zenuml/wardley/usecase/treeview/treemap leaf 等全部适配器），N 沿用现有 `--chart-fill-0..7` 八个槽位不删槽（删除会连锁破坏 -6/-7 引用与 treemap/quadrant/radar 的枚举）；G5 的"封顶 6"按前述语义执行。series 上承载文字处（sankey 数值、treemap 叶子、象限点）同样纳入。
2. **门禁边界**（原问：只管正文画布还是全部 token）
   → 我的决定：门禁 = 正文画布 token × 画布背景 + 图表四层承载文字处；外壳变量显式豁免清单（D1 已授权高唤醒）。
3. **契约表未列 token 的处置**（原问：bg-secondary/tertiary、surface-1..3、edge、text-muted、callout-13、rgb 三元组等）
   → 我的决定：`--accent-*-rgb`/`--brand-*-rgb` 保留，由源色 hex 机械转换生成（theme-derived.css 的 rgba 合成不断链）；surface/edge/text-muted 归入推导规则（画布阶与墨色阶的机械派生）；`--obsidian-callout-*` 13 色归语义状态族，全主题统一（不随主题漂移，语义色要求一致）；`list-number` 为**新增 token**（代码中不存在，需 markdown.css 落地 ol/ul 序号着色）；其余未列 token 在迁移中逐套登记"删除 / 推导 / 保留为源色"三选一，不允许无登记存活。
4. **推导执行层**（原问：构建期生成还是运行时计算）
   → **待用户定夺**，见第 12 节。
5. **CI 校验机制**（原问：jsdom 读不到 CSS 变量）
   → 我的决定：解析 CSS 源文本 + 测试内自实现 WCAG 计算，不新增依赖（AGENTS.md 约束）；已在第 8 节改写。
6. **灰度导出范围**
   → 我的决定：纳入。GRAYSCALE_OVERRIDES 随契约表同步扩展，新增 token 必须进覆盖清单；灰度模式同样受对比度契约。
7. **阶段边界与不达标放行规则**
   → 我的决定：第一阶段交付 = 契约表 + 推导规则 + CI 门禁 + light/dark 两套基准主题，完成后即停等用户验收（AGENTS.md 每阶段一停）；某套主题公式下不达标时，**公式强制压明度优先**（护栏是硬指标），若出现主题辨识度塌陷，回修该主题源色而不是破门禁或登记豁免。

## 12. 开放问题决议（2026-10-18）

**派生颜色在哪儿计算：方案 A——构建期生成。**（用户 2026-10-18 选定）

- 一个构建脚本（Node，随包脚本运行，如 `pnpm theme:generate`）读每套主题的**源色表**，按第 6 节公式计算全部派生 token，生成字面量 CSS
- 14 个主题文件从"手写源"变为"生成物"：文件头标注 `GENERATED — 请改源色表，勿手改`；源色表单独存放（如 `src/styles/themes/sources/<theme>.ts`），是唯一手写处
- **AGENTS.md 例外**：「禁止整文件重写既有文件」对生成物不适用——生成物只能由脚本重写，人工编辑走源色表；该例外须写入 AGENTS.md 并登记 agents-changelog.md（实施阶段落实）
- CI 增加"生成物与脚本输出一致"校验（`theme:generate --check`），防止手改漂移
- 导出链路天然获得字面量颜色（公众号内联样式要求）；无首屏闪烁

## 13. 实施阶段划分（供计划使用）

- **阶段 1**：源色表结构 + 生成脚本 + 推导公式（text-on-fill、标题调校、装饰线、surface/edge 派生）+ CI 门禁（vitest 解析 CSS 源文本断言对比度）+ light/dark 两套基准主题生成与验收。完成即停
- **阶段 2**：cyberpunk / neon-cyberpunk / solar-flare / desert-sunset 高刺激组迁移（洗刺激保色相）
- **阶段 3**：其余 10 套迁移 + 灰度导出覆盖表扩展 + 全主题导出实测 + **收口第 5 节「已知缺口」**（全部主题生成后，从 `theme-derived.css` 移除 divider/table-border/border-subtle 或改为「主题文件已定义则不覆盖」，使统一派生在运行时生效）

## 10. 关联文档

- DEC-033 / DEC-034（decision-log.md）
- `src/components/reader/MermaidDiagram.tsx`（两处 initialize）
- `src/utils/exportStyles.ts`（导出变量收集）
- `src/styles/themes/`（14 主题 + core 五文件 + mermaid 32 映射）
- `docs/TestCase/MarkdownSyntaxExample.md`（31 图表验收样例）
- `docs/agents/experience/mermaid/theme-variables.md`（既有经验）
