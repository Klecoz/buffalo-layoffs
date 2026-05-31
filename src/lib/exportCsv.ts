// Export the currently-filtered events as an RFC-4180 CSV. Callers pass
// `useFilters().filtered`, so the download always matches what's on screen.
// No dependencies — the download is a Blob + object URL.

import type { LayoffEvent } from "../../shared/types";

const COLUMNS: { key: keyof LayoffEvent; header: string }[] = [
  { key: "company", header: "Company" },
  { key: "county", header: "County" },
  { key: "numberAffected", header: "Workers affected" },
  { key: "totalEmployees", header: "Total employees" },
  { key: "classification", header: "Classification" },
  { key: "noticeDate", header: "Notice date" },
  { key: "datePosted", header: "Date posted" },
  { key: "layoffDate", header: "Layoff date" },
  { key: "closingDate", header: "Closing date" },
  { key: "reason", header: "Reason" },
  { key: "industry", header: "Industry" },
  { key: "union", header: "Union" },
  { key: "isAmendment", header: "Is amendment" },
  { key: "source", header: "Source" },
  { key: "sourceUrl", header: "Source URL" },
  { key: "dataQuality", header: "Data quality" },
];

/** Quote a value per RFC 4180: wrap in quotes (doubling embedded quotes) when it
 *  contains a comma, quote, or newline. `null`/`undefined` become empty. */
function escapeCsv(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(events: LayoffEvent[]): string {
  const header = COLUMNS.map((c) => escapeCsv(c.header)).join(",");
  const rows = events.map((e) => COLUMNS.map((c) => escapeCsv(e[c.key])).join(","));
  return [header, ...rows].join("\r\n");
}

/** Trigger a client-side download of the events as a CSV file. */
export function downloadCsv(events: LayoffEvent[], filename: string): void {
  const blob = new Blob([toCsv(events)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
