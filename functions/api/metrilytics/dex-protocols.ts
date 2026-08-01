/**
 * GET /api/metrilytics/dex-protocols?limit=50
 * Returns a per-protocol DEX volume leaderboard (Uniswap, Curve, PancakeSwap, ...)
 * from the dex_protocol_volume table, populated daily by the metrilytics cron from
 * DeFiLlama's free /overview/dexs protocols array. Distinct from /dex (per-chain).
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
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50'), 1), 200);
    const sort = url.searchParams.get('sort') === '30d' ? 'volume_30d' : url.searchParams.get('sort') === '1y' ? 'volume_1y' : 'volume_24h';

    const rows = await env.METRILYTICS_DB
      .prepare(
        `SELECT protocol, slug, date, volume_24h, volume_30d, volume_1y, volume_all_time,
                change_1d, change_7d, change_30d, category, chains
         FROM dex_protocol_volume
         WHERE date = (SELECT MAX(date) FROM dex_protocol_volume)
         ORDER BY ${sort} DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<{
        protocol: string; slug: string; date: string;
        volume_24h: number | null; volume_30d: number | null; volume_1y: number | null;
        volume_all_time: number | null; change_1d: number | null; change_7d: number | null;
        change_30d: number | null; category: string | null; chains: string | null;
      }>();

    const protocols = (rows.results ?? []).map((r) => ({
      ...r,
      chains: r.chains ? r.chains.split(', ').filter(Boolean) : [],
    }));

    // Aggregate totals for the panel header.
    const totals = protocols.reduce(
      (acc, p) => {
        acc.volume_24h += p.volume_24h ?? 0;
        acc.volume_30d += p.volume_30d ?? 0;
        acc.volume_1y += p.volume_1y ?? 0;
        return acc;
      },
      { volume_24h: 0, volume_30d: 0, volume_1y: 0 },
    );

    return new Response(
      JSON.stringify({ success: true, protocols, totals, count: protocols.length, sort }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: message, protocols: [], totals: { volume_24h: 0, volume_30d: 0, volume_1y: 0 }, count: 0 }), {
      status: 500, headers: CORS,
    });
  }
};
