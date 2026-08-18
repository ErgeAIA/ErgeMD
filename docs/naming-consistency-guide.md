# 命名一致性规范 — AI 协作防坑指南

> 本文档总结了 ErgeMD 项目开发中遇到的命名不一致问题及预防措施。
> 在新项目的 brainstorming/design 阶段，应将本文档作为上下文提供给 AI。

---

## 1. 核心原则

**一个概念，一个名字，全局唯一。**

在生成任何代码之前，必须先建立「命名字典」，所有 AI agent 和开发者必须严格遵守。

---

## 2. 必须在设计阶段完成的命名清单

在写第一行代码之前，以下清单必须全部填写：

### 2.1 类型命名字典

| 概念 | 类型名 | 字段列表 | 备注 |
|------|--------|---------|------|
| 标签页 | `TabInfo` | `id, file_path, file_name, content, word_count` | 不用 `Tab` |
| 阅读进度 | `ReadingProgress` | `file_path, scroll_percentage, last_read_at, word_count` | |
| 最近文件 | `RecentFile` | `file_path, file_name, opened_at` | |
| 文件树节点 | `FileNode` | `name, path, is_dir, children` | |
| TOC 条目 | `TocItem` | `id, level, text` | 不用 `TOCItem` |
| 主题模式 | `ThemeMode` | `"cyberpunk" \| "dark" \| "light" \| "system"` | 不用 `Theme` |
| 语言 | `Language` | `"zh-CN" \| "en-US" \| "auto"` | 不用内联联合类型 |
| 阅读设置 | `ReadingSettings` | （按需列出） | |

### 2.2 Store 命名字典

| Store | 名称 | 管理的状态 |
|-------|------|-----------|
| 文件状态 | `useFileStore` | 标签页、工作区、文件内容缓存 |
| 阅读状态 | `useReaderStore` | 进度、TOC、搜索 |
| 设置状态 | `useSettingsStore` | 主题、字体、语言 |

### 2.3 Tauri Command 命名字典

| Command 名 | 参数（snake_case） | 返回类型 | 备注 |
|------------|-------------------|---------|------|
| `read_file` | `path: String` | `ReadFileResult` | |
| `write_file` | `path, content` | `()` | |
| `scan_workspace` | `folder_path: String` | `Vec<FileNode>` | |
| `save_reading_progress` | `file_path, scroll_percentage, word_count` | `()` | |
| `get_reading_progress` | `file_path` | `Option<ReadingProgress>` | |
| `add_recent_file` | `file_path, file_name` | `()` | |
| `get_recent_files` | `limit: Option<i64>` | `Vec<RecentFile>` | |
| `get_setting` | `key` | `Option<String>` | |
| `save_setting` | `key, value` | `()` | |

---

## 3. Tauri 项目的特殊坑

### 3.1 invoke 参数必须用 snake_case

Tauri 2 的 `#[command]` 宏使用 Rust 的 snake_case 命名。前端 `invoke()` 调用时，**参数名必须与 Rust 端完全一致**，Tauri 不会自动转换 camelCase。

```typescript
// ❌ 错误 — Rust 端收不到参数
await invoke("save_reading_progress", {
  filePath,        // Rust 期望 file_path
  scrollPercentage, // Rust 期望 scroll_percentage
  wordCount         // Rust 期望 word_count
});

// ✅ 正确
await invoke("save_reading_progress", {
  file_path,
  scroll_percentage,
  word_count
});
```

### 3.2 TypeScript 类型字段命名

TypeScript 类型定义中的字段名建议使用 **snake_case**，与 Rust 后端保持一致，减少心智负担：

```typescript
// ✅ 推荐 — 与 Rust 对齐
interface TabInfo {
  file_path: string;
  file_name: string;
  word_count: number;
}

// ❌ 不推荐 — 需要手动转换
interface TabInfo {
  filePath: string;   // invoke 时还要转成 file_path
  fileName: string;
  wordCount: number;
}
```

### 3.3 TypeScript 局部变量可以用 camelCase

函数参数、局部变量等非类型定义的场景，正常使用 camelCase：

```typescript
// ✅ 局部变量用 camelCase
const handleOpenFile = async (filePath?: string) => {
  const selectedPath = filePath;
  await invoke("read_file", { path: selectedPath }); // invoke 参数用 snake_case
};
```

---

## 4. AI 协作防坑清单

在让 AI 生成代码之前，确保以下内容已作为上下文提供：

- [ ] **命名字典**（第 2 节的完整清单）
- [ ] **Tauri invoke 参数规范**（第 3.1 节）
- [ ] **字段命名规范**（第 3.2 节）
- [ ] **已有代码的类型定义文件**（`types/index.ts`）

### 给 AI 的 Prompt 模板

在生成新阶段的代码时，在 prompt 中加入：

```
命名规范（必须严格遵守）：
1. 所有类型名、字段名、Store 名、Command 名以以下命名字典为准：[附命名字典]
2. Tauri invoke() 调用的参数名必须使用 snake_case，与 Rust 后端完全一致
3. TypeScript 类型定义中的字段名使用 snake_case
4. 禁止创建命名字典中不存在的类型别名（如用 Tab 代替 TabInfo）
```

---

## 5. ErgeMD 项目踩坑记录

| 问题 | 根因 | 修复 |
|------|------|------|
| `Tab` vs `TabInfo` | Phase 1 手写用 `TabInfo`，Phase 2 AI 生成用 `Tab` | 统一为 `TabInfo` |
| `TOCItem` vs `TocItem` | 大小写风格不一致 | 统一为 `TocItem`（驼峰，非全大写缩写） |
| `Theme` vs `ThemeMode` | Phase 5 AI 生成简写 | 统一为 `ThemeMode` |
| invoke 参数 camelCase | AI 默认用 JS 风格 | 全部改为 snake_case |
| `Tab.isActive` 多余字段 | Phase 2 AI 自作主张添加 | 删除，用 `word_count` 替代 |
| `FileContent` vs `ReadFileResult` | Phase 2 AI 自定义类型与 Rust 不一致 | 统一为 `ReadFileResult` |
| Language `"system"` vs `"auto"` | 值语义混淆 | `ThemeMode` 用 `"system"`，`Language` 用 `"auto"` |
| `contain: layout` 阻止滚动 | CSS contain 属性副作用 | 阅读区域不使用 contain |
| `window.__TAURI__` 不存在 | Tauri 2 改为 `__TAURI_INTERNALS__` | 删除 isTauri 守卫 |
| `rehype-pretty-code` 异步崩溃 | 与 React 19 同步渲染冲突 | 改用 highlight.js |
| Flexbox min-height 滚动失效 | flex 子元素默认 min-height: auto | 用 CSS Grid 或 min-h-0 |
