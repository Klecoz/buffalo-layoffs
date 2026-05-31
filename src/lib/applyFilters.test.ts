import { describe, expect, it } from "vitest";
import type { LayoffEvent } from "../../shared/types";
import { applyFilters, EMPTY_FILTERS, type Filters } from "./applyFilters";

function ev(over: Partial<LayoffEvent>): LayoffEvent {
  return {
    id: Math.random().toString(36).slice(2),
    company: "Acme Manufacturing",
    county: "Erie",
    region: "Western",
    numberAffected: 50,
    totalEmployees: null,
    noticeDate: "2024-06-01",
    datePosted: null,
    layoffDate: null,
    closingDate: null,
    classification: "layoff",
    reason: "Economic",
    industry: "Manufacturing",
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

const f = (over: Partial<Filters>): Filters => ({ ...EMPTY_FILTERS, ...over });

describe("applyFilters", () => {
  const data = [
    ev({ company: "Tesla", county: "Erie", classification: "layoff", numberAffected: 285 }),
    ev({
      company: "Mayer Bros",
      county: "Niagara",
      classification: "plant_closing",
      numberAffected: 26,
    }),
    ev({ company: "Flying Bison", county: "Erie", source: "curated_news", numberAffected: null }),
    ev({ company: "Old Notice", isAmendment: true }),
  ];

  it("hides amendments by default and shows them when asked", () => {
    expect(applyFilters(data, EMPTY_FILTERS).map((e) => e.company)).not.toContain("Old Notice");
    expect(applyFilters(data, f({ showAmendments: true })).map((e) => e.company)).toContain(
      "Old Notice",
    );
  });

  it("filters by county", () => {
    const out = applyFilters(data, f({ counties: ["Niagara"] }));
    expect(out.map((e) => e.company)).toEqual(["Mayer Bros"]);
  });

  it("filters by classification and source", () => {
    expect(applyFilters(data, f({ classifications: ["plant_closing"] }))).toHaveLength(1);
    expect(applyFilters(data, f({ sources: ["curated_news"] }))[0].company).toBe("Flying Bison");
  });

  it("applies minAffected but keeps unknown-count events", () => {
    const out = applyFilters(data, f({ minAffected: 100 }));
    const names = out.map((e) => e.company);
    expect(names).toContain("Tesla"); // 285 >= 100
    expect(names).not.toContain("Mayer Bros"); // 26 < 100
    expect(names).toContain("Flying Bison"); // null count is not filtered out
  });

  it("searches across company, reason, industry, county", () => {
    expect(applyFilters(data, f({ search: "tesla" }))).toHaveLength(1);
    expect(applyFilters(data, f({ search: "manufacturing" })).length).toBeGreaterThan(0);
  });

  it("filters by date range", () => {
    const dated = [ev({ noticeDate: "2024-01-01" }), ev({ noticeDate: "2025-01-01" })];
    expect(applyFilters(dated, f({ dateStart: "2024-12-01" }))).toHaveLength(1);
  });
});
