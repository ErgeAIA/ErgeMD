import { describe, expect, it } from "vitest";
import { countLines, lowerLevel, resolveAutoLevel } from "./autoConfig";
import { composeReaderConfig, PresetConfigs } from "../config/readerConfig";

describe("countLines", () => {
  it("counts newline separators", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("a")).toBe(1);
    expect(countLines("a\nb")).toBe(2);
    expect(countLines("a\nb\n")).toBe(3);
  });
});

describe("resolveAutoLevel", () => {
  it("prefers low on weak devices", () => {
    expect(resolveAutoLevel({ lines: 100, cores: 4, memoryGb: 16 })).toBe("low");
    expect(resolveAutoLevel({ lines: 100, cores: 16, memoryGb: 4 })).toBe("low");
  });

  it("prefers high on strong devices with ordinary documents", () => {
    expect(resolveAutoLevel({ lines: 5000, cores: 16, memoryGb: 16 })).toBe("high");
  });

  it("falls back to low for huge documents unless the device is strong", () => {
    expect(resolveAutoLevel({ lines: 40000, cores: 8, memoryGb: 8 })).toBe("low");
    expect(resolveAutoLevel({ lines: 40000, cores: 16, memoryGb: 16 })).toBe("high");
  });

  it("defaults to medium when device info is unknown", () => {
    expect(resolveAutoLevel({ lines: 3000 })).toBe("medium");
  });
});

describe("lowerLevel", () => {
  it("steps down and clamps at low", () => {
    expect(lowerLevel("high")).toBe("medium");
    expect(lowerLevel("medium")).toBe("low");
    expect(lowerLevel("low")).toBe("low");
  });
});

describe("composeReaderConfig", () => {
  it("keeps visual params identical across levels and only swaps performance", () => {
    const low = composeReaderConfig("low");
    const high = composeReaderConfig("high");
    expect(low.toc).toEqual(high.toc);
    expect(low.virtualSizes).toEqual(high.virtualSizes);
    expect(low.interaction).toEqual(high.interaction);
    expect(low.performance).toEqual(PresetConfigs.low.performance);
    expect(high.performance).toEqual(PresetConfigs.high.performance);
  });
});