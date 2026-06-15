// Integration check against a real Postgres DB. Exercises the same numeric
// paths the server actions use (toGrams storage, get-or-create ingredient,
// mix-deduct, undo-restore) and asserts inventory math is exact.
import "dotenv/config";
import { eq, ilike, sql } from "drizzle-orm";
import { db } from "../src/db/index";
import {
  ingredients,
  glazes,
  recipes,
  recipeIngredients,
  batches,
  batchLines,
} from "../src/db/schema";
import { toGrams, toMl, gramsForBatch } from "../src/lib/units";

let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!cond) failures++;
}
function approx(a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) < eps;
}

async function getOrCreate(name: string): Promise<number> {
  const found = await db
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(ilike(ingredients.name, name))
    .limit(1);
  if (found.length) return found[0].id;
  const [ins] = await db
    .insert(ingredients)
    .values({ name })
    .returning({ id: ingredients.id });
  return ins.id;
}

async function main() {
  // Clean slate
  await db.delete(batchLines);
  await db.delete(batches);
  await db.delete(recipeIngredients);
  await db.delete(glazes);
  await db.delete(recipes);
  await db.delete(ingredients);

  // 1. Store a 50 lb material -> canonical grams
  const [feldspar] = await db
    .insert(ingredients)
    .values({
      name: "Custer Feldspar",
      displayUnit: "lb",
      quantityGrams: toGrams(50, "lb"),
    })
    .returning();
  check(
    "50 lb stored as grams",
    approx(feldspar.quantityGrams, 22679.6185, 1e-3),
    `${feldspar.quantityGrams} g`
  );

  // 2. Create recipe; one known + one brand-new ingredient (auto-created)
  const [recipe] = await db
    .insert(recipes)
    .values({ name: "Test Clear" })
    .returning();
  const silicaId = await getOrCreate("Silica"); // brand new
  const feldsparId = feldspar.id;
  await db.insert(recipeIngredients).values([
    { recipeId: recipe.id, ingredientId: feldsparId, percentage: 40, sortOrder: 0 },
    { recipeId: recipe.id, ingredientId: silicaId, percentage: 60, sortOrder: 1 },
  ]);
  const silicaExists = await db
    .select()
    .from(ingredients)
    .where(eq(ingredients.id, silicaId));
  check(
    "brand-new ingredient auto-created at 0 stock",
    silicaExists.length === 1 && silicaExists[0].quantityGrams === 0
  );

  // 3. Mix a 1000 g batch that also produces 2 quarts of finished glaze
  const batchGrams = 1000;
  const producedMl = toMl(2, "quart");
  const lines = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipe.id));
  let batchId = 0;
  let glazeId = 0;
  await db.transaction(async (tx) => {
    // auto-create the glaze bucket for this recipe and add the produced volume
    const [g] = await tx
      .insert(glazes)
      .values({ name: recipe.name, recipeId: recipe.id, volumeMl: producedMl })
      .returning({ id: glazes.id });
    glazeId = g.id;
    const [b] = await tx
      .insert(batches)
      .values({ recipeId: recipe.id, batchGrams, glazeId: g.id, producedMl })
      .returning({ id: batches.id });
    batchId = b.id;
    for (const l of lines) {
      const grams = gramsForBatch(l.percentage, batchGrams);
      await tx
        .insert(batchLines)
        .values({ batchId: b.id, ingredientId: l.ingredientId, gramsDeducted: grams });
      await tx
        .update(ingredients)
        .set({ quantityGrams: sql`${ingredients.quantityGrams} - ${grams}` })
        .where(eq(ingredients.id, l.ingredientId));
    }
  });

  const glazeAfterMix = (
    await db.select().from(glazes).where(eq(glazes.id, glazeId))
  )[0];
  check(
    "glaze bucket got 2 quarts after mixing",
    approx(glazeAfterMix.volumeMl, toMl(2, "quart"), 1e-6),
    `${glazeAfterMix.volumeMl} mL`
  );

  const feldsparAfter = (
    await db.select().from(ingredients).where(eq(ingredients.id, feldsparId))
  )[0];
  const silicaAfter = (
    await db.select().from(ingredients).where(eq(ingredients.id, silicaId))
  )[0];
  check(
    "Feldspar deducted 400 g (40% of 1000)",
    approx(feldsparAfter.quantityGrams, 22679.6185 - 400, 1e-3),
    `${feldsparAfter.quantityGrams} g`
  );
  check(
    "Silica went negative (-600 g, flagged as short in UI)",
    approx(silicaAfter.quantityGrams, -600, 1e-6),
    `${silicaAfter.quantityGrams} g`
  );

  // 4. Undo the batch -> materials AND glaze volume restored exactly
  await db.transaction(async (tx) => {
    const [b] = await tx.select().from(batches).where(eq(batches.id, batchId));
    const bl = await tx
      .select()
      .from(batchLines)
      .where(eq(batchLines.batchId, batchId));
    for (const l of bl) {
      await tx
        .update(ingredients)
        .set({ quantityGrams: sql`${ingredients.quantityGrams} + ${l.gramsDeducted}` })
        .where(eq(ingredients.id, l.ingredientId));
    }
    if (b?.glazeId && b.producedMl) {
      await tx
        .update(glazes)
        .set({ volumeMl: sql`${glazes.volumeMl} - ${b.producedMl}` })
        .where(eq(glazes.id, b.glazeId));
    }
    await tx.delete(batches).where(eq(batches.id, batchId));
  });

  const glazeAfterUndo = (
    await db.select().from(glazes).where(eq(glazes.id, glazeId))
  )[0];
  check(
    "glaze bucket back to 0 mL after undo",
    approx(glazeAfterUndo.volumeMl, 0, 1e-6),
    `${glazeAfterUndo.volumeMl} mL`
  );

  const feldsparRestored = (
    await db.select().from(ingredients).where(eq(ingredients.id, feldsparId))
  )[0];
  const silicaRestored = (
    await db.select().from(ingredients).where(eq(ingredients.id, silicaId))
  )[0];
  const batchesLeft = await db.select().from(batches);
  check(
    "Feldspar restored to 22679.6 g after undo",
    approx(feldsparRestored.quantityGrams, 22679.6185, 1e-3)
  );
  check("Silica restored to 0 g after undo", approx(silicaRestored.quantityGrams, 0, 1e-6));
  check("batch removed (cascade) after undo", batchesLeft.length === 0);

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
