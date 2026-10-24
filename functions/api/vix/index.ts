/**
 * Cloudflare Pages Function - VIX (CBOE Volatility Index)
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
  const { request, env, waitUntil } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(request.url, request);

  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    } catch {}
  }

  try {
    const result = await env.DB.prepare(
      `SELECT date, value FROM vix_data ORDER BY date ASC`
    ).all<DataRecord>();

    if (result.results && result.results.length > 30) {
      const data = result.results.map((row) => ({
        time: `${row.date}T00:00:00Z`,
        value: row.value,
      }));
      const response = new Response(
        JSON.stringify({ success: true, data, payload: data.length, source: 'd1' }),
        { headers: { ...CORS, 'Cache-Control': CACHE } }
      );
      if (cache) {
        try { waitUntil(cache.put(cacheKey, response.clone())); } catch {}
      }
      return response;
    }
  } catch (e) {
    console.error('[vix] D1 error:', e);
  }

  try {
    const key = env.FRED_API_KEY ?? '';
    let data: Array<{ time: string; value: number }> = [];

    if (key) {
      try {
        const params = new URLSearchParams({ series_id: 'VIXCLS', api_key: key, file_type: 'json', observation_start: '1990-01-01' });
        const res = await fetch(
          `https://api.stlouisfed.org/fred/series/observations?${params}`,
          { headers: { 'User-Agent': 'NOVRIX Terminal/1.0' }, signal: AbortSignal.timeout(10000) }
        );
        if (res.ok) {
          const json: { observations: Array<{ date: string; value: string }> } = await res.json();
          data = (json.observations ?? [])
            .filter(o => o.value && o.value !== '.')
            .map(o => ({ time: `${o.date}T00:00:00Z`, value: parseFloat(o.value) }))
            .filter(item => !isNaN(item.value));
        }
      } catch (e) {
        console.warn('[vix] FRED API error, falling back to CSV:', e);
      }
    }

    if (data.length === 0) {
      const csvRes = await fetch(
        `https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS`,
        { headers: { 'User-Agent': 'NOVRIX Terminal/1.0' }, signal: AbortSignal.timeout(10000) }
      );
      if (!csvRes.ok) throw new Error(`FRED CSV status ${csvRes.status}`);
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

    if (data.length > 0) {
      const response = new Response(
        JSON.stringify({ success: true, data, payload: data.length, source: 'fred_fallback' }),
        { headers: { ...CORS, 'Cache-Control': CACHE } }
      );
      if (cache) {
        try { waitUntil(cache.put(cacheKey, response.clone())); } catch {}
      }
      return response;
    }

    throw new Error('No data from FRED');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[vix] Fallback failed:', message);
    return new Response(
      JSON.stringify({ success: false, error: 'No VIX data available' }),
      { status: 503, headers: CORS }
    );
  }
};
