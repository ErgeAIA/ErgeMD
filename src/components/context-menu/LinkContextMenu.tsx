import type { ContextMenuEntry } from "@/types";
import i18n from "@/i18n";

export interface LinkContextMenuProps {
  href: string;
  onOpenLink: () => void;
  onCopyLinkAddress: () => void;
  onEditLink?: () => void;
}

/**
 * 链接右键菜单项（PDR 6.5.4）。
 * - 打开链接（默认浏览器）
 * - 复制链接地址
 * - 编辑链接（修改链接文本和地址）
 */
export function getLinkContextMenuItems(
  props: LinkContextMenuProps,
): ContextMenuEntry[] {
  const items: ContextMenuEntry[] = [
    {
      id: "openLink",
      label: i18n.t("menu.openLink"),
      action: props.onOpenLink,
    },
    {
      id: "copyLinkAddress",
      label: i18n.t("menu.copyLinkAddress"),
      shortcut: "Ctrl+C",
      action: props.onCopyLinkAddress,
    },
  ];

  // 如果提供了编辑回调，添加编辑菜单项
  if (props.onEditLink) {
    items.push({
      id: "editLink",
      label: i18n.t("menu.editLink"),
      action: props.onEditLink,
    });
  }

  return items;
}
