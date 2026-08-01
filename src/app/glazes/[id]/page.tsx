import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { batches, glazes, recipes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { BackLink } from "@/components/BackLink";
import { ConfirmButton } from "@/components/ConfirmButton";
import { QuickAdjustForm } from "@/components/QuickAdjustForm";
import { deleteGlaze } from "@/lib/actions";
import { statusBadgeClass } from "@/lib/glazeStatus";
import { formatVolume, type VolumeUnit } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function GlazeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const glazeId = Number(id);

  const glaze = await db.query.glazes.findFirst({
    where: eq(glazes.id, glazeId),
  });
  if (!glaze) notFound();

  const recipe = glaze.recipeId
    ? await db.query.recipes.findFirst({
        where: eq(recipes.id, glaze.recipeId),
      })
    : null;

  const fills = await db
    .select()
    .from(batches)
    .where(eq(batches.glazeId, glazeId))
    .orderBy(desc(batches.mixedAt))
    .limit(10);

  const unit = glaze.displayVolumeUnit as VolumeUnit;

  return (
    <div className="space-y-6">
      <BackLink href="/glazes" label="Glazes" />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900">{glaze.name}</h1>
            {glaze.status && (
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                  glaze.status
                )}`}
              >
                {glaze.status}
              </span>
            )}
          </div>
          <p className="mt-1 text-lg text-stone-700">
            {formatVolume(glaze.volumeMl, unit)} on hand
          </p>
          {recipe && (
            <Link
              href={`/recipes/${recipe.id}`}
              className="text-sm text-stone-500 hover:underline"
            >
              Recipe: {recipe.name} →
            </Link>
          )}
          {glaze.notes && (
            <p className="mt-1 text-sm text-stone-600">{glaze.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/glazes/${glaze.id}/edit`}
            className="rounded-lg border border-stone-300 px-3 py-2 font-medium text-stone-700 hover:bg-stone-100"
          >
            Edit
          </Link>
          <form action={deleteGlaze}>
            <input type="hidden" name="id" value={glaze.id} />
            <ConfirmButton
              message={`Delete "${glaze.name}"? This can't be undone.`}
              className="rounded-lg px-3 py-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">
          Used some, or topped up?
        </h2>
        <div className="mt-3">
          <QuickAdjustForm glazeId={glaze.id} defaultUnit={unit} />
        </div>
      </div>

      {fills.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">
            Batches mixed into this bucket
          </h2>
          <ul className="mt-2 divide-y divide-stone-100">
            {fills.map((b) => (
              <li key={b.id} className="py-2 text-sm text-stone-700">
                {b.producedMl
                  ? formatVolume(b.producedMl, unit)
                  : `${b.batchGrams} g batch`}
                <span className="text-stone-400">
                  {" "}
                  · {new Date(b.mixedAt).toLocaleDateString()}
                </span>
                {b.notes && (
                  <span className="block text-xs text-stone-500">
                    {b.notes}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-stone-400">
        Last updated {new Date(glaze.updatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
