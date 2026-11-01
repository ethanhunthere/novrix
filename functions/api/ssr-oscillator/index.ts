/**
 * Cloudflare Pages Function - SSR Oscillator
 * Primary: D1 database ssr_data with rolling 200d Bollinger Z-Score.
 * Fallback: Static onchain snapshot from ASSETS (/data/onchain/ssr-oscillator.json).
 */

interface Env {
  DB: D1Database;
  ASSETS?: { fetch: typeof fetch };
}

interface SsrRow {
  date: string;
  ssr: number;
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
      `SELECT date, ssr FROM ssr_data ORDER BY date ASC`
    ).all<SsrRow>();

    if (result.results && result.results.length > 30) {
      const rows = result.results;
      const oscData = [];
      for (let i = 0; i < rows.length; i++) {
        const windowStart = Math.max(0, i - 199);
        const window = rows.slice(windowStart, i + 1);
        const mean = window.reduce((acc, p) => acc + p.ssr, 0) / window.length;
        const variance = window.reduce((acc, p) => acc + Math.pow(p.ssr - mean, 2), 0) / window.length;
        const stdDev = Math.sqrt(variance);
        const zScore = stdDev > 0 ? (rows[i].ssr - mean) / stdDev : 0;
        oscData.push({
          time: `${rows[i].date}T00:00:00Z`,
          value: Math.round(zScore * 10000) / 10000,
          ssr_oscillator: Math.round(zScore * 10000) / 10000,
        });
      }
      return new Response(
        JSON.stringify({ success: true, data: oscData, payload: oscData.length, source: 'd1' }),
        { headers: { ...CORS, 'Cache-Control': CACHE } }
      );
    }
  } catch (e) {
    console.error('[ssr-oscillator] D1 error:', e);
  }

  // Instant static asset fallback if D1 is unavailable or rate-limited
  try {
    const staticUrl = new URL('/data/onchain/ssr-oscillator.json', request.url);
    const assetRes = env?.ASSETS
      ? await env.ASSETS.fetch(staticUrl)
      : await fetch(staticUrl);
    if (assetRes.ok) {
      const json = await assetRes.json();
      return new Response(JSON.stringify(json), {
        headers: { ...CORS, 'Cache-Control': CACHE, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('[ssr-oscillator] ASSETS fallback error:', err);
  }

  return new Response(
    JSON.stringify({ success: false, error: 'SSR Oscillator data unavailable' }),
    { status: 503, headers: { ...CORS, 'Cache-Control': 'no-store' } }
  );
};
