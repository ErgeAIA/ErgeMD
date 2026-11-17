import type { ThemeMode } from "@/types";

const PREVIEW_TOKENS = [
  "--bg-page",
  "--brand-primary",
  "--brand-secondary",
] as const;

const THIRD_COLOR_CANDIDATES = [
  "--accent-pink",
  "--accent-purple",
  "--accent-green",
  "--accent-yellow",
] as const;

const FALLBACK = ["#333333", "#666666", "#999999", "#CCCCCC"];

const cache = new Map<string, string[]>();
let probe: HTMLDivElement | null = null;

function resolvePreviewTheme(theme: ThemeMode): string {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * 从主题 CSS 变量读取色卡预览色，避免另立一份手写色表。
 * 用一个带 data-theme 的离屏节点读取计算后的自定义属性。
 */
export function getThemePreviewColors(theme: ThemeMode): string[] {
  const key = resolvePreviewTheme(theme);
  const cached = cache.get(key);
  if (cached) return cached;
  if (typeof document === "undefined") return FALLBACK;

  if (!probe) {
    probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;left:-9999px;top:-9999px;width:0;height:0;pointer-events:none";
  }
  probe.setAttribute("data-theme", key);
  document.body.appendChild(probe);

  const styles = getComputedStyle(probe);
  const base = PREVIEW_TOKENS.map((token) =>
    styles.getPropertyValue(token).trim(),
  );
  const taken = base.map((color) => color.toUpperCase());
  const third = THIRD_COLOR_CANDIDATES.map((token) =>
    styles.getPropertyValue(token).trim(),
  ).find((color) => color && !taken.includes(color.toUpperCase()));

  probe.remove();

  const colors = [
    base[0] || FALLBACK[0],
    base[1] || FALLBACK[1],
    base[2] || FALLBACK[2],
    third || FALLBACK[3],
  ];
  cache.set(key, colors);
  return colors;
}
