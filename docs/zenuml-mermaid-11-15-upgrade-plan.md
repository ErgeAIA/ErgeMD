# Mermaid 11.15.0 升级 + ZenUML 外部插件集成 — 实施计划

> 目标：将 `mermaid` 从 11.14.0 升级至 11.15.0（内置 Event Modeling 事件建模图），并通过外部插件 `@mermaid-js/mermaid-zenuml@0.2.3` 支持 ZenUML 序列图。
> 实施策略：**分两阶段**，先集成 ZenUML 外部插件验证稳定，再升级 Mermaid 主体版本，降低风险。
> 工作流：新开 `feature/mermaid-zenuml-plugin` 分支 → 每阶段 review → 验收后再合并到 `main`。

---

## 0. 当前状态确认

| 项目 | 现状 |
| --- | --- |
| 工作分支 | `main`（干净） |
| 当前版本 | v0.3.5 |
| `mermaid` 依赖 | `11.14.0` |
| `UNSUPPORTED_DIAGRAM_TYPES` | `["zenuml", "eventmodeling"]` |
| ZenUML 主题 CSS | `src/styles/themes/core/mermaid/mermaid-zenuml.css`（已存在） |
| 导出管线 | 阅读器 / PDF 导出（HTML 中转）/ DOCX 导出（`markdown-docx`） |
| 关键文件 | `MermaidDiagram.tsx`、`vite.config.ts`、`generateExportHtml.ts`、`exportDocx.ts` |

---

## 1. 阶段 A：创建新分支

**目的**：按用户要求"次此变更新开一个分支，验收后再合并到主分支"。

### 操作步骤
1. 基于当前 `main` 创建新分支 `feature/mermaid-zenuml-plugin`：
   ```powershell
   git checkout -b feature/mermaid-zenuml-plugin
   ```
2. 验证分支切换成功：`git branch --show-current` 应返回 `feature/mermaid-zenuml-plugin`。

### Review 检查点
- 分支名符合 `<type>/<scope>` 规范（feature 开头）
- 当前 working tree 干净

---

## 2. 阶段 B：阶段 1 — 集成 ZenUML 外部插件

### 2.1 安装依赖

**文件**：`package.json`

**操作**：
- 在 `dependencies` 中添加：
  ```json
  "@mermaid-js/mermaid-zenuml": "0.2.3"
  ```
- 注意：mermaid 主版本保持 `11.14.0` 不变（先稳定 ZenUML，再升级）

**Review 检查点**：
- 版本号精确锁定为 `0.2.3`，不带 `^` 或 `~`
- pnpm 锁文件同步更新

### 2.2 修改 `src/components/reader/MermaidDiagram.tsx`

#### 2.2.1 新增模块缓存与注册标志（顶部 module-level）

**位置**：`mermaidModulePromise` 声明附近（第 22 行附近）

**新增内容**：
```typescript
let zenumlModulePromise: Promise<any> | null = null;
let zenumlRegistered = false;

/**
 * 幂等注册 ZenUML 外部插件
 * 必须在 mermaid.initialize() 之前调用
 * 使用模块级标志避免重复注册覆盖 detector
 */
async function ensureZenumlRegistered(mermaid: any): Promise<void> {
  if (zenumlRegistered) return;
  if (!zenumlModulePromise) {
    zenumlModulePromise = import("@mermaid-js/mermaid-zenuml");
  }
  const zenuml = (await zenumlModulePromise).default;
  await mermaid.registerExternalDiagrams([zenuml]);
  zenumlRegistered = true;
}
```

#### 2.2.2 在两处渲染入口调用 `ensureZenumlRegistered`

**位置 1**：`renderMermaidForExport` 函数（第 41-66 行）内 `mermaid.initialize()` 调用之前：
```typescript
const mermaid = (await mermaidModulePromise).default;
await ensureZenumlRegistered(mermaid);  // 新增
mermaid.initialize({ ... });
```

**位置 2**：主 `MermaidDiagram` 组件的 `useEffect` 渲染流程（第 1085 行附近），在 `mermaid.initialize()` 之前：
```typescript
const mermaid = (await mermaidModulePromise).default;
await ensureZenumlRegistered(mermaid);  // 新增
// ... themeVariables 构建
mermaid.initialize({ ... });
```

