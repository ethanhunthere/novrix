/**
 * GET /api/metrilytics/category-history?days=365
 * Returns historical TVL per DeFi category (stacked-area source), computed from
 * the existing protocol_tvl table (which carries a `category` column). No new
 * ingestion required — this is a pure SQL aggregation over data the cron already
 * stores. Distinct from /protocols (current snapshot) and DeFiCategoriesPanel.
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
    const since = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];

    // Aggregate TVL by date + category. Exclude rollup rows where category is empty.
    const rows = await env.METRILYTICS_DB
      .prepare(
        `SELECT date, COALESCE(NULLIF(category, ''), 'Unknown') AS category, SUM(tvl_usd) AS tvl_usd
         FROM protocol_tvl
         WHERE date >= ? AND category IS NOT NULL AND category != ''
         GROUP BY date, category
         ORDER BY date ASC, tvl_usd DESC`
      )
      .bind(since)
      .all<{ date: string; category: string; tvl_usd: number }>();

    // Pivot into { dates: string[], categories: { [cat]: number[] } } for stacked area.
    const dateSet: string[] = [];
    const categoryMap = new Map<string, Map<string, number>>();
    for (const row of rows.results ?? []) {
      if (!dateSet.length || dateSet[dateSet.length - 1] !== row.date) dateSet.push(row.date);
      let series = categoryMap.get(row.category);
      if (!series) { series = new Map(); categoryMap.set(row.category, series); }
      series.set(row.date, row.tvl_usd);
    }

    const categories: Record<string, number[]> = {};
    let total = 0;
    for (const [cat, series] of categoryMap) {
      categories[cat] = dateSet.map((d) => series.get(d) ?? 0);
      total += series.size;
    }

    // Rank categories by latest total TVL so the frontend can order the stack.
    const latestByCategory = Object.entries(categories).map(([cat, arr]) => ({
      category: cat,
      latest_tvl: arr[arr.length - 1] ?? 0,
    })).sort((a, b) => b.latest_tvl - a.latest_tvl);

    return new Response(
      JSON.stringify({
        success: true,
        dates: dateSet,
        categories,
        ranking: latestByCategory,
        meta: { days, points: dateSet.length, categories: latestByCategory.length },
      }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: message, dates: [], categories: {}, ranking: [] }), {
      status: 500, headers: CORS,
    });
  }
};
