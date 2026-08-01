/**
 * GET /api/metrilytics/chains?days=30
 * Returns chain TVL history from the chain_tvl table.
 * days: 30 | 90 | 365 | 0 (all available)
 */

interface Env { METRILYTICS_DB: D1Database; }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const DISPLAY_CHAINS = [
  'ethereum', 'bsc', 'tron', 'arbitrum', 'solana',
  'polygon', 'base', 'optimism', 'avalanche', 'sui',
];

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    const url    = new URL(request.url);
    const days   = parseInt(url.searchParams.get('days') || '90', 10);
    const chain  = url.searchParams.get('chain')?.toLowerCase() || null;

    const cutoff = days > 0
      ? new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
      : '2016-01-01';

    const chains = chain ? [chain] : DISPLAY_CHAINS;

    // Fetch TVL history per chain
    const tvlByChain: Record<string, { date: string; tvl: number }[]> = {};
    for (const c of chains) {
      const res = await env.METRILYTICS_DB
        .prepare('SELECT date, tvl_usd FROM chain_tvl WHERE chain = ? AND date >= ? ORDER BY date ASC')
        .bind(c, cutoff)
        .all<{ date: string; tvl_usd: number }>();
      tvlByChain[c] = (res.results ?? []).map(r => ({ date: r.date, tvl: r.tvl_usd }));
    }

    // Latest TVL for each chain (for table display)
    const latestRes = await env.METRILYTICS_DB
      .prepare(`
        SELECT c.chain, c.tvl_usd
        FROM chain_tvl c
        INNER JOIN (
          SELECT chain, MAX(date) as max_date FROM chain_tvl GROUP BY chain
        ) sub ON c.chain = sub.chain AND c.date = sub.max_date
        ORDER BY c.tvl_usd DESC
      `)
      .all<{ chain: string; tvl_usd: number }>();
    const latest = latestRes.results ?? [];

    return new Response(
      JSON.stringify({ success: true, tvl: tvlByChain, latest, chains, days }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500, headers: CORS,
    });
  }
};
