/**
 * GET /api/metrilytics/fees
 * Returns top protocols by daily fees/revenue from protocol_fees table.
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
    const url   = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 100);
    const days  = parseInt(url.searchParams.get('days') || '365', 10);
    const cutoff = days > 0
      ? new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
      : '2016-01-01';

    const [rows, historyRows] = await env.METRILYTICS_DB.batch([
      env.METRILYTICS_DB.prepare(`
        SELECT f.protocol, f.slug, f.daily_fees_usd, f.daily_revenue_usd, f.date
        FROM protocol_fees f
        INNER JOIN (
          SELECT slug, MAX(date) as max_date FROM protocol_fees GROUP BY slug
        ) sub ON f.slug = sub.slug AND f.date = sub.max_date
        WHERE f.slug != 'all'
        ORDER BY f.daily_fees_usd DESC
        LIMIT ?
      `)
        .bind(limit),
      env.METRILYTICS_DB.prepare(`
        SELECT date, daily_fees_usd, daily_revenue_usd
        FROM protocol_fees
        WHERE slug = 'all' AND date >= ?
        ORDER BY date ASC
      `)
        .bind(cutoff),
    ]);

    const history = (historyRows.results as {
      date: string;
      daily_fees_usd: number | null;
      daily_revenue_usd: number | null;
    }[] | undefined ?? []).map(row => ({
      date: row.date,
      fees: row.daily_fees_usd ?? 0,
      revenue: row.daily_revenue_usd ?? 0,
    }));

    return new Response(
      JSON.stringify({ success: true, protocols: rows.results ?? [], history, days }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', protocols: [] }), {
      status: 500, headers: CORS,
    });
  }
};
