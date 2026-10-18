# workflow/engineering-discipline — 工程纪律经验

## W1: CI 失败排查方法论 🔴

- **主张**：CI 失败后第一步是拉完整日志（`gh run view <run-id> --log`）看每个步骤的耗时与输出；耗时 0s/极短的 build/test 步骤几乎一定有问题；下游脚本的「找不到文件」常是上游没跑的副作用；同一症状打补丁不超过 2 次，超过就回到根因分析。
- **适用**：任何 CI/CD 环境，尤其是使用第三方 Action 的项目。
- **Why**：错误信息只是表象；本项目曾 5+ 次根据报错文本猜「路径写错了」，实际是 `tauri-action@v0` 根本没跑 build（步骤 0.13s 完成），全部补丁打在错误的地方。
- **How**：拉日志 → 看每步耗时 → 搜 `Compiling`/`Finished release` 确认真的跑了 → 搜 `Cannot find` 定位错误 → 查 target 目录 → 查 artifact 列表；第三方 action 行为不确定时，放弃它改用显式命令（`pnpm tauri build`）。
- **反例**：本地 `cargo build` 通过就以为 CI 修复了——本地命令 ≠ CI 里第三方 action 的内部行为（BUG-051）。
- **事实源**：BUG-051；DEC-029

## W2: 交付物与真实产物校对 🔴

- **主张**：写面向用户的下载链接/产物清单前，必须先列出真实产物（`gh release view <tag> --json assets`）再落笔；链接名 ≠ 真实文件名 = 404；CI 矩阵决定 asset 列表，文档不能做超集承诺（CI 没编译 x64，就不能写「通用 dmg」）。
- **适用**：README/文档中的下载区、发布说明、任何「承诺产物」的文本。
- **Why**：文档是「设计稿」而 CI 是「实现」，二者漂移就会产生 404；用户下载后发现不兼容比没有链接更糟。
- **How**：发布后先 `gh release view --json assets` 核对；README 每个链接 1:1 对应真实 asset；架构缺口要么补 CI，要么诚实标注，要么删链接。
- **反例**：README 写 `ErgeMD-v0.4.1-macos.dmg` 而 CI 只产 aarch64 包；`-macos.app.tar.gz` 链接存在但打包脚本从不打 tar.gz（BUG-052）。
- **事实源**：BUG-052

## W3: 先读后写，本地代码优先 🔴

- **主张**：生成任何代码前必须先读本地文件确认接口、导入方式、参数名与 props；文档中的代码不能直接用；未读取到的信息不得当作事实输出；修改既有文件前必须读最新内容，重要文档禁止用 Write 直接覆盖。
- **适用**：所有 AI 协作开发场景。
- **Why**：凭文档/记忆猜接口会产生「调了不存在的方法」这类静默错误；本项目曾因未读本地 `useAutoHide.ts` 而使用不存在的 `hideDelay` 参数；上千行的 ERROR_LOG 曾被 Write 误覆盖。
- **How**：动手前 Read 目标文件与相邻调用方；对不上就停下问；`old_str` 多处匹配时停下确认。
- **反例**：`hideDelay` 不存在、TitleBar 缺 transition（BUG-008）；ERROR_LOG.md 被覆盖（lessons 05 坑 6）。
- **事实源**：BUG-008；lessons 05；AGENTS.md Conventions

## W4: 提交信息与未验证声明 🟡

- **主张**：提交信息遵循 Conventional Commits（type 限 feat/fix/docs/style/refactor/test/chore，中文描述、动词开头、结尾不加句号），必须按实际 diff 生成；未运行验证命令不得声称「已通过」「已修复」，推测必须标注「待验证」或「需人工审查」。
- **适用**：所有提交与交付物。
- **Why**：虚构变更的提交信息污染历史；「应该可以」式断言会让用户跳过真实验证，把 Bug 留到线上。
- **How**：commit 前看 diff；交付前列未验证项；让用户本地验证作为闭环。
- **反例**：`chore: update files` 式提交；没跑测试就说「已修复」（用户后续实测才发现问题）。
- **事实源**：`.trae/rules/git-commit-message.md`；`execution-audit.md`；AGENTS.md Conventions

## W5: 命名一致性与双平台推送 🟢

