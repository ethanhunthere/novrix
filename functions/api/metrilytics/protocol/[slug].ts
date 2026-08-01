/**
 * GET /api/metrilytics/protocol/:slug?days=365
 * Returns historical TVL for a specific protocol.
 */

interface Env { METRILYTICS_DB: D1Database; }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    const slug = context.params.slug as string;
    const url  = new URL(context.request.url);
    const days = parseInt(url.searchParams.get('days') || '365', 10);

    const cutoff = days > 0
      ? new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
      : '2016-01-01';

    const rows = await context.env.METRILYTICS_DB
      .prepare(
        'SELECT date, tvl_usd, protocol, category FROM protocol_tvl WHERE slug = ? AND date >= ? ORDER BY date ASC'
      )
      .bind(slug, cutoff)
      .all<{ date: string; tvl_usd: number; protocol: string; category: string | null }>();

    if (!rows.results?.length) {
      return new Response(JSON.stringify({ success: false, error: 'Protocol not found', tvl: [] }), {
        status: 404, headers: CORS,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        slug,
        protocol: rows.results[0].protocol,
        category: rows.results[0].category,
        tvl: rows.results.map(r => ({ date: r.date, tvl: r.tvl_usd })),
      }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', tvl: [] }), {
      status: 500, headers: CORS,
    });
  }
};
