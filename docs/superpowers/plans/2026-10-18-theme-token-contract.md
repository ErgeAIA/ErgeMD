# 主题色板契约重构（第一阶段）Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 落地主题色板契约的第一阶段——源色表 + 构建期生成脚本 + 推导公式 + CI 对比度门禁，并把 light/dark 两套基准主题改为生成物，思维导图接线验证 text-on-fill 公式。

**Architecture:** 每套主题的唯一手写处是 `scripts/theme/sources/<theme>.js` 源色表；`scripts/theme/generate-themes.js` 按 `scripts/theme/color-science.js` 的公式计算全部派生 token，生成字面量 CSS 到 `src/styles/themes/<theme>.css`（文件头标注 GENERATED）。CI 用 vitest 解析生成的 CSS 源文本断言对比度。其余 12 套主题本阶段保持手写不动。

**Tech Stack:** 纯 Node ESM 脚本（无新依赖，package.json 为 `type: module`）+ vitest 3.2.7 + 现有 ESLint/tsc。

**范围依据：** `docs/theme-token-contract-design.md`（已批准，2026-10-18）。本计划只做其第 13 节的阶段 1。

**Git 纪律：** 按 AGENTS.md，所有 commit / 分支操作须经用户明确授权——计划中的 commit 步骤在执行时先请求授权，未授权不得提交。

---

### Task 1: 色彩科学模块（纯函数 + 单测，TDD）

**Files:**
- Create: `scripts/theme/color-science.js`
- Test: `src/styles/__tests__/color-science.test.ts`

**Step 1: 写失败测试**

`src/styles/__tests__/color-science.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import {
  parseHex,
  toHex,
  relativeLuminance,
  contrastRatio,
  rgbToOklch,
  oklchToRgb,
  pickTextColor,
  tuneForContrast,
  mixWith,
} from "../../../scripts/theme/color-science.js";

describe("color-science", () => {
  it("parseHex/toHex 往返一致", () => {
    expect(toHex(parseHex("#2666F0"))).toBe("#2666f0");
    expect(toHex(parseHex("#abc"))).toBe("#aabbcc");
  });

  it("非法 hex 抛错", () => {
    expect(() => parseHex("#12345")).toThrow();
  });

  it("relativeLuminance 已知值", () => {
    expect(relativeLuminance(parseHex("#ffffff"))).toBeCloseTo(1, 5);
    expect(relativeLuminance(parseHex("#000000"))).toBeCloseTo(0, 5);
  });

  it("contrastRatio 黑白为 21:1", () => {
    expect(contrastRatio(parseHex("#000000"), parseHex("#ffffff"))).toBeCloseTo(21, 1);
  });

  it("rgbToOklch → oklchToRgb 往返", () => {
    const rgb = parseHex("#1E56D4");
    const back = oklchToRgb(rgbToOklch(rgb));
    expect(toHex(back)).toBe("#1e56d4");
  });

  it("pickTextColor 亮底选深墨、暗底选浅墨", () => {
    const inks = ["#12121f", "#f0f0fa"];
    expect(pickTextColor("#EEF4FF", inks).color).toBe("#12121f");
    expect(pickTextColor("#22386E", inks).color).toBe("#f0f0fa");
  });

  it("pickTextColor 返回真实对比度且 ≥ 4.5", () => {
    const inks = ["#12121f", "#f0f0fa"];
    for (const fill of ["#EEF4FF", "#22386E", "#3D63C8", "#8FA8E8"]) {
      const { ratio } = pickTextColor(fill, inks);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("tuneForContrast 把不达标色调到达标（白底 4.5）", () => {
    const tuned = tuneForContrast("#E84093", "#FFFFFF", 4.5);
    expect(contrastRatio(parseHex(tuned), parseHex("#FFFFFF"))).toBeGreaterThanOrEqual(4.5);
  });

  it("tuneForContrast 保持色相（OKLCH h 不变）", () => {
    const before = rgbToOklch(parseHex("#E84093"));
    const after = rgbToOklch(parseHex(tuneForContrast("#E84093", "#FFFFFF", 4.5)));
    expect(Math.abs(after.h - before.h)).toBeLessThan(2);
  });

  it("mixWith 按比例插值", () => {
    expect(toHex(mixWith(parseHex("#000000"), parseHex("#ffffff"), 0.5))).toBe("#808080");
  });
});
```

**Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/styles/__tests__/color-science.test.ts`
Expected: FAIL（模块不存在，import 报错）

**Step 3: 实现模块**

`scripts/theme/color-science.js`：

```js
/**
 * ErgeMD 主题契约 - 色彩科学纯函数
 * 由 scripts/theme/generate-themes.js 与 vitest 门禁共用。
 * 仅依赖 Node 标准库语义的纯 ES Module，无第三方依赖。
 */

export function parseHex(hex) {
  const h = String(hex).trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`invalid hex color: ${hex}`);
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}

export function toHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

const srgbToLinear = (v) => {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};
const linearToSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

export function relativeLuminance({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function mixWith(base, other, ratio) {
  return {
    r: base.r + (other.r - base.r) * ratio,
    g: base.g + (other.g - base.g) * ratio,
    b: base.b + (other.b - base.b) * ratio,
  };
}

/* ---- OKLCH（Björn Ottosson 算法）---- */
function linearSrgbToOklab({ r, g, b }) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b2: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}
function oklabToLinearSrgb({ L, a, b2 }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b2;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b2;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b2;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

export function rgbToOklch(rgb) {
  const lin = {
    r: srgbToLinear(rgb.r), g: srgbToLinear(rgb.g), b: srgbToLinear(rgb.b),
  };
  const { L, a, b2 } = linearSrgbToOklab(lin);
  return { l: L, c: Math.sqrt(a * a + b2 * b2), h: (Math.atan2(b2, a) * 180) / Math.PI };
}

export function oklchToRgb({ l, c, h }) {
  const hr = (h * Math.PI) / 180;
  const { L, a, b2 } = { L: l, a: Math.cos(hr) * c, b2: Math.sin(hr) * c };
  const lin = oklabToLinearSrgb({ L, a, b2 });
  return {
    r: linearToSrgb(lin.r) * 255,
    g: linearToSrgb(lin.g) * 255,
    b: linearToSrgb(lin.b) * 255,
  };
}

/**
 * text-on-fill：从候选墨色中选对比度最高的一把。
 * @returns {{color:string, ratio:number}}
 */
export function pickTextColor(fillHex, inkHexes) {
  const fill = parseHex(fillHex);
  let best = inkHexes[0];
  let bestRatio = -1;
  for (const ink of inkHexes) {
    const ratio = contrastRatio(fill, parseHex(ink));
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = ink;
    }
  }
  return { color: best, ratio: bestRatio };
}

/**
 * 调色至对比度达标：只在 OKLCH 空间沿明度轴推进，色相与彩度保持不变。
 * 亮背景向暗推进、暗背景向亮推进；触底（0 或 1）即停止。
 */
export function tuneForContrast(colorHex, bgHex, target = 4.5) {
  const bg = parseHex(bgHex);
  const bgL = relativeLuminance(bg);
  const dir = bgL > 0.4 ? -1 : 1;
  let oklch = rgbToOklch(parseHex(colorHex));
  let rgb = oklchToRgb(oklch);
  let guard = 0;
  while (contrastRatio(rgb, bg) < target && guard++ < 64) {
    const next = oklch.l + dir * 0.01;
    if (next < 0 || next > 1) break;
    oklch = { ...oklch, l: next };
    rgb = oklchToRgb(oklch);
  }
  return toHex(rgb);
}
```

**Step 4: 运行测试确认通过**

Run: `pnpm vitest run src/styles/__tests__/color-science.test.ts`
Expected: PASS（10 个用例全绿）

**Step 5: commit（需用户授权）**

```bash
git add scripts/theme/color-science.js src/styles/__tests__/color-science.test.ts
git commit -m "feat(theme): 新增色彩科学模块与单测（对比度/OKLCH/text-on-fill）"
```

---

### Task 2: 源色表（light 完整 + dark 同构）

**Files:**
- Create: `scripts/theme/sources/light.js`
- Create: `scripts/theme/sources/dark.js`
- Create: `scripts/theme/sources/semantic.js`
- Test: `src/styles/__tests__/theme-sources.test.ts`

**Step 1: 写失败测试**

```ts
import { describe, it, expect } from "vitest";
import light from "../../../scripts/theme/sources/light.js";
import dark from "../../../scripts/theme/sources/dark.js";
import semantic from "../../../scripts/theme/sources/semantic.js";
import { parseHex } from "../../../scripts/theme/color-science.js";

const allHex = (obj, path = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "string" ? [[`${path}${k}`, v]] : allHex(v, `${path}${k}.`),
  );

describe("theme sources", () => {
  for (const [name, src] of [["light", light], ["dark", dark]] as const) {
    it(`${name}: 所有颜色字段均为合法 hex`, () => {
      for (const [key, value] of allHex(src)) {
        if (/gradient|Gradient/.test(key)) continue;
        expect(() => parseHex(value), `${name}.${key}=${value}`).not.toThrow();
      }
    });
    it(`${name}: 标题色阶 6 色、图表类别色相 6 色`, () => {
      expect(src.headingHues).toHaveLength(6);
      expect(src.chartHues).toHaveLength(6);
    });
  }
  it("semantic: callout 13 色齐全", () => {
    expect(Object.keys(semantic.callouts)).toHaveLength(13);
  });
});
```

**Step 2: 运行确认失败**

Run: `pnpm vitest run src/styles/__tests__/theme-sources.test.ts`
Expected: FAIL（源色表不存在）

**Step 3: 写 light 源色表（值取自现行 light.css，勿发明新色）**

`scripts/theme/sources/light.js`：

```js
/**
 * light 主题源色表 —— 本文件是 light 主题唯一的手写处。
 * 生成物 src/styles/themes/light.css 由 scripts/theme/generate-themes.js 产出，勿手改。
 */
export default {
  name: "light",
  // 画布阶（由内到外：阅读面 → 代码面 → 侧栏 → 页面底）
  canvas: {
    reader: "#FFFFFF",
    code: "#F8F8F8",
    sidebar: "#F2F2F2",
    page: "#F7F7F7",
    secondary: "#FEFEFE",
    tertiary: "#F0F0F0",
  },
  // 墨色阶
  ink: {
    heading: "#222222",
    primary: "#2D2D2D",
    secondary: "#4A4A4A",
    muted: "#6E6E6E",
  },
  // 主强调色相（功能位与标题调校的锚点）
  accent: { primary: "#2666F0", secondary: "#7B38ED" },
  // 六级标题色相种子（生成时按画布调校至 ≥4.5:1，色相不变）
  headingHues: ["#1A1A1A", "#2666F0", "#E84093", "#E25610", "#19A04D", "#787D86"],
  // 图表六类别色相种子（fill/stroke/series/text-on-fill 的派生源）
  chartHues: ["#2666F0", "#7B38ED", "#179E49", "#B87F00", "#DB2777", "#E35410"],
  // 代码高亮（VS Code 出身原配，本阶段原样保留）
  code: {
    keyword: "#2563EB",
    string: "#169A47",
    number: "#DF5010",
    comment: "#8F95A0",
    function: "#7B38ED",
    text: "#2D2D2D",
    label: "#E35410",
    copySuccess: "#179E49",
  },
  // 滚动条
  scrollbar: { thumb: "#C4C4C4", thumbHover: "#A8A8A8" },
};
```

**Step 4: 写 dark 源色表**

按现行 `src/styles/themes/dark.css` 的现值（执行本步骤时先读取该文件）提取同构字段。约束：`canvas.reader` / `ink.primary` 必须满足 contrastRatio ≥ 7；`headingHues` 与 `chartHues` 各 6 个合法 hex；代码高亮取 dark.css 现行值原样搬入。

**Step 5: 写语义源色表（全主题统一，不随主题漂移）**

`scripts/theme/sources/semantic.js`：

```js
/** 语义状态族：全主题统一（Obsidian callout 13 色，取现行 light.css 值） */
export default {
  callouts: {
    note: "#448aff",
    abstract: "#00b0ff",
    info: "#00b8d4",
    todo: "#00b8d4",
    tip: "#00bfa5",
    success: "#00c853",
    question: "#64dd17",
    warning: "#ff9100",
    failure: "#ff5252",
    danger: "#ff1744",
    bug: "#f50057",
    example: "#7c4dff",
    quote: "#9e9e9e",
  },
};
```

**Step 6: 运行确认通过**

Run: `pnpm vitest run src/styles/__tests__/theme-sources.test.ts`
Expected: PASS

**Step 7: commit（需用户授权）**

```bash
git add scripts/theme/sources/ src/styles/__tests__/theme-sources.test.ts
git commit -m "feat(theme): 新增 light/dark 源色表与语义状态源"
```

---

### Task 3: 生成脚本与黄金文件

**Files:**
- Create: `scripts/theme/generate-themes.js`
- Modify（生成物，脚本重写）: `src/styles/themes/light.css`、`src/styles/themes/dark.css`
- Test: `src/styles/__tests__/theme-generate.test.ts`

**Step 1: 写失败测试（消费完整性 + 幂等）**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(__dirname, "..", "..");

/** 收集 src 下所有 CSS/TS/TSX 里消费的 var(--x) 名 */
function collectConsumedTokens() {
  const tokens = new Set<string>();
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(css|ts|tsx)$/.test(e.name)) {
        for (const m of readFileSync(p, "utf8").matchAll(/var\(--([a-z0-9-]+)/g)) tokens.add(m[1]);
      }
    }
  };
  walk(join(SRC, "styles"));
  walk(join(SRC, "components"));
  return tokens;
}

/** 解析生成的主题 CSS：{token: hex} */
function parseThemeCss(css) {
  const out = {};
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) out[m[1]] = m[2];
  return out;
}

describe("theme generate", () => {
  for (const theme of ["light", "dark"]) {
    it(`${theme}: 生成物覆盖 styles/components 消费的全部颜色 token`, () => {
      const css = readFileSync(join(SRC, "styles/themes", `${theme}.css`), "utf8");
      const defined = parseThemeCss(css);
      const consumed = collectConsumedTokens();
      // 只断言"颜色类"消费：非颜色 token（rgb 三元组/渐变/字号等）不在本断言范围
      const missing = [...consumed].filter((t) => !(t in defined));
      expect(missing, `缺失: ${missing.join(", ")}`).toEqual([]);
    });
  }
});
```

注意：首轮该测试会红——因为现行手写主题里存在**仅定义在 base/derived 层**而非主题文件中的消费 token。执行时按红名单把 base 层定义的 token 加入豁免集合并写进测试注释（豁免集 = `theme-light-base.css`/`theme-dark-base.css`/`theme-derived.css` 中定义的 token 名，读取这三个文件收集）。这是本任务唯一允许的"按现实校准"，校准后测试必须绿。

**Step 2: 运行确认失败**

Run: `pnpm vitest run src/styles/__tests__/theme-generate.test.ts`
Expected: FAIL（当前生成的 light.css 尚未包含全部 token / 文件还是手写版）

**Step 3: 实现生成脚本**

`scripts/theme/generate-themes.js`（核心结构；TOKEN_SPECS 为数据驱动的派生表）：

```js
/**
 * ErgeMD 主题生成器：源色表 → 字面量主题 CSS。
 * 用法：
 *   node scripts/theme/generate-themes.js            # 写入 src/styles/themes/<name>.css
 *   node scripts/theme/generate-themes.js --check    # 仅校验一致，不一致 exit 1（CI 用）
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as cs from "./color-science.js";
import light from "./sources/light.js";
import dark from "./sources/dark.js";
import semantic from "./sources/semantic.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** 派生 token 表：name → (src) => hex */
function buildTokens(s) {
  const inkDark = "#12121f"; // 浅底上的深墨（固定物理值，见 design §6）
  const inkLight = "#f0f0fa"; // 深底上的浅墨
  const inks = [inkDark, inkLight];
  const t = {};

  // 画布与墨色：原样透传
  Object.assign(t, {
    "bg-reader": s.canvas.reader, "bg-code": s.canvas.code,
    "bg-sidebar": s.canvas.sidebar, "bg-page": s.canvas.page,
    "bg-secondary": s.canvas.secondary, "bg-tertiary": s.canvas.tertiary,
    "text-heading": s.ink.heading, "text-primary": s.ink.primary,
    "text-secondary": s.ink.secondary, "text-muted": s.ink.muted,
  });

  // 标题色阶：色相种子按画布调校至 ≥4.5（彩度保、明度让位）
  s.headingHues.forEach((seed, i) => {
    t[`h${i + 1}-color`] = cs.tuneForContrast(seed, s.canvas.reader, 4.5);
  });

  // 图表四层：色相种子 → fill（浅色带）/ stroke（中带）/ series（中高带）/ text-on-fill（亮度选墨）
  const isDark = cs.relativeLuminance(cs.parseHex(s.canvas.reader)) < 0.4;
  s.chartHues.forEach((seed, i) => {
    const oklch = cs.rgbToOklch(cs.parseHex(seed));
    const fillL = isDark ? 0.30 : 0.92;
    const strokeL = isDark ? 0.55 : 0.45;
    const seriesL = isDark ? 0.65 : 0.50;
    const fill = cs.toHex(cs.oklchToRgb({ ...oklch, l: fillL }));
    const stroke = cs.toHex(cs.oklchToRgb({ ...oklch, l: strokeL }));
    const series = cs.toHex(cs.oklchToRgb({ ...oklch, l: seriesL }));
    t[`chart-fill-${i}`] = fill;
    t[`chart-stroke-${i}`] = stroke;
    t[`chart-series-${i}`] = series;
    t[`chart-text-on-fill-${i}`] = cs.pickTextColor(fill, inks).color;
  });

  // 装饰线：与画布固定明度差（6% 向墨色混合）
  t["divider"] = cs.toHex(cs.mixWith(cs.parseHex(s.canvas.reader), cs.parseHex(s.ink.primary), 0.06));
  t["table-border"] = t["divider"];
  t["border-subtle"] = cs.toHex(cs.mixWith(cs.parseHex(s.canvas.reader), cs.parseHex(s.ink.primary), 0.03));

  // 语义状态族：全主题统一
  for (const [k, v] of Object.entries(semantic.callouts)) t[`obsidian-callout-${k}`] = v;

  // 代码高亮：原配透传
  Object.assign(t, {
    "code-keyword": s.code.keyword, "code-string": s.code.string,
    "code-number": s.code.number, "code-comment": s.code.comment,
    "code-function": s.code.function, "code-text": s.code.text,
    "code-label": s.code.label, "copy-success": s.code.copySuccess,
  });
  return t;
}

const HEADER = `/*
================================================================================
${"{name}"} 主题配色 —— GENERATED by scripts/theme/generate-themes.js
================================================================================
警告：本文件为生成物，请勿手改！修改请编辑 scripts/theme/sources/${"{name}"}.js
后运行 \`pnpm theme:generate\`。派生规则见 docs/theme-token-contract-design.md。
================================================================================
*/

[data-theme="${"{name}}"] {
`;

function render(name, tokens) {
  const lines = Object.entries(tokens).map(([k, v]) => `    --${k}: ${v};`);
  return HEADER.replace(/\{name\}/g, name) + lines.join("\n") + "\n}\n";
}

const THEMES = { light, dark };
const check = process.argv.includes("--check");
let ok = true;
for (const [src, name] of [[light, "light"], [dark, "dark"]]) {
  const css = render(name, buildTokens(src));
  const path = join(ROOT, "src/styles/themes", `${name}.css`);
  if (check) {
    const current = readFileSyncSafe(path);
    if (current !== css) {
      console.error(`[theme:generate] ${name}.css 与源色表不一致，请运行 pnpm theme:generate`);
      ok = false;
    }
  } else {
    writeFileSync(path, css);
    console.log(`[theme:generate] 已生成 ${name}.css（${Object.keys(buildTokens(src)).length} tokens）`);
  }
}
process.exit(ok ? 0 : 1);
```

（`readFileSyncSafe` 用 `existsSync` 包裹后 `readFileSync`；`THEMES` 常量删除或忽略，以上面的循环为准。注意：脚本必须 import `readFileSync`/`existsSync`。）

**Step 4: 运行生成并看 diff**

Run: `pnpm theme:generate`（先在 package.json 加脚本，见 Task 5；本步可先 `node scripts/theme/generate-themes.js`）
Expected: light.css / dark.css 被重写为生成物；`git diff --stat` 显示两文件大幅变化（预期内，它们是生成物）

**Step 5: 运行测试确认通过**

Run: `pnpm vitest run src/styles/__tests__/theme-generate.test.ts`
Expected: PASS（消费完整性断言绿）

**Step 6: commit（需用户授权）**

```bash
git add scripts/theme/generate-themes.js src/styles/themes/light.css src/styles/themes/dark.css src/styles/__tests__/theme-generate.test.ts
git commit -m "feat(theme): 主题生成脚本上线，light/dark 改为生成物"
```

---

### Task 4: CI 对比度门禁

**Files:**
- Test: `src/styles/__tests__/theme-contrast.test.ts`

**Step 1: 写失败测试**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseHex, contrastRatio } from "../../../scripts/theme/color-science.js";

