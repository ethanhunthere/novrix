import { TOP_ENTITIES, ensureKnownAddresses } from '../../lib/trackingSeed';

/**
 * NOVRIX Tracking Cron Worker v3
 *
 * Schedule: Every 15 minutes
 *
 * Multi-chain whale tracking with cursor-based ingestion, multi-source
 * fallbacks, in-memory labeling, and institutional flow classification.
 *
 * Chains: Bitcoin, Ethereum, Solana, Tron, Sui, Sei, Ripple, NEAR,
 *         Base, Arbitrum, Polygon, BSC, Optimism, Avalanche
 *
 * v3 CHANGES (vs. v2):
 *   - Lowered thresholds across all chains (BTC $100K, ETH/ERC-20/TRX/
 *     TRC-20/SUI/SEI/L2 $75K, SOL/SPL $50K, XRP/NEAR new at $100K/$75K)
 *   - Solana native + known-SPL scanning is now block-centric: scans the
 *     last 5 confirmed slots via Helius getBlock instead of polling a
 *     fixed list of exchange wallets
 *   - L2 chains (Base, Arbitrum, Polygon, BSC, Optimism, Avalanche) now
 *     track native gas-token transfers in addition to USDC/USDT, each
 *     priced in its own real native token (ETH, POL, BNB, AVAX)
 *   - Added Ripple (XRP) via xrplcluster.com account_tx against known
 *     exchange wallets, and NEAR via api.nearblocks.io
 *   - In-memory label Map loaded once per run from D1 known_addresses
 *   - Institutional flow classification (Exchange Inflow/Outflow/Transfer,
 *     Whale Transfer, Miner Movement, Mint/Burn)
 *   - Cursor-based ingestion via cron_state table — no gaps between runs
 *   - Batch inserts in groups of 100
 *   - Weekly volume aggregate table for chart accuracy after cleanup
 *   - 30-day retention with weekly snapshot preservation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Env {
  TRACKING_DB: D1Database;
  INSIGHTS_DB: D1Database;
  ETHERSCAN_KEY?: string;
  HELIUS_API_KEY?: string;
  BASESCAN_KEY?: string;
  ARBISCAN_KEY?: string;
  POLYGONSCAN_KEY?: string;
  BSCSCAN_KEY?: string;
  OPTIMISM_SCAN_KEY?: string;
  SNOWTRACE_KEY?: string;
}

type FlowType = 'Exchange Inflow' | 'Exchange Outflow' | 'Exchange Transfer'
              | 'Whale Transfer' | 'Miner Movement' | 'Mint' | 'Burn' | 'Transfer' | 'Self';

interface WhaleTransaction {
  signature: string;
  amount_usd: number;
  amount_native: number;
  flow_type: FlowType;
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

interface ApiRecord {
  [key: string]: unknown;
}

interface KnownAddr {
  label: string;
  entity: string;
  category: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THRESHOLDS — v3: Lowered across all chains, new chains added
// ═══════════════════════════════════════════════════════════════════════════════

const THRESHOLD = {
  btc:    100_000,
  eth:    75_000,
  erc20:  75_000,
  sol:    50_000,
  spl:    50_000,
  trx:    75_000,
  trc20:  75_000,
  sui:    75_000,
  sei:    75_000,
  l2:     75_000,
  xrp:    100_000,
  near:   75_000,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT ADDRESSES
// ═══════════════════════════════════════════════════════════════════════════════

const USDT_ETH = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ETH = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const WBTC_ETH = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const USDC_SOL = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_SOL = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const USDT_TRON = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_USDT = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2';
const ARB_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ARB_USDT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';
const POLY_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const POLY_USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const BSC_USDT = '0x55d398326f99059fF775485246999027B3197955';
const BSC_USDC = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
const OP_USDC = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';
const OP_USDT = '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58';
const AVAX_USDC = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';
const AVAX_USDT = '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7';

// API base URLs
const BASESCAN_API = 'https://api.basescan.org/api';
const ARBISCAN_API = 'https://api.arbiscan.io/api';
const POLYSCAN_API = 'https://api.polygonscan.com/api';
const BSCSCAN_API = 'https://api.bscscan.com/api';
const OPSCAN_API = 'https://api-optimistic.etherscan.io/api';
const SNOWTRACE_API = 'https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/api';

// ═══════════════════════════════════════════════════════════════════════════════
// XRP LEDGER EXCHANGE WALLETS — top known hot wallets (account_tx is per-account,
// so unlike Solana this chain still requires a wallet list). Sourced from the
// XRPSCAN well-known names registry (api.xrpscan.com/api/v1/names/well-known).
// ═══════════════════════════════════════════════════════════════════════════════

const XRP_EXCHANGE_WALLETS = [
  'rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh', // Binance
  'rJb5KsHsDHF1YS5B5DU6QCkH5NsPaKQTcy', // Binance
  'rJpj1Mv21gJzsbsVnkp1U4nqchZbmZ9pM5', // Binance
  'rNxp4h8apvRis6mJf9Sh8C6iRxfrDWN7AV', // Binance
  'rEy8TFcrAPvhpKrwyrscNYyqBGUkE9hKaJ', // Binance
  'rLNaPoKeeBjZe2qs6x52yVPZpZ8td4dc6w', // Coinbase
  'rw2ciyaNshpHe7bCHo4bRWq6pqqynnWKQg', // Coinbase
  'rJUkgjvo3P7qXw8nh6ctHJfGwEoBrRyqhx', // Coinbase
  'rGoZhmTeMo4Ew7aKQyJaHCA4LbcDo83fRK', // Coinbase
  'rscyTNHsx52vxVVNb3CvCFyRQMfLtEPYRt', // Coinbase
  'rLHzPsX6oXkzU2qL12kHCH8G8cnZv1rBJh', // Kraken
  'rUeDDFNp2q7Ymvyv75hFGC8DAcygVyJbNF', // Kraken
  'rGZjPjMkfhAqmc1ssEiT753uAgyftHRo2m', // Kraken
  'rp7TCczQuQo61dUo1oAgwdpRxLrA8vDaNV', // Kraken
  'rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv', // Bitstamp
  'rUobSiUpYH2S97Mgb4E7b7HuzQj2uzZ3aD', // Bitstamp
  'rGFuMiw48HdbnrUbkRYuitXTmfrDBNTCnX', // Bitstamp
  'rBMFF7vhe2pxYS5wo3dpXMDrbbRudB7hGf', // Bitstamp
  'rLW9gnQo7BQhU6igk5keqYnH3TVrCxGRzm', // Bitfinex
  'rE3hWEGquaixF2XwirNbA1ds4m55LxNZPk', // Bitfinex
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function nowISO(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// Chain-aware canonical address form (migration 003 keeps zero-mutation reads
// via LOWER() expression indexes — this function only governs what we WRITE):
//   - LOWERCASE for case-insensitive domains: all EVM chains and Bitcoin
//     bech32/bech32m ('bc1…' — lowercase-only per BIP-173).
//   - PRESERVED for case-significant encodings: Solana, Tron, NEAR, Sui, XRP
//     and BTC legacy base58 ('1…', '3…'). Lowercasing base58 corrupts the
//     address and breaks explorer links — do NOT "simplify" this.
const EVM_CHAINS = new Set(['Ethereum', 'Base', 'Arbitrum', 'Polygon', 'BSC', 'Optimism', 'Avalanche']);
function normalizeAddress(chain: string, addr: string | null | undefined): string {
  const a = (addr || '').trim();
  if (!a) return '';
  if (chain === 'Bitcoin') return a.startsWith('bc1') ? a.toLowerCase() : a;
  if (EVM_CHAINS.has(chain)) return a.toLowerCase();
  if (chain === 'Sei' && a.startsWith('0x')) return a.toLowerCase(); // Sei EVM side
  return a; // Solana / Tron / NEAR / Sui / XRP: preserve original casing
}

async function fetchJSON(url: string, opts?: RequestInit & { timeout?: number }): Promise<unknown> {
  const controller = new AbortController();
  const timeout = opts?.timeout ?? 15_000;
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: { 'User-Agent': 'NOVRIX-Tracker/2.0', ...(opts?.headers ?? {}) },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
    return resp.json();
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function asApiRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function asApiRecords(value: unknown): ApiRecord[] {
  return Array.isArray(value) ? value as ApiRecord[] : [];
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value || 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY LABEL MAP — PHASE 4: loaded once per run from D1
// ═══════════════════════════════════════════════════════════════════════════════

let LABEL_MAP: Map<string, KnownAddr> | null = null;

async function loadLabelMap(db: D1Database): Promise<Map<string, KnownAddr>> {
  if (LABEL_MAP) return LABEL_MAP;
  const map = new Map<string, KnownAddr>();
  try {
    const rows = await db.prepare(
      'SELECT address, label, entity, tags FROM known_addresses WHERE address IS NOT NULL'
    ).all<{ address: string; label: string; entity: string; tags: string }>();

    for (const row of (rows.results ?? [])) {
      const addr = row.address.trim().toLowerCase();
      if (!addr || addr.length < 5) continue;
      map.set(addr, {
        label: row.label || '',
        entity: row.entity || '',
        category: row.tags || '',
      });
    }
    console.log(`[Tracking] Label map loaded: ${map.size} addresses`);
  } catch (e) {
    console.error(`[Tracking] Failed to load label map: ${errorMessage(e)}`);
  }
  LABEL_MAP = map;
  return map;
}

function resolveLabel(address: string): { label: string; entity: string; category: string } {
  if (!LABEL_MAP) return { label: '', entity: '', category: '' };
  const key = address.trim().toLowerCase();
  const entry = LABEL_MAP.get(key);
  return entry ? { label: entry.label, entity: entry.entity, category: entry.category }
               : { label: '', entity: '', category: '' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW CLASSIFICATION — PHASE 4: institutional-grade derivation
// ═══════════════════════════════════════════════════════════════════════════════

// ── Flow classification matrix (evaluated in this exact order) ─────────────
//  1. sender == receiver (case-insensitive)       → 'Self'
//  2. zero address on one side                    → 'Mint' (from 0x0) / 'Burn' (to 0x0)
//  3. miner-labeled address on either side        → 'Miner Movement'
//  4. receiver is known exchange, sender is not   → 'Exchange Inflow'
//  5. sender is known exchange, receiver is not   → 'Exchange Outflow'
//  6. both sides exchange-labeled                 → 'Exchange Transfer'
//  7. both sides whale/fund/corporate/vc labeled  → 'Whale Transfer'
//  8. both sides any known entity (non-exchange)  → 'Whale Transfer'
//  9. otherwise                                   → 'Transfer'
function classifyFlow(
  sender: string,
  receiver: string,
): FlowType {
  // 1. Self-transfer / change-output dominance: same wallet on both sides.
  //    Case-insensitive compare is chain-agnostic: EVM checksums differ only
  //    by case, and a base58 false positive would require an astronomical
  //    collision between two distinct wallets differing only in casing.
  const sNorm = sender.trim().toLowerCase();
  const rNorm = receiver.trim().toLowerCase();
  if (sNorm && sNorm === rNorm) return 'Self';

  const s = resolveLabel(sender);
  const r = resolveLabel(receiver);

  const sCat = s.category.toLowerCase();
  const rCat = r.category.toLowerCase();

  const isExchange = (cat: string) =>
    cat === 'exchange' || cat.startsWith('exchange');
  const isWhale = (cat: string) =>
    cat === 'whale' || cat === 'fund' || cat === 'corporate' || cat === 'vc';
  const isMiner = (cat: string) =>
    cat === 'miner' || cat === 'mining';

  // 2. Mint/Burn: an explicit zero address on one side (token mints/burns).
  //    Empty string is NOT treated as zero — several fetchers leave sender
  //    unknown ('') and those must not become fake mints.
  const ZERO = '0x0000000000000000000000000000000000000000';
  const isZeroAddr = (a: string) => a === ZERO || a === '0000000000000000000000000000000000000000';
  if (isZeroAddr(sender)) return 'Mint';
  if (isZeroAddr(receiver)) return 'Burn';

  // Miner movement
  if (isMiner(sCat) || isMiner(rCat)) return 'Miner Movement';

  // Exchange flows
  if (isExchange(sCat) && !isExchange(rCat) && rCat !== 'exchange') return 'Exchange Outflow';
  if (!isExchange(sCat) && isExchange(rCat)) return 'Exchange Inflow';
  if (isExchange(sCat) && isExchange(rCat)) return 'Exchange Transfer';

  // Whale-to-whale
  if (isWhale(sCat) && isWhale(rCat)) return 'Whale Transfer';

  // Known entity to known entity (non-exchange)
  if (s.entity && r.entity) return 'Whale Transfer';

  return 'Transfer';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CURSOR MANAGEMENT — PHASE 5: per-chain cursor tracking
// ═══════════════════════════════════════════════════════════════════════════════

async function ensureCronStateTable(db: D1Database): Promise<void> {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS cron_state (
        chain TEXT NOT NULL,
        source TEXT NOT NULL,
        cursor_value TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (chain, source)
      )
    `).run();
  } catch { /* table exists */ }
}

async function getCursor(db: D1Database, chain: string, source: string): Promise<string> {
  try {
    const row = await db.prepare(
      'SELECT cursor_value FROM cron_state WHERE chain = ? AND source = ?'
    ).bind(chain, source).first<{ cursor_value: string }>();
    return row?.cursor_value ?? '';
  } catch {
    return '';
  }
}

