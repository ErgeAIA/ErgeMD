import { describe, it, expect } from "vitest";
import light from "../../../scripts/theme/sources/light.js";
import dark from "../../../scripts/theme/sources/dark.js";
import cyberpunk from "../../../scripts/theme/sources/cyberpunk.js";
import neonCyberpunk from "../../../scripts/theme/sources/neon-cyberpunk.js";
import solarFlare from "../../../scripts/theme/sources/solar-flare.js";
import desertSunset from "../../../scripts/theme/sources/desert-sunset.js";
import aurora from "../../../scripts/theme/sources/aurora.js";
import cherryBlossom from "../../../scripts/theme/sources/cherry-blossom.js";
import falcon from "../../../scripts/theme/sources/falcon.js";
import { parseHex, contrastRatio } from "../../../scripts/theme/color-science.js";

const walk = (obj: unknown, path = ""): [string, string][] =>
  Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    typeof v === "string" ? [[`${path}${k}`, v]] : walk(v, `${path}${k}.`),
  );

describe("theme sources", () => {
  for (const [name, src] of [
    ["light", light],
    ["dark", dark],
    ["cyberpunk", cyberpunk],
    ["neon-cyberpunk", neonCyberpunk],
    ["solar-flare", solarFlare],
    ["desert-sunset", desertSunset],
    ["aurora", aurora],
    ["cherry-blossom", cherryBlossom],
    ["falcon", falcon],
  ] as const) {
    it(`${name}: 所有字符串值非空，# 开头的值均为合法 hex`, () => {
      for (const [key, value] of walk(src)) {
        expect(value.trim(), `${name}.${key} 为空`).not.toBe("");
        if (value.trim().startsWith("#")) {
          expect(() => parseHex(value), `${name}.${key}=${value}`).not.toThrow();
        }
      }
    });

    it(`${name}: 结构完整（画布6/墨色4/标题6/类别6/序列6/代码8/中性7/备用6/填充带/滚动条3/品牌3）`, () => {
      expect(Object.keys(src.canvas)).toHaveLength(6);
      expect(Object.keys(src.ink)).toHaveLength(4);
      expect(src.headingHues).toHaveLength(6);
      expect(src.chartHues).toHaveLength(6);
      expect(src.seriesHues).toHaveLength(6);
      expect(Object.keys(src.code)).toHaveLength(8);
      expect(Object.keys(src.chartNeutral)).toHaveLength(7);
      expect(Object.keys(src.chartSpare)).toHaveLength(6);
      expect(Object.keys(src.scrollbar)).toHaveLength(3);
      expect(Object.keys(src.brand)).toHaveLength(3);
      expect(typeof src.fillBand.l).toBe("number");
      expect(typeof src.fillBand.c).toBe("number");
    });

    it(`${name}: name 与主题名一致，透传组非空`, () => {
      expect(src.name).toBe(name);
      expect(Object.keys(src.passthrough).length).toBeGreaterThan(0);
    });

    it(`${name}: brand-gradient 已收录（漏收将致 logo 渐变回落到 core 兜底）`, () => {
      expect(src.passthrough["brand-gradient"]).toMatch(/^linear-gradient\(/);
    });

    it(`${name}: callout 13 色齐全`, () => {
      const keys = Object.keys(src.passthrough).filter((k) =>
        k.startsWith("obsidian-callout-"),
      );
      expect(keys).toHaveLength(13);
    });
  }

  it("light/dark 的画布与墨色对比度满足契约（正文 ≥7:1）", () => {
    for (const src of [light, dark]) {
      const ratio = contrastRatio(parseHex(src.ink.primary), parseHex(src.canvas.reader));
      expect(ratio, `${src.name} 正文对比度`).toBeGreaterThanOrEqual(7);
    }
  });
});
