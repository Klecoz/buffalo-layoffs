// Stage E: merge all sources into the final dataset.
//   WARN PDFs (2024–Mar 2025) + Tableau CSV (Apr 2025+) + curated news events
//   → county-filter to Erie/Niagara (keep "unknown" Western, drop other counties)
//   → apply the 2024+ date window
//   → dedup amendments / cross-source duplicates
//   → emit public/data/layoffs.json + meta.json
//
// Pure helpers (classifyCounty, dedupe, …) are exported for unit testing; main()
// just wires file I/O around them.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { County, DatasetMeta, LayoffEvent, SourceKind } from "../shared/types.ts";
import { loadCurated } from "./curated.ts";
import { loadTableau } from "./ingest-tableau.ts";
import { parseDate } from "./lib/dates.ts";
import { companyKey, makeId } from "./lib/ids.ts";
import type { ParsedWarn } from "./parse-pdf.ts";
import type { IndexEntry } from "./scrape-index.ts";

export const DATE_WINDOW_START = "2024-01-01";

/** Decide whether a raw county string belongs to the Buffalo–Niagara metro.
 *  Erie/Niagara are kept; a missing county on a Western notice is kept as
 *  "unknown" (the Western WDB is overwhelmingly Erie/Niagara); any other named
 *  county (Chautauqua, Allegany, …) is dropped. */
export function classifyCounty(raw: string | null): { keep: boolean; county: County } {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return { keep: true, county: "unknown" };
  if (v.startsWith("erie")) return { keep: true, county: "Erie" };
  if (v.startsWith("niagara")) return { keep: true, county: "Niagara" };
  return { keep: false, county: "unknown" };
}

/** Build LayoffEvents from the scraped index joined with parsed PDF fields. */
export function buildWarnEvents(
  index: IndexEntry[],
  parsedByFile: Map<string, ParsedWarn>,
): LayoffEvent[] {
  const events: LayoffEvent[] = [];
  for (const entry of index) {
    const parsed = parsedByFile.get(entry.pdfFilename);
    if (!parsed) continue;
    const { keep, county } = classifyCounty(parsed.county);
    if (!keep) continue;

    // Prefer the PDF's notice date; fall back to the index "Notice Dated" cell.
    const noticeDate =
      parsed.noticeDate ?? parseDate(entry.noticeDated.replace(/\s*\(amended.*$/i, "").trim());
    const effectiveDate = noticeDate ?? entry.datePosted;
    if (!effectiveDate) continue;

    events.push({
      id: makeId([
        parsed.company ?? entry.company,
        noticeDate ?? entry.datePosted,
        entry.pdfFilename,
      ]),
      company: parsed.company ?? entry.company,
      county,
      region: parsed.region ?? entry.region,
      numberAffected: parsed.numberAffected,
      totalEmployees: parsed.totalEmployees,
      noticeDate: noticeDate ?? (entry.datePosted as string),
      datePosted: entry.datePosted,
      layoffDate: parsed.layoffDate,
      closingDate: parsed.closingDate,
      classification: parsed.classification,
      reason: parsed.reason,
      industry: parsed.industry,
      union: parsed.union,
      isAmendment: entry.isAmendment,
      amends: null,
      source: "warn_pdf",
      sourceUrl: entry.pdfUrl,
      dataQuality: parsed.numberAffected == null ? "incomplete" : "complete",
      parseWarnings: parsed.parseWarnings,
    });
  }
  return events;
}

export function withinWindow(e: LayoffEvent, since = DATE_WINDOW_START): boolean {
  return e.noticeDate >= since;
}

// The per-notice WARN PDF carries the authoritative notice-level total, so it
// outranks the Tableau dashboard (which splits a notice across per-site rows and
// can undercount). Curated news is the least authoritative.
const SOURCE_RANK: Record<SourceKind, number> = {
  warn_pdf: 4,
  tableau_csv: 3,
  tableau_live: 3,
  curated_news: 1,
};

/** Score an event so the "best" representative of a duplicate group wins as the
 *  canonical record. Higher is better. */
function canonicalScore(e: LayoffEvent): number {
  let s = 0;
  s += SOURCE_RANK[e.source] * 1000;
  if (e.numberAffected != null) s += 500;
  if (!e.isAmendment) s += 250;
  s += e.parseWarnings.length === 0 ? 100 : 0;
  if (e.datePosted) s += Date.parse(e.datePosted) / 1e10; // newer posting breaks ties
  return s;
}

const DAY = 86_400_000;
// An amendment keeps the ORIGINAL notice date (only the posting/amended date
// changes), so true amendments share essentially the same notice date. A company
// can file several *distinct* notices days apart (e.g. Tesla's weekly 2024 waves,
// each a different headcount) — we must NOT merge those. So same-date collapses
// amendments; the wider window only applies when headcounts also match, which
// catches cross-source duplicates (same event, slightly different reported date)
// without collapsing genuinely separate layoffs.
const AMENDMENT_WINDOW_DAYS = 1;
const SAME_COUNT_WINDOW_DAYS = 120;

function sameEvent(a: LayoffEvent, b: LayoffEvent): boolean {
  if (companyKey(a.company) !== companyKey(b.company)) return false;
  if (a.county !== b.county && a.county !== "unknown" && b.county !== "unknown") return false;
  const da = Date.parse(a.noticeDate);
  const db = Date.parse(b.noticeDate);
  if (Number.isNaN(da) || Number.isNaN(db)) return true; // same company, undatable → treat as dup
  const gap = Math.abs(da - db);
  if (gap <= AMENDMENT_WINDOW_DAYS * DAY) return true;
  const sameCount = a.numberAffected != null && a.numberAffected === b.numberAffected;
  return sameCount && gap <= SAME_COUNT_WINDOW_DAYS * DAY;
}

/** Collapse amendments and cross-source duplicates. The best record in each group
 *  becomes canonical; the rest are marked isAmendment with `amends` pointing at it. */
export function dedupe(events: LayoffEvent[]): LayoffEvent[] {
  const groups: LayoffEvent[][] = [];
  for (const e of events) {
    const group = groups.find((g) => g.some((member) => sameEvent(member, e)));
    if (group) group.push(e);
    else groups.push([e]);
  }

  const result: LayoffEvent[] = [];
  for (const group of groups) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }
    const sorted = [...group].sort((a, b) => canonicalScore(b) - canonicalScore(a));
    const [canonical, ...rest] = sorted;
    result.push(canonical);
    for (const r of rest) {
      result.push({ ...r, isAmendment: true, amends: canonical.id });
    }
  }
  return result;
}

