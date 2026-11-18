import type { ContextMenuEntry } from "@/types";
import i18n from "@/i18n";

export interface TOCContextMenuProps {
  sectionId: string;
  sectionTitle: string;
  onCopySectionTitle: () => void;
  onExportSectionHtml: () => void;
}

/**
 * TOC 右键菜单项（PDR 6.5.7）。
 * - 复制章节标题
 * - 导出此章节为 HTML
 *
 * 注意：跳转功能通过左键点击直接实现，不放在右键菜单中（冗余）。
 */
export function getTOCContextMenuItems(
  props: TOCContextMenuProps,
): ContextMenuEntry[] {
  return [
    {
      id: "copySectionTitle",
      label: i18n.t("menu.copySectionTitle"),
      action: props.onCopySectionTitle,
    },
    { id: "sep1", separator: true },
    {
      id: "exportSectionHtml",
      label: i18n.t("menu.exportSectionHtml"),
      action: props.onExportSectionHtml,
    },
  ];
}
