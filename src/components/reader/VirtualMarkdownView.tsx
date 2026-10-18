import { useActiveConfig } from "@/hooks/useActiveConfig";
import type { MarkdownBlock, VirtualTocItem } from "@/types/markdownBlock";
import {
  parseMarkdownBlocks,
  parseMarkdownBlocksChunked,
} from "@/utils/markdownBlocks";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import MarkdownBlockView from "./MarkdownBlockView";
import { useReaderStore } from "@/stores/readerStore";

// ── 公开接口 ──────────────────────────────────────────

export interface VirtualMarkdownViewHandle {
  scrollToBlockIndex(index: number): void;
}

interface VirtualMarkdownViewProps {
  content: string;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  onTocReady?: (items: VirtualTocItem[]) => void;
  onActiveBlockChange?: (blockIndex: number) => void;
}

// ── 组件 ──────────────────────────────────────────────

const VirtualMarkdownView = React.forwardRef<
  VirtualMarkdownViewHandle,
  VirtualMarkdownViewProps
>(({ content, scrollContainerRef, onTocReady, onActiveBlockChange }, ref) => {
  const config = useActiveConfig();
  const exportMode = useReaderStore((s) => s.exportMode);
  const lines = useMemo(() => content.split(/\r?\n/), [content]);
  const totalLines = lines.length;

  const isChunked = totalLines >= config.performance.chunkedThreshold;

  const [blocks, setBlocks] = useState<MarkdownBlock[]>([]);
  const [tocItems, setTocItems] = useState<VirtualTocItem[]>([]);
  const [referenceDefinitions, setReferenceDefinitions] = useState("");
  const chunkedStateRef = useRef<ReturnType<
    typeof parseMarkdownBlocksChunked
  > | null>(null);
  const isParsingRef = useRef(false);

  useEffect(() => {
    if (!isChunked) {
      const {
        blocks: b,
        tocItems: t,
        referenceDefinitions: r,
      } = parseMarkdownBlocks(content);
      setBlocks(b);
      setTocItems(t);
      setReferenceDefinitions(r);
      return;
    }

    chunkedStateRef.current = parseMarkdownBlocksChunked(content, {
      performanceConfig: config.performance,
    });
    setBlocks(chunkedStateRef.current.initialBlocks);
    setTocItems(chunkedStateRef.current.initialTocItems);
    setReferenceDefinitions(chunkedStateRef.current.referenceDefinitions);
  }, [content, isChunked, config.performance]);

  useEffect(() => {
    onTocReady?.(tocItems);
  }, [tocItems, onTocReady]);

  const parseNextChunk = useCallback(() => {
    if (!chunkedStateRef.current || isParsingRef.current) return;
    isParsingRef.current = true;

    requestAnimationFrame(() => {
      const result = chunkedStateRef.current!.parseNextChunk(blocks.length);
      if (result.blocks.length > 0) {
        setBlocks((prev: MarkdownBlock[]) => [...prev, ...result.blocks]);
        setTocItems((prev: VirtualTocItem[]) => [...prev, ...result.tocItems]);
        setReferenceDefinitions((prev: string) =>
          prev
            ? `${prev}\n${result.refDefLines.join("\n")}`
            : result.refDefLines.join("\n"),
        );
      }
      isParsingRef.current = false;
    });
  }, [blocks.length]);

  // 导出模式下按需全量解析，确保离屏 block（尤其 mermaid）也进入产物
  const exportParse = useMemo(
    () => (exportMode ? parseMarkdownBlocks(content) : null),
    [exportMode, content],
  );

  // ── 虚拟列表 ──
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => {
      const block = blocks[index];
      if (!block) return config.virtualSizes.defaultBase;

      const { virtualSizes } = config;
      switch (block.type) {
        case "blank":
          return virtualSizes.blank;
        case "thematicBreak":
          return virtualSizes.thematicBreak;
        case "heading":
          return (
            virtualSizes.headingBase +
            (4 - (block.headingLevel ?? 1)) * virtualSizes.headingLevelDiff
          );
        case "mermaid":
          return virtualSizes.mermaid;
        case "plantuml":
          return virtualSizes.plantuml;
        case "code":
          return Math.max(
            virtualSizes.codeBase,
            (block.endLine - block.startLine + 1) * virtualSizes.codeLine +
              virtualSizes.codeBase,
          );
        case "table":
          return Math.max(
            virtualSizes.tableBase,
            (block.endLine - block.startLine + 1) * virtualSizes.tableLine,
          );
        default:
          return Math.max(
            virtualSizes.defaultBase,
            (block.endLine - block.startLine + 1) * virtualSizes.defaultLine,
          );
      }
    },
    overscan: config.performance.virtualOverscan,
  });

  // ── 滚动时通知当前 active block 并触发按需解析 ──
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const visibleRange = virtualizer.getVirtualItems();
        if (visibleRange.length > 0) {
          // 取视口中部 block：visibleRange[0] 是视口顶部，上一章节尾部仍在
          // 视口时会高亮错位（恢复 BUG-028 记录的修复，此前被回退）
          const midItem =
            visibleRange[Math.floor(visibleRange.length / 2)] ?? visibleRange[0];
          onActiveBlockChange?.(midItem.index);

          const lastVisibleIndex = visibleRange[visibleRange.length - 1].index;
          if (isChunked && lastVisibleIndex >= blocks.length - 5) {
            parseNextChunk();
          }
        }
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [
    scrollContainerRef,
    virtualizer,
    onActiveBlockChange,
    isChunked,
    blocks.length,
    parseNextChunk,
  ]);

  // ── 暴露 scrollToBlockIndex ──
  useImperativeHandle(
    ref,
    () => ({
      scrollToBlockIndex(index: number) {
        virtualizer.scrollToIndex(index, {
          align: "start",
          behavior: "smooth",
        });
      },
    }),
    [virtualizer],
  );

  // ── 导出模式：进入时保存滚动位置，退出时恢复，避免阅读视图跳动 ──
  const savedScrollTop = useRef(0);
  const didEnterExport = useRef(false);
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (exportMode) {
      savedScrollTop.current = container.scrollTop;
      didEnterExport.current = true;
    } else if (didEnterExport.current) {
      container.scrollTop = savedScrollTop.current;
      didEnterExport.current = false;
    }
  }, [exportMode, scrollContainerRef]);

  // ── 渲染 ──
  const totalSize = virtualizer.getTotalSize();

  if (blocks.length === 0) {
    return (
      <div style={{ padding: "1em", color: "var(--text-muted)" }}>
        无法解析文档内容
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="markdown-body"
      style={{
        width: "100%",
        minHeight: "100%",
      }}
    >
      {exportMode && exportParse ? (
        <div>
          {exportParse.blocks.map((block, index) => (
            <MarkdownBlockView
              key={index}
              block={block}
              referenceDefinitions={exportParse.referenceDefinitions}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            height: `${totalSize}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const block = blocks[virtualItem.index];

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <MarkdownBlockView
                  block={block}
                  referenceDefinitions={referenceDefinitions}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

VirtualMarkdownView.displayName = "VirtualMarkdownView";

export default VirtualMarkdownView;
