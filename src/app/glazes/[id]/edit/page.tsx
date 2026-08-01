import { notFound } from "next/navigation";
import { db } from "@/db";
import { glazes, recipes } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { GlazeForm } from "@/components/GlazeForm";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";

export default async function EditGlazePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const glaze = await db.query.glazes.findFirst({
    where: eq(glazes.id, Number(id)),
  });
  if (!glaze) notFound();

  const recipeList = await db
    .select({ id: recipes.id, name: recipes.name })
    .from(recipes)
    .orderBy(asc(recipes.name));

  return (
    <div className="space-y-5">
      <BackLink href={`/glazes/${glaze.id}`} label="Back to glaze" />
      <h1 className="text-2xl font-bold text-stone-900">Edit glaze</h1>
      <GlazeForm glaze={glaze} recipes={recipeList} />
    </div>
  );
}
