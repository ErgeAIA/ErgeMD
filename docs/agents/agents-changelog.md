---
title: AGENTS.md Changelog
type: agents-changelog
project: ErgeMD
updated: 2026-10-18
description: >
  AGENTS.md 的变更记录，AGENTS.md 每改动一次就追加一行，不随日常开发更新。
  只追加，不删除或改写历史。AI 在本文件新增或修改任何条目后，必须同步更新 frontmatter 的 updated 字段为当日日期（YYYY-MM-DD）。
---

# AGENTS.md Changelog

## 2026-10-18 主题色板契约（DEC-035）配套例外

- `<Conventions「写文件方式」> → append → <新增「生成物例外」句：src/styles/themes/*.css 中标注 GENERATED 的文件由 pnpm theme:generate 脚本重写，人工修改必须走源色表 scripts/theme/sources/*.js，一致性由 pnpm theme:generate:check 校验>`

> **AGENTS.md 每改动一次，必须在此追加一行**；无对应记录即视为静默丢失。
> 模式：已初始化优化（初始化状态机 D：AGENTS.md 与 CLAUDE.md 并存，含受控迁移）
> 来源文件：AGENTS.md（旧，207 行）、CLAUDE.md（272 行）
> 格式：一行一条 `<旧值> → keep|update|drop|merge → <新值/去处/原因>`

---

## 2026-10-17 vibe-init 迁移处置（30 条：keep 11 / update 5 / merge 5 / relocate 4 / drop 5）

### CLAUDE.md 来源（7 条）

- `<CLAUDE.md 全文「关键文件路径索引」（约 190 行表格）> → relocate → <docs/agents/project-overview.md「关键文件索引」节；AGENTS.md References 留指针，源文件随迁移删除>`
- `<发布与 Tag 约定全节> → merge → <AGENTS.md Conventions 5 行（打 Tag 时机 / 命名一致 / 双平台推送 / 预发布形式 / 固定发布流程）；完整明细附录于 docs/agents/project-overview.md>`
- `<「最近打开记录的状态在 WelcomePage 组件内 useState 管理，未抽到 store」> → relocate → <docs/agents/project-overview.md 状态管理备注>`
- `<文档表格 TECH-SPEC 路径 ./docs/TECH-SPEC.md> → update → <docs/.ai/TECH-SPEC.md；实测文件在 docs/.ai/ 下，旧路径失效>`
- `<文档表格 ERROR_LOG 路径 ./ERROR_LOG.md> → update → <docs/.ai/ERROR_LOG.md；实测文件在 docs/.ai/ 下，旧路径失效>`
- `<CLAUDE.md 文件头「本文件是 AGENTS.md 的补充……」自述> → drop → <源文件整体迁移后删除，自述无保留价值>`
- `<CLAUDE.md 作为项目级协作契约存在> → drop → <受控迁移完成且安全闸全过后删除源文件，AGENTS.md 为唯一契约源>`

### 旧 AGENTS.md 来源（23 条）

- `<标题「ErgeMD 项目 AI 档案」+ 头部引言块（agentsmd.io 链接、「本文件用于指导 AI Agent……」）> → drop → <N2 人读说明，项目介绍以 README.md 为准；AGENTS.md 改用规范六节结构>`
- `<头部「关键文件路径索引：见 CLAUDE.md」> → update → <References 指针「接手任务定位代码文件 → 见 docs/agents/project-overview.md」>`
- `<头部「项目介绍 / 技术栈 / 架构决策：见 README.md」> → relocate → <References 指针「查项目介绍与下载 → 见 README.md」>`
- `<关键命令表 7 行> → keep → <Commands 节并补「来源」列；按 package.json 实测新增 pnpm test、pnpm test:rust 两行>`
- `<打包产物路径说明> → merge → <Conventions 行「打包产物命名」>`
- `<TAURI_SIGNING_PRIVATE_KEY 说明> → merge → <Conventions 行「本地打包需签名私钥」>`
- `<双平台 Remote 配置表（origin / gitee URL）> → drop → <N6 去重：URL 以 git remote 实际配置为准，不占 A 层上下文>`
- `<双平台「推送到已配置的 remote → AI 可自行执行」> → update → <与「Git 操作必须先询问」冲突；按实际协作（用户每次显式授权）统一为「Git 操作须经用户明确授权后执行」，见 decision-log.md DEC-001>`
- `<双平台「Tag 推送规范见 CLAUDE.md」> → update → <CLAUDE.md 内容已迁移，改为本文 Conventions「版本号变更必须打 Tag」等行>`
- `<安全边界「AI 可自行执行 / 必须先询问 / 禁止操作」> → keep → <Permissions 与 Conventions「Git 操作须授权」行>`
- `<编码规范·命名规范 4 条> → keep → <Conventions 行「命名规范」>`
- `<编码规范·必须遵循 6 条（前后端分离 / Zustand / memo / 动画 / 虚拟滚动）> → keep → <Conventions 5 行>`
- `<编码规范·禁止操作 3 条（DOM drag / stacking context / stopPropagation）> → keep → <Conventions 3 行>`
- `<禁止修改的文件（.trae/rules/、docs/phase/、构建配置）> → keep → <Permissions 禁止行 + References 只读标注>`
- `<文件写入规范铁律（SearchReplace / Write）> → keep → <Conventions 行「写文件方式」；与 .trae/rules/file-write-safety.md 同源，A 层保留一处>`
- `<不确定即问> → keep → <Conventions 行「修改先读最新内容」+ Permissions 常驻纪律>`
- `<项目结构简要目录树 + 构建脚本 + 参考文档列表> → relocate → <docs/agents/project-overview.md「目录结构」节；参考文档改 References 条件式指针>`
- `<协作规则·本地 IDE 场景 3 条> → keep → <Permissions（一阶段一停等验证 / 先读后改）>`
- `<协作规则·高风险操作前必须询问（跨 >3 文件或 >100 行查 git status）> → keep → <Conventions 行「跨文件大改前查状态」>`
- `<协作规则·预提交检查清单 3 节> → merge → <Conventions 行「提交前检查 README」>`
- `<「最后更新：2026-06-04」> → drop → <N4 日期化标注，过程文档 frontmatter 已承担该职责>`
- `<新增依赖许可证约束> → merge → <Conventions 行「新增依赖核对 AGPL-3.0 兼容」；依据 LICENSE（AGPL-3.0）与 .trae/rules/dependency-management.md>`
- `<全文件重组为六节结构（Permissions / Toolchain / Commands / Conventions / References / Self-Maintenance）> → merge → <受控迁移允许的重组；上列 29 条逐条处置即本次重组依据>`

