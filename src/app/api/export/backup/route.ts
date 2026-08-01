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
// ever needed. All reads run in one REPEATABLE READ transaction so the file
// is internally consistent even if a batch is being mixed at the same moment.
export async function GET() {
  const [
    ingredientRows,
    recipeRows,
    recipeIngredientRows,
    glazeRows,
    batchRows,
    batchLineRows,
  ] = await db.transaction(
    async (tx) => [
      await tx.select().from(ingredients),
      await tx.select().from(recipes),
      await tx.select().from(recipeIngredients),
      await tx.select().from(glazes),
      await tx.select().from(batches),
      await tx.select().from(batchLines),
    ],
    { isolationLevel: "repeatable read", accessMode: "read only" }
  );

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
