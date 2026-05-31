// Stage: fetch unemployment-rate context from FRED (no API key — the public
// fredgraph.csv endpoint serves plain CSV). Used purely as a backdrop on the
// timeline so layoff clusters can be read against the macro trend.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { UnemploymentPoint, UnemploymentSeries } from "../shared/types.ts";
import { fetchText } from "./lib/http.ts";

const SINCE = "2023-06-01"; // a little lead-in before the 2024 data window
const SERIES = [
  { id: "BUFF336URN", label: "Buffalo–Niagara Falls metro" },
  { id: "NYERIE9URN", label: "Erie County" },
];

function parseFredCsv(csv: string): UnemploymentPoint[] {
  const points: UnemploymentPoint[] = [];
  const lines = csv.trim().split(/\r?\n/);
  for (const line of lines.slice(1)) {
    const [date, value] = line.split(",");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) continue;
    if (date < SINCE) continue;
    const v = Number.parseFloat(value);
    points.push({ date: date.trim(), rate: Number.isFinite(v) ? v : null });
  }
  return points;
}

async function main() {
  const out: UnemploymentSeries[] = [];
  for (const s of SERIES) {
    const csv = await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${s.id}`);
    const points = parseFredCsv(csv);
    out.push({ id: s.id, label: s.label, points });
    console.log(`  ${s.id} (${s.label}): ${points.length} monthly points`);
  }

  const HERE = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(HERE, "..", "public", "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, "unemployment.json"), JSON.stringify(out, null, 2));
  console.log("Wrote public/data/unemployment.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
