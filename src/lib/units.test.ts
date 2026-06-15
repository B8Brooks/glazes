import { describe, it, expect } from "vitest";
import {
  lbToG,
  gToLb,
  kgToG,
  gToKg,
  toGrams,
  fromGrams,
  formatWeight,
  gramsForBatch,
  GRAMS_PER_LB,
  toMl,
  fromMl,
  formatVolume,
  ML_PER_QUART,
} from "./units";

describe("pound <-> gram conversion", () => {
  it("converts a 50 lb bag to grams", () => {
    expect(lbToG(50)).toBeCloseTo(22679.6185, 3);
  });

  it("round-trips lb -> g -> lb", () => {
    expect(gToLb(lbToG(50))).toBeCloseTo(50, 10);
  });

  it("uses the standard pound definition", () => {
    expect(GRAMS_PER_LB).toBe(453.59237);
  });
});

describe("kilogram <-> gram conversion", () => {
  it("round-trips kg -> g -> kg", () => {
    expect(gToKg(kgToG(2.5))).toBeCloseTo(2.5, 10);
  });
});

describe("toGrams / fromGrams dispatch by unit", () => {
  it("treats grams as identity", () => {
    expect(toGrams(123, "g")).toBe(123);
    expect(fromGrams(123, "g")).toBe(123);
  });

  it("round-trips through every display unit", () => {
    for (const unit of ["lb", "kg", "g"] as const) {
      expect(fromGrams(toGrams(7.5, unit), unit)).toBeCloseTo(7.5, 10);
    }
  });
});

describe("formatWeight", () => {
  it("shows pounds with trimmed trailing zeros", () => {
    expect(formatWeight(lbToG(50), "lb")).toBe("50 lb");
    expect(formatWeight(lbToG(12.5), "lb")).toBe("12.5 lb");
  });

  it("shows whole grams without decimals", () => {
    expect(formatWeight(1000, "g")).toBe("1000 g");
  });
});

describe("volume conversion", () => {
  it("converts a quart to mL", () => {
    expect(toMl(1, "quart")).toBeCloseTo(946.353, 3);
  });

  it("there are 4 quarts in a gallon", () => {
    expect(toMl(1, "gallon")).toBeCloseTo(toMl(4, "quart"), 2);
  });

  it("round-trips through every volume unit", () => {
    for (const unit of ["cup", "pint", "quart", "gallon"] as const) {
      expect(fromMl(toMl(2.5, unit), unit)).toBeCloseTo(2.5, 10);
    }
  });
});

describe("formatVolume", () => {
  it("trims trailing zeros and pluralizes", () => {
    expect(formatVolume(ML_PER_QUART * 2.5, "quart")).toBe("2.5 quarts");
    expect(formatVolume(ML_PER_QUART, "quart")).toBe("1 quart");
  });
});

describe("gramsForBatch", () => {
  it("scales a percentage line by batch size (% * 10 for a 1000g batch)", () => {
    expect(gramsForBatch(40, 1000)).toBe(400);
    expect(gramsForBatch(8.5, 1000)).toBe(85);
  });

  it("handles additions over 100% the same way", () => {
    expect(gramsForBatch(105, 1000)).toBe(1050);
  });
});
