/**
 * Cloudflare Pages Function - DXY (US Dollar Index)
 * Primary: D1 database (populated by sentiment cron worker FRED fetch).
 * Fallback: FRED fredgraph.csv (free, no auth required).
 */

interface Env {
  DB: D1Database;
  FRED_API_KEY?: string;
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
      `SELECT date, value FROM dxy_data ORDER BY date ASC`
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
    console.error('[dxy] D1 error:', e);
  }

  try {
    const key = env.FRED_API_KEY ?? '';
    if (!key) throw new Error('FRED_API_KEY not configured');
    const params = new URLSearchParams({ series_id: 'DTWEXBGS', api_key: key, file_type: 'json', observation_start: '1990-01-01' });
    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?${params}`,
      { headers: { 'User-Agent': 'NOVRIX Terminal/1.0' }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) throw new Error(`FRED JSON API status ${res.status}`);
    const json: { observations: Array<{ date: string; value: string }> } = await res.json();
    const data = (json.observations ?? [])
      .filter(o => o.value && o.value !== '.')
      .map(o => ({ time: `${o.date}T00:00:00Z`, value: parseFloat(o.value) }))
      .filter(item => !isNaN(item.value));
    return new Response(
      JSON.stringify({ success: true, data, payload: data.length, source: 'fred_fallback' }),
      { headers: { ...CORS, 'Cache-Control': CACHE } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[dxy] Fallback failed:', message);
    return new Response(
      JSON.stringify({ success: false, error: 'No DXY data available' }),
      { status: 503, headers: CORS }
    );
  }
};
