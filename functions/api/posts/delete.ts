/**
 * NOVRIX Posts — Delete endpoint
 * POST /api/posts/delete
 *
 * Required headers:
 *   X-Post-Secret: matches env.POST_ADMIN_SECRET
 *
 * Body (JSON):
 *   { slug }
 */

import { strictCors, preflight, jsonErr, CACHE } from '../../lib/http';
import { timingSafeEqual } from '../../lib/crypto';
import { createLogger, requestId } from '../../lib/logger';

type PostEnv = Env & { POST_ADMIN_SECRET?: string };

export const onRequest: PagesFunction<PostEnv> = async (context) => {
  const { request, env } = context;
  const log = createLogger('posts.delete', { reqId: requestId(request) });

  const baseHeaders = strictCors(request, 'POST, OPTIONS', {
    'Access-Control-Allow-Headers': 'Content-Type, X-Post-Secret',
  });

  if (request.method === 'OPTIONS') return preflight(baseHeaders);
  if (request.method !== 'POST') return jsonErr('METHOD_NOT_ALLOWED', 'Method not allowed', 405, baseHeaders);

  const expected = env.POST_ADMIN_SECRET;
  if (!expected) {
    log.error('admin_secret_missing');
    return jsonErr('MISCONFIGURED', 'Service unavailable', 503, baseHeaders);
  }

  const provided = request.headers.get('X-Post-Secret') ?? '';
  if (!timingSafeEqual(provided.toLowerCase(), expected.toLowerCase())) {
    log.warn('admin_secret_mismatch');
    return jsonErr('UNAUTHORIZED', 'Unauthorized', 401, baseHeaders);
  }

  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > 65_536) {
    return jsonErr('BODY_TOO_LARGE', 'Request body too large', 413, baseHeaders);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return jsonErr('INVALID_CONTENT_TYPE', 'Content-Type must be application/json', 400, baseHeaders);
  }

  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return jsonErr('INVALID_JSON', 'Invalid JSON body', 400, baseHeaders);
  }

  const slug = body.slug;
  if (!slug || typeof slug !== 'string') {
    return jsonErr('VALIDATION', 'slug is required', 400, baseHeaders);
  }

  try {
    await env.INSIGHTS_DB.prepare(
      'DELETE FROM novrix_posts WHERE slug = ?'
    ).bind(slug).run();

    log.info('post_deleted', { slug });
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...baseHeaders, 'Cache-Control': CACHE.none } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    log.error('delete_failed', { msg });
    return jsonErr('INTERNAL', 'Could not delete post.', 500, baseHeaders);
  }
};