- **主张**：① 一个概念一个名字——建立命名字典并全局遵守（本项目：`TabInfo`/`TocItem`/`ThemeMode`；`useFileStore`/`useReaderStore`/`useSettingsStore`；跨语言字段显式映射 `user_id ↔ userId`）；② 本项目双托管 GitHub + Gitee，每次 push 与 tag 必须双平台同步；tag 严格 `v{x.y.z}` 且与三处版本号一致，仅文档/重构未升版本则不打 tag。
- **适用**：① 通用（多 AI/多开发者协作的项目尤其）；② 仅本项目的仓库配置，换项目替换 remote 与规则。
- **Why**：同义词漂移让搜索与重构失效；单平台推送导致另一平台 release 工作流不触发或用户找不到版本。
- **How**：命名先查 `docs/agents/naming-consistency-guide.md` 字典；推送用 `git push origin main; git push gitee main`。
- **反例**：`Tab`/`TabInfo` 混用；tag 只推了 GitHub，Gitee 用户找不到新版本。
- **事实源**：DEC-030；AGENTS.md Conventions

## W6: 对比度/可读性硬约束必须进自动化门禁 🔴

- **主张**：设计契约里能用数值判定的硬性约束（如 WCAG 对比度阈值 4.5:1）必须写成自动化门禁（vitest），用自实现对比度计算（不新增依赖），而非靠人眼验收；门禁按主题逐个接入（迁一套、验一套），比一次性全量断言更符合渐进迁移。
- **适用**：任何有「设计令牌 + 多主题 + 可读性要求」的项目；尤其主题体系正在渐进迁移时。
- **Why**：人眼无法稳定判断 4.5:1 边界附近的对比度，且多主题下逐一肉眼核对成本极高、必漏；本次 14 主题全量实测即抓出 forest（`chart-fill-4`×`chart-text` 4.02:1）与 solar-flare（`chart-fill-5`×`chart-text` 4.19:1）两个漏网者，以及 solarized-light 列表序号色 3.59:1（低于 4.5 门槛）。门禁把「主观好看」变成「可重跑的客观断言」。
- **How**：在 `src/styles/__tests__/theme-contrast.test.ts` 内自实现相对亮度 + 对比度公式（不引第三方），解析每个主题的 CSS 变量，算出「承载文字的填充 / 文字色」对比度并 `expect(ratio).toBeGreaterThanOrEqual(4.5)`；`src/styles/__tests__/theme-generate.test.ts` 内同类门禁守护派生令牌的自洽性。CI 跑 `pnpm test` 即覆盖。
- **反例**：只测基准主题（light/dark）就宣布「全部达标」——实则 forest/solar-flare 等卫星主题填充与文字对比度落门槛下，长期未被发现（BUG-068）；手写色板时期 Fill 明度带未按对比度校准，迁移后才由门禁暴露。
- **事实源**：BUG-067、BUG-068；DEC-035/036/037/038；`src/styles/__tests__/theme-contrast.test.ts`、`theme-generate.test.ts`

## W7: 迁移只修不达标项、其余逐字节保留 🟡

- **主张**：把既有体系（主题 / 配置 / 样式）迁移到新契约时，只修正「实测不达标」的项，达标的项逐字节保留、不重写源码；用生成器从源色表派生，避免手工批量替换引入新漂移。
- **适用**：主题色板、配置 schema、样式令牌等「有黄金源、需多产物派生」的迁移。
- **Why**：全量重写既引入无谓 diff，又可能把原本达标的项改坏（本次若手工替换 14 套主题的填充，极可能重蹈 BUG-060 的「修复漂移」）；逐字节保留让 review 聚焦在真正变化的少数 token 上。
- **How**：`scripts/theme/generate-themes.js` 以 `scripts/theme/sources/<theme>.js` 为唯一源，light/dark 生成物只补「契约要求但源色表缺」的派生令牌（如 `bg-primary` 别名到 `canvas.secondary`），其余源色逐字节透传；CI `pnpm theme:generate:check` 校验生成物与源一致（幂等）。
- **反例**：一次性把 14 套主题全部重写填充值 → diff 爆炸、引入新不一致、review 无从下手（同类教训见 BUG-060 重复实现致修复漂移）。
- **事实源**：DEC-037、DEC-038；`scripts/theme/generate-themes.js`
