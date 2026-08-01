/**
 * Boot-time pre-fetch cache (bounded LRU + TTL).
 *
 * BootSequence fires fetch() calls during the boot animation (≈ 2.5 s) and
 * stores the resolved Promises here. By the time the content component
 * mounts, the data is already in memory — no second network round-trip.
 *
 * BOUNDS (vs. the previous unbounded `Map`):
 *   - MAX_ENTRIES caps the cache so a long session that visits many routes
 *     does not leak module-level memory. Oldest-first eviction.
 *   - TTL_MS expires stale entries so a 2-hour-old indicator does not get
 *     served as if it were fresh.
 *
 * The public API is unchanged (`prefetch`, `registerPromise`, `fetchCached`)
 * so call sites do not need to be updated.
 */

const MAX_ENTRIES = 160;
const TTL_MS = 5 * 60_000; // 5 minutes

interface Entry {
  promise: Promise<unknown>;
  insertedAt: number;
}

// `Map` preserves insertion order, so iterating yields the oldest first
// — exactly what an LRU eviction needs.
const cache = new Map<string, Entry>();

function evictExpired(now: number): void {
  for (const [k, v] of cache) {
    if (now - v.insertedAt > TTL_MS) cache.delete(k);
    else break; // entries are roughly age-ordered
  }
}

function evictToMax(): void {
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function put(url: string, promise: Promise<unknown>): void {
  cache.set(url, { promise, insertedAt: Date.now() });
  evictExpired(Date.now());
  evictToMax();
}

/**
 * Kick off a background fetch and cache the Promise.
 * Safe to call multiple times for the same URL — only one fetch is ever made.
 */
async function fetchWithRetry(url: string, retries = 2, delayMs = 500): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url, { credentials: 'include' });
      if (r.ok) return await r.json();
      if (attempt < retries) await new Promise((res) => setTimeout(res, delayMs * (attempt + 1)));
    } catch {
      if (attempt < retries) await new Promise((res) => setTimeout(res, delayMs * (attempt + 1)));
    }
  }
  return null;
}

export function prefetch(url: string): void {
  if (cache.has(url)) return;
  put(url, fetchWithRetry(url));
}

/**
 * Register a pre-existing Promise in the cache so fetchCached() finds it.
 * Used by module-level preload code to inject a fetch started before BootSequence.
 * No-op if a promise is already registered for this URL.
 */
export function registerPromise(url: string, promise: Promise<unknown>): void {
  if (!cache.has(url)) put(url, promise);
}

/**
 * Drop-in replacement for fetch() that checks the boot cache first.
 * Returns a synthetic Response wrapping the cached JSON if available,
 * otherwise falls through to a real network fetch.
 */
export async function fetchCached(url: string, options?: RequestInit): Promise<Response> {
  const entry = cache.get(url);
  if (entry && Date.now() - entry.insertedAt <= TTL_MS) {
    const data = await entry.promise;
    if (data !== null) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  // Either expired or missing — drop the stale entry and re-fetch.
  cache.delete(url);
  return fetch(url, options);
}
