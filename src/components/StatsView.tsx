import { type CSSProperties, useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFilters } from "../context/FilterContext";
import {
  biggestLayoffs,
  breakdownByClassification,
  breakdownByIndustry,
  monthlyBuckets,
  summarize,
} from "../lib/aggregate";
import { formatClassification, formatDate, formatMonth, formatNumber } from "../lib/format";
import { Kicker, SectionHead } from "./ui";

function StatCard({
  figure,
  label,
  sub,
  accent = false,
}: {
  figure: string;
  label: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="panel px-4 py-3.5">
      <div className="kicker mb-2 flex items-center gap-1.5">
        <span className={accent ? "text-amber" : "text-ink-faint"}>{accent ? "▮" : "▯"}</span>
        {label}
      </div>
      <div
        className={`figure text-5xl sm:text-[3.4rem] ${accent ? "text-amber glow" : "text-ink"}`}
      >
        {figure}
      </div>
      {sub && (
        <div className="mt-2 font-mono text-[0.72rem] leading-snug text-ink-faint">{sub}</div>
      )}
    </div>
  );
}

interface TrendDatum {
  month: string;
  jobs: number;
  events: number;
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TrendDatum }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="border border-rule-strong bg-paper-raised px-3 py-2 font-mono text-sm shadow-lg shadow-black/40">
      <div className="text-amber">{formatMonth(d.month)}</div>
      <div className="nums text-ink-soft">
        {formatNumber(d.jobs)} jobs · {d.events} {d.events === 1 ? "notice" : "notices"}
      </div>
    </div>
  );
}

function BreakdownBars({
  rows,
  max,
}: {
  rows: { key: string; label: string; jobs: number; events: number }[];
  max: number;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[9rem_1fr_auto] items-center gap-3">
          <span className="truncate font-mono text-[0.8rem] text-ink-soft" title={r.label}>
            {r.label}
          </span>
          <span
            className="segment block h-3.5"
            style={{ "--fill": max > 0 ? Math.max(2, (r.jobs / max) * 100) : 0 } as CSSProperties}
          >
            <span />
          </span>
          <span className="nums w-20 text-right font-mono text-sm text-ink">
            {formatNumber(r.jobs)}
            <span className="ml-1 text-ink-faint">({r.events})</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function StatsView() {
  const { filtered } = useFilters();
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const trend = useMemo<TrendDatum[]>(() => monthlyBuckets(filtered), [filtered]);
  const byClass = useMemo(
    () => breakdownByClassification(filtered, formatClassification),
    [filtered],
  );
  const byIndustry = useMemo(() => breakdownByIndustry(filtered), [filtered]);
  const biggest = useMemo(() => biggestLayoffs(filtered), [filtered]);

  const classMax = Math.max(1, ...byClass.map((b) => b.jobs));
  const industryMax = Math.max(1, ...byIndustry.map((b) => b.jobs));

  return (
    <div className="reveal flex flex-col gap-12">
      {/* By the numbers */}
      <section>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          <StatCard
            figure={formatNumber(summary.totalJobsLost)}
            label="Jobs cut"
            accent
            sub={
              summary.excludedCount > 0
                ? `Across ${summary.totalEvents} notices · ${summary.excludedCount} excluded (count unknown)`
                : `Across ${summary.totalEvents} notices`
            }
          />
          <StatCard figure={formatNumber(summary.totalEvents)} label="Notices filed" />
          <StatCard
            figure={summary.biggest ? formatNumber(summary.biggest.numberAffected) : "—"}
            label="Largest single cut"
            sub={summary.biggest?.company}
          />
          <StatCard
            figure={summary.averageAffected != null ? formatNumber(summary.averageAffected) : "—"}
            label="Average per notice"
          />
        </div>
      </section>

      {/* Monthly trend */}
      <section>
        <SectionHead kicker="Month by month" title="When the cuts landed" />
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <XAxis
                dataKey="month"
                tickFormatter={(m: string) =>
                  m.endsWith("-01") ? m.slice(0, 4) : formatMonth(m).split(" ")[0]
                }
                interval="preserveStartEnd"
                minTickGap={24}
                axisLine={{ stroke: "var(--color-rule-strong)" }}
                tickLine={false}
              />
              <YAxis axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: "var(--color-paper-raised)" }} />
              <Bar dataKey="jobs" radius={[1, 1, 0, 0]}>
                {trend.map((d) => (
                  <Cell key={d.month} fill="var(--color-amber)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* By type */}
        <section>
          <SectionHead kicker="By the nature of the cut" title="Closings vs. layoffs" />
          <BreakdownBars rows={byClass} max={classMax} />
        </section>

        {/* By industry */}
        <section>
          <SectionHead kicker="By sector" title="Hardest-hit industries" />
          {byIndustry.some((b) => b.label !== "Unspecified") ? (
            <BreakdownBars rows={byIndustry} max={industryMax} />
          ) : (
            <p className="text-sm text-ink-faint">Industry not recorded for these notices.</p>
          )}
        </section>
      </div>

      {/* Biggest layoffs */}
      <section>
        <SectionHead kicker="The largest" title="Biggest single cuts in view" />
        <ol className="flex flex-col">
          {biggest.map((e, i) => (
            <li
              key={e.id}
              className="grid grid-cols-[1.75rem_1fr_auto] items-baseline gap-3 border-b border-rule py-2.5"
            >
              <span className="figure text-base text-ink-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="font-sans text-[1.05rem] font-semibold text-ink">{e.company}</span>
                <span className="ml-2 font-mono text-[0.72rem] text-ink-faint">
                  {e.county !== "unknown" ? `${e.county} Co. · ` : ""}
                  {formatDate(e.noticeDate)}
                </span>
              </span>
              <span className="figure text-2xl text-amber">{formatNumber(e.numberAffected)}</span>
            </li>
          ))}
          {biggest.length === 0 && <Kicker>No counted layoffs in view.</Kicker>}
        </ol>
      </section>
    </div>
  );
}
