/**
 * Cloudflare Pages Function — Tracking Flow History
 * Returns hourly/daily aggregated flow data for charts.
 *
 * Query params:
 *   - granularity: 'hourly' | 'daily' (default: hourly)
 *   - hours: number of hours to look back (default: 168 = 7 days)
 *   - chain: filter by chain (optional)
 */

interface Env {
  TRACKING_DB: D1Database;
}

interface FlowPoint {
  period: string;
  inflow_volume: number;
  outflow_volume: number;
  net_flow: number;
  tx_count: number;
  avg_tx_size: number;
  largest_tx: number;
}

interface ChainFlowPoint {
  period: string;
  blockchain: string;
  volume: number;
  tx_count: number;
}

interface TokenFlowPoint {
  token: string;
  volume: number;
  tx_count: number;
  inflow: number;
  outflow: number;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const { TRACKING_DB } = context.env;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const url = new URL(request.url);
    const granularity = url.searchParams.get('granularity') || 'hourly';
    const hoursRaw = parseInt(url.searchParams.get('hours') || '168', 10);
    const hours = Number.isFinite(hoursRaw) ? Math.min(Math.max(hoursRaw, 1), 720) : 168;
    const chain = url.searchParams.get('chain') || 'all';

    const chainFilter = chain !== 'all' ? `AND LOWER(blockchain) = ?` : '';
    const chainParams = chain !== 'all' ? [chain.toLowerCase()] : [];

    // Time format based on granularity
    const timeFormat = granularity === 'daily'
      ? `strftime('%Y-%m-%d', timestamp)`
      : `strftime('%Y-%m-%d %H:00', timestamp)`;

    // Main flow history
    const flowQuery = `
      SELECT
        ${timeFormat} as period,
        COALESCE(SUM(CASE WHEN flow_type IN ('Exchange Inflow', 'Inflow') THEN amount_usd ELSE 0 END), 0) as inflow_volume,
        COALESCE(SUM(CASE WHEN flow_type IN ('Exchange Outflow', 'Outflow') THEN amount_usd ELSE 0 END), 0) as outflow_volume,
        COUNT(*) as tx_count,
        COALESCE(AVG(CASE WHEN flow_type != 'Self' THEN amount_usd END), 0) as avg_tx_size,
        COALESCE(MAX(CASE WHEN flow_type != 'Self' THEN amount_usd ELSE 0 END), 0) as largest_tx
      FROM whale_transactions
      WHERE timestamp >= datetime('now', '-' || ? || ' hours')
        AND is_pending = 0
        ${chainFilter}
      GROUP BY period
      ORDER BY period ASC
    `;

    const flowResult = await TRACKING_DB.prepare(flowQuery)
      .bind(hours, ...chainParams)
      .all<FlowPoint>();

    const flowHistory = (flowResult.results || []).map(row => ({
      ...row,
      net_flow: row.inflow_volume - row.outflow_volume,
    }));

    // Chain breakdown for the period
    const chainQuery = `
      SELECT
        ${timeFormat} as period,
        blockchain,
        COALESCE(SUM(CASE WHEN flow_type != 'Self' THEN amount_usd ELSE 0 END), 0) as volume,
        COUNT(*) as tx_count
      FROM whale_transactions
      WHERE timestamp >= datetime('now', '-' || ? || ' hours')
        AND is_pending = 0
      GROUP BY period, blockchain
      ORDER BY period ASC
    `;

    const chainResult = await TRACKING_DB.prepare(chainQuery)
      .bind(hours)
      .all<ChainFlowPoint>();

    // Token breakdown for the period
    const tokenQuery = `
      SELECT
        token,
        COALESCE(SUM(CASE WHEN flow_type != 'Self' THEN amount_usd ELSE 0 END), 0) as volume,
        COUNT(*) as tx_count,
        COALESCE(SUM(CASE WHEN flow_type IN ('Exchange Inflow', 'Inflow') THEN amount_usd ELSE 0 END), 0) as inflow,
        COALESCE(SUM(CASE WHEN flow_type IN ('Exchange Outflow', 'Outflow') THEN amount_usd ELSE 0 END), 0) as outflow
      FROM whale_transactions
      WHERE timestamp >= datetime('now', '-' || ? || ' hours')
        AND is_pending = 0
        ${chainFilter}
      GROUP BY token
      ORDER BY volume DESC
      LIMIT 20
    `;

