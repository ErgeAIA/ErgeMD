import Portal from "@/components/Portal";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";

/**
 * 全局悬停提示：把元素上的 `data-hint` 渲染成主题化浮层。
 * 项目内不使用原生 `title`（浏览器 tooltip 带系统边框、不跟随主题）。
 *
 * - 悬停 320ms 后出现，键盘聚焦立即出现
 * - 指针离开 / 失焦 / 滚动 / 点击 / Esc 立即消失
 * - 图标按钮在 `aria-label` 之外补 `data-hint`，文案与 aria 保持一致
 */

const SHOW_DELAY_MS = 320;
const GAP = 8;
const EDGE_MARGIN = 12;

interface HintState {
  label: string;
  x: number;
  y: number;
  above: boolean;
}

const HoverHint: React.FC = memo(() => {
  const [hint, setHint] = useState<HintState | null>(null);
  const timerRef = useRef<number | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    anchorRef.current = null;
    setHint(null);
  }, [clearTimer]);

  const show = useCallback((el: HTMLElement) => {
    const label = el.dataset.hint;
    if (!label) return;
    const rect = el.getBoundingClientRect();
    const above = rect.top >= 48;
    const x = Math.min(
      Math.max(rect.left + rect.width / 2, EDGE_MARGIN + 60),
      window.innerWidth - EDGE_MARGIN - 60,
    );
    setHint({ label, x, y: above ? rect.top - GAP : rect.bottom + GAP, above });
  }, []);

  useEffect(() => {
    const findAnchor = (target: EventTarget | null): HTMLElement | null =>
      target instanceof Element ? target.closest<HTMLElement>("[data-hint]") : null;

    const onPointerOver = (event: MouseEvent) => {
      const el = findAnchor(event.target);
      if (!el || el === anchorRef.current) return;
      clearTimer();
      anchorRef.current = el;
      setHint(null);
      timerRef.current = window.setTimeout(() => show(el), SHOW_DELAY_MS);
    };

    const onPointerOut = (event: MouseEvent) => {
      const el = findAnchor(event.target);
      if (!el) return;
      if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) {
        return;
      }
      hide();
    };

    const onFocusIn = (event: FocusEvent) => {
      const el = findAnchor(event.target);
      if (!el) return;
      clearTimer();
      anchorRef.current = el;
      show(el);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };

    document.addEventListener("mouseover", onPointerOver);
    document.addEventListener("mouseout", onPointerOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", hide);
    document.addEventListener("mousedown", hide);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      clearTimer();
      document.removeEventListener("mouseover", onPointerOver);
      document.removeEventListener("mouseout", onPointerOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("mousedown", hide);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [clearTimer, hide, show]);

  if (!hint) return null;

  return (
    <Portal>
      <div
        role="tooltip"
        style={{
          position: "fixed",
          left: hint.x,
          top: hint.y,
          transform: hint.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
          maxWidth: 280,
          padding: "5px 9px",
          borderRadius: 6,
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
          fontSize: 12,
          lineHeight: 1.45,
          boxShadow: "var(--shadow-floating-card)",
          pointerEvents: "none",
          zIndex: 70,
        }}
      >
        {hint.label}
      </div>
    </Portal>
  );
});

HoverHint.displayName = "HoverHint";

export default HoverHint;