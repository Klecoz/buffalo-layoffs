import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { QcewSeries } from "../../shared/types";
import { useData } from "../context/DataContext";
import { useFilters } from "../context/FilterContext";
import {
  biggestLayoffs,
  breakdownByClassification,
  breakdownByIndustry,
  monthlyBuckets,
  summarize,
} from "../lib/aggregate";
import { formatClassification, formatDate, formatMonth, formatNumber } from "../lib/format";
import { SectionHead } from "./ui";

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
    <div className="bg-ink px-2 py-1 font-mono text-[10.5px] text-paper">
      {formatMonth(d.month)} · {formatNumber(d.jobs)} jobs · {d.events}{" "}
      {d.events === 1 ? "notice" : "notices"}
    </div>
  );
}

/** "2025-07-01" → "Q3 2025". */
function quarterLabel(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-/);
  if (!m) return iso;
  return `Q${Math.floor((Number(m[2]) - 1) / 3) + 1} ${m[1]}`;
}

interface EmploymentRow {
  label: string;
  latest: number | null;
  latestDate: string | null;
  /** Year-over-year change as a fraction, e.g. -0.021; null if uncomputable. */
  yoy: number | null;
}

/** Latest covered employment + year-over-year change for one QCEW series. YoY
 *  (4 quarters back) is used rather than QoQ to wash out seasonal hiring swings. */
function employmentRow(series: QcewSeries): EmploymentRow {
  const pts = series.points.filter((p) => p.employment != null);
  const last = pts[pts.length - 1];
  const yearAgo = pts[pts.length - 5];
  const yoy =
    last && yearAgo && yearAgo.employment
      ? (last.employment as number) / (yearAgo.employment as number) - 1
      : null;
  return {
    label: series.label.split("—")[1]?.trim() ?? series.label,
    latest: last?.employment ?? null,
    latestDate: last?.date ?? null,
    yoy,
  };
}

