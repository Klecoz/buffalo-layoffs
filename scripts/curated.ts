// Stage: load the hand-curated "notable layoffs" list — news-reported events
// (often below the WARN threshold) that the official data misses. These are
// always flagged source:"curated_news" so the UI can mark them as news-sourced
// and visually distinct from official WARN filings.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { LayoffEvent } from "../shared/types.ts";
import { makeId } from "./lib/ids.ts";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected ISO YYYY-MM-DD");

const CuratedEntry = z.object({
  company: z.string().min(1),
  county: z.enum(["Erie", "Niagara", "unknown"]),
  numberAffected: z.number().int().nonnegative().nullable(),
  noticeDate: isoDate,
  layoffDate: isoDate.nullable().default(null),
  classification: z.enum(["plant_closing", "layoff", "other", "unknown"]),
  reason: z.string().nullable().default(null),
  industry: z.string().nullable().default(null),
  sourceUrl: z.string().url(),
  note: z.string().optional(),
});

export function loadCurated(): LayoffEvent[] {
  const HERE = dirname(fileURLToPath(import.meta.url));
  const path = join(HERE, "curated", "notable.json");
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const entries = z.array(CuratedEntry).parse(raw);

  return entries.map((e) => ({
    id: makeId([e.company, e.noticeDate, "curated"]),
    company: e.company,
    county: e.county,
    region: "Western",
    numberAffected: e.numberAffected,
    totalEmployees: null,
    noticeDate: e.noticeDate,
    datePosted: null,
    layoffDate: e.layoffDate,
    closingDate: e.classification === "plant_closing" ? e.layoffDate : null,
    classification: e.classification,
    reason: e.reason,
    industry: e.industry,
    union: null,
    isAmendment: false,
    amends: null,
    source: "curated_news",
    sourceUrl: e.sourceUrl,
    dataQuality: e.numberAffected == null ? "incomplete" : "complete",
    parseWarnings: e.note ? [e.note] : [],
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const events = loadCurated();
  console.log(`Loaded ${events.length} curated notable layoffs.`);
}
