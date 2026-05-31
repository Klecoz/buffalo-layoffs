// Stage B: download each notice PDF into cache/pdfs/, skipping any already on
// disk so re-runs are cheap. Polite: sequential, with a short delay between
// downloads (see lib/http.ts for the User-Agent and retry policy).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchBuffer, sleep } from "./lib/http.ts";
import type { IndexEntry } from "./scrape-index.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, "cache");
const DELAY_MS = 900;

async function main() {
  const indexPath = join(CACHE, "index.json");
  if (!existsSync(indexPath)) {
    console.error("No cache/index.json — run `npm run refresh:index` first.");
    process.exit(1);
  }
  const index: IndexEntry[] = JSON.parse(readFileSync(indexPath, "utf-8"));
  const pdfDir = join(CACHE, "pdfs");
  mkdirSync(pdfDir, { recursive: true });

  let downloaded = 0;
  let cached = 0;
  let failed = 0;
  for (const entry of index) {
    const dest = join(pdfDir, entry.pdfFilename);
    if (existsSync(dest)) {
      cached++;
      continue;
    }
    try {
      const buf = await fetchBuffer(entry.pdfUrl);
      // Sanity-check it's actually a PDF before caching.
      const head = new TextDecoder().decode(buf.slice(0, 5));
      if (!head.startsWith("%PDF")) throw new Error(`not a PDF (starts with ${JSON.stringify(head)})`);
      writeFileSync(dest, buf);
      downloaded++;
      await sleep(DELAY_MS);
    } catch (err) {
      failed++;
      console.warn(`  failed: ${entry.company} — ${String(err)}`);
    }
  }
  console.log(`PDFs: ${downloaded} downloaded, ${cached} already cached, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
