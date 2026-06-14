import { notFound } from "next/navigation";
import { db } from "@/db";
import { ingredients, recipeIngredients, recipes } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { RecipeEntryForm } from "@/components/RecipeEntryForm";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
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
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, recipeId))
    .orderBy(asc(recipeIngredients.sortOrder));

  const known = await db
    .select({ name: ingredients.name })
    .from(ingredients)
    .orderBy(asc(ingredients.name));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-900">Edit recipe</h1>
      <RecipeEntryForm
        recipe={{
          id: recipe.id,
          name: recipe.name,
          notes: recipe.notes,
          lines,
        }}
        knownIngredients={known.map((k) => k.name)}
      />
    </div>
  );
}
