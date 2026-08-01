/**
 * NOVRIX Metrilytics Cron Worker v3
 *
 * Schedule: 0 3 * * * (daily at 03:00 UTC)
 *
 * Data sources are free and do not require secrets:
 * - DeFiLlama free API: TVL, protocol TVL, fees, revenue, DEX volume, DeFi open interest
 * - Stablecoins Llama: stablecoin supply and peg data
 * - Yields Llama: current DeFi yield pools
 * - Binance USD-M futures public data: BTC, ETH, and SOL derivatives context
 *
 * The worker stores all available historical rows exposed by the free endpoints.
 * On later runs it only fills dates before the earliest stored row or after the
 * latest stored row, so the daily cron remains idempotent and cheap after the
 * initial full-history backfill.
 */

interface Env {
  METRILYTICS_DB: D1Database;
}

type JsonRecord = Record<string, unknown>;
type DateCoverage = { minDate: string | null; maxDate: string | null };

const DAY_MS = 86_400_000;
const REQUEST_DELAY_MS = 150;
const PROTOCOL_HISTORY_LIMIT = 20;

const toDate = (ts: number) => new Date(ts * 1000).toISOString().split('T')[0];
const todayStr = () => new Date().toISOString().split('T')[0];
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const keyOf = (value: string) => value.trim().toLowerCase();

async function parallel<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

function numeric(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logWarn(...args: unknown[]): void {
  console.warn(...args);
}

function isFresh(maxDate: string | null): boolean {
  if (!maxDate) return false;
  return new Date(`${maxDate}T00:00:00Z`).getTime() >= Date.now() - DAY_MS;
}

function needsDate(date: string, coverage: DateCoverage): boolean {
  if (!coverage.minDate || !coverage.maxDate) return true;
  return date < coverage.minDate || date > coverage.maxDate;
}

function hasCompleteFreshHistory(coverage: DateCoverage, expectedStart: string): boolean {
  return Boolean(coverage.minDate && coverage.minDate <= expectedStart && isFresh(coverage.maxDate));
}

function protocolKey(row: JsonRecord): string {
  return String(row.module || row.slug || row.name || '').trim();
}

async function safeJson(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'NOVRIX-Metrilytics/3.0' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error: unknown) {
    logWarn(`[metrilytics] fetch failed url=${url} error=${errorMessage(error)}`);
    return null;
  }
}

async function batchInsert(db: D1Database, stmts: D1PreparedStatement[]): Promise<number> {
  if (!stmts.length) return 0;
  let total = 0;
  for (let i = 0; i < stmts.length; i += 100) {
    await db.batch(stmts.slice(i, i + 100));
    total += Math.min(100, stmts.length - i);
  }
  return total;
}

async function getCoverage(
  db: D1Database,
  table: string,
  where = '',
  binds: (string | number | null)[] = [],
): Promise<DateCoverage> {
  let stmt = db.prepare(`SELECT MIN(date) as minDate, MAX(date) as maxDate FROM ${table} ${where}`);
  if (binds.length) stmt = stmt.bind(...binds);
  const row = await stmt.first<DateCoverage>();
  return {
    minDate: row?.minDate ?? null,
    maxDate: row?.maxDate ?? null,
  };
}

async function ensureSchema(db: D1Database): Promise<void> {
  const tables = [
    `CREATE TABLE IF NOT EXISTS chain_tvl (
      chain TEXT NOT NULL, date TEXT NOT NULL, tvl_usd REAL NOT NULL,
      PRIMARY KEY (chain, date))`,
    `CREATE TABLE IF NOT EXISTS protocol_tvl (
      protocol TEXT NOT NULL, slug TEXT NOT NULL, date TEXT NOT NULL,
      tvl_usd REAL NOT NULL, category TEXT,
      PRIMARY KEY (slug, date))`,
    `CREATE TABLE IF NOT EXISTS protocol_fees (
      protocol TEXT NOT NULL, slug TEXT NOT NULL, date TEXT NOT NULL,
      daily_fees_usd REAL, daily_revenue_usd REAL,
      PRIMARY KEY (slug, date))`,
    `CREATE TABLE IF NOT EXISTS dex_volumes (
      chain TEXT NOT NULL, date TEXT NOT NULL, daily_volume_usd REAL NOT NULL,
      PRIMARY KEY (chain, date))`,
    `CREATE TABLE IF NOT EXISTS stablecoin_supply (
      symbol TEXT NOT NULL, date TEXT NOT NULL, supply_usd REAL NOT NULL, peg_price REAL,
      PRIMARY KEY (symbol, date))`,
    `CREATE TABLE IF NOT EXISTS stablecoin_total (
      date TEXT PRIMARY KEY, total_supply_usd REAL NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS derivatives_data (
      symbol TEXT NOT NULL, date TEXT NOT NULL, open_interest_usd REAL,
      funding_rate REAL, long_short_ratio REAL,
      PRIMARY KEY (symbol, date))`,
    `CREATE TABLE IF NOT EXISTS metrilytics_summary (
      key TEXT PRIMARY KEY, value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS yields_data (
      pool_id TEXT PRIMARY KEY, protocol TEXT NOT NULL, chain TEXT NOT NULL,
      symbol TEXT NOT NULL, apy REAL, tvl_usd REAL,
      updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS options_volume (
      chain TEXT NOT NULL, date TEXT NOT NULL, volume_usd REAL NOT NULL,
      PRIMARY KEY (chain, date))`,
    `CREATE TABLE IF NOT EXISTS btc_prices (
      date TEXT PRIMARY KEY, open REAL, high REAL, low REAL, close REAL, volume REAL)`,
    `CREATE TABLE IF NOT EXISTS lending_data (
      protocol TEXT NOT NULL, slug TEXT NOT NULL, date TEXT NOT NULL,
      tvl_usd REAL NOT NULL, borrowed_usd REAL, supplied_usd REAL, chain TEXT,
      PRIMARY KEY (slug, date))`,
    `CREATE TABLE IF NOT EXISTS bridge_data (
      protocol TEXT NOT NULL, slug TEXT NOT NULL, date TEXT NOT NULL,
      tvl_usd REAL NOT NULL, chain TEXT,
      PRIMARY KEY (slug, date))`,
    `CREATE TABLE IF NOT EXISTS market_data (
      date TEXT PRIMARY KEY, total_market_cap_usd REAL, total_volume_24h_usd REAL,
      btc_dominance REAL, eth_dominance REAL, sol_dominance REAL,
      market_cap_change_24h REAL, volume_change_24h REAL,
      active_cryptocurrencies INTEGER, active_exchanges INTEGER)`,
    `CREATE TABLE IF NOT EXISTS token_prices (
      symbol TEXT NOT NULL, date TEXT NOT NULL, price_usd REAL,
      change_24h_pct REAL, market_cap_usd REAL, volume_24h_usd REAL,
      PRIMARY KEY (symbol, date))`,
    `CREATE TABLE IF NOT EXISTS dex_networks (
      network_id TEXT NOT NULL, date TEXT NOT NULL, name TEXT,
      volume_usd_24h REAL, txns_24h INTEGER, pools_count INTEGER, tokens_count INTEGER,
      PRIMARY KEY (network_id, date))`,
    `CREATE TABLE IF NOT EXISTS dex_stats (
      date TEXT PRIMARY KEY, networks INTEGER, dexes INTEGER, pools INTEGER, tokens INTEGER)`,
    `CREATE TABLE IF NOT EXISTS eth_prices (
      date TEXT PRIMARY KEY, open REAL, high REAL, low REAL, close REAL, volume REAL)`,
    `CREATE TABLE IF NOT EXISTS sol_prices (
            date TEXT PRIMARY KEY, open REAL, high REAL, low REAL, close REAL, volume REAL)`,
    `CREATE TABLE IF NOT EXISTS dex_protocol_volume (
      protocol TEXT NOT NULL, slug TEXT NOT NULL, date TEXT NOT NULL,
      volume_24h REAL, volume_30d REAL, volume_1y REAL, volume_all_time REAL,
      change_1d REAL, change_7d REAL, change_30d REAL, category TEXT, chains TEXT,
      PRIMARY KEY (slug, date))`,
  ];

  for (const sql of tables) {
    await db.prepare(sql).run();
  }
}

async function fetchGlobalTvl(db: D1Database): Promise<void> {
  const coverage = await getCoverage(db, 'chain_tvl', "WHERE chain = 'all'");
  if (hasCompleteFreshHistory(coverage, '2017-09-27')) {
    return;
  }

  const hist = await safeJson('https://api.llama.fi/v2/historicalChainTvl');
  if (!Array.isArray(hist)) return;

  const stmts = hist
    .map((row: JsonRecord) => ({ date: toDate(numeric(row.date)), tvl: numeric(row.tvl) }))
    .filter(row => needsDate(row.date, coverage))
    .map(row =>
      db.prepare('INSERT OR REPLACE INTO chain_tvl (chain, date, tvl_usd) VALUES (?, ?, ?)')
        .bind('all', row.date, row.tvl),
    );

  await batchInsert(db, stmts);
}

