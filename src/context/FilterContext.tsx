import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import type { LayoffEvent } from "../../shared/types";
import { applyFilters, EMPTY_FILTERS, type Filters, isFilterActive } from "../lib/applyFilters";
import { useData } from "./DataContext";

interface FilterState {
  filters: Filters;
  setFilters: (update: Partial<Filters>) => void;
  reset: () => void;
  active: boolean;
  /** All events after filtering (shared by every view). */
  filtered: LayoffEvent[];
}

const FilterContext = createContext<FilterState | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const { events } = useData();
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);

  const setFilters = (update: Partial<Filters>) =>
    setFiltersState((prev) => ({ ...prev, ...update }));
  const reset = () => setFiltersState(EMPTY_FILTERS);

  const filtered = useMemo(() => applyFilters(events, filters), [events, filters]);

  const value: FilterState = {
    filters,
    setFilters,
    reset,
    active: isFilterActive(filters),
    filtered,
  };
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterState {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within a FilterProvider");
  return ctx;
}
