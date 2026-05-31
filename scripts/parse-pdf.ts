// Stage C: extract structured fields from a WARN notice PDF.
//
// Split into two layers for testability:
//   - parseWarnFields(lines)  — PURE. Label-anchored extraction over reconstructed
//                               lines. This is the high-value, unit-tested logic.
//   - main()                  — reads cache/index.json + cached PDFs, runs pdfjs to
//                               get lines, parses, and writes cache/parsed/*.json.
//
// Hard rule: never throw on a bad PDF. Any field we cannot read becomes null and
// gets a human-readable note in parseWarnings; the event is still emitted.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Classification } from "../shared/types.ts";
import { FIELD_LABELS } from "./field-aliases.ts";
import { parseDate } from "./lib/dates.ts";
import { extractPdfLines } from "./lib/pdf.ts";

export interface ParsedWarn {
  company: string | null;
  county: string | null;
  region: string | null;
  numberAffected: number | null;
  totalEmployees: number | null;
  noticeDate: string | null;
  layoffDate: string | null;
  closingDate: string | null;
  classification: Classification;
  reason: string | null;
  industry: string | null;
  union: string | null;
  parseWarnings: string[];
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Find the value for the first matching label. Handles inline values
 *  ("Label: value") and label-on-its-own-line forms (value on the next line). */
function fieldValue(lines: string[], labels: readonly string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`^\\s*${escapeRe(label)}\\s*:\\s*(.*)$`, "i");
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(re);
      if (!m) continue;
      let value = m[1].trim();
      if (!value) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim()) {
            value = lines[j].trim();
            break;
          }
        }
      }
      return value || null;
    }
  }
  return null;
}

function parseCount(raw: string | null): number | null {
  if (raw == null) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

function cleanIndustry(raw: string | null): string | null {
  if (!raw) return null;
  // Strip a leading NAICS code prefix like "31-33: " or "44-45: ".
  return raw.replace(/^[\d\-,\s]+:\s*/, "").trim() || null;
}

function deriveUnion(lines: string[]): string | null {
  const line = lines.find((l) => /represented by (a )?union/i.test(l));
  if (!line) return null;
  if (/not represented/i.test(line)) return "Non-union";
  // "The employees are represented by <Union>."
  const m = line.match(/represented by (?:a )?union[,:]?\s*(.+?)\.?$/i);
  return m?.[1]?.trim() || "Union";
}

function deriveClassification(reason: string | null, lines: string[]): Classification {
  // The form uses parallel label sets: a closure notice says "Reason For Closure"
  // / "Closure Start Date", a layoff says "Reason For Layoff" / "Layoff Start Date".
  const isClosure = lines.some((l) => /^\s*(reason for closure|closure start date)\s*:/i.test(l));
  if (isClosure) return "plant_closing";
  const isLayoff = lines.some((l) => /^\s*(reason for layoff|layoff start date)\s*:/i.test(l));
  if (isLayoff) return "layoff";
  // Fall back to free-text closure phrasing or reason wording.
  if (
    lines.some((l) => /\b(plant clos(ing|ure)|business closure|facility closing)\b/i.test(l)) ||
    (reason && /clos(e|ing|ure)/i.test(reason))
  )
    return "plant_closing";
  return reason ? "layoff" : "unknown";
}

/** PURE: extract WARN fields from reconstructed PDF lines. */
export function parseWarnFields(lines: string[]): ParsedWarn {
  const warnings: string[] = [];

  const company = fieldValue(lines, FIELD_LABELS.company);
  const county = fieldValue(lines, FIELD_LABELS.county);
  const region = fieldValue(lines, FIELD_LABELS.region);
  const reason = fieldValue(lines, FIELD_LABELS.reason);
  const industry = cleanIndustry(fieldValue(lines, FIELD_LABELS.industry));

  const numRaw = fieldValue(lines, FIELD_LABELS.numberAffected);
  const numberAffected = parseCount(numRaw);
  if (numberAffected == null) warnings.push("number affected not found");

  const totalEmployees = parseCount(fieldValue(lines, FIELD_LABELS.totalEmployees));

  const noticeDate = parseDate(fieldValue(lines, FIELD_LABELS.noticeDate));
  if (!noticeDate) warnings.push("notice date not found");

  const layoffDate = parseDate(fieldValue(lines, FIELD_LABELS.layoffDate));
  const layoffEnd = parseDate(fieldValue(lines, FIELD_LABELS.layoffEndDate));

  const classification = deriveClassification(reason, lines);
  const closingDate = classification === "plant_closing" ? layoffEnd : null;

  if (!company) warnings.push("company not found");
  if (!county) warnings.push("county not found");

  return {
    company,
    county,
    region,
    numberAffected,
    totalEmployees,
    noticeDate,
    layoffDate,
    closingDate,
    classification,
    reason,
    industry,
    union: deriveUnion(lines),
    parseWarnings: warnings,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
interface IndexEntry {
  company: string;
  region: string;
  datePosted: string | null;
  noticeDated: string;
  pdfUrl: string;
  pdfFilename: string;
  isAmendment: boolean;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, "cache");

async function main() {
  const indexPath = join(CACHE, "index.json");
  if (!existsSync(indexPath)) {
    console.error("No cache/index.json — run `npm run refresh:index` first.");
    process.exit(1);
  }
  const index: IndexEntry[] = JSON.parse(readFileSync(indexPath, "utf-8"));
  const outDir = join(CACHE, "parsed");
  mkdirSync(outDir, { recursive: true });

  let ok = 0;
  let incomplete = 0;
  for (const entry of index) {
    const pdfPath = join(CACHE, "pdfs", entry.pdfFilename);
    if (!existsSync(pdfPath)) {
      console.warn(`  skip (no pdf): ${entry.company}`);
      continue;
    }
    let parsed: ParsedWarn;
    try {
      const lines = await extractPdfLines(new Uint8Array(readFileSync(pdfPath)));
      parsed = parseWarnFields(lines);
    } catch (err) {
      // pdfjs failed entirely (e.g. scanned image, corrupt) — keep a stub.
      parsed = {
        company: entry.company,
        county: null,
        region: entry.region,
        numberAffected: null,
        totalEmployees: null,
        noticeDate: null,
        layoffDate: null,
        closingDate: null,
        classification: "unknown",
        reason: null,
        industry: null,
        union: null,
        parseWarnings: [`pdf could not be read: ${String(err)}`],
      };
    }
    if (parsed.parseWarnings.length) incomplete++;
    else ok++;
    writeFileSync(join(outDir, `${entry.pdfFilename}.json`), JSON.stringify(parsed, null, 2));
  }
  console.log(`Parsed ${ok + incomplete} notices (${ok} clean, ${incomplete} with warnings).`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
