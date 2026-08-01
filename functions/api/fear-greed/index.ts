/**
 * Cloudflare Pages Function — /api/fear-greed
 *
 * Primary: D1 fear_greed_data table (seeded by cron + seed endpoint).
 * Fallback: Alternative.me direct API.
 *
 * Staleness check: if the latest D1 record is >25h old (e.g. cron hiccup),
 * fetch one fresh record from Alternative.me and insert it before returning,
 * so the page always shows the most recent value.
 *
 * Returns historical Fear & Greed data in chronological order (oldest first).
 * Query param: ?days=N (max 3000 ≈ 8 years of Alternative.me history)
 *
 * Response shape matches /api/sentiment/historical-cached so existing
 * chart code works without changes.
 */

interface Env {
  DB: D1Database;
}

interface AlternativeFearGreedItem {
  value: string;
  value_classification: string;
  timestamp: string;
}

interface AlternativeFearGreedResponse {
  data?: AlternativeFearGreedItem[];
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const STALE_THRESHOLD_MS = 25 * 60 * 60 * 1000; // 25 hours

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(request.url);
  const days = Math.min(Math.max(1, parseInt(url.searchParams.get('days') || '365', 10)), 3000);

  try {
    const stateRow = await env.DB.prepare(
      `SELECT MAX(date) as latest FROM fear_greed_data`
    ).first<{ latest: string | null }>();

    const latestDate = stateRow?.latest ?? null;
    const isStale = !latestDate || (Date.now() - new Date(latestDate + 'T00:00:00Z').getTime()) > STALE_THRESHOLD_MS;

    if (isStale) {
      try {
        const freshRes = await fetch('https://api.alternative.me/fng/?limit=1&format=json', {
          headers: { Accept: 'application/json', 'User-Agent': 'NOVRIX Terminal' },
          signal: AbortSignal.timeout(8000),
        });
        if (freshRes.ok) {
          const freshJson = await freshRes.json() as AlternativeFearGreedResponse;
          const item = freshJson.data?.[0];
          if (item) {
            const date = new Date(parseInt(item.timestamp) * 1000).toISOString().split('T')[0];
            const score = parseInt(item.value);
            await env.DB.prepare(
              `INSERT OR IGNORE INTO fear_greed_data (date, score, classification) VALUES (?, ?, ?)`
            ).bind(date, score, item.value_classification).run();
          }
        }
      } catch (e) {
        console.error('[FearGreed] Staleness refresh failed:', e);
      }
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const result = await env.DB.prepare(`
      SELECT date, score, classification
      FROM fear_greed_data
      WHERE date >= ?
      ORDER BY date ASC
    `).bind(cutoffStr).all<{ date: string; score: number; classification: string }>();

    if (result.results && result.results.length > 0) {
      const data = result.results.map((r) => ({
        score: r.score,
        label: r.classification,
        timestamp: `${r.date}T00:00:00Z`,
        dominance: null,
        eth_dominance: null,
        trend_direction: r.score < 25 ? 'bearish' : r.score > 75 ? 'bullish' : 'neutral',
      }));

      return new Response(JSON.stringify({ success: true, data, count: data.length }), {
        headers: {
          ...CORS,
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          'X-Data-Source': isStale ? 'cloudflare-d1-refreshed' : 'cloudflare-d1',
        },
      });
    }
  } catch (e) {
    console.error('[FearGreed] D1 error:', e);
  }

  // Fallback: Alternative.me direct
  try {
    const res = await fetch(
      `https://api.alternative.me/fng/?limit=${Math.min(days, 365)}&format=json`,
      { headers: { Accept: 'application/json', 'User-Agent': 'NOVRIX Terminal' }, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) throw new Error(`Alternative.me ${res.status}`);
    const json = await res.json() as AlternativeFearGreedResponse;
    if (!json.data?.length) throw new Error('No data');

    // Alternative.me returns newest first — reverse to chronological
    const data = [...json.data].reverse().map((item) => ({
      score: parseInt(item.value),
      label: item.value_classification,
      timestamp: new Date(parseInt(item.timestamp) * 1000).toISOString(),
      dominance: null,
      eth_dominance: null,
      trend_direction: parseInt(item.value) < 25 ? 'bearish' : parseInt(item.value) > 75 ? 'bullish' : 'neutral',
    }));

    return new Response(JSON.stringify({ success: true, data, count: data.length }), {
      headers: { ...CORS, 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', 'X-Data-Source': 'alternative.me-fallback' },
    });
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'No Fear & Greed data available' }),
      { status: 503, headers: CORS },
    );
  }
};
