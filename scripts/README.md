# Data pipeline

Builds `public/data/{layoffs,meta,unemployment}.json` from public sources. Each
stage caches to `scripts/cache/` (git-ignored), so re-runs are cheap.

## Refresh everything

```bash
npm run refresh-data
```

This runs, in order:

1. **`scrape-index.ts`** — scrapes the NYS DOL WARN listing pages
   (`/2024-warn-notices` and the active `/warn-notices` page), keeps Region =
   "Western", and writes `cache/index.json`. Each company link is itself the
   notice PDF. **Fails loudly if zero Western rows are found** (markup drift).
2. **`fetch-pdfs.ts`** — downloads each notice PDF into `cache/pdfs/` (skips ones
   already cached). Polite: descriptive User-Agent, ~1s between requests.
3. **`parse-pdf.ts`** — extracts fields from each PDF with `pdfjs-dist`. Anything
   unreadable becomes `null` + a `parseWarnings` note; the event is still kept.
4. **`ingest-fred.ts`** — fetches Buffalo-metro and Erie County unemployment
   rates from FRED (no API key) → `public/data/unemployment.json`.
5. **`normalize.ts`** — merges WARN PDFs + the Tableau export + the curated list,
   filters to Erie/Niagara, applies the 2024+ window, dedups amendments, and
   writes `public/data/layoffs.json` + `meta.json`.

The HTML/PDF pages only cover **2024 through ~March 2025** (NYS DOL froze them
when it moved to a Tableau dashboard in April 2025). April 2025 → present comes
from the manual export below.

## Manual step: the Tableau dashboard export (April 2025 → present)

The current WARN dashboard is a JS-only Tableau viz with a canvas-rendered table
and no API, so this slice is a periodic manual export. It is committed at
`scripts/manual/tableau-export.csv` and read by `ingest-tableau.ts`.

To refresh it:

1. Open <https://dol.ny.gov/warn-dashboard> (or the underlying viz directly:
   `https://public.tableau.com/views/WorkerAdjustmentRetrainingNotificationWARN/WARN`).
2. Go to the **"Search WARN Notices"** tab.
3. In **Select Year**, check the year(s) you want (e.g. 2025 and 2026), Apply.
   You can leave **Region** as "(All)" — the importer filters to Erie/Niagara by
   the county column itself.
4. Click the toolbar **Download → Crosstab**.
5. Select the **`A_Excel_Table`** sheet and **CSV** format, then Download.
6. Save the file over `scripts/manual/tableau-export.csv`.

The export is UTF-16, tab-separated, statewide, and split one row per impacted
site; `ingest-tableau.ts` decodes it, keeps Erie/Niagara, and aggregates per-site
rows back into one event per notice. Then re-run `npm run refresh-data` (or just
`npm run refresh:normalize`) and review the diff to `public/data/layoffs.json`.

## Curated notable layoffs

`scripts/curated/notable.json` holds hand-entered, news-reported events that fall
below the WARN threshold (small closures WARN never captures). Each needs a
`sourceUrl`. They are always tagged `source: "curated_news"` and shown as
"News-reported" in the app. Edit the JSON and re-run the pipeline to update.

## Tests

```bash
npm test
```

The high-value targets are `parse-pdf.test.ts` (PDF field extraction, including
the null-fallback path) and `normalize.test.ts` (county filter + amendment
dedup). UI/aggregation logic is covered under `src/lib/`.
