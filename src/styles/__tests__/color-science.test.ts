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
    const { hex, ratio, met } = tuneForContrast("#E84093", "#FFFFFF", 4.5);
    expect(met).toBe(true);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(parseHex(hex), parseHex("#FFFFFF"))).toBeGreaterThanOrEqual(4.5);
  });

  it("tuneForContrast 暗底推进同样达标且色相不变（色域裁切回归）", () => {
    const before = rgbToOklch(parseHex("#E84093"));
    const { hex, met } = tuneForContrast("#E84093", "#12121f", 4.5);
    expect(met).toBe(true);
    const after = rgbToOklch(parseHex(hex));
    expect(Math.abs(after.h - before.h)).toBeLessThan(2);
  });

  it("tuneForContrast 目标不可达时 met=false", () => {
    // 同色底推向极值仍远不够 21:1 —— 必须如实报告失败而非静默返回
    const { met } = tuneForContrast("#808080", "#808080", 21);
    expect(met).toBe(false);
  });

  it("tuneForContrast 保持色相（OKLCH h 不变）", () => {
    const before = rgbToOklch(parseHex("#E84093"));
    const after = rgbToOklch(parseHex(tuneForContrast("#E84093", "#FFFFFF", 4.5).hex));
    expect(Math.abs(after.h - before.h)).toBeLessThan(2);
  });

  it("mixWith 按比例插值", () => {
    expect(toHex(mixWith(parseHex("#000000"), parseHex("#ffffff"), 0.5))).toBe("#808080");
  });
});
