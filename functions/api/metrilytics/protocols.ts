/**
 * GET /api/metrilytics/protocols?limit=50
 * Returns top protocols by TVL with latest stats.
 */

interface Env { METRILYTICS_DB: D1Database; }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    const url   = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

    // Latest TVL per protocol
    const latest = await env.METRILYTICS_DB
      .prepare(`
        SELECT p.protocol, p.slug, p.tvl_usd, p.category, p.date
        FROM protocol_tvl p
        INNER JOIN (
          SELECT slug, MAX(date) as max_date FROM protocol_tvl GROUP BY slug
        ) sub ON p.slug = sub.slug AND p.date = sub.max_date
        ORDER BY p.tvl_usd DESC
        LIMIT ?
      `)
      .bind(limit)
      .all<{ protocol: string; slug: string; tvl_usd: number; category: string | null; date: string }>();

    return new Response(
      JSON.stringify({ success: true, protocols: latest.results ?? [], count: latest.results?.length ?? 0 }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', protocols: [] }), {
      status: 500, headers: CORS,
    });
  }
};
