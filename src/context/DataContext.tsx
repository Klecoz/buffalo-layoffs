import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { DatasetMeta, LayoffEvent, QcewSeries, UnemploymentSeries } from "../../shared/types";

interface DataState {
  events: LayoffEvent[];
  meta: DatasetMeta | null;
  unemployment: UnemploymentSeries[];
  qcew: QcewSeries[];
  loading: boolean;
  error: string | null;
}

const DataContext = createContext<DataState | null>(null);

const base = import.meta.env.BASE_URL;

async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({
    events: [],
    meta: null,
    unemployment: [],
    qcew: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      loadJson<LayoffEvent[]>("data/layoffs.json"),
      loadJson<DatasetMeta>("data/meta.json"),
      loadJson<UnemploymentSeries[]>("data/unemployment.json").catch(() => []),
      loadJson<QcewSeries[]>("data/qcew.json").catch(() => []),
    ])
      .then(([events, meta, unemployment, qcew]) => {
        if (!active) return;
        setState({ events, meta, unemployment, qcew, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setState((s) => ({ ...s, loading: false, error: String(err) }));
      });
    return () => {
      active = false;
    };
  }, []);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
