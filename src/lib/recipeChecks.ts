// Helpers for the "check against your card" table. Sheila's printed cards
// list base ingredients summing to exactly 100%, then additions (opacifiers,
// bentonite, colorants) below the TOTAL line. Recipe lines are stored in
// transcription order, so the base/additions boundary can be recovered by
// finding the prefix that sums to 100.

/**
 * Return the number of leading lines whose percentages sum to 100 (within
 * `tolerance`), or null if no such prefix exists. When every line together
 * sums to 100 the whole list is the base (no additions).
 */
export function findBaseSplit(
  percentages: number[],
  tolerance = 0.1
): number | null {
  let sum = 0;
  let split: number | null = null;
  for (let i = 0; i < percentages.length; i++) {
    sum += percentages[i];
    if (Math.abs(sum - 100) <= tolerance) {
      // Prefer the longest matching prefix (a later exact match wins, so a
      // full list totalling 100 reports "no additions").
      split = i + 1;
    }
  }
  return split;
}
