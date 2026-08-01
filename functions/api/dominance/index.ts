/**
 * Cloudflare Pages Function — Current BTC & ETH Dominance
 * Returns the latest dominance record from D1 for the GlobalCLI `dominance` command.
 * Falls back to CoinGecko if no data is available in D1.
 */

interface Env {
  DB: D1Database;
}

interface DominanceRecord {
  date: string;
  btc_dominance: number;
  eth_dominance: number;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  // Try D1 first
  try {
    const row = await env.DB.prepare(
      `SELECT date, btc_dominance, eth_dominance FROM dominance_data ORDER BY date DESC LIMIT 1`
    ).first<DominanceRecord>();

    if (row) {
      return Response.json(
        { btc_dominance: row.btc_dominance, eth_dominance: row.eth_dominance, date: row.date, source: 'd1' },
        { headers: { ...CORS, 'Cache-Control': 'public, max-age=900, s-maxage=1800, stale-while-revalidate=3600' } }
      );
    }
  } catch (e) {
    console.error('[Dominance/index] D1 error:', e);
  }

  // Fallback: CoinGecko global
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global', {
      headers: { 'User-Agent': 'NOVRIX Terminal', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const json = await res.json() as { data: { btc_dominance: number; eth_dominance: number } };
    const btc = json.data?.btc_dominance ?? 0;
    const eth = json.data?.eth_dominance ?? 0;
    return Response.json(
      { btc_dominance: btc, eth_dominance: eth, source: 'coingecko' },
      { headers: { ...CORS, 'Cache-Control': 'public, max-age=300, s-maxage=600' } }
    );
  } catch (e) {
    console.error('[Dominance/index] CoinGecko fallback error:', e);
    return Response.json({ error: 'Dominance data unavailable' }, { status: 503, headers: CORS });
  }
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: CORS });
