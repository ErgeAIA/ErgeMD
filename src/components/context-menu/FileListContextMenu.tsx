import type { ContextMenuEntry } from "@/types";
import i18n from "@/i18n";

export interface FileListContextMenuProps {
  filePath: string;
  fileName: string;
  onOpen: () => void;
  onOpenInNewTab: () => void;
  onOpenInNewWindow: () => void;
  onCopyFilePath: () => void;
  onRevealInExplorer: () => void;
}

/**
 * 文件列表右键菜单项（PDR 6.5.6）。
 * - 打开
 * - 在新标签页打开
 * - 在新窗口中打开
 * - 复制文件路径
 * - 在资源管理器中显示
 */
export function getFileListContextMenuItems(
  props: FileListContextMenuProps,
): ContextMenuEntry[] {
  return [
    {
      id: "open",
      label: i18n.t("menu.open"),
      action: props.onOpen,
    },
    {
      id: "openInNewTab",
      label: i18n.t("menu.openInNewTab"),
      action: props.onOpenInNewTab,
    },
    {
      id: "openInNewWindow",
      label: i18n.t("menu.openInNewWindow"),
      action: props.onOpenInNewWindow,
    },
    { id: "sep1", separator: true },
    {
      id: "copyFilePath",
      label: i18n.t("menu.copyFilePath"),
      action: props.onCopyFilePath,
    },
    {
      id: "revealInExplorer",
      label: i18n.t("menu.revealInExplorer"),
      action: props.onRevealInExplorer,
    },
  ];
}
