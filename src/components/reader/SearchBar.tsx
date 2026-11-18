import { useInteractionConfig } from "@/hooks/useActiveConfig";
import { useFileStore } from "@/stores/fileStore";
import { useReaderStore } from "@/stores/readerStore";
import { queryActiveMarkdownBody } from "@/utils/domUtils";
import { parseMarkdownBlocks } from "@/utils/markdownBlocks";
import React, { memo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * 文内搜索栏 — 固定在视口顶部居中。
 * 搜索 .markdown-body 内的文本节点，高亮匹配项。
 * Enter/Shift+Enter 切换匹配，Escape 关闭。
 *
 * 适配本地 readerStore 接口：
 * - searchQuery / searchResults (number[]) / currentSearchIndex
 * - setSearchQuery / setSearchResults / setCurrentSearchIndex
 * - openSearch / closeSearch / nextMatch / prevMatch
 */
const SearchBar: React.FC = memo(() => {
  const { t } = useTranslation();
  const interactionConfig = useInteractionConfig();
  const searchQuery = useReaderStore((s) => s.searchQuery);
  const searchResults = useReaderStore((s) => s.searchResults);
  const currentSearchIndex = useReaderStore((s) => s.currentSearchIndex);
  const isSearchOpen = useReaderStore((s) => s.isSearchOpen);
  const setSearchQuery = useReaderStore((s) => s.setSearchQuery);
  const setSearchResults = useReaderStore((s) => s.setSearchResults);
  const setCurrentSearchIndex = useReaderStore((s) => s.setCurrentSearchIndex);
  const closeSearch = useReaderStore((s) => s.closeSearch);
  const nextMatch = useReaderStore((s) => s.nextMatch);
  const prevMatch = useReaderStore((s) => s.prevMatch);
  const scrollToBlockIndex = useReaderStore((s) => s.scrollToBlockIndex);
  const currentContent = useFileStore((s) => s.currentContent);

  const inputRef = useRef<HTMLInputElement>(null);
  const highlightSpansRef = useRef<HTMLSpanElement[]>([]);
  /** 虚拟滚动模式：按解析块记录命中位置（块索引 + 块内第几次命中） */
  const blockMatchesRef = useRef<{ blockIndex: number; occurrence: number }[]>(
    [],
  );
  const activeQueryRef = useRef("");

  // 打开时自动聚焦
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isSearchOpen]);

  // 获取 .markdown-body 的最近可滚动祖先
  const getScrollContainer = useCallback((): HTMLElement | null => {
    const markdownBody = queryActiveMarkdownBody();
    if (!markdownBody) return null;
    // 向上查找 overflowY: auto 或 scroll 的祖先
    let el: HTMLElement | null = markdownBody.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      if (
        style.overflowY === "auto" ||
        style.overflowY === "scroll" ||
        style.overflow === "auto" ||
        style.overflow === "scroll"
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }, []);

  // 清除搜索高亮
  const clearHighlights = useCallback(() => {
    const container = queryActiveMarkdownBody();
    if (!container) return;

    const highlights = container.querySelectorAll(".search-highlight");
    highlights.forEach((highlight) => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(
          document.createTextNode(highlight.textContent || ""),
          highlight,
        );
        parent.normalize(); // 合并相邻文本节点
      }
    });

    highlightSpansRef.current = [];
  }, []);

  // 跳转到指定匹配（使用 container.scrollTo，不用 scrollIntoView）
  const scrollToMatch = useCallback(
    (index: number, spans?: HTMLSpanElement[]) => {
      const items = spans || highlightSpansRef.current;
      if (index < 0 || index >= items.length) return;

      const scrollContainer = getScrollContainer();
      if (!scrollContainer) return;

      const targetSpan = items[index];
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = targetSpan.getBoundingClientRect();
      const offset =
        targetRect.top - containerRect.top + scrollContainer.scrollTop;
      scrollContainer.scrollTo({
        top: offset - scrollContainer.clientHeight / 2 + targetRect.height / 2,
        behavior: "smooth",
      });

      // 更新高亮样式：当前匹配更亮
      items.forEach((span, i) => {
        span.style.background =
          i === index
            ? "var(--search-highlight-active, rgba(255,255,0,0.5))"
            : "var(--search-highlight, rgba(255,255,0,0.25))";
      });
    },
    [getScrollContainer],
  );

  /** 在指定容器内高亮 query，返回按出现顺序的 span 列表 */
  const highlightWithin = useCallback((root: HTMLElement, query: string) => {
    const spans: HTMLSpanElement[] = [];
    const lowerQuery = query.toLowerCase();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (!(node.textContent || "").toLowerCase().includes(lowerQuery)) continue;
      textNodes.push(node);
    }

    for (const node of textNodes) {
      const text = node.textContent || "";
      const lower = text.toLowerCase();
      let from = 0;
      const fragment = document.createDocumentFragment();

      while (true) {
        const idx = lower.indexOf(lowerQuery, from);
        if (idx === -1) break;
        if (idx > from) {
          fragment.appendChild(document.createTextNode(text.slice(from, idx)));
        }
        const span = document.createElement("span");
        span.textContent = text.slice(idx, idx + query.length);
        span.className = "search-highlight";
        span.style.background = "var(--search-highlight, rgba(255,255,0,0.25))";
        span.style.color = "inherit";
        span.style.borderRadius = "2px";
        span.style.padding = "0 1px";
        fragment.appendChild(span);
        spans.push(span);
        from = idx + query.length;
      }

      if (from < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(from)));
      }
      node.parentNode?.replaceChild(fragment, node);
    }

    return spans;
  }, []);

  /**
   * 虚拟滚动模式下跳转到第 index 个命中：先让虚拟列表滚到目标块，
   * 等块挂载后再就地高亮并居中。
   */
  const gotoBlockMatch = useCallback(
    (index: number) => {
      const match = blockMatchesRef.current[index];
      const query = activeQueryRef.current;
      if (!match || !query || !scrollToBlockIndex) return;

      clearHighlights();
      scrollToBlockIndex(match.blockIndex);

      const attempt = (retries: number) => {
        const blockEl = document.querySelector<HTMLElement>(
          `[data-index="${match.blockIndex}"]`,
        );
        if (!blockEl) {
          if (retries > 0) setTimeout(() => attempt(retries - 1), 120);
          return;
        }

        const spans = highlightWithin(blockEl, query);
        highlightSpansRef.current = spans;
        const target = spans[match.occurrence] ?? spans[0];
        spans.forEach((span) => {
          span.style.background =
            span === target
              ? "var(--search-highlight-active, rgba(255,255,0,0.5))"
              : "var(--search-highlight, rgba(255,255,0,0.25))";
        });

        const scrollContainer = getScrollContainer();
        if (!target || !scrollContainer) return;
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset =
          targetRect.top - containerRect.top + scrollContainer.scrollTop;
        scrollContainer.scrollTo({
          top: offset - scrollContainer.clientHeight / 2 + targetRect.height / 2,
          behavior: "smooth",
        });
      };

      setTimeout(() => attempt(3), 150);
    },
    [clearHighlights, getScrollContainer, highlightWithin, scrollToBlockIndex],
  );

  // 搜索高亮
  const performSearch = useCallback(
    (query: string) => {
      // 清除之前的高亮
      clearHighlights();

      if (!query.trim()) {
        blockMatchesRef.current = [];
        setSearchResults([]);
        return;
      }

      // ── 虚拟滚动模式：按解析块搜索全文，再滚动到块并就地高亮 ──
      if (scrollToBlockIndex) {
        activeQueryRef.current = query;
        const lowerQuery = query.toLowerCase();
        const { blocks } = parseMarkdownBlocks(currentContent);
        const matches: { blockIndex: number; occurrence: number }[] = [];

        blocks.forEach((block, blockIndex) => {
          const raw = (block.raw || "").toLowerCase();
          let from = 0;
          let occurrence = 0;
          while (true) {
            const idx = raw.indexOf(lowerQuery, from);
            if (idx === -1) break;
            matches.push({ blockIndex, occurrence });
            occurrence += 1;
            from = idx + lowerQuery.length;
          }
        });

        blockMatchesRef.current = matches;
        setSearchResults(matches.map((_, i) => i));
        if (matches.length > 0) {
          // 先归位再置 0，确保命中下标未变化时 effect 仍会触发跳转
          setCurrentSearchIndex(-1);
          setTimeout(() => setCurrentSearchIndex(0), 0);
        }
        return;
      }

      // 在 markdown-body 中搜索
      const container = queryActiveMarkdownBody();
      if (!container) {
        setSearchResults([]);
        return;
      }

      const matches: HTMLSpanElement[] = [];
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
      );

      const nodesToReplace: { node: Text; parent: Node }[] = [];

      while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        const text = textNode.textContent || "";
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        if (lowerText.indexOf(lowerQuery) !== -1) {
          const parent = textNode.parentNode;
          if (parent) {
            nodesToReplace.push({ node: textNode, parent });
          }
        }
      }

      for (const { node, parent } of nodesToReplace) {
        const text = node.textContent || "";
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        let lastIndex = 0;

        const fragment = document.createDocumentFragment();

        while (true) {
          const idx = lowerText.indexOf(lowerQuery, lastIndex);
          if (idx === -1) break;

          // 匹配前的文本
          if (idx > lastIndex) {
            fragment.appendChild(
              document.createTextNode(text.slice(lastIndex, idx)),
            );
          }

          // 高亮匹配文本
          const span = document.createElement("span");
          span.textContent = text.slice(idx, idx + query.length);
          span.style.background = "var(--search-highlight, rgba(255,255,0,0.25))";
          span.style.color = "inherit";
          span.style.borderRadius = "2px";
          span.style.padding = "0 1px";
          span.className = "search-highlight";
          fragment.appendChild(span);
          matches.push(span);

          lastIndex = idx + query.length;
        }

        // 剩余文本
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        parent.replaceChild(fragment, node);
      }

      highlightSpansRef.current = matches;
      setSearchResults(matches.map((_, i) => i));

      // 滚动到第一个匹配（使用 container.scrollTo，禁止 scrollIntoView）
      if (matches.length > 0) {
        scrollToMatch(0, matches);
        setCurrentSearchIndex(0);
      }
    },
    [
      clearHighlights,
      setSearchResults,
      setCurrentSearchIndex,
      getScrollContainer,
      scrollToMatch,
      scrollToBlockIndex,
      currentContent,
    ],
  );

  // 点击搜索框外部时自动关闭
  useEffect(() => {
    if (!isSearchOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-search-bar]")) {
        clearHighlights();
        closeSearch();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isSearchOpen, closeSearch, clearHighlights]);

  // 监听 currentSearchIndex 变化，跳转到对应匹配
  useEffect(() => {
    if (currentSearchIndex < 0) return;
    if (scrollToBlockIndex) {
      gotoBlockMatch(currentSearchIndex);
    } else {
      scrollToMatch(currentSearchIndex);
    }
  }, [
    currentSearchIndex,
    scrollToBlockIndex,
    gotoBlockMatch,
    scrollToMatch,
  ]);

  // 输入变化时重新搜索（debounce）
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, interactionConfig.searchDebounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // 键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          prevMatch();
        } else {
          nextMatch();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        clearHighlights();
        closeSearch();
      }
    },
    [nextMatch, prevMatch, closeSearch, clearHighlights],
  );

  if (!isSearchOpen) return null;

  const matchCount = searchResults.length;
  const displayIndex = currentSearchIndex >= 0 ? currentSearchIndex + 1 : 0;

  return (
    <div
      data-search-bar
      // 不用 `-translate-x-1/2`：见 FloatingTOC.tsx 同款问题注释（@zenuml/core 注入的未分层
      // 通用选择器会重置 `--tw-translate-x/y`，让 Tailwind v4 的 transform 工具类失效）
      className="fixed z-[55] top-[48px] left-1/2 flex items-center gap-2 px-3 py-2 rounded-lg border shadow-[0_4px_20px_rgba(0,0,0,0.4)] min-w-[360px]"
      style={{
        transform: "translateX(-50%)",
        background: "var(--bg-sidebar, #1A1A2E)",
        borderColor: "rgba(100, 200, 200, 0.15)",
      }}
    >
      {/* 搜索图标 */}
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth="1.5"
        className="shrink-0"
      >
        <circle cx="6" cy="6" r="4.5" />
        <path d="M9.5 9.5L13 13" />
      </svg>

      {/* 输入框 */}
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("reader.search")}
        aria-label={t("reader.search")}
        className="flex-1 bg-transparent text-[13px] outline-none border-none min-w-0"
        style={{
          color: "var(--text-primary)",
          caretColor: "var(--accent-cyan)",
        }}
      />

      {/* 匹配计数 */}
      {matchCount > 0 && (
        <span
          className="text-xs shrink-0 whitespace-nowrap"
          style={{
            color: "var(--text-muted)",
          }}
        >
          {displayIndex}/{matchCount}
        </span>
      )}

      {/* 上一个 */}
      {matchCount > 0 && (
        <button
          onClick={prevMatch}
          className="flex items-center justify-center shrink-0 bg-transparent border-none cursor-pointer p-0.5"
          style={{
            color: "var(--text-secondary)",
          }}
          aria-label={t("reader.prevMatch")}
          title={t("reader.prevMatchHint")}
        >
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <path d="M6 9L3 6L6 3" />
          </svg>
        </button>
      )}

      {/* 下一个 */}
      {matchCount > 0 && (
        <button
          onClick={nextMatch}
          className="flex items-center justify-center shrink-0 bg-transparent border-none cursor-pointer p-0.5"
          style={{
            color: "var(--text-secondary)",
          }}
          aria-label={t("reader.nextMatch")}
          title={t("reader.nextMatchHint")}
        >
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <path d="M6 3L9 6L6 9" />
          </svg>
        </button>
      )}

      {/* 关闭 */}
      <button
        onClick={() => {
          clearHighlights();
          closeSearch();
        }}
        aria-label="关闭搜索"
        className="flex items-center justify-center shrink-0 bg-transparent border-none cursor-pointer p-0.5"
        style={{
          color: "var(--text-muted)",
        }}
      >
        <svg
          aria-hidden="true"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <line x1="0" y1="0" x2="10" y2="10" />
          <line x1="10" y1="0" x2="0" y2="10" />
        </svg>
      </button>
    </div>
  );
});

SearchBar.displayName = "SearchBar";

export default SearchBar;
