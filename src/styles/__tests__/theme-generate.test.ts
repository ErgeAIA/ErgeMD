import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import light from "../../../scripts/theme/sources/light.js";
import dark from "../../../scripts/theme/sources/dark.js";
import cyberpunk from "../../../scripts/theme/sources/cyberpunk.js";
import { buildTokens, render } from "../../../scripts/theme/generate-themes.js";
import { ROOT, STYLES, parseDeclarations, readTheme } from "./theme-test-utils";

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
    [cyberpunk, "cyberpunk"],
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

  it("生成物与脚本输出逐字一致（--check 的 vitest 等价门禁，手改即红）", () => {
    for (const [src, name] of [
      [light, "light"],
      [dark, "dark"],
      [cyberpunk, "cyberpunk"],
    ] as const) {
      const current = readFileSync(join(STYLES, "themes", `${name}.css`), "utf8");
      const eol = current.includes("\r\n") ? "\r\n" : "\n";
      expect(current, `${name}.css 与源色表不一致`).toBe(
        render(name, buildTokens(src), eol),
      );
    }
  });
});

describe("全部 14 套主题的 chart-text-on-fill 存在性", () => {
  const allThemes = readdirSync(join(STYLES, "themes"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => f.replace(/\.css$/, ""));

  /** 族 base：light/solarized-light 走亮色 base，其余 12 套走暗色 base */
  const baseOf = (theme: string) =>
    ["light", "solarized-light"].includes(theme)
      ? parseDeclarations(readFileSync(join(STYLES, "themes/core/theme-light-base.css"), "utf8"))
      : parseDeclarations(readFileSync(join(STYLES, "themes/core/theme-dark-base.css"), "utf8"));

  /** 有效值：主题自有 → 族 base，解析一层 var() 间接 */
  const effective = (theme: string, key: string, depth = 0): string | undefined => {
    if (depth > 4) return undefined;
    for (const layer of [readTheme(theme), baseOf(theme)]) {
      const v = layer[key];
      if (v === undefined) continue;
      const m = v.match(/^var\(--([a-z0-9-]+)\)$/);
      return m ? effective(theme, m[1], depth + 1) : v;
    }
    return undefined;
  };

  for (const theme of allThemes) {
    it(`${theme}: chart-text-on-fill-0..7 均有效定义`, () => {
      for (let i = 0; i < 8; i++) {
        expect(
          effective(theme, `chart-text-on-fill-${i}`),
          `${theme} 缺 chart-text-on-fill-${i}（var() 将解析为空 → 消费方退化为硬编码兜底）`,
        ).toBeDefined();
      }
    });
  }
});
