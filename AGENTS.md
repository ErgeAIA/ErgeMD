# ErgeMD 项目 AI 档案

> 本文件用于指导 AI Agent 在本项目中工作，参考 [AGENTS.md 最佳实践](https://agentsmd.io/agents-md-best-practices)。
>
> **项目介绍 / 技术栈 / 架构决策**：见 [README.md](./README.md)
> **关键文件路径索引**：见 [CLAUDE.md](./CLAUDE.md)

***

## 关键命令

| 操作       | 命令                | 说明                                                             |
| ---------- | ------------------- | ---------------------------------------------------------------- |
| 开发       | `pnpm dev`          | 启动 Vite 开发服务器                                             |
| Tauri 开发 | `pnpm tauri dev`    | 启动 Tauri 应用开发模式                                          |
| 前端构建   | `pnpm build`        | 构建前端生产包                                                   |
| 同步版本   | `pnpm sync-version` | 从 package.json 同步版本到 Cargo.toml 和 tauri.conf.json         |
| 打包发布   | `pnpm tauri:build`  | 自动同步版本 + 编译 Rust + 打包 + 重命名（输出 ErgeMD-v{x}.exe） |
| 代码检查   | `pnpm lint`         | 运行 ESLint 检查                                                 |
| 预览       | `pnpm preview`      | 预览构建后的前端                                                 |

> **打包产物**：`src-tauri/target/release/ErgeMD-v{x}.exe`（独立可执行文件）、`src-tauri/target/release/bundle/nsis/ErgeMD-v{x}-setup.exe`（NSIS 安装包）

***

## 双平台同步

本项目同时托管在 GitHub 和 Gitee，代码推送时需同步到两个平台。

### Remote 配置

| 平台   | Remote 名称 | 仓库地址                                |
| ------ | ----------- | --------------------------------------- |
| GitHub | `origin`    | `https://github.com/ErgeAIA/ErgeMD.git` |
| Gitee  | `gitee`     | `https://gitee.com/ergeaia/ErgeMD.git`  |

### 推送规范

- 每次 `git push` 必须同时推送到两个平台：
  ```powershell
  git push origin main; git push gitee main
  ```
- 涉及多分支时，同步所有活跃分支（如 `dev`）
- **Tag 推送规范**见 [CLAUDE.md](./CLAUDE.md) 「发布与 Tag 约定」章节

### 安全边界

| 操作                         | 权限          |
| ---------------------------- | ------------- |
| 添加/更新 remote             | AI 可自行执行 |
| 推送到已配置的 remote        | AI 可自行执行 |
| 删除 remote、修改 remote URL | 需先询问      |

***

## 安全边界

### AI 可自行执行

- 读取文件、列出目录
- TypeScript 类型检查（单文件）
- ESLint / Prettier 格式化（单文件）
- 运行构建命令验证

### AI 必须先询问

- 安装依赖（`pnpm add`）
- Git 操作（push、commit、branch）
- 删除文件
- 运行完整构建

### 禁止操作

未经明确授权，不得执行：

- `git push`、`git commit --amend`、`rm -rf`
- 数据库迁移
- 部署命令
- 修改 CI 配置

***

## 编码规范

### 命名规范

- **组件文件**：PascalCase（如 `MermaidDiagram.tsx`）
- **其他文件**：camelCase（如 `fileStore.ts`）
- **Rust 命令**：snake_case（如 `read_file`）
- **CSS 变量**：kebab-case（如 `--mermaid-text`）

### 必须遵循

- **前后端分离**：前端负责 UI 渲染，所有文件 IO、编码检测、数据库操作必须下沉至 Rust 后端
- **状态管理**：使用 Zustand 选择器订阅，严禁订阅整个 store
- **React 性能**：所有子组件用 `React.memo` 包裹，计算结果用 `useMemo`/`useCallback` 缓存
- **动画性能**：只动画 `transform` 和 `opacity`，绝不触发布局重排
- **虚拟滚动**：长文档必须使用 `@tanstack/react-virtual`

### 禁止操作

- 禁止使用 DOM drag 事件（`onDragEnter`/`onDragOver`/`onDrop`），必须使用 Tauri 的 `onDragDropEvent`
- 禁止在 Tauri 无边框窗口中使用会创建 stacking context 的 CSS 属性（`overflow`、`transform`、`filter` 等）
- 禁止在 React 合成事件中使用 `e.stopPropagation()` 阻止原生事件传播，必须使用原生 `addEventListener`

### 禁止修改的文件

- 不要修改 `.trae/rules/` 下的规则文件
- 不要修改 `docs/phase/` 下的阶段计划文件
- 不要修改 `tsconfig.json`、`vite.config.ts` 等构建配置（除非明确授权）

### 文件写入规范

**铁律**：写文件仅允许使用 SearchReplace 或 Write 工具，禁止其他写入方式。

修改既有高风险文件：必须使用最小精确补丁，禁止整文件重写。

### 不确定即问

编码不明、old_str 多处匹配、需求歧义时必须停下提问。

***

## 项目结构

详细目录结构与关键文件路径索引见 [CLAUDE.md](./CLAUDE.md)。

简要结构参考：

```
src/
├── main.tsx              # App 入口
├── App.tsx               # 主 UI
├── components/           # React 组件（reader / layout / panels / welcome / obsidian 等）
├── stores/               # Zustand stores
├── styles/               # 样式（themes 14+ 主题 / core 核心样式）
├── hooks/                # 自定义 hooks
├── utils/                # 工具函数
├── config/               # 配置
└── i18n/                 # 国际化

src-tauri/
├── src/
│   ├── lib.rs            # Tauri 主入口
│   ├── main.rs           # Rust main
│   ├── commands/         # Tauri 命令（fonts / window / pdf / update）
│   └── db/               # 数据库（init / models）
└── tauri.conf.json       # Tauri 配置
```

### 构建脚本

- `scripts/sync-version.js` → 从 package.json 同步版本
- `scripts/rename-bundle.js` → 打包后重命名产物

### 参考文档

- **ERROR_LOG.md** → 开发错误记录和修复经验
- **CHANGELOG.md** → 版本更新日志
- **[CLAUDE.md](./CLAUDE.md)** → 关键文件路径索引

***

## 协作规则

### 本地 IDE 场景

- AI 运行在本地 IDE 中，具备文件读写与终端执行能力
- 任何文件改动必须先经用户在 diff 视图中审核并 accept 后才生效
- 每个阶段完成后，必须由用户在本地确认测试通过
- 每次响应只处理一个阶段或一个聚焦问题

### 高风险操作前必须询问

跨 >3 文件或 >100 行变更前，先检查 git status。

### 预提交检查清单

每次提交前（执行 `git commit` 之前），必须检查以下项目：

#### 1. README.md TODO 完成状态检查
- 检查 `README.md` 中的 TODO 列表
- 如果有已完成的功能但仍标记为 `[ ]`，必须改为 `[x]`
- 示例：完成某个优化后，找到对应 TODO 项并标记为完成

#### 2. 版本信息同步检查
- 如果有新版本发布，检查 `README.md` 下载链接部分：
  - 版本号标题是否与最新版本一致（如 "v0.3.0" → "v0.3.1"）
  - 所有下载链接（便携版、NSIS、MSI）的版本号是否已更新
  - GitHub release 页面地址是否指向正确版本
- 版本号定义优先级：`package.json` > `Cargo.toml` > `README.md`

#### 3. 检查流程
```
提交前检查顺序：
1. 读取 README.md TODO 列表 → 标记已完成的 TODO
2. 确认最新版本号 → 同步下载链接（如有必要）
3. 执行 git commit
```

***

*最后更新：2026-06-04*
