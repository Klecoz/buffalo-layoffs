# Buffalo–Niagara Layoffs Ledger

A local web app that tracks recent mass layoffs and plant closings in **Erie and
Niagara counties, NY** (the Buffalo–Niagara metro), from 2024 to the present. It
compiles New York State's WARN Act notices — the filings employers are legally
required to submit before mass layoffs — into one browsable, editorial-styled
record, with unemployment context and a few news-reported closures that fall
below the WARN threshold.

Presented as a Rust Belt broadsheet: a sortable table of every notice, a timeline
of the cuts over time, and a "by the numbers" dashboard.

> **Coverage floor.** NY's WARN Act only covers employers with 50+ workers cutting
> 25 or more jobs (or 250+). Smaller layoffs and most retail/restaurant/small-
> business closures never appear. These totals are a floor, not the full count.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

The dataset is committed under `public/data/`, so the app runs immediately. To
rebuild it from source, see **Data** below.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build to `dist/` (host-agnostic static site) |
| `npm run preview` | Serve the production build locally |
| `npm test` | Vitest unit tests |
| `npm run lint` | Biome check |
| `npm run refresh-data` | Rebuild `public/data/*.json` from the live sources |

## Data

Three layers, merged and deduped into `public/data/layoffs.json`:

1. **WARN notices** (primary) — scraped from NYS DOL listing pages, with each
   notice PDF parsed for the affected count, county, dates, and reason.
2. **Unemployment context** — Buffalo-metro and Erie County rates from FRED,
   shown as a backdrop on the timeline.
3. **Curated notable layoffs** — a small, hand-maintained list of news-reported
   closures below the WARN threshold, always tagged "News-reported".

April 2025 → present comes from a manual export of the NYS DOL Tableau dashboard.
The full pipeline and the export procedure are documented in
[`scripts/README.md`](scripts/README.md).

## Stack

React + Vite + TypeScript · TanStack Table · Recharts (+ a hand-rolled SVG
timeline) · Tailwind CSS · Biome. Data pipeline in Node/`tsx` with `cheerio` and
`pdfjs-dist`.

## Disclaimer

An independent project, not affiliated with NYS DOL. Figures reflect notices
filed, which can be amended or withdrawn. Data current as of the dataset's
generation date (shown in the app header).
