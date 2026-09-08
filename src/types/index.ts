// ===== 标签页类型 =====
export interface TabInfo {
  id: string;
  file_path: string;
  file_name: string;
  content: string;
  pinned?: boolean;
}

// ===== 文件树类型 =====
export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileNode[];
}

// ===== TOC 条目类型 =====
// 注意：统一使用 TocItem（驼峰），不用 TOCItem（全大写缩写）
export interface TocItem {
  id: string;
  text: string;
  level: number;
  logicalOffset: number;
  blockIndex?: number;
  startLine?: number;
}

export interface TOCMeta {
  totalLogicalLength: number;
}

export type ThemeMode =
  | "cyberpunk"
  | "dark"
  | "light"
  | "system"
  | "falcon"
  | "aurora"
  | "cherry-blossom"
  | "desert-sunset"
  | "forest"
  | "monochrome"
  | "ocean"
  | "solar-flare"
  | "tokyo-night"
  | "neon-cyberpunk"
  | "solarized-light";
type Language = "zh-CN" | "en-US" | "auto";

// ===== 阅读设置类型 =====
export interface ReadingSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  pageWidth: number;
  theme: ThemeMode;
  language: Language;
  autoSaveProgress: boolean;
}

// ===== Toast 消息类型（Phase 4 Task 1） =====
interface ToastAction {
  label: string;
  url?: string;
  onClick?: () => void;
}

export interface ToastMessage {
  id: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
  duration?: number;
  action?: ToastAction;
}

// ===== 右键菜单类型（Phase 6 Task 1） =====
export interface ContextMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  action?: () => void;
}

interface ContextMenuSeparator {
  id: string;
  separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuEntry[];
}
