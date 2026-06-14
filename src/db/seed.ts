// Optional starter data. Run with: npm run db:seed
// Safe to skip — the app works fine starting empty.
import "dotenv/config";
import { db } from "./index";
import { ingredients, recipes, recipeIngredients } from "./schema";
import { eq } from "drizzle-orm";
import { toGrams } from "../lib/units";

async function main() {
  const materials = [
    { name: "Custer Feldspar", lb: 50 },
    { name: "Silica", lb: 50 },
    { name: "EPK Kaolin", lb: 25 },
    { name: "Whiting", lb: 25 },
  ];

  for (const m of materials) {
    const existing = await db
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.name, m.name))
      .limit(1);
    if (existing.length) continue;
    await db.insert(ingredients).values({
      name: m.name,
      displayUnit: "lb",
      quantityGrams: toGrams(m.lb, "lb"),
    });
  }

  const all = await db.select().from(ingredients);
  const byName = (n: string) => all.find((i) => i.name === n)!;

  const [recipe] = await db
    .insert(recipes)
    .values({ name: "Glossy Clear (example)", notes: "Cone 6 example recipe" })
    .returning();

  await db.insert(recipeIngredients).values([
    { recipeId: recipe.id, ingredientId: byName("Custer Feldspar").id, percentage: 25, sortOrder: 0 },
    { recipeId: recipe.id, ingredientId: byName("Silica").id, percentage: 35, sortOrder: 1 },
    { recipeId: recipe.id, ingredientId: byName("EPK Kaolin").id, percentage: 20, sortOrder: 2 },
    { recipeId: recipe.id, ingredientId: byName("Whiting").id, percentage: 20, sortOrder: 3 },
  ]);

  console.log("Seeded starter materials and one example recipe.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
