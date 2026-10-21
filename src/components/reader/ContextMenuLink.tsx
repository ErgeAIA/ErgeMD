import ContextMenu from "@/components/context-menu/ContextMenu";
import { getLinkContextMenuItems } from "@/components/context-menu/LinkContextMenu";
import { useContextMenu } from "@/hooks/useContextMenu";
import React, { memo, useCallback, useState } from "react";
import LinkEditModal from "./LinkEditModal";

type ContextMenuLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

/**
 * 带右键菜单的链接组件。
 */
const ContextMenuLink: React.FC<ContextMenuLinkProps> = memo((props) => {
  const { href, children, ...rest } = props;
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [currentHref, setCurrentHref] = useState("");
  const {
    menuState,
    menuRef,
    show: showContextMenu,
    hide: hideContextMenu,
    adjustPosition,
  } = useContextMenu();

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const linkHref = href || "";
      const linkText = e.currentTarget.textContent || "";
      const isExternal =
        linkHref.startsWith("http://") || linkHref.startsWith("https://");

      const items = getLinkContextMenuItems({
        href: linkHref,
        onOpenLink: () => {
          if (isExternal) {
            window.open(linkHref, "_blank", "noopener,noreferrer");
          }
        },
        onCopyLinkAddress: () => {
          navigator.clipboard.writeText(linkHref);
        },
        onEditLink: () => {
          hideContextMenu();
          setCurrentText(linkText);
          setCurrentHref(linkHref);
          setShowEditModal(true);
        },
      });

      showContextMenu(e, items);
    },
    [href, showContextMenu, hideContextMenu],
  );

  const handleSaveLink = useCallback(
    (text: string, newHref: string) => {
      setShowEditModal(false);
      // 更新链接内容
      setCurrentText(text);
      setCurrentHref(newHref);
    },
    [],
  );

  const handleCancelEdit = useCallback(() => {
    setShowEditModal(false);
  }, []);

  const displayText = showEditModal ? currentText : (children as React.ReactNode);
  const displayHref = showEditModal ? currentHref : href;

  return (
    <>
      <a
        href={displayHref}
        style={{
          color: "var(--link, var(--accent-cyan))",
          textDecoration: "none",
          borderBottom: "1px solid transparent",
          transition: "border-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderBottomColor =
            "var(--active-border)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderBottomColor =
            "transparent";
        }}
        onContextMenu={handleContextMenu}
        {...rest}
      >
        {displayText}
      </a>
      {menuState && menuState.visible && (
        <ContextMenu
          menuState={menuState}
          menuRef={menuRef}
          adjustPosition={adjustPosition}
          onClose={hideContextMenu}
        />
      )}
      {showEditModal && (
        <LinkEditModal
          linkText={currentText}
          linkHref={currentHref}
          onSave={handleSaveLink}
          onCancel={handleCancelEdit}
        />
      )}
    </>
  );
});

ContextMenuLink.displayName = "ContextMenuLink";

export default ContextMenuLink;
