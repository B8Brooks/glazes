import Link from "next/link";
import { db } from "@/db";
import { glazes, recipes } from "@/db/schema";
import { asc, eq, ilike } from "drizzle-orm";
import { formatVolume, VOLUME_UNITS, type VolumeUnit } from "@/lib/units";
import { statusBadgeClass } from "@/lib/glazeStatus";
import { adjustGlazeVolume, deleteGlaze } from "@/lib/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SearchBox } from "@/components/SearchBox";

export const dynamic = "force-dynamic";

export default async function GlazesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = db
    .select({
      id: glazes.id,
      name: glazes.name,
      volumeMl: glazes.volumeMl,
      displayVolumeUnit: glazes.displayVolumeUnit,
      status: glazes.status,
      notes: glazes.notes,
      recipeId: glazes.recipeId,
      recipeName: recipes.name,
    })
    .from(glazes)
    .leftJoin(recipes, eq(glazes.recipeId, recipes.id))
    .orderBy(asc(glazes.name));
  const rows = q?.trim()
    ? await query.where(ilike(glazes.name, `%${q.trim()}%`))
    : await query;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Mixed glazes</h1>
        <Link
          href="/glazes/new"
          className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + Add glaze
        </Link>
      </div>

      <SearchBox placeholder="Find a glaze…" />

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
          {q?.trim()
            ? `No glazes match "${q.trim()}".`
            : "No mixed glazes yet. Add a bucket you have on hand, or it will appear here when you record the volume made while mixing a batch."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((g) => {
            const unit = g.displayVolumeUnit as VolumeUnit;
            return (
              <li
                key={g.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/glazes/${g.id}`}
                      className="font-semibold text-stone-900 hover:underline"
                    >
                      {g.name}
                    </Link>
                    <div className="text-sm text-stone-600">
                      {formatVolume(g.volumeMl, unit)} on hand
                    </div>
                    {g.recipeName && (
                      <Link
                        href={`/recipes/${g.recipeId}`}
                        className="text-xs text-stone-500 hover:underline"
                      >
                        Recipe: {g.recipeName}
                      </Link>
                    )}
                    {g.notes && (
                      <div className="text-xs text-stone-500">{g.notes}</div>
                    )}
                  </div>
                  {g.status && (
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                        g.status
                      )}`}
                    >
                      {g.status}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
                  <form
                    action={adjustGlazeVolume}
                    className="flex items-end gap-2"
                  >
                    <input type="hidden" name="id" value={g.id} />
                    <label className="text-xs text-stone-500">
                      Amount
                      <input
                        name="amount"
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        className="mt-1 block w-20 rounded-lg border border-stone-300 px-2 py-2 text-sm"
                      />
                    </label>
                    <select
                      name="unit"
                      defaultValue={unit}
                      className="rounded-lg border border-stone-300 px-2 py-2 text-sm"
                    >
                      {VOLUME_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      name="direction"
                      value="use"
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                    >
                      Use
                    </button>
                    <button
                      type="submit"
                      name="direction"
                      value="add"
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                    >
                      Add
                    </button>
                  </form>

                  <form action={deleteGlaze} className="ml-auto">
                    <input type="hidden" name="id" value={g.id} />
                    <ConfirmButton
                      message={`Delete "${g.name}"? This can't be undone.`}
                      className="rounded-lg px-3 py-2 text-sm text-stone-400 hover:bg-red-50 hover:text-red-600"
                    >
                      Delete
                    </ConfirmButton>
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
