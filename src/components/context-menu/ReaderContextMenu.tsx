import type { ContextMenuEntry } from "@/types";
import i18n from "@/i18n";

export interface ReaderContextMenuProps {
  hasSelection: boolean;
  selectedText: string;
  onCopy: () => void;
  onSelectAll: () => void;
  onSearch: (query: string) => void;
  onEditParagraph: () => void;
  canEditParagraph: boolean;
  onExportHtml: () => void;
  onExportPdf: () => void;
  onExportPdfGrayscale: () => void;
  onExportDocx: () => void;
  onOpenInNewWindow: () => void;
  onShowAbout?: () => void;
}

export function getReaderContextMenuItems(
  props: ReaderContextMenuProps,
): ContextMenuEntry[] {
  const items: ContextMenuEntry[] = [];

  items.push({
    id: "copy",
    label: i18n.t("menu.copy"),
    shortcut: "Ctrl+C",
    disabled: !props.hasSelection,
    action: props.onCopy,
  });

  items.push({
    id: "selectAll",
    label: i18n.t("menu.selectAll"),
    shortcut: "Ctrl+A",
    action: props.onSelectAll,
  });

  if (props.hasSelection) {
    items.push({
      id: "search",
      label: i18n.t("menu.search"),
      action: () => props.onSearch(props.selectedText),
    });
  }

  items.push({ id: "sep1", separator: true });

  if (props.canEditParagraph) {
    items.push({
      id: "editParagraph",
      label: i18n.t("menu.editParagraph"),
      shortcut: i18n.t("menu.doubleClick"),
      action: props.onEditParagraph,
    });

    items.push({ id: "sep2", separator: true });
  }

  items.push({
    id: "exportHtml",
    label: i18n.t("menu.exportHtml"),
    shortcut: "Ctrl+E",
    action: props.onExportHtml,
  });

  items.push({
    id: "exportPdfGrayscale",
    label: i18n.t("menu.exportPdfGrayscale"),
    shortcut: "Ctrl+Shift+P",
    action: props.onExportPdfGrayscale,
  });

  items.push({
    id: "exportPdf",
    label: i18n.t("menu.exportPdf"),
    shortcut: "Ctrl+P",
    action: props.onExportPdf,
  });

  items.push({
    id: "exportDocx",
    label: i18n.t("menu.exportWord"),
    shortcut: "Ctrl+Shift+E",
    action: props.onExportDocx,
  });

  items.push({ id: "sep3", separator: true });

  items.push({
    id: "openInNewWindow",
    label: i18n.t("menu.openInNewWindow"),
    shortcut: "Ctrl+N",
    action: props.onOpenInNewWindow,
  });

  if (props.onShowAbout) {
    items.push({ id: "sep4", separator: true });
    items.push({
      id: "about",
      label: i18n.t("menu.aboutErgeMD"),
      action: props.onShowAbout,
    });
  }

  return items;
}
