# mermaid 域 — Mermaid 图表主题适配

> 技术栈前提：Mermaid 12.x（已钉 `dagre`+`classic` 保留 11.x 渲染观感）+ 14 主题 CSS 变量体系 + Tauri WebView。
> 条目清单与速查见 [theme-variables.md](./theme-variables.md)。

| # | 标题 | 级别 |
|---|---|---|
| M1 | base 主题 + themeVariables + darkMode | 🔴 |
| M2 | themeVariables 失效时用 SVG 后处理 | 🔴 |
| M3 | 图表类型主题变量速查 | 🟡 |
| M4 | 三层适配架构与缓存版本号 | 🟡 |
| M5 | 已知 Mermaid Bug 清单 | 🟢 |
| M6 | 思维导图配色专项 | 🟡 |
| M7 | 渲染引擎升级必须 bump 自建缓存版本键 | 🟡 |
