# Buffalo–Niagara Layoffs Ledger — working notes

Local web app tracking WARN-Act mass layoffs in Erie + Niagara counties, NY
(2024–present). Static React/Vite/TS site; no backend. See README.md for the
overview and scripts/README.md for the data pipeline.

## Architecture

- **Data is static.** The app `fetch`es `public/data/{layoffs,meta,unemployment}.json`
  at load. An offline pipeline (`scripts/`) produces those files; the app never
  hits the network for data.
- **Shared contract:** `shared/types.ts` defines `LayoffEvent`, imported by both
  the pipeline and the app. Change it there once.
- **Shared filter state:** every view reads `useFilters().filtered` (powered by the
  pure `src/lib/applyFilters.ts`), so the table, timeline, and stats always agree.
- **The credibility invariant:** events with an unknown headcount
  (`numberAffected: null` / `dataQuality: "incomplete"`) are EXCLUDED from every
  "jobs lost" total — enforced in `src/lib/aggregate.ts` and unit-tested. They
  still appear in the table, badged. Don't "fix" totals by including them.

## Data pipeline (`scripts/`, run via `tsx`)

- Sources: NYS DOL WARN HTML pages → notice PDFs (2024–Mar 2025), a manual Tableau
  crosstab export (Apr 2025+), FRED unemployment, and `curated/notable.json`.
- The notice "detail page" URL **is** the PDF (served as application/pdf). PDFs are
  Word-generated with clean `Label: value` lines; `parse-pdf.ts` reconstructs lines
  via `pdfjs-dist` then does label-anchored extraction.
- Closure notices use a parallel label set (`Reason For Closure`, `Closure Start
  Date`) vs. layoffs (`Reason For Layoff`, `Layoff Start Date`); `field-aliases.ts`
  + `deriveClassification` handle both.
- **Dedup:** amendments share the *same notice date* (collapse same-day); distinct
  same-company notices days apart with different counts are kept (e.g. Tesla's 2024
  waves). WARN PDFs outrank the Tableau export (per-site, can undercount).
- `scripts/cache/` is git-ignored; `public/data/*.json` and
  `scripts/manual/tableau-export.csv` are committed.

## Conventions

- Tailwind v4 (`@theme` tokens in `src/index.css`); Biome ignores `*.css` (it can't
  parse Tailwind at-rules).
- Editorial "broadsheet" aesthetic: serif display, brick-red accent, hairline rules.
- Refreshing the Tableau slice is a documented manual step (canvas-rendered viz, no
  API) — see scripts/README.md.

## Gotchas

- The Tableau crosstab is UTF-16LE, tab-separated, statewide, one row per site —
  `ingest-tableau.ts` decodes, filters to Erie/Niagara, and sums per-site rows.
- Recharts logs a transient "width(-1)" warning on first paint; harmless.
