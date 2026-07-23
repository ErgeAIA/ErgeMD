# ErgeMD

A desktop application focused on Markdown reading, with the core philosophy: **ultimate rendering beauty + silky smooth reading experience**.

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

[Core Features](#core-features) · [Download](#download) · [Building from Source](#building-from-source) · [Tech Stack](#tech-stack) · [User Guide](#user-guide) · [Documentation](#documentation) · [Author](#author)

[中文 README](./README.md)

![ErgeMD Cover](./public/images/ergemd-cover.png)

## Core Features

- **Markdown Rendering**: GFM, Math formulas (KaTeX), Code highlighting, Mermaid diagrams, Task lists
- **Reading Experience**: Virtual scrolling, Progress tracking, 14 themes, Auto-generated floating TOC
- **Obsidian Syntax Compatibility**: Callout, Wiki links, Embedded references, Highlight markers, Comment hiding, Block IDs, and other Obsidian-specific syntax
- **Workspace Management**: Multi-tab, File tree, Bookmarks; Quick open file location
- **Export**: HTML, DOCX, PDF export; Mermaid diagrams save as SVG
- **Lightweight & Efficient**: Rust backend + React frontend, native desktop experience

## Download

Latest version **v0.4.2**:

| Type | Download Link |
|------|---------------|
| Portable (no install) | [ErgeMD-v0.4.2-portable.zip](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.4.2/ErgeMD-v0.4.2-portable.zip) |
| NSIS Installer | [ErgeMD-v0.4.2-setup.exe](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.4.2/ErgeMD-v0.4.2-setup.exe) |

### macOS Downloads

- [ErgeMD-v0.4.2-macos-arm64.dmg](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.4.2/ErgeMD-v0.4.2-macos-arm64.dmg) — Apple Silicon native installer
- [ErgeMD-v0.4.2-macos.dmg](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.4.2/ErgeMD-v0.4.2-macos.dmg) — Universal installer (**currently arm64-only; Intel Mac has no native build yet**)
- [ErgeMD-v0.4.2-macos.app.tar.gz](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.4.2/ErgeMD-v0.4.2-macos.app.tar.gz) — Command-line extractable

> **macOS Platform Note**: The CI matrix currently builds only Apple Silicon (arm64). `macos.dmg` and `macos.app.tar.gz` are both arm64 builds; Intel Mac users are not provided a native build yet.

> **Note**: v0.4.0 is **not code-signed** (free software strategy). On first launch, **right-click → Open** to bypass Gatekeeper.

### Linux Downloads

- [ErgeMD-v0.4.2-linux-x86_64.AppImage](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.4.2/ErgeMD-v0.4.2-linux-x86_64.AppImage) — No-install portable
- [ErgeMD-v0.4.2-linux-x86_64.deb](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.4.2/ErgeMD-v0.4.2-linux-x86_64.deb) — Debian / Ubuntu package

**System dependencies** (Ubuntu 22.04+ / Debian 12+):

```bash
sudo apt-get install -y libwebkit2gtk-4.1-0 libgtk-3-0
```

**CJK fonts recommended** (Linux default fonts have weak CJK support):

```bash
sudo apt-get install -y fonts-noto-cjk fonts-noto-color-emoji
```

For older versions, visit the [Releases page](https://github.com/ErgeAIA/ErgeMD/releases).

## Building from Source

### Prerequisites

- Node.js 18+
- Rust (stable)
- pnpm 8+

### Build

```bash
# Install frontend dependencies
pnpm install

# Development mode (hot reload)
pnpm tauri dev

# Production build
pnpm tauri build
```

### Testing

```bash
# Frontend linting
pnpm lint

# Frontend build
pnpm build
```

## Tech Stack

| Layer             | Technology                                  |
| ----------------- | ------------------------------------------- |
| Desktop Framework | Tauri 2                                     |
| Frontend          | React 19 + TypeScript                       |
| Build Tool        | Vite 7                                      |
| State Management  | Zustand 5                                   |
| Styling           | Tailwind CSS 4 + CSS Variables Theme        |
| Markdown          | react-markdown + remark/rehype plugin chain |
| Math              | KaTeX                                       |
| Diagrams          | Mermaid                                     |
| Code Highlighting | highlight.js                                |
| Virtual Scrolling | @tanstack/react-virtual                     |
| Database          | SQLite (sqlx)                               |

## User Guide

### File Operations

| Action               | Shortcut           |
| -------------------- | ------------------ |
| Open file            | `Ctrl + O`         |
| Open folder          | `Ctrl + Shift + O` |
| Close current tab    | `Ctrl + W`         |
| Close other tabs     | `Ctrl + Shift + W` |
| Save file            | `Ctrl + S`         |
| Save as              | `Ctrl + Shift + S` |
| Refresh current file | `Ctrl + R`         |
| Show in Explorer     | `Ctrl + Shift + D` |
| Copy file path       | `Ctrl + Shift + C` |

### Tab Navigation

| Action             | Shortcut                               |
| ------------------ | -------------------------------------- |
| Next tab           | `Ctrl + Tab` / `Ctrl + PageDown`       |
| Previous tab       | `Ctrl + Shift + Tab` / `Ctrl + PageUp` |
| Switch to Nth tab  | `Ctrl + 1` ~ `Ctrl + 9`                |
| Pin/Unpin tab      | `Ctrl + Shift + P`                     |
| Open in new window | `Ctrl + N`                             |

### Reading Controls

| Action            | Shortcut                |
| ----------------- | ----------------------- |
| Zoom in           | `Ctrl + =` / `Ctrl + +` |
| Zoom out          | `Ctrl + -`              |
| Reset zoom        | `Ctrl + 0`              |
| Toggle fullscreen | `F11`                   |
| Toggle sidebar    | `Ctrl + B`              |
| Toggle file tree  | `Ctrl + Shift + B`      |
| Toggle focus mode | `Ctrl + Shift + F`      |
| Search content    | `Ctrl + F`              |
| Global search     | `Ctrl + Shift + F`      |
| Find next         | `F3`                    |
| Find previous     | `Shift + F3`            |
| Print             | `Ctrl + Shift + P`      |

### Export

| Action         | Shortcut           |
| -------------- | ------------------ |
| Export as HTML | `Ctrl + E`         |
| Export as PDF  | `Ctrl + P`         |
| Export as Word | `Ctrl + Shift + E` |

### Reading Area Context Menu

- **Copy** (`Ctrl + C`) — Copy selected text
- **Select All** (`Ctrl + A`) — Select all content
- **Search...** — Search with selected text
- **Edit Paragraph** (`Double-click`) — Quick edit current paragraph
- **Export as HTML** (`Ctrl + E`)
- **Export as PDF** (`Ctrl + P`)
- **Export as Word** (`Ctrl + Shift + E`)
- **Open in New Window** (`Ctrl + N`)

### Image Context Menu

- **Copy Image** — Copy image to clipboard
- **Zoom View** (`Click`) — Fullscreen preview
- **Open Image in New Window**
- **Copy Image Path**
- **Edit Image** — Modify image URL and description

### Code Block Context Menu

- **Copy Code** — Copy entire code block
- **Copy Selection** (`Ctrl + C`) — Copy selected code
- **Edit Code Block** — Quick edit code content

### Link Context Menu

- **Open Link** — Open in default browser
- **Copy Link** (`Ctrl + C`)
- **Edit Link** — Modify link text and URL

### Tab Bar Context Menu

- **Pin/Unpin Tab** (`Ctrl + Shift + P`)
- **Close Tab** (`Ctrl + W`)
- **Close Other Tabs**
- **Close Tabs to the Right**
- **Open in New Window** (`Ctrl + N`)
- **Copy File Path** (`Ctrl + Shift + C`)
- **Show in Explorer** (`Ctrl + Shift + D`)

### Theme & Appearance

- **Multi-theme**: 14 built-in themes
- **Font size**: Zoom in/out/reset
- **Focus mode**: Hide all UI elements for immersive reading

## Installation & Distribution

### Installer (Recommended)

Run the installer and follow the wizard. Benefits:

- Auto-create desktop shortcut and Start menu entry
- Auto-update support
- Associate `.md` and `.markdown` files, double-click to open with ErgeMD
- Normal uninstall via Control Panel

### Portable (No Install)

Run the executable directly, no installation needed. Suitable for:

- Carry on USB drive
- Quick trial without system traces
- Multi-version coexistence testing

> Note: Portable version does not associate file types or create shortcuts. Use the installer if you need these features.

## Documentation

| Document                       | Description                                 |
| ------------------------------ | ------------------------------------------- |
| [CHANGELOG.md](./CHANGELOG.md) | Version changelog                           |
| [TECH-SPEC.md](./TECH-SPEC.md) | Technical specification                     |
| [AGENTS.md](./AGENTS.md)       | Development guidelines and decision records |

## TODO / Roadmap

- [ ] **PDF Export Watermark**: Add watermark support for exported PDF files
- [x] **PDF Page Load Optimization**: Change from fixed 3-second delay to event-driven, waiting for DOM ready (optimized in v0.3.1 to 300ms WebView init + 2s render wait)
- [ ] **Cross-Platform Compatibility**: Unified PDF export solution for Windows/macOS/Linux, macOS uses WKWebView `createPDF`, Linux uses Qt WebEngine PrintToPdf

## Author

<table>
<tr>
<td align="center" width="200">
<img src="https://github.com/ErgeAIA.png" width="100" style="border-radius: 50%"><br>
<b>宝藏二哥AIA / ErgeAIA</b><br>
<sub>Life never stops, neither does tinkering</sub>
</td>
<td>

**About me**: Indie Developer / Full-Stack Engineer / Product Manager / Vibe Coding Practitioner

**Tech Stack**: Tauri · Rust · React · Python · Claude · Cursor · Trae

**Philosophy**: No barriers, no tricks, no holding back

**Links**:
- 📺 [Bilibili](https://space.bilibili.com/67221461) · [Zhihu](https://www.zhihu.com/people/meli55a/posts) · WeChat
- 🐙 [GitHub](https://github.com/ErgeAIA) · [Gitee](https://gitee.com/ErgeAIA)
- 📦 Featured: [ErgeAIA-skills](https://github.com/ErgeAIA/ErgeAIA-skills) · [ErgeMD](https://github.com/ErgeAIA/ErgeMD) · [catapult-cn](https://github.com/ErgeAIA/catapult-cn)

</td>
</tr>
</table>

---

<div align="center">

If ErgeMD has been helpful to you, feel free to give it a ⭐!

<sub>Built with ❤️ and Rust</sub>

</div>

## License

Licensed under the [AGPL-3.0 License](./LICENSE).
