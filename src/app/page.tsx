import Link from "next/link";
import { db } from "@/db";
import { glazes, ingredients } from "@/db/schema";
import { and, inArray, isNotNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function AlertChip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
    >
      {children}
    </Link>
  );
}

export default async function Home() {
  const [lowMaterials] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ingredients)
    .where(
      and(
        isNotNull(ingredients.reorderThresholdGrams),
        sql`${ingredients.quantityGrams} <= ${ingredients.reorderThresholdGrams}`
      )
    );
  const [needAttention] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(glazes)
    .where(inArray(glazes.status, ["Dryish", "Chunky", "Empty"]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">
          Sheila&apos;s Glazes
        </h1>
        <p className="mt-1 text-stone-600">
          Keep track of your glaze recipes and how much of each material you
          have left.
        </p>
      </div>

      {(lowMaterials.count > 0 || needAttention.count > 0) && (
        <div className="flex flex-wrap gap-2">
          {lowMaterials.count > 0 && (
            <AlertChip href="/inventory">
              {lowMaterials.count}{" "}
              {lowMaterials.count === 1 ? "material is" : "materials are"} low —
              time to reorder
            </AlertChip>
          )}
          {needAttention.count > 0 && (
            <AlertChip href="/glazes">
              {needAttention.count}{" "}
              {needAttention.count === 1 ? "bucket needs" : "buckets need"}{" "}
              attention
            </AlertChip>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/recipes"
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:border-stone-300 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-stone-900">Recipes</h2>
          <p className="mt-1 text-sm text-stone-600">
            Write down a glaze by name and its ingredient percentages, then mix
            a batch in grams.
          </p>
        </Link>

        <Link
          href="/glazes"
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:border-stone-300 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-stone-900">Glazes</h2>
          <p className="mt-1 text-sm text-stone-600">
            Your mixed glaze buckets, tracked by volume (cups, quarts, gallons)
            with a quick consistency note.
          </p>
        </Link>

        <Link
          href="/inventory"
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:border-stone-300 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-stone-900">Materials</h2>
          <p className="mt-1 text-sm text-stone-600">
            Raw dry materials in pounds. Mixing a batch subtracts what you used
            automatically.
          </p>
        </Link>
      </div>
    </div>
  );
}
