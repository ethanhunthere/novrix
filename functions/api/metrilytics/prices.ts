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
  const days = Math.min(parseInt(url.searchParams.get('days') || '0', 10), 500);
  const symbol = (url.searchParams.get('symbol') || 'BTC').toUpperCase();
  const validSymbols = ['BTC', 'ETH', 'SOL'];
  const table = validSymbols.includes(symbol) ? `${symbol.toLowerCase()}_prices` : 'btc_prices';

  try {
    const cutoff = days > 0
      ? new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0]
      : '1900-01-01';

    const { results } = await env.METRILYTICS_DB.prepare(
      `SELECT date, open, high, low, close, volume FROM ${table} WHERE date >= ? ORDER BY date`
    ).bind(cutoff).all<{ date: string; open: number; high: number; low: number; close: number; volume: number }>();

    const latest = results && results.length > 0 ? results[results.length - 1] : null;

    return Response.json({
      success: true,
      symbol,
      data: results || [],
      latest: latest ? {
        price: latest.close,
        high24h: latest.high,
        low24h: latest.low,
        volume24h: latest.volume,
      } : null,
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
