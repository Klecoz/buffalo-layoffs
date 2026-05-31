// Display formatting helpers. Dates are parsed as plain calendar dates (no time
// zone shifting) so an ISO "2025-03-10" always renders as March 10.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatDate(iso: string | null, opts: { long?: boolean } = {}): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const year = m[1];
  const monthIdx = Number(m[2]) - 1;
  const day = Number(m[3]);
  const names = opts.long ? MONTHS_LONG : MONTHS;
  if (monthIdx < 0 || monthIdx > 11) return iso;
  return `${names[monthIdx]} ${day}, ${year}`;
}

export function formatMonth(yyyymm: string): string {
  const m = yyyymm.match(/^(\d{4})-(\d{2})$/);
  if (!m) return yyyymm;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function formatNumber(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US");
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  plant_closing: "Plant closing",
  layoff: "Layoff",
  other: "Other",
  unknown: "Unspecified",
};

export function formatClassification(c: string): string {
  return CLASSIFICATION_LABELS[c] ?? c;
}
