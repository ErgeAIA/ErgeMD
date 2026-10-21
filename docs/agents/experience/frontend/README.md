# frontend 域 — React 19 + TypeScript + CSS

> 技术栈前提：React 19 + TypeScript + Zustand 5 + Tailwind v4 + CSS 变量主题体系。
> 条目清单见 [react-patterns.md](./react-patterns.md) 与 [css-layout.md](./css-layout.md)。

| # | 标题 | 级别 | 文件 |
|---|---|---|---|
| F1 | useEffect 依赖闭环致无限循环 | 🔴 | react-patterns.md |
| F2 | 合成事件与原生事件传播 | 🔴 | react-patterns.md |
| F3 | 虚拟列表阅读位置与滚动回调治理 | 🟡 | react-patterns.md |
| F4 | hooks 依赖与状态更新性能 | 🟡 | react-patterns.md |
| F5 | 内联样式不响应 CSS 变量 | 🔴 | react-patterns.md |
| F6 | Portal / 渲染器 hooks / persist merge | 🟡 | react-patterns.md |
| F7 | flex 滚动、zIndex 层级、Tailwind 迁移 | 🟢 | css-layout.md |
| F8 | token 消费完整性门禁 | 🔴 | theme-tokens.md |
| F9 | 派生色按对比度调校到阈值边界 | 🟡 | theme-tokens.md |
| F10 | 主题存在理由优先于机制统一 | 🟡 | theme-tokens.md |
| F11 | CSS 派生层导入顺序陷阱 | 🟡 | theme-tokens.md |
| F12 | 图表 hover 纯 CSS 高亮 | 🟡 | interaction.md |
| F16 | hover 目标必须核对 DOM 结构与遮挡关系 | 🟡 | interaction.md |
| F13 | 默认映射层用 :where() 降特异性 | 🟡 | theme-tokens.md |
| F14 | CSS 注释内 `*/` 吞后续声明 | 🟡 | theme-tokens.md |
| F15 | 颜色决策必须留在 token 层 | 🔴 | theme-tokens.md |
