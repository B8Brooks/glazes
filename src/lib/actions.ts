"use server";

import { db } from "@/db";
import {
  ingredients,
  glazes,
  recipes,
  recipeIngredients,
  batches,
  batchLines,
} from "@/db/schema";
import { and, asc, eq, ilike, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  toGrams,
  toMl,
  gramsForBatch,
  type DisplayUnit,
  type VolumeUnit,
} from "./units";

function num(value: FormDataEntryValue | null): number {
  const n = parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function str(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function optStr(value: FormDataEntryValue | null): string | null {
  const s = str(value);
  return s.length ? s : null;
}

function asUnit(value: FormDataEntryValue | null): DisplayUnit {
  const s = str(value);
  return s === "kg" || s === "g" ? s : "lb";
}

function asVolumeUnit(value: FormDataEntryValue | null): VolumeUnit {
  const s = str(value);
  return s === "cup" || s === "pint" || s === "gallon" ? s : "quart";
}

function num0(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

// Escape LIKE wildcards so a name like "Mason 6600 5%" is matched literally.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" && err !== null && (err as { code?: string }).code === "23505"
  );
}

function errorRedirect(basePath: string, message: string): never {
  redirect(`${basePath}?error=${encodeURIComponent(message)}`);
}

// Either the root db or a transaction handle — lets helpers run inside
// whichever context the caller is in.
type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// Find an existing material by name (case-insensitive) or create it at 0 stock.
// This is what lets Sheila type a brand-new ingredient while transcribing a
// recipe and have it appear in inventory automatically.
async function getOrCreateIngredientId(
  dbc: DbClient,
  rawName: string
): Promise<number | null> {
  const name = rawName.trim();
  if (!name) return null;

  const found = await dbc
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(ilike(ingredients.name, escapeLike(name)))
    .orderBy(asc(ingredients.id))
    .limit(1);
  if (found.length) return found[0].id;

  const inserted = await dbc
    .insert(ingredients)
    .values({ name })
    .onConflictDoNothing()
    .returning({ id: ingredients.id });
  if (inserted.length) return inserted[0].id;

  // Lost an insert race — re-read.
  const again = await dbc
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(ilike(ingredients.name, escapeLike(name)))
    .orderBy(asc(ingredients.id))
    .limit(1);
  return again[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Materials / inventory
// ---------------------------------------------------------------------------

async function materialNameTaken(name: string, excludeId?: number) {
  const clash = await db
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(
      excludeId
        ? and(ilike(ingredients.name, escapeLike(name)), ne(ingredients.id, excludeId))
        : ilike(ingredients.name, escapeLike(name))
    )
    .limit(1);
  return clash.length > 0;
}

export async function createMaterial(formData: FormData) {
  const name = str(formData.get("name"));
  if (!name) return;
  const unit = asUnit(formData.get("displayUnit"));
  const quantity = num(formData.get("quantity"));
  const thresholdRaw = str(formData.get("reorderThreshold"));

  if (quantity < 0 || num(formData.get("reorderThreshold")) < 0) {
    errorRedirect("/inventory", "Amounts can't be negative.");
  }
  if (await materialNameTaken(name)) {
    errorRedirect(
      "/inventory",
      `You already have a material called "${name}" — edit that one instead.`
    );
  }

  try {
    await db.insert(ingredients).values({
      name,
      displayUnit: unit,
      quantityGrams: toGrams(quantity, unit),
      reorderThresholdGrams: thresholdRaw ? toGrams(num(thresholdRaw), unit) : null,
      supplier: optStr(formData.get("supplier")),
      notes: optStr(formData.get("notes")),
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      errorRedirect(
        "/inventory",
        `You already have a material called "${name}" — edit that one instead.`
      );
    }
    throw err;
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function updateMaterial(formData: FormData) {
  const id = num(formData.get("id"));
  const name = str(formData.get("name"));
  if (!id || !name) return;
  const unit = asUnit(formData.get("displayUnit"));
  const quantityRaw = str(formData.get("quantity"));
  const thresholdRaw = str(formData.get("reorderThreshold"));

  if (num(formData.get("quantity")) < 0 || num(formData.get("reorderThreshold")) < 0) {
    errorRedirect("/inventory", "Amounts can't be negative.");
  }
  if (await materialNameTaken(name, id)) {
    errorRedirect(
      "/inventory",
      `Another material is already called "${name}" — pick a different name.`
    );
  }

  try {
    await db
      .update(ingredients)
      .set({
        name,
        displayUnit: unit,
        // A blank amount means "leave the stock as it is" — never zero it.
        ...(quantityRaw
          ? { quantityGrams: toGrams(num(quantityRaw), unit) }
          : {}),
        reorderThresholdGrams: thresholdRaw
          ? toGrams(num(thresholdRaw), unit)
          : null,
        supplier: optStr(formData.get("supplier")),
        notes: optStr(formData.get("notes")),
        updatedAt: new Date(),
      })
      .where(eq(ingredients.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) {
      errorRedirect(
        "/inventory",
        `Another material is already called "${name}" — pick a different name.`
      );
    }
    throw err;
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}

// Quick "I just received more of this" — adds to existing stock.
export async function addStock(formData: FormData) {
  const id = num(formData.get("id"));
  const unit = asUnit(formData.get("unit"));
  const amount = num(formData.get("amount"));
  if (!id || amount === 0) return;
  if (amount < 0) {
    errorRedirect("/inventory", "Enter a positive amount to add.");
  }

  await db
    .update(ingredients)
    .set({
      quantityGrams: sql`${ingredients.quantityGrams} + ${toGrams(amount, unit)}`,
      updatedAt: new Date(),
    })
    .where(eq(ingredients.id, id));

  revalidatePath("/inventory");
}

export async function deleteMaterial(formData: FormData) {
  const id = num(formData.get("id"));
  if (!id) return;

  // A material can't be deleted while a recipe or a recorded batch still
  // points at it (restrict FKs). Explain in plain language instead of crashing.
  const [material] = await db
    .select({ name: ingredients.name })
    .from(ingredients)
    .where(eq(ingredients.id, id))
    .limit(1);
  const name = material?.name ?? "This material";

  const usedInRecipe = await db
    .select({ id: recipeIngredients.id })
    .from(recipeIngredients)
    .where(eq(recipeIngredients.ingredientId, id))
    .limit(1);
  if (usedInRecipe.length) {
    errorRedirect(
      "/inventory",
      `"${name}" is used in a recipe, so it can't be deleted. Remove it from the recipe first.`
    );
  }

  const usedInBatch = await db
    .select({ id: batchLines.id })
    .from(batchLines)
    .where(eq(batchLines.ingredientId, id))
    .limit(1);
  if (usedInBatch.length) {
    errorRedirect(
      "/inventory",
      `"${name}" is part of your batch history, so it can't be deleted. Undo those batches first if you really want to remove it.`
    );
  }

  await db.delete(ingredients).where(eq(ingredients.id, id));
  revalidatePath("/inventory");
}

// ---------------------------------------------------------------------------
// Mixed glazes (finished buckets, tracked by volume)
// ---------------------------------------------------------------------------

function optId(value: FormDataEntryValue | null): number | null {
  const n = num(value);
  return n > 0 ? n : null;
}

export async function createGlaze(formData: FormData) {
  const name = str(formData.get("name"));
  if (!name) return;
  const unit = asVolumeUnit(formData.get("displayVolumeUnit"));
  const volume = num(formData.get("volume"));
  if (volume < 0) errorRedirect("/glazes", "Amounts can't be negative.");

  await db.insert(glazes).values({
    name,
    recipeId: optId(formData.get("recipeId")),
    volumeMl: toMl(volume, unit),
    displayVolumeUnit: unit,
    status: optStr(formData.get("status")),
    notes: optStr(formData.get("notes")),
  });

  revalidatePath("/glazes");
  redirect("/glazes");
}

export async function updateGlaze(formData: FormData) {
  const id = num(formData.get("id"));
  const name = str(formData.get("name"));
  if (!id || !name) return;
  const unit = asVolumeUnit(formData.get("displayVolumeUnit"));
  const volumeRaw = str(formData.get("volume"));
  if (num(formData.get("volume")) < 0) {
    errorRedirect("/glazes", "Amounts can't be negative.");
  }

  await db
    .update(glazes)
    .set({
      name,
      recipeId: optId(formData.get("recipeId")),
      // A blank amount means "leave the volume as it is" — never zero it.
      ...(volumeRaw ? { volumeMl: toMl(num(volumeRaw), unit) } : {}),
      displayVolumeUnit: unit,
      status: optStr(formData.get("status")),
      notes: optStr(formData.get("notes")),
      updatedAt: new Date(),
    })
    .where(eq(glazes.id, id));

  revalidatePath("/glazes");
  redirect("/glazes");
}

// Quick "used some" / "topped up" — sign comes from the button's `direction`.
// A bucket can never go below empty; landing on empty labels it "Empty", and
// refilling an Empty bucket labels it "Good" again.
export async function adjustGlazeVolume(formData: FormData) {
  const id = num(formData.get("id"));
  const unit = asVolumeUnit(formData.get("unit"));
  const amount = num(formData.get("amount"));
  const direction = str(formData.get("direction")) === "use" ? -1 : 1;
  if (!id || amount === 0) return;
  if (amount < 0) errorRedirect("/glazes", "Enter a positive amount.");

  const newVolume = sql`GREATEST(0, ${glazes.volumeMl} + ${
    direction * toMl(amount, unit)
  })`;
  await db
    .update(glazes)
    .set({
      volumeMl: newVolume,
      status: sql`CASE
        WHEN ${newVolume} <= 0 THEN 'Empty'
        WHEN ${glazes.status} = 'Empty' THEN 'Good'
        ELSE ${glazes.status}
      END`,
      updatedAt: new Date(),
    })
    .where(eq(glazes.id, id));

  revalidatePath("/glazes");
}

export async function deleteGlaze(formData: FormData) {
  const id = num(formData.get("id"));
  if (!id) return;
  await db.delete(glazes).where(eq(glazes.id, id));
  revalidatePath("/glazes");
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export type RecipeLineInput = { name: string; percentage: number };

// Create or update a recipe in one atomic call. Ingredient names that don't
// exist yet are created automatically (at 0 stock). Validation is loud on
// purpose: a transcribed line must never silently disappear.
export async function saveRecipe(input: {
  id?: number;
  name: string;
  notes?: string | null;
  lines: RecipeLineInput[];
  saveAndNew?: boolean;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Please give the glaze a name.");

  // Rows that are fully blank (no name) are the form's trailing empty rows —
  // ignore them. Anything with a name must have a usable percentage.
  const lines = input.lines
    .map((l) => ({ name: l.name.trim(), percentage: Number(l.percentage) }))
    .filter((l) => l.name.length > 0);

  for (const line of lines) {
    if (!Number.isFinite(line.percentage)) {
      throw new Error(
        `"${line.name}" needs a number for its percentage — use a period (8.5), not a comma.`
      );
    }
    if (line.percentage <= 0) {
      throw new Error(`"${line.name}" needs a percentage greater than zero.`);
    }
  }

  const seen = new Set<string>();
  for (const line of lines) {
    const key = line.name.toLowerCase();
    if (seen.has(key)) {
      throw new Error(
        `"${line.name}" appears twice — combine them into one row.`
      );
    }
    seen.add(key);
  }

  const clash = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(
      input.id
        ? and(ilike(recipes.name, escapeLike(name)), ne(recipes.id, input.id))
        : ilike(recipes.name, escapeLike(name))
    )
    .limit(1);
  if (clash.length) {
    throw new Error(
      `You already have a recipe called "${name}" — edit that one, or give this a different name.`
    );
  }

  let recipeId = input.id;

  await db.transaction(async (tx) => {
    if (recipeId) {
      await tx
        .update(recipes)
        .set({ name, notes: input.notes ?? null, updatedAt: new Date() })
        .where(eq(recipes.id, recipeId));
      await tx
        .delete(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, recipeId));
    } else {
      const created = await tx
        .insert(recipes)
        .values({ name, notes: input.notes ?? null })
        .returning({ id: recipes.id });
      recipeId = created[0].id;
    }

    let order = 0;
    for (const line of lines) {
      const ingredientId = await getOrCreateIngredientId(tx, line.name);
      if (!ingredientId) continue;
      await tx.insert(recipeIngredients).values({
        recipeId,
        ingredientId,
        percentage: line.percentage,
        sortOrder: order++,
      });
    }
  });

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  // "Save & add another" stays on the entry form — the client resets itself.
  if (input.saveAndNew) return;
  // redirect throws, so it must come after the transaction has committed.
  redirect(`/recipes/${recipeId}`);
}

export async function deleteRecipe(formData: FormData) {
  const id = num(formData.get("id"));
  if (!id) return;
  await db.delete(recipes).where(eq(recipes.id, id));
  revalidatePath("/recipes");
  redirect("/recipes");
}

// ---------------------------------------------------------------------------
// Mixing batches (headline feature) + undo
// ---------------------------------------------------------------------------

export async function mixBatch(input: {
  recipeId: number;
  batchGrams: number;
  producedVolume?: number;
  producedUnit?: VolumeUnit;
  notes?: string | null;
}) {
  const { recipeId } = input;
  const batchGrams = Number(input.batchGrams);
  if (!recipeId || !Number.isFinite(batchGrams) || batchGrams <= 0) {
    throw new Error("Enter a batch size greater than zero.");
  }

  const producedVolume = num0(Number(input.producedVolume));
  if (producedVolume < 0) {
    throw new Error("Volume made can't be negative.");
  }
  const producedUnit = input.producedUnit ?? "quart";
  const producedMl = producedVolume > 0 ? toMl(producedVolume, producedUnit) : 0;

  await db.transaction(async (tx) => {
    // Read the recipe inside the transaction so the deduction matches the
    // batch we record even if the recipe is being edited elsewhere.
    const lines = await tx
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId))
      .orderBy(asc(recipeIngredients.sortOrder));
    if (!lines.length) throw new Error("This recipe has no ingredients yet.");

    // If a finished volume was produced, find the glaze bucket linked to this
    // recipe (auto-create one named after the recipe if none exists yet).
    let glazeId: number | null = null;
    if (producedMl > 0) {
      const existing = await tx
        .select({ id: glazes.id })
        .from(glazes)
        .where(eq(glazes.recipeId, recipeId))
        .orderBy(asc(glazes.id))
        .limit(1);
      if (existing.length) {
        glazeId = existing[0].id;
      } else {
        const recipe = await tx
          .select({ name: recipes.name })
          .from(recipes)
          .where(eq(recipes.id, recipeId))
          .limit(1);
        const [created] = await tx
          .insert(glazes)
          .values({
            name: recipe[0]?.name ?? "New glaze",
            recipeId,
            displayVolumeUnit: producedUnit,
          })
          .returning({ id: glazes.id });
        glazeId = created.id;
      }
      await tx
        .update(glazes)
        .set({
          volumeMl: sql`${glazes.volumeMl} + ${producedMl}`,
          // A bucket that was marked Empty is no longer empty.
          status: sql`CASE WHEN ${glazes.status} = 'Empty' THEN 'Good' ELSE ${glazes.status} END`,
          updatedAt: new Date(),
        })
        .where(eq(glazes.id, glazeId));
    }

    const [batch] = await tx
      .insert(batches)
      .values({
        recipeId,
        batchGrams,
        glazeId,
        producedMl: producedMl > 0 ? producedMl : null,
        notes: input.notes ?? null,
      })
      .returning({ id: batches.id });

    for (const line of lines) {
      const grams = gramsForBatch(line.percentage, batchGrams);
      await tx.insert(batchLines).values({
        batchId: batch.id,
        ingredientId: line.ingredientId,
        gramsDeducted: grams,
      });
      await tx
        .update(ingredients)
        .set({
          quantityGrams: sql`${ingredients.quantityGrams} - ${grams}`,
          updatedAt: new Date(),
        })
        .where(eq(ingredients.id, line.ingredientId));
    }
  });

  revalidatePath("/inventory");
  revalidatePath("/glazes");
  revalidatePath(`/recipes/${recipeId}`);
}

export async function undoBatch(formData: FormData) {
  const batchId = num(formData.get("batchId"));
  const recipeId = num(formData.get("recipeId"));
  if (!batchId) return;

  await db.transaction(async (tx) => {
    // Lock the batch row so a double-tapped Undo can't credit twice: the
    // second transaction waits here, then finds the batch already gone.
    const [batch] = await tx
      .select()
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1)
      .for("update");
    if (!batch) return;

    const lines = await tx
      .select()
      .from(batchLines)
      .where(eq(batchLines.batchId, batchId));
    for (const line of lines) {
      await tx
        .update(ingredients)
        .set({
          quantityGrams: sql`${ingredients.quantityGrams} + ${line.gramsDeducted}`,
          updatedAt: new Date(),
        })
        .where(eq(ingredients.id, line.ingredientId));
    }

    // Reverse the finished volume this batch added to a glaze bucket, if any
    // (never below empty — she may have used some since mixing).
    if (batch.glazeId && batch.producedMl) {
      await tx
        .update(glazes)
        .set({
          volumeMl: sql`GREATEST(0, ${glazes.volumeMl} - ${batch.producedMl})`,
          updatedAt: new Date(),
        })
        .where(eq(glazes.id, batch.glazeId));
    }

    await tx.delete(batches).where(eq(batches.id, batchId));
  });

  revalidatePath("/inventory");
  revalidatePath("/glazes");
  if (recipeId) revalidatePath(`/recipes/${recipeId}`);
}
