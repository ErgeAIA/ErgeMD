import ContextMenu from "@/components/context-menu/ContextMenu";
import { getTOCContextMenuItems } from "@/components/context-menu/TOCContextMenu";
import { useTOCConfig } from "@/hooks/useActiveConfig";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useFileStore } from "@/stores/fileStore";
import type { TocItem } from "@/types";
import { exportHtml } from "@/utils/export";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface FloatingTOCProps {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  onScrollToBlock: (blockIndex: number) => void;
  onActiveTocChange?: (tocIndex: number) => void;
}

const FloatingTOC: React.FC<FloatingTOCProps> = memo(
  ({
    scrollContainerRef,
    onScrollToBlock,
    onActiveTocChange,
  }) => {
    const { t } = useTranslation();
    const tocConfig = useTOCConfig();
    const {
      itemHeight,
      viewportHeight,
      collapsedWidth,
      expandedWidth,
      animationDuration,
      lineFadeRate,
      minLineOpacity,
      inactiveOpacity,
    } = tocConfig;

    const tocItems = useFileStore((s) => s.tocItems);

    const [isHovering, setIsHovering] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);

    const {
      menuState,
      menuRef,
      show: showContextMenu,
      hide: hideContextMenu,
      adjustPosition,
    } = useContextMenu();

    // 用 DOM 标题元素的实际 offsetTop 位置做精确匹配（替代不可靠的百分比映射）
    const headingPositionsRef = useRef<Map<string, number>>(new Map());

    // 缓存所有标题的 DOM 位置
    const cacheHeadingPositions = useCallback(() => {
      const scrollEl = scrollContainerRef.current;
      if (!scrollEl) return;

      const map = new Map<string, number>();
      for (const item of tocItems) {
        if (!item.id) continue;
        const el = scrollEl.querySelector(`#${CSS.escape(item.id)}`);
        if (el) {
          map.set(item.id, (el as HTMLElement).offsetTop);
        }
      }
      headingPositionsRef.current = map;
    }, [tocItems]);

    // 基于实际 DOM 位置计算当前活跃的 TOC 索引
    const computeActiveIndex = useCallback(
      (scrollEl: HTMLElement): number => {
        if (tocItems.length === 0) return -1;
        if (tocItems.length === 1) return 0;

        const scrollTop = scrollEl.scrollTop;
        const positions = headingPositionsRef.current;

        // 如果有 DOM 位置缓存，用精确匹配
        if (positions.size > 0) {
          let bestIdx = 0;
          let bestTop = -1;
          for (let i = 0; i < tocItems.length; i++) {
            const id = tocItems[i].id;
            if (!id) continue;
            const top = positions.get(id);
            if (top !== undefined && top <= scrollTop && top > bestTop) {
              bestTop = top;
              bestIdx = i;
            }
          }
          return bestIdx;
        }

        // fallback：纯百分比线性映射
        const sh = scrollEl.scrollHeight;
        const ch = scrollEl.clientHeight;
        if (sh <= ch) return 0;
        const scrollPercent = Math.min(1, Math.max(0, scrollTop / (sh - ch)));
        return Math.round(scrollPercent * (tocItems.length - 1));
      },
      [tocItems.length],
    );

    // TOC 列表滚动容器 ref
    const tocListRef = useRef<HTMLDivElement>(null);

    // 统一滚动监听：同时更新高亮索引 + 同步 TOC 列表位置
    useEffect(() => {
      const scrollEl = scrollContainerRef.current;
      if (!scrollEl || tocItems.length === 0) return;

      // 初始化标题位置缓存
      cacheHeadingPositions();

      let rafId: number | null = null;

      const handleScroll = () => {
        if (isHovering) return;

        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const idx = computeActiveIndex(scrollEl);
          setHighlightIndex(idx);

          if (idx < 0) return;

          const tocList = tocListRef.current;
          if (!tocList) return;

          const itemCenter = idx * itemHeight + itemHeight / 2;
          const viewportCenter = viewportHeight / 2;
          let targetScrollTop = itemCenter - viewportCenter;

          const maxScrollTop = tocList.scrollHeight - tocList.clientHeight;
          targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));

          tocList.scrollTo({ top: targetScrollTop, behavior: "smooth" });
        });
      };

      scrollEl.addEventListener("scroll", handleScroll, { passive: true });

      // 初始计算一次
      handleScroll();

      return () => {
        scrollEl.removeEventListener("scroll", handleScroll);
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    }, [
      scrollContainerRef,
      tocItems.length,
      itemHeight,
      viewportHeight,
      isHovering,
      computeActiveIndex,
      cacheHeadingPositions,
    ]);

    const navRef = useRef<HTMLElement>(null);

    // 点击跳转到对应 block
    const handleClick = useCallback(
      (e: React.MouseEvent | React.KeyboardEvent, item: TocItem) => {
        e.preventDefault();
        e.stopPropagation();

        // 立即更新高亮到点击项（不等 scroll 回调，解决 hover 期间 scroll 被抑制的问题）
        const tocIdx = tocItems.indexOf(item);
        if (tocIdx >= 0) {
          setHighlightIndex(tocIdx);
          onActiveTocChange?.(tocIdx);
        }

        // 直接传递 item，让 ReadingArea 决定如何处理
        onScrollToBlock(tocIdx);
      },
      [onScrollToBlock, onActiveTocChange, tocItems],
    );

    const handleItemKeyDown = useCallback(
      (e: React.KeyboardEvent, item: TocItem) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e, item);
        }
      },
      [handleClick],
    );

    const handleContextMenu = useCallback(
      (e: React.MouseEvent, item: TocItem) => {
        e.preventDefault();

        const items = getTOCContextMenuItems({
          sectionId: item.id || "",
          sectionTitle: item.text,
          onCopySectionTitle: () => navigator.clipboard.writeText(item.text),
          onExportSectionHtml: () =>
            exportHtml(".markdown-body", { sectionId: item.id }).catch(
              () => {},
            ),
        });

        showContextMenu(e, items);
      },
      [showContextMenu],
    );

    const getLineWidth = (level: number) => {
      if (level <= 1) return 22;
      if (level === 2) return 16;
      if (level === 3) return 11;
      return 7;
    };

    const getIndent = (level: number) => {
      if (level <= 1) return 2;
      if (level === 2) return 14;
      if (level === 3) return 26;
      return 38;
    };

    // 条件检查必须在所有 Hooks 调用之后
    if (!scrollContainerRef?.current || tocItems.length === 0) return null;

    return (
      <>
        <nav
          ref={navRef}
          role="navigation"
          aria-label={t("toc.navigation")}
          // 注意：这里不用 Tailwind 的 `-translate-y-1/2`，
          // 而用内联 transform：原因是 @mermaid-js/mermaid-zenuml 插件
          // 会在加载时通过 vite-plugin-css-injected-by-js 注入一份
          // @zenuml/core 内置的 Tailwind v3 风格 CSS，其中含一条
          // 未分层的通用选择器 `*, ::before, ::after { --tw-translate-y: 0; }`，
          // 优先级高于主机 Tailwind v4 的 `@layer utilities` 工具类，
          // 会把 `--tw-translate-y` 重置为 0，导致 TOC 掉到右下角。
          className="fixed top-1/2 right-2 z-40"
          style={{ transform: "translateY(-50%)" }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => {
            setIsHovering(false);
          }}
        >
          <div
            className="relative overflow-hidden rounded-lg"
            style={{
              width: isHovering ? expandedWidth : collapsedWidth,
              height: viewportHeight,
              pointerEvents: "auto",
              background: isHovering ? "var(--toc-hover-bg)" : "transparent",
              boxShadow: isHovering ? "var(--toc-hover-shadow)" : "none",
              transition: `width ${animationDuration}ms ease-out, background ${animationDuration}ms ease-out, box-shadow ${animationDuration}ms ease-out`,
            }}
          >
            <div
              ref={tocListRef}
              className="absolute inset-0 overflow-y-auto scrollbar-hide"
            >
              {tocItems.map((item, index) => {
                const lineWidth = getLineWidth(item.level);
                const indent = getIndent(item.level);
                const isActive = index === highlightIndex;
                const distance = Math.abs(index - highlightIndex);

                const lineOpacity = isActive
                  ? 1
                  : isHovering
                    ? 0.7
                    : Math.max(minLineOpacity, 0.5 - distance * lineFadeRate);

                const lineColor = isActive
                  ? "var(--accent-cyan)"
                  : "var(--accent-cyan-dim)";

                const textOpacity = isHovering
                  ? isActive
                    ? 1
                    : inactiveOpacity
                  : 0;

                return (
                  <div
                    key={item.id || String(index)}
                    tabIndex={0}
                    role="link"
                    aria-label={item.text}
                    onClick={(e) => handleClick(e, item)}
                    onKeyDown={(e) => handleItemKeyDown(e, item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    className="relative flex cursor-pointer items-center overflow-hidden outline-none"
                    style={{
                      height: itemHeight,
                      paddingLeft: indent,
                      paddingRight: 8,
                      opacity: isHovering
                        ? 1
                        : Math.max(0.18, 1 - distance * 0.12),
                    }}
                  >
                    <div
                      className="shrink-0 rounded-full"
                      style={{
                        width: isActive
                          ? Math.max(28, lineWidth + 10)
                          : lineWidth,
                        height: isActive ? 3 : 2,
                        backgroundColor: lineColor,
                        opacity: isHovering ? 0 : lineOpacity,
                        boxShadow: isActive
                          ? "0 0 8px var(--accent-cyan-glow)"
                          : "none",
                        transition:
                          "width 120ms ease-out, height 120ms ease-out, opacity 120ms ease-out, background-color 120ms ease-out",
                      }}
                    />

                    {isHovering && (
                      <span
                        className="ml-3 whitespace-nowrap overflow-hidden text-ellipsis text-sm"
                        style={{
                          maxWidth: 170,
                          color: isActive
                            ? "var(--toc-text-active)"
                            : "var(--toc-text-inactive)",
                          opacity: textOpacity,
                          transition: "opacity 120ms ease-out",
                        }}
                      >
                        {item.text}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

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

FloatingTOC.displayName = "FloatingTOC";

export default FloatingTOC;
