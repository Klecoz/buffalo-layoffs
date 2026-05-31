import { describe, expect, it } from "vitest";
import type { LayoffEvent } from "../../shared/types";
import { toCsv } from "./exportCsv";

function ev(over: Partial<LayoffEvent>): LayoffEvent {
  return {
    id: "x",
    company: "Acme",
    county: "Erie",
    region: "Western",
    numberAffected: 50,
    totalEmployees: null,
    noticeDate: "2024-06-01",
    datePosted: null,
    layoffDate: null,
    closingDate: null,
    classification: "layoff",
    reason: null,
    industry: null,
    union: null,
    isAmendment: false,
    amends: null,
    source: "warn_pdf",
    sourceUrl: null,
    dataQuality: "complete",
    parseWarnings: [],
    ...over,
  };
}

describe("toCsv", () => {
  it("emits a header row plus one row per event", () => {
    const csv = toCsv([ev({}), ev({ company: "Beta" })]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Company");
    expect(lines[1]).toContain("Acme");
    expect(lines[2]).toContain("Beta");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv([ev({ company: 'Smith, Jones & "Co"', reason: "line1\nline2" })]);
    const row = csv.split("\r\n")[1];
    expect(row).toContain('"Smith, Jones & ""Co"""');
    expect(row).toContain('"line1\nline2"');
  });

  it("renders null fields as empty and booleans as text", () => {
    const row = toCsv([ev({ numberAffected: null, isAmendment: true })]).split("\r\n")[1];
    const cells = row.split(",");
    // numberAffected is the 3rd column -> empty
    expect(cells[2]).toBe("");
    expect(row).toContain("true");
  });
});
