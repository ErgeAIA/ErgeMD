export interface ShortcutItem {
  id: string;
  keys: string;
  /** i18n key under shortcuts.items */
  labelKey: string;
}

export interface ShortcutGroup {
  id: "file" | "view" | "reading" | "export";
  items: ShortcutItem[];
}

/**
 * 快捷键单一事实源：欢迎页与快捷键弹窗都从这里取，避免两处漂移。
 * 修改绑定后必须同步 useKeyboardShortcuts 与这里。
 */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: "file",
    items: [
      { id: "open-file", keys: "Ctrl+O", labelKey: "openFile" },
      { id: "open-folder", keys: "Ctrl+Alt+O", labelKey: "openFolder" },
      { id: "new-window", keys: "Ctrl+N", labelKey: "newWindow" },
      { id: "close-tab", keys: "Ctrl+W", labelKey: "closeTab" },
      { id: "go-home", keys: "Ctrl+Shift+R", labelKey: "goHome" },
    ],
  },
  {
    id: "view",
    items: [
      { id: "next-tab", keys: "Ctrl+Tab", labelKey: "nextTab" },
      { id: "prev-tab", keys: "Ctrl+Shift+Tab", labelKey: "prevTab" },
      { id: "sidebar", keys: "Ctrl+L", labelKey: "sidebar" },
      { id: "reading-options", keys: "Ctrl+,", labelKey: "readingOptions" },
      { id: "pin-toc", keys: "Ctrl+Shift+L", labelKey: "pinToc" },
      { id: "fullscreen", keys: "F11", labelKey: "fullscreen" },
      { id: "shortcuts", keys: "Ctrl+K", labelKey: "shortcuts" },
    ],
  },
  {
    id: "reading",
    items: [
      { id: "search", keys: "Ctrl+F", labelKey: "search" },
      { id: "font-up", keys: "Ctrl+↑", labelKey: "fontUp" },
      { id: "font-down", keys: "Ctrl+↓", labelKey: "fontDown" },
      { id: "reset-font", keys: "Ctrl+0", labelKey: "resetFont" },
      { id: "zoom", keys: "Ctrl+滚轮", labelKey: "zoom" },
      { id: "line-height", keys: "Shift+滚轮", labelKey: "lineHeight" },
    ],
  },
  {
    id: "export",
    items: [
      { id: "export-pdf", keys: "Ctrl+P", labelKey: "exportPdf" },
      {
        id: "export-pdf-gray",
        keys: "Ctrl+Shift+P",
        labelKey: "exportPdfGrayscale",
      },
      { id: "export-html", keys: "Ctrl+E", labelKey: "exportHtml" },
      { id: "export-word", keys: "Ctrl+Shift+E", labelKey: "exportWord" },
      { id: "copy-path", keys: "Ctrl+Shift+C", labelKey: "copyPath" },
      { id: "reveal", keys: "Ctrl+Shift+D", labelKey: "reveal" },
    ],
  },
];

/** 欢迎页只展示「空状态下真正可用」的快捷键 */
export const WELCOME_SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: "file",
    items: SHORTCUT_GROUPS[0].items.filter((item) =>
      ["open-file", "open-folder", "new-window"].includes(item.id),
    ),
  },
  {
    id: "view",
    items: SHORTCUT_GROUPS[1].items.filter((item) =>
      ["reading-options", "fullscreen"].includes(item.id),
    ),
  },
];