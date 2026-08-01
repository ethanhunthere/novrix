/**
 * POST /api/auth/logout
 * Deletes the session row and clears both the new (`__Host-`) and legacy
 * cookies so a transitioned user does not get stuck logged in by the
 * previous cookie name.
 */

import {
  optionsResponse, json,
  buildClearCookieHeader, buildClearLegacyCookieHeader,
  getSessionCookie,
} from '../../lib/auth';
import { createLogger, requestId } from '../../lib/logger';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const log = createLogger('auth.logout', { reqId: requestId(request) });
  const token = getSessionCookie(request);

  if (token) {
    try {
      await env.AUTH_DB.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run();
    } catch (err) {
      // A failed delete is non-fatal — the cookie has already been cleared
      // client-side, so the session is effectively dead. Log for ops.
      log.warn('session_delete_failed', undefined, err);
    }
  }

  // Append both clears via the response Headers object (Workers Headers
  // supports `append` for Set-Cookie which yields multiple lines on the wire).
  const res = json({ success: true }, 200, undefined, request, env);
  res.headers.append('Set-Cookie', buildClearCookieHeader());
  res.headers.append('Set-Cookie', buildClearLegacyCookieHeader());
  return res;
};

export const onRequestOptions: PagesFunction<Env> = ({ request, env }) =>
  optionsResponse(request, env);