const ROOT = join(__dirname, "..", "..");

function tokensOf(theme) {
  const css = readFileSync(join(ROOT, "styles/themes", `${theme}.css`), "utf8");
  const out = {};
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) out[m[1]] = m[2];
  return out;
}

const BODY = 4.5;   // 标题/功能位/图表文字门槛
const PROSE = 7;    // 正文墨色门槛

describe("主题对比度门禁", () => {
  for (const theme of ["light", "dark"]) {
    const t = tokensOf(theme);
    const reader = t["bg-reader"];
    const code = t["bg-code"];

    it(`${theme}: 正文墨色 ≥ ${PROSE}:1`, () => {
      expect(contrastRatio(parseHex(t["text-primary"]), parseHex(reader))).toBeGreaterThanOrEqual(PROSE);
    });
    it(`${theme}: 次级文字 ≥ ${BODY}:1`, () => {
      expect(contrastRatio(parseHex(t["text-secondary"]), parseHex(reader))).toBeGreaterThanOrEqual(BODY);
    });
    it(`${theme}: 六级标题全部 ≥ ${BODY}:1`, () => {
      for (let i = 1; i <= 6; i++) {
        const name = `h${i}-color`;
        expect(t[name], `${theme} 缺 ${name}`).toBeDefined();
        expect(contrastRatio(parseHex(t[name]), parseHex(reader)), `${theme}.${name}`).toBeGreaterThanOrEqual(BODY);
      }
    });
    it(`${theme}: chart fill × text-on-fill 全部 ≥ ${BODY}:1`, () => {
      for (let i = 0; i < 8; i++) {
        const fill = t[`chart-fill-${i}`];
        const text = t[`chart-text-on-fill-${i}`];
        expect(fill, `${theme} 缺 chart-fill-${i}`).toBeDefined();
        expect(text, `${theme} 缺 chart-text-on-fill-${i}`).toBeDefined();
        expect(
          contrastRatio(parseHex(text), parseHex(fill)),
          `${theme}: fill-${i} × text`,
        ).toBeGreaterThanOrEqual(BODY);
      }
    });
    it(`${theme}: 代码文字 ≥ ${BODY}:1`, () => {
      expect(contrastRatio(parseHex(t["code-text"]), parseHex(code))).toBeGreaterThanOrEqual(BODY);
    });
  }
});
```

**Step 2: 运行确认失败（对手写版主题）**

Run: `pnpm vitest run src/styles/__tests__/theme-contrast.test.ts`
Expected: FAIL——手写 light.css 无 `chart-text-on-fill-*` 且 h3–h6 不达标（这正是设计的出发点）

**Step 3: 运行 Task 3 的生成脚本后转绿**

Run: `node scripts/theme/generate-themes.js && pnpm vitest run src/styles/__tests__/theme-contrast.test.ts`
Expected: PASS

**Step 4: 反例守卫（防止门禁被敷衍）**

临时把 `scripts/theme/sources/light.js` 的 `headingHues[2]` 改成 `"#E84093"` 且注释掉 tuneForContrast 调用一行，确认测试变红；还原。验证门禁真实有效后 commit。

**Step 5: commit（需用户授权）**

```bash
git add src/styles/__tests__/theme-contrast.test.ts
git commit -m "test(theme): 新增对比度 CI 门禁（正文/标题/图表文字）"
```

---

### Task 5: 思维导图接线 + 工程化

**Files:**
- Modify: `src/styles/themes/core/mermaid/mermaid-mindmap.css`（l1/l2/l3 文字色改取 text-on-fill）
- Modify: `src/components/reader/MermaidDiagram.tsx`（mindmap 颜色组增加 `level1Text/level2Text/level3Text` 读取与 themeVariables 注入，照现有 eventmodeling 块的写法）
- Modify: `package.json`（新增 `theme:generate` / `theme:generate:check` 脚本）
- Modify: `AGENTS.md`（生成物例外条款：读→改→追加 agents-changelog.md）
- Modify: `docs/agents/agents-changelog.md`（登记本次 AGENTS.md 改动）

**Step 1: 思维导图 CSS 接线**

`mermaid-mindmap.css` 中节点文字色（现值取 `--chart-text` 或硬编码）改为：

```css
[data-theme] {
  --mermaid-mindmap-level1-text: var(--chart-text-on-fill-0);
  --mermaid-mindmap-level2-text: var(--chart-text-on-fill-1);
  --mermaid-mindmap-level3-text: var(--chart-text-on-fill-2);
}
```

（精确行号以执行时读取的最新文件为准；mindmap 各级底色已用 `--chart-fill-N`，文字与底色同索引配对。）

**Step 2: MermaidDiagram 注入**

在 `getMermaidColors()` 的 `charts.mindmap` 组中增加：

```ts
level1Text: getCSSVar("--mermaid-mindmap-level1-text", primaryTextColor),
level2Text: getCSSVar("--mermaid-mindmap-level2-text", primaryTextColor),
level3Text: getCSSVar("--mermaid-mindmap-level3-text", primaryTextColor),
```

并在 `isMindmap` 的 themeVariables 注入块中按现有字段命名赋值（执行时先读该块现值，沿用其字段名）。

**Step 3: package.json 脚本**

```json
"theme:generate": "node scripts/theme/generate-themes.js",
"theme:generate:check": "node scripts/theme/generate-themes.js --check"
```

**Step 4: AGENTS.md 例外条款**

在 Conventions 表「写文件方式」行追加一句：*生成物例外：`src/styles/themes/*.css` 中标注 GENERATED 的文件由 `pnpm theme:generate` 脚本重写，人工修改必须走源色表 `scripts/theme/sources/*.js`*。改前读最新内容，改后在 `docs/agents/agents-changelog.md` 追加「旧值 → 处置 → 去处」一行。

**Step 5: 验证**

Run: `pnpm lint && pnpm exec tsc --noEmit && pnpm test`
Expected: 全部通过（含既有 57 个测试 + 新增门禁）

**Step 6: commit（需用户授权）**

```bash
git add -A && git commit -m "feat(theme): 思维导图接线 text-on-fill 与主题生成工程化"
```

---

### Task 6: 文档同步与验收移交

**Files:**
- Modify: `docs/TestCase/MarkdownSyntaxExample.md`（6.13 检查要点补充「节点文字与底色对比度已达标」+ frontmatter `updated: 2026-10-18`）
- Modify: `docs/agents/project-progress.md`、`docs/agents/decision-log.md`（DEC-036 记录生成器上线与门禁）

**Step 1: 全量验证**

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
node scripts/theme/generate-themes.js --check
```

**Step 2: 文档同步**（按上表修改，frontmatter updated 一律当日）

**Step 3: 移交验收**

向用户报告：阶段 1 完成，待实机验收——light/dark 两主题下打开测试文档，重点核对：① 六级标题色相保留且清晰；② 6.13 思维导图节点文字全部清晰可读（暗色主题）；③ 正文与功能位（链接/行内代码/表头/引用/序号）观感。验收通过后再启动阶段 2（高刺激组迁移）。

---

## 执行方式选择

计划已保存至 `docs/superpowers/plans/2026-10-18-theme-token-contract.md`。两种执行方式：

1. **Subagent-Driven（本会话）**——每个 Task 派一个 fresh subagent 执行，任务间我来审查，迭代快
2. **Parallel Session（独立会话）**——新开会话用 executing-plans 技能批量执行，设检查点

选哪种？
