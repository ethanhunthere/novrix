/**
 * NOVRIX Pages Function — /api/news
 *
 * Query params:
 *   category  — all | crypto | macro | regulatory | financial | security
 *   limit     — articles to return (default 50, max 100)
 *   offset    — pagination offset (default 0)
 *   since     — ISO timestamp; returns only articles with inserted_at > since
 *               (used by frontend 30-second poll for real-time updates)
 *
 * Returns:
 *   Initial load:  { articles, total, counts, serverTime }
 *   Poll (since=): { articles, serverTime }
 *
 * Cache:
 *   Initial load:  30s edge cache (fast first render, stale-while-revalidate 60s)
 *   Poll requests: no-store (always fresh, timestamp makes each URL unique anyway)
 */

interface Env {
  INSIGHTS_DB: D1Database;
}

interface ArticleRow {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  source_name: string;
  category: string;
  published_at: string;
  image_url: string | null;
}

const ALLOWED_SOURCE_SQL = "source_name IN ('CoinTelegraph', 'Investing.com')";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const url        = new URL(request.url);
  const category   = url.searchParams.get('category') || 'all';
  const since      = url.searchParams.get('since');
  const limit      = Math.min(parseInt(url.searchParams.get('limit')  || '50', 10), 100);
  const offset     = Math.max(parseInt(url.searchParams.get('offset') || '0',  10), 0);
  const serverTime = new Date().toISOString();
  const isFiltered = category !== 'all';

  try {
    /* ── Incremental poll (frontend polls every 30 seconds) ─────────────── */
    if (since) {
      const result = isFiltered
        ? await env.INSIGHTS_DB.prepare(
            `SELECT id, title, url, summary, source_name, category, published_at, image_url
             FROM articles
             WHERE inserted_at IS NOT NULL AND inserted_at > ? AND category = ?
               AND image_url IS NOT NULL AND image_url != ''
               AND ${ALLOWED_SOURCE_SQL}
             ORDER BY inserted_at DESC
             LIMIT 50`
          ).bind(since, category).all<ArticleRow>()
        : await env.INSIGHTS_DB.prepare(
            `SELECT id, title, url, summary, source_name, category, published_at, image_url
             FROM articles
             WHERE inserted_at IS NOT NULL AND inserted_at > ?
               AND image_url IS NOT NULL AND image_url != ''
               AND ${ALLOWED_SOURCE_SQL}
             ORDER BY inserted_at DESC
             LIMIT 50`
          ).bind(since).all<ArticleRow>();

      return new Response(
        JSON.stringify({ articles: result.results ?? [], serverTime }),
        { headers: { ...CORS, 'Cache-Control': 'no-store' } }
      );
    }

    /* ── Initial full load ───────────────────────────────────────────────── */
    const [articlesRes, countRes, countsRes] = await env.INSIGHTS_DB.batch([
      isFiltered
        ? env.INSIGHTS_DB
            .prepare(`SELECT id, title, url, summary, source_name, category, published_at, image_url
                      FROM articles WHERE category = ?
                        AND image_url IS NOT NULL AND image_url != ''
                        AND ${ALLOWED_SOURCE_SQL}
                      ORDER BY published_at DESC LIMIT ? OFFSET ?`)
            .bind(category, limit, offset)
        : env.INSIGHTS_DB
            .prepare(`SELECT id, title, url, summary, source_name, category, published_at, image_url
                      FROM articles
                      WHERE image_url IS NOT NULL AND image_url != ''
                        AND ${ALLOWED_SOURCE_SQL}
                      ORDER BY published_at DESC LIMIT ? OFFSET ?`)
            .bind(limit, offset),

      isFiltered
        ? env.INSIGHTS_DB.prepare(`SELECT COUNT(*) as total FROM articles WHERE category = ? AND image_url IS NOT NULL AND image_url != '' AND ${ALLOWED_SOURCE_SQL}`).bind(category)
        : env.INSIGHTS_DB.prepare(`SELECT COUNT(*) as total FROM articles WHERE image_url IS NOT NULL AND image_url != '' AND ${ALLOWED_SOURCE_SQL}`),

      env.INSIGHTS_DB.prepare(
        `SELECT category, COUNT(*) as count FROM articles WHERE image_url IS NOT NULL AND image_url != '' AND ${ALLOWED_SOURCE_SQL} GROUP BY category ORDER BY count DESC`
      ),
    ]);

    return new Response(
      JSON.stringify({
        articles:  articlesRes.results ?? [],
        total:     (countRes.results[0] as { total: number })?.total ?? 0,
        counts:    countsRes.results as { category: string; count: number }[],
        serverTime,
      }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    );
  } catch (e) {
    console.error('[api/news] error:', e);
    return new Response(
      JSON.stringify({ error: 'Database error', articles: [], total: 0, counts: [], serverTime }),
      { status: 500, headers: CORS }
    );
  }
};
