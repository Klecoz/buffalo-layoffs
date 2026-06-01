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
    <button type="button" onClick={onClick} className={`chip${active ? " on" : ""}`}>
      {children}
    </button>
  );
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

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
    <section className="filters">
      {/* Row 1 — search */}
      <div className="search">
        <span className="gt" aria-hidden>
          &gt;
        </span>
        <input
          type="search"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder="search company, industry, reason…"
        />
        {active && (
          <button type="button" className="clear" onClick={reset}>
            Clear
          </button>
        )}
      </div>

      {/* Row 2 — chip groups */}
      <div className="groups">
        <div className="fgroup">
          <div className="glabel kicker">County</div>
          <div className="chips">
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

        <div className="fgroup">
          <div className="glabel kicker">Type</div>
          <div className="chips">
            {CLASSES.map((c) => (
              <Chip
                key={c}
                active={filters.classifications.includes(c)}
                onClick={() => setFilters({ classifications: toggle(filters.classifications, c) })}
              >
                {formatClassification(c)}
              </Chip>
            ))}
          </div>
        </div>

        <div className="fgroup">
          <div className="glabel kicker">Source</div>
          <div className="chips">
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

      {/* Row 3 — date / threshold / amendments + shown count + export */}
      <div className="meta">
        <div className="field">
          <div className="flabel kicker">Notice from</div>
          <input
            type="date"
            value={filters.dateStart ?? ""}
            min={minIso}
            max={filters.dateEnd ?? maxIso}
            onChange={(e) => setFilters({ dateStart: e.target.value || null })}
          />
        </div>
        <div className="field">
          <div className="flabel kicker">to</div>
          <input
            type="date"
            value={filters.dateEnd ?? ""}
            min={filters.dateStart ?? minIso}
            max={maxIso}
            onChange={(e) => setFilters({ dateEnd: e.target.value || null })}
          />
        </div>
        <div className="field">
          <div className="flabel kicker">Min jobs (known)</div>
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
          />
        </div>
        <Chip
          active={filters.showAmendments}
          onClick={() => setFilters({ showAmendments: !filters.showAmendments })}
        >
          Show amendments
        </Chip>
        <span className="count nums">{filtered.length} shown</span>
        <button
          type="button"
          className="csv"
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          ↓ CSV ({filtered.length})
        </button>
      </div>
    </section>
  );
}
