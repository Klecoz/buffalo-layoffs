import type { Classification, County, LayoffEvent, SourceKind } from "../../shared/types";

export interface Filters {
  search: string;
  counties: County[]; // empty = all
  classifications: Classification[]; // empty = all
  sources: SourceKind[]; // empty = all
  /** Lower bound on workers affected; null = no bound. Events with null counts pass. */
  minAffected: number | null;
  dateStart: string | null; // ISO, inclusive
  dateEnd: string | null; // ISO, inclusive
  /** When false (default), superseded amendment records are hidden. */
  showAmendments: boolean;
}

export const EMPTY_FILTERS: Filters = {
  search: "",
  counties: [],
  classifications: [],
  sources: [],
  minAffected: null,
  dateStart: null,
  dateEnd: null,
  showAmendments: false,
};

function matchesSearch(e: LayoffEvent, q: string): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return (
    e.company.toLowerCase().includes(needle) ||
    (e.reason?.toLowerCase().includes(needle) ?? false) ||
    (e.industry?.toLowerCase().includes(needle) ?? false) ||
    e.county.toLowerCase().includes(needle)
  );
}

/** Pure: the single filtering function every view shares, so Table, Timeline and
 *  Stats always agree on what's visible. */
export function applyFilters(events: LayoffEvent[], f: Filters): LayoffEvent[] {
  return events.filter((e) => {
    if (!f.showAmendments && e.isAmendment) return false;
    if (f.counties.length && !f.counties.includes(e.county)) return false;
    if (f.classifications.length && !f.classifications.includes(e.classification)) return false;
    if (f.sources.length && !f.sources.includes(e.source)) return false;
    if (f.minAffected != null && e.numberAffected != null && e.numberAffected < f.minAffected)
      return false;
    if (f.dateStart && e.noticeDate < f.dateStart) return false;
    if (f.dateEnd && e.noticeDate > f.dateEnd) return false;
    if (!matchesSearch(e, f.search)) return false;
    return true;
  });
}

export function isFilterActive(f: Filters): boolean {
  return (
    f.search.trim() !== "" ||
    f.counties.length > 0 ||
    f.classifications.length > 0 ||
    f.sources.length > 0 ||
    f.minAffected != null ||
    f.dateStart != null ||
    f.dateEnd != null ||
    f.showAmendments
  );
}
