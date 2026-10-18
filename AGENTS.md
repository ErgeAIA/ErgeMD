# AGENTS.md

<!-- mode: 已初始化优化 -->

## Permissions

IMPORTANT: ErgeMD 是 Tauri 2 + React 19 桌面 Markdown 阅读器；前端只做 UI 渲染，文件 IO、编码检测、数据库操作必须下沉 Rust 后端
YOU MUST 会话开始先读 docs/agents/ 三件套与 docs/handoff/ 最新一份
YOU MUST 先复述现状与待确认项，再动手
YOU MUST 改码前先读 docs/ErgeMD-pdr.md 与 docs/agents/decision-log.md
YOU MUST 每次会话更新 docs/agents/project-progress.md
YOU MUST 改 AGENTS.md 前先读、改后追加 docs/agents/agents-changelog.md
YOU MUST 改某领域代码前先读 docs/agents/experience/<领域>/（存在时）
YOU MUST 每次只推进一个阶段，完成即停，等用户验证
YOU MUST 在 Trae IDE 工作时先读 .trae/rules/ 下适用规则
禁止自行宣称已修复，修复结果须由用户验证
禁止整文件重写既有文件，只做最小精确补丁
禁止无明确理由新增依赖，禁止混用 pnpm 以外包管理器
禁止修改 .trae/rules/ 与 docs/phase/ 下文件；禁止改 tsconfig.json、vite.config.ts 等构建配置（除非明确授权）
禁止把变更日志、人读说明、决策叙事写进本文件
禁止不记录就改动 AGENTS.md 的约定

## Toolchain

| 工具 | 精确版本 | 锁定位置 |
| ---- | -------- | -------- |
| 包管理 | pnpm@11.16.0 | package.json packageManager |
| 前端框架 | react ^19.2.8 | package.json |
| 桌面框架 | Tauri 2 | package.json / src-tauri/Cargo.toml |
| 类型检查 | TypeScript ~5.8.3 | package.json |
| 测试 | vitest ^3.2.7 | package.json |
| Node（CI） | 22 | .github/workflows/release.yml |
| Rust 工具链（CI） | stable | .github/workflows/release.yml |

## Commands

| 场景 | 命令原文 | 来源 |
| ---- | -------- | ---- |
| 开发 | pnpm dev | package.json |
| Tauri 开发 | pnpm tauri dev | package.json |
| 前端构建 | pnpm build | package.json |
| 预览 | pnpm preview | package.json |
| 代码检查 | pnpm lint | package.json |
| 单元测试 | pnpm test | package.json |
| Rust 测试 | pnpm test:rust | package.json |
| 同步版本 | pnpm sync-version | package.json |
| 打包发布 | pnpm tauri:build | package.json |

## Conventions

