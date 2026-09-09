import { describe, expect, it } from "vitest";
import { formatReleaseDate, parseReleaseNotes } from "./releaseNotes";

describe("parseReleaseNotes", () => {
  it("提取分组条目标题，丢弃描述与图片", () => {
    const body = [
      "### 安全",
      "",
      "- **修复 XSS 攻击链**：文档中的原始 HTML 现在经过消毒，详见安全公告",
      "- **收窄插件权限面**：移除 fs 插件",
      "",
      "### 修复",
      "",
      "- **工作区不再崩溃**：符号链接循环防护",
      "![截图](https://example.com/a.png)",
    ].join("\n");
    expect(parseReleaseNotes(body)).toEqual([
      { category: "安全", items: ["修复 XSS 攻击链", "收窄插件权限面"] },
      { category: "修复", items: ["工作区不再崩溃"] },
    ]);
  });

  it("无粗体的条目剥语法取全文并截断", () => {
    const body = "### 新增\n- 支持 `mermaid` 渲染与 [链接](https://x.com) 混排，这是一段非常长的描述超过八十字符时应当被截断处理掉只保留前面一部分内容避免卡片被撑爆，所以这一句继续凑长度凑到足够长为止呀呀呀呀呀呀呀呀";
    const groups = parseReleaseNotes(body);
    expect(groups[0].items[0]).toContain("支持 mermaid 渲染与 链接 混排");
    expect(groups[0].items[0].endsWith("…")).toBe(true);
  });

  it("空 body 与无结构 body 返回空数组", () => {
    expect(parseReleaseNotes("")).toEqual([]);
    expect(parseReleaseNotes("只有一段普通文字没有分组")).toEqual([]);
  });
});

describe("formatReleaseDate", () => {
  it("ISO 8601 取日期部分", () => {
    expect(formatReleaseDate("2026-09-10T08:00:00Z")).toBe("2026-09-10");
  });
  it("无效输入返回空串", () => {
    expect(formatReleaseDate("")).toBe("");
    expect(formatReleaseDate("not-a-date")).toBe("");
  });
});
