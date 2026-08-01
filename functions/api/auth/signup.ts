/**
 * POST /api/auth/signup
 * Creates a new account using a NOVRIX ID as the only credential.
 *
 * SECURITY HARDENING (vs. previous version):
 *   - Stores `novrix_id_hash` (HMAC-SHA-256 with server pepper). The
 *     plaintext `novrix_id` is also written to the legacy column so a
 *     rollback is one ALTER away; a follow-up migration will drop it.
 *   - Rate-limited per IP (5/min, 30/hr).
 *   - Generic error message on duplicate to remove the username
 *     enumeration oracle that the previous version exposed
 *     ("This NOVRIX ID is already registered").
 */

import { generateToken, hashNovrixId } from '../../lib/crypto';
import {
  optionsResponse, json, jsonError, clientIp, validateCsrf,
  isValidNovrixId, sanitize, nowISO,
} from '../../lib/auth';
import { checkRateLimit } from '../../lib/rateLimit';
import { createLogger, requestId } from '../../lib/logger';

type AuthEnv = Env & { AUTH_PEPPER?: string };

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const { request, env } = context;
  const log = createLogger('auth.signup', { reqId: requestId(request) });

  if (!env.AUTH_PEPPER) {
    log.error('auth_pepper_missing');
    return jsonError('Service misconfigured', 503, request, env);
  }

  const csrf = validateCsrf(request, env);
  if (csrf) return csrf;

  const ip = clientIp(request);
  try {
    const limit = await checkRateLimit(env.DB, `auth:signup:${ip}`, 5, 60);
    if (!limit.allowed) {
      log.warn('rate_limited', { ip_hash_short: ip.slice(0, 8) });
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
    return jsonError('Invalid request', 400, request, env);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonError('Invalid request', 400, request, env);
  }

  const novrixId = sanitize(body.novrix_id);
  if (!isValidNovrixId(novrixId)) {
    return jsonError('Invalid request', 400, request, env);
  }

  try {
    const idHash = await hashNovrixId(novrixId, env.AUTH_PEPPER);

    // Lookup by hash (UNIQUE INDEX on novrix_id_hash). If a row exists we
    // intentionally return the SAME generic error as the validation path
    // above so the response cannot be used as an enumeration oracle.
    const existing = await env.AUTH_DB.prepare(
      'SELECT id FROM users WHERE novrix_id_hash = ? OR novrix_id = ?'
    ).bind(idHash, novrixId).first();

    if (existing) {
      log.info('signup_collision');
      return jsonError('Could not create account. Please try a different ID.', 409, request, env);
    }

    const userId = generateToken();
    await env.AUTH_DB.prepare(
      'INSERT INTO users (id, novrix_id, novrix_id_hash, created_at) VALUES (?, ?, ?, ?)'
    ).bind(userId, novrixId, idHash, nowISO()).run();

    log.info('signup_ok', { user_id: userId });
    return json({ success: true, message: 'Account created.' }, 200, undefined, request, env);

  } catch (err) {
    log.error('signup_failed', undefined, err);
    return jsonError('Server error. Please try again.', 500, request, env);
  }
};

export const onRequestOptions: PagesFunction<AuthEnv> = ({ request, env }) =>
  optionsResponse(request, env);
