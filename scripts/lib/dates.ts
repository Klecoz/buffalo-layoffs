// Date normalization to ISO `YYYY-MM-DD`. WARN sources use two formats:
//   - long form: "December 6, 2024"
//   - slash form: "12/6/2024" (M/D/YYYY)

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d
    .toString()
    .padStart(2, "0")}`;
}

/** Parse a WARN-style date string to ISO, or null if unrecognized. */
export function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();

  // "December 6, 2024"
  const long = s.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (long) {
    const month = MONTHS[long[1].toLowerCase()];
    if (month) return iso(Number(long[3]), month, Number(long[2]));
  }

  // "12/6/2024" or "12/06/2024"; also tolerate 2-digit year.
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    return iso(year, Number(slash[1]), Number(slash[2]));
  }

  // Already ISO.
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return iso(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));

  return null;
}

/** Compact `MMDDYYYY` token used in DOL notice URLs, e.g. "12092024". */
export function parseUrlDateToken(token: string): string | null {
  const m = token.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return null;
  return iso(Number(m[3]), Number(m[1]), Number(m[2]));
}
