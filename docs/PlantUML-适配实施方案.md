# ErgeMD PlantUML 语法适配实施方案

## 背景

- **当前状态**：ErgeMD 使用 Mermaid 11.14.0 渲染图表，支持 ` ```mermaid ` 和 ` ```mmd ` 代码块
- **目标**：新增 PlantUML 语法支持，使用官方 `@plantuml/core` 库（TeaVM 编译版，无需 Java/Graphviz）
- **约束**：不能破坏现有 Mermaid 功能，两者需并行共存

---

## 技术选型

| 项目 | 选择 |
|------|------|
| **渲染库** | `@plantuml/core` (v1.2026.5) |
| **代码块标识** | ` ```plantuml ` |
| **渲染方式** | 纯浏览器，无外部依赖 |
| **包体积** | ~1-2MB |

---

## 涉及文件

| 文件 | 操作 |
|------|------|
| `src/types/markdownBlock.ts` | 扩展 BlockType，添加 `plantuml` 类型 |
| `src/utils/markdownBlocks.ts` | 修改代码块解析逻辑 |
| `src/components/reader/MarkdownBlockView.tsx` | 添加 plantuml 分支渲染逻辑 |
| `src/components/reader/PlantUMLDiagram.tsx` | **新增** PlantUML 渲染组件 |
| `src/components/reader/LazyPlantUMLBlock.tsx` | **新增** 懒加载包装器 |
| `src/styles/plantuml.css` | **新增** 基础样式 |
| `package.json` | 添加 `@plantuml/core` 依赖 |

---

## 实施步骤

### Phase 1: 基础设施（风险：低）

#### Task 1.1: 安装依赖
```
pnpm add @plantuml/core
```

**验收标准**：
- `pnpm install` 成功
- `pnpm tsc` 通过
- package.json 中出现 `@plantuml/core`

---

#### Task 1.2: 定义 BlockType
**文件**：`src/types/markdownBlock.ts`

**修改**：在 `type BlockType` 联合类型中添加 `"plantuml"`

**验收标准**：
- TypeScript 类型检查通过

---

### Phase 2: 解析层（风险：中）

#### Task 2.1: 修改代码块解析逻辑
**文件**：`src/utils/markdownBlocks.ts`

**修改位置**：
- 第 216 行附近：`const isMermaid = lang === "mermaid" || lang === "mmd";`
- 第 633 行附近：`const isMermaid = lang === "mermaid" || lang === "mmd";`

**修改内容**：
```typescript
// 原代码
const isMermaid = lang === "mermaid" || lang === "mmd";
blocks.push({ id: ..., type: isMermaid ? "mermaid" : "code", ... });

// 修改为
const isMermaid = lang === "mermaid" || lang === "mmd";
const isPlantUML = lang === "plantuml" || lang === "puml";
let blockType: BlockType = "code";
if (isMermaid) blockType = "mermaid";
else if (isPlantUML) blockType = "plantuml";
blocks.push({ id: ..., type: blockType, ... });
```

**验收标准**：
- `parseMarkdownBlocks(" ```plantuml\nA->B\n@enduml ")` 返回 `type: "plantuml"` 的块
- `parseMarkdownBlocks(" ```mermaid\ngraph TD\nA-->B\n@enduml ")` 仍返回 `type: "mermaid"`

**禁止**：不修改其他解析逻辑

---

### Phase 3: 渲染组件（风险：中）

#### Task 3.1: 创建 PlantUMLDiagram 组件
**文件**：`src/components/reader/PlantUMLDiagram.tsx`

**功能**：
- 动态导入 `@plantuml/core`
- 调用 `renderToString()` 获取 SVG
- 支持明/暗主题
- 错误处理
- 内存缓存（参考 MermaidDiagram 的缓存机制）

**核心逻辑**：
```typescript
import { renderToString } from "@plantuml/core";

