import { describe, expect, it } from "vitest";
import type { LayoffEvent } from "../../shared/types";
import { monthlyBuckets, summarize } from "./aggregate";

function ev(over: Partial<LayoffEvent>): LayoffEvent {
  return {
    id: Math.random().toString(36).slice(2),
    company: "Acme",
    county: "Erie",
    region: "Western",
    numberAffected: 10,
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

describe("summarize — the totals-exclusion invariant", () => {
  it("excludes null-count and incomplete events from jobs lost, but counts them as events", () => {
    const events = [
      ev({ numberAffected: 100 }),
      ev({ numberAffected: 50 }),
      ev({ numberAffected: null, dataQuality: "incomplete" }),
      ev({ numberAffected: 999, dataQuality: "incomplete" }), // count present but flagged
    ];
    const s = summarize(events);
    expect(s.totalEvents).toBe(4);
    expect(s.totalJobsLost).toBe(150); // 999 NOT counted despite having a number
    expect(s.excludedCount).toBe(2);
  });

  it("picks the biggest among counted events only", () => {
    const events = [
      ev({ numberAffected: 80, company: "B" }),
      ev({ numberAffected: 1380, company: "Big" }),
      ev({ numberAffected: null, company: "Unknown", dataQuality: "incomplete" }),
    ];
    expect(summarize(events).biggest?.company).toBe("Big");
  });

  it("handles an all-unknown set without dividing by zero", () => {
    const s = summarize([ev({ numberAffected: null, dataQuality: "incomplete" })]);
    expect(s.totalJobsLost).toBe(0);
    expect(s.averageAffected).toBeNull();
    expect(s.biggest).toBeNull();
  });
});

describe("monthlyBuckets", () => {
  it("fills empty months across the span and counts jobs from known counts only", () => {
    const events = [
      ev({ noticeDate: "2024-01-15", numberAffected: 30 }),
      ev({ noticeDate: "2024-03-02", numberAffected: 20 }),
      ev({ noticeDate: "2024-03-20", numberAffected: null, dataQuality: "incomplete" }),
    ];
    const buckets = monthlyBuckets(events);
    expect(buckets.map((b) => b.month)).toEqual(["2024-01", "2024-02", "2024-03"]);
    expect(buckets[1]).toEqual({ month: "2024-02", events: 0, jobs: 0 }); // gap filled
    expect(buckets[2].events).toBe(2);
    expect(buckets[2].jobs).toBe(20); // null-count event not summed
  });

  it("spans across a year boundary", () => {
    const buckets = monthlyBuckets([
      ev({ noticeDate: "2024-11-01" }),
      ev({ noticeDate: "2025-02-01" }),
    ]);
    expect(buckets.map((b) => b.month)).toEqual(["2024-11", "2024-12", "2025-01", "2025-02"]);
  });
});
