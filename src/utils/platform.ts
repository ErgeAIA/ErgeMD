export type Platform = "macos" | "windows" | "linux" | "unknown";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac") || ua.includes("darwin")) return "macos";
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux") || ua.includes("x11")) return "linux";
  return "unknown";
}

export function getPlatformLabel(
  platform: Platform,
  locale: "zh-CN" | "en-US",
): string {
  const labels: Record<Platform, Record<string, string>> = {
    macos: { "zh-CN": "访达", "en-US": "Finder" },
    windows: { "zh-CN": "资源管理器", "en-US": "Explorer" },
    linux: { "zh-CN": "文件管理器", "en-US": "File Manager" },
    unknown: { "zh-CN": "文件管理器", "en-US": "File Manager" },
  };
  return labels[platform][locale] ?? labels[platform]["en-US"];
}
