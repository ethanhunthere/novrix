/**
 * NOVRIX Auth — Session & cookie helpers
 * Used by all auth Pages Functions.
 *
 * SECURITY NOTES
 *  - CORS is pinned to an env-configured Origin allow-list. Wildcard +
 *    credentialed cookies is forbidden by the spec and a clear vuln.
 *  - The session cookie uses the `__Host-` prefix so the browser refuses
 *    to send it from a subdomain or over plain HTTP.
 *  - The NOVRIX_CHARSET is imported from `crypto.ts` to avoid drift between
 *    generation and validation.
 */

import { NOVRIX_CHARSET } from './crypto';

/**
 * Cookie name. The `__Host-` prefix imposes Path=/, Secure, no Domain.
 * If you ever need to read the cookie client-side (you should not),
 * change to `novrix_session` and remove the prefix everywhere.
 */
export const SESSION_COOKIE = '__Host-novrix_session';
/** Older cookie name kept for transitional reads only. Do NOT write. */
const LEGACY_SESSION_COOKIE = 'novrix_session';
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days (seconds)

interface AuthEnv { ALLOWED_ORIGIN?: string }

/** Default allowed origins. ALLOWED_ORIGIN env var (comma-separated) overrides. */
const DEFAULT_ALLOWED = ['https://novrix.io', 'https://www.novrix.io', 'https://novrixhere.pages.dev'];

function allowedOrigins(env?: AuthEnv): string[] {
  const fromEnv = env?.ALLOWED_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_ALLOWED;
}

// ─── CORS headers ────────────────────────────────────────────────────────────

/**
 * Build credentialed CORS headers pinned to the request's Origin if it is
 * allow-listed. Returns the canonical production origin otherwise — never `*`.
 */
export function buildCorsHeaders(request: Request, env?: AuthEnv): Record<string, string> {
  const list = allowedOrigins(env);
  const reqOrigin = request.headers.get('Origin') ?? '';
  const sameOrigin = new URL(request.url).origin;
  const origin = list.includes(reqOrigin) || reqOrigin === sameOrigin
    ? reqOrigin
    : (list[0] as string);
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

export function optionsResponse(request?: Request, env?: AuthEnv): Response {
  const headers = request
    ? buildCorsHeaders(request, env)
    : buildCorsHeaders(new Request('https://novrix.io'), env);
  return new Response(null, { status: 204, headers });
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function buildSetCookieHeader(token: string): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    `Max-Age=${SESSION_MAX_AGE}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
}

export function buildClearCookieHeader(): string {
  return [
    `${SESSION_COOKIE}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
}

/** Build an additional clear-cookie header for the legacy (un-prefixed) name. */
export function buildClearLegacyCookieHeader(): string {
  return [
    `${LEGACY_SESSION_COOKIE}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
}

/** Read the session token. Prefers the `__Host-` cookie, falls back to legacy. */
export function getSessionCookie(request: Request): string | null {
  const cookie = request.headers.get('Cookie') ?? '';
  const m1 = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}=([^;]+)`));
  if (m1?.[1]) return m1[1];
  const m2 = cookie.match(new RegExp(`(?:^|;\\s*)${LEGACY_SESSION_COOKIE}=([^;]+)`));
  return m2?.[1] ?? null;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function nowISO(): string { return new Date().toISOString(); }
export function expiresAtDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// ─── Response helpers ─────────────────────────────────────────────────────────

/**
 * JSON response. Optionally takes a Request so headers can be CORS-pinned.
 * Old call sites that omit `request` get safe fallback headers (production origin).
 */
export function json(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
  request?: Request,
  env?: AuthEnv,
): Response {
  const headers = request
    ? buildCorsHeaders(request, env)
    : buildCorsHeaders(new Request('https://novrix.io'), env);
  return new Response(JSON.stringify(body), { status, headers: { ...headers, ...extraHeaders } });
}

export function jsonError(message: string, status = 400, request?: Request, env?: AuthEnv): Response {
  return json({ success: false, error: message }, status, undefined, request, env);
}

// ─── Input validation ─────────────────────────────────────────────────────────

/**
 * Validates 15-character NOVRIX ID format against the canonical charset.
 * Source of truth lives in `crypto.ts`.
 */
export function isValidNovrixId(id: string): boolean {
  if (typeof id !== 'string' || id.length !== 15) return false;
  for (let i = 0; i < id.length; i++) {
    const c = id[i] as string;
    if (!NOVRIX_CHARSET.includes(c)) return false;
  }
  return true;
}

export function sanitize(str: unknown): string {
  return String(str ?? '').trim().slice(0, 100);
}

// ─── Request metadata ─────────────────────────────────────────────────────────

/**
 * Best-effort client IP. Cloudflare always populates `CF-Connecting-IP`.
 * Returned as a stable rate-limit key — never logged in plain user records.
 */
export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP')
      ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
      ?? 'unknown';
}

// ─── CSRF protection ─────────────────────────────────────────────────────────

/**
 * Validates Origin/Referer for state-changing requests.
 * Rejects cross-origin POSTs that lack a trusted Origin header.
 * Returns null if valid, otherwise an error Response.
 */
export function validateCsrf(
  request: Request,
  env?: AuthEnv,
): Response | null {
  const list = allowedOrigins(env);
  const sameOrigin = new URL(request.url).origin;
  const origin = request.headers.get('Origin') ?? '';
  if (origin && !list.includes(origin) && origin !== sameOrigin) {
    return jsonError('Invalid Origin', 403, request, env);
  }
  // If Origin is absent (some legitimate clients strip it), fall back to Referer.
  if (!origin) {
    const referer = request.headers.get('Referer') ?? '';
    const allowed = referer.startsWith(sameOrigin) || list.some((o) => referer.startsWith(o));
    if (!allowed) {
      return jsonError('Invalid Origin', 403, request, env);
    }
  }
  return null;
}
