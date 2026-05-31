import type { Classification, LayoffEvent } from "../../shared/types";

// THE credibility invariant: any event without a known headcount (numberAffected
// null, or dataQuality "incomplete") is EXCLUDED from every "jobs lost" total.
// Such events still appear in the table and timeline; they just don't inflate the
// numbers. `excludedCount` surfaces how many were left out so the UI can say so.

export function countsTowardTotals(e: LayoffEvent): boolean {
  return e.numberAffected != null && e.dataQuality !== "incomplete";
}

export interface Summary {
  totalEvents: number;
  totalJobsLost: number;
  /** Events excluded from totalJobsLost because their count is unknown. */
  excludedCount: number;
  biggest: LayoffEvent | null;
  averageAffected: number | null;
}

export function summarize(events: LayoffEvent[]): Summary {
  const counted = events.filter(countsTowardTotals);
  const totalJobsLost = counted.reduce((sum, e) => sum + (e.numberAffected ?? 0), 0);
  const biggest =
    counted.length === 0
      ? null
      : counted.reduce((max, e) => ((e.numberAffected ?? 0) > (max.numberAffected ?? 0) ? e : max));
  return {
    totalEvents: events.length,
    totalJobsLost,
    excludedCount: events.length - counted.length,
    biggest,
    averageAffected: counted.length ? Math.round(totalJobsLost / counted.length) : null,
  };
}

export interface MonthlyBucket {
  month: string; // "YYYY-MM"
  events: number;
  jobs: number; // sum of known counts only
}

/** Group events into contiguous monthly buckets across the full span (no gaps),
 *  so the trend chart shows empty months too. */
export function monthlyBuckets(events: LayoffEvent[]): MonthlyBucket[] {
  if (events.length === 0) return [];
  const byMonth = new Map<string, MonthlyBucket>();
  for (const e of events) {
    const month = e.noticeDate.slice(0, 7);
    const b = byMonth.get(month) ?? { month, events: 0, jobs: 0 };
    b.events += 1;
    if (countsTowardTotals(e)) b.jobs += e.numberAffected ?? 0;
    byMonth.set(month, b);
  }
  const months = [...byMonth.keys()].sort();
  const out: MonthlyBucket[] = [];
  const [startY, startM] = months[0].split("-").map(Number);
  const [endY, endM] = months[months.length - 1].split("-").map(Number);
  for (let y = startY, m = startM; y < endY || (y === endY && m <= endM); ) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push(byMonth.get(key) ?? { month: key, events: 0, jobs: 0 });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export interface Breakdown {
  key: string;
  label: string;
  events: number;
  jobs: number;
}

export function breakdownByClassification(
  events: LayoffEvent[],
  labelFor: (c: Classification) => string,
): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const e of events) {
    const b = map.get(e.classification) ?? {
      key: e.classification,
      label: labelFor(e.classification),
      events: 0,
      jobs: 0,
    };
    b.events += 1;
    if (countsTowardTotals(e)) b.jobs += e.numberAffected ?? 0;
    map.set(e.classification, b);
  }
  return [...map.values()].sort((a, b) => b.jobs - a.jobs || b.events - a.events);
}

export function breakdownByIndustry(events: LayoffEvent[], topN = 8): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const e of events) {
    const key = e.industry?.trim() || "Unspecified";
    const b = map.get(key) ?? { key, label: key, events: 0, jobs: 0 };
    b.events += 1;
    if (countsTowardTotals(e)) b.jobs += e.numberAffected ?? 0;
    map.set(key, b);
  }
  return [...map.values()].sort((a, b) => b.jobs - a.jobs || b.events - a.events).slice(0, topN);
}

export function biggestLayoffs(events: LayoffEvent[], topN = 8): LayoffEvent[] {
  return events
    .filter(countsTowardTotals)
    .sort((a, b) => (b.numberAffected ?? 0) - (a.numberAffected ?? 0))
    .slice(0, topN);
}