    const tokenResult = await TRACKING_DB.prepare(tokenQuery)
      .bind(hours, ...chainParams)
      .all<TokenFlowPoint>();

    // Exchange-specific flows
    const exchangeQuery = `
      SELECT
        CASE
          WHEN flow_type IN ('Exchange Inflow', 'Inflow') THEN receiver_label
          WHEN flow_type IN ('Exchange Outflow', 'Outflow') THEN sender_label
          ELSE NULL
        END as exchange,
        flow_type,
        COALESCE(SUM(amount_usd), 0) as volume,
        COUNT(*) as tx_count
      FROM whale_transactions
      WHERE timestamp >= datetime('now', '-' || ? || ' hours')
        AND is_pending = 0
        AND flow_type IN ('Exchange Inflow', 'Inflow', 'Exchange Outflow', 'Outflow')
        AND (
          (flow_type IN ('Exchange Inflow', 'Inflow') AND receiver_label != '' AND LOWER(receiver_label) != 'unknown')
          OR
          (flow_type IN ('Exchange Outflow', 'Outflow') AND sender_label != '' AND LOWER(sender_label) != 'unknown')
        )
      GROUP BY exchange, flow_type
      HAVING exchange IS NOT NULL
      ORDER BY volume DESC
      LIMIT 30
    `;

    const exchangeResult = await TRACKING_DB.prepare(exchangeQuery)
      .bind(hours)
      .all<{ exchange: string; flow_type: string; volume: number; tx_count: number }>();

    // Aggregate exchange flows
    const exchangeFlows: Record<string, { inflow: number; outflow: number; tx_count: number }> = {};
    for (const row of exchangeResult.results || []) {
      if (!row.exchange) continue;
      if (!exchangeFlows[row.exchange]) {
        exchangeFlows[row.exchange] = { inflow: 0, outflow: 0, tx_count: 0 };
      }
      if (row.flow_type.includes('Inflow')) {
        exchangeFlows[row.exchange].inflow += row.volume;
      } else {
        exchangeFlows[row.exchange].outflow += row.volume;
      }
      exchangeFlows[row.exchange].tx_count += row.tx_count;
    }

    // Large transactions (>$10M)
    const largeTxQuery = `
      SELECT
        id, signature, amount_usd, amount_native, flow_type,
        sender, receiver, sender_label, receiver_label,
        timestamp, blockchain, token, block_height
      FROM whale_transactions
      WHERE timestamp >= datetime('now', '-' || ? || ' hours')
        AND is_pending = 0
        AND flow_type != 'Self'
        AND amount_usd >= 10000000
        ${chainFilter}
      ORDER BY amount_usd DESC
      LIMIT 20
    `;

    const largeTxResult = await TRACKING_DB.prepare(largeTxQuery)
      .bind(hours, ...chainParams)
      .all();

    // Flow type distribution
    const flowTypeQuery = `
      SELECT
        flow_type,
        COUNT(*) as tx_count,
        COALESCE(SUM(CASE WHEN flow_type != 'Self' THEN amount_usd ELSE 0 END), 0) as volume
      FROM whale_transactions
      WHERE timestamp >= datetime('now', '-' || ? || ' hours')
        AND is_pending = 0
        ${chainFilter}
      GROUP BY flow_type
      ORDER BY volume DESC
    `;

    const flowTypeResult = await TRACKING_DB.prepare(flowTypeQuery)
      .bind(hours, ...chainParams)
      .all<{ flow_type: string; tx_count: number; volume: number }>();

    return new Response(
      JSON.stringify({
        success: true,
        granularity,
        hours,
        flow_history: flowHistory,
        chain_flows: chainResult.results || [],
        token_flows: tokenResult.results || [],
        exchange_flows: Object.entries(exchangeFlows).map(([exchange, flows]) => ({
          exchange,
          ...flows,
          net_flow: flows.inflow - flows.outflow,
        })).sort((a, b) => (b.inflow + b.outflow) - (a.inflow + a.outflow)),
        large_transactions: largeTxResult.results || [],
        flow_type_distribution: flowTypeResult.results || [],
      }),
      { headers: CORS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Flow History] Error: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
      { status: 500, headers: CORS }
    );
  }
};
