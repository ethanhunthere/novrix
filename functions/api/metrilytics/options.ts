import type { D1Database } from '@cloudflare/workers-types';

interface Env {
  METRILYTICS_DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get('days') || '0', 10), 365);

  try {
    const cutoff = days > 0
      ? new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0]
      : '1900-01-01';

    const { results: aggregate } = await env.METRILYTICS_DB.prepare(
      `SELECT date, volume_usd FROM options_volume WHERE chain = 'all' AND date >= ? ORDER BY date`
    ).bind(cutoff).all<{ date: string; volume_usd: number }>();

    const { results: byChain } = await env.METRILYTICS_DB.prepare(
      `SELECT chain, date, volume_usd FROM options_volume WHERE chain != 'all' AND date >= ? ORDER BY date`
    ).bind(cutoff).all<{ chain: string; date: string; volume_usd: number }>();

    const chainMap = new Map<string, { date: string; volume_usd: number }[]>();
    for (const row of byChain) {
      const arr = chainMap.get(row.chain) || [];
      arr.push({ date: row.date, volume_usd: row.volume_usd });
      chainMap.set(row.chain, arr);
    }

    const { results: latestByChain } = await env.METRILYTICS_DB.prepare(
      `SELECT chain, volume_usd FROM options_volume WHERE chain != 'all' AND date = (SELECT MAX(date) FROM options_volume WHERE chain != 'all') ORDER BY volume_usd DESC LIMIT 10`
    ).all<{ chain: string; volume_usd: number }>();

    return Response.json({
      success: true,
      aggregate: aggregate || [],
      byChain: Object.fromEntries(chainMap),
      latestByChain: latestByChain || [],
      days,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};