async function setCursor(db: D1Database, chain: string, source: string, value: string): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO cron_state (chain, source, cursor_value, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(chain, source) DO UPDATE SET
         cursor_value = excluded.cursor_value,
         updated_at = datetime('now')`
    ).bind(chain, source, value).run();
  } catch (e) {
    console.error(`[Tracking] Failed to set cursor ${chain}/${source}: ${errorMessage(e)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICE FETCHING — Binance primary, CoinGecko fallback
// ═══════════════════════════════════════════════════════════════════════════════

interface Prices {
  bitcoin: number;
  ethereum: number;
  solana: number;
  tron: number;
  sui: number;
  sei: number;
  xrp: number;
  near: number;
  pol: number;
  bnb: number;
  avax: number;
}

const PRICE_FIELDS: (keyof Prices)[] =
  ['bitcoin', 'ethereum', 'solana', 'tron', 'sui', 'sei', 'xrp', 'near', 'pol', 'bnb', 'avax'];

// Approximate floor prices, set from live market data on 2026-07-28 (not the
// figures originally proposed for this fallback — several of those were 2-6x
// off from the live market at the time, e.g. SUI/POL/AVAX/NEAR, which would
// have meaningfully mis-priced whale-threshold checks). Used only when every
// live source and the D1 price cache have failed for a given asset. Refresh
// periodically — these will drift.
const FALLBACK_PRICES: Prices = {
  bitcoin: 63_000, ethereum: 1_900, solana: 75, tron: 0.32, sui: 0.68,
  sei: 0.045, xrp: 1.05, near: 1.7, pol: 0.075, bnb: 565, avax: 6.5,
};

// 1a. Kraken — public ticker, no auth, not blocked for Cloudflare egress.
// Only covers these 5 assets; Kraken remaps the requested pair names in its
// response (XBTUSD -> XXBTZUSD, ETHUSD -> XETHZUSD; the rest pass through).
async function fetchKrakenPrices(): Promise<Partial<Prices>> {
  const out: Partial<Prices> = {};
  try {
    const data = await fetchJSON(
      'https://api.kraken.com/0/public/Ticker?pair=XBTUSD,ETHUSD,SOLUSD,TRXUSD,SUIUSD',
      { timeout: 10_000 }
    );
    const result = asApiRecord(asApiRecord(data).result);
    const pairMap: Record<string, keyof Prices> = {
      XXBTZUSD: 'bitcoin', XETHZUSD: 'ethereum', SOLUSD: 'solana', TRXUSD: 'tron', SUIUSD: 'sui',
    };
    for (const [pairKey, field] of Object.entries(pairMap)) {
      const closeArr = asApiRecord(result[pairKey]).c as unknown[] | undefined;
      const price = Array.isArray(closeArr) ? parseFloat(asString(closeArr[0])) : 0;
      if (price > 0) out[field] = price;
    }
  } catch (e) {
    console.error(`[Tracking] Kraken price fetch failed: ${errorMessage(e)}`);
  }
  return out;
}

// 1b. Coinbase spot price — public, no auth. One call per asset, but only
// called for assets still missing after Kraken. Used in place of CoinCap:
// api.coincap.io no longer resolves — its free v2 API was discontinued —
// so it can't serve as a fallback source at all.
const COINBASE_PAIRS: { pair: string; field: keyof Prices }[] = [
  { pair: 'BTC-USD', field: 'bitcoin' }, { pair: 'ETH-USD', field: 'ethereum' },
  { pair: 'SOL-USD', field: 'solana' }, { pair: 'TRX-USD', field: 'tron' },
  { pair: 'SUI-USD', field: 'sui' }, { pair: 'SEI-USD', field: 'sei' },
  { pair: 'XRP-USD', field: 'xrp' }, { pair: 'NEAR-USD', field: 'near' },
  { pair: 'POL-USD', field: 'pol' }, { pair: 'BNB-USD', field: 'bnb' },
  { pair: 'AVAX-USD', field: 'avax' },
];

async function fetchCoinbasePrices(missing: Set<keyof Prices>): Promise<Partial<Prices>> {
  const out: Partial<Prices> = {};
  for (const { pair, field } of COINBASE_PAIRS) {
    if (!missing.has(field)) continue;
    try {
      const data = await fetchJSON(`https://api.coinbase.com/v2/prices/${pair}/spot`, { timeout: 8_000 });
      const price = parseFloat(asString(asApiRecord(asApiRecord(data).data).amount));
      if (price > 0) out[field] = price;
    } catch (e) {
      console.error(`[Tracking] Coinbase price fetch failed for ${pair}: ${errorMessage(e)}`);
    }
    await sleep(120);
  }
  return out;
}

// 1c. CoinGecko — last-resort live source. Retries once after a 2s backoff
// on 429 (free-tier rate limit) before giving up.
async function fetchCoinGeckoPrices(missing: Set<keyof Prices>): Promise<Partial<Prices>> {
  const out: Partial<Prices> = {};
  if (missing.size === 0) return out;

  const idMap: Record<string, keyof Prices> = {
    bitcoin: 'bitcoin', ethereum: 'ethereum', solana: 'solana', tron: 'tron', sui: 'sui',
    'sei-network': 'sei', ripple: 'xrp', near: 'near',
    'polygon-ecosystem-token': 'pol', binancecoin: 'bnb', 'avalanche-2': 'avax',
  };
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${Object.keys(idMap).join(',')}&vs_currencies=usd`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'NOVRIX-Tracker/2.0' },
        signal: AbortSignal.timeout(10_000),
      });
      if (resp.status === 429) {
        console.error(`[Tracking] CoinGecko rate limited (429), attempt ${attempt}/2`);
        if (attempt === 1) { await sleep(2_000); continue; }
        return out;
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json() as Record<string, { usd?: number }>;
      for (const [id, field] of Object.entries(idMap)) {
        const price = data?.[id]?.usd;
        if (typeof price === 'number' && price > 0) out[field] = price;
      }
      return out;
    } catch (e) {
      console.error(`[Tracking] CoinGecko price fetch failed: ${errorMessage(e)}`);
      return out;
    }
  }
  return out;
}

// 1d. Price cache — persisted in cron_state (chain='prices', source='cache')
// via the same setCursor upsert used for per-chain ingestion cursors.
async function readCachedPrices(db: D1Database): Promise<Partial<Prices>> {
  try {
    const row = await db.prepare(
      `SELECT cursor_value FROM cron_state WHERE chain = 'prices' AND source = 'cache'`
    ).first<{ cursor_value: string }>();
    if (!row?.cursor_value) return {};
    return JSON.parse(row.cursor_value) as Partial<Prices>;
  } catch (e) {
    console.error(`[Tracking] Failed to read cached prices: ${errorMessage(e)}`);
    return {};
  }
}

async function fetchPrices(db: D1Database): Promise<Prices> {
  const live: Partial<Prices> = await fetchKrakenPrices();

  const missingAfterKraken = new Set(PRICE_FIELDS.filter(f => !(live[f] && live[f]! > 0)));
  if (missingAfterKraken.size > 0) {
    Object.assign(live, await fetchCoinbasePrices(missingAfterKraken));
  }

  const missingAfterCoinbase = new Set(PRICE_FIELDS.filter(f => !(live[f] && live[f]! > 0)));
  if (missingAfterCoinbase.size > 0) {
    Object.assign(live, await fetchCoinGeckoPrices(missingAfterCoinbase));
  }

  // Merge this run's live prices on top of the existing cache (a field that
  // failed this run keeps its last known good cached value) and persist.
  const cached = await readCachedPrices(db);
  const merged: Partial<Prices> = { ...cached, ...live };
  if (Object.keys(live).length > 0) {
    await setCursor(db, 'prices', 'cache', JSON.stringify(merged));
  }

  const result = {} as Prices;
  for (const field of PRICE_FIELDS) {
    const liveVal = live[field];
    if (liveVal && liveVal > 0) {
      result[field] = liveVal;
      continue;
    }
    const cachedVal = cached[field];
    if (cachedVal && cachedVal > 0) {
      console.error(`[Tracking] No live price for ${field} — using cached value ${cachedVal}`);
      result[field] = cachedVal;
      continue;
    }
    console.error(`[Tracking] No live or cached price for ${field} — using hardcoded fallback ${FALLBACK_PRICES[field]}`);
    result[field] = FALLBACK_PRICES[field];
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BITCOIN SOURCES — PHASE 3: multi-source with fallbacks
// ═══════════════════════════════════════════════════════════════════════════════

// 3a. blockchain.info unconfirmed (mempool)
async function fetchBtcBlockchainInfoPending(btcPrice: number): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  try {
    const data = await fetchJSON('https://blockchain.info/unconfirmed-transactions?format=json', { timeout: 10_000 });
    const txs = asApiRecords(asApiRecord(data).txs);
    for (const tx of txs) {
      const inputs = asApiRecords(tx.inputs) as Array<{ prev_out?: { addr?: string; value?: number } }>;
      const outputs = asApiRecords(tx.out) as Array<{ addr?: string; value?: number }>;

      const totalOut = outputs.reduce((s, o) => s + (o.value ?? 0), 0);
      const amountBTC = totalOut / 1e8;
      const amountUSD = amountBTC * btcPrice;
      if (amountUSD < THRESHOLD.btc) continue;

      const sender = (inputs[0]?.prev_out?.addr ?? '').trim();
      const sortedOuts = [...outputs].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
      const receiver = (sortedOuts[0]?.addr ?? '').trim();

      const now = nowISO();
      results.push({
        signature: asString(tx.hash),
        amount_usd: Math.round(amountUSD * 100) / 100,
        amount_native: Math.round(amountBTC * 1e8) / 1e8,
        flow_type: classifyFlow(sender, receiver),
        sender, receiver,
        sender_label: resolveLabel(sender).label,
        receiver_label: resolveLabel(receiver).label,
        timestamp: now,
        blockchain: 'Bitcoin',
        token: 'BTC',
        token_name: 'Bitcoin',
        source: 'blockchain.info',
        block_height: 0,
        is_pending: 1,
        transaction_type: 'transfer',
      });
    }
  } catch (e) {
    console.error(`[BTC/Blockchain.info] Pending fetch error: ${errorMessage(e)}`);
  }
  return results;
}

// 3b. blockchain.info raw blocks — process recent confirmed blocks
async function fetchBtcBlockchainInfoBlocks(btcPrice: number): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  try {
    const latest = await fetchJSON('https://blockchain.info/latestblock', { timeout: 10_000 });
    const startHash = asString(asApiRecord(latest).hash);
    if (!startHash) return results;

    const seenHashes = new Set<string>();
    let currentHash = startHash;

    for (let blockNum = 0; blockNum < 3 && currentHash; blockNum++) {
      try {
        const block = await fetchJSON(`https://blockchain.info/rawblock/${currentHash}`, { timeout: 15_000 });
        const blockRec = asApiRecord(block);
        const txs = asApiRecords(blockRec.tx);

        for (const tx of txs) {
          const txHash = asString(tx.hash);
          if (seenHashes.has(txHash)) continue;
          seenHashes.add(txHash);

          const outputs = asApiRecords(tx.out) as Array<{ addr?: string; value?: number }>;
          const totalOut = outputs.reduce((s, o) => s + (o.value ?? 0), 0);
          const amountBTC = totalOut / 1e8;
          const amountUSD = amountBTC * btcPrice;
          if (amountUSD < THRESHOLD.btc) continue;

          const inputs = asApiRecords(tx.inputs) as Array<{ prev_out?: { addr?: string } }>;
          const sender = (inputs[0]?.prev_out?.addr ?? '').trim();
          const sortedOuts = [...outputs].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
          const receiver = (sortedOuts[0]?.addr ?? '').trim();

          const timestamp = asNumber(tx.time) > 0
            ? new Date(asNumber(tx.time) * 1000).toISOString().replace('T', ' ').slice(0, 19)
            : nowISO();

          results.push({
            signature: txHash,
            amount_usd: Math.round(amountUSD * 100) / 100,
            amount_native: Math.round(amountBTC * 1e8) / 1e8,
            flow_type: classifyFlow(sender, receiver),
            sender, receiver,
            sender_label: resolveLabel(sender).label,
            receiver_label: resolveLabel(receiver).label,
            timestamp,
            blockchain: 'Bitcoin',
            token: 'BTC',
            token_name: 'Bitcoin',
            source: 'blockchain.info',
            block_height: asNumber(blockRec.height),
            is_pending: 0,
            transaction_type: 'transfer',
          });
        }
        currentHash = asString(blockRec.prev_block);
      } catch {
        break;
      }
      if (blockNum < 2) await sleep(200);
    }
  } catch (e) {
    console.error(`[BTC/Blockchain.info] Block scan error: ${errorMessage(e)}`);
  }
  return results;
}

