/**
 * Cloudflare Pages Function — 10-Year minus 2-Year Treasury Spread
 * Source: FRED series T10Y2Y
 * Primary: D1 database (populated by sentiment cron worker).
 * Fallback: FRED JSON API (api.stlouisfed.org).
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
      `SELECT date, value FROM fred_t10y2y_data ORDER BY date ASC`
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
    console.error('[fred-t10y2y] D1 error:', e);
  }

  try {
    let data: Array<{ time: string; value: number }> = [];
    const key = env.FRED_API_KEY ?? '';
    if (key) {
      try {
        const params = new URLSearchParams({
          series_id: 'T10Y2Y',
          api_key: key,
          file_type: 'json',
          observation_start: '1947-01-01',
        });
        const res = await fetch(
          `https://api.stlouisfed.org/fred/series/observations?${params}`,
          { headers: { 'User-Agent': 'NOVRIX Terminal/1.0' }, signal: AbortSignal.timeout(8000) }
        );
        if (res.ok) {
          const json: { observations: Array<{ date: string; value: string }> } = await res.json();
          data = (json.observations ?? [])
            .filter(o => o.value && o.value !== '.')
            .map(o => ({ time: `${o.date}T00:00:00Z`, value: parseFloat(o.value) }))
            .filter(item => !isNaN(item.value));
        }
      } catch (e) {
        console.warn('[fred-t10y2y] FRED JSON API error, trying CSV fallback:', e);
      }
    }

    if (data.length === 0) {
      const csvRes = await fetch(
        `https://fred.stlouisfed.org/graph/fredgraph.csv?id=T10Y2Y`,
        { headers: { 'User-Agent': 'NOVRIX Terminal/1.0' }, signal: AbortSignal.timeout(8000) }
      );
      if (csvRes.ok) {
        const text = await csvRes.text();
        const lines = text.trim().split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const [date, valStr] = line.split(',');
          if (!date || !valStr || valStr === '.') continue;
          const num = parseFloat(valStr);
          if (!isNaN(num)) data.push({ time: `${date}T00:00:00Z`, value: num });
        }
      }
    }

    if (data.length > 0) {
      return new Response(
        JSON.stringify({ success: true, data, payload: data.length, source: 'fred_fallback' }),
        { headers: { ...CORS, 'Cache-Control': CACHE } }
      );
    }
    throw new Error('No T10Y2Y data from FRED');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[fred-t10y2y] Fallback failed:', message);
    return new Response(
      JSON.stringify({ success: false, error: 'No data available', message }),
      { status: 503, headers: CORS }
    );
  }
};
