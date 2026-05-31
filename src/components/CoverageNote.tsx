import type { DatasetMeta } from "../../shared/types";

/** A methodology sidebar, in the spirit of a data-journalism "how we counted"
 *  box. States WARN's coverage floor plainly so the figures aren't mistaken for
 *  every job lost. */
export function CoverageNote({ meta }: { meta: DatasetMeta | null }) {
  const excluded = meta?.excludedFromTotalsCount ?? 0;
  return (
    <aside className="reveal border border-rule border-l-2 border-l-amber bg-paper-raised/50 px-4 py-3 font-sans text-[0.8rem] leading-relaxed text-ink-soft">
      <span className="kicker text-amber">▲ A note on what this counts</span>
      <p className="mt-1.5">
        New York's WARN Act only requires notice from employers with{" "}
        <strong className="text-ink">50+ workers</strong> cutting{" "}
        <strong className="text-ink">25 or more jobs</strong> (or 250+). Smaller layoffs and most
        retail, restaurant, and small-business closures never appear here — so these totals are a
        floor, not the full count of jobs lost. A handful of news-reported closures below the
        threshold are included and marked{" "}
        <span className="font-semibold text-brick">News-reported</span>.
        {excluded > 0 && (
          <>
            {" "}
            {excluded} {excluded === 1 ? "notice has" : "notices have"} no machine-readable
            headcount and {excluded === 1 ? "is" : "are"} shown but excluded from totals.
          </>
        )}
      </p>
    </aside>
  );
}
