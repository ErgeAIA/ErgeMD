---
title: 可复用经验库
type: experience-index
project: ErgeMD
updated: 2026-10-19
description: >
  从本项目开发过程蒸馏出的可复用经验总索引。
  AI 在本文件新增或修改任何条目后，必须同步更新 frontmatter 的 updated 字段为当日日期（YYYY-MM-DD）。
---

# 可复用经验库

> 从本项目开发过程蒸馏而来。条目分三级：🔴 红线（任何项目成立）/ 🟡 倾向（风格偏好，按语境采纳）/ 🟢 参数（仅本项目，**换项目必须替换**）。
> 维护：`vibe-distill`；修订记 [changelog.md](./changelog.md)。

## 适用范围

本批经验来自 **Tauri 2 + React 19 + TypeScript + Mermaid 11.x + Rust（SQLite）桌面应用**，约束：无边框窗口、14 主题 CSS 变量体系、react-markdown 块级渲染 + 虚拟滚动、前后端严格分离。换项目时必须重新判定：Mermaid 版本差异、Tauri 版本差异、渲染架构（是否块级/虚拟滚动）、主题方案。

## 使用步骤

1. 先看下方「🔴 速查」——红线问题优先修
2. 按主题进 `<域>/README.md` 取该域条目清单
3. 命中 🟢 参数时，先核对是否适用于当前技术栈，不适用就替换，**不盲抄**

## 🔴 速查

| # | 红线 | 详见 |
|---|---|---|
| R1 | 无边框窗口禁用创建 stacking context 的 CSS 属性与 DOM drag 事件 | 见 `tauri/desktop-runtime.md` TA1 |
| R2 | invoke 参数名必须与 Rust 签名逐字一致；禁止 `.catch(() => {})` 吞错 | 见 `tauri/desktop-runtime.md` TA2 |
| R3 | Tauri CSP 每个 `*-src` 必须显式声明协议；dev 通过 ≠ build 通过 | 见 `tauri/desktop-runtime.md` TA3 |
| R4 | Mermaid 自定义主题必须 `base` 主题 + themeVariables，亮色设 `darkMode: false`；CSS 变量不生效须传实际色值 | 见 `mermaid/theme-variables.md` M1 |
| R5 | Mermaid themeVariables 失效时用 SVG 后处理注入 scoped CSS；覆盖第三方样式前先读其源码 | 见 `mermaid/theme-variables.md` M2 |
| R6 | useEffect 内 setState 依赖数组变量 = 无限循环，用 ref 打破闭环 | 见 `frontend/react-patterns.md` F1 |
| R7 | React 合成事件 stopPropagation 不阻止原生事件传播；wheel 拦截须原生监听 + `passive: false` | 见 `frontend/react-patterns.md` F2 |
| R8 | React 内联样式不随 CSS 变量变化重渲染，主题相关样式必须用 CSS 类选择器 | 见 `frontend/react-patterns.md` F5 |
| R9 | 导出链路独立管线，不复用含虚拟滚动的阅读组件；内容从 store 取不查 DOM | 见 `markdown/render-export.md` MD1 |
| R10 | CI 失败先拉完整日志看每步耗时，0s 完成的步骤必有问题；同一症状打补丁不超过 2 次 | 见 `workflow/engineering-discipline.md` W1 |
| R11 | 写代码前读本地文件确认接口，禁止凭文档或记忆猜测 | 见 `workflow/engineering-discipline.md` W3 |
| R12 | 对比度/可读性硬约束必须进自动化门禁（vitest 自实现 WCAG），不能靠人眼验收 | 见 `workflow/engineering-discipline.md` W6 |
| R13 | 设计令牌无兜底消费必须 ⊆（主题定义 ∪ 非主题 CSS 定义），否则门禁拦截 | 见 `frontend/theme-tokens.md` F8 |

## 主题索引

| 主题 | 内容 | 条目数 |
|---|---|---|
| mermaid | Mermaid 图表主题适配：themeVariables、SVG 后处理、图表类型变量、缓存 | 🔴2 / 🟡4 / 🟢1 |
| tauri | Tauri 桌面运行时：无边框窗口、IPC、CSP、文件关联、签名 | 🔴3 / 🟡1 / 🟢1 |
| frontend | React 19 + TS + CSS：hooks 治理、事件、样式、主题令牌、交互 | 🔴4 / 🟡5 / 🟢1 |
| markdown | Markdown 渲染与导出：块解析、表格、标题、PNG/PDF 导出 | 🔴1 / 🟡3 / 🟢1 |
| workflow | 工程纪律：CI 排查、交付校对、先读后写、提交规范、门禁 | 🔴4 / 🟡2 / 🟢1 |

## 外送汇总的前置条件

本目录可作为基料交给外部知识系统蒸馏。为保证对方能解析，**每条必须齐全**：

- 主张 / 适用 / Why / How / 反例
- 事实源：commit 区间、`DEC-NNN`、`BUG-NNN` 或实测数字

**不入汇总的**：

- 🟢 参数——数值只对当前项目成立，进汇总会污染其它项目
- 项目名、绝对路径、账号等可识别信息
