/**
 * color-science.js 的 TypeScript 声明。
 * 供 src 下的 vitest 门禁测试 import 时获得类型（tsc 会检入测试文件）。
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface OKLCH {
  /** 明度 0~1 */
  l: number;
  /** 彩度 */
  c: number;
  /** 色相角（度） */
  h: number;
}

export function parseHex(hex: string): RGB;
export function toHex(rgb: RGB): string;
export function relativeLuminance(rgb: RGB): number;
export function contrastRatio(a: RGB, b: RGB): number;
export function mixWith(base: RGB, other: RGB, ratio: number): RGB;
export function rgbToOklch(rgb: RGB): OKLCH;
export function oklchToRgb(oklch: OKLCH): RGB;
export function pickTextColor(fillHex: string, inkHexes: string[]): { color: string; ratio: number };
export function tuneForContrast(colorHex: string, bgHex: string, target?: number): string;
