/**
 * NOVRIX Posts — Update endpoint
 * POST /api/posts/update
 *
 * Required headers:
 *   X-Post-Secret:    matches env.POST_ADMIN_SECRET
 *   Idempotency-Key:  unique per logical update
 *
 * Body (JSON):
 *   { slug, title?, content?, cover_image?, author_links?, category?, published_at? }
 */

import { z } from 'zod';
import { strictCors, preflight, jsonErr, CACHE } from '../../lib/http';
import { timingSafeEqual } from '../../lib/crypto';

import { normalizeText, ensureEnum, sanitizeAuthorLinks } from '../../lib/sanitize';
import { createLogger, requestId } from '../../lib/logger';

type PostEnv = Env & { POST_ADMIN_SECRET?: string };

const ALLOWED_CATEGORIES = ['weekly_brief', 'novrix_view', 'privacy_watch'] as const;
const ALLOWED_AUTHORS    = ['Novrix', 'BullCase', 'TechLeaks24'] as const;
const MAX_TITLE = 200;
const MAX_CONTENT = 50_000;

const UpdateSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1).max(MAX_TITLE).optional(),
  content: z.string().min(1).max(MAX_CONTENT).optional(),
  cover_image: z.string().optional(),
  author_links: z.array(z.object({
    platform: z.string().min(1).max(40),
    url: z.string().min(1).max(2048),
  })).max(8).optional(),
  category: z.enum(['weekly_brief', 'novrix_view', 'privacy_watch']).optional(),
  author: z.enum(['Novrix', 'BullCase', 'TechLeaks24']).optional(),
  published_at: z.string().datetime().optional(),
});

function parseStoredJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makeSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || `post-${Date.now()}`;
}

export const onRequest: PagesFunction<PostEnv> = async (context) => {
  const { request, env } = context;
  const log = createLogger('posts.update', { reqId: requestId(request) });

  const baseHeaders = strictCors(request, 'POST, OPTIONS', {
    'Access-Control-Allow-Headers': 'Content-Type, X-Post-Secret, Idempotency-Key',
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
  if (contentLength > 1_048_576) {
    return jsonErr('BODY_TOO_LARGE', 'Request body too large', 413, baseHeaders);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return jsonErr('INVALID_CONTENT_TYPE', 'Content-Type must be application/json', 400, baseHeaders);
  }

  const idemKey = (request.headers.get('Idempotency-Key') ?? '').slice(0, 128);
  if (!idemKey) {
    return jsonErr('IDEMPOTENCY_REQUIRED', 'Idempotency-Key header is required', 400, baseHeaders);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonErr('INVALID_JSON', 'Invalid JSON body', 400, baseHeaders);
  }

  const parse = UpdateSchema.safeParse(raw);
  if (!parse.success) {
    const issues = parse.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return jsonErr('VALIDATION', issues, 400, baseHeaders);
  }

  const body = parse.data;
  const { slug } = body;

  try {
    // Idempotency check
    const prior = await env.INSIGHTS_DB.prepare(
      'SELECT post_slug FROM post_idempotency WHERE key = ?'
    ).bind(idemKey).first<{ post_slug: string }>();

    if (prior) {
      const post = await env.INSIGHTS_DB.prepare(
        'SELECT * FROM novrix_posts WHERE slug = ?'
      ).bind(prior.post_slug).first();
      if (post) {
        const p = post as Record<string, unknown>;
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...p,
              images: parseStoredJsonArray(p.images),
              author_links: parseStoredJsonArray(p.author_links),
            },
            replayed: true,
          }),
          { status: 200, headers: { ...baseHeaders, 'Cache-Control': CACHE.none } },
        );
      }
    }

    // Build dynamic update
    const updates: { column: string; assignment: string; value: string | null }[] = [];

    if (body.title !== undefined) {
      updates.push({ column: 'title', assignment: 'title = ?', value: normalizeText(body.title, MAX_TITLE) });
    }
    if (body.content !== undefined) {
      updates.push({ column: 'content', assignment: 'content = ?', value: normalizeText(body.content, MAX_CONTENT) });
    }
    if (body.category !== undefined) {
      updates.push({ column: 'category', assignment: 'category = ?', value: ensureEnum(body.category, ALLOWED_CATEGORIES, 'novrix_view') });
    }
    if (body.author !== undefined) {
      updates.push({ column: 'author', assignment: 'author = ?', value: ensureEnum(body.author, ALLOWED_AUTHORS, 'Novrix') });
    }
    if (body.published_at !== undefined) {
      updates.push({ column: 'published_at', assignment: 'published_at = ?', value: body.published_at });
    }
    if (body.cover_image !== undefined) {
      updates.push({ column: 'cover_image', assignment: 'cover_image = ?', value: body.cover_image });
    }
    if (body.author_links !== undefined) {
      updates.push({ column: 'author_links', assignment: 'author_links = ?', value: JSON.stringify(sanitizeAuthorLinks(body.author_links)) });
    }
    // Regenerate slug if title changed
    const nextSlug = body.title !== undefined ? makeSlug(body.title) : slug;
    if (body.title !== undefined) {
      updates.push({ column: 'slug', assignment: 'slug = ?', value: nextSlug });
    }

    if (updates.length === 0) {
      return jsonErr('VALIDATION', 'No fields to update', 400, baseHeaders);
    }

    async function runUpdate(nextUpdates: typeof updates) {
      const values = nextUpdates.map(update => update.value);
      values.push(slug);
      await env.INSIGHTS_DB.prepare(
        `UPDATE novrix_posts SET ${nextUpdates.map(update => update.assignment).join(', ')} WHERE slug = ?`
      ).bind(...values).run();
    }

    try {
      await runUpdate(updates);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      // If optional columns are missing locally, retry without them.
      if (/cover_image|author_links|no such column/i.test(msg)) {
        log.warn('optional_post_column_missing_retrying', { msg });
        const filteredUpdates = updates.filter(update => {
          if (/cover_image/i.test(msg) && update.column === 'cover_image') return false;
          if (/author_links/i.test(msg) && update.column === 'author_links') return false;
          return true;
        });
        if (filteredUpdates.length === 0) return jsonErr('VALIDATION', 'No supported fields to update', 400, baseHeaders);
        await runUpdate(filteredUpdates);
      } else {
        throw e;
      }
    }

    // Store idempotency key
    await env.INSIGHTS_DB.prepare(
      'INSERT INTO post_idempotency (key, post_slug) VALUES (?, ?)'
    ).bind(idemKey, nextSlug).run();

    const post = await env.INSIGHTS_DB.prepare(
      'SELECT * FROM novrix_posts WHERE slug = ?'
    ).bind(nextSlug).first();

    const p = (post ?? {}) as Record<string, unknown>;

    log.info('post_updated', { slug });
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...p,
          images: parseStoredJsonArray(p.images),
          author_links: parseStoredJsonArray(p.author_links),
        },
      }),
      { status: 200, headers: { ...baseHeaders, 'Cache-Control': CACHE.none } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    log.error('update_failed', { msg });
    return jsonErr('INTERNAL', 'Could not update post. Please try again.', 500, baseHeaders);
  }
};
