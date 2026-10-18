import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import light from "../../../scripts/theme/sources/light.js";
import dark from "../../../scripts/theme/sources/dark.js";
import { ROOT, STYLES, parseDeclarations } from "./theme-test-utils";

/**
 * 收集 src 下消费的 token：
 * - strict：无内联兜底的 var(--x) —— 必须被某处定义，否则属性失效（真缺口）
 * - fallback：带内联兜底的 var(--x, ...) —— 有意降级点，不进门禁
 * 扫描前剥离注释，排除文档示例文本造成的误报。
 */
function collectConsumed(): { strict: Set<string>; fallback: Set<string> } {
  const strict = new Set<string>();
  const fallback = new Set<string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(css|ts|tsx)$/.test(e.name)) {
        const text = readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
        for (const m of text.matchAll(/var\(--([a-z0-9-]+)\s*,/g)) fallback.add(m[1]);
        for (const m of text.matchAll(/var\(--([a-z0-9-]+)\)/g)) strict.add(m[1]);
      }
    }
  };
  walk(join(ROOT, "src"));
  return { strict, fallback };
}

/** 非主题 CSS（core/base/derived/适配层/其余样式）已定义的 token——豁免集 */
function collectDefinedElsewhere(): Set<string> {
  const tokens = new Set<string>();
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".css")) files.push(p);
    }
  };
  walk(STYLES);
  for (const f of files) {
    const normalized = f.replace(/\\/g, "/");
    if (/\/themes\/[a-z-]+\.css$/.test(normalized)) continue; // 14 个主题文件自身不豁免
    const text = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of text.matchAll(/--([a-z0-9-]+):/g)) tokens.add(m[1]);
  }
  return tokens;
}

describe("theme generate", () => {
  for (const [src, theme] of [
    [light, "light"],
    [dark, "dark"],
  ] as const) {
    const css = readFileSync(join(STYLES, "themes", `${theme}.css`), "utf8");
    const defined = parseDeclarations(css);

    it(`${theme}: 生成物标注 GENERATED 且禁手改`, () => {
      expect(css).toContain("GENERATED");
      expect(css).toContain("勿手改");
      expect(css).toContain(`[data-theme="${theme}"]`);
    });

    it(`${theme}: 覆盖 src 无兜底消费的全部 token（豁免：非主题 CSS 已定义）`, () => {
      const { strict } = collectConsumed();
      const exempt = collectDefinedElsewhere();
      const missing = [...strict].filter((t) => !(t in defined) && !exempt.has(t));
      expect(missing, `缺失: ${missing.join(", ")}`).toEqual([]);
    });

    it(`${theme}: chart-text-on-fill-0..7 全部定义为字面量颜色`, () => {
      for (let i = 0; i < 8; i++) {
        expect(defined[`chart-text-on-fill-${i}`], `缺 chart-text-on-fill-${i}`).toMatch(
          /^#[0-9a-f]{6}$/i,
        );
      }
    });

    it(`${theme}: 源色表透传值全部逐字出现在生成物中（黄金往返）`, () => {
      for (const [key, value] of Object.entries(src.passthrough)) {
        expect(defined[key], `${theme} 缺透传 ${key}`).toBe(value);
      }
    });
  }
});
