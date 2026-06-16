import { db } from "@/db";
import { recipes, recipeIngredients, ingredients } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { toCsv, csvDownloadHeaders, datedFilename } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  // One row per recipe-ingredient so the recipes are fully reconstructable.
  const rows = await db
    .select({
      recipe: recipes.name,
      notes: recipes.notes,
      ingredient: ingredients.name,
      percentage: recipeIngredients.percentage,
    })
    .from(recipeIngredients)
    .innerJoin(recipes, eq(recipeIngredients.recipeId, recipes.id))
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .orderBy(asc(recipes.name), asc(recipeIngredients.sortOrder));

  const csv = toCsv(
    ["Recipe", "Recipe notes", "Ingredient", "Percentage"],
    rows.map((r) => [r.recipe, r.notes, r.ingredient, r.percentage])
  );

  return new Response(csv, { headers: csvDownloadHeaders(datedFilename("recipes")) });
}
