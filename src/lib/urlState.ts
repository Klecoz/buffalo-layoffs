// Serialize the shared filter state (and the active view tab) to/from the URL
// query string, so a filtered view is shareable and survives reload and the
// browser back/forward buttons. Only non-default fields are written, to keep
// URLs short. This module is pure (it takes/returns strings) so it can be
// unit-tested without a DOM; the components do the actual history writes.

import type { Classification, County, SourceKind } from "../../shared/types";
import type { ViewKey } from "../components/ViewTabs";
import { EMPTY_FILTERS, type Filters } from "./applyFilters";

const COUNTY_VALUES: readonly County[] = ["Erie", "Niagara", "unknown"];
const CLASS_VALUES: readonly Classification[] = ["plant_closing", "layoff", "other", "unknown"];
const SOURCE_VALUES: readonly SourceKind[] = [
  "warn_pdf",
  "tableau_csv",
  "tableau_live",
  "curated_news",
];
const VIEW_VALUES: readonly ViewKey[] = ["ledger", "table", "timeline"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function csvValues<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is T => (allowed as readonly string[]).includes(s));
}

/** Parse a `Filters` object from a URL query string (e.g. `window.location.search`). */
export function parseFilters(search: string): Filters {
  const p = new URLSearchParams(search);

  const minRaw = p.get("min");
  const minNum = minRaw != null && minRaw !== "" ? Number(minRaw) : Number.NaN;
  const minAffected = Number.isFinite(minNum) && minNum >= 0 ? minNum : null;

  const from = p.get("from");
  const to = p.get("to");

  return {
    search: p.get("q") ?? "",
    counties: csvValues(p.get("county"), COUNTY_VALUES),
    classifications: csvValues(p.get("type"), CLASS_VALUES),
    sources: csvValues(p.get("source"), SOURCE_VALUES),
    minAffected,
    dateStart: from && ISO_DATE.test(from) ? from : null,
    dateEnd: to && ISO_DATE.test(to) ? to : null,
    showAmendments: p.get("amendments") === "1",
  };
}

/** Parse the active view tab from a URL query string; null if absent/invalid. */
export function parseTab(search: string): ViewKey | null {
  const v = new URLSearchParams(search).get("view");
  return v && (VIEW_VALUES as readonly string[]).includes(v) ? (v as ViewKey) : null;
}

/** Build a query string (no leading `?`) from filters + tab; empty when all default. */
export function buildSearch(f: Filters, tab: ViewKey = "ledger"): string {
  const p = new URLSearchParams();
  if (f.search.trim()) p.set("q", f.search.trim());
  if (f.counties.length) p.set("county", f.counties.join(","));
  if (f.classifications.length) p.set("type", f.classifications.join(","));
  if (f.sources.length) p.set("source", f.sources.join(","));
  if (f.minAffected != null) p.set("min", String(f.minAffected));
  if (f.dateStart) p.set("from", f.dateStart);
  if (f.dateEnd) p.set("to", f.dateEnd);
  if (f.showAmendments) p.set("amendments", "1");
  if (tab !== "ledger") p.set("view", tab);
  return p.toString();
}

/** True when the parsed filters differ from the defaults (handy for guards/tests). */
export function hasUrlFilters(search: string): boolean {
  return buildSearch(parseFilters(search)) !== buildSearch(EMPTY_FILTERS);
}