**关键点**：
- `ensureZenumlRegistered` 是 async，但调用点已经在 `await` mermaid 模块后，无须额外 await 链调整
- 由于队列串行（`mermaidRenderQueue`），并发调用安全（第二次起直接 return）

#### 2.2.3 补全 `ChartColors` 接口的 `zenuml` 类型

**位置**：`ChartColors` 接口（第 137-327 行），可在 `ishikawa` 之后新增：

```typescript
zenuml?: {
  text: string;
  border: string;
  bg: string;
};
```

**理由**：与现有 `packet`、`radar`、`wardley` 等可选字段保持一致，避免 TypeScript strict 模式下报错。

#### 2.2.4 在 `getMermaidColors()` 中添加 `charts.zenuml` 主题变量透传

**位置**：`charts` 对象字面量内（第 394 行 `charts: { ... }` 内 `ishikawa` 之后）：

```typescript
zenuml: {
  text: getCSSVar("--mermaid-zenuml-text", primaryTextColor),
  border: getCSSVar("--mermaid-zenuml-border", primaryBorderColor),
  bg: getCSSVar("--mermaid-zenuml-bg", primaryColor),
},
```

#### 2.2.5 可选：添加 ZenUML 专用主题变量注入块

**位置**：主组件 `useEffect` 中其他图表类型判断块（`isWardley`、`isIshikawa` 之后）：

```typescript
if (isZenuml && colors.charts.zenuml) {
  const vars = themeVariables as any;
  const zenumlColors = colors.charts.zenuml;
  // ZenUML 通过 themeVariables + CSS 变量双重作用
  vars.fontColor = zenumlColors.text;
}
```

并在主题变量透传后增加 `const isZenuml = chartType === "zenuml";`（与现有 `isIshikawa` 同样位置）。

**说明**：ZenUML 渲染主要依赖其内置样式 + 主题 CSS 变量（已存在 `mermaid-zenuml.css`），具体 themeVariables 字段名（如 `fontColor`）需通过实际渲染验证调整。**首次实现采用保守策略**：仅补全类型与透传，不强加 inline SVG style 注入，待渲染验证后再按需扩展。

#### 2.2.6 从 `UNSUPPORTED_DIAGRAM_TYPES` 移除 `"zenuml"`

**位置**：第 1018 行

**变更前**：
```typescript
const UNSUPPORTED_DIAGRAM_TYPES = new Set(["zenuml", "eventmodeling"]);
```

**变更后**：
```typescript
const UNSUPPORTED_DIAGRAM_TYPES = new Set(["eventmodeling"]);
```

**Review 检查点**：
- `MermaidDiagram.tsx` TypeScript 类型检查通过（`pnpm tsc --noEmit`）
- ESLint 通过（`pnpm lint src/components/reader/MermaidDiagram.tsx`）

### 2.3 更新 `docs/MarkdownSyntaxExample.md` — 6.15 节

**位置**：第 912-914 行

**变更前**：
```markdown
### 6.15 [ZenUML](https://mermaid.nodejs.cn/syntax/zenuml.html)

> **暂不支持说明**：ZenUML 不是当前 Mermaid 11.14.0 内置 diagram，需外部插件 `@mermaid-js/mermaid-zenuml` 注册后才可渲染。当前表现：UnknownDiagramError。
```

**变更后**：
```markdown
### 6.15 [ZenUML](https://mermaid.nodejs.cn/syntax/zenuml.html)

> **支持说明**：ZenUML 通过外部插件 `@mermaid-js/mermaid-zenuml@0.2.3` 注册到 Mermaid 11.14.0。依赖包含 `@zenuml/core@^3.47.0`，启动时按需懒加载，仅检测到 `zenuml` 关键字时才加载插件代码。
```

**Review 检查点**：
- 文档中不再出现"暂不支持"
- 关键字 `zenuml` 和示例代码块保持不变

### 2.4 验证（阶段 B）

