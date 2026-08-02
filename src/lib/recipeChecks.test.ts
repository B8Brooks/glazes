import { describe, it, expect } from "vitest";
import { findBaseSplit } from "./recipeChecks";

// The real MINT GREEN card: base sums to exactly 100, then three additions.
const MINT_GREEN_BASE = [27.5, 12.2, 13.7, 14.1, 10.0, 2.7, 19.8];
const MINT_GREEN_ADDITIONS = [5, 3, 0.39];

describe("findBaseSplit", () => {
  it("returns the full length for a plain 100% card", () => {
    expect(findBaseSplit(MINT_GREEN_BASE)).toBe(7);
  });

  it("finds the TOTAL line position when additions follow the base", () => {
    expect(findBaseSplit([...MINT_GREEN_BASE, ...MINT_GREEN_ADDITIONS])).toBe(7);
  });

  it("survives floating-point accumulation", () => {
    // Strontium Crystal Magic - Cool: these floats sum to 99.99999999999999.
    const scm = [46, 17.2, 12.6, 15, 4.6, 4.6];
    expect(scm.reduce((a, b) => a + b, 0)).not.toBe(100);
    expect(findBaseSplit(scm)).toBe(6);
    expect(findBaseSplit([...scm, 12, 2])).toBe(6); // with additions after
  });

  it("returns null for a mis-transcribed card that never reaches 100", () => {
    expect(findBaseSplit([27.5, 12.2, 13.7, 14.1, 10.0, 2.7, 18.0])).toBeNull();
  });

  it("returns null when the total overshoots without touching 100", () => {
    expect(findBaseSplit([60, 50])).toBeNull();
  });

  it("handles an empty recipe", () => {
    expect(findBaseSplit([])).toBeNull();
  });
});
