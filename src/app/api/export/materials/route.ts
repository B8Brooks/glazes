import { db } from "@/db";
import { ingredients } from "@/db/schema";
import { asc } from "drizzle-orm";
import { fromGrams, type DisplayUnit } from "@/lib/units";
import { toCsv, csvDownloadHeaders, datedFilename } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(ingredients).orderBy(asc(ingredients.name));

  const csv = toCsv(
    ["Name", "Quantity", "Unit", "Quantity (g)", "Reorder threshold (g)", "Supplier", "Notes"],
    rows.map((m) => {
      const unit = m.displayUnit as DisplayUnit;
      return [
        m.name,
        Number(fromGrams(m.quantityGrams, unit).toFixed(2)),
        unit,
        Number(m.quantityGrams.toFixed(2)),
        m.reorderThresholdGrams != null
          ? Number(m.reorderThresholdGrams.toFixed(2))
          : null,
        m.supplier,
        m.notes,
      ];
    })
  );

  return new Response(csv, { headers: csvDownloadHeaders(datedFilename("materials")) });
}
