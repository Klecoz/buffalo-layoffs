// Polite HTTP helpers for the data pipeline: a descriptive User-Agent, modest
// rate-limiting, and retry-with-backoff. We are scraping a public government
// site — be a good citizen.

const USER_AGENT =
  "buffalo-layoffs-data-pipeline/1.0 (+https://github.com/arseniocolon/buffalo-layoffs; contact arseniocolon@gmail.com)";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface FetchOpts {
  retries?: number;
  /** Base backoff in ms; doubles each retry. */
  backoffMs?: number;
}

async function fetchWithRetry(url: string, opts: FetchOpts = {}): Promise<Response> {
  const { retries = 3, backoffMs = 800 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
        redirect: "follow",
      });
      // Retry only on transient server errors.
      if (res.status >= 500 && res.status < 600 && attempt < retries) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
    }
  }
  throw new Error(`Failed to fetch ${url}: ${String(lastErr)}`);
}

export async function fetchText(url: string, opts?: FetchOpts): Promise<string> {
  const res = await fetchWithRetry(url, opts);
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return res.text();
}

export async function fetchBuffer(url: string, opts?: FetchOpts): Promise<Uint8Array> {
  const res = await fetchWithRetry(url, opts);
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