function buildMeta(events: LayoffEvent[], generatedAt: string): DatasetMeta {
  const canonical = events.filter((e) => !e.isAmendment);
  const dates = canonical.map((e) => e.noticeDate).sort();
  const sourceCounts = { warn_pdf: 0, tableau_csv: 0, tableau_live: 0, curated_news: 0 } as Record<
    SourceKind,
    number
  >;
  for (const e of canonical) sourceCounts[e.source]++;
  return {
    generatedAt,
    dateRange: dates.length ? [dates[0], dates[dates.length - 1]] : null,
    totalEvents: canonical.length,
    excludedFromTotalsCount: canonical.filter(
      (e) => e.numberAffected == null || e.dataQuality === "incomplete",
    ).length,
    sourceCounts,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function main() {
  const HERE = dirname(fileURLToPath(import.meta.url));
  const cache = join(HERE, "cache");
  const indexPath = join(cache, "index.json");
  if (!existsSync(indexPath)) {
    console.error("No cache/index.json — run the earlier pipeline stages first.");
    process.exit(1);
  }
  const index: IndexEntry[] = JSON.parse(readFileSync(indexPath, "utf-8"));

  const parsedDir = join(cache, "parsed");
  const parsedByFile = new Map<string, ParsedWarn>();
  if (existsSync(parsedDir)) {
    for (const file of readdirSync(parsedDir)) {
      if (!file.endsWith(".json")) continue;
      parsedByFile.set(
        file.replace(/\.json$/, ""),
        JSON.parse(readFileSync(join(parsedDir, file), "utf-8")),
      );
    }
  }

  const warn = buildWarnEvents(index, parsedByFile);
  const tableau = loadTableau();
  const curated = loadCurated();

  const merged = [...warn, ...tableau, ...curated].filter((e) => withinWindow(e));
  const deduped = dedupe(merged).sort((a, b) => b.noticeDate.localeCompare(a.noticeDate));

  const generatedAt = new Date().toISOString();
  const meta = buildMeta(deduped, generatedAt);

  const dataDir = join(HERE, "..", "public", "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, "layoffs.json"), JSON.stringify(deduped, null, 2));
  writeFileSync(join(dataDir, "meta.json"), JSON.stringify(meta, null, 2));

  console.log(
    `Wrote ${deduped.length} events (${meta.totalEvents} canonical, ` +
      `${deduped.length - meta.totalEvents} amendments). ` +
      `Sources: ${JSON.stringify(meta.sourceCounts)}. ` +
      `Excluded from totals: ${meta.excludedFromTotalsCount}.`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
