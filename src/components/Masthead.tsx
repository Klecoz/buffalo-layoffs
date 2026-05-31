import type { DatasetMeta } from "../../shared/types";
import { formatDate } from "../lib/format";

export function Masthead({ meta }: { meta: DatasetMeta | null }) {
  const range =
    meta?.dateRange != null
      ? `${formatDate(meta.dateRange[0], { long: true })} – ${formatDate(meta.dateRange[1], { long: true })}`
      : "—";
  const generated = meta ? formatDate(meta.generatedAt.slice(0, 10), { long: true }) : "—";

  return (
    <header className="reveal pt-8">
      {/* instrument status strip */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-y border-rule py-2 text-ink-faint">
        <span className="kicker">Erie &amp; Niagara Counties · NY</span>
        <span className="kicker hidden sm:block">NYS WARN Act filings</span>
        <span className="kicker flex items-center gap-1.5 text-amber">
          <span className="pulse inline-block h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />
          Updated {generated}
        </span>
      </div>

      <h1 className="stamp mt-6 text-[2.4rem] leading-[0.92] text-ink sm:text-[4rem]">
        Buffalo–Niagara
        <br />
        <span className="text-brick">Layoffs Monitor</span>
      </h1>

      <p className="mt-4 max-w-2xl font-sans text-[0.92rem] leading-relaxed text-ink-soft">
        A standing record of mass layoffs and plant closings across Western New York's two core
        counties, drawn from the legally-required notices employers file with the State before they
        cut jobs. Covering <span className="font-semibold text-ink">{range}</span>.
      </p>

      <div className="mt-6 h-px w-full bg-rule-strong" />
    </header>
  );
}
