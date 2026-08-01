/**
 * NOVRIX Posts — Verify admin password endpoint
 * POST /api/posts/verify
 *
 * Body: { password: string }
 *
 * Returns 200 if password matches POST_ADMIN_SECRET (case-insensitive).
 * Returns 401 if password is wrong or missing.
 */

import { strictCors, preflight, jsonErr } from '../../lib/http';
import { timingSafeEqual } from '../../lib/crypto';
import { createLogger, requestId } from '../../lib/logger';

type VerifyEnv = Env & { POST_ADMIN_SECRET?: string };

export const onRequest: PagesFunction<VerifyEnv> = async (context) => {
  const { request, env } = context;
  const log = createLogger('posts.verify', { reqId: requestId(request) });

  const baseHeaders = strictCors(request, 'POST, OPTIONS', {
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  if (request.method === 'OPTIONS') return preflight(baseHeaders);
  if (request.method !== 'POST') return jsonErr('METHOD_NOT_ALLOWED', 'Method not allowed', 405, baseHeaders);

  const expected = env.POST_ADMIN_SECRET;
  if (!expected) {
    log.error('admin_secret_missing');
    return jsonErr('MISCONFIGURED', 'Service unavailable', 503, baseHeaders);
  }

  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > 65_536) {
    return jsonErr('BODY_TOO_LARGE', 'Request body too large', 413, baseHeaders);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return jsonErr('INVALID_CONTENT_TYPE', 'Content-Type must be application/json', 400, baseHeaders);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonErr('INVALID_JSON', 'Invalid JSON body', 400, baseHeaders);
  }

  const provided = String(body.password ?? '').trim();
  if (!provided) {
    return jsonErr('PASSWORD_REQUIRED', 'Password is required', 400, baseHeaders);
  }

  // Constant-time comparison
  if (!timingSafeEqual(provided.toLowerCase(), expected.toLowerCase())) {
    log.warn('password_mismatch');
    return jsonErr('UNAUTHORIZED', 'Invalid password', 401, baseHeaders);
  }

  log.info('password_verified');
  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...baseHeaders, 'Content-Type': 'application/json' } },
  );
};
