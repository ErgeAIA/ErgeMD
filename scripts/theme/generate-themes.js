/**
 * ErgeMD 主题生成器：源色表 → 字面量主题 CSS（GENERATED 产物，勿手改）。
 *
 * 用法：
 *   node scripts/theme/generate-themes.js            # 写入 src/styles/themes/<name>.css
 *   node scripts/theme/generate-themes.js --check    # 仅校验一致，不一致 exit 1（CI 用）
 *
 * 派生规则见 docs/theme-token-contract-design.md 第 6 节，及 SDD 台账裁决
 * R11（派生范围）/ R12（分隔线统一派生）/ R13（fillBand 出处）。
 *
 * 模块同时导出 buildTokens/render 供 vitest 一致性门禁使用（不产生副作用）；
 * 仅当被直接执行时才运行 CLI。
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as cs from "./color-science.js";
import light from "./sources/light.js";
import dark from "./sources/dark.js";
import cyberpunk from "./sources/cyberpunk.js";
import neonCyberpunk from "./sources/neon-cyberpunk.js";
import solarFlare from "./sources/solar-flare.js";
import desertSunset from "./sources/desert-sunset.js";
import aurora from "./sources/aurora.js";
import cherryBlossom from "./sources/cherry-blossom.js";
import falcon from "./sources/falcon.js";
import forest from "./sources/forest.js";
import monochrome from "./sources/monochrome.js";
import ocean from "./sources/ocean.js";
import tokyoNight from "./sources/tokyo-night.js";
import solarizedLight from "./sources/solarized-light.js";

export { buildTokens, render };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** 装饰线与画布的固定混合比例（design §6：与画布保持 4-6% 明度差；贴近现行值） */
const DIVIDER_RATIO = 0.08;
const BORDER_SUBTLE_RATIO = 0.05;

/** 代码高亮源字段 → CSS token 名（copySuccess 的现行 token 无 code- 前缀，显式映射） */
const CODE_TOKENS = {
  keyword: "code-keyword",
  string: "code-string",
  number: "code-number",
  comment: "code-comment",
  function: "code-function",
  text: "code-text",
  label: "code-label",
  copySuccess: "copy-success",
};

/**
 * 由源色表计算全部 token。
 * @returns {Record<string, string>} token 名（不含 --）→ 字面量值
 */
