// Weight conversion helpers.
//
// Design rule for the whole app: every weight is stored canonically in GRAMS.
// Pounds and kilograms are purely an input/display concern. This keeps batch
// math and inventory deduction exact and avoids repeated rounding errors.

export const GRAMS_PER_LB = 453.59237;
export const GRAMS_PER_KG = 1000;

export type DisplayUnit = "lb" | "kg" | "g";

export const DISPLAY_UNITS: { value: DisplayUnit; label: string }[] = [
  { value: "lb", label: "pounds (lb)" },
  { value: "kg", label: "kilograms (kg)" },
  { value: "g", label: "grams (g)" },
];

export function lbToG(lb: number): number {
  return lb * GRAMS_PER_LB;
}

export function gToLb(g: number): number {
  return g / GRAMS_PER_LB;
}

export function kgToG(kg: number): number {
  return kg * GRAMS_PER_KG;
}

export function gToKg(g: number): number {
  return g / GRAMS_PER_KG;
}

/** Convert a value entered in `unit` into canonical grams. */
export function toGrams(value: number, unit: DisplayUnit): number {
  switch (unit) {
    case "lb":
      return lbToG(value);
    case "kg":
      return kgToG(value);
    case "g":
      return value;
  }
}

/** Convert canonical grams into the given display unit. */
export function fromGrams(grams: number, unit: DisplayUnit): number {
  switch (unit) {
    case "lb":
      return gToLb(grams);
    case "kg":
      return gToKg(grams);
    case "g":
      return grams;
  }
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * Format a canonical gram amount for display in the chosen unit, e.g.
 * formatWeight(22679.6, "lb") -> "50 lb". Trailing zeros are trimmed.
 */
export function formatWeight(grams: number, unit: DisplayUnit): string {
  const decimals = unit === "g" ? 0 : 2;
  const value = round(fromGrams(grams, unit), decimals);
  // Trim insignificant trailing zeros after the decimal point only
  // (e.g. 50.00 -> 50, 12.50 -> 12.5), never digits of a whole number.
  let text = value.toFixed(decimals);
  if (text.includes(".")) {
    text = text.replace(/\.?0+$/, "");
  }
  return `${text} ${unit}`;
}

// ---------------------------------------------------------------------------
// Volume — for finished/mixed glaze buckets (cups, quarts, gallons). Same
// approach as weight: store canonically in milliliters, display in any unit.
// ---------------------------------------------------------------------------

export const ML_PER_CUP = 236.588;
export const ML_PER_PINT = 473.176;
export const ML_PER_QUART = 946.353;
export const ML_PER_GALLON = 3785.41;

export type VolumeUnit = "cup" | "pint" | "quart" | "gallon";

export const VOLUME_UNITS: { value: VolumeUnit; label: string }[] = [
  { value: "cup", label: "cups" },
  { value: "pint", label: "pints" },
  { value: "quart", label: "quarts" },
  { value: "gallon", label: "gallons" },
];

const ML_PER: Record<VolumeUnit, number> = {
  cup: ML_PER_CUP,
  pint: ML_PER_PINT,
  quart: ML_PER_QUART,
  gallon: ML_PER_GALLON,
};

/** Convert a value entered in `unit` into canonical milliliters. */
export function toMl(value: number, unit: VolumeUnit): number {
  return value * ML_PER[unit];
}

/** Convert canonical milliliters into the given volume unit. */
export function fromMl(ml: number, unit: VolumeUnit): number {
  return ml / ML_PER[unit];
}

/**
 * Format a canonical mL amount in the chosen unit, e.g.
 * formatVolume(2839, "quart") -> "3 quart". Trailing zeros trimmed.
 */
export function formatVolume(ml: number, unit: VolumeUnit): string {
  const value = round(fromMl(ml, unit), 2);
  let text = value.toFixed(2);
  if (text.includes(".")) {
    text = text.replace(/\.?0+$/, "");
  }
  const label = value === 1 ? unit : `${unit}s`;
  return `${text} ${label}`;
}

/**
 * Grams needed for one ingredient in a batch. Recipes are stored as
 * percentages of a 100-unit base, so a `batchGrams` of 1000 means the base
 * weighs 1000 g and each line is `percentage * 10` grams. Additions that push
 * the total over 100% scale the same way.
 */
export function gramsForBatch(percentage: number, batchGrams: number): number {
  return (percentage / 100) * batchGrams;
}
