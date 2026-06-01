import type { ReactNode } from "react";
import type { Classification, SourceKind } from "../../shared/types";
import { formatClassification } from "../lib/format";

export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`kicker ${className}`}>{children}</div>;
}

/** Module label: an accent-red mono kicker over a serif title, with an optional
 *  sub-note. */
export function SectionHead({
  kicker,
  title,
  note,
}: {
  kicker: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="sechead">
      <div className="kicker skick">{kicker}</div>
      <h2>{title}</h2>
      {note ? <div className="snote">{note}</div> : null}
    </div>
  );
}

/** Filled type tag — color-coded by classification (closings red, layoffs slate). */
export function ClassificationTag({ value }: { value: Classification }) {
  return <span className={`tag ${value}`}>{formatClassification(value)}</span>;
}

export function IncompleteBadge() {
  return (
    <span
      title="Workers affected was not machine-readable from the source; this event is excluded from totals."
      className="t-incomplete"
    >
      No count
    </span>
  );
}

/** Short provenance code shown in the table: WARN filing, dashboard, or news. */
const SOURCE_SHORT: Record<SourceKind, string> = {
  warn_pdf: "WARN",
  tableau_csv: "DASH",
  tableau_live: "DASH",
  curated_news: "NEWS",
};

export function SourceBadge({ source }: { source: SourceKind }) {
  const news = source === "curated_news";
  return (
    <span
      title={news ? "News-reported event, not from an official WARN filing." : undefined}
      className={`badge${news ? " news" : ""}`}
    >
      {SOURCE_SHORT[source]}
    </span>
  );
}
