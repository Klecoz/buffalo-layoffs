// Guardrail for the curated news list: validate notable.json and catch
// duplicate data BEFORE it pollutes the dataset. Run this after a news sweep (or
// any hand-edit) and before committing:
//
//   npx tsx scripts/curated/check.ts
//
// It does two things:
//   1. Validates notable.json against the CuratedEntry schema (via loadCurated,
//      which throws on malformed entries).
//   2. Flags likely duplicates using the SAME `sameEvent` rule the pipeline uses
//      to dedup — both:
//        a. a curated entry that duplicates an OFFICIAL WARN/Tableau event already
//           in public/data/layoffs.json (i.e. the event is already tracked), and
//        b. two curated entries that describe the same event as each other.
//
// Exits non-zero if any duplicate is found, so it can gate a sweep.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LayoffEvent } from "../../shared/types.ts";
import { loadCurated } from "../curated.ts";
import { sameEvent } from "../normalize.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

function loadOfficialEvents(): LayoffEvent[] {
  const path = join(HERE, "..", "..", "public", "data", "layoffs.json");
  if (!existsSync(path)) return [];
  const all: LayoffEvent[] = JSON.parse(readFileSync(path, "utf-8"));
  // Compare only against official sources — curated entries already live in
  // layoffs.json too, and matching one against itself isn't a real duplicate.
  return all.filter((e) => e.source !== "curated_news");
}

function main() {
  const curated = loadCurated(); // throws on schema violation
  console.log(`✓ notable.json valid — ${curated.length} curated entries.`);

  const official = loadOfficialEvents();
  const problems: string[] = [];

  // a. curated vs. already-tracked official events
  for (const c of curated) {
    const hit = official.find((o) => sameEvent(o, c));
    if (hit) {
      problems.push(
        `DUP vs official: "${c.company}" (${c.noticeDate}) looks like the already-tracked ` +
          `${hit.source} event "${hit.company}" (${hit.noticeDate}). Drop the curated entry.`,
      );
    }
  }

  // b. curated vs. curated
  for (let i = 0; i < curated.length; i++) {
    for (let j = i + 1; j < curated.length; j++) {
      if (sameEvent(curated[i], curated[j])) {
        problems.push(
          `DUP within curated: "${curated[i].company}" (${curated[i].noticeDate}) and ` +
            `"${curated[j].company}" (${curated[j].noticeDate}) describe the same event.`,
        );
      }
    }
  }

  if (problems.length === 0) {
    console.log(`✓ No duplicates against ${official.length} official events.`);
    return;
  }
  console.error(`\n✖ ${problems.length} possible duplicate(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

main();
