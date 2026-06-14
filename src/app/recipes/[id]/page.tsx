import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  batches,
  ingredients,
  recipeIngredients,
  recipes,
} from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { MixBatchPanel } from "@/components/MixBatchPanel";
import { deleteRecipe, undoBatch } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipeId = Number(id);

  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
  });
  if (!recipe) notFound();

  const lines = await db
    .select({
      name: ingredients.name,
      percentage: recipeIngredients.percentage,
      availableGrams: ingredients.quantityGrams,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, recipeId))
    .orderBy(asc(recipeIngredients.sortOrder));

  const history = await db
    .select()
    .from(batches)
    .where(eq(batches.recipeId, recipeId))
    .orderBy(desc(batches.mixedAt))
    .limit(10);

  const total = lines.reduce((s, l) => s + l.percentage, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{recipe.name}</h1>
          {recipe.notes && (
            <p className="mt-1 text-stone-600">{recipe.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/recipes/${recipe.id}/edit`}
            className="rounded-lg border border-stone-300 px-3 py-2 font-medium text-stone-700 hover:bg-stone-100"
          >
            Edit
          </Link>
          <form action={deleteRecipe}>
            <input type="hidden" name="id" value={recipe.id} />
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Recipe</h2>
          <span className="text-sm text-stone-500">Total: {total}%</span>
        </div>
        {lines.length === 0 ? (
          <p className="text-stone-500">No ingredients yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {lines.map((l) => (
              <li
                key={l.name}
                className="flex justify-between py-1.5 text-stone-800"
              >
                <span>{l.name}</span>
                <span className="tabular-nums">{l.percentage}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lines.length > 0 && (
        <MixBatchPanel recipeId={recipe.id} lines={lines} />
      )}

      {history.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">
            Recent batches
          </h2>
          <ul className="mt-2 divide-y divide-stone-100">
            {history.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-stone-700">
                  {b.batchGrams} g batch
                  <span className="text-stone-400">
                    {" "}
                    · {new Date(b.mixedAt).toLocaleDateString()}
                  </span>
                </span>
                <form action={undoBatch}>
                  <input type="hidden" name="batchId" value={b.id} />
                  <input type="hidden" name="recipeId" value={recipe.id} />
                  <button
                    type="submit"
                    className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                  >
                    Undo
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
