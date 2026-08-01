/**
 * GET /api/metrilytics/dex-networks
 * Returns DEX network stats and global DEX stats.
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
    const networks = await env.METRILYTICS_DB
      .prepare(
        `SELECT network_id, name, volume_usd_24h, txns_24h, pools_count, tokens_count
         FROM dex_networks
         WHERE date = (SELECT MAX(date) FROM dex_networks)
         ORDER BY volume_usd_24h DESC`
      )
      .all<{ network_id: string; name: string; volume_usd_24h: number; txns_24h: number; pools_count: number; tokens_count: number }>();

    const stats = await env.METRILYTICS_DB
      .prepare('SELECT * FROM dex_stats ORDER BY date DESC LIMIT 1')
      .first<{ date: string; networks: number; dexes: number; pools: number; tokens: number }>();

    return new Response(
      JSON.stringify({ success: true, networks: networks.results ?? [], stats }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: message, networks: [], stats: null }), {
      status: 500, headers: CORS,
    });
  }
};
