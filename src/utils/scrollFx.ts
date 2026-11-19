/**
 * 全局滚动条回显：静止时低透明，滚动时快速点亮，停止后缓慢渐隐。
 *
 * 做法沿用 Avalon：用捕获监听覆盖元素内部滚动（scroll 不冒泡），
 * 逐帧改写 CSS 自定义属性 / `scrollbar-color`——原生滚动条不支持可靠的 CSS 过渡。
 * 不改变任何滚动行为，也不拦截滚轮事件。
 */

const IDLE_ALPHA = 0.32;
const SHOW_MS = 120;
const HIDE_DELAY_MS = 450;
const HIDE_MS = 650;

interface Fade {
  raf: number;
  hide: number;
  alpha: number;
  target: number;
}

const fades = new WeakMap<HTMLElement, Fade>();
const activeFades = new Set<Fade>();

/** jsdom 等环境可能缺 cancelAnimationFrame；WebView 两者都有，这里只做兜底 */
const requestFrame: (cb: FrameRequestCallback) => number =
  typeof requestAnimationFrame === "function"
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => window.setTimeout(() => cb(performance.now()), 16);
const cancelFrame: (handle: number) => void =
  typeof cancelAnimationFrame === "function"
    ? (handle) => cancelAnimationFrame(handle)
    : (handle) => window.clearTimeout(handle);

const reduceMotion =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function paint(el: HTMLElement, alpha: number) {
  if (alpha <= IDLE_ALPHA + 0.001) {
    el.style.removeProperty("--sb-alpha");
    el.style.removeProperty("scrollbar-color");
    return;
  }
  el.style.setProperty("--sb-alpha", alpha.toFixed(3));
  el.style.setProperty(
    "scrollbar-color",
    `color-mix(in srgb, var(--scrollbar-thumb-hover) ${(alpha * 100).toFixed(1)}%, transparent) transparent`,
  );
}

function animate(el: HTMLElement, to: number) {
  let fade = fades.get(el);
  if (!fade) {
    fade = { raf: 0, hide: 0, alpha: IDLE_ALPHA, target: IDLE_ALPHA };
    fades.set(el, fade);
    activeFades.add(fade);
  }
  // 连续滚动事件不断重启动画会让「点亮」变慢；同目标且在途/已到位就跳过
  if (fade.target === to && (fade.raf !== 0 || Math.abs(fade.alpha - to) < 0.001)) {
    return;
  }
  fade.target = to;

  if (reduceMotion) {
    fade.alpha = to;
    paint(el, to);
    return;
  }

  if (fade.raf) cancelFrame(fade.raf);
  const from = fade.alpha;
  const start = performance.now();
  const duration = to > from ? SHOW_MS : HIDE_MS;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    fade!.alpha = from + (to - from) * eased;
    paint(el, fade!.alpha);
    fade!.raf = t < 1 ? requestFrame(tick) : 0;
  };
  fade.raf = requestFrame(tick);
}

export function installScrollbarFx(): () => void {
  const onScroll = (event: Event) => {
    const target = event.target;
    const el =
      target === document ? document.documentElement : target;
    if (!(el instanceof HTMLElement)) return;

    let fade = fades.get(el);
    if (!fade) {
      fade = { raf: 0, hide: 0, alpha: IDLE_ALPHA, target: IDLE_ALPHA };
      fades.set(el, fade);
      activeFades.add(fade);
    }
    if (fade.hide) window.clearTimeout(fade.hide);
    animate(el, 1);
    fade.hide = window.setTimeout(() => animate(el, IDLE_ALPHA), HIDE_DELAY_MS);
  };

  document.addEventListener("scroll", onScroll, true);
  return () => {
    document.removeEventListener("scroll", onScroll, true);
    for (const fade of activeFades) {
      if (fade.hide) window.clearTimeout(fade.hide);
      if (fade.raf) cancelFrame(fade.raf);
      fade.hide = 0;
      fade.raf = 0;
    }
    activeFades.clear();
  };
}