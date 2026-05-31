// Stage D: ingest April-2025→present notices from the NYS DOL WARN Tableau
// dashboard. That dashboard is JS-only with a canvas-rendered table and no API,
// so the supported path is a one-time crosstab export saved to
// scripts/manual/tableau-export.csv. See scripts/README.md for the exact steps.
//
// The crosstab Tableau produces is UTF-16LE, TAB-separated, statewide, and split
// one row PER IMPACTED SITE. So we: decode UTF-16, keep only Erie/Niagara rows,
// and aggregate the per-site rows back into one event per notice (summing the
// affected counts across that notice's sites in our two counties).
//
// Columns: Index, Date Posted, Date of WARN Notice, Impacted Site County,
//   Business Legal Name, Impacted Site Address, Layoff or Closure?,
//   Date Layoff/Closure Starts, Permanent or Temporary Layoff?,
//   Number of Affected Workers.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Classification, County, LayoffEvent } from "../shared/types.ts";
import { parseDate } from "./lib/dates.ts";
import { companyKey, makeId } from "./lib/ids.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(HERE, "manual", "tableau-export.csv");

function decode(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString("utf16le").replace(/^﻿/, "");
  }
  return buf.toString("utf8").replace(/^﻿/, "");
}

/** Split a delimited line, trimming the spurious spaces Tableau pads cells with. */
function splitRow(line: string, delim: string): string[] {
  return line.split(delim).map((c) => c.trim());
}

function colIndex(header: string[], needle: string): number {
  return header.findIndex((h) => h.toLowerCase().includes(needle));
}

function normCounty(raw: string): County | null {
  const v = raw.trim().toLowerCase();
  if (v.startsWith("erie")) return "Erie";
  if (v.startsWith("niagara")) return "Niagara";
  return null; // statewide export — drop everything outside our two counties
}

function toInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? Number.parseInt(digits, 10) : null;
}

interface Agg {
  company: string;
  county: County;
  numberAffected: number | null;
  noticeDate: string;
  datePosted: string | null;
  layoffDate: string | null;
  classification: Classification;
  reason: string | null;
  sites: number;
}

export function loadTableau(): LayoffEvent[] {
  if (!existsSync(CSV_PATH)) {
    console.log("  (no scripts/manual/tableau-export.csv — skipping Apr-2025+ dashboard data)");
    return [];
  }
  const text = decode(readFileSync(CSV_PATH));
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const delim = lines[0].includes("\t") ? "\t" : ",";
  const header = splitRow(lines[0], delim);
  const ci = {
    datePosted: colIndex(header, "date posted"),
    noticeDate: colIndex(header, "date of warn"),
    county: colIndex(header, "county"),
    company: colIndex(header, "legal name"),
    type: colIndex(header, "layoff or closure"),
    layoffDate: colIndex(header, "starts"),
    permanence: colIndex(header, "permanent or temporary"),
    affected: colIndex(header, "affected workers"),
  };

  // Group per-site rows by notice (company + notice date + county), summing counts.
  const groups = new Map<string, Agg>();
  for (const line of lines.slice(1)) {
    const cells = splitRow(line, delim);
    const county = normCounty(cells[ci.county] ?? "");
    if (!county) continue;
    const company = cells[ci.company]?.trim();
    const noticeDate = parseDate(cells[ci.noticeDate]);
    if (!company || !noticeDate) continue;

    const isClosure = /clos/i.test(cells[ci.type] ?? "");
    const affected = toInt(cells[ci.affected]);
    const key = `${companyKey(company)}|${noticeDate}|${county}`;
    const existing = groups.get(key);
    if (existing) {
      if (affected != null) existing.numberAffected = (existing.numberAffected ?? 0) + affected;
      existing.sites += 1;
      if (isClosure) existing.classification = "plant_closing";
    } else {
      const permanence = (cells[ci.permanence] ?? "").trim();
      groups.set(key, {
        company,
        county,
        numberAffected: affected,
        noticeDate,
        datePosted: parseDate(cells[ci.datePosted]),
        layoffDate: parseDate(cells[ci.layoffDate]),
        classification: isClosure ? "plant_closing" : "layoff",
        reason: permanence ? `${permanence} ${isClosure ? "closure" : "layoff"}` : null,
        sites: 1,
      });
    }
  }

  return [...groups.values()].map((g) => ({
    id: makeId([g.company, g.noticeDate, "tableau", g.county]),
    company: g.company,
    county: g.county,
    region: "Western",
    numberAffected: g.numberAffected,
    totalEmployees: null,
    noticeDate: g.noticeDate,
    datePosted: g.datePosted,
    layoffDate: g.layoffDate,
    closingDate: g.classification === "plant_closing" ? g.layoffDate : null,
    classification: g.classification,
    reason: g.sites > 1 ? `${g.reason ?? "Mass layoff"} · ${g.sites} sites` : g.reason,
    industry: null,
    union: null,
    isAmendment: false,
    amends: null,
    source: "tableau_csv",
    sourceUrl: "https://dol.ny.gov/warn-dashboard",
    dataQuality: g.numberAffected == null ? "incomplete" : "complete",
    parseWarnings: g.numberAffected == null ? ["number affected not in dashboard export"] : [],
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const events = loadTableau();
  console.log(`Loaded ${events.length} Erie/Niagara notices from the Tableau export.`);
  for (const e of events.sort((a, b) => b.noticeDate.localeCompare(a.noticeDate))) {
    console.log(
      `  ${e.noticeDate}  ${String(e.numberAffected).padStart(5)}  ${e.county}  ${e.company}`,
    );
  }
}
