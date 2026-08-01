/**
 * NOVRIX Posts — List endpoint
 * GET /api/posts
 * GET /api/posts?category=weekly_brief
 * GET /api/posts?category=novrix_view
 */

interface Env {
  INSIGHTS_DB: D1Database;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
};

interface PostRow {
  id: string;
  title: string;
  content: string;
  images: string;
  cover_image: string | null;
  author_links?: string | null;
  category: string;
  author: string;
  published_at: string;
  slug: string;
}

import { checkRateLimit } from '../../lib/rateLimit';
import { clientIp } from '../../lib/auth';

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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: CORS }
    );
  }

  const ip = clientIp(request);
  try {
    const limit = await checkRateLimit(env.INSIGHTS_DB, `api:posts:${ip}`, 120, 60);
    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many requests' }),
        { status: 429, headers: CORS }
      );
    }
  } catch {
    // Fail open on rate limit check errors
  }

  const url      = new URL(request.url);
  const category = url.searchParams.get('category');

  try {
    async function doQuery(cols: string) {
      return category
        ? await env.INSIGHTS_DB.prepare(
            `SELECT ${cols} FROM novrix_posts WHERE category = ? AND published_at > '1970-01-01T00:00:00Z' ORDER BY published_at DESC`
          ).bind(category).all<PostRow>()
        : await env.INSIGHTS_DB.prepare(
            `SELECT ${cols} FROM novrix_posts WHERE published_at > '1970-01-01T00:00:00Z' ORDER BY published_at DESC`
          ).all<PostRow>();
    }

    let result: D1Result<PostRow>;
    const baseCols = 'id, title, content, images, category, author, published_at, slug';
    try {
      result = await doQuery(`id, title, content, images, cover_image, author_links, category, author, published_at, slug`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      if (/cover_image|author_links|no such column/i.test(msg)) {
        const cols = [baseCols];
        if (!/cover_image/i.test(msg)) cols.unshift('cover_image');
        if (!/author_links/i.test(msg)) cols.unshift('author_links');
        result = await doQuery(cols.join(', '));
      } else {
        throw e;
      }
    }

    const posts = (result.results || []).map(p => ({
      ...p,
      images: parseStoredJsonArray(p.images),
      author_links: parseStoredJsonArray(p.author_links),
    }));

    return new Response(
      JSON.stringify({ success: true, data: posts }),
      { headers: CORS }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Database error', data: [] }),
      { status: 500, headers: CORS }
    );
  }
};
