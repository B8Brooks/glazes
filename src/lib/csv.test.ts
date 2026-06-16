import { describe, it, expect } from "vitest";
import { toCsv, datedFilename } from "./csv";

describe("toCsv", () => {
  it("quotes every field and joins with CRLF", () => {
    const out = toCsv(["A", "B"], [["x", 1]]);
    // strip the leading BOM for comparison
    expect(out.replace(/^﻿/, "")).toBe('"A","B"\r\n"x","1"\r\n');
  });

  it("escapes embedded quotes by doubling them", () => {
    const out = toCsv(["Name"], [['TJ\'s "Satin" Clear']]);
    expect(out).toContain('"TJ\'s ""Satin"" Clear"');
  });

  it("keeps commas and newlines inside a single quoted field", () => {
    const out = toCsv(["Notes"], [["dryish, almost\nempty"]]);
    expect(out).toContain('"dryish, almost\nempty"');
    // only the header row separator + one data row + trailing CRLF
    expect(out.replace(/^﻿/, "").trimEnd().split("\r\n")).toHaveLength(2);
  });

  it("renders null/undefined as empty quoted fields", () => {
    const out = toCsv(["A", "B"], [[null, undefined]]);
    expect(out).toContain('"",""');
  });

  it("starts with a UTF-8 BOM for spreadsheet compatibility", () => {
    expect(toCsv(["A"], []).charCodeAt(0)).toBe(0xfeff);
  });
});

describe("datedFilename", () => {
  it("builds a dated filename with the dataset and extension", () => {
    expect(datedFilename("materials")).toMatch(
      /^glazes-materials-\d{4}-\d{2}-\d{2}\.csv$/
    );
    expect(datedFilename("backup", "json")).toMatch(/\.json$/);
  });
});
