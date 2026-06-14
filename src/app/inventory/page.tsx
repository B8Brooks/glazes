import Link from "next/link";
import { db } from "@/db";
import { ingredients } from "@/db/schema";
import { asc } from "drizzle-orm";
import { formatWeight, type DisplayUnit, DISPLAY_UNITS } from "@/lib/units";
import { addStock, deleteMaterial } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const rows = await db
    .select()
    .from(ingredients)
    .orderBy(asc(ingredients.name));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Inventory</h1>
        <Link
          href="/inventory/new"
          className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + Add material
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
          No materials yet. Add your first one, or it will appear here
          automatically when you use it in a recipe.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => {
            const unit = m.displayUnit as DisplayUnit;
            const low =
              m.reorderThresholdGrams != null &&
              m.quantityGrams <= m.reorderThresholdGrams;
            return (
              <li
                key={m.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/inventory/${m.id}`}
                      className="font-semibold text-stone-900 hover:underline"
                    >
                      {m.name}
                    </Link>
                    <div className="text-sm text-stone-600">
                      {formatWeight(m.quantityGrams, unit)} on hand
                      {unit !== "g" && (
                        <span className="text-stone-400">
                          {" "}
                          ({Math.round(m.quantityGrams)} g)
                        </span>
                      )}
                    </div>
                    {m.supplier && (
                      <div className="text-xs text-stone-500">
                        Supplier: {m.supplier}
                      </div>
                    )}
                  </div>
                  {low && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                      Low — reorder
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
                  <form action={addStock} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <label className="text-xs text-stone-500">
                      Received more
                      <input
                        name="amount"
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        className="mt-1 block w-24 rounded-lg border border-stone-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <select
                      name="unit"
                      defaultValue={unit}
                      className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                    >
                      {DISPLAY_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.value}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg border border-stone-300 px-3 py-1 text-sm font-medium text-stone-700 hover:bg-stone-100"
                    >
                      Add
                    </button>
                  </form>

                  <form action={deleteMaterial} className="ml-auto">
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className="rounded-lg px-2 py-1 text-sm text-stone-400 hover:bg-red-50 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
