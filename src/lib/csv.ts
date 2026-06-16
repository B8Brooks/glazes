// Minimal, dependency-free CSV builder. Always-quotes every field so commas,
// quotes, and newlines in glaze names/notes can never corrupt the file. A
// UTF-8 BOM is prepended so Excel and Google Sheets open accented characters
// correctly.

export type CsvCell = string | number | null | undefined;

const BOM = "﻿";

function quote(cell: CsvCell): string {
  if (cell === null || cell === undefined) return '""';
  return `"${String(cell).replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(quote).join(","));
  return BOM + lines.join("\r\n") + "\r\n";
}

/** Standard headers for a CSV file download. */
export function csvDownloadHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}

/** e.g. "glazes-materials-2026-06-15.csv" */
export function datedFilename(dataset: string, ext = "csv"): string {
  const date = new Date().toISOString().slice(0, 10);
  return `glazes-${dataset}-${date}.${ext}`;
}
