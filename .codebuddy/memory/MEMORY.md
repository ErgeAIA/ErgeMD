# MEMORY.md（长期记忆）

## 设计系统约定（ErgeMD）
- 代码/等宽字体唯一来源：`--font-mono`（定义于 `src/styles/globals.css` `:root`），值为系统原生等宽栈 `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`。所有代码块/图表内联字体必须引用 `var(--font-mono)`，禁止散写 `'JetBrains Mono'...`。
- 主题系统为自定义 CSS 变量体系（非 Tailwind 默认映射）：`bg-primary/10`、`text-primary` 等需显式定义变量/工具类（见 memory ID 53760055）。`:root` 与 `[data-theme]` 优先级相同，新增全局变量放 `:root` 即可（主题文件不覆盖的变量安全）。
- 字体策略：不打包任何前端字体（含 CJK），全部系统回退，保持 dist 干净。