// 3c. Blockstream — latest block full scan (4 batches of 25)
async function fetchBtcBlockstream(btcPrice: number): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  try {
    const tipResp = await fetch('https://blockstream.info/api/blocks/tip/hash', {
      headers: { 'User-Agent': 'NOVRIX-Tracker/2.0' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!tipResp.ok) throw new Error(`Tip hash HTTP ${tipResp.status}`);
    const tipHash = (await tipResp.text()).trim();
    if (!tipHash || tipHash.length < 60) throw new Error('Invalid tip hash');

    for (const startIdx of [0, 25, 50, 75, 100, 125, 150, 175]) {
      try {
        const txs = await fetchJSON(`https://blockstream.info/api/block/${tipHash}/txs/${startIdx}`);
        if (!Array.isArray(txs)) continue;

        for (const tx of txs as ApiRecord[]) {
          const vout = (asApiRecords(tx.vout) as Array<{ value?: number; scriptpubkey_address?: string }>);
          const totalSats = vout.reduce((s, o) => s + (o.value ?? 0), 0);
          const amountBTC = totalSats / 1e8;
          const amountUSD = amountBTC * btcPrice;
          if (amountUSD < THRESHOLD.btc) continue;

          const vin = asApiRecords(tx.vin);
          const sender = asString(asApiRecord(asApiRecord(vin[0]).prevout).scriptpubkey_address);
          const sortedOuts = [...vout].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
          const receiver = sortedOuts[0]?.scriptpubkey_address ?? '';

          const blockTime = asNumber(asApiRecord(tx.status).block_time);
          const timestamp = blockTime > 0
            ? new Date(blockTime * 1000).toISOString().replace('T', ' ').slice(0, 19)
            : nowISO();

          results.push({
            signature: asString(tx.txid),
            amount_usd: Math.round(amountUSD * 100) / 100,
            amount_native: Math.round(amountBTC * 1e8) / 1e8,
            flow_type: classifyFlow(sender, receiver),
            sender, receiver,
            sender_label: resolveLabel(sender).label,
            receiver_label: resolveLabel(receiver).label,
            timestamp,
            blockchain: 'Bitcoin',
            token: 'BTC',
            token_name: 'Bitcoin',
            source: 'blockstream',
            block_height: 0,
            is_pending: 0,
            transaction_type: 'transfer',
          });
        }
      } catch {
        break;
      }
      await sleep(100);
    }
  } catch (e) {
    console.error(`[BTC/Blockstream] Error: ${errorMessage(e)}`);
  }
  return results;
}

// 3d. Blockchair BTC — server-side filtered
async function fetchBtcBlockchair(btcPrice: number): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  const minSats = Math.floor((THRESHOLD.btc / btcPrice) * 1e8);
  try {
    const data = await fetchJSON(
      `https://api.blockchair.com/bitcoin/transactions?q=output_total(${minSats}..)&s=output_total(desc)&limit=100`,
      { timeout: 12_000 }
    );
    const txs = asApiRecord(data).data as ApiRecord | undefined;
    if (!txs) return results;

    for (const [hash, txData] of Object.entries(txs)) {
      if (hash.length > 70) continue;
      const tx = asApiRecord(txData);
      const totalSats = asNumber(tx.output_total);
      const amountBTC = totalSats / 1e8;
      const amountUSD = amountBTC * btcPrice;
      if (amountUSD < THRESHOLD.btc) continue;

      results.push({
        signature: hash,
        amount_usd: Math.round(amountUSD * 100) / 100,
        amount_native: Math.round(amountBTC * 1e8) / 1e8,
        flow_type: 'Transfer',
        sender: '', receiver: '',
        sender_label: '', receiver_label: '',
        timestamp: asString(tx.time) || nowISO(),
        blockchain: 'Bitcoin',
        token: 'BTC',
        token_name: 'Bitcoin',
        source: 'blockchair',
        block_height: asNumber(tx.block_id),
        is_pending: 0,
        transaction_type: 'transfer',
      });
    }
  } catch (e) {
    console.error(`[BTC/Blockchair] Error: ${errorMessage(e)}`);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ETHEREUM SOURCES
// ═══════════════════════════════════════════════════════════════════════════════

let ETHERSCAN_KEY = '';
let ETHSCAN_LAST_CALL = 0;

async function etherscanWait(): Promise<void> {
  const elapsed = Date.now() - ETHSCAN_LAST_CALL;
  if (elapsed < 260) await sleep(260 - elapsed);
  ETHSCAN_LAST_CALL = Date.now();
}

// 4a. Etherscan proxy: eth_getBlockByNumber — scan recent blocks fully
async function fetchEthBlockScan(ethPrice: number): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  if (!ETHERSCAN_KEY) return results;

  try {
    const keyParam = `&apikey=${ETHERSCAN_KEY}`;
    await etherscanWait();
    const bnData = await fetchJSON(
      `https://api.etherscan.io/api?module=proxy&action=eth_blockNumber${keyParam}`,
      { timeout: 8_000 }
    );
    const latestHex = asString(asApiRecord(bnData).result);
    const latestBlock = parseInt(latestHex, 16);
    if (!latestBlock) return results;

    const BLOCKS_TO_SCAN = 5;
    for (let bn = latestBlock; bn > latestBlock - BLOCKS_TO_SCAN && bn > 0; bn--) {
      try {
        await etherscanWait();
        const blockData = await fetchJSON(
          `https://api.etherscan.io/api?module=proxy&action=eth_getBlockByNumber&tag=0x${bn.toString(16)}&boolean=true${keyParam}`,
          { timeout: 8_000 }
        );
        const block = asApiRecord(asApiRecord(blockData).result);
        const txs = asApiRecords(block.transactions);
        const blockTimestamp = asString(block.timestamp);
        const timestamp = blockTimestamp
          ? new Date(parseInt(blockTimestamp, 16) * 1000).toISOString().replace('T', ' ').slice(0, 19)
          : nowISO();

        for (const tx of txs) {
          const txRec = asApiRecord(tx);
          const valueWei = parseInt(asString(txRec.value), 16);
          if (!valueWei) continue;
          const amountETH = valueWei / 1e18;
          const amountUSD = amountETH * ethPrice;
          if (amountUSD < THRESHOLD.eth) continue;

          const sender = asString(txRec.from).toLowerCase();
          const receiver = asString(txRec.to).toLowerCase();
          if (receiver === '0x0000000000000000000000000000000000000000') continue;

          const hash = asString(txRec.hash);
          if (!hash) continue;

          results.push({
            signature: hash,
            amount_usd: Math.round(amountUSD * 100) / 100,
            amount_native: Math.round(amountETH * 1e6) / 1e6,
            flow_type: classifyFlow(sender, receiver),
            sender, receiver,
            sender_label: resolveLabel(sender).label,
            receiver_label: resolveLabel(receiver).label,
            timestamp,
            blockchain: 'Ethereum',
            token: 'ETH',
            token_name: 'Ethereum',
            source: 'etherscan',
            block_height: bn,
            is_pending: 0,
            transaction_type: 'transfer',
          });
        }
      } catch (e) {
        console.error(`[ETH/BlockScan] Block ${bn} error: ${errorMessage(e)}`);
      }
    }
  } catch (e) {
    console.error(`[ETH/BlockScan] Error: ${errorMessage(e)}`);
  }
  return results;
}

// 4b. Blockchair ETH — server-side filtered
async function fetchEthBlockchair(ethPrice: number): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  try {
    const minWei = BigInt(Math.floor((THRESHOLD.eth / ethPrice) * 1e18));
    const data = await fetchJSON(
      `https://api.blockchair.com/ethereum/transactions?q=value(${minWei.toString()}..)&s=time(desc)&limit=100`,
      { timeout: 12_000 }
    );
    const txs = asApiRecord(data).data as ApiRecord | undefined;
    if (!txs) return results;

    for (const [hash, txData] of Object.entries(txs)) {
      if (hash.length > 70) continue;
      const tx = asApiRecord(txData);
      const valueWei = BigInt(asString(tx.value) || '0');
      const amountETH = Number(valueWei) / 1e18;
      const amountUSD = amountETH * ethPrice;
      if (amountUSD < THRESHOLD.eth) continue;

      const sender = asString(tx.sender).toLowerCase();
      const receiver = asString(tx.recipient).toLowerCase();

      results.push({
        signature: hash,
        amount_usd: Math.round(amountUSD * 100) / 100,
        amount_native: Math.round(amountETH * 1e6) / 1e6,
        flow_type: classifyFlow(sender, receiver),
        sender, receiver,
        sender_label: resolveLabel(sender).label,
        receiver_label: resolveLabel(receiver).label,
        timestamp: asString(tx.time),
        blockchain: 'Ethereum',
        token: 'ETH',
        token_name: 'Ethereum',
        source: 'blockchair',
        block_height: 0,
        is_pending: 0,
        transaction_type: 'transfer',
      });
    }
  } catch (e) {
    console.error(`[ETH/Blockchair] Error: ${errorMessage(e)}`);
  }
  return results;
}

// 4c. ERC-20 token transfers via Etherscan
async function fetchErc20Whales(
  contractAddress: string,
  tokenSymbol: string,
  tokenName: string,
  decimals: number,
  tokenPrice: number,
  minUSD: number,
): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  try {
    if (!ETHERSCAN_KEY) return results;
    await etherscanWait();
    const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${contractAddress}&page=1&offset=200&sort=desc&apikey=${ETHERSCAN_KEY}`;
    const data = await fetchJSON(url, { timeout: 12_000 });
    const txs = asApiRecords(asApiRecord(data).result);

    for (const tx of txs) {
      const txRec = asApiRecord(tx);
      const rawValue = BigInt(asString(txRec.value) || '0');
      const amountNative = Number(rawValue) / Math.pow(10, decimals);
      const amountUSD = amountNative * tokenPrice;
      if (amountUSD < minUSD) continue;

      const sender = asString(txRec.from).toLowerCase();
      const receiver = asString(txRec.to).toLowerCase();
      if (sender === receiver) continue;
      if (receiver === '0x0000000000000000000000000000000000000000') continue;
      if (sender === '0x0000000000000000000000000000000000000000') continue;

      const timestamp = new Date(asNumber(txRec.timeStamp) * 1000)
        .toISOString().replace('T', ' ').slice(0, 19);

      results.push({
        signature: asString(txRec.hash),
        amount_usd: Math.round(amountUSD * 100) / 100,
        amount_native: Math.round(amountNative * 100) / 100,
        flow_type: classifyFlow(sender, receiver),
        sender, receiver,
        sender_label: resolveLabel(sender).label,
        receiver_label: resolveLabel(receiver).label,
        timestamp,
        blockchain: 'Ethereum',
        token: tokenSymbol,
        token_name: tokenName,
        source: 'etherscan',
        block_height: 0,
        is_pending: 0,
        transaction_type: 'transfer',
      });
    }
  } catch (e) {
    console.error(`[ETH/${tokenSymbol}] Etherscan error: ${errorMessage(e)}`);
  }
  return results;
}

// 4d. L2 token transfers via Etherscan-compatible APIs
async function fetchL2TokenWhales(
  chain: string,
  apiBase: string,
  contractAddress: string,
  tokenSymbol: string,
  tokenName: string,
  decimals: number,
  tokenPrice: number,
  minUSD: number,
  apiKey: string,
): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  try {
    const url = `${apiBase}?module=account&action=tokentx&contractaddress=${contractAddress}&page=1&offset=200&sort=desc&apikey=${apiKey}`;
    await sleep(250);
    const data = await fetchJSON(url, { timeout: 12_000 });
    const txs = asApiRecords(asApiRecord(data).result);

    for (const tx of txs) {
      const txRec = asApiRecord(tx);
      const rawValue = BigInt(asString(txRec.value) || '0');
      const amountNative = Number(rawValue) / Math.pow(10, decimals);
      const amountUSD = amountNative * tokenPrice;
      if (amountUSD < minUSD) continue;

      const sender = asString(txRec.from).toLowerCase();
      const receiver = asString(txRec.to).toLowerCase();
      if (amountUSD === 0) continue;
      if (sender === receiver) continue;
      if (receiver === '0x0000000000000000000000000000000000000000') continue;
      if (sender === '0x0000000000000000000000000000000000000000') continue;

      const timestamp = new Date(asNumber(txRec.timeStamp) * 1000)
        .toISOString().replace('T', ' ').slice(0, 19);

      results.push({
        signature: asString(txRec.hash),
        amount_usd: Math.round(amountUSD * 100) / 100,
        amount_native: Math.round(amountNative * 100) / 100,
        flow_type: classifyFlow(sender, receiver),
        sender, receiver,
        sender_label: resolveLabel(sender).label,
        receiver_label: resolveLabel(receiver).label,
        timestamp,
        blockchain: chain,
        token: tokenSymbol,
        token_name: tokenName,
        source: l2ApiSource(apiBase),
        block_height: 0,
        is_pending: 0,
        transaction_type: 'transfer',
      });
    }
  } catch (e) {
    console.error(`[${chain}/${tokenSymbol}] L2 scan error: ${errorMessage(e)}`);
  }
  return results;
}

async function fetchAllL2ChainWhales(
  chain: string,
  apiBase: string,
  tokens: { contract: string; symbol: string; name: string; decimals: number; price: number }[],
  minUSD: number,
  apiKey: string,
): Promise<WhaleTransaction[]> {
  const all: WhaleTransaction[] = [];
  for (const tok of tokens) {
    const txs = await fetchL2TokenWhales(chain, apiBase, tok.contract, tok.symbol, tok.name, tok.decimals, tok.price, minUSD, apiKey);
    all.push(...txs);
  }
  return all;
}

// 4e. L2 native gas-token transfers via eth_getBlockByNumber — each chain's own
// native currency (ETH for OP-stack L2s, POL/BNB/AVAX for the sidechains), never
// mislabeled as ETH.
function l2ApiSource(apiBase: string): string {
  return apiBase.includes('basescan') ? 'basescan'
       : apiBase.includes('arbiscan') ? 'arbiscan'
       : apiBase.includes('polygonscan') ? 'polygonscan'
       : apiBase.includes('bscscan') ? 'bscscan'
       : apiBase.includes('optimistic') ? 'optimistic-etherscan'
       : apiBase.includes('snowtrace') || apiBase.includes('routescan') ? 'snowtrace'
       : 'unknown';
}

async function fetchL2NativeWhales(
  chain: string,
  apiBase: string,
  tokenSymbol: string,
  tokenName: string,
  tokenPrice: number,
  minUSD: number,
  apiKey: string,
): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  if (tokenPrice <= 0) return results;

  try {
    const bnData = await fetchJSON(`${apiBase}?module=proxy&action=eth_blockNumber&apikey=${apiKey}`, { timeout: 8_000 });
    const latestHex = asString(asApiRecord(bnData).result);
    const latestBlock = parseInt(latestHex, 16);
    if (!latestBlock) return results;

    const BLOCKS_TO_SCAN = 5;
    for (let bn = latestBlock; bn > latestBlock - BLOCKS_TO_SCAN && bn > 0; bn--) {
      try {
        await sleep(250);
        const blockData = await fetchJSON(
          `${apiBase}?module=proxy&action=eth_getBlockByNumber&tag=0x${bn.toString(16)}&boolean=true&apikey=${apiKey}`,
          { timeout: 10_000 }
        );
        const block = asApiRecord(asApiRecord(blockData).result);
        const txs = asApiRecords(block.transactions);
        const blockTimestamp = asString(block.timestamp);
        const timestamp = blockTimestamp
          ? new Date(parseInt(blockTimestamp, 16) * 1000).toISOString().replace('T', ' ').slice(0, 19)
          : nowISO();

        for (const tx of txs) {
          const txRec = asApiRecord(tx);
          const valueWei = parseInt(asString(txRec.value), 16);
          if (!valueWei) continue;
          const amountNative = valueWei / 1e18;
          const amountUSD = amountNative * tokenPrice;
          if (amountUSD < minUSD) continue;

          const sender = asString(txRec.from).toLowerCase();
          const receiver = asString(txRec.to).toLowerCase();
          if (receiver === '0x0000000000000000000000000000000000000000') continue;

          const hash = asString(txRec.hash);
          if (!hash) continue;

          results.push({
            signature: hash,
            amount_usd: Math.round(amountUSD * 100) / 100,
            amount_native: Math.round(amountNative * 1e6) / 1e6,
            flow_type: classifyFlow(sender, receiver),
            sender, receiver,
            sender_label: resolveLabel(sender).label,
            receiver_label: resolveLabel(receiver).label,
            timestamp,
            blockchain: chain,
            token: tokenSymbol,
            token_name: tokenName,
            source: l2ApiSource(apiBase),
            block_height: bn,
            is_pending: 0,
            transaction_type: 'transfer',
          });
        }
      } catch (e) {
        console.error(`[${chain}/${tokenSymbol}] Native block ${bn} error: ${errorMessage(e)}`);
      }
    }
  } catch (e) {
    console.error(`[${chain}/${tokenSymbol}] Native block scan error: ${errorMessage(e)}`);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOLANA SOURCES — v3: block-centric scan via Helius getBlock (all transfers,
// not just known wallets) + Helius enhanced-API SPL scan
// ═══════════════════════════════════════════════════════════════════════════════

interface SolTokenBalance {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount?: { uiAmount?: number | null };
}

async function fetchSolWhalesBlocks(solPrice: number, heliusKey: string): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  if (!heliusKey) return results;

  const RPC = `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
  const SLOTS_TO_SCAN = 5;
  const KNOWN_SPL_MINTS: Record<string, { symbol: string; name: string }> = {
    [USDC_SOL]: { symbol: 'USDC', name: 'USD Coin' },
    [USDT_SOL]: { symbol: 'USDT', name: 'Tether USD' },
  };

  const rpcCall = async (method: string, params: unknown[]): Promise<ApiRecord> => {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(15_000),
    });
    return await res.json() as ApiRecord;
  };

  try {
    const slotData = await rpcCall('getSlot', [{ commitment: 'confirmed' }]);
    const latestSlot = asNumber(slotData.result);
    if (!latestSlot) return results;

    for (let slot = latestSlot; slot > latestSlot - SLOTS_TO_SCAN && slot > 0; slot--) {
      try {
        await sleep(200);
        const blockData = await rpcCall('getBlock', [slot, {
          encoding: 'jsonParsed',
          transactionDetails: 'full',
          maxSupportedTransactionVersion: 0,
          rewards: false,
          commitment: 'confirmed',
        }]);
        const block = asApiRecord(blockData.result);
        const txs = asApiRecords(block.transactions);
        const blockTime = asNumber(block.blockTime);
        const timestamp = blockTime > 0
          ? new Date(blockTime * 1000).toISOString().replace('T', ' ').slice(0, 19)
          : nowISO();

        for (const txEntry of txs) {
          const txEntryRec = asApiRecord(txEntry);
          const meta = asApiRecord(txEntryRec.meta);
          if (meta.err) continue;

          const transaction = asApiRecord(txEntryRec.transaction);
          const signatures = transaction.signatures as string[] | undefined;
          const signature = signatures?.[0] ?? '';
          if (!signature) continue;

          const accountKeys = asApiRecords(asApiRecord(transaction.message).accountKeys) as Array<{ pubkey?: string } | string>;
          const resolveAcct = (raw: unknown): string =>
            typeof raw === 'string' ? raw : asString(asApiRecord(raw).pubkey);

          // Native SOL — largest balance-change pair in the transaction
          const pre = (meta.preBalances ?? []) as number[];
          const post = (meta.postBalances ?? []) as number[];
          let maxChange = 0;
          let senderAddr = '';
          let receiverAddr = '';
          for (let i = 0; i < pre.length; i++) {
            const diff = (post[i] ?? 0) - (pre[i] ?? 0);
            const absDiff = Math.abs(diff);
            if (absDiff > maxChange) {
              maxChange = absDiff;
              const acct = resolveAcct(accountKeys[i]);
              if (diff < 0) senderAddr = acct; else receiverAddr = acct;
            }
          }
          const amountSOL = maxChange / 1e9;
          const amountUSD = amountSOL * solPrice;
          if (amountUSD >= THRESHOLD.sol && senderAddr && receiverAddr) {
            results.push({
              signature,
              amount_usd: Math.round(amountUSD * 100) / 100,
              amount_native: Math.round(amountSOL * 1e4) / 1e4,
              flow_type: classifyFlow(senderAddr, receiverAddr),
              sender: senderAddr,
              receiver: receiverAddr,
              sender_label: resolveLabel(senderAddr).label,
              receiver_label: resolveLabel(receiverAddr).label,
              timestamp,
              blockchain: 'Solana',
              token: 'SOL',
              token_name: 'Solana',
              source: 'helius_block',
              block_height: slot,
              is_pending: 0,
              transaction_type: 'transfer',
            });
          }

          // Known-mint SPL transfers — largest owner balance-change pair per mint
          // preTokenBalances/postTokenBalances always carry accountIndex+mint per the
          // Solana jsonParsed encoding spec; ApiRecord's index signature doesn't
          // structurally imply that, so narrow through unknown.
          const preTokenBalances = asApiRecords(meta.preTokenBalances) as unknown as SolTokenBalance[];
          const postTokenBalances = asApiRecords(meta.postTokenBalances) as unknown as SolTokenBalance[];
          const mintsInTx = new Set(
            [...preTokenBalances, ...postTokenBalances]
              .map(b => b.mint)
              .filter(mint => mint in KNOWN_SPL_MINTS)
          );

          for (const mint of mintsInTx) {
            const { symbol: tokenSymbol, name: tokenName } = KNOWN_SPL_MINTS[mint];
            const indices = new Set([
              ...preTokenBalances.filter(b => b.mint === mint).map(b => b.accountIndex),
              ...postTokenBalances.filter(b => b.mint === mint).map(b => b.accountIndex),
            ]);

            let maxPos = 0, maxNeg = 0;
            let senderOwner = '', receiverOwner = '';
            for (const idx of indices) {
              const preBal = preTokenBalances.find(b => b.accountIndex === idx && b.mint === mint);
              const postBal = postTokenBalances.find(b => b.accountIndex === idx && b.mint === mint);
              const preAmt = preBal?.uiTokenAmount?.uiAmount ?? 0;
              const postAmt = postBal?.uiTokenAmount?.uiAmount ?? 0;
              const diff = postAmt - preAmt;
              if (diff > maxPos) { maxPos = diff; receiverOwner = asString(postBal?.owner ?? preBal?.owner ?? ''); }
              if (-diff > maxNeg) { maxNeg = -diff; senderOwner = asString(preBal?.owner ?? postBal?.owner ?? ''); }
            }

            const amountNative = Math.max(maxPos, maxNeg);
            const amountTokenUSD = amountNative; // stablecoins only, price 1.0
            if (amountTokenUSD < THRESHOLD.spl) continue;
            if (!senderOwner && !receiverOwner) continue;

            results.push({
              signature,
              amount_usd: Math.round(amountTokenUSD * 100) / 100,
              amount_native: Math.round(amountNative * 100) / 100,
              flow_type: classifyFlow(senderOwner, receiverOwner),
              sender: senderOwner,
              receiver: receiverOwner,
              sender_label: resolveLabel(senderOwner).label,
              receiver_label: resolveLabel(receiverOwner).label,
              timestamp,
              blockchain: 'Solana',
              token: tokenSymbol,
              token_name: tokenName,
              source: 'helius_block',
              block_height: slot,
              is_pending: 0,
              transaction_type: 'transfer',
            });
          }
        }
      } catch (e) {
        console.error(`[SOL/BlockScan] Slot ${slot} error: ${errorMessage(e)}`);
      }
    }
  } catch (e) {
    console.error(`[SOL/BlockScan] Error: ${errorMessage(e)}`);
  }

  return results;
}

