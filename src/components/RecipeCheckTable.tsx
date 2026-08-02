import { gramsForBatch, roundTo } from "@/lib/units";
import { findBaseSplit } from "@/lib/recipeChecks";

const BATCH_SIZES = [2000, 4000, 10000];

function gramsText(percentage: number, batch: number): string {
  const g = roundTo(gramsForBatch(percentage, batch), 1);
  return Number.isInteger(g) ? String(g) : g.toFixed(1);
}

// The same table Sheila's printed cards show — percentages next to the grams
// for common batch sizes — so she can hold the card and compare numbers to
// verify a typed or imported recipe line by line.
export function RecipeCheckTable({
  lines,
}: {
  lines: { name: string; percentage: number }[];
}) {
  if (!lines.length) return null;

  const split = findBaseSplit(lines.map((l) => l.percentage));
  const total = roundTo(
    lines.reduce((s, l) => s + l.percentage, 0),
    2
  );
  const base = split !== null ? lines.slice(0, split) : lines;
  const additions = split !== null ? lines.slice(split) : [];

  const row = (l: { name: string; percentage: number }, key: number) => (
    <tr key={key} className="border-t border-stone-100">
      <td className="py-1.5 pr-2 text-stone-800">{l.name}</td>
      <td className="py-1.5 text-right tabular-nums text-stone-800">
        {l.percentage}
      </td>
      {BATCH_SIZES.map((b) => (
        <td key={b} className="py-1.5 text-right tabular-nums text-stone-600">
          {gramsText(l.percentage, b)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">
        Check against your card
      </h2>

      {split === null ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠ These ingredients total {total}%. Cards normally total 100% before
          additions — compare each line against the card to find what&apos;s
          off.
        </p>
      ) : additions.length ? (
        <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ The first {base.length} ingredients total 100%, with{" "}
          {additions.length} {additions.length === 1 ? "addition" : "additions"}{" "}
          below the line — matches the card layout.
        </p>
      ) : (
        <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ Adds up to 100% — matches a standard card.
        </p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-105 text-sm">
          <thead>
            <tr className="text-left text-stone-500">
              <th className="py-1 pr-2 font-medium">Ingredient</th>
              <th className="py-1 text-right font-medium">%</th>
              {BATCH_SIZES.map((b) => (
                <th key={b} className="py-1 text-right font-medium">
                  {b.toLocaleString()} g
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {base.map(row)}
            {split !== null && (
              <tr className="border-t-2 border-stone-300 font-semibold text-stone-900">
                <td className="py-1.5 pr-2">TOTAL</td>
                <td className="py-1.5 text-right tabular-nums">100</td>
                {BATCH_SIZES.map((b) => (
                  <td key={b} className="py-1.5 text-right tabular-nums">
                    {b.toLocaleString()}
                  </td>
                ))}
              </tr>
            )}
            {additions.map((l, i) => row(l, base.length + i))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Same layout as your printed cards — grams for a 2,000 g, 4,000 g, and
        10,000 g batch. Compare a few numbers to be sure the recipe went in
        right.
      </p>
    </div>
  );
}
