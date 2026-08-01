/**
 * Shared admin-token check for seed / write endpoints.
 *
 * Replaces the duplicated `const SEED_SECRET = 'novrix-seed-2026'` literal
 * that previously lived in 24 different `seed.ts` files. All checks now
 * read from `env.SEED_ADMIN_SECRET` (set via
 * `wrangler pages secret put SEED_ADMIN_SECRET`) and compare in constant time.
 *
 * Returns `null` when the request is authorized, otherwise a ready-to-return
 * `Response` so the caller can `if (resp) return resp;`.
 */

import { timingSafeEqual } from './crypto';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

/**
 * Permissive env shape — every endpoint that calls this passes its own
 * narrower Env interface; we only care about reading SEED_ADMIN_SECRET.
 * Accepts `unknown` so callers don't need to widen their typed env to a
 * Record before invoking.
 */
export function requireSeedAdmin(
  request: Request,
  env: unknown,
): Response | null {
  const e = (env ?? {}) as { SEED_ADMIN_SECRET?: unknown };
  const expected = typeof e.SEED_ADMIN_SECRET === 'string' ? e.SEED_ADMIN_SECRET : '';
  if (!expected) {
    return new Response(
      JSON.stringify({ success: false, error: 'Service misconfigured' }),
      { status: 503, headers: HEADERS },
    );
  }
  const provided = request.headers.get('X-Seed-Secret') ?? '';
  if (!timingSafeEqual(provided, expected)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: HEADERS },
    );
  }
  return null;
}
