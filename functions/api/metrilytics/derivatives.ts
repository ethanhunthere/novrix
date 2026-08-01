/**
 * GET /api/metrilytics/derivatives?symbol=BTC&days=90
 * Returns open interest, funding rates, and long/short ratio history.
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
    const url    = new URL(request.url);
    const symbol = (url.searchParams.get('symbol') || 'BTC').toUpperCase();
    const days   = parseInt(url.searchParams.get('days') || '90', 10);
    const cutoff = days > 0
      ? new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
      : '2016-01-01';

    const rows = await env.METRILYTICS_DB
      .prepare(
        `SELECT date, open_interest_usd, funding_rate, long_short_ratio
         FROM derivatives_data
         WHERE symbol = ? AND date >= ?
         ORDER BY date ASC`
      )
      .bind(symbol, cutoff)
      .all<{
        date: string;
        open_interest_usd: number | null;
        funding_rate: number | null;
        long_short_ratio: number | null;
      }>();

    const data = (rows.results ?? []).map(r => ({
      date: r.date,
      oi:   r.open_interest_usd,
      fr:   r.funding_rate,
      ls:   r.long_short_ratio,
    }));

    return new Response(
      JSON.stringify({ success: true, symbol, data, days }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', data: [] }), {
      status: 500, headers: CORS,
    });
  }
};
