/**
 * GET /api/auth/me
 * Returns the authenticated user or { user: null }. Used by client-side auth guards.
 *
 * NOTE: Returns 200 with `user: null` for unauthenticated requests so the
 * browser does not log a 401 error in the console. The client (useAuth hook)
 * treats any ok response without a user as unauthenticated.
 *
 * READ-PATH PURITY: This endpoint no longer writes to the DB. The previous
 * version performed a `DELETE FROM sessions WHERE id = ?` whenever the
 * session was expired, with `.catch(() => {})` swallowing any error — a
 * read endpoint that can fail-silently on a write is fragile. Expired
 * sessions are now cleaned up by the next /api/auth/logout call or by a
 * future scheduled GC task.
 */

import { optionsResponse, json, jsonError, getSessionCookie } from '../../lib/auth';
import { createLogger, requestId } from '../../lib/logger';

interface SessionRow { user_id: string; expires_at: string }
interface UserRow { id: string; novrix_id: string }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const log = createLogger('auth.me', { reqId: requestId(request) });
  const token = getSessionCookie(request);
  if (!token) return json({ success: true, user: null }, 200, undefined, request, env);

  try {
    const session = await env.AUTH_DB.prepare(
      'SELECT user_id, expires_at FROM sessions WHERE id = ?'
    ).bind(token).first<SessionRow>();

    if (!session) return json({ success: true, user: null }, 200, undefined, request, env);
    if (new Date(session.expires_at) < new Date()) {
      log.info('session_expired');
      return json({ success: true, user: null }, 200, undefined, request, env);
    }

    const user = await env.AUTH_DB.prepare(
      'SELECT id, novrix_id FROM users WHERE id = ?'
    ).bind(session.user_id).first<UserRow>();

    if (!user) return json({ success: true, user: null }, 200, undefined, request, env);

    return json({ success: true, user }, 200, undefined, request, env);
  } catch (err) {
    log.error('me_failed', undefined, err);
    return jsonError('Internal error', 500, request, env);
  }
};

export const onRequestOptions: PagesFunction<Env> = ({ request, env }) =>
  optionsResponse(request, env);
