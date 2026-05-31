import type { ReactNode } from "react";
import type { Classification, SourceKind } from "../../shared/types";
import { formatClassification } from "../lib/format";

export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`kicker ${className}`}>{children}</div>;
}

/** Module label: a mono kicker over a heavy stamped title, on a strong top rule. */
export function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-t border-rule-strong pt-2.5">
      <div>
        <Kicker className="text-amber">{kicker}</Kicker>
        <h2 className="stamp mt-1.5 text-xl leading-none text-ink sm:text-2xl">{title}</h2>
      </div>
    </div>
  );
}

/* Status pips: a leading dot in the signal color, mono uppercase label. */
const CLASS_STYLE: Record<Classification, { ring: string; text: string; dot: string }> = {
  plant_closing: { ring: "border-brick/50", text: "text-brick", dot: "bg-brick" },
  layoff: { ring: "border-amber/50", text: "text-amber", dot: "bg-amber" },
  other: { ring: "border-steel/50", text: "text-steel", dot: "bg-steel" },
  unknown: { ring: "border-rule-strong", text: "text-ink-faint", dot: "bg-ink-faint" },
};

export function ClassificationTag({ value }: { value: Classification }) {
  const s = CLASS_STYLE[value];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-1.5 py-0.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.12em] ${s.ring} ${s.text}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {formatClassification(value)}
    </span>
  );
}

export function IncompleteBadge() {
  return (
    <span
      title="Workers affected was not machine-readable from the source; this event is excluded from totals."
      className="inline-flex items-center gap-1 border border-dashed border-amber/60 px-1.5 py-0.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.12em] text-amber"
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
        className="inline-block border border-dashed border-brick/50 px-1.5 py-0.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.12em] text-brick"
      >
        News-reported
      </span>
    );
  }
  return null;
}
