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

function zeroCopyResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => data,
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
  } as unknown as Response;
}

// In-memory instant RAM cache: 0ms lookup, zero de-serialization overhead
const MEM_CACHE = new Map<string, { d: unknown; t: number }>();
// In-flight promise map: deduplicates concurrent requests for the exact same indicator
const IN_FLIGHT = new Map<string, Promise<Response>>();

export async function fetchWithSSCache(url: string, options?: RequestInit): Promise<Response> {
  const requestUrl = withSentimentDataVersion(url);
  const cacheKey = ssCacheKey(requestUrl);

  // 1. Instant RAM cache hit (0ms)
  const mem = MEM_CACHE.get(cacheKey);
  if (mem && Date.now() - mem.t < IND_SS_TTL) {
    return zeroCopyResponse(mem.d);
  }

  // 2. Browser sessionStorage cache (warm across same-session reloads)
  if (typeof window !== 'undefined') {
    const raw = sessionStorage.getItem(cacheKey);
    if (raw) {
      try {
        const { d, t } = JSON.parse(raw);
        if (Date.now() - t < IND_SS_TTL && d) {
          MEM_CACHE.set(cacheKey, { d, t });
          return zeroCopyResponse(d);
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }
  }

  // 3. Request coalescing: reuse in-flight promise if identical request is already running
  const existing = IN_FLIGHT.get(cacheKey);
  if (existing) {
    return existing;
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetchCached(requestUrl, options);
      if (response.ok) {
        try {
          const data = await response.json() as ApiCachePayload;
          // Only cache responses that actually contain data — prevents stale empty
          // responses from blocking future fetches when the DB hasn't been populated yet.
          const isPopulated = (data.success && Array.isArray(data.data) && data.data.length > 0) || (Array.isArray(data) && data.length > 0);
          if (isPopulated) {
            MEM_CACHE.set(cacheKey, { d: data, t: Date.now() });
            if (typeof window !== 'undefined') {
              try {
                const serialized = JSON.stringify({ d: data, t: Date.now() });
                // Only store lightweight payloads (<100KB) in sessionStorage to prevent QuotaExceededError
                if (serialized.length < 100_000) {
                  evictOldestIfNeeded();
                  sessionStorage.setItem(cacheKey, serialized);
                }
              } catch {
                // sessionStorage full or QuotaExceededError — gracefully skip sessionStorage cache
              }
            }
          }
          return zeroCopyResponse(data);
        } catch {
          // JSON parse error — fall through to return original response
        }
      }
      return response;
    } finally {
      IN_FLIGHT.delete(cacheKey);
    }
  })();

  IN_FLIGHT.set(cacheKey, fetchPromise);
  return fetchPromise;
}
