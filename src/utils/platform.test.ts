import { describe, it, expect, afterEach } from "vitest";
import { detectPlatform, getPlatformLabel } from "./platform";

describe("detectPlatform", () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });

  function setUserAgent(ua: string) {
    Object.defineProperty(navigator, "userAgent", {
      value: ua,
      configurable: true,
    });
  }

  it("detects macOS", () => {
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
    );
    expect(detectPlatform()).toBe("macos");
  });

  it("detects Windows", () => {
    setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );
    expect(detectPlatform()).toBe("windows");
  });

  it("detects Linux", () => {
    setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36");
    expect(detectPlatform()).toBe("linux");
  });

  it("falls back to unknown for unrecognized UA", () => {
    setUserAgent("curl/7.81.0");
    expect(detectPlatform()).toBe("unknown");
  });
});

describe("getPlatformLabel", () => {
  it("returns Chinese label for macOS", () => {
    expect(getPlatformLabel("macos", "zh-CN")).toBe("访达");
  });

  it("returns Chinese label for Windows", () => {
    expect(getPlatformLabel("windows", "zh-CN")).toBe("资源管理器");
  });

  it("returns Chinese label for Linux", () => {
    expect(getPlatformLabel("linux", "zh-CN")).toBe("文件管理器");
  });

  it("returns English label for macOS", () => {
    expect(getPlatformLabel("macos", "en-US")).toBe("Finder");
  });

  it("returns English label for Windows", () => {
    expect(getPlatformLabel("windows", "en-US")).toBe("Explorer");
  });

  it("returns English label for Linux", () => {
    expect(getPlatformLabel("linux", "en-US")).toBe("File Manager");
  });
});
