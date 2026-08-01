/**
 * Lightweight D1-backed rate limiter.
 *
 * Uses a fixed-window counter keyed on (bucket, identifier) where identifier
 * is typically the requester IP. Avoids any external service so the project
 * stays inside the Cloudflare free plan.
 *
 * Schema (created by database/migrations/sentiment/008_rate_limits.sql):
 *   CREATE TABLE rate_limits (
 *     key         TEXT NOT NULL,
 *     window_start INTEGER NOT NULL,
 *     count       INTEGER NOT NULL DEFAULT 0,
 *     PRIMARY KEY (key, window_start)
 *   );
 *
 * Usage:
 *   const ok = await checkRateLimit(env.DB, `auth:login:${ip}`, 5, 60);
 *   if (!ok) return jsonError('Too many attempts', 429);
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

/**
 * Attempts to consume one token from a fixed-window bucket.
 * Returns whether the request is allowed plus diagnostic fields suitable
 * for `X-RateLimit-*` response headers.
 *
 * NOTE: This is best-effort. Concurrent requests in the same window can
 * exceed the limit by 1–2; that is acceptable for auth-endpoint hardening.
 */
export async function checkRateLimit(
  db: D1Database,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSec);

  try {
    // Read current count.
    const row = await db
      .prepare('SELECT count FROM rate_limits WHERE key = ? AND window_start = ?')
      .bind(key, windowStart)
      .first<{ count: number }>();

    const current = row?.count ?? 0;

    if (current >= limit) {
      return { allowed: false, remaining: 0, resetIn: windowSec - (now - windowStart) };
    }

    // Increment (or insert).
    await db
      .prepare(
        `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1`,
      )
      .bind(key, windowStart)
      .run();

    return { allowed: true, remaining: limit - current - 1, resetIn: windowSec - (now - windowStart) };
  } catch (error: unknown) {
    // Fail-CLOSED: if the rate-limit table is unreachable, we cannot verify
    // the caller is within limits. Treat as a service outage so auth
    // endpoints return 503 rather than bypassing rate limiting.
    throw error instanceof Error
      ? error
      : new Error(`Rate-limit D1 error: ${String(error)}`);
  }
}

/** Best-effort cleanup of expired rate-limit rows. Call from a cron, not a hot path. */
export async function gcRateLimits(db: D1Database, olderThanSec = 86_400): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - olderThanSec;
  try {
    await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(cutoff).run();
  } catch { /* ignore */ }
}
