import { describe, expect, it } from "vitest";
import type { LayoffEvent } from "../shared/types.ts";
import { classifyCounty, dedupe, withinWindow } from "./normalize.ts";

function event(over: Partial<LayoffEvent>): LayoffEvent {
  return {
    id: Math.random().toString(36).slice(2),
    company: "Acme Co",
    county: "Erie",
    region: "Western",
    numberAffected: 50,
    totalEmployees: null,
    noticeDate: "2024-06-01",
    datePosted: "2024-06-01",
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

describe("classifyCounty", () => {
  it("keeps Erie and Niagara", () => {
    expect(classifyCounty("Erie")).toEqual({ keep: true, county: "Erie" });
    expect(classifyCounty("Niagara")).toEqual({ keep: true, county: "Niagara" });
  });
  it("keeps a missing county as unknown (Western WDB is mostly Erie/Niagara)", () => {
    expect(classifyCounty(null)).toEqual({ keep: true, county: "unknown" });
    expect(classifyCounty("")).toEqual({ keep: true, county: "unknown" });
  });
  it("drops other named counties", () => {
    expect(classifyCounty("Chautauqua").keep).toBe(false);
    expect(classifyCounty("Allegany").keep).toBe(false);
  });
});

describe("withinWindow", () => {
  it("excludes notices before 2024", () => {
    expect(withinWindow(event({ noticeDate: "2023-12-31" }))).toBe(false);
    expect(withinWindow(event({ noticeDate: "2024-01-01" }))).toBe(true);
  });
});

describe("dedupe — amendments and cross-source duplicates", () => {
  it("collapses an amended notice for the same company into one canonical record", () => {
    const original = event({ id: "a", noticeDate: "2024-11-07", datePosted: "2024-11-07" });
    const amended = event({
      id: "b",
      noticeDate: "2024-11-07",
      datePosted: "2025-02-14",
      parseWarnings: ["notice date not found"],
    });
    const out = dedupe([original, amended]);
    const canonical = out.filter((e) => !e.isAmendment);
    const superseded = out.filter((e) => e.isAmendment);
    expect(canonical).toHaveLength(1);
    expect(superseded).toHaveLength(1);
    // The cleaner record (no warnings) wins as canonical.
    expect(canonical[0].id).toBe("a");
    expect(superseded[0].amends).toBe("a");
  });

  it("prefers an official WARN record over a curated one for the same event", () => {
    const warn = event({ id: "w", company: "Oldcastle APG", source: "warn_pdf" });
    const curated = event({
      id: "c",
      company: "Oldcastle APG, Inc.",
      source: "curated_news",
      dataQuality: "incomplete",
      numberAffected: null,
    });
    const out = dedupe([curated, warn]);
    const canonical = out.find((e) => !e.isAmendment);
    expect(canonical?.id).toBe("w");
  });

  it("does not merge different companies", () => {
    const a = event({ company: "Tesla, Inc." });
    const b = event({ company: "First Transit, Inc." });
    const out = dedupe([a, b]);
    expect(out.filter((e) => !e.isAmendment)).toHaveLength(2);
  });

  it("does not merge the same company far apart in time", () => {
    const a = event({ company: "Tesla, Inc.", noticeDate: "2024-04-16" });
    const b = event({ company: "Tesla, Inc.", noticeDate: "2024-11-01" });
    const out = dedupe([a, b]);
    expect(out.filter((e) => !e.isAmendment)).toHaveLength(2);
  });

  it("keeps distinct same-company notices weeks apart with different counts (Tesla 2024 waves)", () => {
    const waves = [
      event({ company: "Tesla, Inc.", noticeDate: "2024-04-16", numberAffected: 285 }),
      event({ company: "Tesla Inc.", noticeDate: "2024-04-29", numberAffected: 26 }),
      event({ company: "Tesla Inc.", noticeDate: "2024-05-03", numberAffected: 4 }),
      event({ company: "Tesla Inc.", noticeDate: "2024-05-13", numberAffected: 27 }),
    ];
    const canonical = dedupe(waves).filter((e) => !e.isAmendment);
    expect(canonical).toHaveLength(4);
  });

  it("merges an amendment that shares the original notice date", () => {
    const original = event({ id: "o", company: "Sumitomo Rubber USA, LLC", noticeDate: "2024-11-07" });
    const amended = event({
      id: "am",
      company: "Sumitomo Rubber USA., LLC",
      noticeDate: "2024-11-07",
      datePosted: "2025-03-21",
      isAmendment: true,
    });
    const canonical = dedupe([original, amended]).filter((e) => !e.isAmendment);
    expect(canonical).toHaveLength(1);
  });
});
