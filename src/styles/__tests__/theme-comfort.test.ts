import { describe, expect, it } from "vitest";
import { readTheme } from "./theme-test-utils";
import {
  parseHex,
  relativeLuminance,
  apcaLc,
} from "../../../scripts/theme/color-science.js";

/**
 * 墨色「舒适上限」提示（advisory，不阻断）。
 * 对比度门禁只有下限（≥4.5/7:1），会鼓励「越亮越安全」；暗底高对比同样是长读疲劳源。
 * 这里只打印越界清单，不 fail——上限是设计判断，不是合规线。
 */
const THEMES = [
  "light",
  "dark",
  "cyberpunk",
  "neon-cyberpunk",
  "solar-flare",
  "desert-sunset",
  "aurora",
  "cherry-blossom",
  "falcon",
  "forest",
  "monochrome",
  "ocean",
  "tokyo-night",
  "solarized-light",
];

const MAX_DARK_BODY = 88;
const MAX_DARK_H1 = 95;
const MAX_LIGHT_BODY = 92;

describe("主题墨色舒适上限（advisory）", () => {
  it("打印越界清单，不阻断测试", () => {
    const over: string[] = [];

    for (const theme of THEMES) {
      const t = readTheme(theme);
      const bg = t["bg-reader"];
      const isDark = relativeLuminance(parseHex(bg)) < 0.2;
      const body = Math.abs(apcaLc(t["text-primary"], bg));
      const h1 = Math.abs(apcaLc(t["h1-color"], bg));

      expect(Number.isFinite(body) && Number.isFinite(h1)).toBe(true);

      if (body > (isDark ? MAX_DARK_BODY : MAX_LIGHT_BODY)) {
        over.push(
          `${theme}: 正文 |Lc|=${body.toFixed(1)} 超过 ${isDark ? MAX_DARK_BODY : MAX_LIGHT_BODY}`,
        );
      }
      if (isDark && h1 > MAX_DARK_H1) {
        over.push(`${theme}: h1 |Lc|=${h1.toFixed(1)} 超过 ${MAX_DARK_H1}`);
      }
    }

    if (over.length > 0) {
      console.warn(
        `[theme:comfort] ${over.length} 条越界提示（不阻断）：\n${over.join("\n")}`,
      );
    }
  });
});