async function fetchSolSplWhales(
  heliusKey: string,
  mintAddress: string,
  tokenSymbol: string,
  tokenName: string,
  tokenPrice: number,
): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  const minUSD = THRESHOLD.spl;

  if (heliusKey) {
    try {
      const url = `https://api.helius.xyz/v0/addresses/${mintAddress}/transactions?api-key=${heliusKey}&limit=100&type=TRANSFER`;
      const data = await fetchJSON(url, { timeout: 12_000 });
      if (Array.isArray(data)) {
        for (const tx of data) {
          for (const transfer of (tx.tokenTransfers || [])) {
            if (transfer.mint !== mintAddress) continue;
            const amountNative = transfer.tokenAmount || 0;
            const amountUSD = amountNative * tokenPrice;
            if (amountUSD < minUSD) continue;

            const sender = transfer.fromUserAccount || '';
            const receiver = transfer.toUserAccount || '';
            const timestamp = tx.timestamp
              ? new Date(tx.timestamp * 1000).toISOString().replace('T', ' ').slice(0, 19)
              : nowISO();

            results.push({
              signature: tx.signature || '',
              amount_usd: Math.round(amountUSD * 100) / 100,
              amount_native: Math.round(amountNative * 100) / 100,
              flow_type: classifyFlow(sender, receiver),
              sender, receiver,
              sender_label: resolveLabel(sender).label,
              receiver_label: resolveLabel(receiver).label,
              timestamp,
              blockchain: 'Solana',
              token: tokenSymbol,
              token_name: tokenName,
              source: 'helius',
              block_height: 0,
              is_pending: 0,
              transaction_type: 'transfer',
            });
          }
        }
      }
    } catch (e) {
      console.error(`[SOL/${tokenSymbol}] Helius error: ${errorMessage(e)}`);
    }
  }

  if (results.length < 10) {
    try {
      const solscanUrl = `https://api.solscan.io/transfer/token?token=${mintAddress}&offset=0&limit=100&sort_by=block_time&sort_order=desc`;
      await sleep(1500);
      const data = await fetchJSON(solscanUrl, { headers: { Accept: 'application/json' }, timeout: 10_000 });
      const items = asApiRecords(asApiRecord(asApiRecord(data).data).items);
      for (const item of items) {
        const itemRec = asApiRecord(item);
        const tokenInfo = itemRec.tokenInfo as ApiRecord | undefined;
        const amountNative = (asNumber(itemRec.amount) || 0) / Math.pow(10, tokenInfo?.tokenDecimal as number || 6);
        const amountUSD = amountNative * tokenPrice;
        if (amountUSD < minUSD) continue;

        const sender = asString(itemRec.src_address);
        const receiver = asString(itemRec.dst_address);
        const timestamp = asNumber(itemRec.block_time) > 0
          ? new Date(asNumber(itemRec.block_time) * 1000).toISOString().replace('T', ' ').slice(0, 19)
          : nowISO();

        results.push({
          signature: asString(itemRec.trans_id),
          amount_usd: Math.round(amountUSD * 100) / 100,
          amount_native: Math.round(amountNative * 100) / 100,
          flow_type: classifyFlow(sender, receiver),
          sender, receiver,
          sender_label: resolveLabel(sender).label,
          receiver_label: resolveLabel(receiver).label,
          timestamp,
          blockchain: 'Solana',
          token: tokenSymbol,
          token_name: tokenName,
          source: 'solscan',
          block_height: 0,
          is_pending: 0,
          transaction_type: 'transfer',
        });
      }
    } catch (e) {
      console.error(`[SOL/${tokenSymbol}] Solscan fallback error: ${errorMessage(e)}`);
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRON SOURCES — PHASE 3: /api/transfer + TRC-20 USDT
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchTronTransfers(trxPrice: number): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  try {
    const url = `https://apilist.tronscanapi.com/api/transfer?sort=-timestamp&limit=50&start=0&count=true`;
    const data = await fetchJSON(url, { timeout: 12_000 });
    const transfers = asApiRecords(asApiRecord(data).data);

    for (const transfer of transfers) {
      const tr = asApiRecord(transfer);
      const amountTRX = asNumber(tr.amount) / 1e6;
      const amountUSD = amountTRX * trxPrice;
      if (amountUSD < THRESHOLD.trx) continue;

      const sender = asString(tr.transferFromAddress);
      const receiver = asString(tr.transferToAddress);
      const timestamp = asNumber(tr.timestamp) > 0
        ? new Date(asNumber(tr.timestamp)).toISOString().replace('T', ' ').slice(0, 19)
        : nowISO();

      results.push({
        signature: asString(tr.transactionHash),
        amount_usd: Math.round(amountUSD * 100) / 100,
        amount_native: Math.round(amountTRX * 100) / 100,
        flow_type: classifyFlow(sender, receiver),
        sender, receiver,
        sender_label: resolveLabel(sender).label,
        receiver_label: resolveLabel(receiver).label,
        timestamp,
        blockchain: 'Tron',
        token: 'TRX',
        token_name: 'TRON',
        source: 'tronscan',
        block_height: 0,
        is_pending: 0,
        transaction_type: 'transfer',
      });
    }
  } catch (e) {
    console.error(`[TRX/Transfer] TronScan error: ${errorMessage(e)}`);
  }
  return results;
}

async function fetchTronTrc20Usdt(): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  try {
    const url = `https://apilist.tronscanapi.com/api/filter/trc20/transfers?limit=100&start=0&sort=-timestamp&count=true&contract_address=${USDT_TRON}`;
    const data = await fetchJSON(url, { timeout: 12_000 });
    const transfers = asApiRecords(asApiRecord(data).token_transfers);

    for (const transfer of transfers) {
      const tr = asApiRecord(transfer);
      const decimals = asNumber(asApiRecord(tr.tokenInfo).tokenDecimal) || 6;
      const amountNative = asNumber(tr.quant) / Math.pow(10, decimals);
      const amountUSD = amountNative;
      if (amountUSD < THRESHOLD.trc20) continue;

      const sender = asString(tr.from_address);
      const receiver = asString(tr.to_address);
      const timestamp = asNumber(tr.block_ts) > 0
        ? new Date(asNumber(tr.block_ts)).toISOString().replace('T', ' ').slice(0, 19)
        : nowISO();

      results.push({
        signature: asString(tr.transaction_id),
        amount_usd: Math.round(amountUSD * 100) / 100,
        amount_native: Math.round(amountNative * 100) / 100,
        flow_type: classifyFlow(sender, receiver),
        sender, receiver,
        sender_label: resolveLabel(sender).label,
        receiver_label: resolveLabel(receiver).label,
        timestamp,
        blockchain: 'Tron',
        token: 'USDT',
        token_name: 'Tether USD',
        source: 'tronscan',
        block_height: 0,
        is_pending: 0,
        transaction_type: 'transfer',
      });
    }
  } catch (e) {
    console.error(`[TRX/USDT] TronScan error: ${errorMessage(e)}`);
  }
  return results;
}

