/**
 * Cloudflare Pages Function — Entity Holdings API
 * Serves on-chain balance/portfolio data from D1 entity_holdings table.
 *
 * Modes:
 *   GET /api/holdings                → List all entities with aggregated holdings
 *   GET /api/holdings?entity=Name    → Single entity portfolio detail
 *   GET /api/holdings?top=20         → Top N entities by total USD portfolio value
 *   GET /api/holdings?chain=Bitcoin  → Filter by blockchain
 */

interface Env {
  TRACKING_DB: D1Database;
}

interface NativeHoldingRow {
  address: string;
  address_label: string;
  blockchain: string;
  token: string;
  balance: number;
  balance_usd: number;
  price: number;
  updated_at: string;
}

interface TokenHoldingRow {
  balance_usd: number;
}

interface ChainAddress {
  address: string;
  label: string;
  balance: number;
  balance_usd: number;
}

interface WhaleTransactionRow {
  sender: string | null;
  receiver: string | null;
}

interface TokenTotalRow {
  entity: string;
  token_usd: number | null;
}

interface LeaderboardRow {
  entity: string;
  category: string | null;
  description: string | null;
  total_usd: number | null;
  address_count: number | null;
  chains: string | null;
  tokens: string | null;
  last_updated: string | null;
}

interface EntitySummary {
  entity: string;
  category: string;
  description: string;
  total_usd: number;
  native_usd: number;
  token_usd: number;
  change_24h_usd: number;
  address_count: number;
  chains: string[];
  tokens: string[];
  last_updated: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const { TRACKING_DB } = context.env;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const entity = (url.searchParams.get('entity') || '').trim();
    const chain = (url.searchParams.get('chain') || '').trim();
    const top = Math.min(parseInt(url.searchParams.get('top') || '50'), 200);

    /* ══════════════════════════════════════════
       SINGLE ENTITY PORTFOLIO DETAIL
       ══════════════════════════════════════════ */
    if (entity) {
      // Native holdings (BTC, ETH, SOL)
      const holdingsResult = await TRACKING_DB.prepare(
        `SELECT address, address_label, blockchain, token, balance, balance_usd, price, updated_at
         FROM entity_holdings
         WHERE LOWER(entity) = ?
         ORDER BY balance_usd DESC`
      ).bind(entity.toLowerCase()).all<NativeHoldingRow>();

      // ERC-20 token holdings
      const tokensResult = await TRACKING_DB.prepare(
        `SELECT address, blockchain, token_symbol, token_name, balance, balance_usd, price, updated_at
         FROM entity_token_holdings
         WHERE LOWER(entity) = ?
         ORDER BY balance_usd DESC`
      ).bind(entity.toLowerCase()).all<TokenHoldingRow>();

      if (!holdingsResult.results?.length && !tokensResult.results?.length) {
        return new Response(
          JSON.stringify({ success: false, error: 'No holdings data for this entity' }),
          { status: 404, headers: corsHeaders }
        );
      }

      // Aggregate portfolio value
      const totalNativeUSD = (holdingsResult.results || []).reduce(
        (sum, r) => sum + (r.balance_usd || 0), 0
      );
      const totalTokenUSD = (tokensResult.results || []).reduce(
        (sum, r) => sum + (r.balance_usd || 0), 0
      );

      // Group native holdings by blockchain
      const byChain: Record<string, { token: string; balance: number; balance_usd: number; price: number; addresses: ChainAddress[] }> = {};
      for (const h of holdingsResult.results || []) {
        const chainHolding = byChain[h.blockchain] ??= { token: h.token, balance: 0, balance_usd: 0, price: h.price, addresses: [] };
        chainHolding.balance += h.balance;
        chainHolding.balance_usd += h.balance_usd;
        chainHolding.addresses.push({
          address: h.address,
          label: h.address_label,
          balance: h.balance,
          balance_usd: h.balance_usd,
        });
      }

      // Get entity metadata from first holding row
      const meta = await TRACKING_DB.prepare(
        `SELECT category, description FROM entity_holdings WHERE LOWER(entity) = ? LIMIT 1`
      ).bind(entity.toLowerCase()).first<{ category: string; description: string }>();

      // Get recent transactions from whale_transactions for buy/sell history
      const addrs = (holdingsResult.results || []).map((h) => h.address.toLowerCase());
      let recentTxs: WhaleTransactionRow[] = [];
      if (addrs.length > 0) {
        const ph = addrs.map(() => '?').join(',');
        // Addresses normalized lowercase at rest (migration 003): plain IN uses
        // idx_whale_sender/receiver. UNION keeps both sides indexed (OR would not).
        const txResult = await TRACKING_DB.prepare(
          `SELECT * FROM (
             SELECT id, signature, amount_usd, amount_native, flow_type, sender, receiver,
                    sender_label, receiver_label, timestamp, blockchain, token
             FROM whale_transactions WHERE sender IN (${ph})
             UNION
             SELECT id, signature, amount_usd, amount_native, flow_type, sender, receiver,
                    sender_label, receiver_label, timestamp, blockchain, token
             FROM whale_transactions WHERE receiver IN (${ph})
           ) ORDER BY timestamp DESC LIMIT 30`
        ).bind(...addrs, ...addrs).all<WhaleTransactionRow>();
        recentTxs = txResult.results || [];
      }

      // Compute buy/sell signals from recent transactions
      const txHistory = recentTxs.map((tx) => {
        const isSender = tx.sender != null && addrs.includes(tx.sender.toLowerCase());
        const isReceiver = tx.receiver != null && addrs.includes(tx.receiver.toLowerCase());
        let action = 'Transfer';
        if (isSender && !isReceiver) action = 'Sold / Sent';
        else if (!isSender && isReceiver) action = 'Bought / Received';
        return {
          ...tx,
          action,
        };
      });

      return new Response(
        JSON.stringify({
          success: true,
          entity: entity,
          category: meta?.category || '',
          description: meta?.description || '',
          portfolio: {
            total_usd: totalNativeUSD + totalTokenUSD,
            native_usd: totalNativeUSD,
            token_usd: totalTokenUSD,
          },
          holdings_by_chain: byChain,
          token_holdings: tokensResult.results || [],
          recent_transactions: txHistory,
          updated_at: holdingsResult.results?.[0]?.updated_at || '',
        }),
        { headers: corsHeaders }
      );
    }

