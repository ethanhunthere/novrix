/**
 * GET /api/metrilytics/stablecoins
 * Returns current stablecoin supply breakdown + historical total.
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
    const url  = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '365', 10);
    const cutoff = days > 0
      ? new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
      : '2016-01-01';

    const [supplyRes, totalRes] = await env.METRILYTICS_DB.batch([
      // Latest supply per stablecoin
      env.METRILYTICS_DB.prepare(`
        SELECT s.symbol, s.supply_usd, s.peg_price, s.date
        FROM stablecoin_supply s
        INNER JOIN (
          SELECT symbol, MAX(date) as max_date FROM stablecoin_supply GROUP BY symbol
        ) sub ON s.symbol = sub.symbol AND s.date = sub.max_date
        ORDER BY s.supply_usd DESC
      `),
      // Historical total
      env.METRILYTICS_DB.prepare(
        'SELECT date, total_supply_usd FROM stablecoin_total WHERE date >= ? ORDER BY date ASC'
      ).bind(cutoff),
    ]);

    const supply = supplyRes.results as { symbol: string; supply_usd: number; peg_price: number; date: string }[];
    const total  = (totalRes.results as { date: string; total_supply_usd: number }[])
      .map(r => ({ date: r.date, total: r.total_supply_usd }));
    const topSymbols = supply.slice(0, 6).map(row => row.symbol);
    const bySymbol: Record<string, { date: string; supply: number }[]> = {};

    if (topSymbols.length > 0) {
      const placeholders = topSymbols.map(() => '?').join(', ');
      const historyRes = await env.METRILYTICS_DB
        .prepare(`
          SELECT symbol, date, supply_usd
          FROM stablecoin_supply
          WHERE date >= ? AND symbol IN (${placeholders})
          ORDER BY symbol, date ASC
        `)
        .bind(cutoff, ...topSymbols)
        .all<{ symbol: string; date: string; supply_usd: number }>();

      for (const row of historyRes.results ?? []) {
        if (!bySymbol[row.symbol]) bySymbol[row.symbol] = [];
        bySymbol[row.symbol].push({ date: row.date, supply: row.supply_usd });
      }
    }

    return new Response(
      JSON.stringify({ success: true, supply, total, bySymbol }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', supply: [], total: [] }), {
      status: 500, headers: CORS,
    });
  }
};
