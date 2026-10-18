/**
 * generate-themes.js 的 TypeScript 声明。
 * 供 vitest 一致性门禁 import 时获得类型（tsc 会检入测试文件）。
 */
import type { ThemeSource } from "./sources/theme-source.js";

export declare function buildTokens(src: ThemeSource): Record<string, string>;
export declare function render(
  name: string,
  tokens: Record<string, string>,
  eol: string,
): string;
