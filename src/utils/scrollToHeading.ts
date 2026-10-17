export interface ScrollCorrectionOptions {
  container: HTMLElement;
  headingId: string;
  scrollOffset: number;
  tolerance?: number;
  delays?: number[];
  onUserInteracted?: () => void;
}

export function scheduleScrollCorrection(
  options: ScrollCorrectionOptions,
): () => void {
  const {
    container,
    headingId,
    scrollOffset,
    tolerance = 6,
    delays = [150, 400, 900],
    onUserInteracted,
  } = options;

  let cancelled = false;
  const timerIds: Set<number> = new Set();

  const onUserScroll = () => {
    cancelled = true;
    onUserInteracted?.();
    cleanup();
  };

  container.addEventListener("wheel", onUserScroll, { passive: true });
  container.addEventListener("touchmove", onUserScroll, { passive: true });

  const cleanup = () => {
    timerIds.forEach((id) => clearTimeout(id));
    timerIds.clear();
    container.removeEventListener("wheel", onUserScroll);
    container.removeEventListener("touchmove", onUserScroll);
  };

  const executeCorrection = (isInitial: boolean, useSmooth: boolean) => {
    if (cancelled) return false;

    const el = container.querySelector(`#${CSS.escape(headingId)}`);
    if (!el) return false;

    const containerRect = container.getBoundingClientRect();
    const headingRect = el.getBoundingClientRect();
    const currentOffset =
      headingRect.top - containerRect.top + container.scrollTop;
    const expectedScrollTop = currentOffset - scrollOffset;
    const diff = container.scrollTop - expectedScrollTop;
    const absDiff = Math.abs(diff);

    if (absDiff <= tolerance) return false;

    // Graded deviation: choose behavior based on correction size
    let behavior: ScrollBehavior;
    if (isInitial) {
      behavior = useSmooth ? "smooth" : "auto";
    } else if (absDiff >= 480) {
      // Large deviation: auto first to snap closer, smooth will follow
      behavior = "auto";
    } else {
      // Small to medium deviation: smooth for gentle correction
      behavior = "smooth";
    }

    container.scrollTo({
      top: expectedScrollTop,
      behavior,
    });
    return true;
  };

  const isInitialDelay = (delay: number, _index: number) =>
    delay === delays[0];

  delays.forEach((delay, index) => {
    const timerId = window.setTimeout(() => {
      if (cancelled) return;
      const initial = isInitialDelay(delay, index);
      executeCorrection(initial, true);
    }, delay);
    timerIds.add(timerId);
  });

  return cleanup;
}

export interface VirtualJumpOptions {
  container: HTMLElement;
  headingId: string;
  scrollOffset: number;
  /** 目标元素尚未渲染（虚拟列表未滚到）时重发近似滚动 */
  onTargetMissing: () => void;
  maxAttempts?: number;
  attemptIntervalMs?: number;
  tolerance?: number;
}

/**
 * 虚拟列表下的标题跳转收敛循环（替代「定点补救」式的 scheduleScrollCorrection）。
 *
 * 背景：virtualizer.scrollToIndex 使用估算高度，未测量块累积误差可达数千 px，
 * 落点可能远离目标；原实现只在固定延迟校正 2~3 次，目标未渲染时静默放弃。
 *
 * 策略：目标未渲染 → 重发近似滚动（onTargetMissing）将其滚入渲染窗口；
 * 已渲染 → 按 getBoundingClientRect 实测位置精确校正（behavior: "auto"，
 * 避免 smooth 动画与动态测量竞态）；校正后继续验证，直到命中容差或次数用尽。
 * 用户滚轮 / 触摸交互立即取消。
 */
export function jumpToHeadingWithRetry(options: VirtualJumpOptions): () => void {
  const {
    container,
    headingId,
    scrollOffset,
    onTargetMissing,
    maxAttempts = 12,
    attemptIntervalMs = 120,
    tolerance = 6,
  } = options;

  let cancelled = false;
  let attempt = 0;
  let timerId: number | null = null;

  const cleanup = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    container.removeEventListener("wheel", onUserInteract);
    container.removeEventListener("touchmove", onUserInteract);
  };

  const onUserInteract = () => {
    cancelled = true;
    cleanup();
  };

  container.addEventListener("wheel", onUserInteract, { passive: true });
  container.addEventListener("touchmove", onUserInteract, { passive: true });

  const step = () => {
    if (cancelled) return;
    timerId = null;

    const el = container.querySelector(`#${CSS.escape(headingId)}`);

    if (!el) {
      // 目标尚未进入渲染窗口：重发近似滚动（测量数据已随渲染 refine）后重试
      if (attempt >= maxAttempts) {
        cleanup();
        return;
      }
      attempt += 1;
      onTargetMissing();
      timerId = window.setTimeout(step, attemptIntervalMs);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const headingRect = el.getBoundingClientRect();
    const currentOffset =
      headingRect.top - containerRect.top + container.scrollTop;
    const expectedScrollTop = currentOffset - scrollOffset;
    const diff = container.scrollTop - expectedScrollTop;

    if (Math.abs(diff) <= tolerance) {
      cleanup();
      return;
    }

    container.scrollTo({ top: expectedScrollTop, behavior: "auto" });

    // 校正后布局可能因动态测量再次位移：继续验证直到收敛或用尽次数
    if (attempt >= maxAttempts) {
      cleanup();
      return;
    }
    attempt += 1;
    timerId = window.setTimeout(step, attemptIntervalMs);
  };

  timerId = window.setTimeout(step, attemptIntervalMs);

  return cleanup;
}