async function fetchTronWhales(trxPrice: number): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  try {
    const url = `https://apilist.tronscanapi.com/api/transaction?sort=-timestamp&count=true&limit=100&start=0`;
    const data = await fetchJSON(url, { timeout: 12_000 });
    const txs = asApiRecords(asApiRecord(data).data);

    for (const tx of txs) {
      const txRec = asApiRecord(tx);
      if (txRec.contractType !== 1) continue;
      const amountTRX = asNumber(txRec.amount) / 1e6;
      const amountUSD = amountTRX * trxPrice;
      if (amountUSD < THRESHOLD.trx) continue;

      const sender = asString(txRec.ownerAddress);
      const receiver = asString(txRec.toAddress);
      const timestamp = asNumber(txRec.timestamp) > 0
        ? new Date(asNumber(txRec.timestamp)).toISOString().replace('T', ' ').slice(0, 19)
        : nowISO();

      results.push({
        signature: asString(txRec.hash),
        amount_usd: Math.round(amountUSD * 100) / 100,
        amount_native: Math.round(amountTRX * 100) / 100,
        flow_type: classifyFlow(sender, receiver),
        sender, receiver,
        sender_label: resolveLabel(sender).label,
        receiver_label: resolveLabel(receiver).label,
        timestamp,
        blockchain: 'Tron',
        token: 'TRX',
        token_name: 'TRON',
        source: 'tronscan',
        block_height: 0,
        is_pending: 0,
        transaction_type: 'transfer',
      });
    }
  } catch (e) {
    console.error(`[TRX/Native] TronScan error: ${errorMessage(e)}`);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUI SOURCE
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchSuiWhales(suiPrice: number): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  try {
    const resp = await fetch('https://fullnode.mainnet.sui.io:443', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'suix_queryTransactionBlocks',
        params: [{ options: { showInput: true, showBalanceChanges: true } }, null, 50, true],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = await resp.json() as ApiRecord;
    const data = asApiRecords(asApiRecord(json.result).data);

    for (const txBlock of data) {
      const balanceChanges = asApiRecords(txBlock.balanceChanges);
      const suiChanges = balanceChanges.filter(bc =>
        asString(asApiRecord(bc).coinType) === '0x2::sui::SUI'
      );
      if (suiChanges.length < 2) continue;

      const senderChange = suiChanges.find(bc => BigInt(asString(asApiRecord(bc).amount)) < 0n);
      const receiverChange = suiChanges.find(bc => BigInt(asString(asApiRecord(bc).amount)) > 0n);
      if (!senderChange || !receiverChange) continue;

      const amountSUI = Math.abs(Number(asApiRecord(senderChange).amount)) / 1e9;
      const amountUSD = amountSUI * suiPrice;
      if (amountUSD < THRESHOLD.sui) continue;

      const sender = asString(asApiRecord(asApiRecord(senderChange).owner).AddressOwner);
      const receiver = asString(asApiRecord(asApiRecord(receiverChange).owner).AddressOwner);
      const timestamp = asNumber(txBlock.timestampMs) > 0
        ? new Date(asNumber(txBlock.timestampMs)).toISOString().replace('T', ' ').slice(0, 19)
        : nowISO();

      results.push({
        signature: asString(txBlock.digest),
        amount_usd: Math.round(amountUSD * 100) / 100,
        amount_native: Math.round(amountSUI * 1e4) / 1e4,
        flow_type: classifyFlow(sender, receiver),
        sender, receiver,
        sender_label: resolveLabel(sender).label,
        receiver_label: resolveLabel(receiver).label,
        timestamp,
        blockchain: 'Sui',
        token: 'SUI',
        token_name: 'Sui',
        source: 'sui_rpc',
        block_height: 0,
        is_pending: 0,
        transaction_type: 'transfer',
      });
    }
  } catch (e) {
    console.error(`[SUI] RPC error: ${errorMessage(e)}`);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEI SOURCE
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchSeiWhales(seiPrice: number): Promise<WhaleTransaction[]> {
  const results: WhaleTransaction[] = [];
  try {
    const url = `https://rest.sei-apis.com/cosmos/tx/v1beta1/txs?order_by=ORDER_BY_DESC&pagination.limit=100&events=message.action%3D%27%2Fcosmos.bank.v1beta1.MsgSend%27`;
    const data = await fetchJSON(url, { timeout: 12_000 });
    const responses = asApiRecords(asApiRecord(data).tx_responses);

    for (const txResp of responses) {
      const tx = asApiRecord(txResp.tx);
      const messages = asApiRecords(asApiRecord(tx.body).messages);
      for (const msg of messages) {
        const msgRec = asApiRecord(msg);
        if (asString(msgRec['@type']) !== '/cosmos.bank.v1beta1.MsgSend') continue;
        for (const amt of asApiRecords(msgRec.amount)) {
          if (asString(asApiRecord(amt).denom) !== 'usei') continue;
          const amountSEI = asNumber(asApiRecord(amt).amount) / 1e6;
          const amountUSD = amountSEI * seiPrice;
          if (amountUSD < THRESHOLD.sei) continue;

          const sender = asString(msgRec.from_address);
          const receiver = asString(msgRec.to_address);
          const timestamp = asString(txResp.timestamp)
            ? new Date(asString(txResp.timestamp)).toISOString().replace('T', ' ').slice(0, 19)
            : nowISO();

          results.push({
            signature: asString(txResp.txhash),
            amount_usd: Math.round(amountUSD * 100) / 100,
            amount_native: Math.round(amountSEI * 1e4) / 1e4,
            flow_type: classifyFlow(sender, receiver),
            sender, receiver,
            sender_label: resolveLabel(sender).label,
            receiver_label: resolveLabel(receiver).label,
            timestamp,
            blockchain: 'Sei',
            token: 'SEI',
            token_name: 'Sei',
            source: 'sei_rest',
            block_height: 0,
            is_pending: 0,
            transaction_type: 'transfer',
          });
        }
        }
      }
    } catch (e) {
      console.error(`[SEI] REST error: ${errorMessage(e)}`);
    }
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RIPPLE (XRP) SOURCE — account_tx against known exchange hot wallets, since
  // XRPL has no block-level "getBlock" scan analog on the public cluster API
  // ═══════════════════════════════════════════════════════════════════════════════

  const RIPPLE_EPOCH_OFFSET_SECONDS = 946_684_800; // seconds between 1970-01-01 and the Ripple epoch (2000-01-01)

  async function fetchXrpWhales(xrpPrice: number): Promise<WhaleTransaction[]> {
    const results: WhaleTransaction[] = [];

    for (const address of XRP_EXCHANGE_WALLETS) {
      try {
        await sleep(200);
        const resp = await fetch('https://xrplcluster.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'account_tx',
            params: [{ account: address, limit: 20, binary: false }],
          }),
          signal: AbortSignal.timeout(10_000),
        });
        const json = await resp.json() as ApiRecord;
        const result = asApiRecord(json.result);
        const txs = asApiRecords(result.transactions);

        for (const entry of txs) {
          const entryRec = asApiRecord(entry);
          const tx = asApiRecord(entryRec.tx);
          if (asString(tx.TransactionType) !== 'Payment') continue;

          const meta = asApiRecord(entryRec.meta);
          const delivered = meta.delivered_amount ?? tx.Amount;
          if (typeof delivered !== 'string') continue; // issued-currency (non-XRP) payment

          const amountXRP = asNumber(delivered) / 1e6;
          const amountUSD = amountXRP * xrpPrice;
          if (amountUSD < THRESHOLD.xrp) continue;

          const hash = asString(tx.hash);
          if (!hash) continue;

          const sender = asString(tx.Account);
          const receiver = asString(tx.Destination);
          const rippleDate = asNumber(tx.date);
          const timestamp = rippleDate > 0
            ? new Date((rippleDate + RIPPLE_EPOCH_OFFSET_SECONDS) * 1000).toISOString().replace('T', ' ').slice(0, 19)
            : nowISO();

          results.push({
            signature: hash,
            amount_usd: Math.round(amountUSD * 100) / 100,
            amount_native: Math.round(amountXRP * 100) / 100,
            flow_type: classifyFlow(sender, receiver),
            sender, receiver,
            sender_label: resolveLabel(sender).label,
            receiver_label: resolveLabel(receiver).label,
            timestamp,
            blockchain: 'XRP',
            token: 'XRP',
            token_name: 'XRP',
            source: 'xrplcluster',
            block_height: asNumber(tx.ledger_index),
            is_pending: 0,
            transaction_type: 'transfer',
          });
        }
      } catch (e) {
        console.error(`[XRP] account_tx error for ${address}: ${errorMessage(e)}`);
      }
    }
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // NEAR SOURCE — recent network-wide transactions via nearblocks.io
  // ═══════════════════════════════════════════════════════════════════════════════

  async function fetchNearWhales(nearPrice: number): Promise<WhaleTransaction[]> {
    const results: WhaleTransaction[] = [];
    try {
      const data = await fetchJSON('https://api.nearblocks.io/v1/txns?limit=25&order=desc', { timeout: 12_000 });
      const txs = asApiRecords(asApiRecord(data).txns);

      for (const tx of txs) {
        const txRec = asApiRecord(tx);
        const agg = asApiRecord(txRec.actions_agg);
        const depositYocto = asNumber(agg.deposit);
        if (!depositYocto) continue;

        const amountNEAR = depositYocto / 1e24;
        const amountUSD = amountNEAR * nearPrice;
        if (amountUSD < THRESHOLD.near) continue;

        const hash = asString(txRec.transaction_hash);
        if (!hash) continue;

        const sender = asString(txRec.signer_account_id);
        const receiver = asString(txRec.receiver_account_id);
        const blockTimestampNs = asNumber(txRec.block_timestamp);
        const timestamp = blockTimestampNs > 0
          ? new Date(blockTimestampNs / 1e6).toISOString().replace('T', ' ').slice(0, 19)
          : nowISO();

        results.push({
          signature: hash,
          amount_usd: Math.round(amountUSD * 100) / 100,
          amount_native: Math.round(amountNEAR * 100) / 100,
          flow_type: classifyFlow(sender, receiver),
          sender, receiver,
          sender_label: resolveLabel(sender).label,
          receiver_label: resolveLabel(receiver).label,
          timestamp,
          blockchain: 'NEAR',
          token: 'NEAR',
          token_name: 'NEAR Protocol',
          source: 'nearblocks',
          block_height: asNumber(asApiRecord(txRec.block).block_height),
          is_pending: 0,
          transaction_type: 'transfer',
        });
      }
    } catch (e) {
      console.error(`[NEAR] nearblocks error: ${errorMessage(e)}`);
    }
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BATCH INSERT — v3: dedup by signature, batch in groups of 100
  // ═══════════════════════════════════════════════════════════════════════════════

  async function ensureWhaleTable(db: D1Database): Promise<void> {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS whale_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signature TEXT NOT NULL,
        amount_usd REAL NOT NULL,
        amount_native REAL DEFAULT 0,
        flow_type TEXT DEFAULT 'Transfer',
        sender TEXT DEFAULT '',
        receiver TEXT DEFAULT '',
        sender_label TEXT DEFAULT '',
        receiver_label TEXT DEFAULT '',
        timestamp TEXT NOT NULL,
        blockchain TEXT DEFAULT 'Bitcoin',
        token TEXT DEFAULT 'BTC',
        token_name TEXT DEFAULT '',
        source TEXT DEFAULT 'unknown',
        block_height INTEGER DEFAULT 0,
        is_pending INTEGER DEFAULT 0,
        transaction_type TEXT DEFAULT 'transfer',
        UNIQUE(signature, blockchain, token)
      )
    `).run();

    for (const [col, def] of [
      ['token_name', "TEXT DEFAULT ''"],
      ['source', "TEXT DEFAULT 'unknown'"],
      ['block_height', 'INTEGER DEFAULT 0'],
      ['is_pending', 'INTEGER DEFAULT 0'],
      ['transaction_type', "TEXT DEFAULT 'transfer'"],
    ]) {
      try { await db.prepare(`ALTER TABLE whale_transactions ADD COLUMN ${col} ${def}`).run(); } catch { /* exists */ }
    }

    await db.prepare('CREATE INDEX IF NOT EXISTS idx_whale_timestamp ON whale_transactions(timestamp DESC)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_whale_blockchain ON whale_transactions(blockchain)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_whale_token ON whale_transactions(token)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_whale_amount ON whale_transactions(amount_usd DESC)').run();
  }

  async function batchInsertTransactions(
    db: D1Database,
    transactions: WhaleTransaction[],
    seenSigs: Set<string>,
  ): Promise<number> {
    let inserted = 0;

    const valid = transactions.filter(tx => {
      if (!tx.signature || tx.signature.length < 6) return false;
      const key = `${tx.signature}-${tx.blockchain}-${tx.token}`;
      if (seenSigs.has(key)) return false;
      seenSigs.add(key);
      return true;
    });

    if (valid.length === 0) return 0;

    // Bulk dedup check — keyed on (signature, blockchain, token), matching the
    // table's UNIQUE(signature, blockchain, token) constraint. A bare signature
    // can legitimately repeat across rows when one tx moves more than one asset
    // (e.g. a Solana tx with both a native SOL transfer and a USDC transfer).
    try {
      const sigs = valid.map(tx => tx.signature);
      const placeholders = sigs.map(() => '?').join(',');
      const existing = await db.prepare(
        `SELECT signature, blockchain, token FROM whale_transactions WHERE signature IN (${placeholders})`
      ).bind(...sigs).all<{ signature: string; blockchain: string; token: string }>();
      const existingSet = new Set(
        (existing.results ?? []).map(r => `${r.signature}-${r.blockchain}-${r.token}`)
      );

      const newTxns = valid.filter(tx => !existingSet.has(`${tx.signature}-${tx.blockchain}-${tx.token}`));
      if (newTxns.length === 0) return 0;

      const BATCH_SIZE = 100;
      for (let i = 0; i < newTxns.length; i += BATCH_SIZE) {
        const chunk = newTxns.slice(i, i + BATCH_SIZE);
        const stmts = chunk.map(tx =>
          db.prepare(`
            INSERT OR IGNORE INTO whale_transactions
              (signature, amount_usd, amount_native, flow_type, sender, receiver,
               sender_label, receiver_label, timestamp, blockchain, token,
               token_name, source, block_height, is_pending, transaction_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            tx.signature, tx.amount_usd, tx.amount_native, tx.flow_type,
            normalizeAddress(tx.blockchain, tx.sender), normalizeAddress(tx.blockchain, tx.receiver), tx.sender_label, tx.receiver_label,
            tx.timestamp, tx.blockchain, tx.token,
            tx.token_name || '', tx.source || 'unknown',
            tx.block_height || 0, tx.is_pending || 0, tx.transaction_type || 'transfer',
          )
        );
        const batchResult = await db.batch(stmts);
        for (const r of batchResult) inserted += r.meta.changes ?? 0;
      }

      return inserted;
    } catch {
      // Fallback to individual inserts
      for (const tx of valid) {
        try {
          await db.prepare(`
            INSERT OR IGNORE INTO whale_transactions
              (signature, amount_usd, amount_native, flow_type, sender, receiver,
               sender_label, receiver_label, timestamp, blockchain, token,
               token_name, source, block_height, is_pending, transaction_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            tx.signature, tx.amount_usd, tx.amount_native, tx.flow_type,
            normalizeAddress(tx.blockchain, tx.sender), normalizeAddress(tx.blockchain, tx.receiver), tx.sender_label, tx.receiver_label,
            tx.timestamp, tx.blockchain, tx.token,
            tx.token_name || '', tx.source || 'unknown',
            tx.block_height || 0, tx.is_pending || 0, tx.transaction_type || 'transfer',
          ).run();
          inserted++;
        } catch { /* duplicate */ }
      }
      return inserted;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VOLUME AGGREGATION — PHASE 6: weekly volume table for charts
  // ═══════════════════════════════════════════════════════════════════════════════

  async function ensureWeeklyVolumeTable(db: D1Database): Promise<void> {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS weekly_volume (
        week_start TEXT NOT NULL,
        chain TEXT NOT NULL,
        total_volume_usd REAL NOT NULL DEFAULT 0,
        transaction_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (week_start, chain)
      )
    `).run();
    await db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_weekly_volume_date ON weekly_volume(week_start DESC)'
    ).run();
    // Flow columns (PROMPT-1 T8) — defensive ALTERs, no-ops when already present.
    try { await db.prepare('ALTER TABLE weekly_volume ADD COLUMN inflow_volume_usd REAL NOT NULL DEFAULT 0').run(); } catch { /* column exists */ }
    try { await db.prepare('ALTER TABLE weekly_volume ADD COLUMN outflow_volume_usd REAL NOT NULL DEFAULT 0').run(); } catch { /* column exists */ }
  }

  // Recomputes every week still present in whale_transactions (30-day raw
  // retention ⇒ ~4-5 weeks) and upserts. Older weeks persist from earlier runs,
  // so history survives retention. Confirmed, non-self rows only — the same
  // semantics as /api/tracking/weekly. Week anchor: date(ts,'weekday 0','-7 days')
  // (Sunday-anchored) — MUST match the API's formula exactly.
  // ORDERING INVARIANT: this runs BEFORE cleanupOldTransactions in runWhaleScan.
  // Never move it after the DELETEs — aggregates must be snapshotted first.
  async function updateWeeklyVolume(db: D1Database): Promise<void> {
    try {
      await db.prepare(`
        INSERT OR REPLACE INTO weekly_volume (week_start, chain, total_volume_usd, transaction_count, inflow_volume_usd, outflow_volume_usd)
        SELECT date(timestamp, 'weekday 0', '-7 days') AS week_start,
               blockchain,
               COALESCE(SUM(amount_usd), 0),
               COUNT(*),
               COALESCE(SUM(CASE WHEN flow_type IN ('Exchange Inflow', 'Inflow') THEN amount_usd ELSE 0 END), 0),
               COALESCE(SUM(CASE WHEN flow_type IN ('Exchange Outflow', 'Outflow') THEN amount_usd ELSE 0 END), 0)
        FROM whale_transactions
        WHERE is_pending = 0 AND flow_type != 'Self'
        GROUP BY week_start, blockchain
      `).run();
    } catch (e) {
      console.error(`[Tracking] Weekly volume update failed: ${errorMessage(e)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CLEANUP — PHASE 6: retain 30 days, clean pending after 2 days
  // ═══════════════════════════════════════════════════════════════════════════════

  async function cleanupOldTransactions(db: D1Database): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString().replace('T', ' ').slice(0, 19);
      const result = await db.prepare(
        `DELETE FROM whale_transactions WHERE timestamp < ? AND is_pending = 0`
      ).bind(cutoff).run();

      await db.prepare(
        `DELETE FROM whale_transactions WHERE is_pending = 1 AND timestamp < ?`
      ).bind(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)).run();

      return result.meta?.changes || 0;
    } catch { return 0; }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN ORCHESTRATION — PHASE 5: runs every 15 min, processes all chains
  // ═══════════════════════════════════════════════════════════════════════════════

  async function runWhaleScan(env: Env): Promise<{ total: number; inserted: number; cleaned: number }> {
    let totalFound = 0;
    let totalInserted = 0;
    const seenSigs = new Set<string>();

    ETHERSCAN_KEY = env.ETHERSCAN_KEY || '';
    const heliusKey = env.HELIUS_API_KEY || '';

    // Key-gated chains: warn ONCE per run (not per fetch) so operators see the
    // exact gap without log spam. Set keys with:
    //   wrangler secret put <NAME> --name novrix-tracking-cron
    const missingKeys: string[] = [];
    if (!ETHERSCAN_KEY) missingKeys.push('ETHERSCAN_KEY (Ethereum block scan + ERC-20)');
    if (!heliusKey) missingKeys.push('HELIUS_API_KEY (Solana blocks/SPL + SOL balances)');
    if (!env.BASESCAN_KEY) missingKeys.push('BASESCAN_KEY (Base)');
    if (!env.ARBISCAN_KEY) missingKeys.push('ARBISCAN_KEY (Arbitrum)');
    if (!env.POLYGONSCAN_KEY) missingKeys.push('POLYGONSCAN_KEY (Polygon)');
    if (!env.BSCSCAN_KEY) missingKeys.push('BSCSCAN_KEY (BSC — keyless fallback unreliable)');
    if (!env.OPTIMISM_SCAN_KEY) missingKeys.push('OPTIMISM_SCAN_KEY (Optimism — keyless fallback unreliable)');
    if (!env.SNOWTRACE_KEY) missingKeys.push('SNOWTRACE_KEY (Avalanche — keyless fallback unreliable)');
    if (missingKeys.length > 0) {
      console.warn(`[Tracking] Missing API keys — chains degraded this run: ${missingKeys.join('; ')}`);
    }

    // 0. Infrastructure
    await ensureCronStateTable(env.TRACKING_DB);
    await ensureWhaleTable(env.TRACKING_DB);
    await ensureWeeklyVolumeTable(env.TRACKING_DB);
    await ensureKnownAddresses(env.TRACKING_DB);
    await loadLabelMap(env.TRACKING_DB);

    // 1. Prices
    const prices = await fetchPrices(env.TRACKING_DB);
    const btcPrice = prices.bitcoin;
    const ethPrice = prices.ethereum;
    const solPrice = prices.solana;
    const trxPrice = prices.tron;
    const suiPrice = prices.sui;
    const seiPrice = prices.sei;
    const xrpPrice = prices.xrp;
    const nearPrice = prices.near;
    const polPrice = prices.pol;
    const bnbPrice = prices.bnb;
    const avaxPrice = prices.avax;

    // fetchPrices() always returns a positive value for every field now (live
    // > cached > hardcoded fallback), so there is no price-driven abort here
    // anymore — an approximate price beats skipping ingestion entirely.

    // 2. Bitcoin — 4 sources: blockchain.info pending + blocks, blockstream, blockchair
    if (btcPrice > 0) {
      // Quick mempool scan first (fast, no rate limit)
      try {
        const pending = await fetchBtcBlockchainInfoPending(btcPrice);
        totalFound += pending.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, pending, seenSigs);
        await setCursor(env.TRACKING_DB, 'Bitcoin', 'blockchain_info_pending', nowISO());
      } catch (e) {
        console.error(`[BTC] blockchain.info pending: ${errorMessage(e)}`);
      }

      // Recent confirmed blocks via blockchain.info
      try {
        const confirmed = await fetchBtcBlockchainInfoBlocks(btcPrice);
        totalFound += confirmed.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, confirmed, seenSigs);
        await setCursor(env.TRACKING_DB, 'Bitcoin', 'blockchain_info_blocks', nowISO());
      } catch (e) {
        console.error(`[BTC] blockchain.info blocks: ${errorMessage(e)}`);
      }

      // Blockstream full current block scan
      try {
        const blockstream = await fetchBtcBlockstream(btcPrice);
        totalFound += blockstream.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, blockstream, seenSigs);
        await setCursor(env.TRACKING_DB, 'Bitcoin', 'blockstream', nowISO());
      } catch (e) {
        console.error(`[BTC] blockstream: ${errorMessage(e)}`);
      }

      // Blockchair filtered
      try {
        const blockchair = await fetchBtcBlockchair(btcPrice);
        totalFound += blockchair.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, blockchair, seenSigs);
        await setCursor(env.TRACKING_DB, 'Bitcoin', 'blockchair', nowISO());
      } catch (e) {
        console.error(`[BTC] blockchair: ${errorMessage(e)}`);
      }
    }

    // 3. Ethereum — 3 sources: block scan, blockchair, ERC-20 tokens
    if (ethPrice > 0) {
      // Recent blocks via eth_getBlockByNumber
      try {
        const blockScan = await fetchEthBlockScan(ethPrice);
        totalFound += blockScan.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, blockScan, seenSigs);
        await setCursor(env.TRACKING_DB, 'Ethereum', 'etherscan_blocks', nowISO());
      } catch (e) {
        console.error(`[ETH] block scan: ${errorMessage(e)}`);
      }

      // Blockchair filtered
      try {
        const blockchair = await fetchEthBlockchair(ethPrice);
        totalFound += blockchair.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, blockchair, seenSigs);
        await setCursor(env.TRACKING_DB, 'Ethereum', 'blockchair_eth', nowISO());
      } catch (e) {
        console.error(`[ETH] blockchair: ${errorMessage(e)}`);
      }

      // ERC-20 tokens
      for (const [contract, symbol, name, decimals, price] of [
        [USDT_ETH, 'USDT', 'Tether USD', 6, 1.0],
        [USDC_ETH, 'USDC', 'USD Coin', 6, 1.0],
      ] as const) {
        try {
          const erc20 = await fetchErc20Whales(contract, symbol, name, decimals, price, THRESHOLD.erc20);
          totalFound += erc20.length;
          totalInserted += await batchInsertTransactions(env.TRACKING_DB, erc20, seenSigs);
        } catch (e) {
          console.error(`[ETH/${symbol}] ERC-20: ${errorMessage(e)}`);
        }
        await sleep(260);
      }

      // WBTC
      if (btcPrice > 0) {
        try {
          const wbtc = await fetchErc20Whales(WBTC_ETH, 'WBTC', 'Wrapped Bitcoin', 8, btcPrice, THRESHOLD.erc20);
          totalFound += wbtc.length;
          totalInserted += await batchInsertTransactions(env.TRACKING_DB, wbtc, seenSigs);
        } catch (e) {
          console.error(`[ETH/WBTC] ERC-20: ${errorMessage(e)}`);
        }
      }
    }

    // 4. Solana — block-centric scan (last 5 confirmed slots) + Helius SPL + Solscan fallback
    if (solPrice > 0) {
      try {
        const solTxs = await fetchSolWhalesBlocks(solPrice, heliusKey);
        totalFound += solTxs.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, solTxs, seenSigs);
        await setCursor(env.TRACKING_DB, 'Solana', 'helius_block', nowISO());
      } catch (e) {
        console.error(`[SOL] block scan: ${errorMessage(e)}`);
      }

      try {
        const usdcSol = await fetchSolSplWhales(heliusKey, USDC_SOL, 'USDC', 'USD Coin', 1.0);
        totalFound += usdcSol.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, usdcSol, seenSigs);
      } catch (e) {
        console.error(`[SOL/USDC] SPL: ${errorMessage(e)}`);
      }

      try {
        const usdtSol = await fetchSolSplWhales(heliusKey, USDT_SOL, 'USDT', 'Tether USD', 1.0);
        totalFound += usdtSol.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, usdtSol, seenSigs);
      } catch (e) {
        console.error(`[SOL/USDT] SPL: ${errorMessage(e)}`);
      }

      await setCursor(env.TRACKING_DB, 'Solana', 'spl', nowISO());
    }

    // 5. Tron — /api/transfer + TRX native + TRC-20 USDT
    try {
      const transfers = await fetchTronTransfers(trxPrice);
      totalFound += transfers.length;
      totalInserted += await batchInsertTransactions(env.TRACKING_DB, transfers, seenSigs);
      await setCursor(env.TRACKING_DB, 'Tron', 'transfers', nowISO());
    } catch (e) {
      console.error(`[TRX] transfers: ${errorMessage(e)}`);
    }

    try {
      const usdtTron = await fetchTronTrc20Usdt();
      totalFound += usdtTron.length;
      totalInserted += await batchInsertTransactions(env.TRACKING_DB, usdtTron, seenSigs);
      await setCursor(env.TRACKING_DB, 'Tron', 'trc20_usdt', nowISO());
    } catch (e) {
      console.error(`[TRX] TRC-20 USDT: ${errorMessage(e)}`);
    }

    if (trxPrice > 0) {
      try {
        const trxNative = await fetchTronWhales(trxPrice);
        totalFound += trxNative.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, trxNative, seenSigs);
      } catch (e) {
        console.error(`[TRX] native: ${errorMessage(e)}`);
      }
    }

    // 6. Sui
    if (suiPrice > 0) {
      try {
        const suiTxs = await fetchSuiWhales(suiPrice);
        totalFound += suiTxs.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, suiTxs, seenSigs);
        await setCursor(env.TRACKING_DB, 'Sui', 'sui_rpc', nowISO());
      } catch (e) {
        console.error(`[SUI] error: ${errorMessage(e)}`);
      }
    }

    // 7. Sei
    if (seiPrice > 0) {
      try {
        const seiTxs = await fetchSeiWhales(seiPrice);
        totalFound += seiTxs.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, seiTxs, seenSigs);
        await setCursor(env.TRACKING_DB, 'Sei', 'sei_rest', nowISO());
      } catch (e) {
        console.error(`[SEI] error: ${errorMessage(e)}`);
      }
    }

    // 8. L2 chains — stablecoins + each chain's own native gas token
    const l2Chains = [
      { chain: 'Base',      api: BASESCAN_API,  apiKey: env.BASESCAN_KEY || '',    native: { symbol: 'ETH',  name: 'Ethereum',                 price: ethPrice  }, tokens: [{ contract: BASE_USDC, symbol: 'USDC', name: 'USD Coin',      decimals: 6, price: 1.0 }, { contract: BASE_USDT, symbol: 'USDT', name: 'Tether USD', decimals: 6, price: 1.0 }] },
      { chain: 'Arbitrum',  api: ARBISCAN_API,  apiKey: env.ARBISCAN_KEY || '',    native: { symbol: 'ETH',  name: 'Ethereum',                 price: ethPrice  }, tokens: [{ contract: ARB_USDC,  symbol: 'USDC', name: 'USD Coin',      decimals: 6, price: 1.0 }, { contract: ARB_USDT,  symbol: 'USDT', name: 'Tether USD', decimals: 6, price: 1.0 }] },
      { chain: 'Polygon',   api: POLYSCAN_API,  apiKey: env.POLYGONSCAN_KEY || '', native: { symbol: 'POL',  name: 'Polygon Ecosystem Token',  price: polPrice  }, tokens: [{ contract: POLY_USDC, symbol: 'USDC', name: 'USD Coin',      decimals: 6, price: 1.0 }, { contract: POLY_USDT, symbol: 'USDT', name: 'Tether USD', decimals: 6, price: 1.0 }] },
      { chain: 'BSC',       api: BSCSCAN_API,   apiKey: env.BSCSCAN_KEY || '',     native: { symbol: 'BNB',  name: 'BNB',                      price: bnbPrice  }, tokens: [{ contract: BSC_USDT,  symbol: 'USDT', name: 'Tether USD',    decimals: 18, price: 1.0 }, { contract: BSC_USDC,  symbol: 'USDC', name: 'USD Coin', decimals: 18, price: 1.0 }] },
      { chain: 'Optimism',  api: OPSCAN_API,    apiKey: env.OPTIMISM_SCAN_KEY || '', native: { symbol: 'ETH',  name: 'Ethereum',               price: ethPrice  }, tokens: [{ contract: OP_USDC,   symbol: 'USDC', name: 'USD Coin',      decimals: 6, price: 1.0 }, { contract: OP_USDT,   symbol: 'USDT', name: 'Tether USD', decimals: 6, price: 1.0 }] },
      { chain: 'Avalanche', api: SNOWTRACE_API, apiKey: env.SNOWTRACE_KEY || '',   native: { symbol: 'AVAX', name: 'Avalanche',                price: avaxPrice }, tokens: [{ contract: AVAX_USDC, symbol: 'USDC', name: 'USD Coin',      decimals: 6, price: 1.0 }, { contract: AVAX_USDT, symbol: 'USDT', name: 'Tether USD', decimals: 6, price: 1.0 }] },
    ];

    for (const l2 of l2Chains) {
      try {
        const txs = await fetchAllL2ChainWhales(l2.chain, l2.api, l2.tokens, THRESHOLD.l2, l2.apiKey);
        totalFound += txs.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, txs, seenSigs);
        await setCursor(env.TRACKING_DB, l2.chain, 'l2_stablecoins', nowISO());
        await sleep(250);
      } catch (e) {
        console.error(`[${l2.chain}] L2 stablecoin error: ${errorMessage(e)}`);
      }

      try {
        const nativeTxs = await fetchL2NativeWhales(l2.chain, l2.api, l2.native.symbol, l2.native.name, l2.native.price, THRESHOLD.l2, l2.apiKey);
        totalFound += nativeTxs.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, nativeTxs, seenSigs);
        await setCursor(env.TRACKING_DB, l2.chain, 'l2_native', nowISO());
        await sleep(250);
      } catch (e) {
        console.error(`[${l2.chain}] L2 native error: ${errorMessage(e)}`);
      }
    }

    // 9. Ripple (XRP)
    if (xrpPrice > 0) {
      try {
        const xrpTxs = await fetchXrpWhales(xrpPrice);
        totalFound += xrpTxs.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, xrpTxs, seenSigs);
        await setCursor(env.TRACKING_DB, 'Ripple', 'xrplcluster', nowISO());
      } catch (e) {
        console.error(`[XRP] error: ${errorMessage(e)}`);
      }
    }

    // 10. NEAR
    if (nearPrice > 0) {
      try {
        const nearTxs = await fetchNearWhales(nearPrice);
        totalFound += nearTxs.length;
        totalInserted += await batchInsertTransactions(env.TRACKING_DB, nearTxs, seenSigs);
        await setCursor(env.TRACKING_DB, 'NEAR', 'nearblocks', nowISO());
      } catch (e) {
        console.error(`[NEAR] error: ${errorMessage(e)}`);
      }
    }

    // 11. Weekly volume update
    await updateWeeklyVolume(env.TRACKING_DB);

    // 12. Cleanup
    const cleaned = await cleanupOldTransactions(env.TRACKING_DB);

    return { total: totalFound, inserted: totalInserted, cleaned };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HOLDINGS SCAN — hourly, ordered by priority
  // ═══════════════════════════════════════════════════════════════════════════════

  const holdingsPriceCache: Record<string, number> = {};

  async function fetchHoldingsPrices(): Promise<void> {
    try {
      const symbols = JSON.stringify(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'TRXUSDT']);
      const data = await fetchJSON(
        `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(symbols)}`,
        { timeout: 10_000 }
      );
      if (Array.isArray(data)) {
        for (const item of data as ApiRecord[]) {
          if (item.symbol === 'BTCUSDT') holdingsPriceCache['bitcoin'] = parseFloat(asString(item.price));
          if (item.symbol === 'ETHUSDT') holdingsPriceCache['ethereum'] = parseFloat(asString(item.price));
          if (item.symbol === 'SOLUSDT') holdingsPriceCache['solana'] = parseFloat(asString(item.price));
          if (item.symbol === 'TRXUSDT') holdingsPriceCache['tron'] = parseFloat(asString(item.price));
        }
        if (holdingsPriceCache['bitcoin'] > 0) return;
      }
    } catch { /* fallback */ }

    try {
      const data = await fetchJSON(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tron&vs_currencies=usd',
        { timeout: 10_000 }
      ) as Record<string, { usd: number }>;
      holdingsPriceCache['bitcoin'] = data?.bitcoin?.usd ?? 0;
      holdingsPriceCache['ethereum'] = data?.ethereum?.usd ?? 0;
      holdingsPriceCache['solana'] = data?.solana?.usd ?? 0;
      holdingsPriceCache['tron'] = data?.tron?.usd ?? 0;
    } catch {
      holdingsPriceCache['bitcoin'] = 0;
      holdingsPriceCache['ethereum'] = 0;
      holdingsPriceCache['solana'] = 0;
      holdingsPriceCache['tron'] = 0;
    }
  }

  async function getBTCBalance(address: string): Promise<{ balance: number; balanceUSD: number; price: number } | null> {
    // mempool.space primary → blockstream fallback. Returns null on failure:
    // a failed fetch must NEVER overwrite a good stored balance with a fake 0.
    const btcPrice = holdingsPriceCache['bitcoin'] ?? 0;
    try {
      const data = await fetchJSON(`https://mempool.space/api/address/${address}`, { timeout: 10_000 });
      const chainStatsRec = asApiRecord(data).chain_stats as { funded_txo_sum?: number; spent_txo_sum?: number } | undefined;
      const balance = ((chainStatsRec?.funded_txo_sum ?? 0) - (chainStatsRec?.spent_txo_sum ?? 0)) / 1e8;
      return { balance, balanceUSD: balance * btcPrice, price: btcPrice };
    } catch (e) {
      console.error(`[Holdings] BTC/mempool balance failed for ${address.slice(0, 12)}…: ${errorMessage(e)} — trying blockstream`);
    }
    try {
      const data = await fetchJSON(`https://blockstream.info/api/address/${address}`, { timeout: 10_000 });
      const chainStatsRec = asApiRecord(data).chain_stats as { funded_txo_sum?: number; spent_txo_sum?: number } | undefined;
      const balance = ((chainStatsRec?.funded_txo_sum ?? 0) - (chainStatsRec?.spent_txo_sum ?? 0)) / 1e8;
      return { balance, balanceUSD: balance * btcPrice, price: btcPrice };
    } catch (e) {
      console.error(`[Holdings] BTC/blockstream balance failed for ${address.slice(0, 12)}…: ${errorMessage(e)}`);
      return null;
    }
  }

  async function ethBalanceViaRpc(rpcUrl: string, address: string): Promise<number> {
    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'] }),
      signal: AbortSignal.timeout(8_000),
    });
    const json = await resp.json() as ApiRecord;
    return Number(BigInt(asString(json.result) || '0x0')) / 1e18;
  }

  async function getETHBalance(address: string, env: Env): Promise<{ balance: number; balanceUSD: number; price: number } | null> {
    const ethPrice = holdingsPriceCache['ethereum'] ?? 0;
    // 1. Etherscan — only with a real key; keyless V1 calls are rejected and
    //    were silently zero-ing every ETH holding.
    if (env.ETHERSCAN_KEY) {
      try {
        const url = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${env.ETHERSCAN_KEY}`;
        const data = await fetchJSON(url, { timeout: 10_000 });
        const balance = Number(BigInt(asString(asApiRecord(data).result) || '0')) / 1e18;
        return { balance, balanceUSD: balance * ethPrice, price: ethPrice };
      } catch (e) {
        console.error(`[Holdings] ETH/etherscan balance failed for ${address.slice(0, 12)}…: ${errorMessage(e)} — trying public RPC`);
      }
    }
    // 2. Free public RPCs (no key required).
    for (const rpc of ['https://ethereum-rpc.publicnode.com', 'https://eth.llamarpc.com']) {
      try {
        const balance = await ethBalanceViaRpc(rpc, address);
        return { balance, balanceUSD: balance * ethPrice, price: ethPrice };
      } catch (e) {
        console.error(`[Holdings] ETH balance via ${rpc} failed for ${address.slice(0, 12)}…: ${errorMessage(e)}`);
      }
    }
    return null;
  }

  async function getSOLBalance(address: string, heliusKey: string): Promise<{ balance: number; balanceUSD: number; price: number } | null> {
    const solPrice = holdingsPriceCache['solana'] ?? 0;
    // Helius (keyed, reliable) → public RPC → publicnode. Never log the keyed
    // URL — the api-key is a secret (we log only the host part).
    const rpcs = [
      heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}` : '',
      'https://api.mainnet-beta.solana.com',
      'https://solana-rpc.publicnode.com',
    ].filter(Boolean);
    for (const rpc of rpcs) {
      try {
        const resp = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
          signal: AbortSignal.timeout(8_000),
        });
        const json = await resp.json() as ApiRecord;
        const balance = (Number((json?.result as { value?: number } | undefined)?.value ?? 0)) / 1e9;
        return { balance, balanceUSD: balance * solPrice, price: solPrice };
      } catch (e) {
        console.error(`[Holdings] SOL balance via ${rpc.split('?')[0]} failed for ${address.slice(0, 12)}…: ${errorMessage(e)}`);
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLDINGS ENGINE v2 (PROMPT-3) — token scan, Tron native, balance history
  // Laws: (1) a failed fetch NEVER overwrites a good stored value;
  //       (2) a balance without history is a number without meaning;
  //       (3) token breakdown is where the real portfolio lives.
  // ═══════════════════════════════════════════════════════════════════════════

  interface TokenHolding { symbol: string; name: string; balance: number; price: number; balanceUSD: number }

  // Stablecoin $1 heuristic (documented): pegged assets get price=1 when the
  // source API provides no rate. Everything unpriced stays 0 + counted.
  const STABLECOINS = new Set(['USDT', 'USDC', 'DAI', 'USDE', 'USDS', 'BUSD', 'TUSD', 'USDP', 'PYUSD', 'FDUSD']);

  // SPL mints we trust without a metadata lookup (top stablecoins by mcap).
  // Unknown mints are skipped + counted — never write 'UNKNOWN' symbol rows.
  const SPL_KNOWN_MINTS: Record<string, { symbol: string; name: string }> = {
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD' },
  };

  function tokenPriceOr(tokenInfoRate: unknown, symbol: string): number {
    const rate = typeof tokenInfoRate === 'number' ? tokenInfoRate : 0;
    if (rate > 0) return rate;
    return STABLECOINS.has(symbol.toUpperCase()) ? 1 : 0;
  }

  // ERC-20 token balances via Ethplorer (freekey tier). Returns null on failure.
  async function fetchErc20Tokens(address: string): Promise<{ tokens: TokenHolding[]; unpriced: number } | null> {
    const url = `https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`;
    let lastErr = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = asApiRecord(await fetchJSON(url, { timeout: 12_000 }));
        if (asApiRecord(data.error).code) throw new Error(`ethplorer error ${asString(asApiRecord(data.error).code)}`);
        const out: TokenHolding[] = [];
        let unpriced = 0;
        for (const tok of asApiRecords(data.tokens)) {
          const t = asApiRecord(tok);
          const info = asApiRecord(t.tokenInfo);
          const symbol = asString(info.symbol).slice(0, 20);
          if (!symbol) continue;
          const decimals = Number(asString(info.decimals) || '18');
          const raw = asString(t.rawBalance) || '0';
          const balance = Number(raw) / Math.pow(10, decimals);
          if (!Number.isFinite(balance) || balance <= 0) continue;
          const price = tokenPriceOr(asApiRecord(info.price).rate, symbol);
          if (price === 0) unpriced++;
          out.push({ symbol, name: asString(info.name), balance, price, balanceUSD: balance * price });
        }
        out.sort((a, b) => b.balanceUSD - a.balanceUSD);
        return { tokens: out.filter((t, i) => t.balanceUSD >= 1_000 || i < 25), unpriced };
      } catch (e) {
        lastErr = errorMessage(e);
        if (attempt === 0) await sleep(1_000); // one retry — freekey rate limits are bursty
      }
    }
    console.error(`[TokenScan] Ethplorer failed for ${address.slice(0, 12)}…: ${lastErr}`);
    return null;
  }

  // SPL token balances via Helius (keyed) → public RPC fallback. Known mints only.
  async function fetchSplTokens(address: string, heliusKey: string): Promise<{ tokens: TokenHolding[]; unpriced: number } | null> {
    const rpcs = [
      heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}` : '',
      'https://api.mainnet-beta.solana.com',
      'https://solana-rpc.publicnode.com',
    ].filter(Boolean);
    for (const rpc of rpcs) {
      try {
        const resp = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
            params: [address, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }],
          }),
          signal: AbortSignal.timeout(10_000),
        });
        const json = await resp.json() as ApiRecord;
        const accounts = asApiRecords(asApiRecord(json.result).value);
        const out: TokenHolding[] = [];
        let skipped = 0;
        for (const acc of accounts) {
          const info = asApiRecord(asApiRecord(asApiRecord(asApiRecord(acc).account).data).parsed).info as ApiRecord | undefined;
          if (!info) { skipped++; continue; }
          const mint = asString(info.mint);
          const known = SPL_KNOWN_MINTS[mint];
          if (!known) { skipped++; continue; }
          const amount = asApiRecord(info.tokenAmount);
          const balance = Number(asString(amount.uiAmountString) || '0');
          if (!Number.isFinite(balance) || balance <= 0) continue;
          const price = tokenPriceOr(0, known.symbol);
          out.push({ symbol: known.symbol, name: known.name, balance, price, balanceUSD: balance * price });
        }
        if (skipped > 0) console.log(`[TokenScan] SPL ${address.slice(0, 8)}…: skipped ${skipped} unknown mints`);
        return { tokens: out, unpriced: 0 };
      } catch (e) {
        console.error(`[TokenScan] SPL via ${rpc.split('?')[0]} failed for ${address.slice(0, 8)}…: ${errorMessage(e)}`);
      }
    }
    return null;
  }

  // Tron account (native TRX + TRC-20 tokens) — ONE TronScan call covers both.
  async function fetchTronAccount(address: string): Promise<{ nativeTRX: number; tokens: TokenHolding[]; unpriced: number } | null> {
    try {
      const data = asApiRecord(await fetchJSON(
        `https://apilist.tronscanapi.com/api/account?address=${address}`, { timeout: 12_000 }
      ));
      const trxPrice = holdingsPriceCache['tron'] ?? 0;
      const nativeTRX = asNumber(data.balance) / 1e6;
      const out: TokenHolding[] = [];
      let unpriced = 0;
      for (const tok of asApiRecords(data.trc20token_balances)) {
        const t = asApiRecord(tok);
        const symbol = asString(t.tokenAbbr).slice(0, 20);
        if (!symbol) continue;
        const decimals = Number(t.tokenDecimal) || 6;
        const balance = Number(asString(t.balance) || '0') / Math.pow(10, decimals);
        if (!Number.isFinite(balance) || balance <= 0) continue;
        const usdRate = asNumber(t.tokenPriceInUsd);
        const trxRate = asNumber(t.tokenPriceInTrx);
        const price = usdRate > 0 ? usdRate : (trxRate > 0 && trxPrice > 0 ? trxRate * trxPrice : tokenPriceOr(0, symbol));
        if (price === 0) unpriced++;
        out.push({ symbol, name: asString(t.tokenName), balance, price, balanceUSD: balance * price });
      }
      out.sort((a, b) => b.balanceUSD - a.balanceUSD);
      return { nativeTRX, tokens: out.filter((t, i) => t.balanceUSD >= 1_000 || i < 25), unpriced };
    } catch (e) {
      console.error(`[TokenScan] TronScan account failed for ${address.slice(0, 12)}…: ${errorMessage(e)}`);
      return null;
    }
  }

  async function upsertTokenHolding(
    db: D1Database, entity: string, address: string, blockchain: string, t: TokenHolding,
  ): Promise<void> {
    await db.prepare(`
      INSERT INTO entity_token_holdings (entity, address, blockchain, token_symbol, token_name, balance, balance_usd, price, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(entity, address, token_symbol) DO UPDATE SET
        blockchain = excluded.blockchain, token_name = excluded.token_name,
        balance = excluded.balance, balance_usd = excluded.balance_usd,
        price = excluded.price, updated_at = excluded.updated_at
    `).bind(entity, normalizeAddress(blockchain, address), blockchain, t.symbol, t.name, t.balance, t.balanceUSD, t.price, nowISO()).run();
  }

  // Daily snapshot — one row per (address, token) per UTC day. Snapshot ONLY
  // successful fetches (never a zero row from a failed fetch). INSERT OR REPLACE
  // makes same-day re-runs idempotent.
  async function snapshotBalance(
    db: D1Database, entity: string, address: string, blockchain: string, token: string,
    balance: number, balanceUSD: number, price: number,
  ): Promise<void> {
    const date = new Date().toISOString().split('T')[0] as string;
    await db.prepare(`
      INSERT OR REPLACE INTO entity_balance_history (entity, address, blockchain, token, date, balance, balance_usd, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(entity, normalizeAddress(blockchain, address), blockchain, token, date, balance, balanceUSD, price).run();
  }

  async function ensureHoldingsTables(db: D1Database): Promise<void> {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS entity_holdings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity TEXT NOT NULL, category TEXT DEFAULT '', description TEXT DEFAULT '',
        address TEXT NOT NULL, address_label TEXT DEFAULT '', blockchain TEXT NOT NULL,
        token TEXT DEFAULT '', balance REAL DEFAULT 0, balance_usd REAL DEFAULT 0,
        price REAL DEFAULT 0, updated_at TEXT NOT NULL,
        UNIQUE(entity, address, token)
      )
    `).run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_holdings_entity ON entity_holdings(entity)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_holdings_blockchain ON entity_holdings(blockchain)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_holdings_updated ON entity_holdings(updated_at DESC)').run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS entity_token_holdings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity TEXT NOT NULL, address TEXT NOT NULL, blockchain TEXT NOT NULL,
        token_symbol TEXT NOT NULL, token_name TEXT DEFAULT '',
        balance REAL DEFAULT 0, balance_usd REAL DEFAULT 0, price REAL DEFAULT 0,
        updated_at TEXT NOT NULL,
        UNIQUE(entity, address, token_symbol)
      )
    `).run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_token_holdings_entity ON entity_token_holdings(entity)').run();

    // Balance history (PROMPT-3 H4) — mirrors migration 006; defensive CREATE so
    // the cron works even before the migration is applied remotely.
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS entity_balance_history (
        entity     TEXT NOT NULL,
        address    TEXT NOT NULL,
        blockchain TEXT NOT NULL,
        token      TEXT NOT NULL,
        date       TEXT NOT NULL,
        balance    REAL NOT NULL DEFAULT 0,
        balance_usd REAL NOT NULL DEFAULT 0,
        price      REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (address, token, date)
      )
    `).run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_ebh_entity_date ON entity_balance_history(entity, date)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_ebh_date ON entity_balance_history(date DESC)').run();
  }

  async function upsertHolding(
    db: D1Database, entity: string, category: string, description: string,
    address: string, label: string, blockchain: string, token: string,
    balance: number, balanceUSD: number, price: number,
  ): Promise<void> {
    await db.prepare(`
      INSERT INTO entity_holdings (entity, category, description, address, address_label, blockchain, token, balance, balance_usd, price, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(entity, address, token) DO UPDATE SET
        balance = excluded.balance, balance_usd = excluded.balance_usd,
        price = excluded.price, updated_at = excluded.updated_at,
        category = excluded.category, description = excluded.description
    `).bind(entity, category, description, normalizeAddress(blockchain, address), label, blockchain, token, balance, balanceUSD, price, nowISO()).run();
  }

  async function runHoldingsScan(env: Env): Promise<{ updated: number; errors: number; subrequests: number }> {
    await ensureHoldingsTables(env.TRACKING_DB);

    let updated = 0, errors = 0, subrequests = 0, tokensUpserted = 0, unpriced = 0;
    const MAX_SUBREQUESTS = 45; // Workers free tier = 50/invocation — keep headroom

    await fetchHoldingsPrices();
    subrequests++;

    const priorityMap: Record<string, number> = {
      exchange: 1, corporate: 2, government: 3, stablecoin: 4, defi: 5,
      fund: 6, whale: 7, miner: 8, mm: 9, vc: 10,
    };
    const sortedEntities = [...TOP_ENTITIES].sort(
      (a, b) => (priorityMap[a.category] ?? 99) - (priorityMap[b.category] ?? 99)
    );

    // Flatten to (entity, address) work items in priority order.
    type WorkItem = { entity: (typeof TOP_ENTITIES)[number]; addr: (typeof TOP_ENTITIES)[number]['addresses'][number] };
    const work: WorkItem[] = [];
    for (const entity of sortedEntities) {
      for (const addr of entity.addresses) work.push({ entity, addr });
    }

    // Round-robin cursor (PROMPT-3 H1: 114 work items > 45-call budget — a hard
    // cutoff would rescan the same top-45 every hour and starve the tail
    // forever). Each run resumes where the previous one stopped.
    const heliusKey = env.HELIUS_API_KEY || '';
    const startIdx = work.length > 0
      ? Math.abs(parseInt(await getCursor(env.TRACKING_DB, 'holdings', 'scan_cursor') || '0', 10) || 0) % work.length
      : 0;
    let processed = 0;

    for (let i = 0; i < work.length; i++) {
      if (subrequests >= MAX_SUBREQUESTS) break;
      const { entity, addr } = work[(startIdx + i) % work.length] as WorkItem;
      processed++;
      try {
        if (addr.blockchain === 'Bitcoin') {
          const bal = await getBTCBalance(addr.address);
          subrequests++;
          if (!bal) { errors++; continue; } // failed fetch never overwrites a good stored balance
          await upsertHolding(env.TRACKING_DB, entity.name, entity.category, entity.description,
            addr.address, addr.label, 'Bitcoin', 'BTC', bal.balance, bal.balanceUSD, bal.price);
          await snapshotBalance(env.TRACKING_DB, entity.name, addr.address, 'Bitcoin', 'BTC', bal.balance, bal.balanceUSD, bal.price);
          updated++;
        } else if (addr.blockchain === 'Ethereum') {
          await sleep(250);
          const bal = await getETHBalance(addr.address, env);
          subrequests++;
          if (!bal) { errors++; continue; }
          await upsertHolding(env.TRACKING_DB, entity.name, entity.category, entity.description,
            addr.address, addr.label, 'Ethereum', 'ETH', bal.balance, bal.balanceUSD, bal.price);
          await snapshotBalance(env.TRACKING_DB, entity.name, addr.address, 'Ethereum', 'ETH', bal.balance, bal.balanceUSD, bal.price);
          updated++;
          // ERC-20 tokens — one extra call when budget remains
          if (subrequests < MAX_SUBREQUESTS) {
            const res = await fetchErc20Tokens(addr.address);
            subrequests++;
            if (!res) { errors++; continue; }
            unpriced += res.unpriced;
            for (const t of res.tokens) {
              await upsertTokenHolding(env.TRACKING_DB, entity.name, addr.address, 'Ethereum', t);
              await snapshotBalance(env.TRACKING_DB, entity.name, addr.address, 'Ethereum', t.symbol, t.balance, t.balanceUSD, t.price);
              tokensUpserted++;
            }
          }
        } else if (addr.blockchain === 'Solana') {
          const bal = await getSOLBalance(addr.address, heliusKey);
          subrequests++;
          if (!bal) { errors++; continue; }
          await upsertHolding(env.TRACKING_DB, entity.name, entity.category, entity.description,
            addr.address, addr.label, 'Solana', 'SOL', bal.balance, bal.balanceUSD, bal.price);
          await snapshotBalance(env.TRACKING_DB, entity.name, addr.address, 'Solana', 'SOL', bal.balance, bal.balanceUSD, bal.price);
          updated++;
          if (subrequests < MAX_SUBREQUESTS) {
            const res = await fetchSplTokens(addr.address, heliusKey);
            subrequests++;
            if (!res) { errors++; continue; }
            unpriced += res.unpriced;
            for (const t of res.tokens) {
              await upsertTokenHolding(env.TRACKING_DB, entity.name, addr.address, 'Solana', t);
              await snapshotBalance(env.TRACKING_DB, entity.name, addr.address, 'Solana', t.symbol, t.balance, t.balanceUSD, t.price);
              tokensUpserted++;
            }
          }
        } else if (addr.blockchain === 'Tron') {
          const acc = await fetchTronAccount(addr.address);
          subrequests++;
          if (!acc) { errors++; continue; }
          const trxPrice = holdingsPriceCache['tron'] ?? 0;
          await upsertHolding(env.TRACKING_DB, entity.name, entity.category, entity.description,
            addr.address, addr.label, 'Tron', 'TRX', acc.nativeTRX, acc.nativeTRX * trxPrice, trxPrice);
          await snapshotBalance(env.TRACKING_DB, entity.name, addr.address, 'Tron', 'TRX', acc.nativeTRX, acc.nativeTRX * trxPrice, trxPrice);
          updated++;
          unpriced += acc.unpriced;
          for (const t of acc.tokens) {
            await upsertTokenHolding(env.TRACKING_DB, entity.name, addr.address, 'Tron', t);
            await snapshotBalance(env.TRACKING_DB, entity.name, addr.address, 'Tron', t.symbol, t.balance, t.balanceUSD, t.price);
            tokensUpserted++;
          }
        }
      } catch (e) {
        console.error(`[Tracking] Holdings error for ${addr.label}: ${errorMessage(e)}`);
        errors++;
      }
    }

    // Advance the round-robin cursor for the next run.
    if (work.length > 0) {
      await setCursor(env.TRACKING_DB, 'holdings', 'scan_cursor', String((startIdx + processed) % work.length));
    }

    // Balance-history retention (400 days) — one bounded DELETE per run.
    try {
      await env.TRACKING_DB.prepare(
        `DELETE FROM entity_balance_history WHERE date < date('now', '-400 days')`
      ).run();
    } catch (e) {
      console.error(`[Holdings] history retention failed: ${errorMessage(e)}`);
    }

    // Health rows — read by the /status endpoint and future prompts.
    console.log(`[Holdings] Scan complete: ${updated} updated, ${tokensUpserted} tokens, ${unpriced} unpriced, ${errors} errors, ${subrequests} subrequests, cursor ${startIdx}+${processed}/${work.length}`);
    await setCursor(env.TRACKING_DB, 'holdings', 'last_run', nowISO());
    await setCursor(env.TRACKING_DB, 'holdings', 'updated', String(updated));
    await setCursor(env.TRACKING_DB, 'holdings', 'tokens', String(tokensUpserted));
    await setCursor(env.TRACKING_DB, 'holdings', 'errors', String(errors));

    return { updated, errors, subrequests };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════════════════════

  const handler = {
    async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
      try {
        await runWhaleScan(env);
      } catch (e) {
        console.error(`[Tracking Cron] Whale scan FAILED: ${errorMessage(e)}`);
      }

      const minute = new Date().getUTCMinutes();
      if (minute < 15) {
        try {
          await runHoldingsScan(env);
        } catch (e) {
          console.error(`[Tracking Cron] Holdings scan FAILED: ${errorMessage(e)}`);
        }
      }
    },

    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      const url = new URL(request.url);

      if (url.pathname === '/trigger') {
        ctx.waitUntil((async () => {
          try {
            await runWhaleScan(env);
            await runHoldingsScan(env);
          } catch (e) {
            console.error(`[Trigger] Error: ${errorMessage(e)}`);
          }
        })());
        return Response.json({ success: true, message: 'Scan triggered — running in background', timestamp: new Date().toISOString() });
      }

      if (url.pathname === '/health') {
        const checks: Record<string, { ok: boolean; detail?: string }> = {};
        let healthy = true;
        try {
          await env.TRACKING_DB.prepare('SELECT 1').first();
          checks.d1 = { ok: true };
        } catch (e) {
          checks.d1 = { ok: false, detail: errorMessage(e) };
          healthy = false;
        }
        checks.secrets = {
          ok: Boolean(env.ETHERSCAN_KEY || env.HELIUS_API_KEY),
          detail: `ETHERSCAN=${env.ETHERSCAN_KEY ? 'SET' : 'MISSING'}, HELIUS=${env.HELIUS_API_KEY ? 'SET' : 'MISSING'}`,
        };
        return Response.json({ success: healthy, checks, timestamp: new Date().toISOString() }, { status: healthy ? 200 : 503 });
      }

      if (url.pathname === '/status') {
        try {
          const [whaleStats, holdingStats] = await Promise.all([
            env.TRACKING_DB.prepare(
              `SELECT blockchain, token, COUNT(*) as count, MAX(timestamp) as latest
               FROM whale_transactions GROUP BY blockchain, token ORDER BY latest DESC`
            ).all(),
            env.TRACKING_DB.prepare(
              `SELECT entity, blockchain, token, balance, balance_usd, updated_at
               FROM entity_holdings ORDER BY balance_usd DESC LIMIT 50`
            ).all(),
          ]);
          return Response.json({ success: true, whales: whaleStats.results, holdings: holdingStats.results });
        } catch (e) {
          return Response.json({ success: false, error: errorMessage(e) }, { status: 500 });
        }
      }

      return new Response('NOVRIX Tracking Cron v2 — /health, /trigger, or /status', {
        headers: { 'Content-Type': 'text/plain' },
      });
    },
  };

  export default handler;
