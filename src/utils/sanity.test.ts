import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("runs the test runner", () => {
    expect(1 + 1).toBe(2);
  });

  it("supports async", async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