const renderPlantUML = async (code: string, dark: boolean) => {
  return new Promise<string>((resolve, reject) => {
    renderToString(code.split("\n"), resolve, reject);
  });
};
```

**验收标准**：
- 组件可正常渲染基本 PlantUML 语法
- 明/暗主题切换正确
- 错误时显示友好提示

---

#### Task 3.2: 创建 LazyPlantUMLBlock 组件
**文件**：`src/components/reader/LazyPlantUMLBlock.tsx`

**功能**：
- 参考 `LazyMermaidBlock.tsx` 的实现模式
- 使用 `IntersectionObserver` 懒加载
- 包裹 `PlantUMLDiagram`
- 提供错误边界

**验收标准**：
- 非可视区域不触发渲染
- 滚动进入可视区后正常渲染

---

#### Task 3.3: 修改 MarkdownBlockView 渲染逻辑
**文件**：`src/components/reader/MarkdownBlockView.tsx`

**修改位置**：在 mermaid 分支后添加 plantuml 分支

**修改内容**：
```typescript
// 添加导入
import LazyPlantUMLBlock from "./LazyPlantUMLBlock";

// 在 mermaid 分支后添加
if (block.type === "plantuml") {
  const codeLines = block.raw.split("\n");
  const code = codeLines.slice(1, -1).join("\n").trim();

  return (
    <div data-block-type="plantuml" data-raw={encodeURIComponent(block.raw)}>
      <LazyPlantUMLBlock code={code} raw={block.raw} />
    </div>
  );
}
```

**验收标准**：
- ` ```plantuml ` 代码块正确渲染
- ` ```mermaid ` 代码块不受影响

---

### Phase 4: 样式适配（风险：低）

#### Task 4.1: 添加 PlantUML 基础样式
**文件**：`src/styles/plantuml.css`（新建）

**内容**：PlantUML 生成的 SVG 容器样式

```css
.plantuml-container {
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.plantuml-container svg {
  max-width: 100%;
  height: auto;
}
```

**验收标准**：
- 样式文件可正常导入
- SVG 容器居中显示

---

### Phase 5: 端到端测试（风险：低）

#### Task 5.1: 创建测试文档
**文件**：`docs/PlantUML-test.md`（或更新现有）

**内容**：覆盖主要 PlantUML 图表类型
- 序列图
- 类图
- 活动图
- 组件图

**验收标准**：
- 所有图表类型正确渲染
- 与 Mermaid 图表共存无冲突

---

#### Task 5.2: 验证兼容性
**测试场景**：
1. 单个文档同时包含 ` ```mermaid ` 和 ` ```plantuml `
2. 主题切换后两种图表都正确响应
3. 虚拟滚动场景下正常渲染

**验收标准**：所有测试场景通过

---

## 执行顺序

```
Task 1.1 → Task 1.2 → Task 2.1 → Task 3.1 → Task 3.2 → Task 3.3 → Task 4.1 → Task 5.1 → Task 5.2
```

---

## 风险评估

| Phase | 风险等级 | 缓解措施 |
|-------|----------|----------|
| Phase 1 | 低 | 官方稳定库 |
| Phase 2 | 中 | 最小化修改，保持 else 分支兼容 |
| Phase 3 | 中 | 参考 MermaidDiagram 实现模式 |
| Phase 4 | 低 | 新建文件，不修改现有样式 |
| Phase 5 | 低 | 手动测试验证 |

---

## 禁止事项

1. 不修改 `MermaidDiagram.tsx` 任何代码
2. 不修改其他渲染分支逻辑
3. 不引入其他 PlantUML 库（如 plantuml-server）
4. 不修改 TypeScript 配置

---

## 验收清单

- [ ] `pnpm tsc` 通过
- [ ] `pnpm lint` 通过
- [ ] ` ```plantuml ` 代码块正确渲染
- [ ] ` ```mermaid ` 代码块不受影响
- [ ] 明/暗主题切换正常
- [ ] 错误处理正常
- [ ] 无控制台错误
