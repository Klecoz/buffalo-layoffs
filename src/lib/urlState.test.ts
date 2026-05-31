import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, type Filters } from "./applyFilters";
import { buildSearch, hasUrlFilters, parseFilters, parseTab } from "./urlState";

const f = (over: Partial<Filters>): Filters => ({ ...EMPTY_FILTERS, ...over });

describe("urlState", () => {
  it("round-trips a fully-populated filter set", () => {
    const filters = f({
      search: "tesla",
      counties: ["Erie", "Niagara"],
      classifications: ["plant_closing"],
      sources: ["warn_pdf", "curated_news"],
      minAffected: 100,
      dateStart: "2024-01-01",
      dateEnd: "2025-12-31",
      showAmendments: true,
    });
    expect(parseFilters(buildSearch(filters))).toEqual(filters);
  });

  it("produces an empty query string for default filters", () => {
    expect(buildSearch(EMPTY_FILTERS)).toBe("");
    expect(parseFilters("")).toEqual(EMPTY_FILTERS);
  });

  it("drops invalid enum values and malformed dates", () => {
    const parsed = parseFilters("county=Erie,Atlantis&type=bogus&from=not-a-date&min=-5");
    expect(parsed.counties).toEqual(["Erie"]);
    expect(parsed.classifications).toEqual([]);
    expect(parsed.dateStart).toBeNull();
    expect(parsed.minAffected).toBeNull();
  });

  it("round-trips the active view tab and omits the default", () => {
    expect(buildSearch(EMPTY_FILTERS, "ledger")).toBe("");
    expect(parseTab(buildSearch(EMPTY_FILTERS, "timeline"))).toBe("timeline");
    expect(parseTab("view=bogus")).toBeNull();
    expect(parseTab("")).toBeNull();
  });

  it("detects whether a query string carries non-default filters", () => {
    expect(hasUrlFilters("")).toBe(false);
    expect(hasUrlFilters("q=acme")).toBe(true);
  });
});
