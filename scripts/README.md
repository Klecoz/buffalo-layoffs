# Data pipeline

Builds `public/data/{layoffs,meta,unemployment,qcew}.json` from public sources.
Each stage caches to `scripts/cache/` (git-ignored), so re-runs are cheap.

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
5. **`ingest-qcew.ts`** — fetches BLS QCEW county employment (see below) →
   `public/data/qcew.json`.
6. **`normalize.ts`** — merges WARN PDFs + the Tableau export + the curated list,
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

## BLS QCEW county employment (context, not events)

`ingest-qcew.ts` pulls **covered employment** for Erie (FIPS `36029`) and Niagara
(`36063`) counties from the BLS QCEW Open Data Access CSV endpoint — no API key:

```
https://data.bls.gov/cew/data/api/{year}/{qtr}/area/{fips}.csv
```

One file per area+quarter; rows span every ownership × industry × aggregation
level. We keep two rows per county, matched on `(own_code, industry_code)`:

- **All industries:** `own_code = "5"`, `industry_code = "10"`
- **Manufacturing (NAICS 31-33):** `own_code = "5"`, `industry_code = "31-33"`

Each quarter's value is the mean of `month{1,2,3}_emplvl`. The most recent quarter
lags ~5 months, so not-yet-published quarters simply 404 and are skipped.

This is **macro context only**, exactly like the FRED unemployment series — it
names no employer and **never enters `layoffs.json` or any "jobs lost" total**. It
lets layoff clusters be read against the actual employment base (e.g. a
manufacturing employment drop with no matching WARN notice = likely under-reporting).
The app renders it as "The employment base" in the Stats view.

## Curated notable layoffs

`scripts/curated/notable.json` holds hand-entered, news-reported events that fall
below the WARN threshold (small closures WARN never captures). Each needs a
`sourceUrl`. They are always tagged `source: "curated_news"` and shown as
"News-reported" in the app. Edit the JSON and re-run the pipeline to update.

### News sweep (agent-assisted, human-approved)

Finding those sub-threshold events by hand is tedious, so it's run as a periodic
**agent-driven sweep** over a pinned list of WNY outlets in
`scripts/curated/sources.json` (Buffalo Business First, The Buffalo News,
Investigative Post, WNY Labor Today, WGRZ/WIVB/WKBW, Spectrum News). To run one,
ask Claude to **"run the WNY layoff news sweep."** It will:

1. **Fan out** one sub-agent per source (web search/fetch), each scoped to recent
   Erie/Niagara **layoffs or closures**, returning candidates as JSON objects
   matching the `CuratedEntry` shape in `curated.ts` (`company`, `county`,
   `numberAffected` — `null` if unknown — `noticeDate`, `layoffDate`,
   `classification`, `reason`, `industry`, `sourceUrl`, `note`).
2. **Dedup** candidates against both `notable.json` and the official events in
   `public/data/layoffs.json`, using the same rule the pipeline uses.
3. **Verify every candidate against its own `sourceUrl` — REQUIRED, not
   optional.** Open each cited article (the browser tool gets past the bot-blocks
   that `WebFetch` hits) and confirm, from the page itself:
   - the **article date** matches `noticeDate` (catches old articles re-dated to
     today — e.g. a 1992 Moog story or a 2019 Catholic Health story);
   - the **company and event** are what the candidate claims (catches a labor
     *dispute* dressed up as a *closure*);
   - the **headcount** is the stated *local* figure (never a nationwide number),
     and is `null` if the local count isn't given;
   - the **URL actually resolves** (swap any 404 for a working source).

   Drop anything you can't confirm. If a `sourceUrl` is on a domain the browser
   tool can't load, corroborate the event via an alternate accessible outlet and
   replace the URL with that one.
4. **Present the survivors for your approval.** Nothing is auto-committed — only
   entries you OK get appended to `notable.json`.
5. After appending, run the guardrail and re-normalize:

   ```bash
   npx tsx scripts/curated/check.ts   # validates + flags any duplicate data
   npm run refresh-data               # (or refresh:normalize) folds them in
   ```

`check.ts` validates `notable.json` and refuses (exits non-zero) if any entry
duplicates an already-tracked official event or another curated entry — so we
never double-count.

> **Why step 3 is mandatory.** The first sweep produced **4 bad entries out of
> 31** (~13%): two fabricated headcounts traced to a 1992 and a 2024-misdated
> article (Moog, Weinberg) and two misattributions (Catholic Health, Kaleida
> ENT). The agents are a great *lead generator* but an unreliable *source of
> record* — only opening each article caught the errors. Treat sweep output as
> leads to confirm, never as facts to commit.

## Tests

```bash
npm test
```

The high-value targets are `parse-pdf.test.ts` (PDF field extraction, including
the null-fallback path) and `normalize.test.ts` (county filter + amendment
dedup). UI/aggregation logic is covered under `src/lib/`.