function EmploymentBase({ qcew }: { qcew: QcewSeries[] }) {
  // Group series by county FIPS, preserving the all-industries → manufacturing order.
  const byArea = useMemo(() => {
    const groups = new Map<string, { name: string; rows: EmploymentRow[]; asOf: string | null }>();
    for (const s of qcew) {
      const name = s.label.split("—")[0]?.trim() ?? s.areaFips;
      const row = employmentRow(s);
      const g = groups.get(s.areaFips) ?? { name, rows: [], asOf: row.latestDate };
      g.rows.push(row);
      groups.set(s.areaFips, g);
    }
    return [...groups.values()];
  }, [qcew]);

  if (byArea.length === 0) return null;
  const asOf = byArea.find((a) => a.asOf)?.asOf;

  return (
    <div style={{ marginTop: 40 }}>
      <SectionHead
        kicker="The backdrop"
        title="The employment base"
        note={`Covered employment, BLS QCEW${asOf ? ` · as of ${quarterLabel(asOf)}` : ""} · context only, not part of layoff totals`}
      />
      <div className="twoup">
        {byArea.map((area) => (
          <div key={area.name}>
            <div className="kicker" style={{ marginBottom: 8 }}>
              {area.name}
            </div>
            {area.rows.map((r) => (
              <div className="brow" key={r.label}>
                <div className="top">
                  <span className="name">{r.label}</span>
                  <span className="val nums">
                    {formatNumber(r.latest)}
                    {r.yoy != null && (
                      <span style={{ color: r.yoy < 0 ? "var(--color-brick)" : undefined }}>
                        {r.yoy >= 0 ? "+" : ""}
                        {(r.yoy * 100).toFixed(1)}% yr/yr
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsView() {
  const { filtered } = useFilters();
  const { qcew } = useData();
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const trend = useMemo<TrendDatum[]>(() => monthlyBuckets(filtered), [filtered]);
  const byClass = useMemo(
    () => breakdownByClassification(filtered, formatClassification),
    [filtered],
  );
  // "Unspecified" is not an industry — drop it from the hardest-hit list.
  const byIndustry = useMemo(
    () =>
      breakdownByIndustry(filtered)
        .filter((b) => b.label !== "Unspecified")
        .slice(0, 6),
    [filtered],
  );
  const biggest = useMemo(() => biggestLayoffs(filtered, 8), [filtered]);

  const classMax = Math.max(1, ...byClass.map((b) => b.jobs));
  const industryMax = Math.max(1, ...byIndustry.map((b) => b.jobs));

  return (
    <div className="view">
      {/* figure cards */}
      <div className="figs">
        <div className="fig accent">
          <div className="v nums">{formatNumber(summary.totalJobsLost)}</div>
          <div className="k kicker">Jobs cut</div>
          <div className="sub">
            Across {summary.totalEvents} notices
            {summary.excludedCount > 0
              ? ` · ${summary.excludedCount} excluded (count unknown)`
              : ""}
          </div>
        </div>
        <div className="fig">
          <div className="v nums">{formatNumber(summary.totalEvents)}</div>
          <div className="k kicker">Notices filed</div>
          <div className="sub">In current view</div>
        </div>
        <div className="fig">
          <div className="v nums">
            {summary.biggest ? formatNumber(summary.biggest.numberAffected) : "—"}
          </div>
          <div className="k kicker">Largest single cut</div>
          <div className="sub">{summary.biggest ? summary.biggest.company : "—"}</div>
        </div>
        <div className="fig">
          <div className="v nums">
            {summary.averageAffected != null ? formatNumber(summary.averageAffected) : "—"}
          </div>
          <div className="k kicker">Average per notice</div>
          <div className="sub">Among counted notices</div>
        </div>
      </div>

      {/* monthly trend */}
      <div style={{ marginTop: 40 }}>
        <SectionHead
          kicker="Month by month"
          title="When the cuts landed"
          note="Jobs cut per month, by notice date"
        />
        <div className="trend">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <XAxis
                dataKey="month"
                tickFormatter={(m: string) =>
                  m.endsWith("-01") ? m.slice(0, 4) : formatMonth(m).split(" ")[0]
                }
                interval="preserveStartEnd"
                minTickGap={24}
                axisLine={{ stroke: "var(--color-ink)" }}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: "var(--color-paper-sunk)" }} />
              <Bar dataKey="jobs">
                {trend.map((d) => (
                  <Cell key={d.month} fill="var(--color-brick)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* two-up breakdowns */}
      <div className="twoup" style={{ marginTop: 40 }}>
        <div>
          <SectionHead kicker="By the nature of the cut" title="Closings vs. layoffs" />
          {byClass.map((b) => (
            <div className="brow" key={b.key}>
              <div className="top">
                <span className="name">{b.label}</span>
                <span className="val nums">
                  {formatNumber(b.jobs)}
                  <span>{b.events} notices</span>
                </span>
              </div>
              <div className={`track${b.key === "layoff" ? " slate" : ""}`}>
                <i style={{ width: `${Math.max(2, (b.jobs / classMax) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div>
          <SectionHead kicker="By sector" title="Hardest-hit industries" />
          {byIndustry.length > 0 ? (
            byIndustry.map((b) => (
              <div className="brow" key={b.key}>
                <div className="top">
                  <span className="name">{b.label}</span>
                  <span className="val nums">
                    {formatNumber(b.jobs)}
                    <span>{b.events}</span>
                  </span>
                </div>
                <div className="track">
                  <i style={{ width: `${Math.max(2, (b.jobs / industryMax) * 100)}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p style={{ fontSize: 13, color: "var(--color-ink-faint)" }}>
              Industry not recorded for these notices.
            </p>
          )}
        </div>
      </div>

      {/* biggest single cuts */}
      <div style={{ marginTop: 40 }}>
        <SectionHead
          kicker="The largest"
          title="Biggest single cuts in view"
          note="By workers affected"
        />
        {biggest.map((e, i) => (
          <div className="rank" key={e.id}>
            <span className="no nums">{String(i + 1).padStart(2, "0")}</span>
            <span>
              <div className="co">{e.company}</div>
              <div className="meta">
                {e.county !== "unknown" ? `${e.county} Co. · ` : ""}
                {formatDate(e.noticeDate)} ·{" "}
                <span className={e.classification === "plant_closing" ? "cl" : ""}>
                  {formatClassification(e.classification)}
                </span>
              </div>
            </span>
            <span className="amt nums">{formatNumber(e.numberAffected)}</span>
          </div>
        ))}
        {biggest.length === 0 && <div className="empty">No counted layoffs in view.</div>}
      </div>

      {/* employment backdrop (QCEW — context only, independent of filters) */}
      <EmploymentBase qcew={qcew} />
    </div>
  );
}
