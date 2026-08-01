/**
 * Cloudflare Pages Function — Address Lookup API
 * Returns known address info (label, entity, chain, tags)
 * + transaction history for that address from whale_transactions.
 */

interface Env {
  TRACKING_DB: D1Database;
}

interface AddressRow {
  address: string;
  label: string;
  entity: string;
  blockchain: string;
  tags: string;
  logo: string;
  category?: string;
}

interface TxRow {
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
}

interface AggRow {
  total_volume: number;
  tx_count: number;
  first_seen: string;
  last_seen: string;
}

import { checkRateLimit } from '../../lib/rateLimit';
import { clientIp } from '../../lib/auth';

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

  const ip = clientIp(request);
  try {
    const limit = await checkRateLimit(TRACKING_DB, `api:address:${ip}`, 60, 60);
    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many requests' }),
        { status: 429, headers: corsHeaders }
      );
    }
  } catch {
    // Fail open on rate limit check errors
  }

  try {
    const url = new URL(request.url);
    const address = (url.searchParams.get('address') || '').trim();
    const query = (url.searchParams.get('q') || '').trim();

    /* ── Search mode: return matching addresses ── */
    if (query && query.length >= 2) {
      const lQuery = query.toLowerCase();
      let results = await TRACKING_DB.prepare(
        `SELECT ka.address, ka.label, ka.entity, ka.blockchain, ka.tags, ka.logo,
                (SELECT category FROM entity_holdings eh WHERE eh.entity = ka.entity AND eh.category != '' LIMIT 1) as category,
                CASE 
                  WHEN ka.address = ? THEN 1
                  WHEN LOWER(ka.label) LIKE ? OR LOWER(ka.entity) LIKE ? THEN 2
                  ELSE 3
                END as relevance
         FROM known_addresses ka
         WHERE ka.address = ? 
            OR LOWER(ka.label) LIKE ? OR LOWER(ka.entity) LIKE ?
            OR ka.address LIKE ? OR LOWER(ka.label) LIKE ? OR LOWER(ka.entity) LIKE ?
         ORDER BY relevance ASC, ka.entity, ka.label
         LIMIT 20`
      ).bind(
        query, 
        `${lQuery}%`, `${lQuery}%`,
        query, 
        `${lQuery}%`, `${lQuery}%`,
        `%${query}%`, `%${lQuery}%`, `%${lQuery}%`
      ).all<AddressRow>();

      // Fallback: search entity_holdings if known_addresses has no results
      if (!results.results?.length) {
        results = await TRACKING_DB.prepare(
          `SELECT address, address_label as label, entity, blockchain, category as tags, '' as logo, category,
                  CASE 
                    WHEN address = ? THEN 1
                    WHEN LOWER(address_label) LIKE ? OR LOWER(entity) LIKE ? THEN 2
                    ELSE 3
                  END as relevance
           FROM entity_holdings
           WHERE address = ? 
              OR LOWER(address_label) LIKE ? OR LOWER(entity) LIKE ?
              OR address LIKE ? OR LOWER(address_label) LIKE ? OR LOWER(entity) LIKE ?
           ORDER BY relevance ASC, entity
           LIMIT 20`
        ).bind(
          query, 
          `${lQuery}%`, `${lQuery}%`,
          query, 
          `${lQuery}%`, `${lQuery}%`,
          `%${query}%`, `%${lQuery}%`, `%${lQuery}%`
        ).all<AddressRow>();
      }

      return new Response(
        JSON.stringify({ success: true, results: results.results || [] }),
        { headers: corsHeaders }
      );
    }

    /* ── Address detail mode ── */
    if (!address) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing address or q parameter' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Check known_addresses table
    const addrLower = address.toLowerCase();
    const knownAddr = await TRACKING_DB.prepare(
      `SELECT address, label, entity, blockchain, tags, logo
       FROM known_addresses WHERE LOWER(address) = ?`
    ).bind(addrLower).first<AddressRow>();

    // 2. Get transaction history (sender or receiver)
    const txs = await TRACKING_DB.prepare(
      `SELECT id, signature, amount_usd, amount_native, flow_type,
              sender, receiver, sender_label, receiver_label,
              timestamp, blockchain, token
       FROM whale_transactions
       WHERE LOWER(sender) = ? OR LOWER(receiver) = ?
       ORDER BY timestamp DESC
       LIMIT 200`
    ).bind(addrLower, addrLower).all<TxRow>();

    // 3. Aggregate stats
    const aggSender = await TRACKING_DB.prepare(
      `SELECT COALESCE(SUM(amount_usd),0) as total_volume, COUNT(*) as tx_count,
              MIN(timestamp) as first_seen, MAX(timestamp) as last_seen
       FROM whale_transactions WHERE LOWER(sender) = ?`
    ).bind(addrLower).first<AggRow>();

    const aggReceiver = await TRACKING_DB.prepare(
      `SELECT COALESCE(SUM(amount_usd),0) as total_volume, COUNT(*) as tx_count,
              MIN(timestamp) as first_seen, MAX(timestamp) as last_seen
       FROM whale_transactions WHERE LOWER(receiver) = ?`
    ).bind(addrLower).first<AggRow>();

    const totalSent = aggSender?.total_volume ?? 0;
    const totalReceived = aggReceiver?.total_volume ?? 0;
    const txCount = (aggSender?.tx_count ?? 0) + (aggReceiver?.tx_count ?? 0);

    const firstSeens = [aggSender?.first_seen, aggReceiver?.first_seen].filter(Boolean).sort();
    const lastSeens = [aggSender?.last_seen, aggReceiver?.last_seen].filter(Boolean).sort().reverse();

    // 4. Token breakdown
    const tokenBreakdown = await TRACKING_DB.prepare(
      `SELECT token, blockchain, SUM(amount_usd) as volume, COUNT(*) as cnt
       FROM whale_transactions
       WHERE LOWER(sender) = ? OR LOWER(receiver) = ?
       GROUP BY token, blockchain
       ORDER BY volume DESC`
    ).bind(addrLower, addrLower).all();

    return new Response(
      JSON.stringify({
        success: true,
        address: {
          address: knownAddr?.address || address,
          label: knownAddr?.label || '',
          entity: knownAddr?.entity || '',
          blockchain: knownAddr?.blockchain || '',
          tags: knownAddr?.tags || '',
          logo: knownAddr?.logo || '',
        },
        stats: {
          total_sent: totalSent,
          total_received: totalReceived,
          net_flow: totalReceived - totalSent,
          tx_count: txCount,
          first_seen: firstSeens[0] || '',
          last_seen: lastSeens[0] || '',
        },
        tokens: tokenBreakdown.results || [],
        transactions: (txs.results || []).map((row: TxRow) => ({
          id: row.id,
          signature: row.signature,
          amount_usd: row.amount_usd,
          amount_native: row.amount_native || 0,
          flow_type: row.flow_type,
          sender: row.sender,
          receiver: row.receiver,
          sender_label: row.sender_label || '',
          receiver_label: row.receiver_label || '',
          timestamp: row.timestamp,
          blockchain: row.blockchain,
          token: row.token,
          direction: row.sender.toLowerCase() === addrLower ? 'sent' : 'received',
        })),
      }),
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Address Lookup] error: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
