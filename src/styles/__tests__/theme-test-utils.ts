/**
 * 主题测试共享工具：解析主题 CSS 的 --token: value; 声明。
 * 供 theme-generate / theme-contrast 等门禁测试共用（不重复实现解析逻辑）。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const ROOT = join(__dirname, "..", "..", "..");
export const STYLES = join(ROOT, "src/styles");

/** 解析 CSS 文本中的全部 --token: value; 声明（不含 -- 前缀） */
export function parseDeclarations(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

/** 读取某主题生成物的全部 token 声明 */
export function readTheme(theme: string): Record<string, string> {
  return parseDeclarations(readFileSync(join(STYLES, "themes", `${theme}.css`), "utf8"));
}
