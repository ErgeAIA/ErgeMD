# ErgeMD 6 个 Bug 修复计划

## 概述

修复用户反馈的 6 个 bug，涉及 i18n、导出、编辑器、Obsidian callout、文件关联 5 个模块。

---

## Bug 1: titleBar.pin 显示标签名

### 根因

`TitleBar.tsx:211-212` 使用 `t("titleBar.pin")`，但 `zh-CN.json` 和 `en-US.json` 的 `titleBar` 对象中均未定义 `pin` 字段。i18next 默认行为是找不到 key 时返回 key 字符串本身，导致 tooltip 和 aria-label 显示为 `titleBar.pin`。

### 修复方案（方案 B：动态文案）

**文件 1: `src/i18n/zh-CN.json`**
- 在 `titleBar` 对象中追加 `"pin": "窗口置顶"` 和 `"unpin": "取消置顶"`

**文件 2: `src/i18n/en-US.json`**
- 在 `titleBar` 对象中追加 `"pin": "Always on Top"` 和 `"unpin": "Unpin from Top"`

**文件 3: `src/components/layout/TitleBar.tsx`（第 211-212 行）**
- 改为根据 `isPinned` 状态显示不同 tooltip：
```tsx
aria-label={isPinned ? t("titleBar.unpin") : t("titleBar.pin")}
title={isPinned ? t("titleBar.unpin") : t("titleBar.pin")}
```

### 验证
- 启动应用，hover 标题栏置顶按钮，确认 tooltip 显示「窗口置顶」而非 `titleBar.pin`
- 点击置顶后再 hover，确认 tooltip 变为「取消置顶」
- 切换到英文，确认显示 "Always on Top" / "Unpin from Top"

---

## Bug 2: 导出 HTML 文件名不是当前文件名

### 根因

`src/utils/export.ts:214` 硬编码 `defaultPath: "export.html"`，未从 `useFileStore` 获取当前文件名。对比 `exportPdf.ts` 正确地从 `fileStore.currentFilePath` 提取文件名。

### 修复方案

**文件: `src/utils/export.ts`**

1. 顶部添加 import：
```ts
import { useFileStore } from "@/stores/fileStore";
```

2. 修改 `exportHtml` 函数（第 206-223 行），在 `generateHtmlContent` 之前提取文件名：
```ts
export async function exportHtml(
  containerSelector: string = ".markdown-body",
  options: ExportHtmlOptions = {},
): Promise<void> {
  const fileStore = useFileStore.getState();
  const defaultFileName = fileStore.currentFilePath
    ? fileStore.currentFilePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "export"
    : "export";

  const fullHtml = generateHtmlContent(containerSelector, options);

  const filePath = await save({
    filters: [{ name: "HTML", extensions: ["html"] }],
    defaultPath: `${defaultFileName}.html`,
  });

  if (!filePath) return;

  await invoke("write_file", {
    path: filePath as string,
    content: fullHtml,
  });
}
```

### 验证
- 打开 `README.md`，导出 HTML，确认保存对话框默认文件名为 `README.html`
- 打开含中文路径的文件，确认文件名正确
- 新建未保存的文件（currentFilePath 为 null），确认回退为 `export.html`

---

## Bug 3: QuickEdit 没有锁定在当前视口

### 根因

`QuickEdit.tsx:20-62` 的 `updatePosition` 在每次 scroll 事件中重新执行 `targetElement.getBoundingClientRect()`，导致编辑窗口跟随目标元素滚动而非锁定视口。虚拟滚动场景下目标 DOM 被卸载后，`getBoundingClientRect()` 返回 0，编辑窗口跳到 `(16, 16)`。

### 修复方案

**文件: `src/components/reader/QuickEdit.tsx`（第 20-62 行）**

核心改动：打开时计算一次位置并锁定，不再跟随滚动。

```ts
useEffect(() => {
  const updatePosition = () => {
    // 目标元素脱离 DOM 时不跳位，保持当前位置
    if (!targetElement.isConnected) return;

    const rect = targetElement.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const editHeight = height + 36;
    const editWidth = rect.width;

    const top = rect.top;
    let left = rect.left;

    if (left + editWidth > windowWidth) {
      left = windowWidth - editWidth - 16;
    }
    if (left < 0) {
      left = 16;
    }

    setPosition({
      top: Math.max(16, Math.min(top, windowHeight - editHeight - 16)),
      left: Math.max(16, left),
      width: Math.min(editWidth, windowWidth - 32),
    });
  };

  // 仅在 mount 时计算一次位置，锁定在当前视口
  updatePosition();

  // 仅监听 resize 重新计算（视口尺寸变化时调整）
  window.addEventListener("resize", updatePosition);

  // 不再监听 scroll 事件 —— 编辑窗口锁定在打开时的位置

  return () => {
    window.removeEventListener("resize", updatePosition);
  };
}, [targetElement, height]);
```

