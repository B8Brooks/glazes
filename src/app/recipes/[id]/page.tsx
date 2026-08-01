import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  batches,
  glazes,
  ingredients,
  recipeIngredients,
  recipes,
} from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { MixBatchPanel } from "@/components/MixBatchPanel";
import { ConfirmButton } from "@/components/ConfirmButton";
import { BackLink } from "@/components/BackLink";
import { deleteRecipe, duplicateRecipe, undoBatch } from "@/lib/actions";
import { formatVolume, roundTo, type VolumeUnit } from "@/lib/units";

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
      ingredientId: ingredients.id,
      name: ingredients.name,
      percentage: recipeIngredients.percentage,
      availableGrams: ingredients.quantityGrams,
      displayUnit: ingredients.displayUnit,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, recipeId))
    .orderBy(asc(recipeIngredients.sortOrder));

  const bucket = await db.query.glazes.findFirst({
    where: eq(glazes.recipeId, recipeId),
    orderBy: asc(glazes.id),
  });

  const history = await db
    .select()
    .from(batches)
    .where(eq(batches.recipeId, recipeId))
    .orderBy(desc(batches.mixedAt))
    .limit(10);

  const batchCount = (
    await db
      .select({ id: batches.id })
      .from(batches)
      .where(eq(batches.recipeId, recipeId))
  ).length;

  const total = roundTo(
    lines.reduce((s, l) => s + l.percentage, 0),
    2
  );

  const deleteMessage =
    batchCount > 0
      ? `Delete "${recipe.name}"? This also deletes its ${batchCount} recorded ${
          batchCount === 1 ? "batch" : "batches"
        } (materials already used stay deducted). This can't be undone.`
      : `Delete the recipe "${recipe.name}"? This can't be undone.`;

  return (
    <div className="space-y-6">
      <BackLink href="/recipes" label="Recipes" />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{recipe.name}</h1>
          {recipe.notes && (
            <p className="mt-1 text-stone-600">{recipe.notes}</p>
          )}
          {bucket && (
            <Link
              href="/glazes"
              className="mt-1 inline-block text-sm text-stone-500 hover:underline"
            >
              In the studio: {bucket.name} —{" "}
              {formatVolume(
                bucket.volumeMl,
                bucket.displayVolumeUnit as VolumeUnit
              )}
              {bucket.status ? ` · ${bucket.status}` : ""}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/recipes/${recipe.id}/edit`}
            className="rounded-lg border border-stone-300 px-3 py-2 font-medium text-stone-700 hover:bg-stone-100"
          >
            Edit
          </Link>
          <form action={duplicateRecipe}>
            <input type="hidden" name="id" value={recipe.id} />
            <button
              type="submit"
              className="rounded-lg border border-stone-300 px-3 py-2 font-medium text-stone-700 hover:bg-stone-100"
            >
              Duplicate
            </button>
          </form>
          <form action={deleteRecipe}>
            <input type="hidden" name="id" value={recipe.id} />
            <ConfirmButton
              message={deleteMessage}
              className="rounded-lg px-3 py-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
            >
              Delete
            </ConfirmButton>
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
            {lines.map((l, i) => (
              <li
                key={i}
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
        <MixBatchPanel
          recipeId={recipe.id}
          recipeName={recipe.name}
          lines={lines}
          bucket={
            bucket
              ? {
                  name: bucket.name,
                  volumeMl: bucket.volumeMl,
                  displayVolumeUnit: bucket.displayVolumeUnit,
                }
              : null
          }
        />
      )}

      {history.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900">
              Recent batches
            </h2>
            <Link
              href="/batches"
              className="text-sm text-stone-500 hover:underline"
            >
              See all batches →
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-stone-100">
            {history.map((b) => (
              <li key={b.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-stone-700">
                    {b.batchGrams} g batch
                    {b.producedMl ? (
                      <span className="text-stone-500">
                        {" "}
                        · made{" "}
                        {formatVolume(b.producedMl, "quart" as VolumeUnit)}
                      </span>
                    ) : null}
                    <span className="text-stone-400">
                      {" "}
                      · {new Date(b.mixedAt).toLocaleDateString()}
                    </span>
                  </span>
                  <form action={undoBatch}>
                    <input type="hidden" name="batchId" value={b.id} />
                    <input type="hidden" name="recipeId" value={recipe.id} />
                    <ConfirmButton
                      message="Undo this batch? The materials it used will be added back to your inventory."
                      className="rounded-lg px-3 py-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                    >
                      Undo
                    </ConfirmButton>
                  </form>
                </div>
                {b.notes && (
                  <p className="mt-0.5 text-xs text-stone-500">{b.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
