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
  updateMaterial,
  addStock,
  duplicateRecipe,
  importRecipesCsv,
  restoreBackup,
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

  it("saveRecipe auto-creates a new ingredient and reuses it case-insensitively", async () => {
    await ignoreRedirect(
      saveRecipe({
        name: "New Glaze",
        lines: [{ name: "Nepheline Syenite", percentage: 50 }],
      })
    );
    await ignoreRedirect(
      saveRecipe({
        name: "Second Glaze",
        lines: [{ name: "nepheline syenite", percentage: 40 }], // different case, same material
      })
    );

    const matches = await db
      .select()
      .from(ingredients)
      .where(ilike(ingredients.name, "nepheline syenite"));
    expect(matches).toHaveLength(1);
  });

  it("saveRecipe rejects duplicate ingredient rows and missing percentages loudly", async () => {
    await expect(
      saveRecipe({
        name: "Dup Glaze",
        lines: [
          { name: "Silica", percentage: 30 },
          { name: "silica", percentage: 25 },
        ],
      })
    ).rejects.toThrow(/appears twice/);

    await expect(
      saveRecipe({
        name: "Typo Glaze",
        lines: [{ name: "Whiting", percentage: NaN }],
      })
    ).rejects.toThrow(/Whiting/);

    // Nothing was created by the failed saves.
    expect(await db.select().from(recipes)).toHaveLength(0);
  });

  it("updateMaterial with a blank amount leaves the stock unchanged", async () => {
    const [material] = await db
      .insert(ingredients)
      .values({ name: "Custer Feldspar", quantityGrams: 1000 })
      .returning();

    await ignoreRedirect(
      updateMaterial(
        fd({
          id: material.id,
          name: "Custer Feldspar",
          displayUnit: "lb",
          quantity: "",
          reorderThreshold: "",
        })
      )
    );

    expect(await qtyOf(material.id)).toBe(1000);
  });

  it("addStock refuses a negative amount", async () => {
    const [material] = await db
      .insert(ingredients)
      .values({ name: "Silica", quantityGrams: 500 })
      .returning();

    const url = await ignoreRedirect(
      addStock(fd({ id: material.id, amount: -5, unit: "lb" }))
    );
    expect(url).toContain("/inventory?error=");
    expect(await qtyOf(material.id)).toBe(500);
  });

  it("refilling an Empty bucket clears the status back to Good", async () => {
    const [glaze] = await db
      .insert(glazes)
      .values({ name: "Apricot", volumeMl: 0, status: "Empty" })
      .returning();

    await adjustGlazeVolume(
      fd({ id: glaze.id, amount: 1, unit: "quart", direction: "add" })
    );
    const after = (
      await db.select().from(glazes).where(eq(glazes.id, glaze.id))
    )[0];
    expect(after.volumeMl).toBeCloseTo(toMl(1, "quart"), 6);
    expect(after.status).toBe("Good");
  });

  it("mixBatch producing volume clears an Empty status on the linked bucket", async () => {
    const { recipe } = await seedRecipe(40, 60);
    const [bucket] = await db
      .insert(glazes)
      .values({ name: "Test Clear", recipeId: recipe.id, volumeMl: 0, status: "Empty" })
      .returning();

    await mixBatch({
      recipeId: recipe.id,
      batchGrams: 1000,
      producedVolume: 1,
      producedUnit: "quart",
    });

    const after = (
      await db.select().from(glazes).where(eq(glazes.id, bucket.id))
    )[0];
    expect(after.status).toBe("Good");
  });

  it("duplicateRecipe copies the lines under a unique name and opens edit", async () => {
    const { recipe } = await seedRecipe(40, 60);

    const url = await ignoreRedirect(duplicateRecipe(fd({ id: recipe.id })));
    expect(url).toMatch(/\/recipes\/\d+\/edit$/);

    const copy = await db.query.recipes.findFirst({
      where: ilike(recipes.name, "Test Clear (copy)"),
    });
    expect(copy).toBeTruthy();
    const lines = await db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, copy!.id));
    expect(lines).toHaveLength(2);

    // A second duplicate picks the next free name.
    await ignoreRedirect(duplicateRecipe(fd({ id: recipe.id })));
    expect(
      await db.query.recipes.findFirst({
        where: ilike(recipes.name, "Test Clear (copy 2)"),
      })
    ).toBeTruthy();
  });

  it("importRecipesCsv imports new recipes, skips existing, reports problems", async () => {
    await db.insert(recipes).values({ name: "Existing" });

    const csv = [
      "Recipe,Ingredient,Percentage",
      "Fresh Clear,Custer Feldspar,40",
      "Fresh Clear,Silica,60",
      "Existing,Whatever,10",
      "Broken,Whiting,oops",
    ].join("\n");
    const formData = new FormData();
    formData.append("file", new File([csv], "recipes.csv", { type: "text/csv" }));

    const url = decodeURIComponent(
      (await ignoreRedirect(importRecipesCsv(formData))) ?? ""
    );
    expect(url).toContain("Imported 1 recipe");
    expect(url).toContain("skipped 1");
    expect(url).toContain("Broken");

    const names = (await db.select().from(recipes)).map((r) => r.name).sort();
    expect(names).toEqual(["Existing", "Fresh Clear"]);

    const fresh = await db.query.recipes.findFirst({
      where: ilike(recipes.name, "Fresh Clear"),
    });
    const lines = await db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, fresh!.id));
    expect(lines).toHaveLength(2);
    // Its materials were auto-created in inventory.
    expect(
      await db
        .select()
        .from(ingredients)
        .where(ilike(ingredients.name, "silica"))
    ).toHaveLength(1);
  });

  it("restoreBackup replaces everything with the file's contents", async () => {
    await seedRecipe(40, 60);
    await db
      .insert(glazes)
      .values({ name: "Frost Green", volumeMl: toMl(2, "quart") });

    const backup = {
      version: 1,
      tables: {
        ingredients: await db.select().from(ingredients),
        recipes: await db.select().from(recipes),
        recipe_ingredients: await db.select().from(recipeIngredients),
        glazes: await db.select().from(glazes),
        batches: await db.select().from(batches),
        batch_lines: await db.select().from(batchLines),
      },
    };

    // Diverge from the snapshot: junk added, a bucket deleted.
    await db.insert(ingredients).values({ name: "Junk", quantityGrams: 1 });
    await db.delete(glazes);

    const formData = new FormData();
    formData.append(
      "file",
      new File([JSON.stringify(backup)], "backup.json", {
        type: "application/json",
      })
    );
    const url = await ignoreRedirect(restoreBackup(formData));
    expect(url).toContain("restored=");

    const ing = await db.select().from(ingredients);
    expect(ing.map((i) => i.name).sort()).toEqual([
      "Custer Feldspar",
      "Silica",
    ]);
    const gl = await db.select().from(glazes);
    expect(gl).toHaveLength(1);
    expect(gl[0].name).toBe("Frost Green");
    expect(gl[0].volumeMl).toBeCloseTo(toMl(2, "quart"), 6);

    // Sequences were advanced: a fresh insert gets a brand-new id.
    const [freshRow] = await db
      .insert(ingredients)
      .values({ name: "Fresh After Restore" })
      .returning();
    expect(freshRow.id).toBeGreaterThan(Math.max(...ing.map((i) => i.id)));
  });

  it("undoing the same batch twice credits inventory only once", async () => {
    const { feldspar, recipe } = await seedRecipe(40, 60);
    const startFeldspar = await qtyOf(feldspar.id);

    await mixBatch({ recipeId: recipe.id, batchGrams: 1000 });
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.recipeId, recipe.id));

    await undoBatch(fd({ batchId: batch.id, recipeId: recipe.id }));
    await undoBatch(fd({ batchId: batch.id, recipeId: recipe.id })); // no-op

    expect(await qtyOf(feldspar.id)).toBeCloseTo(startFeldspar, 6);
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