同时删除死代码：移除 `data-virtuoso-scroller` 的 fallback（第 52 行，该属性在项目中从未被设置）和 scrollContainer 的 scroll 监听（第 50-55 行）。

### 验证
- 打开文档，双击块级元素编辑，滚动文档，确认编辑窗口保持在原位不漂移
- 在大文档（虚拟滚动）中打开编辑窗口，滚动使目标 block 移出可视区，确认编辑窗口不跳到 (0,0)
- resize 窗口，确认编辑窗口位置自适应调整
- 点击编辑窗口外部，确认仍能正常取消

---

## Bug 4: 导出 HTML 后 Mermaid 图表 6.1-6.12 不渲染

### 根因

导出 HTML 走 DOM 复制路径（`extractHtmlContent` 直接复制 `.markdown-body` 的 innerHTML）。虚拟滚动下不可见区域的 mermaid block 不在 DOM 中；IntersectionObserver 未触发的 block 显示 placeholder 而非 SVG。导出的 HTML 中这些位置是空的。

### 修复方案

**文件: `src/utils/export.ts`**

1. 添加 import：
```ts
import { renderMermaidForExport } from "@/components/reader/MermaidDiagram";
import { decodeBlockDataRaw } from "@/utils/quickEditLines";
```

2. 新增补救渲染函数：
```ts
async function renderUnrenderedMermaidBlocks(): Promise<void> {
  const mermaidBlocks = document.querySelectorAll('[data-block-type="mermaid"]');
  const renderPromises: Promise<void>[] = [];

  mermaidBlocks.forEach((block) => {
    // 已渲染（包含 svg）则跳过
    if (block.querySelector("svg")) return;

    // 从 data-raw 提取 mermaid 代码
    const rawAttr = block.getAttribute("data-raw");
    if (!rawAttr) return;

    const parsed = decodeBlockDataRaw(rawAttr);
    const rawText = parsed?.raw ?? decodeURIComponent(rawAttr);

    // 从 fence 代码中提取 mermaid chart 内容
    const chartMatch = rawText.match(/```(?:mermaid)\s*\n([\s\S]*?)\n```/);
    if (!chartMatch) return;

    const chart = chartMatch[1];

    renderPromises.push(
      renderMermaidForExport(chart).then((svg) => {
        if (svg) {
          // 将 SVG 插入到 block 内部
          const svgContainer = document.createElement("div");
          svgContainer.className = "mermaid";
          svgContainer.innerHTML = svg;
          // 替换 placeholder 内容
          block.innerHTML = "";
          block.appendChild(svgContainer);
        }
      }),
    );
  });

  await Promise.all(renderPromises);
}
```

3. 修改 `exportHtml` 函数，在 `generateHtmlContent` 之前调用补救渲染：
```ts
export async function exportHtml(
  containerSelector: string = ".markdown-body",
  options: ExportHtmlOptions = {},
): Promise<void> {
  // 补救渲染未渲染的 mermaid block
  await renderUnrenderedMermaidBlocks();

  const fullHtml = generateHtmlContent(containerSelector, options);
  // ... 后续保存逻辑
}
```

同样修改 `generatePdfHtml` 的调用路径（如果 PDF 导出也走 DOM 复制），但 `exportPdf.ts` 使用的是 `generateExportHtml`（重新渲染路径），不需要此修复。

### 验证
- 打开 `docs/MarkdownSyntaxExample.md`，滚动到文档中后部
- 导出 HTML，确认 6.1-6.12 的 Mermaid 图表都能在导出的 HTML 中显示
- 导出 PDF（对照），确认 PDF 中图表也正常

---

## Bug 5: Admonition callout emoji 图标丢失

### 根因

`obsidian.css:25-30` 的 `.obsidian-callout-icon` 使用 `display: inline-flex; width: 18px; height: 18px;` 但未设置 `font-size` 和 `line-height`，导致 `::before` 伪元素中的 Unicode emoji 在某些渲染条件下不可见。此外部分 icon 的 Unicode 映射语义不正确（如 `flame` 映射为 ✨ 而非 🔥，`clipboard-list` 映射为 ☰ 而非 📋）。

### 修复方案

**文件: `src/components/obsidian/obsidian.css`（第 25-44 行）**

1. 修正 `.obsidian-callout-icon` 样式，使用 em 单位并添加对齐：
```css
.obsidian-callout-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2em;
  height: 1.2em;
  font-size: inherit;
  line-height: 1;
  flex-shrink: 0;
}
```

2. 为 `::before` 伪元素添加显式 `font-size` 和 `line-height`：
```css
.obsidian-callout-icon::before {
  font-size: 1em;
  line-height: 1;
}
```

