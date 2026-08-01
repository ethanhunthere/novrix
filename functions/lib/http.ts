/**
 * Centralized HTTP helpers for Pages Functions.
 *
 * Replaces the copy-pasted CORS/CACHE/JSON-response blocks that were
 * duplicated across 100+ endpoint files. Import from here instead of
 * declaring local constants.
 *
 * NOTE: For *credentialed* endpoints (auth subtree) use the helpers in
 * `./auth.ts` which echo a single trusted Origin. The helpers here are
 * intended for *public read* endpoints (indicators, news, posts list, etc.)
 * where a wildcard is acceptable.
 */

/** Production origin allow-list. Update when the brand domain changes. */
export const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  'https://novrix.io',
  'https://www.novrix.io',
  'https://novrixhere.pages.dev',
]);

/** Resolve a safe `Access-Control-Allow-Origin` value for the request. */
export function resolveOrigin(request: Request): string {
  const o = request.headers.get('Origin') ?? '';
  if (!o) return 'https://novrix.io';
  return ALLOWED_ORIGINS.has(o) ? o : 'https://novrix.io';
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
} as const;

/** Public CORS — wildcard. Safe for unauthenticated read endpoints. */
export function publicCors(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    ...SECURITY_HEADERS,
    ...extra,
  };
}

/** Strict CORS — pinned to allow-listed Origin. Required for any endpoint
 *  that reads cookies or other credentials. */
export function strictCors(
  request: Request,
  methods = 'GET, POST, OPTIONS',
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(request),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
    ...SECURITY_HEADERS,
    ...extra,
  };
}

/** Standard cache TTLs (seconds). */
export const CACHE = {
  /** 1 minute edge / 5 min SWR — for rapidly changing data. */
  short: 'public, s-maxage=60, stale-while-revalidate=300',
  /** 5 min edge / 30 min SWR — for default API responses. */
  medium: 'public, s-maxage=300, stale-while-revalidate=1800',
  /** 1 h edge / 2 h SWR — original default; for daily-updated indicators. */
  long: 'public, s-maxage=3600, stale-while-revalidate=7200',
  /** Never cache (errors, auth). */
  none: 'no-store, no-cache, must-revalidate',
} as const;

/** Build a JSON success response. */
export function jsonOk<T>(
  data: T,
  headers: Record<string, string>,
  cache: string = CACHE.long,
): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...headers, 'Cache-Control': cache },
  });
}

/** Build a typed JSON error response. Never leaks `cause.stack` to clients. */
export function jsonErr(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string>,
  details?: Record<string, unknown>,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
    }),
    { status, headers: { ...headers, 'Cache-Control': CACHE.none } },
  );
}

/** Standard OPTIONS pre-flight response. */
export function preflight(headers: Record<string, string>): Response {
  return new Response(null, { status: 204, headers });
}
