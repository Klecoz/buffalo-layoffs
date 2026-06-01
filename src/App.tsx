import { useEffect, useState } from "react";
import { CoverageNote } from "./components/CoverageNote";
import { Dateline } from "./components/Dateline";
import { FilterBar } from "./components/FilterBar";
import { Masthead } from "./components/Masthead";
import { StatsView } from "./components/StatsView";
import { TableView } from "./components/TableView";
import { TimelineView } from "./components/TimelineView";
import { type ViewKey, ViewTabs } from "./components/ViewTabs";
import { DataProvider, useData } from "./context/DataContext";
import { FilterProvider, useFilters } from "./context/FilterContext";
import { buildSearch, parseTab } from "./lib/urlState";

function Dashboard() {
  const { loading, error, meta } = useData();
  const { filters } = useFilters();
  const [view, setView] = useState<ViewKey>(() => parseTab(window.location.search) ?? "ledger");

  // Mirror filter + tab state into the URL (replace, not push, so typing doesn't
  // flood history) so the current view is shareable and survives reload.
  useEffect(() => {
    const qs = buildSearch(filters, view);
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [filters, view]);

  if (error) {
    return (
      <div className="wrap" style={{ padding: "120px 0", fontFamily: "var(--font-mono)" }}>
        <p className="kicker" style={{ color: "var(--color-brick)" }}>
          Could not load data files.
        </p>
        <p className="mt-3 font-mono text-sm text-ink-faint">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="wrap"
        style={{
          padding: "120px 0",
          fontFamily: "var(--font-mono)",
          color: "var(--color-ink-faint)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        Loading the ledger…
      </div>
    );
  }

  return (
    <>
      <Dateline meta={meta} />
      <ViewTabs value={view} onChange={setView} />

      <div className="wrap">
        <Masthead />
        <FilterBar />

        {view === "ledger" && <StatsView />}
        {view === "table" && <TableView />}
        {view === "timeline" && <TimelineView />}

        <CoverageNote />

        <footer className="foot">
          <p>
            Source: New York State Department of Labor WARN Act notices (dol.ny.gov), supplemented
            by a small set of news-reported closures below the notification threshold. Unemployment
            series from FRED (Buffalo–Niagara Falls metro). An independent project, not affiliated
            with NYS DOL. Figures reflect notices filed, which can be amended or withdrawn; counts
            are not always reported.
          </p>
        </footer>
      </div>
    </>
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
