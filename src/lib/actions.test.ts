import { describe, it, expect, beforeEach, vi } from "vitest";

// The actions are server actions that call Next.js request-scoped helpers.
// Mock those so the real action code runs outside a request during tests.
// redirect() must THROW like the real one does — action code relies on it
// stopping execution (e.g. deleteMaterial's "in use" guards).
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT:${url}`), {
      digest: "NEXT_REDIRECT",
    });
  },
}));

// Await an action, swallowing only the redirect "error" (which means success
// or an intentional redirect-with-message). Returns the redirect URL if any.
async function ignoreRedirect(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("NEXT_REDIRECT:")) {
      return e.message.slice("NEXT_REDIRECT:".length);
    }
    throw e;
  }
}

import { db } from "@/db";
import {
  ingredients,
  glazes,
  recipes,
  recipeIngredients,
  batches,
  batchLines,
} from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
import { toGrams, toMl, gramsForBatch } from "./units";
import {
  mixBatch,
  undoBatch,
  saveRecipe,
  adjustGlazeVolume,
  deleteMaterial,
} from "./actions";

// Integration tests need a real Postgres. Skipped when DATABASE_URL is unset
// (so `npm test` still passes with no database).
const hasDb = Boolean(process.env.DATABASE_URL);

function fd(entries: Record<string, string | number>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, String(v));
  return f;
}

async function clearAll() {
  await db.delete(batchLines);
  await db.delete(batches);
  await db.delete(recipeIngredients);
  await db.delete(glazes);
  await db.delete(recipes);
  await db.delete(ingredients);
}

// Build a recipe with two materials at the given percentages and known stock.
async function seedRecipe(feldsparPct: number, silicaPct: number) {
  const [feldspar] = await db
    .insert(ingredients)
    .values({ name: "Custer Feldspar", quantityGrams: toGrams(50, "lb") })
    .returning();
  const [silica] = await db
    .insert(ingredients)
    .values({ name: "Silica", quantityGrams: toGrams(50, "lb") })
    .returning();
  const [recipe] = await db
    .insert(recipes)
    .values({ name: "Test Clear" })
    .returning();
  await db.insert(recipeIngredients).values([
    { recipeId: recipe.id, ingredientId: feldspar.id, percentage: feldsparPct, sortOrder: 0 },
    { recipeId: recipe.id, ingredientId: silica.id, percentage: silicaPct, sortOrder: 1 },
  ]);
  return { feldspar, silica, recipe };
}

const qtyOf = async (id: number) =>
  (await db.select().from(ingredients).where(eq(ingredients.id, id)))[0]
    .quantityGrams;

describe.skipIf(!hasDb)("action flows (integration)", () => {
  beforeEach(clearAll);

  it("mixBatch deducts the correct grams from each material", async () => {
    const { feldspar, silica, recipe } = await seedRecipe(40, 60);
    const startFeldspar = await qtyOf(feldspar.id);
    const startSilica = await qtyOf(silica.id);

    await mixBatch({ recipeId: recipe.id, batchGrams: 1000 });

    expect(await qtyOf(feldspar.id)).toBeCloseTo(
      startFeldspar - gramsForBatch(40, 1000),
      6
    );
    expect(await qtyOf(silica.id)).toBeCloseTo(
      startSilica - gramsForBatch(60, 1000),
      6
    );
  });

  it("undoBatch restores materials and removes the batch", async () => {
    const { feldspar, silica, recipe } = await seedRecipe(40, 60);
    const startFeldspar = await qtyOf(feldspar.id);
    const startSilica = await qtyOf(silica.id);

    await mixBatch({ recipeId: recipe.id, batchGrams: 1000 });
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.recipeId, recipe.id));

    await undoBatch(fd({ batchId: batch.id, recipeId: recipe.id }));

    expect(await qtyOf(feldspar.id)).toBeCloseTo(startFeldspar, 6);
    expect(await qtyOf(silica.id)).toBeCloseTo(startSilica, 6);
    expect(await db.select().from(batches)).toHaveLength(0);
    expect(await db.select().from(batchLines)).toHaveLength(0);
  });

  it("mixBatch with produced volume fills the glaze bucket; undo reverses it", async () => {
    const { recipe } = await seedRecipe(40, 60);

    await mixBatch({
      recipeId: recipe.id,
      batchGrams: 1000,
      producedVolume: 2,
      producedUnit: "quart",
    });

    const linked = await db
      .select()
      .from(glazes)
      .where(eq(glazes.recipeId, recipe.id));
    expect(linked).toHaveLength(1);
    expect(linked[0].volumeMl).toBeCloseTo(toMl(2, "quart"), 6);

    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.recipeId, recipe.id));
    await undoBatch(fd({ batchId: batch.id, recipeId: recipe.id }));

    expect(await db.select().from(glazes).where(eq(glazes.id, linked[0].id)).then((r) => r[0].volumeMl)).toBeCloseTo(0, 6);
  });

  it("saveRecipe auto-creates a new ingredient only once (case-insensitive)", async () => {
    await ignoreRedirect(
      saveRecipe({
        name: "New Glaze",
        lines: [
          { name: "Nepheline Syenite", percentage: 50 },
          { name: "nepheline syenite", percentage: 50 }, // different case, same material
        ],
      })
    );

    const matches = await db
      .select()
      .from(ingredients)
      .where(ilike(ingredients.name, "nepheline syenite"));
    expect(matches).toHaveLength(1);
  });

  it("adjustGlazeVolume subtracts on 'use' and adds on 'add'", async () => {
    const [glaze] = await db
      .insert(glazes)
      .values({ name: "Frost Green", volumeMl: toMl(2, "quart") })
      .returning();

    await adjustGlazeVolume(
      fd({ id: glaze.id, amount: 1, unit: "quart", direction: "use" })
    );
    let vol = (await db.select().from(glazes).where(eq(glazes.id, glaze.id)))[0]
      .volumeMl;
    expect(vol).toBeCloseTo(toMl(1, "quart"), 6);

    await adjustGlazeVolume(
      fd({ id: glaze.id, amount: 2, unit: "cup", direction: "add" })
    );
    vol = (await db.select().from(glazes).where(eq(glazes.id, glaze.id)))[0]
      .volumeMl;
    expect(vol).toBeCloseTo(toMl(1, "quart") + toMl(2, "cup"), 6);
  });

  it("adjustGlazeVolume never goes below empty and marks the bucket Empty", async () => {
    const [glaze] = await db
      .insert(glazes)
      .values({ name: "Apricot", volumeMl: toMl(1, "quart"), status: "Dryish" })
      .returning();

    // Use 2 quarts from a 1-quart bucket -> clamps to 0, status becomes Empty.
    await adjustGlazeVolume(
      fd({ id: glaze.id, amount: 2, unit: "quart", direction: "use" })
    );
    const after = (
      await db.select().from(glazes).where(eq(glazes.id, glaze.id))
    )[0];
    expect(after.volumeMl).toBe(0);
    expect(after.status).toBe("Empty");
  });

  it("deleteMaterial is blocked with a friendly redirect when in use (recipe or batch history)", async () => {
    const { feldspar, silica, recipe } = await seedRecipe(40, 60);

    // Blocked: used by a recipe.
    const url1 = await ignoreRedirect(deleteMaterial(fd({ id: feldspar.id })));
    expect(url1).toContain("/inventory?error=");
    expect(
      await db.select().from(ingredients).where(eq(ingredients.id, feldspar.id))
    ).toHaveLength(1);

    // Blocked: no recipe usage anymore, but present in batch history.
    await mixBatch({ recipeId: recipe.id, batchGrams: 1000 });
    await db
      .delete(recipeIngredients)
      .where(eq(recipeIngredients.ingredientId, silica.id));
    const url2 = await ignoreRedirect(deleteMaterial(fd({ id: silica.id })));
    expect(url2).toContain("/inventory?error=");
    expect(
      await db.select().from(ingredients).where(eq(ingredients.id, silica.id))
    ).toHaveLength(1);
  });
});
