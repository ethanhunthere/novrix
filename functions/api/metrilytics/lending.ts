/**
 * GET /api/metrilytics/lending?limit=50
 * Returns lending protocols from the lending_data table.
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
        `SELECT protocol, slug, tvl_usd, borrowed_usd, supplied_usd, chain
         FROM lending_data
         WHERE date = (SELECT MAX(date) FROM lending_data)
         ORDER BY tvl_usd DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<{ protocol: string; slug: string; tvl_usd: number; borrowed_usd: number | null; supplied_usd: number | null; chain: string | null }>();

    const protocols = rows.results ?? [];
    const total = protocols.reduce((sum, p) => sum + (p.supplied_usd ?? p.tvl_usd), 0);
    const totalBorrowed = protocols.reduce((sum, p) => sum + (p.borrowed_usd ?? 0), 0);

    return new Response(
      JSON.stringify({ success: true, protocols, total, totalBorrowed, count: protocols.length }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: message, protocols: [], total: 0, totalBorrowed: 0 }), {
      status: 500, headers: CORS,
    });
  }
};
