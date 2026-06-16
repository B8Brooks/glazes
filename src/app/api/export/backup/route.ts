import { db } from "@/db";
import {
  ingredients,
  recipes,
  recipeIngredients,
  glazes,
  batches,
  batchLines,
} from "@/db/schema";
import { datedFilename } from "@/lib/csv";

export const dynamic = "force-dynamic";

// A complete, lossless snapshot of every table — the file to restore from if
// ever needed.
export async function GET() {
  const [
    ingredientRows,
    recipeRows,
    recipeIngredientRows,
    glazeRows,
    batchRows,
    batchLineRows,
  ] = await Promise.all([
    db.select().from(ingredients),
    db.select().from(recipes),
    db.select().from(recipeIngredients),
    db.select().from(glazes),
    db.select().from(batches),
    db.select().from(batchLines),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    version: 1,
    tables: {
      ingredients: ingredientRows,
      recipes: recipeRows,
      recipe_ingredients: recipeIngredientRows,
      glazes: glazeRows,
      batches: batchRows,
      batch_lines: batchLineRows,
    },
  };

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${datedFilename("backup", "json")}"`,
      "Cache-Control": "no-store",
    },
  });
}
