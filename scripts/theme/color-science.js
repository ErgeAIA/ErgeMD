/**
 * ErgeMD 主题契约 - 色彩科学纯函数
 * 由 scripts/theme/generate-themes.js 与 vitest 对比度门禁共用。
 * 仅纯 ES Module，无第三方依赖；Node 与 vitest 均可直接 import。
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

/** WCAG 相对亮度（0=黑，1=白） */
export function relativeLuminance({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG 对比度（1:1 ~ 21:1） */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** sRGB 空间按比例插值（ratio=0 取 base，1 取 other） */
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
  const lin = { r: srgbToLinear(rgb.r), g: srgbToLinear(rgb.g), b: srgbToLinear(rgb.b) };
  const { L, a, b2 } = linearSrgbToOklab(lin);
  return { l: L, c: Math.sqrt(a * a + b2 * b2), h: (Math.atan2(b2, a) * 180) / Math.PI };
}

export function oklchToRgb({ l, c, h }) {
  const hr = (h * Math.PI) / 180;
  const lin = oklabToLinearSrgb({ L: l, a: Math.cos(hr) * c, b2: Math.sin(hr) * c });
  return {
    r: linearToSrgb(lin.r) * 255,
    g: linearToSrgb(lin.g) * 255,
    b: linearToSrgb(lin.b) * 255,
  };
}

/**
 * text-on-fill：从候选墨色中选对比度最高的一把。
 * @param {string} fillHex 底色
 * @param {string[]} inkHexes 候选墨色
 * @returns {{color: string, ratio: number}}
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
 * 亮背景向暗推进、暗背景向亮推进；触及明度边界（0/1）即停止。
 * @returns {string} 调校后的 hex
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
