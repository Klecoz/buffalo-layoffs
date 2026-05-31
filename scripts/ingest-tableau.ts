// Stage D: ingest April-2025→present notices from the NYS DOL WARN Tableau
// dashboard. That dashboard is JS-only and has no API, so the supported path is
// a one-time browser export saved to scripts/manual/tableau-export.csv. This
// loader is tolerant of column naming and simply returns [] when the file is
// absent (the rest of the dataset still builds from the HTML/PDF pipeline).
//
// See scripts/README.md for the documented export procedure.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Classification, County, LayoffEvent } from "../shared/types.ts";
import { parseDate } from "./lib/dates.ts";
import { makeId } from "./lib/ids.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(HERE, "manual", "tableau-export.csv");

/** Minimal RFC-4180-ish CSV parser (handles quoted fields and embedded commas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

const COLUMN_ALIASES: Record<string, string[]> = {
  company: ["company", "company name", "employer"],
  county: ["county"],
  region: ["region", "workforce region"],
  numberAffected: ["number affected", "affected", "employees affected", "workers affected"],
  totalEmployees: ["total employees", "total number of employees"],
  noticeDate: ["notice date", "date of notice", "notice dated"],
  layoffDate: ["layoff date", "layoff start date"],
  closingDate: ["closing date", "closure date", "closure end date"],
  classification: ["classification", "type", "notice type"],
  reason: ["reason", "reason for dislocation"],
  industry: ["industry", "industry type"],
  sourceUrl: ["source url", "url", "link"],
};

function resolveColumns(header: string[]): Record<string, number> {
  const norm = header.map((h) => h.trim().toLowerCase());
  const map: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    map[key] = norm.findIndex((h) => aliases.includes(h));
  }
  return map;
}

function normCounty(raw: string): County {
  const v = raw.trim().toLowerCase();
  if (v.startsWith("erie")) return "Erie";
  if (v.startsWith("niagara")) return "Niagara";
  return "unknown";
}

function normClassification(raw: string): Classification {
  const v = raw.trim().toLowerCase();
  if (/clos/.test(v)) return "plant_closing";
  if (/layoff|reduction/.test(v)) return "layoff";
  if (!v) return "unknown";
  return "other";
}

function toInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? Number.parseInt(digits, 10) : null;
}

export function loadTableau(): LayoffEvent[] {
  if (!existsSync(CSV_PATH)) {
    console.log("  (no scripts/manual/tableau-export.csv — skipping Apr-2025+ dashboard data)");
    return [];
  }
  const rows = parseCsv(readFileSync(CSV_PATH, "utf-8"));
  if (rows.length < 2) return [];
  const col = resolveColumns(rows[0]);
  const get = (row: string[], key: string) => (col[key] >= 0 ? (row[col[key]] ?? "").trim() : "");

  const events: LayoffEvent[] = [];
  for (const row of rows.slice(1)) {
    const company = get(row, "company");
    if (!company) continue;
    const noticeDate = parseDate(get(row, "noticeDate"));
    if (!noticeDate) continue; // a notice with no usable date is unusable
    const numberAffected = toInt(get(row, "numberAffected"));
    const classification = normClassification(get(row, "classification"));
    const layoffDate = parseDate(get(row, "layoffDate"));
    events.push({
      id: makeId([company, noticeDate, "tableau"]),
      company,
      county: normCounty(get(row, "county")),
      region: get(row, "region") || "Western",
      numberAffected,
      totalEmployees: toInt(get(row, "totalEmployees")),
      noticeDate,
      datePosted: null,
      layoffDate,
      closingDate: parseDate(get(row, "closingDate")) ?? (classification === "plant_closing" ? layoffDate : null),
      classification,
      reason: get(row, "reason") || null,
      industry: get(row, "industry") || null,
      union: null,
      isAmendment: false,
      amends: null,
      source: "tableau_csv",
      sourceUrl: get(row, "sourceUrl") || "https://dol.ny.gov/warn-dashboard",
      dataQuality: numberAffected == null ? "incomplete" : "complete",
      parseWarnings: numberAffected == null ? ["number affected not in dashboard export"] : [],
    });
  }
  return events;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`Loaded ${loadTableau().length} Tableau-export notices.`);
}
