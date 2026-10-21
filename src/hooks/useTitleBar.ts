import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useRef } from "react";

/**
 * 标题栏拖拽 Hook
 * 使用 onMouseDown + stopPropagation 实现无边框窗口拖拽
 */
export function useTitleBar() {
  const lastClickTimeRef = useRef(0);

  const startDrag = useCallback((e: React.MouseEvent) => {
    // 左键与中键均可发起拖拽（中键拖窗贴合部分用户习惯；
    // 两者都走 Tauri 原生 startDragging，DPI 正确，2K/4K 跨屏不跳）
    if (e.button !== 0 && e.button !== 1) return;

    // 如果点击的是按钮等交互元素，不触发拖拽
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-no-drag]")) {
      return;
    }

    // 中键：阻止浏览器默认自动滚动，直接发起拖拽（不做双击判定）
    if (e.button === 1) {
      e.preventDefault();
      getCurrentWindow().startDragging().catch(console.error);
      return;
    }

    // 检测双击（300ms 内连续点击）
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    if (timeSinceLastClick < 300) {
      // 双击：切换窗口最大化
      lastClickTimeRef.current = 0; // 重置计时器
      getCurrentWindow().toggleMaximize().catch(console.error);
      return; // 不触发拖拽
    }

    lastClickTimeRef.current = now;

    // Tauri 2 官方 API：使用 getCurrentWindow().startDragging()
    getCurrentWindow().startDragging().catch(console.error);
  }, []);

  return { startDrag };
}
