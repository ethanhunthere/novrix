/**
 * Cloudflare Pages Function - Gold Price (USD)
 * Primary: D1 database (populated by the fred-cron worker via Yahoo GC=F).
 * Fallback: Yahoo Finance GC=F (COMEX gold futures front-month, tracks spot).
 *
 * Note: FRED no longer has a usable gold series — the London AM/PM fixes
 * (GOLDAMGBD228NLBM / GOLDPMGBD228NLBM) were discontinued and the remaining
 * NASDAQQGLDI index diverges badly from the real gold price.
 */

interface Env {
  DB: D1Database;
}

interface DataRecord {
  date: string;
  value: number;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const CACHE = 'public, s-maxage=3600, stale-while-revalidate=7200';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const result = await env.DB.prepare(
      `SELECT date, value FROM gold_data ORDER BY date ASC`
    ).all<DataRecord>();

    if (result.results && result.results.length > 30) {
      const data = result.results.map((row) => ({
        time: `${row.date}T00:00:00Z`,
        value: row.value,
      }));
      return new Response(
        JSON.stringify({ success: true, data, payload: data.length, source: 'd1' }),
        { headers: { ...CORS, 'Cache-Control': CACHE } }
      );
    }
  } catch (e) {
    console.error('[gold] D1 error:', e);
  }

  try {
    // Fallback: Yahoo Finance GC=F (COMEX gold futures, tracks spot gold).
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = Math.floor(new Date('2000-01-01T00:00:00Z').getTime() / 1000);
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/GC=F?period1=${period1}&period2=${period2}&interval=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) throw new Error(`Yahoo GC=F status ${res.status}`);
    const json = await res.json() as {
      chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> };
    };
    const result = json.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const byDate = new Map<string, number>();
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c === null || c === undefined || !Number.isFinite(c)) continue;
      byDate.set(new Date(timestamps[i] * 1000).toISOString().split('T')[0], Math.round(c * 100) / 100);
    }
    const data = [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, value]) => ({ time: `${date}T00:00:00Z`, value }));
    return new Response(
      JSON.stringify({ success: true, data, payload: data.length, source: 'yahoo_fallback' }),
      { headers: { ...CORS, 'Cache-Control': CACHE } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[gold] Fallback failed:', message);
    return new Response(
      JSON.stringify({ success: false, error: 'No Gold data available' }),
      { status: 503, headers: CORS }
    );
  }
};
