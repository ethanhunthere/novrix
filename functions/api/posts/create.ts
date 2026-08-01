/**
 * NOVRIX Posts — Create endpoint
 * POST /api/posts/create
 *
 * Required headers:
 *   X-Post-Secret:    matches `env.POST_ADMIN_SECRET` (constant-time compare)
 *   Idempotency-Key:  unique per logical create; replayed keys return the
 *                     original post instead of creating a duplicate.
 *
 * Body (JSON):
 *   { title, content, images?, cover_image?, author_links?, category?, published_at? }
 *
 * categories: 'weekly_brief' | 'novrix_view' | 'privacy_watch'
 *
 * SECURITY HARDENING (vs. previous version):
 *   - Removed hard-coded `'novrix-post-2026'` literal. Secret is read
 *     from `env.POST_ADMIN_SECRET` (set via `wrangler pages secret put`)
 *     and compared in constant time.
 *   - Category restricted to an explicit allow-list to prevent garbage
 *     values from breaking the rendering switch on the front-end.
 *   - Image URLs validated as `https://…` to block `javascript:` /
 *     `data:` injection on the consumer page.
 *   - Title/content normalized + length-capped before insertion.
 *   - Idempotency-Key persisted in `post_idempotency` so cron retries
 *     and double-clicks do not duplicate posts.
 *   - Internal error messages (e.g. raw `UNIQUE constraint failed`) are
 *     never returned verbatim — log them, return generic copy.
 */

import { z } from 'zod';
import { strictCors, preflight, jsonErr, CACHE } from '../../lib/http';
import { timingSafeEqual } from '../../lib/crypto';

import { normalizeText, ensureEnum, sanitizeImageUrls, sanitizeAuthorLinks } from '../../lib/sanitize';
import { createLogger, requestId } from '../../lib/logger';

type PostEnv = Env & { POST_ADMIN_SECRET?: string };

const ALLOWED_CATEGORIES = ['weekly_brief', 'novrix_view', 'privacy_watch'] as const;
const ALLOWED_AUTHORS    = ['Novrix', 'BullCase', 'TechLeaks24'] as const;
const MAX_TITLE = 200;
const MAX_CONTENT = 50_000;

const PostSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE),
  content: z.string().min(1).max(MAX_CONTENT),
  images: z.array(z.string()).max(20).optional(),
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
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || `post-${Date.now()}`;
}

export const onRequest: PagesFunction<PostEnv> = async (context) => {
  const { request, env } = context;
  const log = createLogger('posts.create', { reqId: requestId(request) });

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

  const parse = PostSchema.safeParse(raw);
  if (!parse.success) {
    const issues = parse.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return jsonErr('VALIDATION', issues, 400, baseHeaders);
  }

  const body = parse.data;
  const title = normalizeText(body.title, MAX_TITLE);
  const content = normalizeText(body.content, MAX_CONTENT);
  const category = ensureEnum(body.category, ALLOWED_CATEGORIES, 'novrix_view');
  const author = ensureEnum(body.author, ALLOWED_AUTHORS, 'Novrix');
  const images = sanitizeImageUrls(body.images);
  const authorLinks = sanitizeAuthorLinks(body.author_links);
  const coverImage = body.cover_image ?? null;
  const publishedAt = body.published_at ?? new Date().toISOString();

  try {
    // Idempotency check — return the prior result if the key was used.
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

    const id = crypto.randomUUID();
    const slug = makeSlug(title);
    const imagesJson = JSON.stringify(images);
    const authorLinksJson = JSON.stringify(authorLinks);

    async function doInsert(includeCover: boolean, includeAuthorLinks: boolean) {
      const cols = ['id', 'title', 'content', 'images'];
      const vals: (string | null)[] = [id, title, content, imagesJson];
      if (includeCover) {
        cols.push('cover_image');
        vals.push(coverImage);
      }
      if (includeAuthorLinks) {
        cols.push('author_links');
        vals.push(authorLinksJson);
      }
      cols.push('category', 'author', 'published_at', 'slug');
      vals.push(category, author, publishedAt, slug);
      await env.INSIGHTS_DB.batch([
        env.INSIGHTS_DB.prepare(
          `INSERT INTO novrix_posts (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`
        ).bind(...vals),
        env.INSIGHTS_DB.prepare(
          'INSERT INTO post_idempotency (key, post_slug) VALUES (?, ?)'
        ).bind(idemKey, slug),
      ]);
    }

    try {
      await doInsert(true, true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      // If optional columns are missing locally, retry without them.
      if (/cover_image|author_links|no such column/i.test(msg)) {
        log.warn('optional_post_column_missing_retrying', { msg });
        await doInsert(!/cover_image/i.test(msg), !/author_links/i.test(msg));
      } else {
        throw e;
      }
    }

    const post = await env.INSIGHTS_DB.prepare(
      'SELECT * FROM novrix_posts WHERE id = ?'
    ).bind(id).first();

    log.info('post_created', { id, category, author });
    return new Response(
      JSON.stringify({ success: true, data: { ...post, images, author_links: authorLinks } }),
      { status: 201, headers: { ...baseHeaders, 'Cache-Control': CACHE.none } },
    );

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    log.error('create_failed', { msg });
    if (/UNIQUE/i.test(msg)) {
      return jsonErr('SLUG_TAKEN', 'A post with this title already exists. Use a different title.', 409, baseHeaders);
    }
    return jsonErr('INTERNAL', 'Could not create post. Please try again.', 500, baseHeaders);
  }
};