### .trae/rules/ 来源（21 份规则文件）

- `<21 份规则文件整体> → keep 原地保留 → <AGENTS.md References 指针 + Permissions「Trae IDE 工作时先读」一行纳入生效链；文件本身禁改>`
- `<dependency-management.md「必须使用项目指定的包管理器和版本」> → merge → <Conventions 行「包管理器唯一」>`
- `<git-commit-message.md Conventional Commits 规范> → merge → <Conventions 行「提交信息用 Conventional Commits」>`
- `<cross-language-constraints.md Rust 错误处理与 IPC 约束> → merge → <Conventions 行「Rust 错误处理」「IPC 数据约束」>`
- `<anti-hallucination.md / execution-audit.md 未验证声明要求> → merge → <Conventions 行「未验证须声明」>`

## 2026-10-17 历史同步处置（docs/.ai → docs/agents）

- `<References「查开发错误经验 → 见 docs/.ai/ERROR_LOG.md」> → update → <见 docs/agents/debug-log.md；ERROR_LOG 53 节已同步为 BUG-001~053，原文归档 docs/.ai/ERROR_LOG.md>`
- `<References 新增「查历史经验档案」指针> → merge → <docs/.ai/session-lessons/：8 份技术选型与架构决策经验档案，待蒸馏进 experience/>`
- `<Conventions 新增「类型与 Store 命名」行> → merge → <命名字典规则自 docs/.ai/naming-consistency-guide.md 并入 A 层（DEC-030）>`
- `<docs/.ai 历史档案无登记> → merge → <project-overview.md 新增「历史档案」节，8 项遗留文档逐条登记活跃对应>`
- `<decision-log.md 无历史决策> → merge → <追加 DEC-002~DEC-030，源自 context-handover 7 份 / session-snapshots / session-lessons / 命名规范；日期照源文件实录，未标注的不编造>`
- `<debug-log.md 无历史 bug> → merge → <追加 BUG-001~BUG-058，源自 ERROR_LOG.md 53 节 + 20260601-01 交接事故表 5 条>`
- `<References 出现两条指向 debug-log.md 的近似行> → merge → <N6 去重：合并为「反复踩坑排查」一行并附归档说明，「查开发错误经验」行删除>`

## 2026-10-17 docs/.ai 资产蒸馏与迁移处置

- `<References「查开发错误经验」行内归档路径 docs/.ai/ERROR_LOG.md> → update → <docs/agents/error-log-archive.md；ERROR_LOG 全本已迁入 docs/agents/>`
- `<References「查技术规格 → docs/.ai/TECH-SPEC.md」> → update → <docs/agents/TECH-SPEC.md；文件已迁入，并标注为 2026-05 期历史规格>`
- `<References「查历史经验档案 → docs/.ai/session-lessons/」> → drop → <session-lessons 已蒸馏进 docs/agents/experience/（5 域 28 条），原指针被「同领域可复用做法 → experience/」覆盖，N6 去重>`
- `<Conventions「类型与 Store 命名」行内路径 docs/.ai/naming-consistency-guide.md> → update → <docs/agents/naming-consistency-guide.md；文件已迁入>`
- `<project-overview.md「历史档案」节> → update → <改写为「文档归档与迁移」终态：3 份已迁入 / 3 类内容已蒸馏同步 / 2 份有意不迁移及理由>`
- `<project-progress.md 当前状态> → update → <反映蒸馏与迁移完成；新增「已知未决事项」表 5 条（SVG 导出横线 / Event Modeling / Mermaid CJK / portable 命名 / macOS x64），自历史交接文档回收>`
- `<experience/ 为空目录> → merge → <首轮蒸馏建成 5 域 28 条（🔴12 / 🟡11 / 🟢5），台账见 experience/changelog.md>`