| 观察到的现象 | 要求 Agent 的行为 |
| ------------ | ----------------- |
| 会话文档体系固定 | 进度写 docs/agents/project-progress.md；决策写 docs/agents/decision-log.md；两者只追加不删历史 |
| bug 追加 docs/agents/debug-log.md | 格式 BUG-NNN；只追加不删历史 |
| 交接写 docs/handoff | 命名 handoff-YYYY-MM-DD-*.md |
| 交接文档同日多份 | 按文件名里的日期取最新（兼容 YYYY-MM-DD 与 YYYYMMDD）；同日多份再取 frontmatter updated 最新者，仍不可判则列出问用户 |
| 改 docs/agents 或 handoff 须同步 updated | 改完立刻把 frontmatter updated 改为当日 |
| 改 AGENTS.md 须留一行变更记录 | 在 docs/agents/agents-changelog.md 追加「旧值 → 处置 → 去处」，无记录视为静默丢失 |
| 经验库按领域分目录 | 可复用经验落 docs/agents/experience/<领域>/；正文可改写、历史靠 changelog.md，与 docs/agents 其余三份的「只追加」不同 |
| AGENTS.md 杂音归宿 | 变更日志 → CHANGELOG.md（无则 decision-log.md）；人读说明 → README.md（无则不写）；决策叙事与踩坑 → decision-log.md 与 debug-log.md；执行流水 → init-report.md 与 project-progress.md |
| 双平台托管 | 每次 push 必须 git push origin main; git push gitee main；多分支同步所有活跃分支 |
| Git 操作须授权 | commit / push / branch / 删除文件 / 完整构建须经用户明确授权后执行；未经授权禁止 git push --force、git commit --amend、rm -rf、数据库迁移、部署、修改 CI 配置 |
| 跨文件大改前查状态 | 跨 >3 文件或 >100 行变更前先跑 git status 并向用户说明影响范围 |
| 提交信息用 Conventional Commits | type(scope): 描述；type 限 feat / fix / docs / style / refactor / test / chore；中文描述、动词开头、结尾不加句号；按实际 diff 生成，不虚构 |
| 命名规范 | 组件文件 PascalCase；其他文件 camelCase；Rust 命令 snake_case；CSS 变量 kebab-case |
| 类型与 Store 命名 | 一个概念一个名字；类型遵循 docs/agents/naming-consistency-guide.md 命名字典（TabInfo / TocItem / ThemeMode；useFileStore / useReaderStore / useSettingsStore） |
| 前后端严格分离 | 文件 IO、编码检测、数据库操作全部下沉 Rust；页面组件不经底层 invoke，按 页面组件 → business hooks → core hooks → Tauri invoke 调用 |
| Zustand 选择器订阅 | 严禁订阅整个 store |
| React 性能 | 子组件一律 React.memo；计算结果用 useMemo / useCallback 缓存 |
| 动画性能 | 只动画 transform 和 opacity，绝不触发布局重排 |
| 长文档虚拟滚动 | 必须使用 @tanstack/react-virtual |
| 禁 DOM drag 事件 | 文件拖放必须用 Tauri onDragDropEvent，禁 onDragEnter / onDragOver / onDrop |
| 无边框窗口禁 stacking context | 不用 overflow、transform、filter 等会创建 stacking context 的 CSS 属性 |
| 禁合成事件 stopPropagation | 阻止事件传播必须用原生 addEventListener |
| Rust 错误处理 | 禁滥用 unwrap() / expect() / panic；可恢复错误用 Result，可缺省用 Option，优先 ? 传播；Tauri Command 保持薄层 |
| IPC 数据约束 | 单次传输不超过 1000 条记录；大数据分页 / 游标 / 分批；错误用稳定结构，不靠字符串匹配；跨语言字段显式映射（user_id ↔ userId） |
| 包管理器唯一 | 只用 pnpm；禁 npm / yarn / bun；不手动改 pnpm-lock.yaml |
| 新增依赖核对许可证 | 许可证须与 AGPL-3.0 兼容，警惕强 copyleft 许可证混入 |
| 本地打包需签名私钥 | 构建前设置 TAURI_SIGNING_PRIVATE_KEY（CI 由 GitHub secret 注入）；私钥丢失后已装客户端无法接收更新 |
| 打包产物命名 | 独立包 src-tauri/target/release/ErgeMD-v{x}.exe；安装包 src-tauri/target/release/bundle/nsis/ErgeMD-v{x}-setup.exe |
| 版本号变更必须打 Tag | tag 严格为 v{x.y.z}，与 package.json / Cargo.toml / tauri.conf.json 一致，双平台推送；仅文档 / 重构 / 内部调整且版本未变则不打 Tag |
| 预发布版本 Tag | 用 v{x.y.z}-rc.N / v{x.y.z}-beta.N 形式，同样双平台推送 |
| 发布流程固定 | 升三处版本号 → 更新 CHANGELOG.md 与 CHANGELOG.en.md → 核对 README 下载链接 → commit → 双平台 push → git tag v{x.y.z} 双推 → 等 CI 发版 → Gitee 手动建发行版 |
| 写文件方式 | 仅允许 SearchReplace / Write 工具；禁 Set-Content、sed -i、echo > 等 shell 写入；含中文文件禁整文件重写。**生成物例外**：`src/styles/themes/*.css` 中标注 `GENERATED` 的文件由 `pnpm theme:generate` 脚本重写，人工修改必须走源色表 `scripts/theme/sources/*.js`；一致性由 `pnpm theme:generate:check` 校验 |
| 提交前检查 README | 已完成功能的 TODO 标 [x]；新版本核对 README 下载链接版本号（口径 package.json > Cargo.toml > README.md） |
| 修改先读最新内容 | 改任何文件前先读最新内容，禁基于缓存或记忆修改；old_str 多处匹配时停下问用户 |
| 未验证须声明 | 未跑验证命令不得声称「已通过」；不确定内容标「待验证」或「需人工审查」 |

## References

- 会话开始复述现状 → 见 docs/agents/project-progress.md：当前分支、阶段与最近进展
- 核对最近交接 → 见 docs/handoff/：上一轮做到哪、卡在哪
- 规则冲突、回溯口径 → 见 docs/agents/decision-log.md：技术与流程决策记录，只追加
- 反复踩坑排查 → 见 docs/agents/debug-log.md：BUG-NNN 格式的根因与预防规则（全本汇编归档于 docs/agents/error-log-archive.md）
- 查 AGENTS 自身变更 → 见 docs/agents/agents-changelog.md：契约改动的「旧值 → 处置 → 新值」
- 同领域可复用做法 → 见 docs/agents/experience/：按领域分的可复用经验沉淀
- 接手任务定位代码文件 → 见 docs/agents/project-overview.md：关键文件路径索引、目录结构与发布 Tag 明细
- 报需求或查产品定位 → 见 docs/ErgeMD-pdr.md：产品需求文档
- 查项目介绍与下载 → 见 README.md：功能特性、下载与使用指南
- 查版本更新记录 → 见 CHANGELOG.md 与 CHANGELOG.en.md：版本更新日志
- 查技术规格 → 见 docs/agents/TECH-SPEC.md：技术规格文档（2026-05 期历史规格，改动前以代码与 decision-log 为准）
- 查阶段计划 → 见 docs/phase/：各阶段计划文件（只读禁改）
- Trae IDE 规则 → 见 .trae/rules/：IDE 级编码、安全与流程规则（只读禁改）

## Self-Maintenance

1. 改变规则的 PR 须同步改本文件，否则视为规则漂移
2. 规则写入错误发生处最近作用域，monorepo 进对应子包
3. 命令更名、重构后，提交前核对本文件并更新过期示例
4. 随发布或固定周期清除失效条目
5. 本文件修改走 PR/Review，与代码同等纪律
