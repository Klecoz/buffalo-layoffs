import type { Classification, County, SourceKind } from "../../shared/types";
import { useData } from "../context/DataContext";
import { useFilters } from "../context/FilterContext";
import { downloadCsv } from "../lib/exportCsv";
import { formatClassification } from "../lib/format";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] transition-colors ${
        active
          ? "border-amber bg-amber/15 text-amber"
          : "border-rule-strong bg-transparent text-ink-soft hover:border-ink-faint hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

const fieldClass =
  "border border-rule-strong bg-transparent px-2 py-1 font-mono text-[0.78rem] text-ink caret-amber focus:border-ink-faint focus:outline-none";

const COUNTIES: County[] = ["Erie", "Niagara", "unknown"];
const CLASSES: Classification[] = ["plant_closing", "layoff", "other", "unknown"];
const SOURCES: { key: SourceKind; label: string }[] = [
  { key: "warn_pdf", label: "WARN filing" },
  { key: "tableau_csv", label: "WARN dashboard" },
  { key: "curated_news", label: "News-reported" },
];

export function FilterBar() {
  const { filters, setFilters, reset, active, filtered } = useFilters();
  const { meta } = useData();
  const [minIso, maxIso] = meta?.dateRange ?? [undefined, undefined];

  const handleExport = () => {
    const stamp = meta?.generatedAt?.slice(0, 10) ?? "export";
    downloadCsv(filtered, `buffalo-layoffs-${stamp}.csv`);
  };

  return (
    <section className="reveal panel px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4">
        {/* Search + reset */}
        <div className="flex items-center gap-3 border-b border-rule pb-1">
          <span className="font-mono text-amber" aria-hidden>
            &gt;
          </span>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder="search company, industry, reason…"
            className="w-full bg-transparent font-mono text-base text-ink caret-amber placeholder:text-ink-faint/70 focus:outline-none"
          />
          {active && (
            <button
              type="button"
              onClick={reset}
              className="shrink-0 border border-brick/50 px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-brick transition-colors hover:bg-brick/10"
            >
              Clear
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[auto_auto_1fr] sm:items-start">
          <div>
            <div className="kicker mb-1.5">County</div>
            <div className="flex flex-wrap gap-1.5">
              {COUNTIES.map((c) => (
                <Chip
                  key={c}
                  active={filters.counties.includes(c)}
                  onClick={() => setFilters({ counties: toggle(filters.counties, c) })}
                >
                  {c === "unknown" ? "Unspecified" : c}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <div className="kicker mb-1.5">Type</div>
            <div className="flex flex-wrap gap-1.5">
              {CLASSES.map((c) => (
                <Chip
                  key={c}
                  active={filters.classifications.includes(c)}
                  onClick={() =>
                    setFilters({ classifications: toggle(filters.classifications, c) })
                  }
                >
                  {formatClassification(c)}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <div className="kicker mb-1.5">Source</div>
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => (
                <Chip
                  key={s.key}
                  active={filters.sources.includes(s.key)}
                  onClick={() => setFilters({ sources: toggle(filters.sources, s.key) })}
                >
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {/* Range, threshold, amendments + export */}
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-t border-rule pt-3">
          <div>
            <div className="kicker mb-1.5">Notice from</div>
            <input
              type="date"
              value={filters.dateStart ?? ""}
              min={minIso}
              max={filters.dateEnd ?? maxIso}
              onChange={(e) => setFilters({ dateStart: e.target.value || null })}
              className={fieldClass}
            />
          </div>
          <div>
            <div className="kicker mb-1.5">to</div>
            <input
              type="date"
              value={filters.dateEnd ?? ""}
              min={filters.dateStart ?? minIso}
              max={maxIso}
              onChange={(e) => setFilters({ dateEnd: e.target.value || null })}
              className={fieldClass}
            />
          </div>
          <div>
            <div className="kicker mb-1.5">Min jobs (known)</div>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="0"
              value={filters.minAffected ?? ""}
              onChange={(e) => {
                const n = Number(e.target.value);
                setFilters({
                  minAffected: e.target.value !== "" && Number.isFinite(n) && n >= 0 ? n : null,
                });
              }}
              className={`${fieldClass} w-20`}
            />
          </div>
          <Chip
            active={filters.showAmendments}
            onClick={() => setFilters({ showAmendments: !filters.showAmendments })}
          >
            Show amendments
          </Chip>
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="ml-auto self-end border border-rule-strong px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-ink-faint hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↓ CSV ({filtered.length})
          </button>
        </div>
      </div>
    </section>
  );
}
