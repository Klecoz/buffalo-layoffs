import { useState } from "react";
import { CoverageNote } from "./components/CoverageNote";
import { FilterBar } from "./components/FilterBar";
import { Masthead } from "./components/Masthead";
import { StatsView } from "./components/StatsView";
import { TableView } from "./components/TableView";
import { TimelineView } from "./components/TimelineView";
import { type ViewKey, ViewTabs } from "./components/ViewTabs";
import { DataProvider, useData } from "./context/DataContext";
import { FilterProvider, useFilters } from "./context/FilterContext";

function ResultMeta() {
  const { filtered, active } = useFilters();
  return (
    <p className="kicker">
      {filtered.length} {filtered.length === 1 ? "notice" : "notices"}
      {active ? " match the filters" : " on record"}
    </p>
  );
}

function Dashboard() {
  const { loading, error, meta } = useData();
  const [view, setView] = useState<ViewKey>("ledger");

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-display text-2xl text-brick">The ledger couldn't be loaded.</p>
        <p className="mt-2 text-sm text-ink-faint">{error}</p>
        <p className="mt-4 text-sm text-ink-soft">
          Run <code className="bg-paper-sunk px-1">npm run refresh-data</code> to build the dataset.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
      <Masthead meta={meta} />

      <div className="mt-6">
        <CoverageNote meta={meta} />
      </div>

      <div className="mt-8 flex flex-col gap-6">
        <FilterBar />

        <div className="flex items-end justify-between gap-4">
          <ViewTabs value={view} onChange={setView} />
        </div>

        <div className="flex items-center justify-between">
          <ResultMeta />
        </div>

        {loading ? (
          <p className="py-24 text-center font-display text-xl text-ink-faint">Setting the type…</p>
        ) : (
          <div className="pt-2">
            {view === "ledger" && <StatsView />}
            {view === "table" && <TableView />}
            {view === "timeline" && <TimelineView />}
          </div>
        )}
      </div>

      <footer className="mt-16 border-t border-rule pt-4 text-[0.72rem] leading-relaxed text-ink-faint">
        Source: New York State Department of Labor WARN Act notices (dol.ny.gov), with unemployment
        context from FRED and a small set of news-reported closures. This is an independent project,
        not affiliated with NYS DOL. Figures reflect notices filed, which can be amended or
        withdrawn.
      </footer>
    </div>
  );
}

export function App() {
  return (
    <DataProvider>
      <FilterProvider>
        <Dashboard />
      </FilterProvider>
    </DataProvider>
  );
}
