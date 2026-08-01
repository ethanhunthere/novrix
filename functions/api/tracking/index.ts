/**
 * Cloudflare Pages Function — Multi-Chain Whale Tracking
 * Serves paginated whale transactions from D1.
 *
 * Response includes:
 *   - transactions: spec-named fields (hash, chain, symbol, from_address, etc.)
 *   - data: legacy field names for backward compatibility
 *   - chains_active: list of chains with transactions in the result set
 *   - last_updated: ISO timestamp of most recent transaction
 *   - data_freshness_seconds: age of most recent transaction in seconds
 *   - stats: aggregated volume/flow metrics
 *   - pagination: offset/limit/total
 */

interface Env {
  TRACKING_DB: D1Database;
}

interface WhaleRow {
  id: number;
  signature: string;
  amount_usd: number;
  amount_native: number;
  flow_type: string;
  sender: string;
  receiver: string;
  sender_label: string;
  receiver_label: string;
  timestamp: string;
  blockchain: string;
  token: string;
  token_name: string;
  source: string;
  block_height: number;
  is_pending: number;
  transaction_type: string;
}

interface AggRow {
  total_volume: number;
  total_txs: number;
  largest_tx: number;
  inflow_volume: number;
  outflow_volume: number;
}

interface ChainAggRow {
  blockchain: string;
  cnt: number;
  vol: number;
}

interface TokenAggRow {
  token: string;
  cnt: number;
}

interface LatestRow {
  latest_ts: string | null;
}

