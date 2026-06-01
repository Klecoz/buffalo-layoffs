// Stage: fetch BLS QCEW (Quarterly Census of Employment & Wages) covered-
// employment for Erie + Niagara counties. Like the FRED unemployment series this
// is macro CONTEXT only — it names no employer and NEVER enters any "jobs lost"
// total. It lets layoff clusters be read against the actual employment base and
// makes under-reporting visible (e.g. a manufacturing employment drop with no
// matching WARN notice).
//
// Source: the BLS QCEW Open Data Access CSV endpoint (no API key):
//   https://data.bls.gov/cew/data/api/{year}/{qtr}/area/{fips}.csv
// One file per area+quarter; rows cover every ownership × industry × aggregation
// level. We keep two rows per area: total all-industries and manufacturing.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { QcewPoint, QcewSeries } from "../shared/types.ts";
import { fetchText } from "./lib/http.ts";

// How many years back to pull (current quarter lags ~5 months, so recent
// quarters simply 404 — we skip those quietly).
const SINCE_YEAR = 2023;
const LATEST_YEAR = 2026;

const AREAS = [
  { fips: "36029", name: "Erie County" },
  { fips: "36063", name: "Niagara County" },
];

// Verified against a real CSV (2024 Q1, Erie): the total all-industries county
// line is own_code 5 / industry_code 10; manufacturing (NAICS 31-33) is
// own_code 5 / industry_code 31-33. We match on (own_code, industry_code) — the
// pair is unambiguous regardless of agglvl_code.
const INDUSTRIES = [
  { code: "10", label: "All industries" },
  { code: "31-33", label: "Manufacturing" },
];
const OWN_CODE_TOTAL = "5";

/** Parse one quoted-CSV line into a string[] (QCEW wraps every field in quotes). */
function parseCsvLine(line: string): string[] {
  return line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
}

interface QcewRow {
  ownCode: string;
  industryCode: string;
  emp: number | null;
}

function parseAreaCsv(csv: string): QcewRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]);
  const col = (name: string) => header.indexOf(name);
  const iOwn = col("own_code");
  const iInd = col("industry_code");
  const iM1 = col("month1_emplvl");
  const iM2 = col("month2_emplvl");
  const iM3 = col("month3_emplvl");
  if ([iOwn, iInd, iM1, iM2, iM3].some((i) => i < 0)) {
    throw new Error("QCEW CSV missing expected columns — endpoint format changed?");
  }

  const rows: QcewRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const months = [cells[iM1], cells[iM2], cells[iM3]]
      .map((v) => Number.parseInt(v, 10))
      .filter((n) => Number.isFinite(n));
    const emp = months.length
      ? Math.round(months.reduce((a, b) => a + b, 0) / months.length)
      : null;
    rows.push({ ownCode: cells[iOwn], industryCode: cells[iInd], emp });
  }
  return rows;
}

/** ISO date for the first day of a calendar quarter. */
function quarterStart(year: number, qtr: number): string {
  const month = (qtr - 1) * 3 + 1;
  return `${year}-${month.toString().padStart(2, "0")}-01`;
}

async function main() {
  const out: QcewSeries[] = [];

  for (const area of AREAS) {
    // Collect points per industry across all available quarters.
    const pointsByIndustry = new Map<string, QcewPoint[]>(INDUSTRIES.map((i) => [i.code, []]));

    for (let year = SINCE_YEAR; year <= LATEST_YEAR; year++) {
      for (let qtr = 1; qtr <= 4; qtr++) {
        const url = `https://data.bls.gov/cew/data/api/${year}/${qtr}/area/${area.fips}.csv`;
        let csv: string;
        try {
          csv = await fetchText(url, { retries: 1 });
        } catch {
          continue; // quarter not published yet (404) — skip quietly
        }
        // The CSV endpoint returns an HTML error page for not-yet-published
        // quarters in some cases; guard against that.
        if (!csv.startsWith('"area_fips"')) continue;

        const rows = parseAreaCsv(csv);
        for (const ind of INDUSTRIES) {
          const row = rows.find((r) => r.ownCode === OWN_CODE_TOTAL && r.industryCode === ind.code);
          if (row) {
            pointsByIndustry.get(ind.code)?.push({
              date: quarterStart(year, qtr),
              employment: row.emp,
            });
          }
        }
      }
    }

    for (const ind of INDUSTRIES) {
      const points = (pointsByIndustry.get(ind.code) ?? []).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      out.push({
        areaFips: area.fips,
        label: `${area.name} — ${ind.label}`,
        industryCode: ind.code,
        points,
      });
      console.log(`  ${area.name} / ${ind.label}: ${points.length} quarters`);
    }
  }

  const HERE = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(HERE, "..", "public", "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, "qcew.json"), JSON.stringify(out, null, 2));
  console.log("Wrote public/data/qcew.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
