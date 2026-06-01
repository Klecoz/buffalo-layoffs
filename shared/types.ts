// The single source of truth for a layoff record, shared by the data pipeline
// (which produces these) and the app (which renders them). Keep this file
// dependency-free so both Node scripts and the browser bundle can import it.

export type Classification = "plant_closing" | "layoff" | "other" | "unknown";

export type County = "Erie" | "Niagara" | "unknown";

export type DataQuality = "complete" | "incomplete";

export type SourceKind = "warn_pdf" | "tableau_csv" | "tableau_live" | "curated_news";

/**
 * A single layoff event in the Buffalo–Niagara area.
 *
 * Numeric fields are `null` when they could not be determined from the source.
 * Any event with `numberAffected === null` (or `dataQuality === "incomplete"`)
 * MUST be excluded from "jobs lost" aggregates — see src/lib/aggregate.ts. The
 * event is still kept and shown in the table so nothing is silently dropped.
 */
export interface LayoffEvent {
  /** Stable identifier: hash of company + noticeDate + source key. */
  id: string;
  company: string;
  county: County;
  /** NYS workforce region, e.g. "Western". */
  region: string;
  /** Workers affected. `null` => excluded from totals. */
  numberAffected: number | null;
  /** Total site employment, when reported. */
  totalEmployees: number | null;
  /** ISO `YYYY-MM-DD`. The WARN notice date ("Notice Dated"). */
  noticeDate: string;
  /** ISO `YYYY-MM-DD`. When NYS DOL posted the notice. */
  datePosted: string | null;
  /** ISO `YYYY-MM-DD`. First separation / layoff date. */
  layoffDate: string | null;
  /** ISO `YYYY-MM-DD`. For plant closings. */
  closingDate: string | null;
  classification: Classification;
  /** Free-text "Reason for Dislocation". */
  reason: string | null;
  /** Industry label — present from Tableau exports, usually null from PDFs. */
  industry: string | null;
  /** Union name or status, when reported. */
  union: string | null;
  /** True if this notice amends an earlier one. */
  isAmendment: boolean;
  /** `id` of the event this one supersedes, if any. */
  amends: string | null;
  source: SourceKind;
  /** Link to the source PDF, dashboard, or news article. */
  sourceUrl: string | null;
  dataQuality: DataQuality;
  /** Human-readable notes about extraction problems. */
  parseWarnings: string[];
}

/** Sidecar metadata describing a generated dataset. */
export interface DatasetMeta {
  /** ISO timestamp the dataset was generated. */
  generatedAt: string;
  /** Inclusive ISO date range covered, `[earliest, latest]` notice dates. */
  dateRange: [string, string] | null;
  totalEvents: number;
  /** Events whose counts could not be parsed, excluded from totals. */
  excludedFromTotalsCount: number;
  /** Count of events contributed by each source kind. */
  sourceCounts: Record<SourceKind, number>;
}

/** A monthly unemployment-rate observation, used as timeline context. */
export interface UnemploymentPoint {
  /** ISO `YYYY-MM-DD`, first of the month. */
  date: string;
  /** Percent, e.g. 4.3. `null` for gaps. */
  rate: number | null;
}

export interface UnemploymentSeries {
  /** FRED series id, e.g. "BUFF336URN". */
  id: string;
  /** Human label, e.g. "Buffalo–Niagara Falls metro". */
  label: string;
  points: UnemploymentPoint[];
}

/** One quarter of BLS QCEW covered employment for an area/industry. Like the
 *  unemployment series, this is macro CONTEXT only — it names no employer and
 *  MUST NOT enter any "jobs lost" total. */
export interface QcewPoint {
  /** Quarter start, ISO `YYYY-MM-DD` (e.g. "2024-04-01" for 2024 Q2). */
  date: string;
  /** Avg of the quarter's three monthly employment levels; `null` on gaps. */
  employment: number | null;
}

export interface QcewSeries {
  /** Area FIPS, e.g. "36029" (Erie). */
  areaFips: string;
  /** Human label, e.g. "Erie County — All industries". */
  label: string;
  /** QCEW NAICS `industry_code` this series covers ("10" = all industries). */
  industryCode: string;
  points: QcewPoint[];
}
