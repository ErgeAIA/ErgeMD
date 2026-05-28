# ErgeMD

A desktop application focused on Markdown reading, with the core philosophy: **ultimate rendering beauty + silky smooth reading experience**.

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

[中文 README](./README.md)

## Core Features

- **Markdown Rendering**: GFM, Math formulas (KaTeX), Code highlighting, Mermaid diagrams, Task lists
- **Reading Experience**: Virtual scrolling, Progress tracking, 14 themes, Auto-generated floating TOC
- **Workspace Management**: Multi-tab, File tree, Bookmarks; Quick open file location
- **Export**: HTML, DOCX, PDF export; Mermaid diagrams save as SVG
- **Lightweight & Efficient**: Rust backend + React frontend, native desktop experience

## Download

Pre-built installers are available on the Releases page:

| Platform | Format |
|----------|--------|
| Windows | `.exe` Portable / NSIS Installer |

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

| Layer | Technology |
|-------|------------|
| Desktop Framework | Tauri 2 |
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 7 |
| State Management | Zustand 5 |
| Styling | Tailwind CSS 4 + CSS Variables Theme |
| Markdown | react-markdown + remark/rehype plugin chain |
| Math | KaTeX |
| Diagrams | Mermaid |
| Code Highlighting | highlight.js |
| Virtual Scrolling | @tanstack/react-virtual |
| Database | SQLite (sqlx) |

## User Guide

### File Operations

| Action | Shortcut |
|--------|----------|
| Open file | `Ctrl + O` |
| Open folder | `Ctrl + Shift + O` |
| Close current tab | `Ctrl + W` |
| Close other tabs | `Ctrl + Shift + W` |
| Save file | `Ctrl + S` |
| Save as | `Ctrl + Shift + S` |
| Refresh current file | `Ctrl + R` |
| Show in Explorer | `Ctrl + Shift + D` |
| Copy file path | `Ctrl + Shift + C` |

### Tab Navigation

| Action | Shortcut |
|--------|----------|
| Next tab | `Ctrl + Tab` / `Ctrl + PageDown` |
| Previous tab | `Ctrl + Shift + Tab` / `Ctrl + PageUp` |
| Switch to Nth tab | `Ctrl + 1` ~ `Ctrl + 9` |
| Pin/Unpin tab | `Ctrl + Shift + P` |
| Open in new window | `Ctrl + N` |

### Reading Controls

| Action | Shortcut |
|--------|----------|
| Zoom in | `Ctrl + =` / `Ctrl + +` |
| Zoom out | `Ctrl + -` |
| Reset zoom | `Ctrl + 0` |
| Toggle fullscreen | `F11` |
| Toggle sidebar | `Ctrl + B` |
| Toggle file tree | `Ctrl + Shift + B` |
| Toggle focus mode | `Ctrl + Shift + F` |
| Search content | `Ctrl + F` |
| Global search | `Ctrl + Shift + F` |
| Find next | `F3` |
| Find previous | `Shift + F3` |
| Print | `Ctrl + Shift + P` |

### Export

| Action | Shortcut |
|--------|----------|
| Export as HTML | `Ctrl + E` |
| Export as PDF | `Ctrl + P` |
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

| Document | Description |
|----------|------------|
| [CHANGELOG.md](./CHANGELOG.md) | Version changelog |
| [TECH-SPEC.md](./TECH-SPEC.md) | Technical specification |
| [AGENTS.md](./AGENTS.md) | Development guidelines and decision records |

## License

Licensed under the [AGPL-3.0 License](./LICENSE).