    /* ══════════════════════════════════════════
       TOP ENTITIES LEADERBOARD
       ══════════════════════════════════════════ */
    let chainFilter = '';
    const params: string[] = [];
    if (chain) {
      chainFilter = ` WHERE LOWER(h.blockchain) = ?`;
      params.push(chain.toLowerCase());
    }

    const leaderboard = await TRACKING_DB.prepare(
      `SELECT h.entity, h.category, h.description,
              SUM(h.balance_usd) as total_usd,
              COUNT(DISTINCT h.address) as address_count,
              GROUP_CONCAT(DISTINCT h.blockchain) as chains,
              GROUP_CONCAT(DISTINCT h.token) as tokens,
              MAX(h.updated_at) as last_updated
       FROM entity_holdings h
       ${chainFilter}
       GROUP BY h.entity
       ORDER BY total_usd DESC
       LIMIT ?`
    ).bind(...params, top).all<LeaderboardRow>();

    // Also get token holdings sums per entity
    const tokenTotals = await TRACKING_DB.prepare(
      `SELECT entity, SUM(balance_usd) as token_usd
       FROM entity_token_holdings
       GROUP BY entity`
    ).all<TokenTotalRow>();

    const tokenMap: Record<string, number> = {};
    for (const t of tokenTotals.results || []) {
      tokenMap[t.entity.toLowerCase()] = t.token_usd || 0;
    }

    const entities: EntitySummary[] = (leaderboard.results || []).map((row) => ({
      entity: row.entity,
      category: row.category || '',
      description: row.description || '',
      total_usd: (row.total_usd || 0) + (tokenMap[row.entity.toLowerCase()] || 0),
      native_usd: row.total_usd || 0,
      token_usd: tokenMap[row.entity.toLowerCase()] || 0,
      change_24h_usd: 0,
      address_count: row.address_count || 0,
      chains: row.chains?.split(',') || [],
      tokens: row.tokens?.split(',') || [],
      last_updated: row.last_updated || '',
    }));

    // Re-sort after adding token values
    entities.sort((a, b) => b.total_usd - a.total_usd);

    // Calculate 24h net flow from whale_transactions for these entities
    const entityNames = entities.map(e => e.entity.toLowerCase());
    
    const flowMap: Record<string, number> = {};
    if (entityNames.length > 0) {
      // 24h net flow per entity. Addresses normalized lowercase at rest
      // (migration 003): plain equality joins hit idx_whale_receiver/sender.
      // Two separate grouped scans (receiver-side, sender-side) merged in JS —
      // each uses its own index instead of one OR-join full scan.
      const addrCte = `SELECT address, entity FROM known_addresses
           UNION
           SELECT address, entity FROM entity_holdings`;
      const inflow = await TRACKING_DB.prepare(
        `SELECT a.entity, SUM(w.amount_usd) as v
         FROM whale_transactions w JOIN (${addrCte}) a ON w.receiver = a.address
         WHERE w.timestamp > datetime('now', '-1 day')
         GROUP BY a.entity`
      ).all<{ entity: string; v: number }>();
      const outflow = await TRACKING_DB.prepare(
        `SELECT a.entity, SUM(w.amount_usd) as v
         FROM whale_transactions w JOIN (${addrCte}) a ON w.sender = a.address
         WHERE w.timestamp > datetime('now', '-1 day')
         GROUP BY a.entity`
      ).all<{ entity: string; v: number }>();

      const txFlow24h = { results: [] as { entity: string; net_flow: number }[] };
      const flowAcc: Record<string, number> = {};
      for (const r of inflow.results || []) if (r.entity) flowAcc[r.entity] = (flowAcc[r.entity] || 0) + (r.v || 0);
      for (const r of outflow.results || []) if (r.entity) flowAcc[r.entity] = (flowAcc[r.entity] || 0) - (r.v || 0);
      for (const [entity, net_flow] of Object.entries(flowAcc)) txFlow24h.results.push({ entity, net_flow });
      
      for (const flowRow of txFlow24h.results || []) {
        if (flowRow.entity) {
          flowMap[flowRow.entity.toLowerCase()] = flowRow.net_flow || 0;
        }
      }
    }

    // Attach to entities
    for (const e of entities) {
      e.change_24h_usd = flowMap[e.entity.toLowerCase()] || 0;
    }

    // Global stats
    const globalStats = await TRACKING_DB.prepare(
      `SELECT COUNT(DISTINCT entity) as entity_count,
              COUNT(DISTINCT address) as address_count,
              SUM(balance_usd) as total_tracked_usd,
              MAX(updated_at) as last_scan
       FROM entity_holdings`
    ).first<{ entity_count: number; address_count: number; total_tracked_usd: number; last_scan: string }>();

    return new Response(
      JSON.stringify({
        success: true,
        entities,
        count: entities.length,
        stats: {
          entities_tracked: globalStats?.entity_count || 0,
          addresses_tracked: globalStats?.address_count || 0,
          total_value_tracked: (globalStats?.total_tracked_usd || 0),
          last_scan: globalStats?.last_scan || '',
        },
      }),
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Holdings API] Error: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
