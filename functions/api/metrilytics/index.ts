/**
 * GET /api/metrilytics
 * Returns the metrilytics_summary key/value cache.
 * Populated daily by workers/metrilytics-cron.
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
    const rows = await env.METRILYTICS_DB
      .prepare('SELECT key, value, updated_at FROM metrilytics_summary')
      .all<{ key: string; value: string; updated_at: string }>();

    const summary: Record<string, string> = {};
    for (const row of rows.results ?? []) summary[row.key] = row.value;

    const lastUpdated = rows.results?.[0]?.updated_at ?? null;

    return new Response(JSON.stringify({ success: true, summary, lastUpdated }), {
      headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', summary: {} }), {
      status: 500, headers: CORS,
    });
  }
};
