import { db } from "@/db";
import { ingredients } from "@/db/schema";
import { asc } from "drizzle-orm";
import { RecipeEntryForm } from "@/components/RecipeEntryForm";

export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const known = await db
    .select({ name: ingredients.name })
    .from(ingredients)
    .orderBy(asc(ingredients.name));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-900">New recipe</h1>
      <RecipeEntryForm knownIngredients={known.map((k) => k.name)} />
    </div>
  );
}
