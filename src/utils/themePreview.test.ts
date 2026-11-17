import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const themeDir = resolve(__dirname, "../styles/themes");

const THIRD_COLOR_CANDIDATES = [
  "--accent-pink",
  "--accent-purple",
  "--accent-green",
  "--accent-yellow",
];

function readToken(css: string, token: string): string | null {
  const line = css
    .split("\n")
    .find((l) => l.trim().startsWith(`--${token.replace(/^--/, "")}:`));
  return line ? line.trim().split(":")[1].replace(/;/g, "").trim() : null;
}

const themeFiles = readdirSync(themeDir).filter((f) => f.endsWith(".css"));

describe("主题色卡预览色", () => {
  it.each(themeFiles.map((f) => [f.replace(".css", ""), f]))(
    "%s: 画布 / 主强调 / 副强调 / 第三色 四枚圆点互不相同",
    (_name, file) => {
      const css = readFileSync(resolve(themeDir, file), "utf8");
      const base = ["bg-page", "brand-primary", "brand-secondary"].map((t) =>
        readToken(css, t),
      );
      expect(base.every(Boolean)).toBe(true);

      const taken = base.map((c) => c!.toUpperCase());
      const third = THIRD_COLOR_CANDIDATES.map((t) =>
        readToken(css, t),
      ).find((c) => c && !taken.includes(c.toUpperCase()));

      expect(third).toBeTruthy();
      expect(new Set([...taken, third!.toUpperCase()]).size).toBe(4);
    },
  );
});
