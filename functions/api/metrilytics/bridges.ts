/**
 * GET /api/metrilytics/bridges?limit=50
 * Returns bridge protocols from the bridge_data table.
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
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

    const rows = await env.METRILYTICS_DB
      .prepare(
        `SELECT protocol, slug, tvl_usd, chain
         FROM bridge_data
         WHERE date = (SELECT MAX(date) FROM bridge_data)
         ORDER BY tvl_usd DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<{ protocol: string; slug: string; tvl_usd: number; chain: string | null }>();

    const protocols = rows.results ?? [];
    const total = protocols.reduce((sum, p) => sum + p.tvl_usd, 0);

    return new Response(
      JSON.stringify({ success: true, protocols, total, count: protocols.length }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: message, protocols: [], total: 0 }), {
      status: 500, headers: CORS,
    });
  }
};