function buildTokens(s) {
  const t = {};
  const set = (key, value) => {
    if (!key) throw new Error(`${s.name}: 非法 token 名`);
    if (key in t) throw new Error(`${s.name}: token 冲突 ${key}`);
    t[key] = value;
  };

  // ---- 画布与墨色：透传 ----
  set("bg-reader", s.canvas.reader);
  set("bg-code", s.canvas.code);
  set("bg-sidebar", s.canvas.sidebar);
  set("bg-page", s.canvas.page);
  set("bg-secondary", s.canvas.secondary);
  set("bg-tertiary", s.canvas.tertiary);
  // bg-primary：历史消费方（LinkEditModal/ImageEditModal/ReadingOptions，7 处无兜底）
  // 从未被任何主题定义（BUG-067）；按「次级/elevated 表面」语义别名到 canvas.secondary
  set("bg-primary", s.canvas.secondary);
  set("text-heading", s.ink.heading);
  set("text-primary", s.ink.primary);
  set("text-secondary", s.ink.secondary);
  set("text-muted", s.ink.muted);

  // ---- 标题色阶：色相种子按画布调校至 ≥4.5:1（彩度保、明度让位、色相不变）----
  s.headingHues.forEach((seed, i) => {
    const r = cs.tuneForContrast(seed, s.canvas.reader, 4.5);
    if (!r.met) {
      console.warn(
        `[theme:generate] ${s.name}: h${i + 1}-color 未达标（${r.ratio.toFixed(2)}:1），已取明度边界值`,
      );
    }
    set(`h${i + 1}-color`, r.hex);
  });

  // ---- 强调族与品牌族：hex + rgb 三元组（机械转换）----
  for (const [name, hex] of Object.entries(s.accent)) {
    const { r, g, b } = cs.parseHex(hex);
    set(`accent-${name}`, hex);
    set(`accent-${name}-rgb`, `${r}, ${g}, ${b}`);
  }
  set("brand-primary", s.brand.primary);
  set("brand-secondary", s.brand.secondary);
  set("brand-logo", s.brand.logo);
  for (const key of ["primary", "secondary"]) {
    const { r, g, b } = cs.parseHex(s.brand[key]);
    set(`brand-${key}-rgb`, `${r}, ${g}, ${b}`);
  }

  // ---- 图表四层 ----
  // fill-0..5：类别色相按填充带派生（色相不变，明度/彩度入带）；6/7 透传现行值
  const fills = [
    ...s.chartHues.map((seed) => {
      const o = cs.rgbToOklch(cs.parseHex(seed));
      return cs.toHex(cs.oklchToRgb({ ...o, l: s.fillBand.l, c: s.fillBand.c }));
    }),
    s.chartSpare.fill6,
    s.chartSpare.fill7,
  ];
  const strokes = [...s.chartHues, s.chartSpare.stroke6, s.chartSpare.stroke7];
  const series = [...s.seriesHues, s.chartSpare.series6, s.chartSpare.series7];
  fills.forEach((v, i) => set(`chart-fill-${i}`, v));
  strokes.forEach((v, i) => set(`chart-stroke-${i}`, v));
  series.forEach((v, i) => set(`chart-series-${i}`, v));
  // text-on-fill：每底色绑定对比度最高的墨色（深底浅字 / 浅底深字）
  const inks = [s.ink.primary, s.canvas.reader];
  fills.forEach((fill, i) => {
    const { color, ratio } = cs.pickTextColor(fill, inks);
    if (ratio < 4.5) {
      console.warn(
        `[theme:generate] ${s.name}: chart-text-on-fill-${i} 对比度不足（${ratio.toFixed(2)}:1 on ${fill}）`,
      );
    }
    set(`chart-text-on-fill-${i}`, color);
  });
  // 图表中性组：透传现行值
  set("chart-edge", s.chartNeutral.edge);
  set("chart-label-bg", s.chartNeutral.labelBg);
  set("chart-surface-1", s.chartNeutral.surface1);
  set("chart-surface-2", s.chartNeutral.surface2);
  set("chart-surface-3", s.chartNeutral.surface3);
  set("chart-text", s.chartNeutral.text);
  set("chart-text-muted", s.chartNeutral.textMuted);

  // ---- 装饰线：与画布固定明度差（R12：两主题统一派生，不透传）----
  const ink = cs.parseHex(s.ink.primary);
  const canvas = cs.parseHex(s.canvas.reader);
  set("divider", cs.toHex(cs.mixWith(canvas, ink, DIVIDER_RATIO)));
  set("table-border", cs.toHex(cs.mixWith(canvas, ink, DIVIDER_RATIO)));
  set("border-subtle", cs.toHex(cs.mixWith(canvas, ink, BORDER_SUBTLE_RATIO)));

  // ---- 代码高亮与滚动条：透传 ----
  for (const [k, v] of Object.entries(s.code)) {
    if (!CODE_TOKENS[k]) throw new Error(`${s.name}: 未映射的代码字段 ${k}`);
    set(CODE_TOKENS[k], v);
  }
  set("scrollbar-track", s.scrollbar.track);
  set("scrollbar-thumb", s.scrollbar.thumb);
  set("scrollbar-thumb-hover", s.scrollbar.thumbHover);

  // ---- 透传组：现行字面量 ----
  for (const [k, v] of Object.entries(s.passthrough)) set(k, v);

  return t;
}

function render(name, tokens, eol) {
  const header = [
    "/*",
    "================================================================================",
    `${name} 主题配色 —— GENERATED by scripts/theme/generate-themes.js`,
    "================================================================================",
    "警告：本文件为生成物，请勿手改！修改请编辑 scripts/theme/sources/" + name + ".js",
    "后运行 `pnpm theme:generate`。派生规则见 docs/theme-token-contract-design.md 第 6 节。",
    "================================================================================",
    "*/",
    "",
    `[data-theme="${name}"] {`,
  ].join(eol);
  const body = Object.entries(tokens)
    .map(([k, v]) => `    --${k}: ${v};`)
    .join(eol);
  return `${header}${eol}${body}${eol}}${eol}`;
}

/** 已迁移到契约的主题（按阶段推进：阶段 1 = light/dark，阶段 2 = 高刺激组） */
const THEMES = [
  light,
  dark,
  cyberpunk,
  neonCyberpunk,
  solarFlare,
  desertSunset,
  aurora,
  cherryBlossom,
  falcon,
  forest,
  monochrome,
  ocean,
  tokyoNight,
  solarizedLight,
];

/** 是否被直接执行（node scripts/theme/generate-themes.js） */
function isMain() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMain()) {
  const check = process.argv.includes("--check");
  let ok = true;
  for (const src of THEMES) {
    const tokens = buildTokens(src);
    const count = Object.keys(tokens).length;
    const path = join(ROOT, "src/styles/themes", `${src.name}.css`);
    // 沿用文件现行换行符，避免无意义的全量 diff
    const current = existsSync(path) ? readFileSync(path, "utf8") : "";
    const eol = current.includes("\r\n") ? "\r\n" : "\n";
    const css = render(src.name, tokens, eol);
    if (check) {
      if (current !== css) {
        console.error(`[theme:generate] ${src.name}.css 与源色表不一致——请运行 pnpm theme:generate`);
        ok = false;
      } else {
        console.log(`[theme:generate] ${src.name}.css 一致（${count} tokens）`);
      }
    } else {
      writeFileSync(path, css);
      console.log(`[theme:generate] 已生成 ${src.name}.css（${count} tokens）`);
    }
  }
  process.exit(ok ? 0 : 1);
}
