"use client";

import { useState, useTransition } from "react";
import { mixBatch } from "@/lib/actions";
import { gramsForBatch, VOLUME_UNITS, type VolumeUnit } from "@/lib/units";

type Line = {
  name: string;
  percentage: number;
  availableGrams: number;
};

export function MixBatchPanel({
  recipeId,
  lines,
}: {
  recipeId: number;
  lines: Line[];
}) {
  const [batchInput, setBatchInput] = useState("1000");
  const [volumeInput, setVolumeInput] = useState("");
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("quart");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const batchGrams = parseFloat(batchInput);
  const valid = Number.isFinite(batchGrams) && batchGrams > 0;

  const preview = lines.map((l) => {
    const needed = valid ? gramsForBatch(l.percentage, batchGrams) : 0;
    return { ...l, needed, short: needed > l.availableGrams };
  });
  const anyShort = preview.some((p) => p.short);

  function onMix() {
    setError(null);
    setDone(false);
    const producedVolume = parseFloat(volumeInput);
    startTransition(async () => {
      try {
        await mixBatch({
          recipeId,
          batchGrams,
          producedVolume: Number.isFinite(producedVolume)
            ? producedVolume
            : undefined,
          producedUnit: volumeUnit,
        });
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not mix batch.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Mix a batch</h2>
      <p className="mt-1 text-sm text-stone-600">
        Enter the batch size in grams. We&apos;ll work out how much of each
        material you need and subtract it from your inventory.
      </p>

      <label className="mt-3 flex items-center gap-2">
        <span className="text-sm font-medium text-stone-700">Batch size</span>
        <input
          value={batchInput}
          onChange={(e) => setBatchInput(e.target.value)}
          type="number"
          step="any"
          min="0"
          className="w-32 rounded-lg border border-stone-300 px-3 py-2"
        />
        <span className="text-sm text-stone-500">grams</span>
      </label>

      <label className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-stone-700">
          Volume made (optional)
        </span>
        <input
          value={volumeInput}
          onChange={(e) => setVolumeInput(e.target.value)}
          type="number"
          step="any"
          min="0"
          placeholder="e.g. 2"
          className="w-24 rounded-lg border border-stone-300 px-3 py-2"
        />
        <select
          value={volumeUnit}
          onChange={(e) => setVolumeUnit(e.target.value as VolumeUnit)}
          className="rounded-lg border border-stone-300 px-2 py-2"
        >
          {VOLUME_UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.value}
            </option>
          ))}
        </select>
        <span className="w-full text-xs text-stone-500 sm:w-auto">
          Adds to this glaze&apos;s bucket on the Glazes page.
        </span>
      </label>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-stone-500">
            <th className="py-1 font-medium">Material</th>
            <th className="py-1 text-right font-medium">Need</th>
            <th className="py-1 text-right font-medium">Have</th>
          </tr>
        </thead>
        <tbody>
          {preview.map((p) => (
            <tr key={p.name} className="border-t border-stone-100">
              <td className="py-1.5 text-stone-800">{p.name}</td>
              <td className="py-1.5 text-right tabular-nums text-stone-800">
                {p.needed.toFixed(1)} g
              </td>
              <td
                className={`py-1.5 text-right tabular-nums ${
                  p.short ? "font-semibold text-red-600" : "text-stone-500"
                }`}
              >
                {p.availableGrams.toFixed(0)} g
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {anyShort && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You may not have enough of the materials shown in red. You can still
          mix — just update your inventory if your stock is correct.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {done && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Batch mixed and inventory updated. See the history below to undo.
        </p>
      )}

      <button
        onClick={onMix}
        disabled={!valid || isPending}
        className="mt-4 rounded-lg bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {isPending ? "Mixing…" : "Mix this batch"}
      </button>
    </div>
  );
}
