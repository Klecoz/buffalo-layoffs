// Orchestrates the full data pipeline end-to-end. Each stage caches to disk, so
// re-runs are cheap (PDFs already downloaded are skipped). Run with:
//   npm run refresh-data
//
// Note: April-2025→present data comes from a manual Tableau export
// (scripts/manual/tableau-export.csv); see scripts/README.md. Everything else is
// fetched automatically here.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const STAGES = [
  ["scrape-index.ts", "Scraping DOL WARN listing pages"],
  ["fetch-pdfs.ts", "Downloading notice PDFs (cached)"],
  ["parse-pdf.ts", "Parsing PDF fields"],
  ["ingest-fred.ts", "Fetching FRED unemployment context"],
  ["normalize.ts", "Merging, filtering, deduping → public/data"],
];

for (const [script, label] of STAGES) {
  console.log(`\n▶ ${label}`);
  const res = spawnSync("npx", ["tsx", join(HERE, script)], { stdio: "inherit" });
  if (res.status !== 0) {
    console.error(`\n✖ Stage failed: ${script}`);
    process.exit(res.status ?? 1);
  }
}
console.log("\n✓ Pipeline complete.");
