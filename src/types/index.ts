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
// ===== Mermaid 思维导图布局：radial=发散放射（cose-bilkent）/ tree=层级树（dagre TB）/
// logic=横向逻辑图（dagre LR，全朝右） =====
export type MindmapLayout = "radial" | "tree" | "logic";

// ===== Mermaid 思维导图样式（节点观感，与布局正交）：
// depth=按层级分色（同层级同色、层级间色相递进，默认，符合思维导图层级读法）；
// brand=按分支分色（同分支同色、跨层级）；outline=透明底 + 彩色描边/文字；
// classic=低饱和底 + 彩色下划线（历史默认）=====
export type MindmapStyle = "brand" | "depth" | "outline" | "classic";

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
  mindmapLayout: MindmapLayout;
  mindmapStyle: MindmapStyle;
  // 浮动章节目录固定（pin）：固定后移开鼠标不自动收起，全局偏好、对所有文档生效
  pinToc: boolean;
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
