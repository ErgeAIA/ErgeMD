# 优化 YAML Frontmatter 渲染实施计划

## 问题分析

### 当前问题
1. **丢失信息**：现有的 `parseFrontmatter` 函数解析能力弱，无法正确处理复杂 YAML
2. **被误识别为标题**：用户反映 frontmatter 最后一行被错误识别为标题
3. **无法快速编辑**：frontmatter block 没有集成到快速编辑（Quick Edit）系统
4. **UI 简陋**：当前只是把 YAML 以代码块形式展示，不如 Obsidian 或 VSCode 插件的界面美观

## 仓库研究结论

### 现有技术栈
- React 19 + TypeScript
- Markdown 渲染：react-markdown + remark/rehype 插件链
- 快速编辑：useQuickEdit hook + 双击/右键菜单
- 虚拟滚动：@tanstack/react-virtual

### 现有 Frontmatter 实现
- 解析：`src/components/obsidian/ObsidianFrontmatter.tsx` 中的 `parseFrontmatter`
- 渲染：简单的 `<pre>` 标签展示键值对
- Block 类型：`src/types/markdownBlock.ts` 已添加 `"frontmatter"`
- Block 识别：`src/utils/markdownBlocks.ts` 已集成 frontmatter 解析

### 快速编辑系统
- `useQuickEdit` hook 在 `src/hooks/useQuickEdit.ts`
- 每个 block 需要 `data-raw` 属性才能触发快速编辑
- 右键菜单在 `MarkdownBlockView.tsx` 中的右键处理

## 最佳实践

1. **使用 gray-matter**：专业的 YAML frontmatter 解析库，稳健且支持完整 YAML 语法
2. **Obsidian 风格 UI**：结构化渲染（键值对表），而不是代码块
3. **完整集成**：确保 frontmatter block 正确集成到现有系统（快速编辑、主题、样式）

## 实施计划

### 1. 安装 gray-matter
- 使用 `pnpm add gray-matter` 安装专业 YAML frontmatter 解析库
- 替换现有的手写 `parseFrontmatter` 函数

### 2. 重写 ObsidianFrontmatter 组件
- 使用 gray-matter 替换手写解析器
- 从 `<pre>` 代码块风格改为结构化的键值对展示（Obsidian Properties 风格）
- 支持不同值类型的差异化渲染：
  - 字符串：直接显示
  - 数组：以标签/列表形式展示
  - 布尔值：带图标的开关样式
  - 数字：直接显示
  - 嵌套对象：缩进展示
- 美化样式，符合主题系统（使用 CSS 变量）

### 3. 更新 obsidian.css 样式
- 替换 `.obsidian-frontmatter-content` pre 样式
- 添加 `.obsidian-fm-row`、`.obsidian-fm-key`、`.obsidian-fm-value` 等结构化样式
- 添加 `.obsidian-fm-tag` 标签样式（用于数组项）
- 添加 `.obsidian-fm-boolean` 布尔值样式
- 所有颜色使用 CSS 变量

### 4. 集成快速编辑系统
- 确保 frontmatter block 有正确的 `data-raw` 属性
- 在 MarkdownBlockView.tsx 中为 frontmatter block 添加双击编辑和右键菜单支持
- 确保 frontmatter block 的行号正确，编辑后正确更新

### 5. 验证并修复"最后一行被识别为标题"问题
- 检查 markdownBlocks.ts 中的 frontmatter 解析是否正确处理结束标记
- 验证 frontmatter block 后面的内容是否正常解析

### 6. 完整测试验证
- 使用 `docs/Obsidian Markdown 语法测试用例.md` 进行完整测试
- 验证 `pnpm build` 和 `pnpm lint` 通过

## 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `package.json` | 添加 gray-matter 依赖 |
| `src/components/obsidian/ObsidianFrontmatter.tsx` | 重写组件，使用 gray-matter + 结构化 UI |
| `src/components/obsidian/obsidian.css` | 替换 frontmatter 样式为结构化布局 |
| `src/components/reader/MarkdownBlockView.tsx` | 确保 frontmatter 集成快速编辑 |
| `src/components/obsidian/index.ts` | 更新导出（移除 parseFrontmatter 或保留兼容） |

## 潜在风险与注意事项

1. **gray-matter 体积**：gray-matter 约 30KB（含 js-yaml），对桌面应用无影响
2. **现有系统兼容性**：确保修改不影响其他 block 类型的渲染
3. **虚拟滚动**：frontmatter block 在虚拟滚动系统中的正确处理