3. 修正 icon Unicode 映射（使用更准确的 emoji）：
```css
.obsidian-icon-pencil::before { content: "\270E"; }           /* ✎ */
.obsidian-icon-clipboard-list::before { content: "\1F4CB"; }  /* 📋 (原 ☰ \2630) */
.obsidian-icon-info::before { content: "\2139"; }             /* ℹ */
.obsidian-icon-check-circle-2::before { content: "\2611"; }   /* ☑ */
.obsidian-icon-flame::before { content: "\1F525"; }           /* 🔥 (原 ✨ \2728) */
.obsidian-icon-check::before { content: "\2713"; }            /* ✓ */
.obsidian-icon-help-circle::before { content: "\2753"; }      /* ❓ */
.obsidian-icon-alert-triangle::before { content: "\26A0"; }   /* ⚠ */
.obsidian-icon-x::before { content: "\2717"; }                /* ✗ */
.obsidian-icon-zap::before { content: "\26A1"; }              /* ⚡ */
.obsidian-icon-bug::before { content: "\1F41B"; }             /* 🐛 */
.obsidian-icon-list::before { content: "\1F4DD"; }            /* 📝 (原 📋 \1F4CB，避免与 clipboard-list 重复) */
.obsidian-icon-quote::before { content: "\275D"; }            /* ❝ */
```

### 验证
- 打开包含各种 callout 类型的文档（note/info/tip/warning/bug/example/quote 等）
- 确认每种 callout 的 emoji 图标都可见
- 确认 tip 类型显示 🔥 而非 ✨
- 确认 example 类型显示 📝 而非 📋
- 切换多个主题，确认 emoji 在所有主题下都可见

---

## Bug 6: 右键打开 MD 文件未加载

### 根因

1. **热启动场景缺失**：未引入 `tauri-plugin-single-instance`，ErgeMD 已运行时右键打开 MD 文件会启动新进程，新进程的窗口弹出但无法将文件路径转发给已运行实例。
2. **emit 时机过早**：`lib.rs:295` 在 `setup` 钩子内 `emit("file-opened", &arg)`，此时前端 webview 尚未加载完成，`listen` 未注册，事件必然丢失。冷启动靠 `get_pending_file` 兜底，但热启动完全失败。

### 修复方案

**文件 1: `src-tauri/Cargo.toml`**
- 在 `[dependencies]` 中添加 `tauri-plugin-single-instance = "2"`

**文件 2: `src-tauri/src/lib.rs`**

1. 顶部添加 import：
```rust
use tauri::Emitter;
```

2. 在 `Builder::default()` 后注册 single-instance 插件（在 `.setup` 之前）：
```rust
.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
    // argv[0] 是 exe 路径，argv[1..] 是文件路径
    for arg in argv.iter().skip(1) {
        let path = std::path::Path::new(arg);
        if path.exists()
            && path.extension().map_or(false, |ext| {
                ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("markdown")
            })
        {
            let _ = app.emit("file-opened", arg);
            break;
        }
    }
}))
```

3. 修改 `setup` 钩子中的冷启动 argv 处理：
   - 将 `std::env::args()` 改为 `std::env::args_os()`（避免非 UTF-8 路径 panic）
   - **移除 setup 中的 `handle.emit("file-opened", &arg)`**（冷启动下 emit 早于前端 listen，必然丢失；冷启动靠 `get_pending_file` 兜底；热启动由 single-instance 插件回调 emit）

4. 保留 `get_pending_file` 命令和 `tauri://file-open` 监听（macOS 路径仍需要）

### 验证
- **冷启动**：关闭 ErgeMD，右键 MD 文件选择「用 ErgeMD 打开」，确认应用启动并正确加载文档
- **热启动**：保持 ErgeMD 运行，右键另一个 MD 文件选择「用 ErgeMD 打开」，确认不弹出新窗口，已运行实例加载该文档
- **多文件**：连续右键打开多个 MD 文件，确认每个都被正确加载
- **中文路径**：右键打开含中文路径的 MD 文件，确认不 panic

---

## 执行顺序

按风险从低到高、依赖关系排序：

1. **Bug 1**（i18n key 补充）—— 最低风险，2 个 JSON + 1 个 TSX
2. **Bug 2**（HTML 导出文件名）—— 低风险，1 个 TS 文件
3. **Bug 5**（callout emoji CSS）—— 低风险，1 个 CSS 文件
4. **Bug 3**（QuickEdit 视口锁定）—— 中风险，1 个 TSX 文件
5. **Bug 4**（Mermaid 导出补救渲染）—— 中风险，1 个 TS 文件
6. **Bug 6**（single-instance 插件）—— 较高风险，涉及 Rust 依赖和后端逻辑

## Review 检查清单

完成所有修复后，执行以下 review：

- [ ] `pnpm lint` 无新增 error
- [ ] `pnpm tsc --noEmit` 通过
- [ ] 6 个 bug 逐一验证通过
- [ ] 无范围外改动
- [ ] 无未声明的依赖（Bug 6 的 tauri-plugin-single-instance 已获用户授权）
- [ ] 代码风格符合项目规范（AGENTS.md 编码规范）
