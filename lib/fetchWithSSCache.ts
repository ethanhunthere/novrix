import { fetchCached } from '@/lib/bootCache';
import { SENTIMENT_DATA_VERSION, withSentimentDataVersion } from '@/lib/sentimentDataVersion';

// Per-indicator sessionStorage cache TTL (1 hour)
export const IND_SS_TTL = 3600_000;

// Max entries to prevent unbounded sessionStorage growth.
const MAX_SS_ENTRIES = 96;

// Bump this when deploying changes that require clients to refetch all indicators.
// Old entries keyed with a different version are silently ignored and overwritten.
const CACHE_VERSION = SENTIMENT_DATA_VERSION;

const SS_PREFIX = `novrix_${CACHE_VERSION}_`;

type ApiCachePayload = {
  success?: unknown;
  data?: unknown;
};

function ssCacheKey(url: string): string {
  return SS_PREFIX + url.replace(/^\/api\//, '').replace(/[\/?=&]/g, '_') + '_cache';
}

/** Evict oldest sessionStorage entries when we exceed the cap. */
function evictOldestIfNeeded(): void {
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith(SS_PREFIX)) keys.push(k);
  }
  if (keys.length >= MAX_SS_ENTRIES) {
    keys.sort(); // deterministic; real LRU would need timestamp metadata
    const toRemove = keys.slice(0, keys.length - MAX_SS_ENTRIES + 1);
    for (const k of toRemove) sessionStorage.removeItem(k);
  }
}

export async function fetchWithSSCache(url: string, options?: RequestInit): Promise<Response> {
  const requestUrl = withSentimentDataVersion(url);
  const cacheKey = ssCacheKey(requestUrl);
  if (typeof window !== 'undefined') {
    const raw = sessionStorage.getItem(cacheKey);
    if (raw) {
      try {
        const { d, t } = JSON.parse(raw);
        if (Date.now() - t < IND_SS_TTL && d) {
          return new Response(JSON.stringify(d), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }
  }
  const response = await fetchCached(requestUrl, options);
  if (response.ok) {
    try {
      const clone = response.clone();
      const data = await clone.json() as ApiCachePayload;
      // Only cache responses that actually contain data — prevents stale empty
      // responses from blocking future fetches when the DB hasn't been populated yet.
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        evictOldestIfNeeded();
        sessionStorage.setItem(cacheKey, JSON.stringify({ d: data, t: Date.now() }));
      }
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch { /* quota exceeded or parse error — ignore */ }
  }
  return response;
}
