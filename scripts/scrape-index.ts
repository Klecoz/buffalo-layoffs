// Stage A: scrape the NYS DOL WARN listing pages into a flat index of notices.
//
// Sources (HTML tables, columns: Company Name | Region | Date Posted | Notice Dated):
//   - https://dol.ny.gov/2024-warn-notices   (2024 archive)
//   - https://dol.ny.gov/warn-notices         (active list: late-2024 → ~Mar 2025)
// The company-name link IS the notice PDF (served as application/pdf at a clean URL).
// April 2025→present is NOT here — it lives only in the Tableau dashboard and is
// ingested separately (see ingest-tableau.ts).
//
// We keep only Region === "Western" (the Buffalo–Niagara workforce region); the
// precise Erie/Niagara county filter happens later from the parsed PDF.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { parseDate } from "./lib/dates.ts";
import { fetchText } from "./lib/http.ts";

const ORIGIN = "https://dol.ny.gov";
const SOURCE_PAGES = [`${ORIGIN}/2024-warn-notices`, `${ORIGIN}/warn-notices`];

export interface IndexEntry {
  company: string;
  region: string;
  /** ISO `YYYY-MM-DD` or null. */
  datePosted: string | null;
  /** Raw "Notice Dated" text (may include amendment history). */
  noticeDated: string;
  pdfUrl: string;
  /** Stable local cache filename. */
  pdfFilename: string;
  isAmendment: boolean;
}

function slugFromHref(href: string): string {
  return `${href
    .replace(/^\/+/, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)}.pdf`;
}

/** Parse one DOL listing page's HTML into Western-region index entries. */
export function parseIndexHtml(html: string): IndexEntry[] {
  const $ = cheerio.load(html);
  const entries: IndexEntry[] = [];

  $("table").each((_, table) => {
    // Map columns by header text so we survive column reordering.
    const headers = $(table)
      .find("th")
      .map((__, th) => $(th).text().trim().toLowerCase())
      .get();
    const col = (name: string) => headers.findIndex((h) => h.includes(name));
    const ci = {
      company: col("company"),
      region: col("region"),
      posted: col("date posted"),
      dated: col("notice dated"),
    };
    if (ci.company < 0 || ci.region < 0) return; // not the notices table

    $(table)
      .find("tr")
      .each((__, tr) => {
        const cells = $(tr).find("td");
        if (cells.length === 0) return;
        const region = $(cells[ci.region]).text().trim();
        if (region.toLowerCase() !== "western") return;

        const link = $(cells[ci.company]).find("a").first();
        const href = (link.attr("href") || "").trim();
        if (!href) return;
        const company = (link.attr("title") || link.text()).trim();
        const noticeDated = ci.dated >= 0 ? $(cells[ci.dated]).text().trim() : "";
        const datePostedRaw = ci.posted >= 0 ? $(cells[ci.posted]).text().trim() : "";

        const pdfUrl = href.startsWith("http") ? href : ORIGIN + href;
        entries.push({
          company,
          region,
          datePosted: parseDate(datePostedRaw),
          noticeDated,
          pdfUrl,
          pdfFilename: slugFromHref(href),
          isAmendment: /amend/i.test(noticeDated) || /amend/i.test(href),
        });
      });
  });

  return entries;
}

async function main() {
  const all = new Map<string, IndexEntry>();
  for (const url of SOURCE_PAGES) {
    const html = await fetchText(url);
    const entries = parseIndexHtml(html);
    console.log(`  ${url} -> ${entries.length} Western notices`);
    for (const e of entries) all.set(e.pdfUrl, e); // dedup by PDF URL
  }

  const merged = [...all.values()];
  if (merged.length === 0) {
    console.error(
      "FATAL: zero Western notices found. The DOL page markup likely changed — inspect scrape-index.ts selectors.",
    );
    process.exit(1);
  }

  const HERE = dirname(fileURLToPath(import.meta.url));
  const cacheDir = join(HERE, "cache");
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(join(cacheDir, "index.json"), JSON.stringify(merged, null, 2));
  console.log(`Wrote cache/index.json with ${merged.length} Western notices.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
