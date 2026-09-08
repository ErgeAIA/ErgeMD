import { useActiveConfig } from "@/hooks/useActiveConfig";
import { useFileStore } from "@/stores/fileStore";
import { parseMarkdownBlocks } from "@/utils/markdownBlocks";
import { scheduleScrollCorrection } from "@/utils/scrollToHeading";
import { Component, memo, useEffect, useMemo, useRef, useState } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import {
  cacheScrollPercentage,
  getCachedPercentage,
  loadReadingProgress,
} from "../../utils/readingProgress";
import FloatingTOC from "./FloatingTOC";
import MarkdownView from "./MarkdownView";
import type { VirtualMarkdownViewHandle } from "./VirtualMarkdownView";
import VirtualMarkdownView from "./VirtualMarkdownView";

interface ReadingAreaProps {
  /** 文件路径，用于缓存 key 和进度恢复 */
  filePath: string;
  /** markdown 内容 */
  content: string;
  /** 是否为当前活跃 Tab（控制 FloatingTOC 显隐和 scroll listener 注册） */
  isActive: boolean;
  /** 通知父组件当前 Tab 的 scroll 元素 */
  onScrollReady?: (el: HTMLElement | null) => void;
}

/**
 * 独立的阅读区域实例。
 * 每个 Tab 持有一个，切 Tab 时只切换 CSS display，不销毁不重建。
 *
 * 小文档（<2000 行）用传统 MarkdownView 一次性渲染，快速且无感知延迟。
 * 大文档（>=2000 行）用 VirtualMarkdownView 虚拟列表，只渲染视口附近 blocks。
 */
