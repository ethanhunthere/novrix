/**
 * GET /api/metrilytics/concentration?days=365&top=10
 * Protocol concentration over time: each tracked date's TVL is split into the
 * top-N protocols (by TVL that date) vs "Other", returning a share series suitable
 * for a stacked-area "protocol concentration" chart. Computed from protocol_tvl;
 * no new ingestion. Artemis-style capital-concentration analytics.
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
    const url = new URL(request.url);
    const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '365'), 1), 730);
    const topN = Math.min(Math.max(parseInt(url.searchParams.get('top') || '10'), 3), 25);
    const since = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];

    // Pull every (date, protocol, tvl) row in the window.
    const rows = await env.METRILYTICS_DB
      .prepare(
        `SELECT date, protocol, tvl_usd
         FROM protocol_tvl
         WHERE date >= ? AND tvl_usd > 0
         ORDER BY date ASC, tvl_usd DESC`
      )
      .bind(since)
      .all<{ date: string; protocol: string; tvl_usd: number }>();

    // Group by date, keep top-N protocols per date, bucket the rest as "Other".
    const byDate = new Map<string, { protocol: string; tvl: number }[]>();
    for (const row of rows.results ?? []) {
      const arr = byDate.get(row.date) ?? [];
      arr.push({ protocol: row.protocol, tvl: row.tvl_usd });
      byDate.set(row.date, arr);
    }

    const dates = [...byDate.keys()].sort();
    const protocolSeries = new Map<string, number[]>(); // protocol -> share[] (0..1)
    const otherSeries: number[] = new Array(dates.length).fill(0);

    dates.forEach((date, i) => {
      const arr = (byDate.get(date) ?? []).sort((a, b) => b.tvl - a.tvl);
      const total = arr.reduce((s, r) => s + r.tvl, 0) || 1;
      arr.slice(0, topN).forEach((r) => {
        let s = protocolSeries.get(r.protocol);
        if (!s) { s = new Array(dates.length).fill(0); protocolSeries.set(r.protocol, s); }
        s[i] = total > 0 ? (r.tvl / total) * 100 : 0;
      });
      const otherTvl = arr.slice(topN).reduce((s, r) => s + r.tvl, 0);
      otherSeries[i] = total > 0 ? (otherTvl / total) * 100 : 0;
    });

    // Keep only protocols that appear in the top-N on the latest date (stable legend).
    const latestArr = (byDate.get(dates[dates.length - 1]) ?? []).sort((a, b) => b.tvl - a.tvl).slice(0, topN);
    const keepProtocols = new Set(latestArr.map((r) => r.protocol));
    const series = [...protocolSeries.entries()]
      .filter(([p]) => keepProtocols.has(p))
      .map(([protocol, shares]) => ({ protocol, shares }));

    // HHI (Herfindahl-Hirschman Index) of protocol TVL — concentration score 0..10000.
    const hhi = dates.map((date, i) => {
      const arr = byDate.get(date) ?? [];
      const total = arr.reduce((s, r) => s + r.tvl, 0) || 1;
      return Math.round(arr.reduce((s, r) => s + Math.pow((r.tvl / total) * 100, 2), 0));
    });

    return new Response(
      JSON.stringify({
        success: true,
        dates,
        series,
        other: otherSeries,
        hhi,
        meta: { days, top: topN, points: dates.length },
      }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: message, dates: [], series: [], other: [], hhi: [] }), {
      status: 500, headers: CORS,
    });
  }
};
