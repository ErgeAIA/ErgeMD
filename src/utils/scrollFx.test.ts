import { afterEach, describe, expect, it, vi } from "vitest";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("scrollFx", () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("lights the scrollbar on scroll and clears the override when idle", async () => {
    // jsdom 没有 matchMedia 与可用的动画帧：用「减弱动效」分支验证事件接线与覆写/回落逻辑
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    vi.resetModules();
    const { installScrollbarFx } = await import("./scrollFx");
    cleanup = installScrollbarFx();

    const el = document.createElement("div");
    document.body.appendChild(el);

    el.dispatchEvent(new Event("scroll"));
    expect(el.style.getPropertyValue("--sb-alpha")).not.toBe("");

    // HIDE_DELAY(450) 后回落，覆写应被移除、交给 CSS 默认值
    await wait(700);
    expect(el.style.getPropertyValue("--sb-alpha")).toBe("");
  });
});