const ReadingArea = memo(
  ({ filePath, content, isActive, onScrollReady }: ReadingAreaProps) => {
    const config = useActiveConfig();
    const readingSettings = useSettingsStore((s) => s.readingSettings);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const virtualMarkdownRef = useRef<VirtualMarkdownViewHandle>(null);
    const [activeBlockIndex, setActiveBlockIndex] = useState(0);
    void activeBlockIndex; // 由 FloatingTOC 内部自行计算，保留 state 供内部 scroll 回调使用
    // 标记是否正在执行 TOC 跳转滚动
    const isScrollingRef = useRef(false);
    // TOC 点击校准的取消函数
    const cancelCorrectionRef = useRef<(() => void) | null>(null);
    // 文档打开时间戳，用于布局稳定窗口判断
    const docOpenTimeRef = useRef(Date.now());

    // 判断是否使用虚拟列表
    const lineCount = useMemo(() => {
      if (!content) return 0;
      return content.split(/\r?\n/).length;
    }, [content]);

    const useVirtual = lineCount >= config.performance.virtualThreshold;

    // 在虚拟列表模式下，通过 parseMarkdownBlocks 获取带 blockIndex 的 TOC
    const virtualTocItems = useMemo(() => {
      if (!useVirtual) return [];
      const { tocItems } = parseMarkdownBlocks(content);
      return tocItems;
    }, [content, useVirtual]);

    // Tab 变为活跃时，立即根据 scroll 位置计算 activeBlockIndex
    useEffect(() => {
      if (!isActive) return;
      const el = scrollContainerRef.current;
      if (!el) {
        setActiveBlockIndex(0);
        return;
      }

      if (useVirtual) {
        // 大文档模式：通过 DOM data-index 获取当前可见的第一个 block
        requestAnimationFrame(() => {
          const firstVisible = el.querySelector(
            "[data-index]",
          ) as HTMLElement | null;
          if (firstVisible) {
            const idx = parseInt(
              firstVisible.getAttribute("data-index") || "0",
              10,
            );
            setActiveBlockIndex(idx);
          } else {
            setActiveBlockIndex(0);
          }
        });
      } else {
        // 小文档模式：通过 scroll 百分比映射为 TOC index
        const sh = el.scrollHeight - el.clientHeight;
        if (sh <= 0) {
          setActiveBlockIndex(0);
          return;
        }
        const percentage = el.scrollTop / sh;
        const totalLines = content.split(/\r?\n/).length;
        const logicalLine = Math.round(percentage * totalLines);
        const tocItems = useFileStore.getState().tocItems;
        let idx = 0;
        for (let i = tocItems.length - 1; i >= 0; i--) {
          if ((tocItems[i].logicalOffset ?? 0) <= logicalLine) {
            idx = i;
            break;
          }
        }
        setActiveBlockIndex(idx);
      }
    }, [isActive, useVirtual, content]);

    // 小文档模式：通过 scroll 位置计算 activeBlockIndex（映射为 TOC index）
    useEffect(() => {
      if (useVirtual) return; // 大文档模式由 VirtualMarkdownView 处理
      const el = scrollContainerRef.current;
      if (!el || !content) return;

      let rafId: number | null = null;

      const onScroll = () => {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          // 正在执行 TOC 跳转滚动时，忽略 scroll 回调
          if (isScrollingRef.current) return;
          const sh = el.scrollHeight - el.clientHeight;
          if (sh <= 0) return;
          const percentage = el.scrollTop / sh;
          const totalLines = content.split(/\r?\n/).length;
          const logicalLine = Math.round(percentage * totalLines);
          const tocItems = useFileStore.getState().tocItems;
          let idx = 0;
          for (let i = tocItems.length - 1; i >= 0; i--) {
            if ((tocItems[i].logicalOffset ?? 0) <= logicalLine) {
              idx = i;
              break;
            }
          }
          setActiveBlockIndex(idx);
        });
      };

      const onScrollEnd = () => {
        // 滚动停止，重置状态
        isScrollingRef.current = false;
      };

      el.addEventListener("scroll", onScroll, { passive: true });
      el.addEventListener("scrollend", onScrollEnd, { passive: true });
      return () => {
        el.removeEventListener("scroll", onScroll);
        el.removeEventListener("scrollend", onScrollEnd);
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    }, [useVirtual, content]);

    // 通知父组件 scroll 元素已就绪（仅活跃 Tab）
    useEffect(() => {
      if (isActive) {
        onScrollReady?.(scrollContainerRef.current);
      }
      return () => {
        if (isActive) onScrollReady?.(null);
      };
    }, [isActive, onScrollReady]);

    // 添加 scrollend 事件监听，用于重置滚动状态（大文档模式）
    useEffect(() => {
      if (!useVirtual) return; // 小文档模式已在上面的 useEffect 中处理
      const el = scrollContainerRef.current;
      if (!el) return;

      const onScrollEnd = () => {
        isScrollingRef.current = false;
      };

      el.addEventListener("scrollend", onScrollEnd, { passive: true });
      return () => {
        el.removeEventListener("scrollend", onScrollEnd);
      };
    }, [useVirtual]);

    // scroll listener：实时将百分比写入内存缓存
    useEffect(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const onScroll = () => {
        const sh = el.scrollHeight - el.clientHeight;
        if (sh > 0) {
          cacheScrollPercentage(filePath, (el.scrollTop / sh) * 100);
        }
      };
      el.addEventListener("scroll", onScroll, { passive: true });
      return () => el.removeEventListener("scroll", onScroll);
    }, [filePath]);

    // 文件切换时恢复滚动位置 —— 用 ResizeObserver 持续修正
    useEffect(() => {
      const el = scrollContainerRef.current;
      if (!el) return;

      // 重置文档打开时间
      docOpenTimeRef.current = Date.now();

      let cancelled = false;
      let targetPct: number | null = null;
      let userInteracted = false;
      let restored = false; // ★ 新增：标记是否已完成初始滚动恢复
      const startTime = Date.now();

      const onWheel = () => {
        userInteracted = true;
      };
      const onTouchMove = () => {
        userInteracted = true;
      };
      const onKeyDown = () => {
        userInteracted = true;
      };
      el.addEventListener("wheel", onWheel, { passive: true });
      el.addEventListener("touchmove", onTouchMove, { passive: true });
      el.addEventListener("keydown", onKeyDown);

      const applyScroll = () => {
        // ★ 修复：只有未完成恢复且未用户交互时才应用
        if (cancelled || userInteracted || restored || targetPct == null) return;
        const sh = el.scrollHeight - el.clientHeight;
        if (sh > 0) {
          el.scrollTop = (targetPct / 100) * sh;
          // ★ 关键：应用成功后标记为已恢复，防止后续 ResizeObserver 干扰
          restored = true;
          targetPct = null;
        }
      };

      const ro = new ResizeObserver(() => {
        applyScroll();
        if (Date.now() - startTime > 3000) {
          ro.disconnect();
        }
      });

      const startRestore = (pct: number) => {
        targetPct = pct;
        restored = false; // 重置恢复标记
        el.scrollTop = 0;
        requestAnimationFrame(() => {
          applyScroll();
          const inner = el.firstElementChild;
          if (inner) ro.observe(inner);
        });
      };

      const cachedPct = getCachedPercentage(filePath);
      if (cachedPct !== undefined && cachedPct > 0) {
        startRestore(cachedPct);
      } else {
        el.scrollTop = 0;
        loadReadingProgress(filePath).then((pct) => {
          if (cancelled) return;
          if (pct != null && pct > 0) startRestore(pct);
        });
      }

      return () => {
        cancelled = true;
        ro.disconnect();
        el.removeEventListener("wheel", onWheel);
        el.removeEventListener("touchmove", onTouchMove);
        el.removeEventListener("keydown", onKeyDown);
      };
    }, [filePath]);

    return (
      <>
        {isActive && (
          <TOCErrorBoundary>
            <FloatingTOC
              scrollContainerRef={scrollContainerRef}
              onScrollToBlock={(tocIndex) => {
                  const SCROLL_OFFSET = config.toc.scrollOffset;
                  // 取消上一次的校准任务
                  cancelCorrectionRef.current?.();
                  // 开始滚动，标记状态
                  isScrollingRef.current = true;

                  if (useVirtual) {
                    const targetVirtualTocItem = virtualTocItems[tocIndex];
                    if (targetVirtualTocItem?.blockIndex !== undefined) {
                      virtualMarkdownRef.current?.scrollToBlockIndex(
                        targetVirtualTocItem.blockIndex,
                      );
                      requestAnimationFrame(() => {
                        scrollContainerRef.current?.scrollBy({
                          top: -SCROLL_OFFSET,
                          behavior: "smooth",
                        });
                        // initial scroll done, schedule correction
                        const headingId = targetVirtualTocItem.id;
                        const container = scrollContainerRef.current;
                        if (headingId && container) {
                          const isLayoutStable =
                            Date.now() - docOpenTimeRef.current > 1500;
                          cancelCorrectionRef.current = scheduleScrollCorrection({
                            container,
                            headingId,
                            scrollOffset: SCROLL_OFFSET,
                            delays: isLayoutStable ? [200, 500] : [200, 500, 1100],
                          });
                        }
                      });
                    }
                  } else {
                    const tocItems = useFileStore.getState().tocItems;
                    const targetItem = tocItems[tocIndex];
                    if (targetItem?.id) {
                      const el = scrollContainerRef.current?.querySelector(
                        `#${CSS.escape(targetItem.id)}`,
                      );
                      if (el) {
                        const container = scrollContainerRef.current;
                        if (!container) return;
                        const containerRect = container.getBoundingClientRect();
                        const targetRect = el.getBoundingClientRect();
                        const offset =
                          targetRect.top -
                          containerRect.top +
                          container.scrollTop;
                        container.scrollTo({
                          top: offset - SCROLL_OFFSET,
                          behavior: "smooth",
                        });
                        // schedule correction
                        const headingId = targetItem.id;
                        const isLayoutStable =
                          Date.now() - docOpenTimeRef.current > 1500;
                        cancelCorrectionRef.current = scheduleScrollCorrection({
                          container,
                          headingId,
                          scrollOffset: SCROLL_OFFSET,
                          delays: isLayoutStable ? [200, 500] : [200, 500, 1100],
                        });
                      }
                    }
                  }
                }}
              onActiveTocChange={(tocIndex) => {
                // 点击 TOC 时立即更新高亮（不等 scroll 回调）
                if (useVirtual) {
                  // 虚拟列表模式：通过 virtualTocItems 找到对应的 blockIndex
                  const targetVirtualTocItem = virtualTocItems[tocIndex];
                  if (targetVirtualTocItem?.blockIndex !== undefined) {
                    setActiveBlockIndex(targetVirtualTocItem.blockIndex);
                  }
                } else {
                  // 小文档模式：activeBlockIndex 存的是 TOC index
                  setActiveBlockIndex(tocIndex);
                }
              }}
            />
          </TOCErrorBoundary>
        )}
        <div
          style={{
            display: isActive ? "block" : "none",
          }}
        >
          <div
            ref={scrollContainerRef}
            className="reading-scroll-container w-full h-screen overflow-y-auto overflow-x-hidden"
            data-scroll-container="true"
          >
            <div
              style={{
                maxWidth: `${readingSettings.pageWidth}px`,
                fontSize: `${readingSettings.fontSize}px`,
                fontFamily: readingSettings.fontFamily,
                lineHeight: readingSettings.lineHeight,
                letterSpacing: `${readingSettings.letterSpacing}px`,
                padding: "2em 3em",
                margin: "0 auto",
              }}
            >
              {useVirtual ? (
                <VirtualMarkdownView
                  ref={virtualMarkdownRef}
                  content={content}
                  scrollContainerRef={scrollContainerRef}
                  onActiveBlockChange={(index) => {
                    // 正在执行 TOC 跳转滚动时，忽略 IntersectionObserver 的回调
                    if (isScrollingRef.current) return;
                    setActiveBlockIndex(index);
                  }}
                />
              ) : (
                <MarkdownView content={content} />
              )}
            </div>
          </div>
        </div>
      </>
    );
  },
);

ReadingArea.displayName = "ReadingArea";

class TOCErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default ReadingArea;
