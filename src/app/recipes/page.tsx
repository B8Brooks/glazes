import Link from "next/link";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { asc, ilike } from "drizzle-orm";
import { SearchBox } from "@/components/SearchBox";

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Recipes</h1>
        <Link
          href="/recipes/new"
          className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + New recipe
        </Link>
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
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/recipes/${r.id}`}
                className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:border-stone-300 hover:shadow"
              >
                <span className="font-semibold text-stone-900">{r.name}</span>
                {r.notes && (
                  <span className="mt-0.5 block truncate text-sm text-stone-500">
                    {r.notes}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
