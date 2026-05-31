import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseWarnFields } from "./parse-pdf.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const viantLines: string[] = JSON.parse(
  readFileSync(join(HERE, "__fixtures__", "viant-erie-2024.lines.json"), "utf-8"),
);

describe("parseWarnFields — real WARN PDF (Viant, Erie County 2024)", () => {
  const parsed = parseWarnFields(viantLines);

  it("extracts the company name from the line below the label", () => {
    expect(parsed.company).toBe("Viant ASO&O Holdings, LLC");
  });

  it("extracts the affected-worker count, preferring the headline figure", () => {
    expect(parsed.numberAffected).toBe(80);
  });

  it("extracts total site employment", () => {
    expect(parsed.totalEmployees).toBe(322);
  });

  it("normalizes county and region", () => {
    expect(parsed.county).toBe("Erie");
    expect(parsed.region).toBe("Western");
  });

  it("parses long-form dates to ISO", () => {
    expect(parsed.noticeDate).toBe("2024-12-06");
    expect(parsed.layoffDate).toBe("2025-03-10");
  });

  it("strips the NAICS prefix from industry", () => {
    expect(parsed.industry).toBe("Manufacturing");
  });

  it("classifies a non-closure notice as a layoff", () => {
    expect(parsed.classification).toBe("layoff");
    expect(parsed.reason).toBe("Other");
  });

  it("detects non-union status", () => {
    expect(parsed.union).toBe("Non-union");
  });

  it("reports no parse warnings for a clean notice", () => {
    expect(parsed.parseWarnings).toEqual([]);
  });
});

describe("parseWarnFields — fallback for a messy/partial notice", () => {
  // A scanned-style notice where the numeric fields never made it into the text
  // layer. We must keep the record but flag it, with null counts.
  const messy = [
    "NEW YORK STATE DEPARTMENT OF LABOR",
    "WARN UNIT",
    "Company:",
    "Mystery Manufacturing Inc.",
    "Region: Western",
    "County: Niagara",
    "Date of Notice: 3/14/2025",
    "Reason For Closure: Economic",
    "Closure Start Date: April 1, 2025",
  ];
  const parsed = parseWarnFields(messy);

  it("still extracts what it can", () => {
    expect(parsed.company).toBe("Mystery Manufacturing Inc.");
    expect(parsed.county).toBe("Niagara");
    expect(parsed.noticeDate).toBe("2025-03-14");
  });

  it("leaves missing counts null and records a warning", () => {
    expect(parsed.numberAffected).toBeNull();
    expect(parsed.totalEmployees).toBeNull();
    expect(parsed.parseWarnings).toContain("number affected not found");
  });

  it("classifies a closure from the reason text", () => {
    expect(parsed.classification).toBe("plant_closing");
  });
});
