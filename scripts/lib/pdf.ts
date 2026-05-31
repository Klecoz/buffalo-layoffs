// PDF text extraction via pdfjs. We reconstruct logical lines by grouping text
// items that share a baseline (y), then ordering left-to-right (x). The NYS WARN
// PDFs are Word-generated with clean "Label: value" lines, so this reconstruction
// is enough to drive label-anchored field parsing (see parse-pdf.ts).
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/** Pixels of vertical slack within which two items count as the same line. */
const Y_TOLERANCE = 3;

export async function extractPdfLines(data: Uint8Array): Promise<string[]> {
  // pdfjs may detach the underlying buffer; hand it a copy so callers keep theirs.
  const loadingTask = getDocument({ data: data.slice(), useSystemFonts: true });
  const doc = await loadingTask.promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .map((i) => {
        const it = i as { str?: string; transform?: number[] };
        return { str: it.str ?? "", x: it.transform?.[4] ?? 0, y: it.transform?.[5] ?? 0 };
      })
      .filter((i) => i.str.length > 0);

    // Bucket items into lines by baseline.
    const buckets: { y: number; items: { str: string; x: number }[] }[] = [];
    for (const it of items) {
      let bucket = buckets.find((b) => Math.abs(b.y - it.y) <= Y_TOLERANCE);
      if (!bucket) {
        bucket = { y: it.y, items: [] };
        buckets.push(bucket);
      }
      bucket.items.push({ str: it.str, x: it.x });
    }
    buckets.sort((a, b) => b.y - a.y); // top of page first
    for (const b of buckets) {
      const line = b.items
        .sort((a, c) => a.x - c.x)
        .map((i) => i.str)
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (line) lines.push(line);
    }
  }
  await loadingTask.destroy();
  return lines;
}
