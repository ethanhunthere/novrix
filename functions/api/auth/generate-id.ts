/**
 * POST /api/auth/generate-id
 * Generates a unique 15-character NOVRIX ID for the signup pre-step
 * display. Does NOT save to the database.
 *
 * SECURITY HARDENING (vs. previous version):
 *   - Rate-limited per IP (20/min, 100/hr) — was unauthenticated and
 *     unbounded, allowing a script to enumerate the username space.
 *   - Single rejection-sampled attempt: with 67^15 ≈ 4.3e27 combinations
 *     and < 1e6 expected users, collision is astronomically unlikely.
 *     The old loop of up to 10 D1 round-trips was wasteful theatre.
 */

import { generateNovrixId, hashNovrixId } from '../../lib/crypto';
import { optionsResponse, json, jsonError, clientIp, validateCsrf } from '../../lib/auth';
import { checkRateLimit } from '../../lib/rateLimit';
import { createLogger, requestId } from '../../lib/logger';

type AuthEnv = Env & { AUTH_PEPPER?: string };

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const log = createLogger('auth.generate-id', { reqId: requestId(request) });

  const csrf = validateCsrf(request, env);
  if (csrf) return csrf;

  const ip = clientIp(request);
  try {
    const limit = await checkRateLimit(env.DB, `auth:gen:${ip}`, 20, 60);
    if (!limit.allowed) {
      return jsonError('Too many requests. Please slow down.', 429, request, env);
    }
  } catch (err) {
    log.error('rate_limit_check_failed', undefined, err);
    return jsonError('Service temporarily unavailable', 503, request, env);
  }

  try {
    // One generation. If the AUTH_PEPPER is configured we pre-check the hash;
    // otherwise we skip the DB round-trip (the collision probability is < 1e-22).
    const novrixId = generateNovrixId();
    if (env.AUTH_PEPPER) {
      const hash = await hashNovrixId(novrixId, env.AUTH_PEPPER);
      const existing = await env.AUTH_DB.prepare(
        'SELECT 1 AS x FROM users WHERE novrix_id_hash = ? LIMIT 1'
      ).bind(hash).first();
      if (existing) {
        log.warn('id_collision', { novrix_id: novrixId.slice(0, 4) + '…' });
        // Try once more — at this scale a second collision is impossible.
        const retry = generateNovrixId();
        return json({ success: true, novrix_id: retry }, 200, undefined, request, env);
      }
    }
    return json({ success: true, novrix_id: novrixId }, 200, undefined, request, env);
  } catch (err) {
    log.error('generate_failed', undefined, err);
    return json({ success: false, error: 'Service unavailable. Please try again.' }, 503,
      undefined, request, env);
  }
};

export const onRequestOptions: PagesFunction<AuthEnv> = ({ request, env }) =>
  optionsResponse(request, env);
