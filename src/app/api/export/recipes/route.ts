import { db } from "@/db";
import { recipes, recipeIngredients, ingredients } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { toCsv, csvDownloadHeaders, datedFilename } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  // One row per recipe-ingredient so the recipes are fully reconstructable.
  // Left joins so a recipe with no ingredients yet still appears, and a
  // Recipe ID column so two recipes with the same name stay distinguishable.
  const rows = await db
    .select({
      recipeId: recipes.id,
      recipe: recipes.name,
      notes: recipes.notes,
      ingredient: ingredients.name,
      percentage: recipeIngredients.percentage,
    })
    .from(recipes)
    .leftJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
    .leftJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .orderBy(asc(recipes.id), asc(recipeIngredients.sortOrder));

  const csv = toCsv(
    ["Recipe ID", "Recipe", "Recipe notes", "Ingredient", "Percentage"],
    rows.map((r) => [r.recipeId, r.recipe, r.notes, r.ingredient, r.percentage])
  );

  return new Response(csv, { headers: csvDownloadHeaders(datedFilename("recipes")) });
}