import { checkRateLimit } from '../../lib/rateLimit';
import { clientIp } from '../../lib/auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  // Edge cache for 30s; serve stale up to 2 min while revalidating.
  // At most 1 D1 query/minute per unique query regardless of concurrent users.
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const { TRACKING_DB } = context.env;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const ip = clientIp(request);
  try {
    const limit = await checkRateLimit(TRACKING_DB, `api:tracking:${ip}`, 60, 60);
    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many requests' }),
        { status: 429, headers: CORS }
      );
    }
  } catch {
    // Fail open on rate limit check errors — don't block legitimate traffic
  }

  try {
    const url = new URL(request.url);
    const chain  = url.searchParams.get('chain')  || 'all';
    const token  = url.searchParams.get('token')  || 'all';
    const flow   = url.searchParams.get('flow')   || 'all';

    const entity = (url.searchParams.get('entity') || '').trim();
    const address = (url.searchParams.get('address') || '').trim();

    const limitRaw  = parseInt(url.searchParams.get('limit')  || '100', 10);
    const offsetRaw = parseInt(url.searchParams.get('offset') || '0', 10);
    const minUsdRaw = parseFloat(url.searchParams.get('min_usd') || '0');
    const fromTsRaw = parseInt(url.searchParams.get('from_timestamp') || '0', 10);

    const limit  = Number.isFinite(limitRaw)  ? Math.min(Math.max(limitRaw, 0), 500) : 100;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
    
    const allowedMinUsd = [0, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
    const minUsd = allowedMinUsd.includes(minUsdRaw) ? minUsdRaw : (Number.isFinite(minUsdRaw) ? Math.max(minUsdRaw, 0) : 0);
    const fromTs = Number.isFinite(fromTsRaw) ? Math.max(fromTsRaw, 0) : 0;

    const conditions: string[] = [];
    const filterParams: (string | number)[] = [];

    if (chain !== 'all') {
      conditions.push(`LOWER(blockchain) = ?`);
      filterParams.push(chain.toLowerCase());
    }
    if (token !== 'all') {
      conditions.push(`UPPER(token) = ?`);
      filterParams.push(token.toUpperCase());
    }
    if (flow !== 'all') {
      conditions.push(`flow_type = ?`);
      filterParams.push(flow);
    }
    if (minUsd > 0) {
      conditions.push(`amount_usd >= ?`);
      filterParams.push(minUsd);
    }
    if (fromTs > 0) {
      // timestamp is stored as TEXT "YYYY-MM-DD HH:MM:SS" — compare using datetime()
      conditions.push(`timestamp > datetime(?, 'unixepoch')`);
      filterParams.push(fromTs);
    }
    if (entity) {
      conditions.push(`(LOWER(sender_label) LIKE ? OR LOWER(receiver_label) LIKE ?)`);
      filterParams.push(`%${entity.toLowerCase()}%`, `%${entity.toLowerCase()}%`);
    }
    if (address) {
      conditions.push(`(LOWER(sender) = ? OR LOWER(receiver) = ?)`);
      filterParams.push(address.toLowerCase(), address.toLowerCase());
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    const dataQuery = `
      SELECT id, signature, amount_usd, amount_native, flow_type,
             sender, receiver, sender_label, receiver_label,
             timestamp, blockchain, token,
             COALESCE(token_name, '') AS token_name,
             COALESCE(source, 'unknown') AS source,
             COALESCE(block_height, 0) AS block_height,
             COALESCE(is_pending, 0) AS is_pending,
             COALESCE(transaction_type, 'transfer') AS transaction_type
      FROM whale_transactions${whereClause}
      ORDER BY timestamp DESC LIMIT ? OFFSET ?`;

    const dataResult = await TRACKING_DB.prepare(dataQuery)
      .bind(...filterParams, limit, offset)
      .all<WhaleRow>();

    const rows = dataResult.results || [];

    const transactions = rows.map((row) => ({
      // Spec-defined field names
      id:               row.id,
      chain:            row.blockchain || 'Bitcoin',
      symbol:           row.token || 'BTC',
      token_name:       row.token_name || '',
      hash:             row.signature,
      from_address:     row.sender,
      from_label:       row.sender_label || '',
      to_address:       row.receiver,
      to_label:         row.receiver_label || '',
      amount:           row.amount_native || 0,
      amount_usd:       row.amount_usd,
      transaction_type: row.transaction_type || 'transfer',
      timestamp:        row.timestamp,
      is_pending:       row.is_pending || 0,
      source:           row.source || 'unknown',
      // Keep legacy fields for backward compat
      signature:        row.signature,
      blockchain:       row.blockchain || 'Bitcoin',
      token:            row.token || 'BTC',
      amount_native:    row.amount_native || 0,
      flow_type:        row.flow_type,
      sender:           row.sender,
      receiver:         row.receiver,
      sender_label:     row.sender_label || '',
      receiver_label:   row.receiver_label || '',
      block_height:     row.block_height || 0,
    }));

    // Feed summary for the current filters. Self-transfers are excluded from
    // volume/largest metrics (they pollute whale stats) but still counted in
    // total_txs so pagination matches the visible feed. Pending mempool txs
    // stay included — this is a live feed summary, not a settled-window metric.
    const aggResult = await TRACKING_DB.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN flow_type != 'Self' THEN amount_usd ELSE 0 END), 0) as total_volume,
        COUNT(*) as total_txs,
        COALESCE(MAX(CASE WHEN flow_type != 'Self' THEN amount_usd ELSE 0 END), 0) as largest_tx,
        COALESCE(SUM(CASE WHEN flow_type IN ('Exchange Inflow', 'Inflow') THEN amount_usd ELSE 0 END), 0) as inflow_volume,
        COALESCE(SUM(CASE WHEN flow_type IN ('Exchange Outflow', 'Outflow') THEN amount_usd ELSE 0 END), 0) as outflow_volume
      FROM whale_transactions${whereClause}
    `).bind(...filterParams).first<AggRow>();

    const chainAgg = await TRACKING_DB.prepare(
      `SELECT blockchain, COUNT(*) as cnt, COALESCE(SUM(CASE WHEN flow_type != 'Self' THEN amount_usd ELSE 0 END),0) as vol
       FROM whale_transactions${whereClause} GROUP BY blockchain ORDER BY cnt DESC`
    ).bind(...filterParams).all<ChainAggRow>();

    const by_chain: Record<string, { count: number; volume: number }> = {};
    const chainsActive: string[] = [];
    for (const row of (chainAgg.results || [])) {
      by_chain[row.blockchain] = { count: row.cnt, volume: row.vol };
      if (row.cnt > 0) chainsActive.push(row.blockchain.toLowerCase());
    }

    const tokenAgg = await TRACKING_DB.prepare(
      `SELECT token, COUNT(*) as cnt FROM whale_transactions${whereClause} GROUP BY token ORDER BY cnt DESC`
    ).bind(...filterParams).all<TokenAggRow>();

    const by_token: Record<string, number> = {};
    for (const row of (tokenAgg.results || [])) {
      by_token[row.token] = row.cnt;
    }

    const uniqueEntitiesAgg = await TRACKING_DB.prepare(`
      SELECT COUNT(DISTINCT label) as cnt FROM (
        SELECT sender_label as label FROM whale_transactions${whereClause}
        UNION
        SELECT receiver_label as label FROM whale_transactions${whereClause}
      ) WHERE label != '' AND LOWER(label) != 'unknown'
    `).bind(...filterParams, ...filterParams).first<{ cnt: number }>();

    // 'Self' moves are excluded from the headline largest tx unless the user
    // explicitly filtered to a concrete flow type.
    const largestWhere = flow === 'all'
      ? `${whereClause ? `${whereClause} AND` : ' WHERE'} flow_type != 'Self'`
      : whereClause;
    const largestTxRow = await TRACKING_DB.prepare(
      `SELECT id, signature, amount_usd, amount_native, flow_type, sender, receiver, sender_label, receiver_label, timestamp, blockchain, token, block_height 
       FROM whale_transactions${largestWhere} 
       ORDER BY amount_usd DESC LIMIT 1`
    ).bind(...filterParams).first<WhaleRow>();

    let largest_single_tx = null;
    if (largestTxRow) {
      largest_single_tx = {
        id:             largestTxRow.id,
        signature:      largestTxRow.signature,
        amount_usd:     largestTxRow.amount_usd,
        amount_native:  largestTxRow.amount_native || 0,
        flow_type:      largestTxRow.flow_type,
        timestamp:      largestTxRow.timestamp,
        blockchain:     largestTxRow.blockchain,
        token:          largestTxRow.token,
        sender:         largestTxRow.sender,
        receiver:       largestTxRow.receiver,
        sender_label:   largestTxRow.sender_label || '',
        receiver_label: largestTxRow.receiver_label || '',
        block_height:   largestTxRow.block_height || 0,
      };
    }

    const latestRow = await TRACKING_DB.prepare(
      `SELECT MAX(timestamp) as latest_ts FROM whale_transactions WHERE is_pending = 0`
    ).first<LatestRow>();

    const lastUpdated = latestRow?.latest_ts
      ? new Date(latestRow.latest_ts + 'Z').toISOString()
      : new Date().toISOString();

    const freshnessSecs = latestRow?.latest_ts
      ? Math.floor((Date.now() - new Date(latestRow.latest_ts + 'Z').getTime()) / 1000)
      : 0;

    // ── Rolling-window stats (24h / 7d + previous equivalent windows) ──────
    // Independent of user filters — filters shape the feed rows, not these.
    // Timestamps are stored as UTC TEXT so datetime('now') windows are exact.
    type WindowStats = {
      total_volume: number; total_txs: number; largest_tx: number;
      inflow_volume: number; outflow_volume: number; net_flow: number;
      by_chain: Record<string, { count: number; volume: number }>;
      by_token: Record<string, number>;
    };
    const computeWindowStats = async (startMod: string, endMod: string | null): Promise<WindowStats> => {
      const endClause = endMod ? ` AND timestamp < datetime('now', ?)` : '';
      const binds = endMod ? [startMod, endMod] : [startMod];
      const [agg, chains, tokens] = await Promise.all([
        TRACKING_DB.prepare(`
          SELECT COALESCE(SUM(amount_usd), 0) as total_volume,
                 COUNT(*) as total_txs,
                 COALESCE(MAX(amount_usd), 0) as largest_tx,
                 COALESCE(SUM(CASE WHEN flow_type IN ('Exchange Inflow', 'Inflow') THEN amount_usd ELSE 0 END), 0) as inflow_volume,
                 COALESCE(SUM(CASE WHEN flow_type IN ('Exchange Outflow', 'Outflow') THEN amount_usd ELSE 0 END), 0) as outflow_volume
          FROM whale_transactions
          -- Settled-window metrics: confirmed txs only, self-moves excluded.
          WHERE timestamp >= datetime('now', ?)${endClause}
            AND is_pending = 0 AND flow_type != 'Self'`
        ).bind(...binds).first<AggRow>(),
        TRACKING_DB.prepare(`
          SELECT blockchain, COUNT(*) as cnt, COALESCE(SUM(amount_usd), 0) as vol
          FROM whale_transactions
          WHERE timestamp >= datetime('now', ?)${endClause}
            AND is_pending = 0 AND flow_type != 'Self'
          GROUP BY blockchain ORDER BY vol DESC`
        ).bind(...binds).all<ChainAggRow>(),
        TRACKING_DB.prepare(`
          SELECT token, COUNT(*) as cnt, COALESCE(SUM(amount_usd), 0) as vol
          FROM whale_transactions
          WHERE timestamp >= datetime('now', ?)${endClause}
            AND is_pending = 0 AND flow_type != 'Self'
          GROUP BY token ORDER BY vol DESC LIMIT 12`
        ).bind(...binds).all<{ token: string; cnt: number; vol: number }>(),
      ]);
      const wc: Record<string, { count: number; volume: number }> = {};
      for (const r of chains.results ?? []) wc[r.blockchain] = { count: r.cnt, volume: r.vol };
      const wt: Record<string, number> = {};
      for (const r of tokens.results ?? []) wt[r.token] = r.cnt;
      const inflow = agg?.inflow_volume ?? 0;
      const outflow = agg?.outflow_volume ?? 0;
      return {
        total_volume: agg?.total_volume ?? 0,
        total_txs: agg?.total_txs ?? 0,
        largest_tx: agg?.largest_tx ?? 0,
        inflow_volume: inflow,
        outflow_volume: outflow,
        net_flow: inflow - outflow,
        by_chain: wc,
        by_token: wt,
      };
    };

    const [window_24h, window_7d, prev_24h, prev_7d] = await Promise.all([
      computeWindowStats('-24 hours', null),
      computeWindowStats('-7 days', null),
      computeWindowStats('-48 hours', '-24 hours'),
      computeWindowStats('-14 days', '-7 days'),
    ]);

    const stats = {
      total_volume:      aggResult?.total_volume   ?? 0,
      total_txs:         aggResult?.total_txs      ?? 0,
      largest_tx:        aggResult?.largest_tx     ?? 0,
      inflow_volume:     aggResult?.inflow_volume  ?? 0,
      outflow_volume:    aggResult?.outflow_volume ?? 0,
      avg_tx_usd:        (aggResult?.total_txs ?? 0) > 0 ? (aggResult?.total_volume ?? 0) / (aggResult?.total_txs ?? 1) : 0,
      unique_entities:   uniqueEntitiesAgg?.cnt ?? 0,
      most_active_chain: chainAgg.results?.[0]?.blockchain ?? null,
      largest_single_tx,
      by_chain,
      by_token,
    };

    return new Response(
      JSON.stringify({
        success: true,
        // New spec-compliant shape
        transactions,
        total:                 stats.total_txs,
        chains_active:         chainsActive,
        last_updated:          lastUpdated,
        data_freshness_seconds: freshnessSecs,
        // Legacy shape (backward compat with existing page)
        data: transactions,
        stats,
        // Rolling windows (filter-independent) + previous equivalent windows
        window_24h,
        window_7d,
        prev_24h,
        prev_7d,
        pagination: {
          offset,
          limit,
          returned: transactions.length,
          total: stats.total_txs,
          hasMore: offset + transactions.length < stats.total_txs,
        },
        source: 'd1',
      }),
      { headers: CORS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Whale Tracking] D1 query error: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
      { status: 500, headers: CORS }
    );
  }
};
