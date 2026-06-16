import { db } from "@/db";
import { glazes, recipes } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { fromMl, type VolumeUnit } from "@/lib/units";
import { toCsv, csvDownloadHeaders, datedFilename } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      name: glazes.name,
      volumeMl: glazes.volumeMl,
      displayVolumeUnit: glazes.displayVolumeUnit,
      status: glazes.status,
      notes: glazes.notes,
      recipeName: recipes.name,
    })
    .from(glazes)
    .leftJoin(recipes, eq(glazes.recipeId, recipes.id))
    .orderBy(asc(glazes.name));

  const csv = toCsv(
    ["Name", "Volume", "Unit", "Volume (mL)", "Status", "Recipe", "Notes"],
    rows.map((g) => {
      const unit = g.displayVolumeUnit as VolumeUnit;
      return [
        g.name,
        Number(fromMl(g.volumeMl, unit).toFixed(2)),
        unit,
        Number(g.volumeMl.toFixed(2)),
        g.status,
        g.recipeName,
        g.notes,
      ];
    })
  );

  return new Response(csv, { headers: csvDownloadHeaders(datedFilename("glazes")) });
}
