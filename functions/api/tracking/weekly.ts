/**
 * Cloudflare Pages Function — Weekly Whale Volume Aggregation
 * Returns total USD volume of large whale transactions grouped by week.
 * Covers last 12+ weeks for trend analysis.
 */

interface Env {
  TRACKING_DB: D1Database;
}

interface WeeklyRow {
  week_start: string;
  total_volume: number;
  tx_count: number;
  avg_tx_size: number;
  inflow_volume: number;
  outflow_volume: number;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const { TRACKING_DB } = context.env;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const url = new URL(request.url);
    const weeksParam = parseInt(url.searchParams.get('weeks') || '12', 10);
    const weeks = Number.isFinite(weeksParam) ? Math.min(Math.max(weeksParam, 4), 52) : 12;

    // Two sources, one continuous history:
    //  1. weekly_volume (written by the cron every run) — closed weeks; survives
    //     the 30-day raw retention. Wrapped in try/catch: the table or its flow
    //     columns may not exist yet pre-deploy — raw-only fallback then.
    //  2. Raw whale_transactions — the current OPEN week (the aggregate lags
    //     the feed by up to one cron run) plus any recent week missing from it.
    // Week anchor formula date('now','weekday 0','-7 days') is shared with the
    // cron writer — never change one without the other.
    const currentWeek = await TRACKING_DB.prepare(
      `SELECT date('now', 'weekday 0', '-7 days') AS ws`
    ).first<{ ws: string }>();

    interface ClosedRow {
      week_start: string; total_volume: number; tx_count: number;
      inflow_volume: number | null; outflow_volume: number | null;
    }
    let closedRows: ClosedRow[] = [];
    try {
      const closedResult = await TRACKING_DB.prepare(`
        SELECT week_start,
               SUM(total_volume_usd)  as total_volume,
               SUM(transaction_count) as tx_count,
               SUM(COALESCE(inflow_volume_usd, 0))  as inflow_volume,
               SUM(COALESCE(outflow_volume_usd, 0)) as outflow_volume
        FROM weekly_volume
        WHERE week_start < ?
        GROUP BY week_start
        ORDER BY week_start DESC
        LIMIT ?
      `).bind(currentWeek?.ws ?? '', weeks).all<ClosedRow>();
      closedRows = closedResult.results ?? [];
    } catch { /* aggregate table not ready — raw-only fallback */ }

    // Weekly = confirmed whale flow volume. Pending mempool txs and 'Self'
    // (change-output/treasury shuffling) are excluded from the metric but
    // remain visible in the raw feed. Note: SQLite has no 'weeks' modifier
    // — the interval must be expressed in days ('-N days').
    const openResult = await TRACKING_DB.prepare(`
      SELECT
        date(timestamp, 'weekday 0', '-7 days') as week_start,
        COALESCE(SUM(amount_usd), 0) as total_volume,
        COUNT(*) as tx_count,
        COALESCE(AVG(amount_usd), 0) as avg_tx_size,
        COALESCE(SUM(CASE WHEN flow_type IN ('Exchange Inflow', 'Inflow') THEN amount_usd ELSE 0 END), 0) as inflow_volume,
        COALESCE(SUM(CASE WHEN flow_type IN ('Exchange Outflow', 'Outflow') THEN amount_usd ELSE 0 END), 0) as outflow_volume
      FROM whale_transactions
      WHERE timestamp > datetime('now', '-${weeks * 7} days')
        AND is_pending = 0
        AND flow_type != 'Self'
      GROUP BY week_start
      ORDER BY week_start DESC
    `).all<WeeklyRow>();

    // Merge: raw (open/recent) weeks win on collision; closed weeks fill history.
    const byWeek = new Map<string, WeeklyRow>();
    for (const r of closedRows) {
      byWeek.set(r.week_start, {
        week_start: r.week_start,
        total_volume: r.total_volume ?? 0,
        tx_count: r.tx_count ?? 0,
        avg_tx_size: (r.tx_count ?? 0) > 0 ? (r.total_volume ?? 0) / (r.tx_count ?? 1) : 0,
        inflow_volume: r.inflow_volume ?? 0,
        outflow_volume: r.outflow_volume ?? 0,
      });
    }
    for (const r of openResult.results ?? []) byWeek.set(r.week_start, r);

    const rows = [...byWeek.values()]
      .sort((a, b) => b.week_start.localeCompare(a.week_start))
      .slice(0, weeks);

    // Calculate 3-week moving average for trend line
    const withMA = rows.map((row, i) => {
      const slice = rows.slice(i, i + 3);
      const ma = slice.length > 0
        ? slice.reduce((s, r) => s + r.total_volume, 0) / slice.length
        : 0;
      return {
        week_start: row.week_start,
        total_volume: row.total_volume,
        tx_count: row.tx_count,
        avg_tx_size: row.avg_tx_size,
        inflow_volume: row.inflow_volume,
        outflow_volume: row.outflow_volume,
        net_flow: row.inflow_volume - row.outflow_volume,
        moving_average_3w: Math.round(ma * 100) / 100,
      };
    });

    // Determine trend direction
    const latest = withMA[0];
    const prev = withMA[1];
    const trend = latest && prev
      ? latest.total_volume > prev.total_volume ? 'up' : 'down'
      : 'neutral';

    return new Response(
      JSON.stringify({
        success: true,
        weeks,
        trend,
        data: withMA,
        summary: {
          total_volume_12w: withMA.reduce((s, r) => s + r.total_volume, 0),
          total_txs_12w: withMA.reduce((s, r) => s + r.tx_count, 0),
          largest_week: withMA.length > 0 ? Math.max(...withMA.map(r => r.total_volume)) : 0,
          latest_week_volume: latest?.total_volume || 0,
          latest_week_txs: latest?.tx_count || 0,
        },
      }),
      { headers: CORS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Weekly Volume] D1 query error: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
      { status: 500, headers: CORS }
    );
  }
};
