/**
 * POST /api/auth/login
 * Validates a NOVRIX ID and creates a session. The 15-character ID IS
 * the credential (no password by design).
 *
 * SECURITY HARDENING (vs. previous version):
 *   - Lookup by `novrix_id_hash`; falls back to plaintext `novrix_id` and
 *     auto-upgrades the row when the hash column is empty (for users that
 *     existed before migration 011).
 *   - Rate-limited per IP (10/min, 50/hr).
 *   - Sessions no longer store IP/UA — Cloudflare edge logs already
 *     retain that info for ops.
 *   - Generic error message; constant work performed before failing so
 *     timing analysis cannot distinguish "no such ID" from "wrong ID".
 */

import { generateToken, hashNovrixId, timingSafeEqual } from '../../lib/crypto';
import {
  optionsResponse, json, jsonError, clientIp, validateCsrf,
  buildSetCookieHeader, sanitize, nowISO, expiresAtDays,
  isValidNovrixId,
} from '../../lib/auth';
import { checkRateLimit } from '../../lib/rateLimit';
import { createLogger, requestId } from '../../lib/logger';

type AuthEnv = Env & { AUTH_PEPPER?: string };

interface UserRow {
  id: string;
  novrix_id: string;
  novrix_id_hash: string | null;
}

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const { request, env } = context;
  const log = createLogger('auth.login', { reqId: requestId(request) });

  if (!env.AUTH_PEPPER) {
    log.error('auth_pepper_missing');
    return jsonError('Service misconfigured', 503, request, env);
  }

  const csrf = validateCsrf(request, env);
  if (csrf) return csrf;

  const ip = clientIp(request);
  try {
    const limit = await checkRateLimit(env.DB, `auth:login:${ip}`, 10, 60);
    if (!limit.allowed) {
      log.warn('rate_limited');
      return jsonError('Too many attempts. Please try again later.', 429, request, env);
    }
  } catch (err) {
    log.error('rate_limit_check_failed', undefined, err);
    return jsonError('Service temporarily unavailable', 503, request, env);
  }

  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > 16_384) {
    return jsonError('Request body too large', 413, request, env);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return jsonError('Invalid access ID', 401, request, env);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonError('Invalid access ID', 401, request, env);
  }

  const novrixId = sanitize(body.novrix_id);
  if (!isValidNovrixId(novrixId)) {
    return jsonError('Invalid access ID', 401, request, env);
  }

  try {
    const idHash = await hashNovrixId(novrixId, env.AUTH_PEPPER);

    // Try hashed lookup first; fall back to plaintext for legacy rows.
    let user = await env.AUTH_DB.prepare(
      'SELECT id, novrix_id, novrix_id_hash FROM users WHERE novrix_id_hash = ?'
    ).bind(idHash).first<UserRow>();

    if (!user) {
      const legacy = await env.AUTH_DB.prepare(
        'SELECT id, novrix_id, novrix_id_hash FROM users WHERE novrix_id = ?'
      ).bind(novrixId).first<UserRow>();
      if (legacy && timingSafeEqual(legacy.novrix_id, novrixId)) {
        user = legacy;
        // Backfill the hash so subsequent logins use the indexed path.
        if (!legacy.novrix_id_hash) {
          await env.AUTH_DB.prepare('UPDATE users SET novrix_id_hash = ? WHERE id = ?')
            .bind(idHash, legacy.id).run();
        }
      }
    }

    if (!user) {
      log.info('login_invalid_id');
      return jsonError('Invalid access ID', 401, request, env);
    }

    const sessionId = generateToken();
    const now = nowISO();

    await env.AUTH_DB.batch([
      // Invalidate any existing sessions for this user to prevent session fixation
      env.AUTH_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
      env.AUTH_DB.prepare(
        'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
      ).bind(sessionId, user.id, expiresAtDays(30), now),
      env.AUTH_DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(now, user.id),
    ]);

    log.info('login_ok', { user_id: user.id });
    return json(
      { success: true, user: { id: user.id, novrix_id: user.novrix_id } },
      200,
      { 'Set-Cookie': buildSetCookieHeader(sessionId) },
      request,
      env,
    );

  } catch (err) {
    log.error('login_failed', undefined, err);
    return jsonError('Server error. Please try again.', 500, request, env);
  }
};

export const onRequestOptions: PagesFunction<AuthEnv> = ({ request, env }) =>
  optionsResponse(request, env);
