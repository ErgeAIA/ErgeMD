import ContextMenu from "@/components/context-menu/ContextMenu";
import { getFileListContextMenuItems } from "@/components/context-menu/FileListContextMenu";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useFileStore } from "@/stores/fileStore";
import type { DirListing, FileNode } from "@/types";
import { ancestorDirs, parentDir, relativeDirLabel } from "@/utils/fileTree";
import { invoke } from "@tauri-apps/api/core";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface FileListProps {
  onFileSelect: (filePath: string, fileName: string) => void;
  /** 面板展开时自动定位当前阅读文件，并触发一次增量刷新 */
  isOpen: boolean;
}

/** 与后端懒加载一致：展开层数上限，防止目录链接成环 */
const MAX_TREE_DEPTH = 32;
const SEARCH_LIMIT = 200;
const REFRESH_DEBOUNCE_MS = 250;

interface NodeRow {
  kind: "node";
  node: FileNode;
  depth: number;
  parentPath: string | null;
  setSize: number;
  posInSet: number;
}

type StatusVariant = "loading" | "empty" | "error" | "truncated" | "tooDeep";

interface StatusRow {
  kind: "status";
  key: string;
  depth: number;
  dir: string;
  variant: StatusVariant;
}

type Row = NodeRow | StatusRow;

const ROW_BASE_CLASS =
  "hover-file-item flex items-center gap-1.5 px-2 cursor-pointer text-sm outline-none select-none";

/** 行内距（不依赖 Tailwind 新类生成的稳定性）：32px 行高，中文长读不挤 */
const ROW_PADDING = { paddingTop: 6, paddingBottom: 6 } as const;

