import { describe, it, expect } from "vitest";
import { readTheme } from "./theme-test-utils";
import { parseHex, contrastRatio } from "../../../scripts/theme/color-science.js";

const BODY = 4.5; // 标题/图表文字门槛
const PROSE = 7; // 正文墨色门槛

/** 已迁移到契约的主题（随阶段 2/3 推进逐套加入，迁一套验一套） */
const MIGRATED_THEMES = [
  "light",
  "dark",
  "cyberpunk",
  "neon-cyberpunk",
  "solar-flare",
  "desert-sunset",
  "aurora",
  "cherry-blossom",
  "falcon",
  "forest",
  "monochrome",
  "ocean",
  "tokyo-night",
  "solarized-light",
];

describe("主题对比度门禁", () => {
  for (const theme of MIGRATED_THEMES) {
    const t = readTheme(theme);

    it(`${theme}: 正文墨色 ≥ ${PROSE}:1`, () => {
      expect(
        contrastRatio(parseHex(t["text-primary"]), parseHex(t["bg-reader"])),
        `${theme}.text-primary=${t["text-primary"]} × bg-reader=${t["bg-reader"]}`,
      ).toBeGreaterThanOrEqual(PROSE);
    });

    it(`${theme}: 次级文字 ≥ ${BODY}:1`, () => {
      expect(
        contrastRatio(parseHex(t["text-secondary"]), parseHex(t["bg-reader"])),
        `${theme}.text-secondary=${t["text-secondary"]} × bg-reader=${t["bg-reader"]}`,
      ).toBeGreaterThanOrEqual(BODY);
    });

    it(`${theme}: 六级标题全部 ≥ ${BODY}:1`, () => {
      for (let i = 1; i <= 6; i++) {
        const name = `h${i}-color`;
        expect(t[name], `${theme} 缺 ${name}`).toBeDefined();
        expect(
          contrastRatio(parseHex(t[name]), parseHex(t["bg-reader"])),
          `${theme}.${name}=${t[name]}`,
        ).toBeGreaterThanOrEqual(BODY);
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
          `${theme}: fill-${i}(${fill}) × text(${text})`,
        ).toBeGreaterThanOrEqual(BODY);
      }
    });

    // 思维导图层级色板（源色表定义 mindmapHues 的主题才生成这些 token）：
    // branch-0..4 = root/L2、L3、L4、L5、L6 的实底；center-text 服务 root 与
    // branch-0，l1..l4-text 依次服务 branch-1..4
    it(`${theme}: mindmap 层级色板 × 文字 ≥ ${BODY}:1`, () => {
      const fills = [0, 1, 2, 3, 4].map((i) => t[`mermaid-mindmap-branch-${i}`]);
      if (!fills[0]) return; // 未定义 mindmap 色板的主题（沿用 chart-fill 带）跳过
      const texts = [
        t["mermaid-mindmap-center-text"],
        t["mermaid-mindmap-l1-text"],
        t["mermaid-mindmap-l2-text"],
        t["mermaid-mindmap-l3-text"],
        t["mermaid-mindmap-l4-text"],
      ];
      fills.forEach((fill, i) => {
        expect(texts[i], `${theme} 缺 mindmap 文字槽 ${i}`).toBeDefined();
        expect(
          contrastRatio(parseHex(texts[i]), parseHex(fill)),
          `${theme}: mindmap branch-${i}(${fill}) × text(${texts[i]})`,
        ).toBeGreaterThanOrEqual(BODY);
      });
    });

    it(`${theme}: 有序列表序号（功能位） ≥ ${BODY}:1`, () => {
      expect(
        contrastRatio(parseHex(t["list-number"]), parseHex(t["bg-reader"])),
        `${theme}.list-number=${t["list-number"]} × bg-reader=${t["bg-reader"]}`,
      ).toBeGreaterThanOrEqual(BODY);
    });

    it(`${theme}: 代码文字 ≥ ${BODY}:1`, () => {
      expect(
        contrastRatio(parseHex(t["code-text"]), parseHex(t["bg-code"])),
        `${theme}.code-text=${t["code-text"]} × bg-code=${t["bg-code"]}`,
      ).toBeGreaterThanOrEqual(BODY);
    });
  }
});
