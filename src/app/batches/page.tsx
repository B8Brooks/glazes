import Link from "next/link";
import { db } from "@/db";
import { batches, glazes, recipes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { BackLink } from "@/components/BackLink";
import { undoBatch } from "@/lib/actions";
import { formatVolume, type VolumeUnit } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function BatchesPage() {
  const rows = await db
    .select({
      id: batches.id,
      recipeId: batches.recipeId,
      recipeName: recipes.name,
      batchGrams: batches.batchGrams,
      producedMl: batches.producedMl,
      bucketName: glazes.name,
      bucketUnit: glazes.displayVolumeUnit,
      notes: batches.notes,
      mixedAt: batches.mixedAt,
    })
    .from(batches)
    .innerJoin(recipes, eq(batches.recipeId, recipes.id))
    .leftJoin(glazes, eq(batches.glazeId, glazes.id))
    .orderBy(desc(batches.mixedAt))
    .limit(100);

  return (
    <div className="space-y-5">
      <BackLink href="/" label="Home" />
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Batch history</h1>
        <p className="mt-1 text-stone-600">
          Every batch you&apos;ve mixed, newest first. Undo puts the materials
          back and removes the volume it added.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
          No batches yet — mix one from a recipe page and it will show up here.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/recipes/${b.recipeId}`}
                    className="font-semibold text-stone-900 hover:underline"
                  >
                    {b.recipeName}
                  </Link>
                  <div className="text-sm text-stone-600">
                    {b.batchGrams} g batch
                    {b.producedMl ? (
                      <>
                        {" "}
                        · made{" "}
                        {formatVolume(
                          b.producedMl,
                          (b.bucketUnit ?? "quart") as VolumeUnit
                        )}
                        {b.bucketName ? ` into ${b.bucketName}` : ""}
                      </>
                    ) : null}
                  </div>
                  <div className="text-xs text-stone-400">
                    {new Date(b.mixedAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  {b.notes && (
                    <p className="mt-1 text-sm text-stone-500">{b.notes}</p>
                  )}
                </div>
                <form action={undoBatch}>
                  <input type="hidden" name="batchId" value={b.id} />
                  <input type="hidden" name="recipeId" value={b.recipeId} />
                  <ConfirmButton
                    message={`Undo this ${b.batchGrams} g batch of ${b.recipeName}? The materials it used will be added back to your inventory.`}
                    className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                  >
                    Undo
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
