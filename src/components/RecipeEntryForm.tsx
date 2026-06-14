"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRecipe, type RecipeLineInput } from "@/lib/actions";

type Row = { name: string; percentage: string };

const inputClass =
  "rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-stone-500 focus:outline-none";

function blankRow(): Row {
  return { name: "", percentage: "" };
}

export function RecipeEntryForm({
  recipe,
  knownIngredients,
}: {
  recipe?: {
    id: number;
    name: string;
    notes: string | null;
    lines: { name: string; percentage: number }[];
  };
  knownIngredients: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(recipe?.name ?? "");
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [rows, setRows] = useState<Row[]>(
    recipe && recipe.lines.length
      ? recipe.lines.map((l) => ({
          name: l.name,
          percentage: String(l.percentage),
        }))
      : [blankRow()]
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Keep one trailing blank row so there's always somewhere to type.
  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === index ? { ...r, ...patch } : r));
      const last = next[next.length - 1];
      if (last.name.trim() || last.percentage.trim()) next.push(blankRow());
      return next;
    });
  }

  function removeRow(index: number) {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [blankRow()];
    });
  }

  const total = rows.reduce((sum, r) => {
    const p = parseFloat(r.percentage);
    return sum + (Number.isFinite(p) ? p : 0);
  }, 0);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const lines: RecipeLineInput[] = rows
      .map((r) => ({ name: r.name.trim(), percentage: parseFloat(r.percentage) }))
      .filter((r) => r.name.length > 0 && Number.isFinite(r.percentage));

    if (!name.trim()) return setError("Please give the glaze a name.");
    if (!lines.length) return setError("Add at least one ingredient.");

    startTransition(async () => {
      try {
        await saveRecipe({ id: recipe?.id, name, notes, lines });
      } catch (err) {
        // redirect() throws a special NEXT_REDIRECT error on success — let it pass.
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
          throw err;
        }
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <datalist id="known-ingredients">
        {knownIngredients.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">Glaze name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Shaner's Clear"
          className={`mt-1 w-full ${inputClass}`}
        />
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-stone-700">
            Ingredients
          </span>
          <span className="text-sm text-stone-500">Total: {total}%</span>
        </div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={row.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                list="known-ingredients"
                placeholder="Ingredient"
                className={`flex-1 ${inputClass}`}
              />
              <input
                value={row.percentage}
                onChange={(e) => updateRow(i, { percentage: e.target.value })}
                type="number"
                step="any"
                min="0"
                placeholder="%"
                className={`w-20 ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Remove ingredient"
                className="rounded-lg px-2 py-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Type any name — new materials are added to your inventory
          automatically.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">
          Notes (optional)
        </span>
        <textarea
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Cone, application, results…"
          className={`mt-1 w-full ${inputClass}`}
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save recipe"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-stone-600 hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
