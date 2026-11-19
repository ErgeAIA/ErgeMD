import type { ContextMenuEntry } from "@/types";
import i18n from "@/i18n";

export interface FileListContextMenuProps {
  filePath: string;
  fileName: string;
  isDir: boolean;
  onOpen: () => void;
  onOpenInNewWindow: () => void;
  onCopyFilePath: () => void;
  onRevealInExplorer: () => void;
}

/**
 * 文件列表右键菜单项（PDR 6.5.6）。
 * 文件：打开 / 在新窗口打开 / 复制路径 / 在资源管理器中显示。
 * 目录：复制路径 / 在资源管理器中显示（目录无「打开」语义）。
 * 不提供「在新标签页打开」——当前「打开」本身就会复用或新建标签页。
 */
export function getFileListContextMenuItems(
  props: FileListContextMenuProps,
): ContextMenuEntry[] {
  const items: ContextMenuEntry[] = [];

  if (!props.isDir) {
    items.push(
      {
        id: "open",
        label: i18n.t("menu.open"),
        action: props.onOpen,
      },
      {
        id: "openInNewWindow",
        label: i18n.t("menu.openInNewWindow"),
        action: props.onOpenInNewWindow,
      },
      { id: "sep1", separator: true },
    );
  }

  items.push(
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
  );

  return items;
}