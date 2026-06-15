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
import { eq, ilike, sql } from "drizzle-orm";
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

// Find an existing material by name (case-insensitive) or create it at 0 stock.
// This is what lets Sheila type a brand-new ingredient while transcribing a
// recipe and have it appear in inventory automatically.
async function getOrCreateIngredientId(rawName: string): Promise<number | null> {
  const name = rawName.trim();
  if (!name) return null;

  const found = await db
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(ilike(ingredients.name, name))
    .limit(1);
  if (found.length) return found[0].id;

  const inserted = await db
    .insert(ingredients)
    .values({ name })
    .onConflictDoNothing()
    .returning({ id: ingredients.id });
  if (inserted.length) return inserted[0].id;

  // Lost an insert race — re-read.
  const again = await db
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(ilike(ingredients.name, name))
    .limit(1);
  return again[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Materials / inventory
// ---------------------------------------------------------------------------

export async function createMaterial(formData: FormData) {
  const name = str(formData.get("name"));
  if (!name) return;
  const unit = asUnit(formData.get("displayUnit"));
  const quantity = num(formData.get("quantity"));
  const thresholdRaw = str(formData.get("reorderThreshold"));

  await db.insert(ingredients).values({
    name,
    displayUnit: unit,
    quantityGrams: toGrams(quantity, unit),
    reorderThresholdGrams: thresholdRaw ? toGrams(num(thresholdRaw), unit) : null,
    supplier: optStr(formData.get("supplier")),
    notes: optStr(formData.get("notes")),
  });

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function updateMaterial(formData: FormData) {
  const id = num(formData.get("id"));
  const name = str(formData.get("name"));
  if (!id || !name) return;
  const unit = asUnit(formData.get("displayUnit"));
  const quantity = num(formData.get("quantity"));
  const thresholdRaw = str(formData.get("reorderThreshold"));

  await db
    .update(ingredients)
    .set({
      name,
      displayUnit: unit,
      quantityGrams: toGrams(quantity, unit),
      reorderThresholdGrams: thresholdRaw
        ? toGrams(num(thresholdRaw), unit)
        : null,
      supplier: optStr(formData.get("supplier")),
      notes: optStr(formData.get("notes")),
      updatedAt: new Date(),
    })
    .where(eq(ingredients.id, id));

  revalidatePath("/inventory");
  redirect("/inventory");
}

// Quick "I just received more of this" — adds to existing stock.
export async function addStock(formData: FormData) {
  const id = num(formData.get("id"));
  const unit = asUnit(formData.get("unit"));
  const amount = num(formData.get("amount"));
  if (!id || amount === 0) return;

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

  const used = await db
    .select({ id: recipeIngredients.id })
    .from(recipeIngredients)
    .where(eq(recipeIngredients.ingredientId, id))
    .limit(1);
  if (used.length) {
    throw new Error(
      "This material is used in a recipe. Remove it from the recipe first."
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
  const volume = num(formData.get("volume"));

  await db
    .update(glazes)
    .set({
      name,
      recipeId: optId(formData.get("recipeId")),
      volumeMl: toMl(volume, unit),
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
export async function adjustGlazeVolume(formData: FormData) {
  const id = num(formData.get("id"));
  const unit = asVolumeUnit(formData.get("unit"));
  const amount = num(formData.get("amount"));
  const direction = str(formData.get("direction")) === "use" ? -1 : 1;
  if (!id || amount === 0) return;

  await db
    .update(glazes)
    .set({
      volumeMl: sql`${glazes.volumeMl} + ${direction * toMl(amount, unit)}`,
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

// Create or update a recipe in one call. Ingredient names that don't exist yet
// are created automatically (at 0 stock).
export async function saveRecipe(input: {
  id?: number;
  name: string;
  notes?: string | null;
  lines: RecipeLineInput[];
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Please give the glaze a name.");

  const cleanLines = input.lines
    .map((l) => ({ name: l.name.trim(), percentage: Number(l.percentage) }))
    .filter((l) => l.name.length > 0 && Number.isFinite(l.percentage));

  let recipeId = input.id;

  if (recipeId) {
    await db
      .update(recipes)
      .set({ name, notes: input.notes ?? null, updatedAt: new Date() })
      .where(eq(recipes.id, recipeId));
    await db
      .delete(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId));
  } else {
    const created = await db
      .insert(recipes)
      .values({ name, notes: input.notes ?? null })
      .returning({ id: recipes.id });
    recipeId = created[0].id;
  }

  let order = 0;
  for (const line of cleanLines) {
    const ingredientId = await getOrCreateIngredientId(line.name);
    if (!ingredientId) continue;
    await db.insert(recipeIngredients).values({
      recipeId,
      ingredientId,
      percentage: line.percentage,
      sortOrder: order++,
    });
  }

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
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

  const lines = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeId));
  if (!lines.length) throw new Error("This recipe has no ingredients yet.");

  const producedVolume = num0(Number(input.producedVolume));
  const producedUnit = input.producedUnit ?? "quart";
  const producedMl = producedVolume > 0 ? toMl(producedVolume, producedUnit) : 0;

  await db.transaction(async (tx) => {
    // If a finished volume was produced, find the glaze bucket linked to this
    // recipe (auto-create one named after the recipe if none exists yet).
    let glazeId: number | null = null;
    if (producedMl > 0) {
      const existing = await tx
        .select({ id: glazes.id })
        .from(glazes)
        .where(eq(glazes.recipeId, recipeId))
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
    const [batch] = await tx
      .select()
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

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

    // Reverse the finished volume this batch added to a glaze bucket, if any.
    if (batch?.glazeId && batch.producedMl) {
      await tx
        .update(glazes)
        .set({
          volumeMl: sql`${glazes.volumeMl} - ${batch.producedMl}`,
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