#### 2.4.1 阅读器渲染验证
- 启动开发服务器：`pnpm dev`
- 打开 `docs/MarkdownSyntaxExample.md`
- 检查 6.15 节 ZenUML 序列图能否正常渲染（不再显示"当前 Mermaid 版本不支持 zenuml 图表"黄色提示）
- 切换 2-3 个主题（深色 / 浅色 / 自定义），检查 ZenUML 配色与主题一致
- 控制台无 mermaid 相关 error

#### 2.4.2 导出验证

| 导出类型 | 验证内容 | 期望结果 |
| --- | --- | --- |
| PDF 导出 | 通过 `Mermaid → HTML` 中转的 `renderMermaidForExport` 渲染 ZenUML | SVG 正常嵌入 |
| DOCX 导出 | 检查 `markdown-docx` 库是否处理 mermaid 代码块 | 显示为代码块或纯文本（已知限制） |
| HTML 导出 | 复用 `renderMermaidForExport` | SVG 正常嵌入 |

**注意**：`markdown-docx@^1.6.0` 基于 `docx` 库，**不支持 Mermaid 外部插件**，ZenUML 在 DOCX 导出中会作为代码块处理。**这是已知限制**，在导出对话框或文档中说明即可，不阻塞本次实施。

#### 2.4.3 Bundle 体积检查
```powershell
pnpm build
```
- 检查 `dist/assets/mermaid-*.js` 体积变化
- 关注 `chunkSizeWarningLimit: 600` 警告（vite.config.ts 第 84 行）
- 若 ZenUML 插件（+ `@zenuml/core`）超过 600KB，**按用户授权**提高 `chunkSizeWarningLimit` 至 800-1000KB，记录调整原因

#### 2.4.4 Lint & Type 检查
```powershell
pnpm lint
pnpm tsc --noEmit
```

### 2.5 阶段 B 提交

**Commit 信息模板**：
```
feat(mermaid): integrate ZenUML external plugin

- Add @mermaid-js/mermaid-zenuml@0.2.3 dependency
- Implement ensureZenumlRegistered() with idempotent guard
- Register plugin before mermaid.initialize() in both reader and export flows
- Extend ChartColors.zenuml type and theme variable mapping
- Update MarkdownSyntaxExample.md 6.15 section
- Bump vite chunkSizeWarningLimit to <X>KB if needed
```

**推送分支**（不直接推 main）：
```powershell
git push origin feature/mermaid-zenuml-plugin
git push gitee feature/mermaid-zenuml-plugin
```

**Review 检查点**：
- 不打 tag（因为版本号未变，AGENTS.md 规定 tag 必须在版本升级时打）
- 不在 commit 中混入阶段 C（mermaid 11.15.0 升级）的内容

---

## 3. 阶段 C：阶段 2 — 升级 Mermaid 至 11.15.0

**前提**：阶段 B 验收通过后才执行此阶段。

### 3.1 升级依赖

**文件**：`package.json`

**变更**：
```json
"mermaid": "11.15.0"
```

**Review 检查点**：
- 锁文件更新无破坏性冲突
- pnpm 解析的 `mermaid@11.15.0` 实际可用

### 3.2 处理 Event Modeling 内置支持

#### 3.2.1 从 `UNSUPPORTED_DIAGRAM_TYPES` 移除 `"eventmodeling"`

**位置**：`MermaidDiagram.tsx` 第 1018 行

**变更后**：
```typescript
const UNSUPPORTED_DIAGRAM_TYPES = new Set([]);
```

**或直接删除该常量**（如果不再有其他条目），并清理相关判断逻辑（错误显示分支等）。

#### 3.2.2 可选：补全 `ChartColors.eventmodeling` 类型与变量透传

参考阶段 B 2.2.3 - 2.2.5 的模式：
- `ChartColors` 接口新增 `eventmodeling?` 字段（text / data-bg / data-border / line）
- `getMermaidColors()` 中新增 `charts.eventmodeling` 块
- 主题变量（`--mermaid-eventmodeling-text` 等）已在 `getMermaidThemeSignature()` 中收集

**注意**：Mermaid 11.15.0 的 Event Modeling 实际 themeVariables 字段名**需通过实际渲染验证**。首次实现可仅做 CSS 变量透传（已有 `mermaid-eventmodeling.css` 基础），不预设 inline SVG style。

### 3.3 更新 `docs/MarkdownSyntaxExample.md` — 6.23 节

