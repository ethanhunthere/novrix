/**
 * GET /api/metrilytics/market
 * Returns global crypto market data and token prices.
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
    const market = await env.METRILYTICS_DB
      .prepare('SELECT * FROM market_data ORDER BY date DESC LIMIT 1')
      .first<{
        date: string;
        total_market_cap_usd: number | null;
        total_volume_24h_usd: number | null;
        btc_dominance: number | null;
        eth_dominance: number | null;
        sol_dominance: number | null;
        market_cap_change_24h: number | null;
        volume_change_24h: number | null;
        active_cryptocurrencies: number | null;
        active_exchanges: number | null;
      }>();

    const prices = await env.METRILYTICS_DB
      .prepare('SELECT symbol, price_usd, change_24h_pct, market_cap_usd, volume_24h_usd FROM token_prices WHERE date = (SELECT MAX(date) FROM token_prices)')
      .all<{ symbol: string; price_usd: number; change_24h_pct: number | null; market_cap_usd: number | null; volume_24h_usd: number | null }>();

    const priceMap: Record<string, { price: number; change_24h: number | null; market_cap: number | null; volume_24h: number | null }> = {};
    for (const row of prices.results ?? []) {
      priceMap[row.symbol] = { price: row.price_usd, change_24h: row.change_24h_pct, market_cap: row.market_cap_usd, volume_24h: row.volume_24h_usd };
    }

    return new Response(
      JSON.stringify({ success: true, market, prices: priceMap }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: message, market: null, prices: {} }), {
      status: 500, headers: CORS,
    });
  }
};