const FileList: React.FC<FileListProps> = memo(({ onFileSelect, isOpen }) => {
  const { t } = useTranslation();
  const workspacePath = useFileStore((s) => s.workspacePath);
  const workspaceName = useFileStore((s) => s.workspaceName);
  const currentFilePath = useFileStore((s) => s.currentFilePath);
  const expandedPaths = useFileStore((s) => s.expandedPaths);
  const setExpandedPaths = useFileStore((s) => s.setExpandedPaths);

  const [listings, setListings] = useState<Record<string, DirListing>>({});
  const [loadingDirs, setLoadingDirs] = useState<Record<string, boolean>>({});
  const [dirErrors, setDirErrors] = useState<Record<string, string>>({});
  const [rootState, setRootState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FileNode[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [filterFocused, setFilterFocused] = useState(false);

  const expandedSet = useMemo(() => new Set(expandedPaths), [expandedPaths]);
  const treeRef = useRef<HTMLUListElement>(null);
  const searchSeqRef = useRef(0);
  const refreshTimerRef = useRef<number | null>(null);
  const typeaheadRef = useRef<{ text: string; timer: number | null }>({
    text: "",
    timer: null,
  });
  const { menuState, menuRef, show, hide, adjustPosition } = useContextMenu();

  const isInsideWorkspace = useCallback(
    (path: string) => {
      if (!workspacePath) return false;
      const root = workspacePath.replace(/[\\/]+$/, "").toLowerCase();
      const p = path.toLowerCase();
      return p === root || p.startsWith(root + "\\") || p.startsWith(root + "/");
    },
    [workspacePath],
  );

  const loadDir = useCallback(async (dir: string): Promise<DirListing | null> => {
    setLoadingDirs((prev) => ({ ...prev, [dir]: true }));
    try {
      const listing = await invoke<DirListing>("scan_directory", {
        dirPath: dir,
      });
      setListings((prev) => ({ ...prev, [dir]: listing }));
      setDirErrors((prev) => {
        if (!(dir in prev)) return prev;
        const next = { ...prev };
        delete next[dir];
        return next;
      });
      return listing;
    } catch (err) {
      console.error("Failed to scan directory:", dir, err);
      setDirErrors((prev) => ({ ...prev, [dir]: String(err) }));
      return null;
    } finally {
      setLoadingDirs((prev) => {
        const next = { ...prev };
        delete next[dir];
        return next;
      });
    }
  }, []);

  // 工作区切换：清缓存、读根层、恢复已持久化的展开目录（浅层优先）
  const restoreSeqRef = useRef(0);
  useEffect(() => {
    if (!workspacePath) return;
    const seq = ++restoreSeqRef.current;
    setListings({});
    setDirErrors({});
    setRootState("loading");
    setFocusPath(null);
    setQuery("");
    setSearchResults(null);

    (async () => {
      const listing = await loadDir(workspacePath);
      if (restoreSeqRef.current !== seq) return;
      setRootState(listing ? "ready" : "error");
      if (!listing) return;

      const restorable = expandedPaths
        .filter((p) => p !== workspacePath && isInsideWorkspace(p))
        .sort((a, b) => a.length - b.length);
      for (const dir of restorable) {
        if (restoreSeqRef.current !== seq) return;
        await loadDir(dir);
      }
    })();
    // 仅在工作区变化时重建；展开状态只在重建时读取一次
  }, [workspacePath, isInsideWorkspace, loadDir]);

  // 增量刷新：根层 + 所有已展开目录；窗口回焦、可见性恢复、面板打开时触发
  const refreshWorkspace = useCallback(() => {
    if (!workspacePath) return;
    const dirs = new Set<string>([workspacePath]);
    for (const dir of expandedPaths) {
      if (isInsideWorkspace(dir)) dirs.add(dir);
    }
    void loadDir(workspacePath).then((listing) => {
      if (listing) {
        setRootState("ready");
      } else {
        setRootState("error");
        setListings((prev) => {
          if (!(workspacePath in prev)) return prev;
          const next = { ...prev };
          delete next[workspacePath];
          return next;
        });
      }
    });
    for (const dir of dirs) {
      if (dir !== workspacePath) void loadDir(dir);
    }
  }, [workspacePath, expandedPaths, isInsideWorkspace, loadDir]);

  useEffect(() => {
    if (!isOpen) return;
    const schedule = () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        refreshWorkspace();
      }, REFRESH_DEBOUNCE_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") schedule();
    };
    window.addEventListener("focus", schedule);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("ergemd:workspace-refresh", schedule);
    return () => {
      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("ergemd:workspace-refresh", schedule);
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [refreshWorkspace, isOpen]);

  const toggleDir = useCallback(
    (dir: string) => {
      const next = new Set(expandedPaths);
      if (next.has(dir)) {
        next.delete(dir);
      } else {
        next.add(dir);
        if (!listings[dir] && !loadingDirs[dir]) void loadDir(dir);
      }
      setExpandedPaths([...next]);
    },
    [expandedPaths, listings, loadingDirs, loadDir, setExpandedPaths],
  );

  const revealPath = useCallback(
    async (filePath: string) => {
      if (!workspacePath) return;
      const dirs = ancestorDirs(filePath, workspacePath);
      if (dirs.length === 0) return;
      const next = new Set(expandedPaths);
      dirs.forEach((dir) => next.add(dir));
      setExpandedPaths([...next]);
      setQuery("");
      setSearchResults(null);
      setFocusPath(filePath);
      for (const dir of dirs) {
        await loadDir(dir);
      }
      requestAnimationFrame(() => {
        const el = treeRef.current?.querySelector<HTMLElement>(
          `[data-tree-path="${CSS.escape(filePath)}"]`,
        );
        el?.scrollIntoView({ block: "center" });
      });
    },
    [workspacePath, expandedPaths, loadDir, setExpandedPaths],
  );

  // 面板每次打开：刷新一次，并自动定位当前文件
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      refreshWorkspace();
      if (currentFilePath) void revealPath(currentFilePath);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, currentFilePath, revealPath, refreshWorkspace]);

  // 筛选：走后端文件名搜索，避免为筛选而把整棵树读进内存
  useEffect(() => {
    const q = query.trim();
    const seq = ++searchSeqRef.current;
    if (!q || !workspacePath) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await invoke<FileNode[]>("search_workspace_files", {
          root: workspacePath,
          query: q,
          limit: SEARCH_LIMIT,
        });
        if (seq === searchSeqRef.current) {
          setSearchResults(results);
          setSearching(false);
        }
      } catch (err) {
        console.error("Failed to search workspace:", err);
        if (seq === searchSeqRef.current) {
          setSearchResults([]);
          setSearching(false);
        }
      }
    }, REFRESH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, workspacePath]);

  const rows = useMemo<Row[]>(() => {
    if (!workspacePath) return [];
    const out: Row[] = [];

    const pushDirStatus = (dir: string, depth: number) => {
      if (dirErrors[dir]) {
        out.push({ kind: "status", key: `err:${dir}`, depth, dir, variant: "error" });
        return;
      }
      const listing = listings[dir];
      if (!listing) {
        out.push({
          kind: "status",
          key: `loading:${dir}`,
          depth,
          dir,
          variant: "loading",
        });
        return;
      }
      if (listing.entries.length === 0) {
        out.push({ kind: "status", key: `empty:${dir}`, depth, dir, variant: "empty" });
      }
      if (listing.truncated) {
        out.push({
          kind: "status",
          key: `trunc:${dir}`,
          depth,
          dir,
          variant: "truncated",
        });
      }
    };

    const walk = (entries: FileNode[], depth: number, parent: string | null) => {
      entries.forEach((node, index) => {
        out.push({
          kind: "node",
          node,
          depth,
          parentPath: parent,
          setSize: entries.length,
          posInSet: index + 1,
        });
        if (!node.is_dir || !expandedSet.has(node.path)) return;
        if (depth >= MAX_TREE_DEPTH) {
          out.push({
            kind: "status",
            key: `deep:${node.path}`,
            depth: depth + 1,
            dir: node.path,
            variant: "tooDeep",
          });
          return;
        }
        pushDirStatus(node.path, depth + 1);
        const listing = listings[node.path];
        if (listing) walk(listing.entries, depth + 1, node.path);
      });
    };

    const root = listings[workspacePath];
    if (root) walk(root.entries, 0, workspacePath);
    return out;
  }, [workspacePath, listings, dirErrors, expandedSet]);

  const focusableRows = useMemo(
    () => rows.filter((row): row is NodeRow => row.kind === "node"),
    [rows],
  );

  // 焦点所在节点被折叠/刷新掉时，把 Tab 停靠点回落到第一个可见节点
  const rovingPath = useMemo(() => {
    if (focusPath && focusableRows.some((row) => row.node.path === focusPath)) {
      return focusPath;
    }
    return focusableRows[0]?.node.path ?? null;
  }, [focusPath, focusableRows]);

  const focusRow = useCallback((path: string | null) => {
    setFocusPath(path);
    if (!path) return;
    requestAnimationFrame(() => {
      treeRef.current
        ?.querySelector<HTMLElement>(`[data-tree-path="${CSS.escape(path)}"]`)
        ?.focus();
    });
  }, []);

  const activateNode = useCallback(
    (node: FileNode) => {
      if (node.is_dir) {
        toggleDir(node.path);
      } else {
        onFileSelect(node.path, node.name);
      }
    },
    [onFileSelect, toggleDir],
  );

  const handleTreeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      const currentIndex = focusableRows.findIndex(
        (row) => row.node.path === focusPath,
      );
      const index = currentIndex === -1 ? 0 : currentIndex;
      const row = focusableRows[index];

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = focusableRows[Math.min(index + 1, focusableRows.length - 1)];
          if (next) focusRow(next.node.path);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = focusableRows[Math.max(index - 1, 0)];
          if (prev) focusRow(prev.node.path);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (!row) break;
          if (row.node.is_dir && !expandedSet.has(row.node.path)) {
            toggleDir(row.node.path);
          } else {
            const next = focusableRows[index + 1];
            if (next) focusRow(next.node.path);
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (!row) break;
          if (row.node.is_dir && expandedSet.has(row.node.path)) {
            toggleDir(row.node.path);
          } else if (row.parentPath) {
            focusRow(row.parentPath);
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          if (focusableRows[0]) focusRow(focusableRows[0].node.path);
          break;
        }
        case "End": {
          e.preventDefault();
          const last = focusableRows[focusableRows.length - 1];
          if (last) focusRow(last.node.path);
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          if (row) activateNode(row.node);
          break;
        }
        default: {
          // 类型预选：连续可打印字符在 500ms 内拼接，跳到以该串开头的下一项
          if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
          const ta = typeaheadRef.current;
          ta.text += e.key.toLowerCase();
          if (ta.timer !== null) window.clearTimeout(ta.timer);
          ta.timer = window.setTimeout(() => {
            ta.text = "";
            ta.timer = null;
          }, 500);
          const ordered = [
            ...focusableRows.slice(index + 1),
            ...focusableRows.slice(0, index + 1),
          ];
          const match = ordered.find((r) =>
            r.node.name.toLowerCase().startsWith(ta.text),
          );
          if (match) focusRow(match.node.path);
        }
      }
    },
    [focusPath, focusableRows, expandedSet, toggleDir, focusRow, activateNode],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: FileNode) => {
      const items = getFileListContextMenuItems({
        filePath: node.path,
        fileName: node.name,
        isDir: node.is_dir,
        onOpen: () => {
          if (!node.is_dir) onFileSelect(node.path, node.name);
        },
        onOpenInNewWindow: () => {
          if (node.is_dir) return;
          invoke("new_window", {
            filePath: node.path,
            workspacePath: null,
          }).catch((err) => console.error("Failed to open new window:", err));
        },
        onCopyFilePath: () => {
          navigator.clipboard
            .writeText(node.path)
            .catch((err) => console.error("Failed to copy path:", err));
        },
        onRevealInExplorer: () => {
          invoke("reveal_in_explorer", { filePath: node.path }).catch((err) =>
            console.error("Failed to reveal in explorer:", err),
          );
        },
      });
      show(e, items);
    },
    [onFileSelect, show],
  );

  const rootListing = workspacePath ? listings[workspacePath] : undefined;

  const statusText = (row: StatusRow): string => {
    switch (row.variant) {
      case "loading":
        return t("files.loading");
      case "empty":
        return t("files.emptyFolder");
      case "error":
        return t("files.loadFailed");
      case "truncated":
        return t("files.truncated");
      case "tooDeep":
        return t("files.tooDeep");
    }
  };

  const renderStatusRow = (row: StatusRow) => (
    <li key={row.key} role="none">
      <div
        role="treeitem"
        aria-level={row.depth + 1}
        aria-disabled="true"
        tabIndex={-1}
        className="flex items-center gap-2 px-2 text-xs select-none"
        style={{
          paddingLeft: `${row.depth * 12 + 12}px`,
          ...ROW_PADDING,
          color: row.variant === "error" ? "var(--danger)" : "var(--text-muted)",
        }}
      >
        <span className="truncate">{statusText(row)}</span>
        {row.variant === "error" && (
          <button
            type="button"
            className="shrink-0 cursor-pointer underline"
            style={{ color: "var(--accent-cyan)", background: "transparent", border: "none", padding: 0 }}
            onClick={() => void loadDir(row.dir)}
          >
            {t("files.retry")}
          </button>
        )}
      </div>
    </li>
  );

  if (!workspacePath) return null;

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* 头部：工作区名 + 定位/刷新 + 筛选 */}
      <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          className="flex items-center gap-1"
          style={{ padding: "10px 16px 4px 16px" }}
        >
          <span
            className="flex-1 truncate text-xs font-medium tracking-wide uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            {workspaceName || t("files.workspaceFallback")}
          </span>
          <button
            type="button"
            aria-label={t("files.revealActive")}
            data-hint={t("files.revealActive")}
            disabled={!currentFilePath}
            onClick={() => {
              if (currentFilePath) void revealPath(currentFilePath);
            }}
            className="flex items-center justify-center cursor-pointer disabled:cursor-default"
            style={{
              width: 22,
              height: 22,
              background: "transparent",
              border: "none",
              padding: 0,
              color: currentFilePath ? "var(--text-secondary)" : "var(--text-muted)",
              opacity: currentFilePath ? 1 : 0.4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="1.4" fill="currentColor" />
              <path d="M7 0.8v1.6M7 11.6v1.6M0.8 7h1.6M11.6 7h1.6" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={t("files.refresh")}
            data-hint={t("files.refresh")}
            onClick={refreshWorkspace}
            className="flex items-center justify-center cursor-pointer"
            style={{
              width: 22,
              height: 22,
              background: "transparent",
              border: "none",
              padding: 0,
              color: "var(--text-secondary)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M12 7a5 5 0 1 1-1.6-3.7M12 1.6V4.5H9.1"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div style={{ padding: "0 16px 8px 16px" }}>
          <div className="relative flex items-center">
            <svg
              aria-hidden="true"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="absolute pointer-events-none"
              style={{ left: 8, color: "var(--text-muted)" }}
            >
              <circle cx="5" cy="5" r="3.4" stroke="currentColor" strokeWidth="1.2" />
              <path d="M7.6 7.6L10.4 10.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFilterFocused(true)}
              onBlur={() => setFilterFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("");
                  setSearchResults(null);
                  e.stopPropagation();
                } else if (e.key === "Enter" && searchResults && searchResults[0]) {
                  const first = searchResults[0];
                  onFileSelect(first.path, first.name);
                }
              }}
              placeholder={t("files.filterPlaceholder")}
              aria-label={t("files.filterPlaceholder")}
              className="sidebar-filter-input w-full"
              style={{
                height: 28,
                paddingLeft: 26,
                paddingRight: query ? 26 : 8,
                background: "var(--bg-page)",
                border: `1px solid ${filterFocused ? "var(--active-border)" : "var(--divider)"}`,
                borderRadius: 5,
                boxShadow: filterFocused
                  ? "0 0 0 3px rgba(var(--accent-cyan-rgb), 0.12)"
                  : "none",
                color: "var(--text-primary)",
                caretColor: "var(--accent-cyan)",
                fontSize: 12,
                outline: "none",
                transition: "border-color 120ms ease-out, box-shadow 120ms ease-out",
              }}
            />
            {query && (
              <button
                type="button"
                aria-label={t("files.clearFilter")}
                data-hint={t("files.clearFilter")}
                onClick={() => {
                  setQuery("");
                  setSearchResults(null);
                }}
                className="absolute flex items-center justify-center cursor-pointer"
                style={{
                  right: 4,
                  width: 18,
                  height: 18,
                  padding: 0,
                  border: "none",
                  borderRadius: 9,
                  background: "transparent",
                  color: "var(--text-muted)",
                }}
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                  <path d="M1.5 1.5L7.5 7.5M7.5 1.5L1.5 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 内容 */}
      {searchResults !== null ? (
        <div className="flex-1 min-h-0 overflow-y-auto py-1" style={{ scrollbarWidth: "thin" }}>
          <div className="px-3 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {searching
              ? t("files.searching")
              : t("files.searchResults", { count: searchResults.length })}
          </div>
          {!searching && searchResults.length === 0 && (
            <div className="px-3 py-2 text-sm" style={{ color: "var(--text-muted)" }}>
              {t("files.noResults")}
            </div>
          )}
          <ul role="listbox" aria-label={t("files.searchResultsLabel")}>
            {searchResults.map((node) => (
              <li key={node.path} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className={`${ROW_BASE_CLASS} w-full text-left`}
                  style={{
                    color: "var(--text-primary)",
                    background: "transparent",
                    border: "none",
                    paddingLeft: 16,
                    ...ROW_PADDING,
                  }}
                  onClick={() => {
                    onFileSelect(node.path, node.name);
                    void revealPath(node.path);
                  }}
                >
                  <span className="truncate flex-1">{node.name}</span>
                  <span
                    className="truncate text-xs max-w-[45%]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {relativeDirLabel(parentDir(node.path), workspacePath)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : rootState === "loading" ? (
        <div className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>
          {t("files.loading")}
        </div>
      ) : rootState === "error" ? (
        <div className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>
          {t("files.loadFailed")}
          <button
            type="button"
            className="ml-2 cursor-pointer underline"
            style={{ color: "var(--accent-cyan)", background: "transparent", border: "none", padding: 0 }}
            onClick={refreshWorkspace}
          >
            {t("files.retry")}
          </button>
        </div>
      ) : rootListing && rootListing.entries.length === 0 ? (
        <div className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>
          {t("files.emptyWorkspace")}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          <ul
            ref={treeRef}
            role="tree"
            aria-label={t("files.projectFiles")}
            className="py-1 outline-none"
            onKeyDown={handleTreeKeyDown}
          >
            {rows.map((row) => {
              if (row.kind === "status") return renderStatusRow(row);
              const { node, depth, setSize, posInSet } = row;
              const isDir = node.is_dir;
              const isExpanded = isDir && expandedSet.has(node.path);
              const isActive = !isDir && currentFilePath === node.path;
              const hasTabIndex = rovingPath === node.path;

              return (
                <li key={node.path} role="none">
                  <div
                    role="treeitem"
                    aria-level={depth + 1}
                    aria-setsize={setSize}
                    aria-posinset={posInSet}
                    aria-expanded={isDir ? isExpanded : undefined}
                    aria-selected={isActive ? true : undefined}
                    aria-label={node.name}
                    tabIndex={hasTabIndex ? 0 : -1}
                    data-tree-path={node.path}
                    className={ROW_BASE_CLASS}
                    style={{
                      paddingLeft: `${depth * 12 + 12}px`,
                      ...ROW_PADDING,
                      color: isActive
                        ? "var(--accent-cyan)"
                        : isDir
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
                      background: isActive
                        ? "rgba(var(--accent-cyan-rgb), 0.1)"
                        : undefined,
                      outline:
                        focusPath === node.path
                          ? "1px solid var(--active-border)"
                          : undefined,
                      outlineOffset: "-1px",
                    }}
                    onClick={() => activateNode(node)}
                    onFocus={() => setFocusPath(node.path)}
                    onContextMenu={(e) => handleContextMenu(e, node)}
                  >
                    {isDir ? (
                      <svg
                        aria-hidden="true"
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        className="shrink-0 opacity-60"
                        style={{
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 100ms ease-out",
                        }}
                      >
                        <path d="M3 1L7 5L3 9" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    ) : (
                      <span className="w-[10px] shrink-0" />
                    )}

                    <svg
                      aria-hidden="true"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                      className="shrink-0 opacity-50"
                    >
                      {isDir ? (
                        <path d="M1 2.5C1 1.67 1.67 1 2.5 1H4.29a1 1 0 01.7.29L6 2.3a1 1 0 01.3.7V9.5c0 .83-.67 1.5-1.5 1.5h-2C1.67 11 1 10.33 1 9.5v-7z" />
                      ) : (
                        <>
                          <path d="M2 1C1.44772 1 1 1.44772 1 2V10C1 10.5523 1.44772 11 2 11H8C8.55228 11 9 10.5523 9 10V4L6 1H2Z" />
                          <path d="M6 1V4H9" stroke="currentColor" strokeWidth="0.5" fill="none" />
                        </>
                      )}
                    </svg>

                    <span className="truncate">{node.name}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {menuState && menuState.visible && (
        <ContextMenu
          menuState={menuState}
          menuRef={menuRef}
          adjustPosition={adjustPosition}
          onClose={hide}
        />
      )}
    </div>
  );
});

FileList.displayName = "FileList";

export default FileList;