import Link from "next/link";
import { db } from "@/db";
import { glazes, recipes } from "@/db/schema";
import { asc, eq, ilike } from "drizzle-orm";
import { formatVolume, type VolumeUnit } from "@/lib/units";
import { statusBadgeClass } from "@/lib/glazeStatus";
import { deleteGlaze } from "@/lib/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SearchBox } from "@/components/SearchBox";
import { QuickAdjustForm } from "@/components/QuickAdjustForm";

export const dynamic = "force-dynamic";

export default async function GlazesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const { q, error } = await searchParams;
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

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span>{error}</span>
          <Link
            href="/glazes"
            className="shrink-0 font-medium text-amber-900 hover:underline"
          >
            Dismiss
          </Link>
        </div>
      )}

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
                  <QuickAdjustForm glazeId={g.id} defaultUnit={unit} />

                  <div className="ml-auto flex items-center gap-1">
                    <Link
                      href={`/glazes/${g.id}/edit`}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                    >
                      Edit
                    </Link>
                    <form action={deleteGlaze}>
                      <input type="hidden" name="id" value={g.id} />
                      <ConfirmButton
                        message={`Delete "${g.name}"? This can't be undone.`}
                        className="rounded-lg px-3 py-2 text-sm text-stone-400 hover:bg-red-50 hover:text-red-600"
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
