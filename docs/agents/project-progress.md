---
title: Project Progress
type: project-progress
project: ErgeMD
updated: 2026-10-17
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
- **下一步**：用户本地验证（`pnpm tauri dev`：多 Tab 搜索/切换、大小文档 TOC、大文档打开速度）→ 提交到 fix/audit-round-1 → 合并 main → 双平台推送
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
