import { createHash } from "node:crypto";

/** Stable short id for a layoff event, derived from its identifying fields. */
export function makeId(parts: (string | null | undefined)[]): string {
  const key = parts.map((p) => (p ?? "").toString().trim().toLowerCase()).join("|");
  return createHash("sha1").update(key).digest("hex").slice(0, 12);
}

/** Loose company-name key for dedup: lowercase, drop punctuation and common suffixes. */
export function companyKey(company: string): string {
  return company
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(inc|llc|llp|lp|corp|corporation|co|company|ltd|national association|na)\b/g, "")
    .replace(/\b(d\/?b\/?a|dba)\b.*$/, "") // drop "d/b/a ..." trade-name tails
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
