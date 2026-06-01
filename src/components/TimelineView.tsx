import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LayoffEvent } from "../../shared/types";
import { useData } from "../context/DataContext";
import { useFilters } from "../context/FilterContext";
import { formatClassification, formatDate, formatNumber } from "../lib/format";
import { SectionHead } from "./ui";

const M = { top: 24, right: 52, bottom: 30, left: 18 };
const HEIGHT = 440;
const DAY = 86_400_000;

const CLASS_FILL: Record<string, string> = {
  plant_closing: "var(--color-brick)",
  layoff: "var(--color-slate)",
  other: "var(--color-steel)",
  unknown: "var(--color-ink-faint)",
};

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    setWidth(el.clientWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export function TimelineView() {
  const { filtered } = useFilters();
  const { unemployment } = useData();
  const { ref, width } = useWidth();
  const [hover, setHover] = useState<{ e: LayoffEvent; x: number; y: number } | null>(null);

  const innerW = Math.max(320, width - M.left - M.right);
  const innerH = HEIGHT - M.top - M.bottom;

  const series = unemployment.find((s) => s.id === "BUFF336URN") ?? unemployment[0];

  const { t0, t1 } = useMemo(() => {
    const times = filtered.map((e) => Date.parse(e.noticeDate));
    const seriesTimes = (series?.points ?? []).map((p) => Date.parse(p.date));
    const all = [...times, ...seriesTimes, Date.parse("2024-01-01")].filter(
      (n) => !Number.isNaN(n),
    );
    const lo = Math.min(...all);
    const hi = Math.max(...all, Date.now() - 0); // through "now" upper bound from data
    return { t0: lo - 10 * DAY, t1: hi + 10 * DAY };
  }, [filtered, series]);

  const x = (iso: string) => M.left + ((Date.parse(iso) - t0) / (t1 - t0)) * innerW;

  // Event y by magnitude (sqrt-compressed); unknown counts ride the baseline.
  const maxAffected = Math.max(1, ...filtered.map((e) => e.numberAffected ?? 0));
  const baselineY = M.top + innerH - 8;
  const eventY = (e: LayoffEvent) => {
    if (e.numberAffected == null) return baselineY;
    const frac = Math.sqrt(e.numberAffected) / Math.sqrt(maxAffected);
    return M.top + innerH - 8 - frac * (innerH - 40);
  };
  const radius = (e: LayoffEvent) =>
    e.numberAffected == null ? 4 : 4 + Math.sqrt(e.numberAffected / maxAffected) * 16;

  // Unemployment backdrop scale (right axis).
  const rates = (series?.points ?? []).map((p) => p.rate).filter((r): r is number => r != null);
  const rLo = Math.floor(Math.min(...rates, 3) - 0.5);
  const rHi = Math.ceil(Math.max(...rates, 5) + 0.5);
  const yRate = (r: number) => M.top + (1 - (r - rLo) / (rHi - rLo)) * innerH;
  const ratePath = (series?.points ?? [])
    .filter((p) => p.rate != null)
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${yRate(p.rate as number).toFixed(1)}`,
    )
    .join(" ");

  // Quarter gridlines.
  const ticks: { t: number; label: string; year: boolean }[] = [];
  {
    const d = new Date(t0);
    d.setUTCDate(1);
    d.setUTCMonth(Math.floor(d.getUTCMonth() / 3) * 3);
    for (let t = d.getTime(); t <= t1; ) {
      const cur = new Date(t);
      const month = cur.getUTCMonth();
      ticks.push({
        t,
        label: month === 0 ? String(cur.getUTCFullYear()) : ["Jan", "Apr", "Jul", "Oct"][month / 3],
        year: month === 0,
      });
      cur.setUTCMonth(month + 3);
      t = cur.getTime();
    }
  }

  // Sort so smaller dots paint on top of larger ones.
  const drawOrder = [...filtered].sort((a, b) => (b.numberAffected ?? 0) - (a.numberAffected ?? 0));

  return (
    <div className="view">
      <SectionHead kicker="Every notice, on a timeline" title="Waves of loss over time" />

      {/* legend */}
      <div className="legend">
        <span className="it">
          <span className="dot" style={{ background: "var(--color-brick)" }} /> Plant closing
        </span>
        <span className="it">
          <span className="dot" style={{ background: "var(--color-slate)" }} /> Layoff
        </span>
        <span className="it">
          <span
            className="dot"
            style={{ background: "transparent", border: "1px solid var(--color-ink-faint)" }}
          />{" "}
          Count unknown
        </span>
        <span className="it">
          <span className="ln" style={{ background: "var(--color-gold)" }} />{" "}
          {series?.label ?? "Unemployment"} rate (right axis)
        </span>
        <span className="muted">· dot size ∝ jobs cut</span>
      </div>

      <div ref={ref} className="tl-wrap">
        <svg
          width={width || 900}
          height={HEIGHT}
          role="img"
          aria-label="Timeline of layoff notices"
        >
          {/* quarter gridlines */}
          {ticks.map((tk) => (
            <g key={tk.t}>
              <line
                x1={M.left + ((tk.t - t0) / (t1 - t0)) * innerW}
                x2={M.left + ((tk.t - t0) / (t1 - t0)) * innerW}
                y1={M.top}
                y2={M.top + innerH}
                stroke="var(--color-rule)"
                strokeWidth={1}
                strokeDasharray={tk.year ? undefined : "2 3"}
              />
              <text
                x={M.left + ((tk.t - t0) / (t1 - t0)) * innerW}
                y={HEIGHT - 10}
                textAnchor="middle"
                className="fill-ink-faint"
                style={{ fontSize: 11, fontWeight: tk.year ? 600 : 400 }}
              >
                {tk.label}
              </text>
            </g>
          ))}

          {/* unemployment backdrop */}
          {ratePath && (
            <>
              <path
                d={ratePath}
                fill="none"
                stroke="var(--color-gold)"
                strokeWidth={1.75}
                opacity={0.65}
              />
              {[rLo, Math.round((rLo + rHi) / 2), rHi].map((r) => (
                <text
                  key={r}
                  x={width - M.right + 8}
                  y={yRate(r) + 3}
                  className="fill-ink-faint"
                  style={{ fontSize: 10 }}
                >
                  {r}%
                </text>
              ))}
            </>
          )}

          {/* baseline */}
          <line
            x1={M.left}
            x2={M.left + innerW}
            y1={baselineY}
            y2={baselineY}
            stroke="var(--color-rule-strong)"
            strokeWidth={1}
          />

          {/* events */}
          {drawOrder.map((e) => {
            const cx = x(e.noticeDate);
            const cy = eventY(e);
            const unknown = e.numberAffected == null;
            const isHover = hover?.e.id === e.id;
            const label = `${e.company}: ${
              e.numberAffected != null
                ? `${formatNumber(e.numberAffected)} jobs`
                : "count not reported"
            }${e.county !== "unknown" ? `, ${e.county} County` : ""}, ${formatDate(e.noticeDate)}`;
            return (
              <g key={e.id}>
                <line
                  x1={cx}
                  x2={cx}
                  y1={cy}
                  y2={baselineY}
                  stroke="var(--color-rule-strong)"
                  strokeWidth={0.5}
                  opacity={0.5}
                />
                {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG data point; tooltip on hover/focus/tap supplements the fully-accessible table view */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius(e)}
                  fill={unknown ? "transparent" : CLASS_FILL[e.classification]}
                  fillOpacity={0.78}
                  stroke={unknown ? "var(--color-ink-faint)" : "var(--color-paper)"}
                  strokeWidth={unknown ? 1.25 : 1}
                  className="cursor-pointer transition-[stroke-width] focus:outline-none"
                  style={isHover ? { strokeWidth: 2, stroke: "var(--color-ink)" } : undefined}
                  tabIndex={0}
                  aria-label={label}
                  onMouseEnter={() => setHover({ e, x: cx, y: cy })}
                  onMouseLeave={() => setHover((h) => (h?.e.id === e.id ? null : h))}
                  onFocus={() => setHover({ e, x: cx, y: cy })}
                  onBlur={() => setHover((h) => (h?.e.id === e.id ? null : h))}
                  onTouchStart={() => setHover({ e, x: cx, y: cy })}
                />
              </g>
            );
          })}
        </svg>

        {hover && (
          <div
            className="tl-tip"
            style={{
              left: Math.min(Math.max(hover.x, 110), (width || 900) - 110),
              top: hover.y + 14,
            }}
          >
            <div className="co">{hover.e.company}</div>
            <div className="n nums">
              {hover.e.numberAffected != null
                ? `${formatNumber(hover.e.numberAffected)} jobs`
                : "Count not reported"}
            </div>
            <div className="m">
              {hover.e.county !== "unknown" ? `${hover.e.county} Co. · ` : ""}
              {formatDate(hover.e.noticeDate)} · {formatClassification(hover.e.classification)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
