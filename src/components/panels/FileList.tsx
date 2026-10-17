import ContextMenu from "@/components/context-menu/ContextMenu";
import { getFileListContextMenuItems } from "@/components/context-menu/FileListContextMenu";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useFileStore } from "@/stores/fileStore";
import type { FileNode } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import React, { memo, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface FileListProps {
  onFileSelect: (filePath: string, fileName: string) => void;
}

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  onFileSelect: (filePath: string, fileName: string) => void;
}

/**
 * FileTreeNode — ARIA Treeitem 模式
 *
 * 遵循 W3C WAI-ARIA Tree View Pattern:
 * - role="treeitem" + aria-expanded
 * - Roving tabindex（仅焦点节点 tabIndex=0）
 * - 上下箭头键在可见节点间移动
 * - 左右箭头键展开/折叠
 * - Enter 激活
 */
const FileTreeNode: React.FC<FileTreeNodeProps> = memo(
  ({ node, depth, onFileSelect }) => {
    // 默认折叠（审计 L7）：仅根层（depth 0）默认展开，更深层级按需展开，
    // 避免大工作区一次性渲染全部节点
    const [isExpanded, setIsExpanded] = useState(depth === 0);
    const hasChildren = node.children && node.children.length > 0;
    const nodeRef = useRef<HTMLDivElement>(null);
    const {
      menuState,
      menuRef,
      show: showContextMenu,
      hide: hideContextMenu,
      adjustPosition,
    } = useContextMenu();

    const handleClick = useCallback(() => {
      if (hasChildren) {
        setIsExpanded((prev) => !prev);
      } else {
        if (
          node.name.endsWith(".md") ||
          node.name.endsWith(".markdown") ||
          node.name.endsWith(".mdx")
        ) {
          onFileSelect(node.path, node.name);
        }
      }
    }, [hasChildren, node, onFileSelect]);

    // 键盘导航：上下左右箭头 + Enter
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        const tree = nodeRef.current?.closest('[role="tree"]');
        if (!tree) return;

        const allItems = Array.from(
          tree.querySelectorAll<HTMLElement>('[role="treeitem"]'),
        ).filter((el) => el.offsetParent !== null); // 仅可见节点
        const currentIndex = allItems.indexOf(nodeRef.current!);
        if (currentIndex === -1) return;

        switch (e.key) {
          case "ArrowDown": {
            e.preventDefault();
            if (currentIndex < allItems.length - 1) {
              allItems[currentIndex + 1].focus();
            }
            break;
          }
          case "ArrowUp": {
            e.preventDefault();
            if (currentIndex > 0) {
              allItems[currentIndex - 1].focus();
            }
            break;
          }
          case "ArrowRight": {
            e.preventDefault();
            if (hasChildren && !isExpanded) {
              setIsExpanded(true);
            } else if (hasChildren && isExpanded) {
              // 已展开，焦点移至第一个子节点
              if (currentIndex < allItems.length - 1) {
                allItems[currentIndex + 1].focus();
              }
            }
            break;
          }
          case "ArrowLeft": {
            e.preventDefault();
            if (hasChildren && isExpanded) {
              setIsExpanded(false);
            }
            // 末端节点或已折叠：焦点移至父节点（通过缩进判断）
            break;
          }
          case "Enter":
          case " ": {
            e.preventDefault();
            handleClick();
            break;
          }
        }
      },
      [hasChildren, isExpanded, handleClick],
    );

    // 右键菜单
    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        const isMdFile =
          node.name.endsWith(".md") ||
          node.name.endsWith(".markdown") ||
          node.name.endsWith(".mdx");

        const items = getFileListContextMenuItems({
          filePath: node.path,
          fileName: node.name,
          onOpen: () => {
            if (isMdFile) onFileSelect(node.path, node.name);
          },
          onOpenInNewTab: () => {
            // TODO: 新标签页打开
            if (isMdFile) onFileSelect(node.path, node.name);
          },
          onOpenInNewWindow: () => {
            invoke("new_window", {
              filePath: node.path,
              workspacePath: null,
            }).catch(() => {});
          },
          onCopyFilePath: () => {
            navigator.clipboard.writeText(node.path);
          },
          onRevealInExplorer: () => {},
        });

        showContextMenu(e, items);
      },
      [node, onFileSelect, showContextMenu],
    );

    const isMdFile =
      node.name.endsWith(".md") ||
      node.name.endsWith(".markdown") ||
      node.name.endsWith(".mdx");

    return (
      <>
        <li role="none">
          <div
            ref={nodeRef}
            role="treeitem"
            aria-expanded={hasChildren ? isExpanded : undefined}
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onContextMenu={handleContextMenu}
            className="hover-file-item flex items-center gap-1.5 px-2 py-1.5 cursor-pointer text-sm outline-none"
            style={{
              paddingLeft: `${depth * 12 + 8}px`,
              color: isMdFile ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            {/* 展开/折叠图标 */}
            {hasChildren ? (
              <svg
                aria-hidden="true"
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="currentColor"
                style={{
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 100ms ease-out",
                }}
                className="shrink-0 opacity-50"
              >
                <path
                  d="M3 1L7 5L3 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            ) : (
              <span className="w-[10px] shrink-0" />
            )}

            {/* 文件/文件夹图标 */}
            {node.is_dir ? (
              <svg
                aria-hidden="true"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="currentColor"
                className="shrink-0 opacity-50"
              >
                <path d="M1 2.5C1 1.67 1.67 1 2.5 1H4.29a1 1 0 01.7.29L6 2.3a1 1 0 01.3.7V9.5c0 .83-.67 1.5-1.5 1.5h-2C1.67 11 1 10.33 1 9.5v-7z" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="currentColor"
                className="shrink-0 opacity-50"
              >
                <path d="M2 1C1.44772 1 1 1.44772 1 2V10C1 10.5523 1.44772 11 2 11H8C8.55228 11 9 10.5523 9 10V4L6 1H2Z" />
                <path
                  d="M6 1V4H9"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  fill="none"
                />
              </svg>
            )}

            {/* 文件名 */}
            <span className="truncate">{node.name}</span>
          </div>

          {/* 子节点 */}
          {hasChildren && isExpanded && (
            <ul role="group">
              {node.children!.map((child) => (
                <FileTreeNode
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  onFileSelect={onFileSelect}
                />
              ))}
            </ul>
          )}
        </li>

        {/* 右键菜单 */}
        {menuState && menuState.visible && (
          <ContextMenu
            menuState={menuState}
            menuRef={menuRef}
            adjustPosition={adjustPosition}
            onClose={hideContextMenu}
          />
        )}
      </>
    );
  },
);

FileTreeNode.displayName = "FileTreeNode";

const FileList: React.FC<FileListProps> = memo(({ onFileSelect }) => {
  const { t } = useTranslation();
  const fileTree = useFileStore((s) => s.fileTree);
  const workspaceName = useFileStore((s) => s.workspaceName);

  if (!fileTree || fileTree.length === 0) {
    return (
      <div className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>
        No markdown files found
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full" style={{ scrollbarWidth: "thin" }}>
      {/* 工作区标题 */}
      <div
        className="px-3 py-2 text-xs font-medium tracking-wide uppercase"
        style={{
          color: "var(--text-muted)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {workspaceName || "Workspace"}
      </div>

      {/* 文件树 */}
      <ul role="tree" aria-label={t("files.projectFiles")} className="py-1">
        {fileTree.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            onFileSelect={onFileSelect}
          />
        ))}
      </ul>
    </div>
  );
});

FileList.displayName = "FileList";

export default FileList;
