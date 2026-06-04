# ErgeMD

一款专注于 Markdown 阅读的桌面应用，核心理念：**极致的渲染美感 + 丝滑的阅读体验**。

[![BILIBILI](https://img.shields.io/badge/BILIBILI-宝藏二哥AIA-00D4FF?style=for-the-badge&logo=bilibili&logoColor=white)](https://space.bilibili.com/67221461)
[![ZHIHU](https://img.shields.io/badge/ZHIHU-宝藏二哥AIA-0084FF?style=for-the-badge&logo=zhihu&logoColor=white)](https://www.zhihu.com/people/meli55a/posts)
[![WECHAT](https://img.shields.io/badge/WECHAT-宝藏二哥AIA-07C160?style=for-the-badge&logo=wechat&logoColor=white)](mailto:ergeaia@gmail.com)
[![EMAIL](https://img.shields.io/badge/EMAIL-ergeaia@gmail.com-A855F7?style=for-the-badge&logo=gmail&logoColor=white)](mailto:ergeaia@gmail.com)
![GitHub stars](https://img.shields.io/github/stars/ErgeAIA/ErgeMD?style=for-the-badge&logo=github&logoColor=white)
![License](https://img.shields.io/badge/License-AGPL%203.0-A42E2B?style=for-the-badge&logo=gnu&logoColor=white)
![Release](https://img.shields.io/github/v/release/ErgeAIA/ErgeMD?style=for-the-badge&logo=github&logoColor=white)
![Downloads](https://img.shields.io/github/downloads/ErgeAIA/ErgeMD/total?style=for-the-badge&logo=github&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=for-the-badge&logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-stable-DEA584?style=for-the-badge&logo=rust&logoColor=black)

[English README](./README.en.md) 

![ErgeMD 封面](./public/images/ergemd-cover.png)

## 核心功能

- **Markdown 渲染**：支持 GFM、数学公式（KaTeX）、代码高亮、Mermaid/PlantUML 图表、任务列表
- **阅读体验**：虚拟滚动、进度追踪、14 种主题、自动生成浮动章节
- **Obsidian 语法兼容**：支持 Callout、Wiki 链接、嵌入引用、高亮标记、注释隐藏、块 ID 等 Obsidian 专属语法
- **工作区管理**：多标签页、文件树、书签；快速打开原文件位置
- **导出**：文档可导出 HTML、Word（DOCX）、PDF；Mermaid/PlantUML 图表一键保存为 SVG 图
- **轻量高效**：Rust 后端 + React 前端，原生桌面体验

## 下载

最新版本 **v0.3.3**：

| 类型             | 下载链接                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| 便携版（免安装） | [ErgeMD-v0.3.3-portable.zip](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.3.3/ErgeMD-v0.3.3-portable.zip) |
| NSIS 安装包      | [ErgeMD_0.3.3_x64-setup.exe](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.3.3/ErgeMD_0.3.3_x64-setup.exe) |
| MSI 安装包       | [ErgeMD_0.3.3_x64_en-US.msi](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.3.3/ErgeMD_0.3.3_x64_en-US.msi) |

更多历史版本请访问 [Releases 页面](https://github.com/ErgeAIA/ErgeMD/releases)。

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

| 层级     | 技术                                  | 版本约束             |
| -------- | ------------------------------------- | -------------------- |
| 桌面框架 | Tauri 2                               | >= 2.0               |
| 前端     | React 19 + TypeScript                 | React >= 19, TS ~5.8 |
| 构建     | Vite 7                                | >= 7.0               |
| 状态管理 | Zustand 5                             | >= 5.0               |
| 样式     | Tailwind CSS 4 + CSS 变量主题         | Tailwind >= 4.0      |
| Markdown | react-markdown + remark/rehype 插件链 | 最新                 |
| 数学公式 | KaTeX                                 | ^0.16.44             |
| 图表     | Mermaid / @plantuml/core              | 11.14.0 / ^1.2026.5  |
| 代码高亮 | highlight.js                          | ^11.11.1             |
| 虚拟滚动 | @tanstack/react-virtual               | ^3.13.24             |
| 国际化   | i18next + react-i18next               | i18next >= 26        |
| Word 导出 | markdown-docx                        | ^1.6.0               |
| 数据库   | SQLite (sqlx)                         | 0.8.6                |
| 后端语言 | Rust                                  | edition 2021         |
| 包管理器 | pnpm                                  | >= 8                 |

## 关键架构决策

| 决策                         | 原因                                              |
| ---------------------------- | ------------------------------------------------- |
| 选择 Tauri 2 而非 Electron   | 更小的安装包、更好的性能、Rust 安全性             |
| 选择 Zustand 而非 Redux      | 更轻量、API 简洁、基于选择器的订阅机制            |
| 选择 CSS 变量主题系统        | 主题切换零重渲染、支持动态主题                    |
| 选择 @tanstack/react-virtual | 更现代的 API、更好的 TypeScript 支持              |
| 前后端严格分离               | 确保 Rust 处理所有 IO、前端专注 UI                |
| 阅读进度存入 SQLite          | 持久化、跨窗口同步、支持历史记录                  |
| 三种性能模式预设             | 满足不同设备配置和阅读场景需求                    |

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

## TODO / 路线图

- [ ] **PDF 导出水印**：支持在导出的 PDF 中添加水印
- [x] **PDF 页面加载优化**：从固定 3 秒延迟改为事件驱动，等待 DOM ready（v0.3.1 已优化为 300ms WebView 初始化 + 2s 渲染等待）
- [ ] **多平台兼容**：Windows/macOS/Linux 统一 PDF 导出方案，macOS 使用 WKWebView `createPDF`，Linux 使用 Qt WebEngine PrintToPdf

## 许可证

Licensed under the [AGPL-3.0 License](./LICENSE).
