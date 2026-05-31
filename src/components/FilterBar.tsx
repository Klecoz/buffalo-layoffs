import type { Classification, County, SourceKind } from "../../shared/types";
import { useFilters } from "../context/FilterContext";
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
      className={`rounded-sm border px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-wider transition-colors ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-rule-strong bg-transparent text-ink-soft hover:border-ink hover:text-ink"
      }`}
    >
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
  const { filters, setFilters, reset, active } = useFilters();

  return (
    <section className="reveal border border-rule bg-paper-raised/70 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4">
        {/* Search + reset */}
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder="Search company, industry, reason…"
            className="w-full border-b border-ink bg-transparent pb-1 font-display text-lg text-ink placeholder:text-ink-faint/70 placeholder:font-sans placeholder:text-base focus:outline-none"
          />
          {active && (
            <button
              type="button"
              onClick={reset}
              className="shrink-0 text-[0.72rem] font-semibold uppercase tracking-wider text-brick underline decoration-brick/40 underline-offset-4 hover:decoration-brick"
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
      </div>
    </section>
  );
}
