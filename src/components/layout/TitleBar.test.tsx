import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("TitleBar platform visibility", () => {
  it("hides custom window controls on macOS", async () => {
    vi.doMock("@/utils/platform", () => ({
      detectPlatform: () => "macos",
      getPlatformLabel: () => "Finder",
    }));
    const platformMod = await import("@/utils/platform");
    console.log("[debug] mocked detectPlatform =", platformMod.detectPlatform());
    const { default: TitleBar } = await import("./TitleBar");
    const { container } = render(
      <TitleBar
        visible={true}
        transition="opacity 0.2s"
        onToggleLeftPanel={() => {}}
        onToggleRightPanel={() => {}}
        showLeftPanelButton={true}
      />,
    );
    // macOS 不渲染自绘最小化/最大化/关闭按钮
    expect(
      container.querySelector('[data-testid="titlebar-minimize"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="titlebar-maximize"]'),
    ).toBeNull();
    expect(container.querySelector('[data-testid="titlebar-close"]')).toBeNull();
  });

  it("shows custom window controls on Windows", async () => {
    vi.doMock("@/utils/platform", () => ({
      detectPlatform: () => "windows",
      getPlatformLabel: () => "Explorer",
    }));
    const { default: TitleBar } = await import("./TitleBar");
    const { container } = render(
      <TitleBar
        visible={true}
        transition="opacity 0.2s"
        onToggleLeftPanel={() => {}}
        onToggleRightPanel={() => {}}
        showLeftPanelButton={true}
      />,
    );
    expect(
      container.querySelector('[data-testid="titlebar-minimize"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="titlebar-maximize"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="titlebar-close"]'),
    ).not.toBeNull();
  });

  it("shows custom window controls on Linux", async () => {
    vi.doMock("@/utils/platform", () => ({
      detectPlatform: () => "linux",
      getPlatformLabel: () => "File Manager",
    }));
    const { default: TitleBar } = await import("./TitleBar");
    const { container } = render(
      <TitleBar
        visible={true}
        transition="opacity 0.2s"
        onToggleLeftPanel={() => {}}
        onToggleRightPanel={() => {}}
        showLeftPanelButton={true}
      />,
    );
    expect(
      container.querySelector('[data-testid="titlebar-minimize"]'),
    ).not.toBeNull();
  });
});
