---
title: 经验库变更日志
type: experience-changelog
project: ErgeMD
updated: 2026-10-17
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
