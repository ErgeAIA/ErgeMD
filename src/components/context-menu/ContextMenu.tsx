import "@/styles/context-menu.css";
import type { ContextMenuItem, ContextMenuState } from "@/types";
import i18n from "@/i18n";
import React, { memo, useCallback, useEffect, type RefObject } from "react";

interface ContextMenuProps {
  menuState: ContextMenuState;
  menuRef: RefObject<HTMLDivElement | null>;
  adjustPosition: (el: HTMLDivElement) => void;
  onClose: () => void;
}

/**
 * 通用右键菜单容器组件。
 *
 * 职责：
 * - 根据 menuState 渲染菜单 UI
 * - 位置自动修正（防止超出视口）
 * - 菜单项点击后自动关闭
 * - 分隔线渲染
 *
 * 使用方式：在 App.tsx 中挂载一次，通过 useContextMenu Hook 驱动。
 */
const ContextMenu: React.FC<ContextMenuProps> = memo(
  ({ menuState, menuRef, adjustPosition, onClose }) => {
    // 位置修正：菜单首次渲染后检测是否超出视口
    useEffect(() => {
      if (menuState.visible && menuRef.current) {
        adjustPosition(menuRef.current);
      }
    }, [menuState.visible, menuState.x, menuState.y, menuRef, adjustPosition]);

    const handleItemClick = useCallback(
      (item: ContextMenuItem) => {
        if (item.disabled) return;
        item.action?.();
        onClose();
      },
      [onClose],
    );

    if (!menuState.visible || menuState.items.length === 0) return null;

    return (
      <div
        ref={menuRef}
        className="context-menu"
        role="menu"
        aria-label={i18n.t("menu.contextMenu")}
        data-no-drag
        style={{
          left: menuState.x,
          top: menuState.y,
        }}
      >
        {menuState.items.map((entry) => {
          if ("separator" in entry && entry.separator) {
            return <Separator key={entry.id} />;
          }
          return (
            <MenuItem
              key={entry.id}
              entry={entry as ContextMenuItem}
              onClick={handleItemClick}
            />
          );
        })}
      </div>
    );
  },
);

ContextMenu.displayName = "ContextMenu";

// ===== 菜单项子组件 =====
const MenuItem: React.FC<{
  entry: ContextMenuItem;
  onClick: (item: ContextMenuItem) => void;
}> = memo(({ entry, onClick }) => {
  const classNames = ["context-menu-item"];
  if (entry.disabled) classNames.push("context-menu-item--disabled");
  if (entry.danger) classNames.push("context-menu-item--danger");

  return (
    <div
      className={classNames.join(" ")}
      role="menuitem"
      tabIndex={entry.disabled ? -1 : 0}
      aria-disabled={entry.disabled}
      onClick={() => onClick(entry)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(entry);
        }
      }}
    >
      <span>{entry.label}</span>
      {entry.shortcut && (
        <span className="context-menu-item-shortcut">{entry.shortcut}</span>
      )}
    </div>
  );
});

MenuItem.displayName = "MenuItem";

// ===== 分隔线子组件 =====
const Separator: React.FC = memo(() => {
  return <div className="context-menu-separator" role="separator" />;
});

Separator.displayName = "Separator";

export default ContextMenu;
