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

/**
 * Parse CSV text into rows of string fields. Tolerant of what spreadsheet
 * apps actually produce: an optional UTF-8 BOM, CRLF or LF line endings, and
 * quoted fields containing commas, newlines, and doubled quotes. Empty
 * trailing lines are dropped.
 */
export function parseCsv(text: string): string[][] {
  let input = text;
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
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