**位置**：第 1142-1144 行

**变更前**：
```markdown
### 6.23 [事件建模图](https://mermaid.nodejs.cn/syntax/eventModelling.html)

> **暂不支持说明**：Event Modeling 不是当前 Mermaid 11.14.0 内置 diagram，当前 `eventmodeling` 关键字会触发 UnknownDiagramError。**不计入 Mermaid 主题系统测试失败**。如未来需要支持，应单独调研外部插件 `@howarddierking/mermaid-event-model` 或正确语法关键字。
```

**变更后**：
```markdown
### 6.23 [事件建模图](https://mermaid.nodejs.cn/syntax/eventModelling.html)

> **支持说明**：Mermaid 11.15.0 已内置 Event Modeling（关键字 `eventmodeling`），无需外部插件。
```

### 3.4 验证（阶段 C）

#### 3.4.1 阅读器渲染验证
- 启动开发服务器
- 检查 6.23 节事件建模图能否正常渲染
- 切换主题检查配色

#### 3.4.2 回归测试
- 检查 6.15 节 ZenUML 仍能正常渲染（**关键**：确认 mermaid 11.15.0 升级未破坏 ZenUML 插件注册）
- 抽查 3-5 个其他图表类型（flowchart、sequence、state 等）确保无回归

#### 3.4.3 Lint & Type 检查
```powershell
pnpm lint
pnpm tsc --noEmit
pnpm build
```

### 3.5 阶段 C 提交

**Commit 信息模板**：
```
feat(mermaid): upgrade to 11.15.0 with built-in Event Modeling

- Bump mermaid from 11.14.0 to 11.15.0
- Remove eventmodeling from UNSUPPORTED_DIAGRAM_TYPES
- Extend ChartColors.eventmodeling type and theme variable mapping
- Update MarkdownSyntaxExample.md 6.23 section
```

**推送分支**：
```powershell
git push origin feature/mermaid-zenuml-plugin
git push gitee feature/mermaid-zenuml-plugin
```

---

## 4. 阶段 D：版本号升级与发版准备

**前提**：阶段 B + 阶段 C 全部验收通过。

### 4.1 版本号升级

按 AGENTS.md 规定升级 0.3.5 → 0.3.6（minor 升级，因为新增了图表类型支持）：

**修改文件**：
- `package.json`: `0.3.5` → `0.3.6`
- `src-tauri/Cargo.toml`: `version = "0.3.5"` → `"0.3.6"`
- `src-tauri/tauri.conf.json`: `"version": "0.3.5"` → `"0.3.6"`

执行同步命令：
```powershell
pnpm sync-version
```

### 4.2 更新 CHANGELOG

**文件**：`CHANGELOG.md` 与 `CHANGELOG.en.md`

在 Unreleased 段（或新建 v0.3.6 段）添加：
- ZenUML 序列图支持（外部插件）
- Event Modeling 事件建模图支持（Mermaid 11.15.0 内置）
- Mermaid 主体版本升级 11.14.0 → 11.15.0

### 4.3 提交

```powershell
git add .
git commit -m "chore(release): v0.3.6 - ZenUML + Event Modeling support"
git push origin feature/mermaid-zenuml-plugin
git push gitee feature/mermaid-zenuml-plugin
```

**打 tag**（按 CLAUDE.md 规定，版本升级必须打 tag）：
```powershell
git tag v0.3.6
git push origin v0.3.6
git push gitee v0.3.6
```

---

## 5. 验收与合并

**用户验收步骤**：
1. 在 IDE 中 checkout 到 `feature/mermaid-zenuml-plugin` 分支
2. 启动 `pnpm tauri dev` 实际运行应用
3. 打开 `docs/MarkdownSyntaxExample.md` 验证：
   - 6.15 ZenUML 渲染正常
   - 6.23 事件建模图渲染正常
4. 切换 14+ 主题验证两个图表配色
5. 测试 PDF 导出中 ZenUML 渲染

**用户验收通过后**：
```powershell
git checkout main
git merge --no-ff feature/mermaid-zenuml-plugin
git push origin main
git push gitee main
```

---

## 6. 风险与回滚预案