const PRIORITY_CHAINS = [
  { endpoint: 'Ethereum', key: 'ethereum', expectedStart: '2017-09-27' },
  { endpoint: 'BSC', key: 'bsc', expectedStart: '2020-10-31' },
  { endpoint: 'Tron', key: 'tron', expectedStart: '2020-04-03' },
  { endpoint: 'Arbitrum', key: 'arbitrum', expectedStart: '2021-06-04' },
  { endpoint: 'Solana', key: 'solana', expectedStart: '2021-03-18' },
  { endpoint: 'Polygon', key: 'polygon', expectedStart: '2020-10-09' },
  { endpoint: 'Base', key: 'base', expectedStart: '2023-06-15' },
  { endpoint: 'OP Mainnet', key: 'optimism', expectedStart: '2021-07-14' },
  { endpoint: 'Avalanche', key: 'avalanche', expectedStart: '2021-02-03' },
  { endpoint: 'Sui', key: 'sui', expectedStart: '2023-05-06' },
];

async function fetchChainTvl(db: D1Database): Promise<void> {
  const today = todayStr();
  const chains = await safeJson('https://api.llama.fi/v2/chains');

  if (Array.isArray(chains)) {
    const topChains = [...chains]
      .filter((chain: JsonRecord) => numeric(chain.tvl) > 0)
      .sort((a: JsonRecord, b: JsonRecord) => numeric(b.tvl) - numeric(a.tvl))
      .slice(0, 50);

    const stmts = topChains.map((chain: JsonRecord) =>
      db.prepare('INSERT OR REPLACE INTO chain_tvl (chain, date, tvl_usd) VALUES (?, ?, ?)')
        .bind(keyOf(String(chain.name || '')), today, numeric(chain.tvl)),
    );
    await batchInsert(db, stmts);
  }

  for (const chain of PRIORITY_CHAINS) {
    const chainKey = chain.key;
    try {
      const coverage = await getCoverage(db, 'chain_tvl', 'WHERE chain = ?', [chainKey]);
      if (hasCompleteFreshHistory(coverage, chain.expectedStart)) continue;

      const hist = await safeJson(`https://api.llama.fi/v2/historicalChainTvl/${encodeURIComponent(chain.endpoint)}`);
      if (!Array.isArray(hist)) continue;

      const stmts = hist
        .map((row: JsonRecord) => ({ date: toDate(numeric(row.date)), tvl: numeric(row.tvl) }))
        .filter(row => needsDate(row.date, coverage))
        .map(row =>
          db.prepare('INSERT OR REPLACE INTO chain_tvl (chain, date, tvl_usd) VALUES (?, ?, ?)')
            .bind(chainKey, row.date, row.tvl),
        );

      await batchInsert(db, stmts);
    } catch (error: unknown) {
      logWarn(`[metrilytics] chain_tvl chain=${chain.endpoint} error=${errorMessage(error)}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }
}

const PRIORITY_PROTOCOLS = [
  'aave', 'lido', 'makerdao', 'uniswap-v3', 'curve-dex',
  'compound-v3', 'pancakeswap', 'eigenlayer', 'spark', 'raydium',
];

async function fetchProtocols(db: D1Database): Promise<void> {
  const today = todayStr();
  const protocols = await safeJson('https://api.llama.fi/protocols');
  if (!Array.isArray(protocols)) return;

  const topProtocols = [...protocols]
    .filter((protocol: JsonRecord) => numeric(protocol.tvl) > 0 && protocol.slug)
    .sort((a: JsonRecord, b: JsonRecord) => numeric(b.tvl) - numeric(a.tvl))
    .slice(0, 80);

  const snapshotStmts = topProtocols.map((protocol: JsonRecord) =>
    db.prepare(
      'INSERT OR REPLACE INTO protocol_tvl (protocol, slug, date, tvl_usd, category) VALUES (?, ?, ?, ?, ?)',
    ).bind(
      String(protocol.name || protocol.slug),
      String(protocol.slug),
      today,
      numeric(protocol.tvl),
      protocol.category || null,
    ),
  );
  await batchInsert(db, snapshotStmts);

  const topSlugs = topProtocols.slice(0, PROTOCOL_HISTORY_LIMIT).map((protocol: JsonRecord) => String(protocol.slug));
  const slugsToFetch = [...new Set([...PRIORITY_PROTOCOLS, ...topSlugs])].slice(0, PROTOCOL_HISTORY_LIMIT);

  for (const slug of slugsToFetch) {
    try {
      const coverage = await getCoverage(db, 'protocol_tvl', 'WHERE slug = ?', [slug]);
      if (coverage.minDate && coverage.minDate < '2026-01-01' && isFresh(coverage.maxDate)) continue;

      const hist = asRecord(await safeJson(`https://api.llama.fi/protocol/${encodeURIComponent(slug)}`));
      if (!Array.isArray(hist.tvl)) continue;

      const stmts = (hist.tvl as JsonRecord[])
        .map(row => ({
          date: toDate(numeric(row.date)),
          tvl: numeric(row.totalLiquidityUSD),
        }))
        .filter(row => needsDate(row.date, coverage))
        .map(row =>
          db.prepare(
            'INSERT OR REPLACE INTO protocol_tvl (protocol, slug, date, tvl_usd, category) VALUES (?, ?, ?, ?, ?)',
          ).bind(String(hist.name || slug), slug, row.date, row.tvl, hist.category || null),
        );

      await batchInsert(db, stmts);
    } catch (error: unknown) {
      logWarn(`[metrilytics] protocol_tvl slug=${slug} error=${errorMessage(error)}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }
}

async function fetchFees(db: D1Database): Promise<void> {
  const today = todayStr();
  const [feesDataRaw, revenueDataRaw] = await Promise.all([
    safeJson('https://api.llama.fi/overview/fees?dataType=dailyFees'),
    safeJson('https://api.llama.fi/overview/fees?dataType=dailyRevenue'),
  ]);
  const feesData = asRecord(feesDataRaw);
  const revenueData = asRecord(revenueDataRaw);

  if (!Array.isArray(feesData.protocols)) return;

  const revenueByDate = new Map<string, number>();
  if (Array.isArray(revenueData.totalDataChart)) {
    for (const point of revenueData.totalDataChart as [number, number][]) {
      revenueByDate.set(toDate(numeric(point[0])), numeric(point[1]));
    }
  }

  const coverage = await getCoverage(db, 'protocol_fees', "WHERE slug = 'all'");
  const historyStmts = hasCompleteFreshHistory(coverage, '2018-08-18')
    ? []
    : Array.isArray(feesData.totalDataChart)
    ? (feesData.totalDataChart as [number, number][])
        .map(point => {
          const date = toDate(numeric(point[0]));
          return { date, fees: numeric(point[1]), revenue: revenueByDate.get(date) ?? null };
        })
        .filter(row => needsDate(row.date, coverage))
        .map(row =>
          db.prepare(
            'INSERT OR REPLACE INTO protocol_fees (protocol, slug, date, daily_fees_usd, daily_revenue_usd) VALUES (?, ?, ?, ?, ?)',
          ).bind('Aggregate DeFi', 'all', row.date, row.fees, row.revenue),
        )
    : [];

  await batchInsert(db, historyStmts);

  const revenueByProtocol = new Map<string, number>();
  if (Array.isArray(revenueData.protocols)) {
    for (const protocol of revenueData.protocols as JsonRecord[]) {
      const slug = protocolKey(protocol);
      if (slug) revenueByProtocol.set(slug, numeric(protocol.total24h));
    }
  }

  const topProtocols = [...feesData.protocols]
    .filter((protocol: JsonRecord) => numeric(protocol.total24h) > 0)
    .sort((a: JsonRecord, b: JsonRecord) => numeric(b.total24h) - numeric(a.total24h))
    .slice(0, 50);

  const protocolStmts = topProtocols.map((protocol: JsonRecord) => {
    const slug = protocolKey(protocol);
    return db.prepare(
      'INSERT OR REPLACE INTO protocol_fees (protocol, slug, date, daily_fees_usd, daily_revenue_usd) VALUES (?, ?, ?, ?, ?)',
    ).bind(
      String(protocol.name || slug),
      slug,
      today,
      numeric(protocol.total24h),
      revenueByProtocol.get(slug) ?? 0,
    );
  });

  await batchInsert(db, protocolStmts);
}

const DEX_HISTORY_CHAINS = [
  { endpoint: 'Ethereum', key: 'ethereum' },
  { endpoint: 'BSC', key: 'bsc' },
  { endpoint: 'Arbitrum', key: 'arbitrum' },
  { endpoint: 'Solana', key: 'solana' },
  { endpoint: 'Base', key: 'base' },
  { endpoint: 'Polygon', key: 'polygon' },
  { endpoint: 'OP Mainnet', key: 'optimism' },
  { endpoint: 'Avalanche', key: 'avalanche' },
  { endpoint: 'Sui', key: 'sui' },
];

async function insertDexHistory(db: D1Database, chainKey: string, url: string): Promise<number> {
  const coverage = await getCoverage(db, 'dex_volumes', 'WHERE chain = ?', [chainKey]);
  const expectedStarts: Record<string, string> = {
    all: '2016-04-19',
    ethereum: '2018-11-02',
    bsc: '2020-09-25',
    arbitrum: '2021-09-01',
    solana: '2021-03-18',
    base: '2023-08-09',
    polygon: '2020-10-10',
    optimism: '2021-07-14',
    avalanche: '2021-02-03',
    sui: '2023-05-06',
  };
  const expectedStart = expectedStarts[chainKey];
  if (expectedStart && hasCompleteFreshHistory(coverage, expectedStart)) return 0;

  const data = asRecord(await safeJson(url));
  if (!Array.isArray(data.totalDataChart)) return 0;

  const stmts = (data.totalDataChart as [number, number][])
    .map(point => ({ date: toDate(numeric(point[0])), volume: numeric(point[1]) }))
    .filter(row => needsDate(row.date, coverage))
    .map(row =>
      db.prepare('INSERT OR REPLACE INTO dex_volumes (chain, date, daily_volume_usd) VALUES (?, ?, ?)')
        .bind(chainKey, row.date, row.volume),
    );

  await batchInsert(db, stmts);
  return stmts.length;
}

async function fetchDexVolumes(db: D1Database): Promise<void> {
  await insertDexHistory(
    db,
    'all',
    'https://api.llama.fi/overview/dexs?dataType=dailyVolume',
  );

  for (const chain of DEX_HISTORY_CHAINS) {
    try {
      await insertDexHistory(
        db,
        chain.key,
        `https://api.llama.fi/overview/dexs/${encodeURIComponent(chain.endpoint)}?dataType=dailyVolume`,
      );
    } catch (error: unknown) {
      logWarn(`[metrilytics] dex_volumes chain=${chain.endpoint} error=${errorMessage(error)}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }
}

async function fetchStablecoins(db: D1Database): Promise<void> {
  const today = todayStr();
  const stablesData = asRecord(await safeJson('https://stablecoins.llama.fi/stablecoins?includePrices=true'));

  if (Array.isArray(stablesData.peggedAssets)) {
    const topStablecoins = [...stablesData.peggedAssets]
      .sort((a: JsonRecord, b: JsonRecord) => numeric(asRecord(b.circulating).peggedUSD) - numeric(asRecord(a.circulating).peggedUSD))
      .slice(0, 20);

    const stmts = topStablecoins.map((stable: JsonRecord) =>
      db.prepare(
        'INSERT OR REPLACE INTO stablecoin_supply (symbol, date, supply_usd, peg_price) VALUES (?, ?, ?, ?)',
      ).bind(stable.symbol, today, numeric(asRecord(stable.circulating).peggedUSD), numeric(stable.price) || 1),
    );
    await batchInsert(db, stmts);
  }

  const coverage = await getCoverage(db, 'stablecoin_total');
  if (hasCompleteFreshHistory(coverage, '2017-11-29')) {
    return;
  }

  const totalHist = await safeJson('https://stablecoins.llama.fi/stablecoincharts/all');
  if (!Array.isArray(totalHist)) return;

  const stmts = totalHist
    .map((row: JsonRecord) => {
      const circulating = row.totalCirculatingUSD;
      const total = typeof circulating === 'number'
        ? circulating
        : numeric(asRecord(circulating).peggedUSD) +
          numeric(asRecord(circulating).peggedEUR) +
          numeric(asRecord(circulating).peggedJPY) +
          numeric(asRecord(circulating).peggedOther);
      return { date: toDate(numeric(row.date)), total };
    })
    .filter(row => needsDate(row.date, coverage))
    .map(row =>
      db.prepare('INSERT OR REPLACE INTO stablecoin_total (date, total_supply_usd) VALUES (?, ?)')
        .bind(row.date, row.total),
    );

  await batchInsert(db, stmts);
}

async function fetchDefiOpenInterest(db: D1Database): Promise<void> {
  const coverage = await getCoverage(db, 'derivatives_data', "WHERE symbol = 'DEFI'");
  if (hasCompleteFreshHistory(coverage, '2021-02-25')) {
    return;
  }

  const data = asRecord(await safeJson('https://api.llama.fi/overview/open-interest'));
  if (!Array.isArray(data.totalDataChart)) return;

  const stmts = (data.totalDataChart as [number, number][])
    .map(point => ({ date: toDate(numeric(point[0])), openInterest: numeric(point[1]) }))
    .filter(row => needsDate(row.date, coverage))
    .map(row =>
      db.prepare(
        `INSERT OR REPLACE INTO derivatives_data
         (symbol, date, open_interest_usd, funding_rate, long_short_ratio)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind('DEFI', row.date, row.openInterest, null, null),
    );

  await batchInsert(db, stmts);
}

async function fetchBinanceDerivatives(db: D1Database): Promise<void> {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

  for (const symbol of symbols) {
    const cleanSymbol = symbol.replace('USDT', '');
    try {
      const [oiHist, fundingHist, longShortHist] = await Promise.all([
        safeJson(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=1d&limit=500`),
        safeJson(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1000`),
        safeJson(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1d&limit=500`),
      ]);

      const byDate: Record<string, { oi?: number; funding?: number[]; longShort?: number }> = {};

      if (Array.isArray(oiHist)) {
        for (const row of oiHist as JsonRecord[]) {
          const date = new Date(numeric(row.timestamp)).toISOString().split('T')[0];
          byDate[date] = byDate[date] || {};
          byDate[date].oi = numeric(row.sumOpenInterestValue);
        }
      }

      if (Array.isArray(fundingHist)) {
        for (const row of fundingHist as JsonRecord[]) {
          const date = new Date(numeric(row.fundingTime)).toISOString().split('T')[0];
          byDate[date] = byDate[date] || {};
          byDate[date].funding = byDate[date].funding || [];
          byDate[date].funding.push(numeric(row.fundingRate));
        }
      }

      if (Array.isArray(longShortHist)) {
        for (const row of longShortHist as JsonRecord[]) {
          const date = new Date(numeric(row.timestamp)).toISOString().split('T')[0];
          byDate[date] = byDate[date] || {};
          byDate[date].longShort = numeric(row.longShortRatio);
        }
      }

      const stmts = Object.entries(byDate).map(([date, value]) => {
        const funding = value.funding?.length
          ? value.funding.reduce((sum, item) => sum + item, 0) / value.funding.length
          : null;
        return db.prepare(
          `INSERT OR REPLACE INTO derivatives_data
           (symbol, date, open_interest_usd, funding_rate, long_short_ratio)
           VALUES (?, ?, ?, ?, ?)`,
        ).bind(cleanSymbol, date, value.oi ?? null, funding, value.longShort ?? null);
      });

      await batchInsert(db, stmts);
    } catch (error: unknown) {
      logWarn(`[metrilytics] binance_derivatives symbol=${symbol} error=${errorMessage(error)}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }
}

async function fetchYields(db: D1Database): Promise<void> {
  const data = asRecord(await safeJson('https://yields.llama.fi/pools'));
  if (!Array.isArray(data.data)) return;

  const pools = [...data.data]
    .filter((pool: JsonRecord) => numeric(pool.tvlUsd) > 100_000 && pool.apy != null)
    .sort((a: JsonRecord, b: JsonRecord) => numeric(b.tvlUsd) - numeric(a.tvlUsd))
    .slice(0, 100);

  const now = new Date().toISOString();
  const stmts = pools.map((pool: JsonRecord) => {
    const symbol = String(pool.symbol || '');
    const protocol = String(pool.project || '');
    const apy = numeric(pool.apy);
    const tvlUsd = numeric(pool.tvlUsd);
    const apyBase = numeric(pool.apyBase);
    const apyReward = numeric(pool.apyReward);
    
    // Calculate risk score
    const riskScore = calculateRiskScore({
      symbol,
      protocol,
      apy,
      tvl_usd: tvlUsd,
      audited: isBlueChipProtocol(protocol),
      pool_age_days: 365 // TODO: Fetch from DeFiLlama pool detail
    });
    
    // Assess IL risk
    const ilRisk = assessILRiskCategory(symbol);
    
    return db.prepare(
      `INSERT OR REPLACE INTO yields_data
       (pool_id, protocol, chain, symbol, apy, apy_base, apy_reward, tvl_usd, risk_score, il_risk, audited, pool_age_days, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      pool.pool,
      protocol,
      pool.chain || '',
      symbol,
      apy,
      apyBase,
      apyReward,
      tvlUsd,
      riskScore,
      ilRisk,
      isBlueChipProtocol(protocol) ? 1 : 0,
      365, // TODO: Fetch real pool age
      now
    );
  });

  await batchInsert(db, stmts);
  console.log(`[yields] Ingested ${stmts.length} pools with risk scores`);
}

// ============================================================
// YIELD RISK SCORING ALGORITHM
// ============================================================

interface YieldPoolRisk {
  symbol: string;
  protocol: string;
  apy: number;
  tvl_usd: number;
  audited: boolean;
  pool_age_days: number;
}

function calculateRiskScore(pool: YieldPoolRisk): number {
  let score = 0;
  
  // Factor 1: IL Risk (0-25 points)
  const ilRisk = assessILRisk(pool.symbol);
  score += ilRisk;
  
  // Factor 2: Protocol Risk (0-25 points)
  const protocolRisk = assessProtocolRisk(pool.protocol, pool.audited, pool.pool_age_days);
  score += protocolRisk;
  
  // Factor 3: APY Sustainability (0-20 points)
  const apyRisk = assessAPYSustainability(pool.apy);
  score += apyRisk;
  
  // Factor 4: Liquidity Risk (0-15 points)
  const liquidityRisk = assessLiquidityRisk(pool.tvl_usd);
  score += liquidityRisk;
  
  // Factor 5: Smart Contract Risk (0-15 points)
  const contractRisk = assessContractRisk(pool.protocol, pool.pool_age_days);
  score += contractRisk;
  
  return Math.min(100, score);
}

function assessILRisk(symbol: string): number {
  if (isStablePair(symbol)) return 2;
  if (isCorrelatedPair(symbol)) return 7;
  if (isBlueChipStablePair(symbol)) return 12;
  if (isVolatilePair(symbol)) return 18;
  return 23;
}

function assessProtocolRisk(protocol: string, audited: boolean, ageDays: number): number {
  let score = 0;
  if (!audited) score += 15;
  if (ageDays < 90) score += 10;
  if (!isBlueChipProtocol(protocol)) score += 5;
  return Math.min(25, score);
}

function assessAPYSustainability(apy: number): number {
  if (apy < 10) return 0;
  if (apy < 30) return 5;
  if (apy < 50) return 10;
  if (apy < 100) return 15;
  return 20;
}

function assessLiquidityRisk(tvlUsd: number): number {
  if (tvlUsd > 100e6) return 0;
  if (tvlUsd > 50e6) return 3;
  if (tvlUsd > 10e6) return 7;
  if (tvlUsd > 1e6) return 12;
  return 15;
}

function assessContractRisk(protocol: string, ageDays: number): number {
  let score = 0;
  if (hasRecentExploit(protocol)) score += 10;
  if (ageDays < 30) score += 5;
  return Math.min(15, score);
}

function isStablePair(symbol: string): boolean {
  const stables = ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'TUSD', 'FDUSD'];
  const tokens = symbol.split('-').map(t => t.trim());
  return tokens.every(t => stables.includes(t));
}

function isCorrelatedPair(symbol: string): boolean {
  const correlated = [
    ['ETH', 'stETH'], ['ETH', 'wstETH'], ['ETH', 'rETH'], ['ETH', 'cbETH'],
    ['BTC', 'WBTC'], ['BTC', 'tBTC'], ['BTC', 'renBTC'],
    ['SOL', 'stSOL'], ['SOL', 'mSOL']
  ];
  const tokens = symbol.split('-').map(t => t.trim());
  return correlated.some(pair => 
    (tokens.includes(pair[0]) && tokens.includes(pair[1])) ||
    (tokens.includes(pair[1]) && tokens.includes(pair[0]))
  );
}

function isBlueChipStablePair(symbol: string): boolean {
  const blueChips = ['ETH', 'BTC', 'WBTC'];
  const stables = ['USDC', 'USDT', 'DAI'];
  const tokens = symbol.split('-').map(t => t.trim());
  return tokens.some(t => blueChips.includes(t)) && tokens.some(t => stables.includes(t));
}

function isVolatilePair(symbol: string): boolean {
  const volatile = ['ETH', 'BTC', 'SOL', 'AVAX', 'MATIC', 'ARB', 'OP'];
  const tokens = symbol.split('-').map(t => t.trim());
  return tokens.filter(t => volatile.includes(t)).length >= 2;
}

function isBlueChipProtocol(protocol: string): boolean {
  const blueChips = [
    'Uniswap', 'Curve', 'Aave', 'Compound', 'MakerDAO', 'Lido',
    'Balancer', 'SushiSwap', 'Yearn', 'Convex', 'PancakeSwap'
  ];
  return blueChips.some(bc => protocol.toLowerCase().includes(bc.toLowerCase()));
}

function hasRecentExploit(protocol: string): boolean {
  const exploited = [
    'Multichain', 'Poly Network', 'Wormhole', 'Ronin', 'Nomad',
    'Harmony', 'BNB Bridge', 'Orbit', 'Hundred Finance'
  ];
  return exploited.some(e => protocol.toLowerCase().includes(e.toLowerCase()));
}

function assessILRiskCategory(symbol: string): string {
  if (isStablePair(symbol)) return 'low';
  if (isCorrelatedPair(symbol)) return 'low';
  if (isBlueChipStablePair(symbol)) return 'medium';
  if (isVolatilePair(symbol)) return 'high';
  return 'extreme';
}

async function fetchOptionsVolume(db: D1Database): Promise<void> {
  const coverage = await getCoverage(db, 'options_volume', "WHERE chain = 'all'");
  if (hasCompleteFreshHistory(coverage, '2021-11-01')) {
    return;
  }

  const data = asRecord(await safeJson('https://api.llama.fi/overview/options'));
  if (!Array.isArray(data.totalDataChart)) return;

  const stmts = (data.totalDataChart as [number, number][])
    .map(point => ({ date: toDate(numeric(point[0])), volume: numeric(point[1]) }))
    .filter(row => needsDate(row.date, coverage))
    .map(row =>
      db.prepare('INSERT OR REPLACE INTO options_volume (chain, date, volume_usd) VALUES (?, ?, ?)')
        .bind('all', row.date, row.volume),
    );

  await batchInsert(db, stmts);

  // Per-chain breakdown
  const chainBreakdown = asRecord(data.totalDataChartBreakdown);
  if (typeof chainBreakdown === 'object' && chainBreakdown !== null) {
    for (const [chainKey, chartData] of Object.entries(chainBreakdown)) {
      if (!Array.isArray(chartData)) continue;
      const chainCoverage = await getCoverage(db, 'options_volume', 'WHERE chain = ?', [keyOf(chainKey)]);
      const chainStmts = (chartData as [number, number][])
        .map(point => ({ date: toDate(numeric(point[0])), volume: numeric(point[1]) }))
        .filter(row => needsDate(row.date, chainCoverage))
        .map(row =>
          db.prepare('INSERT OR REPLACE INTO options_volume (chain, date, volume_usd) VALUES (?, ?, ?)')
            .bind(keyOf(chainKey), row.date, row.volume),
        );
      await batchInsert(db, chainStmts);
    }
  }
}

async function fetchBtcPrices(db: D1Database): Promise<void> {
  const coverage = await getCoverage(db, 'btc_prices');
  if (isFresh(coverage.maxDate)) {
    return;
  }

  const limit = coverage.maxDate ? 60 : 500;
  const data = await safeJson(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${limit}`);
  if (!Array.isArray(data)) return;

  const stmts = (data as unknown[][])
    .map(candle => {
      const openTime = numeric(candle[0]);
      const date = new Date(openTime).toISOString().split('T')[0];
      return {
        date,
        open: numeric(candle[1]),
        high: numeric(candle[2]),
        low: numeric(candle[3]),
        close: numeric(candle[4]),
        volume: numeric(candle[5]),
      };
    })
    .filter(row => needsDate(row.date, coverage))
    .map(row =>
      db.prepare(
        'INSERT OR REPLACE INTO btc_prices (date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?)',
      ).bind(row.date, row.open, row.high, row.low, row.close, row.volume),
    );

  await batchInsert(db, stmts);
}

async function fetchLendingData(db: D1Database): Promise<void> {
  const today = todayStr();
  const protocols = await safeJson('https://api.llama.fi/protocols');
  if (!Array.isArray(protocols)) return;

  const lendingProtocols = [...protocols]
    .filter((p: JsonRecord) => p.category === 'Lending' && numeric(p.tvl) > 0 && p.slug)
    .sort((a: JsonRecord, b: JsonRecord) => numeric(b.tvl) - numeric(a.tvl))
    .slice(0, 20);

  const stmts = lendingProtocols.map((protocol: JsonRecord) => {
    const slug = String(protocol.slug);
    return db.prepare(
      'INSERT OR REPLACE INTO lending_data (protocol, slug, date, tvl_usd, borrowed_usd, supplied_usd, chain) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      String(protocol.name || slug),
      slug,
      today,
      numeric(protocol.tvl),
      null,
      numeric(protocol.tvl),
      protocol.chain || null,
    );
  });

  await batchInsert(db, stmts);
}

async function fetchBridgeData(db: D1Database): Promise<void> {
  const today = todayStr();
  const protocols = await safeJson('https://api.llama.fi/protocols');
  if (!Array.isArray(protocols)) return;

  const bridgeProtocols = [...protocols]
    .filter((p: JsonRecord) => (p.category === 'Bridge' || p.category === 'Cross Chain') && numeric(p.tvl) > 0 && p.slug)
    .sort((a: JsonRecord, b: JsonRecord) => numeric(b.tvl) - numeric(a.tvl))
    .slice(0, 30);

  const stmts = bridgeProtocols.map((protocol: JsonRecord) =>
    db.prepare(
      'INSERT OR REPLACE INTO bridge_data (protocol, slug, date, tvl_usd, chain) VALUES (?, ?, ?, ?, ?)',
    ).bind(
      String(protocol.name || protocol.slug),
      String(protocol.slug),
      today,
      numeric(protocol.tvl),
      protocol.chain || null,
    ),
  );

  await batchInsert(db, stmts);
}

async function fetchMarketData(db: D1Database): Promise<void> {
  const today = todayStr();

  const [globalRaw, pricesRaw] = await Promise.all([
    safeJson('https://api.coingecko.com/api/v3/global'),
    safeJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,usd-coin,tether&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true'),
  ]);

  const globalData = asRecord(asRecord(globalRaw).data);
  const prices = asRecord(pricesRaw);

  const marketStmt = db.prepare(
    `INSERT OR REPLACE INTO market_data (
      date, total_market_cap_usd, total_volume_24h_usd, btc_dominance, eth_dominance, sol_dominance,
      market_cap_change_24h, volume_change_24h, active_cryptocurrencies, active_exchanges
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    today,
    numeric(asRecord(globalData.total_market_cap).usd),
    numeric(asRecord(globalData.total_volume).usd),
    numeric(asRecord(globalData.market_cap_percentage).btc),
    numeric(asRecord(globalData.market_cap_percentage).eth),
    numeric(asRecord(globalData.market_cap_percentage).sol),
    numeric(globalData.market_cap_change_percentage_24h_usd),
    numeric(globalData.volume_change_percentage_24h_usd),
    numeric(globalData.active_cryptocurrencies),
    numeric(globalData.active_exchanges),
  );
  await marketStmt.run();

  const tokenStmts = ['bitcoin', 'ethereum', 'solana', 'usd-coin', 'tether'].map(id => {
    const t = asRecord((prices as Record<string, unknown>)[id]);
    return db.prepare(
      'INSERT OR REPLACE INTO token_prices (symbol, date, price_usd, change_24h_pct, market_cap_usd, volume_24h_usd) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      id === 'bitcoin' ? 'BTC' : id === 'ethereum' ? 'ETH' : id === 'solana' ? 'SOL' : id === 'usd-coin' ? 'USDC' : 'USDT',
      today,
      numeric(t.usd),
      numeric(t.usd_24h_change),
      numeric(t.usd_market_cap),
      numeric(t.usd_24h_vol),
    );
  });
  await batchInsert(db, tokenStmts);
}

async function fetchDexNetworks(db: D1Database): Promise<void> {
  const today = todayStr();

  const [networksRaw, statsRaw] = await Promise.all([
    safeJson('https://api.dexpaprika.com/networks'),
    safeJson('https://api.dexpaprika.com/stats'),
  ]);

  const networkList = Array.isArray(networksRaw) ? networksRaw : [];
  const statsData = asRecord(statsRaw);

  const netStmts = (networkList as JsonRecord[]).slice(0, 20).map((net: JsonRecord) =>
    db.prepare(
      'INSERT OR REPLACE INTO dex_networks (network_id, date, name, volume_usd_24h, txns_24h, pools_count, tokens_count) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      String(net.id || ''),
      today,
      String(net.display_name || net.name || ''),
      numeric(net.volume_usd_24h),
      numeric(net.txns_24h),
      numeric(net.pools_count),
      null,
    ),
  );
  await batchInsert(db, netStmts);

  const statsStmt = db.prepare(
    'INSERT OR REPLACE INTO dex_stats (date, networks, dexes, pools, tokens) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    today,
    numeric(statsData.chains),
    numeric(statsData.factories),
    numeric(statsData.pools),
    numeric(statsData.tokens),
  );
  await statsStmt.run();
}

async function fetchEthPrices(db: D1Database): Promise<void> {
  const coverage = await getCoverage(db, 'eth_prices');
  if (isFresh(coverage.maxDate)) return;
  const limit = coverage.maxDate ? 60 : 500;
  const data = await safeJson(`https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1d&limit=${limit}`);
  if (!Array.isArray(data)) return;
  const stmts = (data as unknown[][])
    .map(candle => {
      const date = new Date(numeric(candle[0])).toISOString().split('T')[0];
      return { date, open: numeric(candle[1]), high: numeric(candle[2]), low: numeric(candle[3]), close: numeric(candle[4]), volume: numeric(candle[5]) };
    })
    .filter(row => needsDate(row.date, coverage))
    .map(row => db.prepare('INSERT OR REPLACE INTO eth_prices (date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?)').bind(row.date, row.open, row.high, row.low, row.close, row.volume));
  await batchInsert(db, stmts);
}

async function fetchSolPrices(db: D1Database): Promise<void> {
  const coverage = await getCoverage(db, 'sol_prices');
  if (isFresh(coverage.maxDate)) return;
  const limit = coverage.maxDate ? 60 : 500;
  const data = await safeJson(`https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1d&limit=${limit}`);
  if (!Array.isArray(data)) return;
  const stmts = (data as unknown[][])
    .map(candle => {
      const date = new Date(numeric(candle[0])).toISOString().split('T')[0];
      return { date, open: numeric(candle[1]), high: numeric(candle[2]), low: numeric(candle[3]), close: numeric(candle[4]), volume: numeric(candle[5]) };
    })
    .filter(row => needsDate(row.date, coverage))
    .map(row => db.prepare('INSERT OR REPLACE INTO sol_prices (date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?)').bind(row.date, row.open, row.high, row.low, row.close, row.volume));
  await batchInsert(db, stmts);
}

async function updateSummary(db: D1Database): Promise<void> {
  const latestTvl = await db
    .prepare("SELECT tvl_usd FROM chain_tvl WHERE chain = 'all' ORDER BY date DESC LIMIT 1")
    .first<{ tvl_usd: number | null }>();

  const topChain = await db
    .prepare(`
      SELECT chain FROM chain_tvl
      WHERE chain != 'all' AND date = (
        SELECT MAX(date) FROM chain_tvl WHERE chain != 'all'
      )
      ORDER BY tvl_usd DESC LIMIT 1
    `)
    .first<{ chain: string | null }>();

  const topProtocol = await db
    .prepare(`
      SELECT protocol FROM protocol_tvl
      WHERE date = (SELECT MAX(date) FROM protocol_tvl)
      ORDER BY tvl_usd DESC LIMIT 1
    `)
    .first<{ protocol: string | null }>();

  const stablecoins = await db
    .prepare('SELECT total_supply_usd FROM stablecoin_total ORDER BY date DESC LIMIT 1')
    .first<{ total_supply_usd: number | null }>();

  const dex = await db
    .prepare("SELECT daily_volume_usd FROM dex_volumes WHERE chain = 'all' ORDER BY date DESC LIMIT 1")
    .first<{ daily_volume_usd: number | null }>();

  const fees = await db
    .prepare("SELECT daily_fees_usd, daily_revenue_usd FROM protocol_fees WHERE slug = 'all' ORDER BY date DESC LIMIT 1")
    .first<{ daily_fees_usd: number | null; daily_revenue_usd: number | null }>();

  const btcDerivatives = await db
    .prepare("SELECT open_interest_usd, funding_rate FROM derivatives_data WHERE symbol = 'BTC' ORDER BY date DESC LIMIT 1")
    .first<{ open_interest_usd: number | null; funding_rate: number | null }>();

  const ethDerivatives = await db
    .prepare("SELECT open_interest_usd, funding_rate FROM derivatives_data WHERE symbol = 'ETH' ORDER BY date DESC LIMIT 1")
    .first<{ open_interest_usd: number | null; funding_rate: number | null }>();

  const solDerivatives = await db
    .prepare("SELECT open_interest_usd, funding_rate FROM derivatives_data WHERE symbol = 'SOL' ORDER BY date DESC LIMIT 1")
    .first<{ open_interest_usd: number | null; funding_rate: number | null }>();

  const defiOpenInterest = await db
    .prepare("SELECT open_interest_usd FROM derivatives_data WHERE symbol = 'DEFI' ORDER BY date DESC LIMIT 1")
    .first<{ open_interest_usd: number | null }>();

  const optionsVol = await db
    .prepare("SELECT volume_usd FROM options_volume WHERE chain = 'all' ORDER BY date DESC LIMIT 1")
    .first<{ volume_usd: number | null }>();

  const btcPrice = await db
    .prepare('SELECT close FROM btc_prices ORDER BY date DESC LIMIT 1')
    .first<{ close: number | null }>();

  const lendingTop = await db.prepare('SELECT protocol, tvl_usd FROM lending_data ORDER BY date DESC, tvl_usd DESC LIMIT 1').first<{ protocol: string | null; tvl_usd: number | null }>();
  const lendingTotal = await db.prepare("SELECT SUM(tvl_usd) as total FROM lending_data WHERE date = (SELECT MAX(date) FROM lending_data)").first<{ total: number | null }>();
  const bridgeTotal = await db.prepare("SELECT SUM(tvl_usd) as total FROM bridge_data WHERE date = (SELECT MAX(date) FROM bridge_data)").first<{ total: number | null }>();
  const bridgeTop = await db.prepare('SELECT protocol, tvl_usd FROM bridge_data ORDER BY date DESC, tvl_usd DESC LIMIT 1').first<{ protocol: string | null; tvl_usd: number | null }>();
  const market = await db.prepare('SELECT total_market_cap_usd, total_volume_24h_usd, btc_dominance, eth_dominance, sol_dominance, market_cap_change_24h FROM market_data ORDER BY date DESC LIMIT 1').first<Record<string, number | null>>();
  const ethPrice = await db.prepare('SELECT close FROM eth_prices ORDER BY date DESC LIMIT 1').first<{ close: number | null }>();
  const solPrice = await db.prepare('SELECT close FROM sol_prices ORDER BY date DESC LIMIT 1').first<{ close: number | null }>();

  const kv: Record<string, string> = {
    total_defi_tvl: String(latestTvl?.tvl_usd ?? 0),
    top_chain_by_tvl: topChain?.chain ?? '',
    top_protocol_by_tvl: topProtocol?.protocol ?? '',
    total_stablecoin_supply: String(stablecoins?.total_supply_usd ?? 0),
    total_dex_volume_24h: String(dex?.daily_volume_usd ?? 0),
    protocol_fees_24h: String(fees?.daily_fees_usd ?? 0),
    protocol_revenue_24h: String(fees?.daily_revenue_usd ?? 0),
    btc_open_interest: String(btcDerivatives?.open_interest_usd ?? 0),
    btc_funding_rate: String(btcDerivatives?.funding_rate ?? 0),
    eth_funding_rate: String(ethDerivatives?.funding_rate ?? 0),
    sol_funding_rate: String(solDerivatives?.funding_rate ?? 0),
    defi_perp_open_interest: String(defiOpenInterest?.open_interest_usd ?? 0),
    options_volume_24h: String(optionsVol?.volume_usd ?? 0),
    btc_price: String(btcPrice?.close ?? 0),
    eth_price: String(ethPrice?.close ?? 0),
    sol_price: String(solPrice?.close ?? 0),
    top_lending_protocol: lendingTop?.protocol ?? '',
    top_lending_tvl: String(lendingTop?.tvl_usd ?? 0),
    total_lending_tvl: String(lendingTotal?.total ?? 0),
    top_bridge: bridgeTop?.protocol ?? '',
    top_bridge_tvl: String(bridgeTop?.tvl_usd ?? 0),
    total_bridge_tvl: String(bridgeTotal?.total ?? 0),
    total_market_cap: String(market?.total_market_cap_usd ?? 0),
    total_crypto_volume: String(market?.total_volume_24h_usd ?? 0),
    btc_dominance: String(market?.btc_dominance ?? 0),
    eth_dominance: String(market?.eth_dominance ?? 0),
    sol_dominance: String(market?.sol_dominance ?? 0),
    market_cap_change_24h: String(market?.market_cap_change_24h ?? 0),
    last_updated: new Date().toISOString(),
  };

  const stmts = Object.entries(kv).map(([key, value]) =>
    db.prepare("INSERT OR REPLACE INTO metrilytics_summary (key, value, updated_at) VALUES (?, ?, datetime('now'))")
      .bind(key, value),
  );

  await batchInsert(db, stmts);
}

async function runStep(
  name: string,
  results: Record<string, string>,
  action: () => Promise<void>,
): Promise<void> {
  try {
    await action();
    results[name] = 'ok';
  } catch (error: unknown) {
    const message = errorMessage(error);
    console.error(`[metrilytics] step=${name} error=${message}`);
    results[name] = message;
  }
}

async function runAll(env: Env): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  await ensureSchema(env.METRILYTICS_DB);

  await runStep('globalTvl', results, () => fetchGlobalTvl(env.METRILYTICS_DB));
  await runStep('chainTvl', results, () => fetchChainTvl(env.METRILYTICS_DB));
  await runStep('protocols', results, () => fetchProtocols(env.METRILYTICS_DB));
  await runStep('fees', results, () => fetchFees(env.METRILYTICS_DB));
  await runStep('dexVolumes', results, () => fetchDexVolumes(env.METRILYTICS_DB));
  await runStep('stablecoins', results, () => fetchStablecoins(env.METRILYTICS_DB));
  await runStep('defiOpenInterest', results, () => fetchDefiOpenInterest(env.METRILYTICS_DB));
  await runStep('binanceDerivatives', results, () => fetchBinanceDerivatives(env.METRILYTICS_DB));
  await runStep('yields', results, () => fetchYields(env.METRILYTICS_DB));
  await runStep('optionsVolume', results, () => fetchOptionsVolume(env.METRILYTICS_DB));
  await runStep('btcPrices', results, () => fetchBtcPrices(env.METRILYTICS_DB));
  await runStep('ethPrices', results, () => fetchEthPrices(env.METRILYTICS_DB));
  await runStep('solPrices', results, () => fetchSolPrices(env.METRILYTICS_DB));
  await runStep('lendingData', results, () => fetchLendingData(env.METRILYTICS_DB));
  await runStep('bridgeData', results, () => fetchBridgeData(env.METRILYTICS_DB));
  await runStep('marketData', results, () => fetchMarketData(env.METRILYTICS_DB));
  await runStep('dexNetworks', results, () => fetchDexNetworks(env.METRILYTICS_DB));
  await runStep('liquidations', results, () => ingestLiquidations(env.METRILYTICS_DB));
  await runStep('etfAndInstitutional', results, () => ingestETFAndInstitutional(env.METRILYTICS_DB));
  await runStep('protocolMcap', results, () => fetchProtocolMcap(env.METRILYTICS_DB));
  await runStep('dexProtocols', results, () => fetchDexProtocols(env.METRILYTICS_DB));
  await runStep('summary', results, () => updateSummary(env.METRILYTICS_DB));

  return results;
}

// ============================================================
// LIQUIDATIONS INGESTION
// ============================================================

interface LiquidationEvent {
  symbol: string;
  side: 'long' | 'short';
  size_usd: number;
  price: number;
  exchange: string;
  timestamp: string;
  type?: string;
  leverage?: number;
}

interface BinanceLiquidationRow {
  symbol: string;
  side: 'SELL' | 'BUY';
  price: string;
  executedQty: string;
  time: number;
}

interface BybitLiquidationRow {
  symbol: string;
  side: 'Sell' | 'Buy';
  price: string;
  size: string;
  time: string;
  leverage?: string;
}

interface OkxLiquidationRow {
  instId: string;
  posSide: string;
  px: string;
  sz: string;
  ts: string;
}

interface HyperliquidLiquidationRow {
  coin: string;
  side: 'A' | 'B';
  px: string;
  sz: string;
  time: number;
  leverage?: string;
}

async function ingestLiquidations(db: D1Database): Promise<void> {
  const symbols = ['BTC', 'ETH', 'SOL'];
  const exchanges = ['binance', 'bybit', 'okx', 'hyperliquid'];
  
  // Fetch last ingestion timestamp to avoid duplicates
  const lastIngestion = await db.prepare(
    'SELECT MAX(timestamp) as last_ts FROM liquidations_data'
  ).first<{ last_ts: string | null }>();
  
  const since = lastIngestion?.last_ts 
    ? new Date(lastIngestion.last_ts).getTime() 
    : Date.now() - 3600_000; // Default: last 1 hour
  
  const tasks: (() => Promise<void>)[] = [];
  
  for (const exchange of exchanges) {
    for (const symbol of symbols) {
      tasks.push(async () => {
        try {
          const liquidations = await fetchLiquidationsFromExchange(exchange, symbol, since);
          await insertLiquidations(db, liquidations);
        } catch (error) {
          logWarn(`[liquidations] Failed to ingest ${exchange}:${symbol}: ${errorMessage(error)}`);
        }
      });
    }
  }
  
  // Run with concurrency limit to avoid rate limits
  await parallel(tasks, 4); // 4 concurrent requests
  
  console.log(`[liquidations] Ingestion complete. Symbols: ${symbols.length}, Exchanges: ${exchanges.length}`);
}

async function fetchLiquidationsFromExchange(
  exchange: string, 
  symbol: string, 
  since: number
): Promise<LiquidationEvent[]> {
  switch (exchange) {
    case 'binance':
      return fetchBinanceLiquidations(symbol, since);
    case 'bybit':
      return fetchBybitLiquidations(symbol, since);
    case 'okx':
      return fetchOKXLiquidations(symbol, since);
    case 'hyperliquid':
      return fetchHyperliquidLiquidations(symbol, since);
    default:
      return [];
  }
}

async function fetchBinanceLiquidations(symbol: string, since: number): Promise<LiquidationEvent[]> {
  const url = `https://fapi.binance.com/fapi/v1/allForceOrders?symbol=${symbol}USDT&limit=1000&startTime=${since}`;
  const data = await safeJson(url);
  
  if (!Array.isArray(data)) return [];
  
  return data.map((raw: BinanceLiquidationRow) => ({
    symbol: raw.symbol.replace('USDT', ''),
    side: raw.side === 'SELL' ? 'long' : 'short', // SELL = closing long = long liquidation
    size_usd: parseFloat(raw.price) * parseFloat(raw.executedQty),
    price: parseFloat(raw.price),
    exchange: 'binance',
    timestamp: new Date(raw.time).toISOString(),
    type: 'cross'
  }));
}

async function fetchBybitLiquidations(symbol: string, since: number): Promise<LiquidationEvent[]> {
  const url = `https://api.bybit.com/v5/market/liquidation?category=linear&symbol=${symbol}USDT&limit=200`;
  const data = await safeJson(url);
  
  if (!data || typeof data !== 'object' || !('result' in data)) return [];
  const result = (data as { result: unknown }).result;
  if (!result || typeof result !== 'object' || !Array.isArray((result as { list: unknown }).list)) return [];
  const rows = (result as { list: BybitLiquidationRow[] }).list;
  
  return rows
    .filter((raw) => parseInt(raw.time) >= since)
    .map((raw) => ({
      symbol: raw.symbol.replace('USDT', ''),
      side: raw.side === 'Sell' ? 'long' : 'short',
      size_usd: parseFloat(raw.price) * parseFloat(raw.size),
      price: parseFloat(raw.price),
      exchange: 'bybit',
      timestamp: new Date(parseInt(raw.time)).toISOString(),
      leverage: raw.leverage ? parseFloat(raw.leverage) : undefined,
      type: 'cross'
    }));
}

async function fetchOKXLiquidations(symbol: string, since: number): Promise<LiquidationEvent[]> {
  const url = `https://www.okx.com/api/v5/public/liquidation-orders?instType=SWAP&instId=${symbol}-USDT-SWAP&limit=100`;
  const data = await safeJson(url);
  
  if (!data || typeof data !== 'object' || !('data' in data)) return [];
  const rows = (data as { data: unknown }).data;
  if (!Array.isArray(rows)) return [];
  
  return rows
    .filter((raw: OkxLiquidationRow) => parseInt(raw.ts) >= since)
    .map((raw: OkxLiquidationRow) => ({
      symbol: raw.instId.replace('-USDT-SWAP', ''),
      side: raw.posSide === 'long' ? 'long' : 'short',
      size_usd: parseFloat(raw.px) * parseFloat(raw.sz),
      price: parseFloat(raw.px),
      exchange: 'okx',
      timestamp: new Date(parseInt(raw.ts)).toISOString(),
      type: 'cross'
    }));
}

async function fetchHyperliquidLiquidations(symbol: string, since: number): Promise<LiquidationEvent[]> {
  const url = 'https://api.hyperliquid.xyz/info';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'liquidations', coin: symbol })
    });
    
    if (!response.ok) return [];
    const data: unknown = await response.json();
    
    if (!Array.isArray(data)) return [];
    
    return data
      .filter((raw: HyperliquidLiquidationRow) => raw.time >= since)
      .map((raw: HyperliquidLiquidationRow) => ({
        symbol: raw.coin,
        side: raw.side === 'A' ? 'long' : 'short', // A = ask (sell) = long liquidation
        size_usd: parseFloat(raw.px) * parseFloat(raw.sz),
        price: parseFloat(raw.px),
        exchange: 'hyperliquid',
        timestamp: new Date(raw.time).toISOString(),
        leverage: raw.leverage ? parseFloat(raw.leverage) : undefined,
        type: 'cross'
      }));
  } catch (error) {
    logWarn(`[hyperliquid] fetch error: ${errorMessage(error)}`);
    return [];
  }
}

async function insertLiquidations(db: D1Database, events: LiquidationEvent[]): Promise<void> {
  if (!events.length) return;
  
  const stmts = events.map(e => 
    db.prepare(`
      INSERT OR IGNORE INTO liquidations_data 
      (symbol, side, size_usd, price, exchange, timestamp, type, leverage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      e.symbol, 
      e.side, 
      e.size_usd, 
      e.price, 
      e.exchange, 
      e.timestamp, 
      e.type || 'cross', 
      e.leverage || null
    )
  );
  
  await batchInsert(db, stmts);
}

// ============================================================
// ETF FLOWS & INSTITUTIONAL HOLDINGS INGESTION
// ============================================================

interface ETFFlowData {
  etf_symbol: string;
  etf_name: string;
  asset: 'BTC' | 'ETH';
  date: string;
  daily_flow_usd: number;
  cumulative_flow_usd: number | null;
  aum_usd: number | null;
  btc_holdings: number | null;
  eth_holdings: number | null;
  premium_pct: number | null;
}

interface InstitutionalHolding {
  entity_name: string;
  entity_type: string;
  country: string;
  btc_holdings: number;
  eth_holdings: number | null;
  usd_value: number;
  pct_total_supply: number;
  change_30d: number | null;
  change_30d_usd: number | null;
  last_update: string;
}

async function ingestETFAndInstitutional(db: D1Database): Promise<void> {
  // 1. Fetch ETF flows (BTC and ETH)
  const [btcFlows, ethFlows] = await Promise.all([
    fetchFarsideETFFlows('BTC'),
    fetchFarsideETFFlows('ETH')
  ]);
  
  // 2. Fetch institutional holdings
  const institutional = await fetchInstitutionalHoldings();
  
  // 3. Insert ETF flows
  const allFlows = [...btcFlows, ...ethFlows];
  if (allFlows.length) {
    const stmts = allFlows.map(flow =>
      db.prepare(`
        INSERT OR REPLACE INTO etf_flows 
        (etf_symbol, etf_name, asset, date, daily_flow_usd, cumulative_flow_usd, aum_usd, btc_holdings, eth_holdings, premium_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        flow.etf_symbol,
        flow.etf_name,
        flow.asset,
        flow.date,
        flow.daily_flow_usd,
        flow.cumulative_flow_usd,
        flow.aum_usd,
        flow.btc_holdings,
        flow.eth_holdings,
        flow.premium_pct
      )
    );
    
    await batchInsert(db, stmts);
    console.log(`[etf] Ingested ${allFlows.length} ETF flow records`);
  }
  
  // 4. Insert institutional holdings
  if (institutional.length) {
    const stmts = institutional.map(inst =>
      db.prepare(`
        INSERT OR REPLACE INTO institutional_holdings 
        (entity_name, entity_type, country, btc_holdings, eth_holdings, usd_value, pct_total_supply, change_30d, change_30d_usd, last_update)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        inst.entity_name,
        inst.entity_type,
        inst.country,
        inst.btc_holdings,
        inst.eth_holdings,
        inst.usd_value,
        inst.pct_total_supply,
        inst.change_30d,
        inst.change_30d_usd,
        inst.last_update
      )
    );
    
    await batchInsert(db, stmts);
    console.log(`[institutional] Ingested ${institutional.length} holdings records`);
  }
  
  // 5. Update cumulative flows
  await updateCumulativeFlows(db);
}

async function fetchFarsideETFFlows(asset: 'BTC' | 'ETH'): Promise<ETFFlowData[]> {
  const url = asset === 'BTC' 
    ? 'https://farside.co.uk/bitcoin-etf-flow-all-data/'
    : 'https://farside.co.uk/eth/';
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NOVRIX-Bot/1.0)',
        'Accept': 'text/html'
      },
      signal: AbortSignal.timeout(30_000)
    });
    
    if (!response.ok) {
      logWarn(`[farside] HTTP ${response.status} for ${asset}`);
      return [];
    }
    
    const html = await response.text();
    
    // Extract table
    const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) {
      logWarn(`[farside] No table found for ${asset}`);
      return [];
    }
    
    const tableHtml = tableMatch[1];
    
    // Extract headers (ETF symbols)
    const headerMatch = tableHtml.match(/<thead>([\s\S]*?)<\/thead>/i);
    const headers: string[] = [];
    
    if (headerMatch) {
      const thMatches = headerMatch[1].matchAll(/<th[^>]*>(.*?)<\/th>/gi);
      for (const match of thMatches) {
        const text = match[1].replace(/<[^>]*>/g, '').trim();
        headers.push(text);
      }
    }
    
    // Extract data rows
    const tbodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) return [];
    
    const rowMatches = tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    const flows: ETFFlowData[] = [];
    
    for (const rowMatch of rowMatches) {
      const rowHtml = rowMatch[1];
      const cellMatches = rowHtml.matchAll(/<td[^>]*>(.*?)<\/td>/gi);
      const cells: string[] = [];
      
      for (const cellMatch of cellMatches) {
        const text = cellMatch[1].replace(/<[^>]*>/g, '').trim();
        cells.push(text);
      }
      
      if (cells.length < 2) continue;
      
      const dateStr = cells[0];
      const date = parseFarsideDate(dateStr);
      
      // Parse each ETF column (skip last column = Total)
      for (let i = 1; i < cells.length - 1 && i < headers.length; i++) {
        const etfSymbol = headers[i];
        const flowStr = cells[i];
        
        // Parse flow value (parentheses = negative)
        let flow = 0;
        if (flowStr.startsWith('(') && flowStr.endsWith(')')) {
          flow = -parseFloat(flowStr.slice(1, -1).replace(/,/g, ''));
        } else if (flowStr !== '-' && flowStr !== '') {
          flow = parseFloat(flowStr.replace(/,/g, ''));
        }
        
        const flowUsd = flow * 1_000_000; // Convert millions to USD
        
        if (!isNaN(flowUsd) && flowUsd !== 0) {
          flows.push({
            etf_symbol: etfSymbol,
            etf_name: getETFFullName(etfSymbol),
            asset,
            date,
            daily_flow_usd: flowUsd,
            cumulative_flow_usd: null,
            aum_usd: null,
            btc_holdings: null,
            eth_holdings: null,
            premium_pct: null
          });
        }
      }
    }
    
    return flows;
    
  } catch (error) {
    logWarn(`[farside] fetch error for ${asset}: ${errorMessage(error)}`);
    return [];
  }
}

function parseFarsideDate(dateStr: string): string {
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  const parts = dateStr.trim().split(' ');
  if (parts.length !== 3) return new Date().toISOString().split('T')[0];
  
  const day = parts[0].padStart(2, '0');
  const month = months[parts[1]] || '01';
  const year = parts[2];
  
  return `${year}-${month}-${day}`;
}

function getETFFullName(symbol: string): string {
  const names: Record<string, string> = {
    'IBIT': 'iShares Bitcoin Trust',
    'FBTC': 'Fidelity Wise Origin Bitcoin Fund',
    'GBTC': 'Grayscale Bitcoin Trust',
    'ARKB': 'ARK 21Shares Bitcoin ETF',
    'BITB': 'Bitwise Bitcoin ETF',
    'HODL': 'VanEck Bitcoin Trust',
    'BRRR': 'Valkyrie Bitcoin Fund',
    'EZBC': 'Franklin Bitcoin ETF',
    'BTCW': 'WisdomTree Bitcoin Fund',
    'ETHA': 'iShares Ethereum Trust',
    'FETH': 'Fidelity Ethereum Fund',
    'ETHW': 'Bitwise Ethereum ETF',
    'ETHE': 'Grayscale Ethereum Trust',
    'ETH': 'VanEck Ethereum ETF'
  };
  
  return names[symbol] || symbol;
}

async function fetchInstitutionalHoldings(): Promise<InstitutionalHolding[]> {
  const url = 'https://api.coingecko.com/api/v3/companies/public_treasury/bitcoin';
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NOVRIX-Metrilytics/3.0'
      },
      signal: AbortSignal.timeout(20_000)
    });
    
    if (!response.ok) {
      logWarn(`[coingecko] HTTP ${response.status}`);
      return [];
    }
    
    const data = (await response.json()) as {
      companies?: Array<{
        name?: string;
        country?: string;
        total_holdings?: number;
        total_current_value_usd?: number;
        percentage_of_total_supply?: number;
      }>;
    };

    if (!data || !Array.isArray(data.companies)) return [];

    return (data.companies ?? []).map((company) => ({
      entity_name: company.name || 'Unknown',
      entity_type: 'public_company',
      country: company.country || 'US',
      btc_holdings: company.total_holdings || 0,
      eth_holdings: null,
      usd_value: company.total_current_value_usd || 0,
      pct_total_supply: company.percentage_of_total_supply || 0,
      change_30d: null,
      change_30d_usd: null,
      last_update: new Date().toISOString().split('T')[0]
    }));
    
  } catch (error) {
    logWarn(`[coingecko] fetch error: ${errorMessage(error)}`);
    return [];
  }
}

async function updateCumulativeFlows(db: D1Database): Promise<void> {
  await db.prepare(`
    UPDATE etf_flows
    SET cumulative_flow_usd = (
      SELECT SUM(daily_flow_usd)
      FROM etf_flows AS e2
      WHERE e2.etf_symbol = etf_flows.etf_symbol
        AND e2.date <= etf_flows.date
    )
  `).run();
}

// ============================================================
// PROTOCOL MARKET CAP INGESTION
// ============================================================

async function fetchProtocolMcap(db: D1Database): Promise<void> {
  const url = 'https://api.llama.fi/protocols';
  const data = await safeJson(url);
  
  if (!Array.isArray(data)) {
    logWarn('[protocols] Invalid response format');
    return;
  }
  
  const date = todayStr();
  const stmts: D1PreparedStatement[] = [];
  
  for (const protocol of data) {
    const slug = String(protocol.slug || '').trim();
    const name = String(protocol.name || '').trim();
    const mcap = numeric(protocol.mcap);
    const symbol = String(protocol.symbol || '').trim();
    
    // Skip if no mcap data
    if (!slug || !name || mcap === 0) continue;
    
    stmts.push(
      db.prepare(`
        INSERT OR REPLACE INTO protocol_mcap 
        (protocol, slug, date, mcap_usd, token_price, token_symbol)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        name,
        slug,
        date,
        mcap,
        null, // token_price (not in DeFiLlama response)
        symbol
      )
    );
  }
  
  if (stmts.length) {
    await batchInsert(db, stmts);
    console.log(`[protocols] Ingested ${stmts.length} mcap records`);
  }
}

// ============================================================
// PER-PROTOCOL DEX VOLUME  (DeFiLlama free /overview/dexs protocols array)
// ============================================================

async function fetchDexProtocols(db: D1Database): Promise<void> {
  const today = todayStr();
  const data = asRecord(await safeJson('https://api.llama.fi/overview/dexs?dataType=dailyVolume'));
  const protocols = Array.isArray(data.protocols) ? (data.protocols as JsonRecord[]) : [];
  if (!protocols.length) {
    logWarn('[dexProtocols] no protocols in /overview/dexs');
    return;
  }

  const stmts = protocols.map((p) =>
    db.prepare(
      `INSERT OR REPLACE INTO dex_protocol_volume
       (protocol, slug, date, volume_24h, volume_30d, volume_1y, volume_all_time,
        change_1d, change_7d, change_30d, category, chains)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      String(p.displayName || p.name || ''),
      String(p.defillamaId || p.module || ''),
      today,
      numeric(p.total24h),
      numeric(p.total30d),
      numeric(p.total1y),
      numeric(p.totalAllTime),
      numeric(p.change_1d),
      numeric(p.change_7d),
      numeric(p.change_30d),
      String(p.category || ''),
      Array.isArray(p.chains) ? (p.chains as string[]).slice(0, 6).join(', ') : String(p.chains || ''),
    ),
  );

  if (stmts.length) await batchInsert(db, stmts);
  console.log(`[dexProtocols] Ingested ${stmts.length} per-protocol DEX volume rows`);
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runAll(env);
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      const checks: Record<string, { ok: boolean; detail?: string }> = {};
      let healthy = true;
      try {
        await env.METRILYTICS_DB.prepare('SELECT 1').first();
        checks.d1 = { ok: true };
      } catch (e) {
        checks.d1 = { ok: false, detail: String(e) };
        healthy = false;
      }
      const status = healthy ? 200 : 503;
      return Response.json(
        { success: healthy, checks, timestamp: new Date().toISOString() },
        { status }
      );
    }

    if (!request.headers.get('x-trigger-secret')?.includes('novrix-metrilytics-2026')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const results = await runAll(env);
    const hasErrors = Object.values(results).some(result => result !== 'ok');

    return new Response(
      JSON.stringify({ success: !hasErrors, results, ts: new Date().toISOString() }),
      { status: hasErrors ? 207 : 200, headers: { 'Content-Type': 'application/json' } },
    );
  },
};
