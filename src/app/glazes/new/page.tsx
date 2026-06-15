import { db } from "@/db";
import { recipes } from "@/db/schema";
import { asc } from "drizzle-orm";
import { GlazeForm } from "@/components/GlazeForm";

export const dynamic = "force-dynamic";

export default async function NewGlazePage() {
  const recipeList = await db
    .select({ id: recipes.id, name: recipes.name })
    .from(recipes)
    .orderBy(asc(recipes.name));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-900">Add mixed glaze</h1>
      <GlazeForm recipes={recipeList} />
    </div>
  );
}
