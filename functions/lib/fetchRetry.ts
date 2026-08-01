/**
 * Resilient `fetch` with timeout, retry, and exponential backoff + jitter.
 *
 * Use for every outbound call to a 3rd-party API (FRED, BGeometrics,
 * blockchain explorers, etc.). Replaces the bare `fetch(url, { signal: AbortSignal.timeout(...) })`
 * pattern that drops a full day of cron data on a single transient 5xx.
 */

export interface FetchRetryOptions extends RequestInit {
  /** Per-attempt timeout in ms. Default: 15_000. */
  timeoutMs?: number;
  /** Number of retries (NOT counting the initial attempt). Default: 2. */
  retries?: number;
  /** Base delay in ms; doubled on each retry plus 0–250ms jitter. Default: 250. */
  baseDelayMs?: number;
  /** HTTP status codes that should trigger a retry. Default: 408, 425, 429, 500, 502, 503, 504. */
  retryOn?: ReadonlySet<number>;
}

const DEFAULT_RETRY_STATUS: ReadonlySet<number> = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * `fetch` that retries idempotent failures.
 *
 * - Retries on network errors and configurable HTTP status codes.
 * - Honors `Retry-After` (seconds) when the upstream provides it.
 * - Caps each attempt with `AbortSignal.timeout`.
 * - Will NOT retry POST/PUT/PATCH/DELETE unless caller explicitly opts-in
 *   by setting `retries` after constructing the request (those callers
 *   are expected to provide their own idempotency key).
 */
export async function fetchRetry(url: string, opts: FetchRetryOptions = {}): Promise<Response> {
  const {
    timeoutMs = 15_000,
    retries = 2,
    baseDelayMs = 250,
    retryOn = DEFAULT_RETRY_STATUS,
    ...init
  } = opts;

  const method = (init.method ?? 'GET').toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  const maxRetries = isSafe ? retries : 0;

  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });

      if (res.ok || !retryOn.has(res.status) || attempt === maxRetries) {
        return res;
      }

      // Honor Retry-After when present.
      const retryAfter = res.headers.get('Retry-After');
      const wait = retryAfter && /^\d+$/.test(retryAfter)
        ? Math.min(parseInt(retryAfter, 10) * 1000, 10_000)
        : baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250);

      // Drain the response body so the connection can be reused.
      try { await res.arrayBuffer(); } catch { /* ignore */ }

      await sleep(wait);
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries) throw err;
      const wait = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250);
      await sleep(wait);
    }
  }

  // Should be unreachable — the loop returns or throws above.
  throw lastErr ?? new Error('fetchRetry: exhausted retries');
}

/** Convenience: fetch JSON with retry. Returns `null` on persistent failure. */
export async function fetchJson<T = unknown>(url: string, opts: FetchRetryOptions = {}): Promise<T | null> {
  try {
    const res = await fetchRetry(url, opts);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}
