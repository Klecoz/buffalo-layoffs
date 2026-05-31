import type { DatasetMeta } from "../../shared/types";
import { formatDate } from "../lib/format";

export function Masthead({ meta }: { meta: DatasetMeta | null }) {
  const range =
    meta?.dateRange != null
      ? `${formatDate(meta.dateRange[0], { long: true })} – ${formatDate(meta.dateRange[1], { long: true })}`
      : "—";
  const generated = meta ? formatDate(meta.generatedAt.slice(0, 10), { long: true }) : "—";

  return (
    <header className="reveal border-b-2 border-ink pt-8 pb-4">
      {/* top dateline rule */}
      <div className="flex items-center justify-between border-b border-rule pb-2 text-ink-faint">
        <span className="kicker">Erie &amp; Niagara Counties · New York</span>
        <span className="kicker hidden sm:block">Compiled from NYS WARN Act filings</span>
        <span className="kicker">Updated {generated}</span>
      </div>

      <h1 className="font-display text-ink text-[2.6rem] leading-[0.98] tracking-tight mt-5 sm:text-6xl">
        The Buffalo–Niagara
        <br />
        <span className="text-brick">Layoffs Ledger</span>
      </h1>

      <p className="mt-4 max-w-2xl font-sans text-[0.95rem] leading-relaxed text-ink-soft">
        A standing record of mass layoffs and plant closings across Western New York's two
        core counties, drawn from the legally-required notices employers file with the State
        before they cut jobs. Covering{" "}
        <span className="font-semibold text-ink">{range}</span>.
      </p>
    </header>
  );
}