| 风险 | 缓解措施 | 回滚方案 |
| --- | --- | --- |
| `@mermaid-js/mermaid-zenuml` 与 mermaid 11.14.0/11.15.0 不兼容 | 阶段 B 先锁定 11.14.0 验证稳定再升级 | `git revert` 阶段 B commit，恢复 `UNSUPPORTED_DIAGRAM_TYPES` |
| `@zenuml/core` 依赖过大（bundle 体积膨胀） | 阶段 B 末尾用 `pnpm build` 实际测量 | 用户已授权提高 `chunkSizeWarningLimit` |
| DOCX 导出 ZenUML 失败 | 已知限制，导出时降级为代码块 | 不处理，文档说明 |
| Mermaid 11.15.0 升级破坏 ZenUML 插件 | 阶段 C 验证清单包含 6.15 节回归 | `git revert` 阶段 C commit |
| mermaid 11.15.0 内置 Event Modeling 实际 API 与预期不符 | 阶段 C 实际渲染验证后再补全 themeVariables | 阶段 C 拆分为多个小 commit 便于回滚 |

---

## 7. 假设与决策记录

| 假设 / 决策 | 理由 |
| --- | --- |
| 分两阶段（先 ZenUML，再 11.15.0） | 用户已明确"先制定详细的实施计划...分阶段实施" |
| 版本升级走 0.3.5 → 0.3.6（minor） | 新增图表类型支持属于 minor 级别 |
| ZenUML themeVariables 字段保守处理 | 实际字段名需运行时验证 |
| DOCX 导出不处理 ZenUML | `markdown-docx` 库不支持 Mermaid 外部插件，强行支持得不偿失 |
| 不打 preview/beta tag | 现有 tag 命名规范仅 `v{x.y.z}` |
| 不修改 `vite.config.ts` 的 `manualChunks` 切分 | ZenUML 插件会进入现有 `mermaid` chunk，与 mermaid 11.15.0 一起加载，避免引入新 chunk 增加复杂度 |

---

## 8. 验证清单汇总

每完成一个阶段，必须勾选对应验证项：

### 阶段 B（ZenUML 集成）
- [ ] 分支 `feature/mermaid-zenuml-plugin` 创建
- [ ] `package.json` 添加 `@mermaid-js/mermaid-zenuml@0.2.3`
- [ ] `MermaidDiagram.tsx` 添加 `ensureZenumlRegistered` 函数
- [ ] 两处 `mermaid.initialize()` 之前调用 `ensureZenumlRegistered`
- [ ] `ChartColors.zenuml` 类型补全
- [ ] `getMermaidColors().charts.zenuml` 透传
- [ ] `UNSUPPORTED_DIAGRAM_TYPES` 移除 `zenuml`
- [ ] `MarkdownSyntaxExample.md` 6.15 节更新
- [ ] `pnpm lint` 通过
- [ ] `pnpm tsc --noEmit` 通过
- [ ] `pnpm dev` 阅读器 ZenUML 正常渲染
- [ ] PDF 导出 ZenUML 正常
- [ ] `pnpm build` 无致命错误（体积警告可接受）
- [ ] commit + push 分支成功

### 阶段 C（Mermaid 11.15.0 升级）
- [ ] `package.json` mermaid 升级至 `11.15.0`
- [ ] `UNSUPPORTED_DIAGRAM_TYPES` 移除 `eventmodeling`
- [ ] `ChartColors.eventmodeling` 类型补全（可选）
- [ ] `MarkdownSyntaxExample.md` 6.23 节更新
- [ ] 阅读器 Event Modeling 正常渲染
- [ ] 6.15 ZenUML 回归通过
- [ ] 其他图表类型回归抽查通过
- [ ] `pnpm lint` / `tsc` / `build` 全部通过
- [ ] commit + push 分支成功

### 阶段 D（发版）
- [ ] 版本号同步至 0.3.6
- [ ] `CHANGELOG.md` / `CHANGELOG.en.md` 更新
- [ ] `pnpm sync-version` 执行成功
- [ ] tag `v0.3.6` 创建并双平台推送
- [ ] 等待 GitHub Actions release workflow 触发
- [ ] 用户验收 → 合并到 main

---

*最后更新：2026-06-10*
