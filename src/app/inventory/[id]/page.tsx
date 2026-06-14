import { notFound } from "next/navigation";
import { db } from "@/db";
import { ingredients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MaterialForm } from "@/components/MaterialForm";

export const dynamic = "force-dynamic";

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const material = await db.query.ingredients.findFirst({
    where: eq(ingredients.id, Number(id)),
  });
  if (!material) notFound();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-900">Edit material</h1>
      <MaterialForm material={material} />
    </div>
  );
}
