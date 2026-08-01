/**
 * GET /api/metrilytics/dex?days=30
 * Returns daily DEX volume history by chain.
 */

interface Env { METRILYTICS_DB: D1Database; }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const DEX_CHAINS = ['ethereum', 'bsc', 'arbitrum', 'solana', 'base', 'polygon', 'all'];

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    const url    = new URL(request.url);
    const days   = parseInt(url.searchParams.get('days') || '30', 10);
    const cutoff = days > 0
      ? new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
      : '2016-01-01';

    const rows = await env.METRILYTICS_DB
      .prepare(
        'SELECT chain, date, daily_volume_usd FROM dex_volumes WHERE date >= ? ORDER BY chain, date ASC'
      )
      .bind(cutoff)
      .all<{ chain: string; date: string; daily_volume_usd: number }>();

    // Group by chain
    const byChain: Record<string, { date: string; volume: number }[]> = {};
    for (const row of rows.results ?? []) {
      if (!byChain[row.chain]) byChain[row.chain] = [];
      byChain[row.chain].push({ date: row.date, volume: row.daily_volume_usd });
    }

    return new Response(
      JSON.stringify({ success: true, volumes: byChain, chains: DEX_CHAINS, days }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', volumes: {} }), {
      status: 500, headers: CORS,
    });
  }
};
