/**
 * Cloudflare Pages Function — Entity Profiles API
 * Returns top crypto entities with aggregated transaction data from D1.
 * Supports search by entity name and returns holdings/activity.
 */

interface Env {
  TRACKING_DB: D1Database;
}

interface EntityRow {
  entity: string;
  label: string;
  address: string;
  blockchain: string;
  tags: string;
}

interface EntityAgg {
  entity: string;
  total_received: number;
  total_sent: number;
  tx_count: number;
  last_active: string;
}

interface EntityListRow {
  entity: string;
  chains: string | null;
  addr_count: number;
  all_tags: string | null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const { TRACKING_DB } = context.env;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') || '').trim();
    const entity = (url.searchParams.get('entity') || '').trim();
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 100);
    const category = (url.searchParams.get('category') || '').trim();

    /* ── Single entity detail mode ── */
    if (entity) {
      const entityParam = entity.toLowerCase();
      // Get all addresses for this entity from known_addresses
      let addresses = await TRACKING_DB.prepare(
        `SELECT address, label, entity, blockchain, tags
         FROM known_addresses
         WHERE LOWER(entity) = ?
         ORDER BY blockchain, label`
      ).bind(entityParam).all<EntityRow>();

      // Fallback: try entity_holdings if known_addresses has no results
      if (!addresses.results?.length) {
        const holdingsAddrs = await TRACKING_DB.prepare(
          `SELECT address, address_label as label, entity, blockchain, category as tags
           FROM entity_holdings
           WHERE LOWER(entity) = ?
           ORDER BY blockchain`
        ).bind(entityParam).all<EntityRow>();
        if (holdingsAddrs.results?.length) {
          addresses = holdingsAddrs;
        }
      }

      if (!addresses.results?.length) {
        return new Response(
          JSON.stringify({ success: false, error: 'Entity not found' }),
          { status: 404, headers: corsHeaders }
        );
      }

      // Get aggregated transaction data — plain equality on normalized-lowercase
      // addresses (migration 003) so idx_whale_sender/receiver are used.
      // Match entity case-insensitively on the small reference tables only.
      const addrCte = `SELECT address FROM known_addresses WHERE LOWER(entity) = ?
           UNION
           SELECT address FROM entity_holdings WHERE LOWER(entity) = ?`;

      const received = await TRACKING_DB.prepare(
        `SELECT COALESCE(SUM(w.amount_usd), 0) as total, COUNT(w.id) as cnt, MAX(w.timestamp) as last_ts
         FROM whale_transactions w
         JOIN (${addrCte}) a ON w.receiver = a.address`
      ).bind(entityParam, entityParam).first<{ total: number; cnt: number; last_ts: string }>();

      const sent = await TRACKING_DB.prepare(
        `SELECT COALESCE(SUM(w.amount_usd), 0) as total, COUNT(w.id) as cnt, MAX(w.timestamp) as last_ts
         FROM whale_transactions w
         JOIN (${addrCte}) a ON w.sender = a.address`
      ).bind(entityParam, entityParam).first<{ total: number; cnt: number; last_ts: string }>();

      // Recent transactions (last 50) — sender-side + receiver-side UNION keeps index usage
      const recentTxs = await TRACKING_DB.prepare(
        `SELECT * FROM (
           SELECT w.id, w.signature, w.amount_usd, w.amount_native, w.flow_type,
                  w.sender, w.receiver, w.sender_label, w.receiver_label,
                  w.timestamp, w.blockchain, w.token
           FROM whale_transactions w
           JOIN (${addrCte}) a ON w.sender = a.address
           UNION
           SELECT w.id, w.signature, w.amount_usd, w.amount_native, w.flow_type,
                  w.sender, w.receiver, w.sender_label, w.receiver_label,
                  w.timestamp, w.blockchain, w.token
           FROM whale_transactions w
           JOIN (${addrCte}) a ON w.receiver = a.address
         ) ORDER BY timestamp DESC LIMIT 50`
      ).bind(entityParam, entityParam, entityParam, entityParam).all();

      // Token breakdown — same UNION pattern for index coverage
      const tokenBreakdown = await TRACKING_DB.prepare(
        `SELECT token, blockchain, SUM(amount_usd) as volume, COUNT(*) as cnt FROM (
           SELECT w.token, w.blockchain, w.amount_usd, w.id
           FROM whale_transactions w
           JOIN (${addrCte}) a ON w.sender = a.address
           UNION ALL
           SELECT w.token, w.blockchain, w.amount_usd, w.id
           FROM whale_transactions w
           JOIN (${addrCte}) a ON w.receiver = a.address
         ) GROUP BY token, blockchain
         ORDER BY volume DESC`
      ).bind(entityParam, entityParam, entityParam, entityParam).all();

      const lastTimes = [received?.last_ts, sent?.last_ts].filter(Boolean).sort().reverse();

      return new Response(
        JSON.stringify({
          success: true,
          entity: {
            name: addresses.results[0].entity,
            address_count: addresses.results.length,
            blockchains: [...new Set(addresses.results.map(a => a.blockchain))],
            tags: addresses.results[0].tags || '',
          },
          addresses: addresses.results,
          stats: {
            total_received: received?.total ?? 0,
            total_sent: sent?.total ?? 0,
            net_flow: (received?.total ?? 0) - (sent?.total ?? 0),
            tx_count: (received?.cnt ?? 0) + (sent?.cnt ?? 0),
            last_active: lastTimes[0] || '',
          },
          tokens: tokenBreakdown.results || [],
          recent_transactions: recentTxs.results || [],
        }),
        { headers: corsHeaders }
      );
    }

    /* ── Search / list mode ── */
    // Get distinct entities from known_addresses
    let entitiesQuery: string;
    let entitiesParams: string[];

    const categoryFilter = category ? `AND LOWER(tags) LIKE ?` : '';
    const categoryParam = category ? `%${category.toLowerCase()}%` : null;

    if (query && query.length >= 2) {
      entitiesQuery = `SELECT entity, GROUP_CONCAT(DISTINCT blockchain) as chains,
                       COUNT(*) as addr_count, GROUP_CONCAT(DISTINCT tags) as all_tags
                       FROM known_addresses
                       WHERE LOWER(entity) LIKE ? AND entity != '' ${categoryFilter}
                       GROUP BY entity ORDER BY addr_count DESC LIMIT ?`;
      entitiesParams = [`%${query.toLowerCase()}%`];
      if (categoryParam) entitiesParams.push(categoryParam);
      entitiesParams.push(String(limit));
    } else {
      // Return top entities by address count (most prominent ones)
      entitiesQuery = `SELECT entity, GROUP_CONCAT(DISTINCT blockchain) as chains,
                       COUNT(*) as addr_count, GROUP_CONCAT(DISTINCT tags) as all_tags
                       FROM known_addresses
                       WHERE entity != '' ${categoryFilter}
                       GROUP BY entity ORDER BY addr_count DESC LIMIT ?`;
      entitiesParams = [];
      if (categoryParam) entitiesParams.push(categoryParam);
      entitiesParams.push(String(limit));
    }

    const entities = await TRACKING_DB.prepare(entitiesQuery).bind(...entitiesParams).all<EntityListRow>();

    // Fallback: if known_addresses has no results, try entity_holdings
    let entitySource = entities;
    if (!entities.results?.length) {
      const holdingsFilter = category ? `AND LOWER(category) LIKE ?` : '';
      const qStr = query ? `LOWER(entity) LIKE ?` : `1=1`;
      
      const hParams: (string | number)[] = [];
      if (query) hParams.push(`%${query.toLowerCase()}%`);
      if (categoryParam) hParams.push(categoryParam);
      hParams.push(String(limit));

      const holdingsFallback = await TRACKING_DB.prepare(
        `SELECT entity, GROUP_CONCAT(DISTINCT blockchain) as chains,
                COUNT(DISTINCT address) as addr_count, category as all_tags
         FROM entity_holdings
         WHERE ${qStr} ${holdingsFilter}
         GROUP BY entity ORDER BY SUM(balance_usd) DESC LIMIT ?`
      ).bind(...hParams).all<EntityListRow>();
      
      if (holdingsFallback.results?.length) entitySource = holdingsFallback;
    }

    // Single grouped query — no N+1. Addresses normalized lowercase at rest
    // (migration 003), so plain equality uses idx_whale_sender/receiver.
    const rows = entitySource.results || [];
    const names = rows.map(r => r.entity);
    const aggMap: Record<string, { cnt: number; vol: number; last_ts: string }> = {};

    if (names.length > 0) {
      const ph = names.map(() => '?').join(',');
      const aggs = await TRACKING_DB.prepare(
        `WITH addr AS (
           SELECT address, entity FROM known_addresses WHERE entity IN (${ph})
           UNION
           SELECT address, entity FROM entity_holdings WHERE entity IN (${ph})
         ),
         tx AS (
           SELECT a.entity, w.amount_usd, w.timestamp
           FROM whale_transactions w JOIN addr a ON w.sender = a.address
           UNION ALL
           SELECT a.entity, w.amount_usd, w.timestamp
           FROM whale_transactions w JOIN addr a ON w.receiver = a.address
         )
         SELECT entity, COUNT(*) as cnt, COALESCE(SUM(amount_usd), 0) as vol, MAX(timestamp) as last_ts
         FROM tx GROUP BY entity`
      ).bind(...names, ...names).all<{ entity: string; cnt: number; vol: number; last_ts: string }>();

      for (const a of aggs.results || []) {
        aggMap[a.entity] = { cnt: a.cnt, vol: a.vol, last_ts: a.last_ts };
      }
    }

    const enriched = rows.map((row) => ({
      entity: row.entity,
      chains: row.chains?.split(',') || [],
      address_count: row.addr_count,
      tags: row.all_tags || '',
      tx_count: aggMap[row.entity]?.cnt ?? 0,
      total_volume: aggMap[row.entity]?.vol ?? 0,
      last_active: aggMap[row.entity]?.last_ts ?? '',
    }));

    // Sort by total_volume descending (most active first)
    enriched.sort((a, b) => b.total_volume - a.total_volume);

    return new Response(
      JSON.stringify({
        success: true,
        entities: enriched,
        count: enriched.length,
      }),
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Entity API] Error: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
