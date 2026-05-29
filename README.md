# ErgeMD

一款专注于 Markdown 阅读的桌面应用，核心理念：**极致的渲染美感 + 丝滑的阅读体验**。

![GitHub stars](https://img.shields.io/github/stars/ErgeAIA/ergeMD?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-2.0-cyan)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-cyan)
![License](https://img.shields.io/github/license/ErgeAIA/ergeMD?style=flat-square)
![Release](https://img.shields.io/github/v/release/ErgeAIA/ergeMD?style=flat-square)
![Downloads](https://img.shields.io/github/downloads/ErgeAIA/ergeMD/total?style=flat-square)
![Rust](https://img.shields.io/badge/Rust-stable-orange?style=flat-square)
[![Bilibili](https://img.shields.io/badge/Bilibili-主页-blue?style=flat-square&logo=bilibili)](https://space.bilibili.com/67221461)

[English README](./README.en.md) 

## 核心功能

- **Markdown 渲染**：支持 GFM、数学公式（KaTeX）、代码高亮、Mermaid 图表、任务列表
- **阅读体验**：虚拟滚动、进度追踪、14 种主题、自动生成浮动章节
- **工作区管理**：多标签页、文件树、书签；快速打开原文件位置
- **导出**：文档可导出 HTML、DOCX、PDF；Mermaid 图表一键保存为 SVG 图
- **轻量高效**：Rust 后端 + React 前端，原生桌面体验

## 下载

预构建安装包可在 Releases 页面获取：

| 平台    | 格式                        |
| ------- | --------------------------- |
| Windows | `.exe` 便携版 / NSIS 安装包 |

## 从源码构建

### 前置条件

- Node.js 18+
- Rust (stable)
- pnpm 8+

### 构建

```bash
# 安装前端依赖
pnpm install

# 开发模式（热重载）
pnpm tauri dev

# 生产构建
pnpm tauri build
```

### 测试

```bash
# 前端类型检查
pnpm lint

# 前端构建
pnpm build
```

## 技术栈

| 层级     | 技术                                  |
| -------- | ------------------------------------- |
| 桌面框架 | Tauri 2                               |
| 前端     | React 19 + TypeScript                 |
| 构建     | Vite 7                                |
| 状态管理 | Zustand 5                             |
| 样式     | Tailwind CSS 4 + CSS 变量主题         |
| Markdown | react-markdown + remark/rehype 插件链 |
| 数学公式 | KaTeX                                 |
| 图表     | Mermaid                               |
| 代码高亮 | highlight.js                          |
| 虚拟滚动 | @tanstack/react-virtual               |
| 数据库   | SQLite (sqlx)                         |

## 使用指南

### 文件操作

| 功能               | 快捷键             |
| ------------------ | ------------------ |
| 打开文件           | `Ctrl + O`         |
| 打开文件夹         | `Ctrl + Shift + O` |
| 关闭当前标签       | `Ctrl + W`         |
| 关闭其他标签       | `Ctrl + Shift + W` |
| 保存文件           | `Ctrl + S`         |
| 另存为             | `Ctrl + Shift + S` |
| 刷新当前文件       | `Ctrl + R`         |
| 在资源管理器中显示 | `Ctrl + Shift + D` |
| 复制文件路径       | `Ctrl + Shift + C` |

### 标签导航

| 功能              | 快捷键                                 |
| ----------------- | -------------------------------------- |
| 下一个标签        | `Ctrl + Tab` / `Ctrl + PageDown`       |
| 上一个标签        | `Ctrl + Shift + Tab` / `Ctrl + PageUp` |
| 切换到第 N 个标签 | `Ctrl + 1` ~ `Ctrl + 9`                |
| 固定/取消固定标签 | `Ctrl + Shift + P`                     |
| 在新窗口打开      | `Ctrl + N`                             |

### 阅读控制

| 功能         | 快捷键                  |
| ------------ | ----------------------- |
| 放大字体     | `Ctrl + =` / `Ctrl + +` |
| 缩小字体     | `Ctrl + -`              |
| 重置字体     | `Ctrl + 0`              |
| 切换全屏     | `F11`                   |
| 切换侧边栏   | `Ctrl + B`              |
| 切换文件树   | `Ctrl + Shift + B`      |
| 切换专注模式 | `Ctrl + Shift + F`      |
| 搜索内容     | `Ctrl + F`              |
| 全局搜索     | `Ctrl + Shift + F`      |
| 查找下一个   | `F3`                    |
| 查找上一个   | `Shift + F3`            |
| 打印         | `Ctrl + Shift + P`      |

### 导出

| 功能        | 快捷键             |
| ----------- | ------------------ |
| 导出为 HTML | `Ctrl + E`         |
| 导出为 PDF  | `Ctrl + P`         |
| 导出为 Word | `Ctrl + Shift + E` |

### 阅读区右键菜单

- **复制** (`Ctrl + C`) — 复制选中文本
- **全选** (`Ctrl + A`) — 全选内容
- **搜索...** — 用选中文本触发搜索
- **编辑此段落** (`双击`) — 快速编辑当前段落
- **导出为 HTML** (`Ctrl + E`)
- **导出为 PDF** (`Ctrl + P`)
- **导出为 Word** (`Ctrl + Shift + E`)
- **在新窗口中打开** (`Ctrl + N`)

### 图片右键菜单

- **复制图片** — 复制图片到剪贴板
- **放大查看** (`单击`) — 全屏预览图片
- **在新窗口打开图片**
- **复制图片路径**
- **编辑图片** — 修改图片地址和描述

### 代码块右键菜单

- **复制代码** — 复制整个代码块
- **复制选中** (`Ctrl + C`) — 复制选中的代码
- **编辑代码块** — 快速编辑代码内容

### 链接右键菜单

- **打开链接** — 在默认浏览器中打开
- **复制链接地址** (`Ctrl + C`)
- **编辑链接** — 修改链接文本和地址

### 标签栏右键菜单

- **固定/取消固定标签** (`Ctrl + Shift + P`)
- **关闭标签页** (`Ctrl + W`)
- **关闭其他标签**
- **关闭右侧标签**
- **在新窗口中打开** (`Ctrl + N`)
- **复制文件路径** (`Ctrl + Shift + C`)
- **在资源管理器中显示** (`Ctrl + Shift + D`)

### 主题与外观

- **多主题切换**：内置 14 种主题
- **字体大小调节**：支持放大/缩小/重置
- **专注模式**：隐藏所有 UI 元素，沉浸式阅读

## 安装与分发

### 安装版（推荐）

运行安装程序，按向导完成安装。安装版优势：

- 自动创建桌面快捷方式和开始菜单项
- 支持自动更新
- 可关联 `.md` 和 `.markdown` 文件，双击即用 ErgeMD 打开
- 可通过控制面板正常卸载

### 便携版（免安装）

直接运行可执行文件，无需安装，适合：

- 放在 U 盘随身携带
- 快速试用，不留系统痕迹
- 多版本共存测试

> 注意：便携版不会自动关联文件类型，也不会创建快捷方式。如需这些功能，请使用安装版。

## 文档

| 文档                           | 说明               |
| ------------------------------ | ------------------ |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新日志       |
| [TECH-SPEC.md](./TECH-SPEC.md) | 技术规格文档       |
| [AGENTS.md](./AGENTS.md)       | 开发规范与决策记录 |


## 许可证

Licensed under the [AGPL-3.0 License](./LICENSE).
