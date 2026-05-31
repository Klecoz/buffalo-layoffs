import type { ReactNode } from "react";
import type { Classification, SourceKind } from "../../shared/types";
import { formatClassification } from "../lib/format";

export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`kicker ${className}`}>{children}</div>;
}

/** Section header: a kicker over a serif title, divided by a hairline rule. */
export function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-5 border-b border-ink pb-2">
      <Kicker>{kicker}</Kicker>
      <h2 className="font-display text-2xl text-ink mt-1 leading-tight">{title}</h2>
    </div>
  );
}

const CLASS_STYLE: Record<Classification, string> = {
  plant_closing: "text-brick border-brick/40 bg-brick-wash",
  layoff: "text-steel border-steel/30 bg-steel/5",
  other: "text-ink-soft border-rule-strong bg-paper-sunk",
  unknown: "text-ink-faint border-rule bg-paper-sunk",
};

export function ClassificationTag({ value }: { value: Classification }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${CLASS_STYLE[value]}`}
    >
      {formatClassification(value)}
    </span>
  );
}

export function IncompleteBadge() {
  return (
    <span
      title="Workers affected was not machine-readable from the source; this event is excluded from totals."
      className="inline-flex items-center gap-1 rounded-sm border border-amber/40 bg-amber/10 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-amber"
    >
      ⚠ count n/a
    </span>
  );
}

export function SourceBadge({ source }: { source: SourceKind }) {
  if (source === "curated_news") {
    return (
      <span
        title="News-reported event, not from an official WARN filing."
        className="inline-block rounded-sm border border-brick/30 bg-brick-wash px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-brick"
      >
        News-reported
      </span>
    );
  }
  return null;
}
