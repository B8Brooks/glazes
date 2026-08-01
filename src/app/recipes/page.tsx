import Link from "next/link";
import { db } from "@/db";
import { batches, glazes, recipeIngredients, recipes } from "@/db/schema";
import { asc, ilike, isNotNull, sql } from "drizzle-orm";
import { SearchBox } from "@/components/SearchBox";
import { formatVolume, roundTo, type VolumeUnit } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = db.select().from(recipes).orderBy(asc(recipes.name));
  const rows = q?.trim()
    ? await query.where(ilike(recipes.name, `%${q.trim()}%`))
    : await query;

  // Aggregates for the sublines, one query each (no per-recipe queries).
  const lineStats = await db
    .select({
      recipeId: recipeIngredients.recipeId,
      count: sql<number>`count(*)::int`,
      total: sql<number>`sum(${recipeIngredients.percentage})`,
    })
    .from(recipeIngredients)
    .groupBy(recipeIngredients.recipeId);
  const statsById = new Map(lineStats.map((s) => [s.recipeId, s]));

  const lastMixed = await db
    .select({
      recipeId: batches.recipeId,
      last: sql<string>`max(${batches.mixedAt})`,
    })
    .from(batches)
    .groupBy(batches.recipeId);
  const lastById = new Map(lastMixed.map((l) => [l.recipeId, l.last]));

  const buckets = await db
    .select({
      recipeId: glazes.recipeId,
      volumeMl: glazes.volumeMl,
      displayVolumeUnit: glazes.displayVolumeUnit,
    })
    .from(glazes)
    .where(isNotNull(glazes.recipeId))
    .orderBy(asc(glazes.id));
  const bucketById = new Map<number, (typeof buckets)[number]>();
  for (const b of buckets) {
    if (b.recipeId != null && !bucketById.has(b.recipeId)) {
      bucketById.set(b.recipeId, b);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-stone-900">Recipes</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/recipes/import"
            className="text-sm text-stone-600 hover:underline"
          >
            Import from a spreadsheet
          </Link>
          <Link
            href="/recipes/new"
            className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            + New recipe
          </Link>
        </div>
      </div>

      <SearchBox placeholder="Find a recipe…" />

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
          {q?.trim()
            ? `No recipes match "${q.trim()}".`
            : "No recipes yet. Add your first glaze recipe."}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const stats = statsById.get(r.id);
            const last = lastById.get(r.id);
            const bucket = bucketById.get(r.id);
            const parts = [
              stats
                ? `${stats.count} ${stats.count === 1 ? "ingredient" : "ingredients"} · ${roundTo(stats.total, 1)}%`
                : "no ingredients yet",
              last
                ? `last mixed ${new Date(last).toLocaleDateString()}`
                : null,
              bucket
                ? `${formatVolume(
                    bucket.volumeMl,
                    bucket.displayVolumeUnit as VolumeUnit
                  )} in bucket`
                : null,
            ].filter(Boolean);
            return (
              <li key={r.id}>
                <Link
                  href={`/recipes/${r.id}`}
                  className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:border-stone-300 hover:shadow"
                >
                  <span className="font-semibold text-stone-900">{r.name}</span>
                  <span className="mt-0.5 block text-sm text-stone-500">
                    {parts.join(" · ")}
                  </span>
                  {r.notes && (
                    <span className="mt-0.5 block truncate text-sm text-stone-400">
                      {r.notes}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
