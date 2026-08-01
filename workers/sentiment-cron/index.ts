/**
 * NOVRIX Sentiment Cron Worker
 *
 * Schedules:
 *   Hourly 06:00-23:00 UTC — BGeometrics API jobs are split into 3-job slots.
 *
 * BGeometrics strategy:
 *   - Sequential fetches in bounded slots (free plan: 8 req/hr)
 *   - Maximum 3 indicators per hour; each may retry once after 60 seconds
 *   - D1-backed rolling 60-minute request budget prevents duplicate cron fires exceeding 8/hr
 *   - Upsert: query latest date in D1, refetch a 7-day overlap, and replace by date
 *   - First run or shallow-table repair seeds full history from 2013
 *   - Subsequent daily runs insert ~1 new record per indicator
 *   - Batch insert in chunks of 100 (D1 statement size limit)
 */


const BGEOMETRICS_BASE = 'https://api.bgeometrics.com/v1';
const BGEOMETRICS_START = '2013-01-01';
const BGEOMETRICS_API_LIMIT_PER_HOUR = 8;
const BGEOMETRICS_API_LIMIT_WINDOW_SECONDS = 3600;
const BGEOMETRICS_API_BUDGET_KEY_PREFIX = 'sentiment-cron:bgeometrics-api';
const BGEOMETRICS_API_JOBS_PER_SLOT = 3;
const BGEOMETRICS_RETRY_DELAY_MS = 60_000;
const BGEOMETRICS_OVERLAP_DAYS = 7;
const BGEOMETRICS_MIN_FULL_HISTORY_ROWS = 30;
const BGEOMETRICS_SLOT_START_HOUR_UTC = 6;
const BGEOMETRICS_FRESHNESS_STALE_THRESHOLD_DAYS = 2;
const BGEOMETRICS_UPSTREAM_STALE_CONSECUTIVE_DAYS = 5;
const BGEOMETRICS_UPSTREAM_STALE_KEY_PREFIX = 'sentiment-cron:upstream-stale';
const BGEOMETRICS_UPSTREAM_STALE_ATTEMPT_KEY_PREFIX = 'sentiment-cron:upstream-stale-attempt';
const BGEOMETRICS_UPSTREAM_STALE_RETENTION_DAYS = 90;
const KNOWN_UPSTREAM_DELAYED_TABLES = new Set(['etf_data']);

interface BGeometricsRecord {
  d: string;       // date "YYYY-MM-DD"
  unixTs: string;  // unix timestamp as string
  [key: string]: string | null | undefined; // metric value as string
}

type UpdateResult = {
  inserted?: number;
  skipped?: boolean;
  fetched?: number;
  success?: boolean;
  error?: string;
  statusCode?: number | string | null;
  endpointUrl?: string;
  reason?: string;
  [key: string]: unknown;
};

/**
 * Each entry maps an indicator key to:
 *  - path: BGeometrics endpoint path
 *  - field: response field name containing the metric value
 *  - table: D1 table name
 *  - column: D1 column name to insert into
 */
const BGEOMETRICS_ENDPOINTS: Record<string, {
  path: string;
  field: string;
  table: string;
  column: string;
  extraColumns?: Record<string, string | number>;
}> = {
  // ── Priority: stale user-facing series must get the first limited requests ──
  hashrate: {
    path: 'hashrate',
    field: 'hashrate',
    table: 'hashrate_data',
    column: 'hashrate',
  },
  supply_profit: {
    path: 'supply-profit',
    field: 'supplyProfitBtc',
    table: 'supply_profit_data',
    column: 'supply_in_profit',
  },
  supply_loss: {
    path: 'supply-loss',
    field: 'supplyLossBtc',
    table: 'supply_loss_data',
    column: 'supply_in_loss',
  },
  ssr: {
    path: 'ssr',
    field: 'ssrStablecoin',
    table: 'ssr_data',
    column: 'ssr',
  },
  btc_price: {
    path: 'btc-price',
    field: 'btcPrice',
    table: 'btc_price_data',
    column: 'price',
  },
  nupl: {
    path: 'nupl',
    field: 'nupl',
    table: 'nupl_data',
    column: 'nupl',
  },
  mvrv: {
    path: 'mvrv',
    field: 'mvrv',
    table: 'mvrv_data',
    column: 'mvrv',
  },
  sopr: {
    path: 'sopr',
    field: 'sopr',
    table: 'sopr_data',
    column: 'sopr',
  },
  sth_mvrv: {
    path: 'sth-mvrv',
    field: 'sthMvrv',
    table: 'sth_mvrv_data',
    column: 'sth_mvrv',
  },
  realized_profit: {
    path: 'realized-profit',
    field: 'realizedProfit',
    table: 'realized_profit_data',
    column: 'realized_profit',
  },
  realized_loss: {
    path: 'realized-loss',
    field: 'realizedLoss',
    table: 'realized_loss_data',
    column: 'realized_loss',
  },
  lth_mvrv: {
    path: 'lth-mvrv',
    field: 'lthMvrv',
    table: 'lth_mvrv_data',
    column: 'lth_mvrv',
  },
  // Moved from KEY4 — KEY4 has no valid token, KEY1 has 3 spare slots under the 15/day limit
  week_ma_200: {
    path: '200-week-ma',
    field: 'ma200w',
    table: 'week_ma_200_data',
    column: 'value',
  },
};


interface Key2Field {
  apiField: string;
  column: string;
  type: 'real' | 'text';
}

interface Key2Endpoint {
  path: string;
  table: string;
  fields: Key2Field[];
  dateField?: string; // optional override for endpoints that use a non-'d' date key
}

const KEY2_ENDPOINTS: Record<string, Key2Endpoint> = {
  active_addresses: {
    path: 'active-addresses',
    table: 'active_addresses_data',
    fields: [{ apiField: 'activeAddresses', column: 'value', type: 'real' }],
  },
  supply_shock_ratio: {
    path: 'supply-shock-ratio',
    table: 'supply_shock_data',
    fields: [{ apiField: 'supplyShockRatio', column: 'value', type: 'real' }],
  },
  hashribbons: {
    path: 'hashribbons',
    table: 'hashribbons_data',
    fields: [
      { apiField: 'sma_30',      column: 'sma_30',  type: 'real' },
      { apiField: 'sma_60',      column: 'sma_60',  type: 'real' },
      { apiField: 'hashribbons', column: 'signal',  type: 'text' },
    ],
  },
  puell_multiple: {
    path: 'puell-multiple',
    table: 'puell_data',
    fields: [{ apiField: 'puellMultiple', column: 'value', type: 'real' }],
  },
  mayer_multiple: {
    path: 'mayer-multiple',
    table: 'mayer_data',
    fields: [{ apiField: 'mayerMultiple', column: 'value', type: 'real' }],
  },
  reserve_risk: {
    path: 'reserve-risk',
    table: 'reserve_risk_data',
    fields: [{ apiField: 'reserveRisk', column: 'value', type: 'real' }],
  },
  aviv: {
    path: 'aviv',
    table: 'aviv_data',
    fields: [{ apiField: 'aviv', column: 'value', type: 'real' }],
  },
  vdd: {
    path: 'vdd',
    table: 'vdd_data',
    fields: [{ apiField: 'vdd', column: 'value', type: 'real' }],
  },
  hot_supply: {
    path: 'hot-supply',
    table: 'hot_supply_data',
    fields: [
      { apiField: 'hotSupply',    column: 'hot_supply',     type: 'real' },
      { apiField: 'hotSupplyUsd', column: 'hot_supply_usd', type: 'real' },
    ],
  },
};


const KEY3_ENDPOINTS: Record<string, Key2Endpoint> = {
  open_interest: {
    // Open interest commonly lags the daily close by one UTC day. On
    // 2026-05-11 the public BGeometrics chart file and D1 both stopped at
    // 2026-05-09; treat a one-day lag here as upstream timing, not a cron bug.
    path: 'open-interest-futures',
    table: 'open_interest_data',
    fields: [{ apiField: 'openInterestFutures', column: 'value', type: 'real' }],
  },
  nrpl: {
    path: 'nrpl-btc',
    table: 'nrpl_data',
    fields: [{ apiField: 'nrplBtc', column: 'value', type: 'real' }],
  },
  rhodl_ratio: {
    path: 'rhodl-ratio',
    table: 'rhodl_data',
    fields: [{ apiField: 'rhodlRatio', column: 'value', type: 'real' }],
  },
  funding_rate: {
    path: 'funding-rate',
    table: 'funding_rate_data',
    fields: [{ apiField: 'fundingRate', column: 'value', type: 'real' }],
  },

  nvts: {
    path: 'nvts',
    table: 'nvts_data',
    fields: [{ apiField: 'nvts', column: 'value', type: 'real' }],
  },
  nvt_zscore: {
    path: 'nvt-zscore',
    table: 'nvt_zscore_data',
    fields: [{ apiField: 'nvtZscore', column: 'value', type: 'real' }],
  },
  cvdd: {
    path: 'cvdd',
    table: 'cvdd_data',
    fields: [{ apiField: 'cvdd', column: 'value', type: 'real' }],
  },
};

const OPEN_INTEREST_EXCHANGE_FIELDS = [
  'binance',
  'bybit',
  'okx',
  'bitget',
  'deribit',
  'bitmex',
  'huobi',
  'bitfinex',
  'gateIo',
  'kucoin',
  'kraken',
  'cryptoCom',
  'dydx',
  'deltaExchange',
] as const;


const KEY4_ENDPOINTS: Record<string, Key2Endpoint> = {
  market_cap: {
    path: 'market-cap',
    table: 'market_cap_data',
    fields: [{ apiField: 'marketCap', column: 'value', type: 'real' }],
  },
  // week_ma_200 moved to BGEOMETRICS_ENDPOINTS (KEY1) — KEY4 has no valid token
  highly_liquid_supply: {
    path: 'highly-liquid-supply',
    table: 'highly_liquid_data',
    fields: [{ apiField: 'highlyLiquidSupply', column: 'value', type: 'real' }],
  },
  lth_position_change: {
    path: 'lth-net-position-change-30d-btc',
    table: 'lth_position_change_data',
    fields: [{ apiField: 'lthNetPositionChange30dBtc', column: 'value', type: 'real' }],
  },
  sth_position_change: {
    path: 'sth-net-position-change-30d-btc',
    table: 'sth_position_change_data',
    fields: [{ apiField: 'sthNetPositionChange30dBtc', column: 'value', type: 'real' }],
  },
  mpi: {
    path: 'miner-position-index',
    table: 'mpi_data',
    fields: [{ apiField: 'mpi', column: 'value', type: 'real' }],
  },
  miner_sell_pressure: {
    path: 'miner-sell-pressure',
    table: 'miner_sell_pressure_data',
    fields: [{ apiField: 'minerSellPressure', column: 'value', type: 'real' }],
  },
  utxo_profit: {
    path: 'utxos-in-profit-pct',
    table: 'utxo_profit_data',
    fields: [{ apiField: 'utxosInProfitPct', column: 'value', type: 'real' }],
  },
  utxo_loss: {
    path: 'utxos-in-loss-pct',
    table: 'utxo_loss_data',
    fields: [{ apiField: 'utxosInLossPct', column: 'value', type: 'real' }],
  },
  // realized_price last — uses 'theDay' date field (may be 'd' in current API);
  // deprioritized so other indicators are not blocked when this endpoint needs catch-up.
  realized_price: {
    path: 'realized-price',
    table: 'realized_price_data',
    dateField: 'theDay', // BGeometrics realized-price may return 'theDay' or 'd'; fallback handled in updateKey4Indicator
    fields: [{ apiField: 'realizedPrice', column: 'value', type: 'real' }],
  },
};


const CMC_API_URL = 'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest';
const COINGECKO_BTC_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart';
const COINGECKO_ETH_URL = 'https://api.coingecko.com/api/v3/coins/ethereum/market_chart';

// MOVED to workers/fred-cron/index.ts — runs at 07:00 UTC separately
// to avoid exceeding the 50-subrequest/invocation limit.
//
const _FRED_ENDPOINTS_PLACEHOLDER = {  // not called from this worker
// vvv entries below are inert — kept for reference only, not executed vvv
  dxy:       { seriesId: 'DTWEXBGS',          table: 'dxy_data' },
  vix:       { seriesId: 'VIXCLS',            table: 'vix_data' },
  fedfunds:  { seriesId: 'FEDFUNDS',          table: 'fedfunds_data' },
  sp500:     { seriesId: 'SP500',             table: 'sp500_data' },
  gold:      { seriesId: 'GOLDAMGBD228NLBM',  table: 'gold_data' },
  m2:        { seriesId: 'M2SL',              table: 'm2_data', scale: 1_000_000_000 },

  walcl:     { seriesId: 'WALCL',             table: 'fred_walcl_data' },     // raw: millions USD
  rrpontsyd: { seriesId: 'RRPONTSYD',         table: 'fred_rrpontsyd_data' }, // raw: millions USD

  cpiaucsl:  { seriesId: 'CPIAUCSL',          table: 'fred_cpiaucsl_data' },
  cpilfesl:  { seriesId: 'CPILFESL',          table: 'fred_cpilfesl_data' },
  pcepi:     { seriesId: 'PCEPI',             table: 'fred_pcepi_data' },
  pcepilfe:  { seriesId: 'PCEPILFE',          table: 'fred_pcepilfe_data' },
  mich:      { seriesId: 'MICH',              table: 'fred_mich_data' },
  t5yie:     { seriesId: 'T5YIE',             table: 'fred_t5yie_data' },
  t10yie:    { seriesId: 'T10YIE',            table: 'fred_t10yie_data' },

  dgs1mo:    { seriesId: 'DGS1MO',            table: 'fred_dgs1mo_data' },
  dgs3mo:    { seriesId: 'DGS3MO',            table: 'fred_dgs3mo_data' },
  dgs6mo:    { seriesId: 'DGS6MO',            table: 'fred_dgs6mo_data' },
  dgs1:      { seriesId: 'DGS1',              table: 'fred_dgs1_data' },
  dgs5:      { seriesId: 'DGS5',              table: 'fred_dgs5_data' },
  dgs20:     { seriesId: 'DGS20',             table: 'fred_dgs20_data' },
  dgs30:     { seriesId: 'DGS30',             table: 'fred_dgs30_data' },
  t10y2y:    { seriesId: 'T10Y2Y',            table: 'fred_t10y2y_data' },
  t10y3m:    { seriesId: 'T10Y3M',            table: 'fred_t10y3m_data' },

  mabmm301:  { seriesId: 'MABMM301USM189S',   table: 'fred_mabmm301_data' },  // raw: billions USD

  unrate:    { seriesId: 'UNRATE',            table: 'fred_unrate_data' },
  payems:    { seriesId: 'PAYEMS',            table: 'fred_payems_data' },     // raw: thousands of persons
  icsa:      { seriesId: 'ICSA',              table: 'fred_icsa_data' },
  jtsjol:    { seriesId: 'JTSJOL',            table: 'fred_jtsjol_data' },     // raw: thousands
  emratio:   { seriesId: 'EMRATIO',           table: 'fred_emratio_data' },

  gdpc1:     { seriesId: 'GDPC1',             table: 'fred_gdpc1_data' },      // raw: billions chained 2017 USD
  indpro:    { seriesId: 'INDPRO',            table: 'fred_indpro_data' },
  houst:     { seriesId: 'HOUST',             table: 'fred_houst_data' },      // raw: thousands of units
  umcsent:   { seriesId: 'UMCSENT',           table: 'fred_umcsent_data' },
  rsxfs:     { seriesId: 'RSXFS',             table: 'fred_rsxfs_data' },      // raw: millions USD

  dcoilwtico:    { seriesId: 'DCOILWTICO',        table: 'fred_dcoilwtico_data' },
  bamlh0a0hym2:  { seriesId: 'BAMLH0A0HYM2',      table: 'fred_bamlh0a0hym2_data' },
  mortgage30us:  { seriesId: 'MORTGAGE30US',       table: 'fred_mortgage30us_data' },

} as const;
void _FRED_ENDPOINTS_PLACEHOLDER;  // suppress unused warning

// Only endpoints confirmed in BGeometrics free plan:
//   stablecoin-supply → sum of usdt+usdc+dai+busd+gusd+pax
//   etf-btc-total     → etfBtcTotal field (total BTC in spot ETFs)

interface BgFreeEndpoint {
  path: string;
  table: string;
  computeValue: (record: Record<string, string>) => number;
}

const BGFREE_ENDPOINTS: Record<string, BgFreeEndpoint> = {
  stablecoin_supply: {
    path: 'stablecoin-supply',
    table: 'stablecoin_supply_data',
    computeValue: (r) => {
      const total = ['usdt', 'usdc', 'dai', 'busd', 'gusd', 'pax']
        .reduce((sum, f) => sum + (parseFloat(r[f]) || 0), 0);
      return total;
    },
  },
};

// These are on-chain / crypto macro indicators accessed via KEY 5 token.
// Uses same Key2Endpoint pattern as KEY 3 / KEY 4.

const KEY5_ENDPOINTS: Record<string, Key2Endpoint> = {
  // Upstream note: on 2026-05-11 the authenticated BGeometrics API
  // endpoint returned no `etfBtcTotal` rows after 2026-05-07 with both
  // `startday` and `start_date`/`end_date` params. Keep this on the API
  // source because the chart file exposes a different ETF metric/scale.
  etf: {
    path: 'etf-btc-total',
    table: 'etf_data',
    fields: [{ apiField: 'etfBtcTotal', column: 'value', type: 'real' }],
  },
  crypto_market_cap: {
    path: 'market-cap',
    table: 'crypto_market_cap_data',
    fields: [{ apiField: 'marketCap', column: 'value', type: 'real' }],
  },
  mvrv_zscore: {
    path: 'mvrv-zscore',
    table: 'mvrv_zscore_data',
    fields: [{ apiField: 'mvrvZscore', column: 'value', type: 'real' }],
  },
};


interface Env {
  DB: D1Database;
  BGEOMETRICS_API_KEY?: string;
  BGEOMETRICS_API_KEY_2?: string;
  BGEOMETRICS_API_KEY_3?: string;
  BGEOMETRICS_API_KEY_4?: string;
  BGEOMETRICS_API_KEY_5?: string;
  RESEARCH_BTC_API_KEY?: string;
  CMC_API_KEY?: string;
}


function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function utcDayStartSeconds(date = new Date()): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000);
}

function calculateLagDays(latestDate: string | null, today = toDateStr(new Date())): number | null {
  if (!latestDate) return null;
  const todayMs = new Date(`${today}T00:00:00Z`).getTime();
  const latestMs = new Date(`${latestDate}T00:00:00Z`).getTime();
  return Math.floor((todayMs - latestMs) / 86400000);
}

function timestamp(): string {
  return new Date().toISOString();
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has('token')) parsed.searchParams.set('token', '[redacted]');
    return parsed.toString();
  } catch {
    return url.replace(/token=[^&]+/g, 'token=[redacted]');
  }
}

function getFetchStartDate(latestDate: string | null): string {
  if (!latestDate) return BGEOMETRICS_START;
  const date = new Date(`${latestDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - BGEOMETRICS_OVERLAP_DAYS);
  const overlapStart = toDateStr(date);
  return overlapStart < BGEOMETRICS_START ? BGEOMETRICS_START : overlapStart;
}

async function getLatestDate(db: D1Database, table: string): Promise<string | null> {
  try {
    const row = await db.prepare(`SELECT MAX(date) as latest FROM ${table}`).first<{ latest: string | null }>();
    return row?.latest ?? null;
  } catch (error: unknown) {
    console.error(`[D1 Latest Error] table=${table} timestamp=${timestamp()} error=${errorMessage(error)}`);
    return null;
  }
}

async function getRowCount(db: D1Database, table: string): Promise<number> {
  try {
    const row = await db.prepare(`SELECT COUNT(*) as count FROM ${table}`).first<{ count: number }>();
    return Number(row?.count ?? 0);
  } catch (error: unknown) {
    console.error(`[D1 Count Error] table=${table} timestamp=${timestamp()} error=${errorMessage(error)}`);
    return 0;
  }
}

async function getFetchPlan(
  db: D1Database,
  label: string,
  table: string,
  latestDate: string | null,
): Promise<{ fetchFrom: string; mode: string }> {
  if (!latestDate) {
    return { fetchFrom: BGEOMETRICS_START, mode: 'full seed (first run)' };
  }

  const rowCount = await getRowCount(db, table);
  if (rowCount > 0 && rowCount < BGEOMETRICS_MIN_FULL_HISTORY_ROWS) {
    logWarn(
      `[${label}] D1 table is shallow (${rowCount} rows) despite latest=${latestDate}; forcing full-history repair from ${BGEOMETRICS_START}`
    );
    return {
      fetchFrom: BGEOMETRICS_START,
      mode: `full seed repair (${rowCount} stored rows, latest ${latestDate})`,
    };
  }

  const fetchFrom = getFetchStartDate(latestDate);
  return { fetchFrom, mode: `overlap refresh from ${fetchFrom} (latest ${latestDate})` };
}

function upstreamStaleStateKey(indicator: string, latest: string | null): string {
  return `${BGEOMETRICS_UPSTREAM_STALE_KEY_PREFIX}:${indicator}:${latest ?? 'none'}`;
}

function upstreamStaleStatePattern(indicator: string): string {
  return `${BGEOMETRICS_UPSTREAM_STALE_KEY_PREFIX}:${indicator}:%`;
}

function upstreamStaleAttemptKey(indicator: string): string {
  return `${BGEOMETRICS_UPSTREAM_STALE_ATTEMPT_KEY_PREFIX}:${indicator}`;
}

async function clearUpstreamStaleState(db: D1Database, indicator: string): Promise<void> {
  try {
    await db.prepare(
      `DELETE FROM rate_limits WHERE key LIKE ? OR key = ?`
    ).bind(upstreamStaleStatePattern(indicator), upstreamStaleAttemptKey(indicator)).run();
  } catch (error: unknown) {
    console.error(`[Upstream Stale State Error] action=clear indicator=${indicator} timestamp=${timestamp()} error=${errorMessage(error)}`);
  }
}

async function getConsecutiveUpstreamStaleDays(
  db: D1Database,
  indicator: string,
  latest: string | null,
): Promise<number> {
  if (!latest) return 0;
  const key = upstreamStaleStateKey(indicator, latest);
  try {
    const rows = await db.prepare(
      `SELECT window_start
       FROM rate_limits
       WHERE key = ?
       ORDER BY window_start DESC
       LIMIT 30`
    ).bind(key).all<{ window_start: number }>();

    const seen = new Set((rows.results ?? []).map(row => Number(row.window_start)));
    let consecutive = 0;
    for (let day = utcDayStartSeconds(); seen.has(day); day -= 86400) {
      consecutive += 1;
    }
    return consecutive;
  } catch (error: unknown) {
    console.error(`[Upstream Stale State Error] action=count indicator=${indicator} latest=${latest} timestamp=${timestamp()} error=${errorMessage(error)}`);
    return 0;
  }
}

async function recordUpstreamStaleState(
  db: D1Database,
  indicator: string,
  latest: string | null,
  lagDays: number | null,
): Promise<{ consecutiveStaleDays: number; upstreamStale: boolean }> {
  if (lagDays === null || lagDays <= BGEOMETRICS_FRESHNESS_STALE_THRESHOLD_DAYS) {
    await clearUpstreamStaleState(db, indicator);
    return { consecutiveStaleDays: 0, upstreamStale: false };
  }

  const todayStart = utcDayStartSeconds();
  const key = upstreamStaleStateKey(indicator, latest);
  const stalePattern = upstreamStaleStatePattern(indicator);
  const retentionCutoff = todayStart - BGEOMETRICS_UPSTREAM_STALE_RETENTION_DAYS * 86400;

  try {
    await db.prepare(
      `DELETE FROM rate_limits
       WHERE key LIKE ? AND window_start < ?`
    ).bind(stalePattern, retentionCutoff).run();

    await db.prepare(
      `INSERT OR IGNORE INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)`
    ).bind(key, todayStart).run();

    const consecutiveStaleDays = await getConsecutiveUpstreamStaleDays(db, indicator, latest);
    return {
      consecutiveStaleDays,
      upstreamStale: consecutiveStaleDays > BGEOMETRICS_UPSTREAM_STALE_CONSECUTIVE_DAYS,
    };
  } catch (error: unknown) {
    console.error(`[Upstream Stale State Error] action=record indicator=${indicator} latest=${latest ?? 'none'} timestamp=${timestamp()} error=${errorMessage(error)}`);
    return { consecutiveStaleDays: 0, upstreamStale: false };
  }
}

async function getUpstreamStaleProbeState(
  db: D1Database,
  indicator: string,
  table: string,
): Promise<{ latest: string | null; lagDays: number | null; consecutiveStaleDays: number; upstreamStale: boolean }> {
  const latest = await getLatestDate(db, table);
  const lagDays = calculateLagDays(latest);
  if (lagDays === null || lagDays <= BGEOMETRICS_FRESHNESS_STALE_THRESHOLD_DAYS) {
    await clearUpstreamStaleState(db, indicator);
    return { latest, lagDays, consecutiveStaleDays: 0, upstreamStale: false };
  }

  const consecutiveStaleDays = await getConsecutiveUpstreamStaleDays(db, indicator, latest);
  const knownUpstreamDelay = KNOWN_UPSTREAM_DELAYED_TABLES.has(table) && lagDays > BGEOMETRICS_UPSTREAM_STALE_CONSECUTIVE_DAYS;
  return {
    latest,
    lagDays,
    consecutiveStaleDays,
    upstreamStale: knownUpstreamDelay || consecutiveStaleDays > BGEOMETRICS_UPSTREAM_STALE_CONSECUTIVE_DAYS,
  };
}

async function hasUpstreamStaleAttemptToday(db: D1Database, indicator: string): Promise<boolean> {
  try {
    const row = await db.prepare(
      `SELECT count FROM rate_limits WHERE key = ? AND window_start = ?`
    ).bind(upstreamStaleAttemptKey(indicator), utcDayStartSeconds()).first<{ count: number }>();
    return Number(row?.count ?? 0) > 0;
  } catch (error: unknown) {
    console.error(`[Upstream Stale State Error] action=attempt-check indicator=${indicator} timestamp=${timestamp()} error=${errorMessage(error)}`);
    return false;
  }
}

async function markUpstreamStaleAttemptToday(db: D1Database, indicator: string): Promise<void> {
  try {
    await db.prepare(
      `INSERT OR IGNORE INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)`
    ).bind(upstreamStaleAttemptKey(indicator), utcDayStartSeconds()).run();
  } catch (error: unknown) {
    console.error(`[Upstream Stale State Error] action=attempt-mark indicator=${indicator} timestamp=${timestamp()} error=${errorMessage(error)}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class FetchFailure extends Error {
  readonly statusCode: number | string | null;
  readonly endpointUrl: string;

  constructor(message: string, endpointUrl: string, statusCode: number | string | null = null) {
    super(message);
    this.name = 'FetchFailure';
    this.endpointUrl = endpointUrl;
    this.statusCode = statusCode;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorStatus(error: unknown): number | string | null {
  return error instanceof FetchFailure ? error.statusCode : null;
}

function errorUrl(error: unknown, fallbackUrl: string): string {
  return error instanceof FetchFailure ? error.endpointUrl : fallbackUrl;
}

type BgeometricsTokenKey =
  | 'BGEOMETRICS_API_KEY'
  | 'BGEOMETRICS_API_KEY_2'
  | 'BGEOMETRICS_API_KEY_3'
  | 'BGEOMETRICS_API_KEY_4'
  | 'BGEOMETRICS_API_KEY_5';

function getBgeometricsToken(env: Env, tokenKey: BgeometricsTokenKey, label: string): string {
  const token = env[tokenKey];
  if (token) return token;

  if (env.RESEARCH_BTC_API_KEY) {
    logWarn(`[${label}] ${tokenKey} secret not set — using RESEARCH_BTC_API_KEY fallback`);
    return env.RESEARCH_BTC_API_KEY;
  }

  logWarn(`[${label}] ${tokenKey} and RESEARCH_BTC_API_KEY secrets not set — request will proceed without authentication token`);
  return '';
}

function logWarn(message: string): void {
  console.warn(message);
}

function logFetchFailure(indicator: string, endpointUrl: string, statusCode: number | string | null, error: unknown): void {
  console.error(
    `[BGeometrics Failure] indicator=${indicator} endpoint=${sanitizeUrl(endpointUrl)} status=${statusCode ?? 'unknown'} timestamp=${timestamp()} error=${errorMessage(error)}`
  );
}

async function consumeBgeometricsApiBudget(db: D1Database, indicator: string): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - BGEOMETRICS_API_LIMIT_WINDOW_SECONDS;
  const legacyKey = BGEOMETRICS_API_BUDGET_KEY_PREFIX;
  const requestKey = `${BGEOMETRICS_API_BUDGET_KEY_PREFIX}:${now}:${crypto.randomUUID()}`;
  const requestKeyPattern = `${BGEOMETRICS_API_BUDGET_KEY_PREFIX}:%`;
  let resetIn = BGEOMETRICS_API_LIMIT_WINDOW_SECONDS;

  try {
    await db.prepare(
      `DELETE FROM rate_limits
       WHERE key LIKE ? AND window_start <= ?`
    ).bind(requestKeyPattern, now - 86400).run();

    await db.prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)`
    ).bind(requestKey, now).run();

    const current = await db.prepare(
      `SELECT COALESCE(SUM(count), 0) AS count, MIN(window_start) AS oldest
       FROM rate_limits
       WHERE ((key = ? OR key LIKE ?) AND window_start > ?)`
    ).bind(legacyKey, requestKeyPattern, cutoff).first<{ count: number; oldest: number | null }>();

    const rollingCount = Number(current?.count ?? 0);
    const oldest = current?.oldest ?? now;
    resetIn = Math.max(1, oldest + BGEOMETRICS_API_LIMIT_WINDOW_SECONDS - now);

    if (rollingCount > BGEOMETRICS_API_LIMIT_PER_HOUR) {
      await db.prepare(
        `DELETE FROM rate_limits WHERE key = ? AND window_start = ?`
      ).bind(requestKey, now).run();
      console.error(
        `[CRITICAL][BGeometrics Budget] indicator=${indicator} rolling API budget exhausted count=${rollingCount - 1} limit=${BGEOMETRICS_API_LIMIT_PER_HOUR} resetIn=${resetIn}s timestamp=${timestamp()}`
      );
      return { allowed: false, remaining: 0, resetIn };
    }

    return {
      allowed: true,
      remaining: Math.max(0, BGEOMETRICS_API_LIMIT_PER_HOUR - rollingCount),
      resetIn,
    };
  } catch (error: unknown) {
    console.error(`[CRITICAL][BGeometrics Budget] indicator=${indicator} budget check failed timestamp=${timestamp()} error=${errorMessage(error)}`);
    return { allowed: false, remaining: 0, resetIn };
  }
}

async function fetchBgeometricsApiJson(env: Env, indicator: string, url: string): Promise<unknown> {
  const budget = await consumeBgeometricsApiBudget(env.DB, indicator);
  const safeUrl = sanitizeUrl(url);
  if (!budget.allowed) {
    throw new FetchFailure(`Local hourly BGeometrics API budget exhausted; retry after ${budget.resetIn}s`, safeUrl, 'LOCAL_BUDGET_EXHAUSTED');
  }

  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'NOVRIX Sentiment Cron' },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new FetchFailure(`HTTP ${response.status}: ${body.substring(0, 300)}`, safeUrl, response.status);
  }

  return response.json();
}

const SIMPLE_CHART_SERIES = {
  hashrate: {
    url: 'https://charts.bgeometrics.com/files/hashrate.json',
    table: 'hashrate_data',
    column: 'hashrate',
  },
  open_interest: {
    url: 'https://charts.bgeometrics.com/files/oi_total.json',
    table: 'open_interest_data',
    column: 'value',
  },
  aviv: {
    url: 'https://charts.bgeometrics.com/files/aviv.json',
    table: 'aviv_data',
    column: 'value',
  },
  realized_price: {
    url: 'https://charts.bgeometrics.com/files/realized_price.json',
    table: 'realized_price_data',
    column: 'value',
  },
  week_ma_200: {
    url: 'https://charts.bgeometrics.com/files/200wma.json',
    table: 'week_ma_200_data',
    column: 'value',
  },
  lth_mvrv: {
    url: 'https://charts.bgeometrics.com/files/lth_mvrv.json',
    table: 'lth_mvrv_data',
    column: 'lth_mvrv',
  },
  sth_mvrv: {
    url: 'https://charts.bgeometrics.com/files/sth_mvrv.json',
    table: 'sth_mvrv_data',
    column: 'sth_mvrv',
  },
  vdd: {
    url: 'https://charts.bgeometrics.com/files/vdd_multiple.json',
    table: 'vdd_data',
    column: 'value',
  },
  active_addresses: {
    url: 'https://charts.bgeometrics.com/files/addresses_active.json',
    table: 'active_addresses_data',
    column: 'value',
  },
  crypto_market_cap: {
    url: 'https://charts.bgeometrics.com/files/market_cap.json',
    table: 'crypto_market_cap_data',
    column: 'value',
  },
} as const;

const BGEOMETRICS_FRESHNESS_TABLES = [
  ['btc_price_data', 'btc_price_data'],
  ['nupl_data', 'nupl_data'],
  ['nrpl_data', 'nrpl_data'],
  ['mvrv_data', 'mvrv_data'],
  ['aviv_data', 'aviv_data'],
  ['mvrv_zscore_data', 'mvrv_zscore_data'],
  ['market_cap_data', 'market_cap_data'],
  ['realized_price_data', 'realized_price_data'],
  ['ma_200_week_data', 'week_ma_200_data'],
  ['cvdd_data', 'cvdd_data'],
  ['mayer_multiple_data', 'mayer_data'],
  ['reserve_risk_data', 'reserve_risk_data'],
  ['rhodl_ratio_data', 'rhodl_data'],
  ['sopr_data', 'sopr_data'],
  ['supply_profit_data', 'supply_profit_data'],
  ['supply_loss_data', 'supply_loss_data'],
  ['realized_profit_data', 'realized_profit_data'],
  ['realized_loss_data', 'realized_loss_data'],
  ['utxo_profit_data', 'utxo_profit_data'],
  ['utxo_loss_data', 'utxo_loss_data'],
  ['sth_mvrv_data', 'sth_mvrv_data'],
  ['lth_mvrv_data', 'lth_mvrv_data'],
  ['lth_position_change_data', 'lth_position_change_data'],
  ['sth_position_change_data', 'sth_position_change_data'],
  ['vdd_data', 'vdd_data'],
  ['nvts_data', 'nvts_data'],
  ['nvt_zscore_data', 'nvt_zscore_data'],
  ['hot_supply_data', 'hot_supply_data'],
  ['highly_liquid_supply_data', 'highly_liquid_data'],
  ['supply_shock_data', 'supply_shock_data'],
  ['stablecoin_supply_data', 'stablecoin_supply_data'],
  ['active_addresses_data', 'active_addresses_data'],
  ['hashrate_data', 'hashrate_data'],
  ['hashribbons_data', 'hashribbons_data'],
  ['puell_multiple_data', 'puell_data'],
  ['miner_sell_pressure_data', 'miner_sell_pressure_data'],
  ['mpi_data', 'mpi_data'],
  ['dominance_data', 'dominance_data'],
  ['open_interest_data', 'open_interest_data'],
  ['funding_rate_data', 'funding_rate_data'],
  ['etf_data', 'etf_data'],
  ['ssr_data', 'ssr_data'],
  ['crypto_market_cap_data', 'crypto_market_cap_data'],
] as const;

async function runWithRetry(label: string, operation: () => Promise<UpdateResult>): Promise<UpdateResult> {
  const first = await operation();
  if (!first.error) return first;

  logWarn(`[Retry] indicator=${label} timestamp=${timestamp()} waitMs=${BGEOMETRICS_RETRY_DELAY_MS} firstError=${first.error}`);
  await sleep(BGEOMETRICS_RETRY_DELAY_MS);
  const second = await operation();
  if (second.error) {
    console.error(`[Retry Failed] indicator=${label} timestamp=${timestamp()} finalError=${second.error}`);
  }
  return second;
}

async function updateChartSeriesIndicator(
  env: Env,
  key: string,
  endpoint: typeof SIMPLE_CHART_SERIES[keyof typeof SIMPLE_CHART_SERIES],
): Promise<UpdateResult> {
  try {
    const latestDate = await getLatestDate(env.DB, endpoint.table);
    const today = toDateStr(new Date());
    const { fetchFrom, mode } = await getFetchPlan(env.DB, `CHART:${key}`, endpoint.table, latestDate);

    if (latestDate) {
      const diffDays = Math.floor(
        (new Date(today + 'T00:00:00Z').getTime() - new Date(latestDate + 'T00:00:00Z').getTime()) / 86400000
      );
    }

    const records = await fetchChartSeries(endpoint.url);
    const newRecords = records.filter((record) => record.date >= fetchFrom);
    if (newRecords.length === 0) return { inserted: 0, skipped: false, fetched: records.length };

    const CHUNK = 100;
    let inserted = 0;

    for (let i = 0; i < newRecords.length; i += CHUNK) {
      const chunk = newRecords.slice(i, i + CHUNK);
      const stmts = chunk.map((record) =>
        env.DB.prepare(`INSERT OR IGNORE INTO ${endpoint.table} (date, ${endpoint.column}) VALUES (?, ?)`)
          .bind(record.date, record.value)
      );
      await env.DB.batch(stmts);
      inserted += stmts.length;
    }

    return { inserted, skipped: false, fetched: records.length };

  } catch (error: unknown) {
    logFetchFailure(`CHART:${key}`, errorUrl(error, endpoint.url), errorStatus(error), error);
    return { inserted: 0, skipped: false, fetched: 0, error: errorMessage(error), statusCode: errorStatus(error), endpointUrl: sanitizeUrl(errorUrl(error, endpoint.url)) };
  }
}

async function fetchChartSeries(url: string): Promise<Array<{ date: string; value: number }>> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'NOVRIX Sentiment Cron' },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new FetchFailure(`HTTP ${response.status}: ${await response.text().catch(() => '')}`, url, response.status);
  }

  const raw: unknown = await response.json();
  if (!Array.isArray(raw)) throw new FetchFailure(`Unexpected response shape: ${typeof raw}`, url, 'BAD_SHAPE');

  return raw
    .map((row) => {
      if (!Array.isArray(row) || row.length < 2) return null;
      const timestamp = Number(row[0]);
      const value = Number(row[1]);
      if (!Number.isFinite(timestamp) || !Number.isFinite(value)) return null;
      return { date: new Date(timestamp).toISOString().slice(0, 10), value };
    })
    .filter((row): row is { date: string; value: number } => row !== null);
}

async function insertRows(
  env: Env,
  table: string,
  columns: string[],
  rows: Array<{ date: string; values: Array<string | number> }>,
): Promise<number> {
  const maxSqlVariables = 90;
  const valuesPerRow = columns.length + 1;
  const chunkSize = Math.max(1, Math.floor(maxSqlVariables / valuesPerRow));
  let inserted = 0;
  const colList = ['date', ...columns].join(', ');
  const rowPlaceholders = `(${['?', ...columns.map(() => '?')].join(', ')})`;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => rowPlaceholders).join(', ');
    const values = chunk.flatMap((row) => [row.date, ...row.values]);
    await env.DB.prepare(`INSERT OR IGNORE INTO ${table} (${colList}) VALUES ${placeholders}`).bind(...values).run();
    inserted += chunk.length;
  }

  return inserted;
}

async function updateMayerFromCharts(env: Env): Promise<UpdateResult> {
  try {
    const latestDate = await getLatestDate(env.DB, 'mayer_data');
    const { fetchFrom } = await getFetchPlan(env.DB, 'CHART:mayer', 'mayer_data', latestDate);
    const priceRows = await fetchChartSeries('https://charts.bgeometrics.com/files/moving_average_price.json');
    const maRows = await fetchChartSeries('https://charts.bgeometrics.com/files/200dma.json');
    const maByDate = new Map(maRows.map((row) => [row.date, row.value]));
    const rows = priceRows
      .map((row) => {
        const ma = maByDate.get(row.date);
        if (!ma || ma <= 0) return null;
        return { date: row.date, values: [row.value / ma] };
      })
      .filter((row): row is { date: string; values: number[] } => row !== null)
      .filter((row) => row.date >= fetchFrom);
    return { inserted: await insertRows(env, 'mayer_data', ['value'], rows), skipped: false, fetched: priceRows.length };
  } catch (error: unknown) {
    logFetchFailure('CHART:mayer', errorUrl(error, 'https://charts.bgeometrics.com/files/moving_average_price.json'), errorStatus(error), error);
    return { inserted: 0, skipped: false, fetched: 0, error: errorMessage(error), statusCode: errorStatus(error), endpointUrl: sanitizeUrl(errorUrl(error, 'https://charts.bgeometrics.com/files/moving_average_price.json')) };
  }
}

async function updateMvrvZscoreFromCharts(env: Env): Promise<UpdateResult> {
  try {
    const latestDate = await getLatestDate(env.DB, 'mvrv_zscore_data');
    const { fetchFrom } = await getFetchPlan(env.DB, 'CHART:mvrv_zscore', 'mvrv_zscore_data', latestDate);
    const zscoreRows = await fetchChartSeries('https://charts.bgeometrics.com/files/mvrv_zscore_data.json');
    const mvrvRows = await env.DB.prepare(`SELECT date, mvrv FROM mvrv_data WHERE date >= ?`).bind(fetchFrom).all<{ date: string; mvrv: number }>();
    const mvrvByDate = new Map((mvrvRows.results ?? []).map((row) => [row.date, row.mvrv]));
    const rows: Array<{ date: string; values: number[] }> = [];

    for (const row of zscoreRows) {
      if (row.date < fetchFrom) continue;
      const mvrv = mvrvByDate.get(row.date);
      if (typeof mvrv !== 'number') continue;
      rows.push({ date: row.date, values: [row.value, mvrv] });
    }

    return { inserted: await insertRows(env, 'mvrv_zscore_data', ['mvrv_zscore', 'mvrv'], rows), skipped: false, fetched: zscoreRows.length };
  } catch (error: unknown) {
    logFetchFailure('CHART:mvrv_zscore', errorUrl(error, 'https://charts.bgeometrics.com/files/mvrv_zscore_data.json'), errorStatus(error), error);
    return { inserted: 0, skipped: false, fetched: 0, error: errorMessage(error), statusCode: errorStatus(error), endpointUrl: sanitizeUrl(errorUrl(error, 'https://charts.bgeometrics.com/files/mvrv_zscore_data.json')) };
  }
}

async function updateStablecoinSupplyFromCharts(env: Env): Promise<UpdateResult> {
  try {
    const latestDate = await getLatestDate(env.DB, 'stablecoin_supply_data');
    const { fetchFrom } = await getFetchPlan(env.DB, 'CHART:stablecoin_supply', 'stablecoin_supply_data', latestDate);
    const files = ['stablecoin_usdt', 'stablecoin_usdc', 'stablecoin_dai', 'stablecoin_busd', 'stablecoin_gusd', 'stablecoin_pax'];
    const series: Array<Array<{ date: string; value: number }>> = [];
    for (const file of files) {
      series.push(await fetchChartSeries(`https://charts.bgeometrics.com/files/${file}.json`));
    }
    const totals = new Map<string, number>();

    for (const rows of series) {
      for (const row of rows) {
        totals.set(row.date, (totals.get(row.date) ?? 0) + row.value);
      }
    }

    const rows = [...totals.entries()]
      .map(([date, value]) => ({ date, values: [value] }))
      .filter((row) => row.date >= fetchFrom)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { inserted: await insertRows(env, 'stablecoin_supply_data', ['value'], rows), skipped: false, fetched: totals.size };
  } catch (error: unknown) {
    logFetchFailure('CHART:stablecoin_supply', errorUrl(error, 'https://charts.bgeometrics.com/files/stablecoin_usdt.json'), errorStatus(error), error);
    return { inserted: 0, skipped: false, fetched: 0, error: errorMessage(error), statusCode: errorStatus(error), endpointUrl: sanitizeUrl(errorUrl(error, 'https://charts.bgeometrics.com/files/stablecoin_usdt.json')) };
  }
}

async function updateHashribbonsFromCharts(env: Env): Promise<UpdateResult> {
  try {
    const latestDate = await getLatestDate(env.DB, 'hashribbons_data');
    const { fetchFrom } = await getFetchPlan(env.DB, 'CHART:hashribbons', 'hashribbons_data', latestDate);
    const sma30Rows = await fetchChartSeries('https://charts.bgeometrics.com/files/hashribbons_sma_30.json');
    const sma60Rows = await fetchChartSeries('https://charts.bgeometrics.com/files/hashribbons_sma_60.json');
    const sma60ByDate = new Map(sma60Rows.map((row) => [row.date, row.value]));
    const rows = sma30Rows
      .map((row) => {
        const sma60 = sma60ByDate.get(row.date);
        if (!sma60) return null;
        return { date: row.date, values: [row.value, sma60, row.value >= sma60 ? 'Up' : 'Down'] };
      })
      .filter((row): row is { date: string; values: Array<string | number> } => row !== null)
      .filter((row) => row.date >= fetchFrom);
    return { inserted: await insertRows(env, 'hashribbons_data', ['sma_30', 'sma_60', 'signal'], rows), skipped: false, fetched: sma30Rows.length };
  } catch (error: unknown) {
    logFetchFailure('CHART:hashribbons', errorUrl(error, 'https://charts.bgeometrics.com/files/hashribbons_sma_30.json'), errorStatus(error), error);
    return { inserted: 0, skipped: false, fetched: 0, error: errorMessage(error), statusCode: errorStatus(error), endpointUrl: sanitizeUrl(errorUrl(error, 'https://charts.bgeometrics.com/files/hashribbons_sma_30.json')) };
  }
}

async function updateSupplyProfitLossFromCharts(env: Env): Promise<UpdateResult> {
  try {
    const latestProfit = await getLatestDate(env.DB, 'supply_profit_data');
    const latestLoss = await getLatestDate(env.DB, 'supply_loss_data');
    const profitPlan = await getFetchPlan(env.DB, 'CHART:supply_profit', 'supply_profit_data', latestProfit);
    const lossPlan = await getFetchPlan(env.DB, 'CHART:supply_loss', 'supply_loss_data', latestLoss);
    const fetchFrom = profitPlan.fetchFrom < lossPlan.fetchFrom ? profitPlan.fetchFrom : lossPlan.fetchFrom;
    const profitPctRows = await fetchChartSeries('https://charts.bgeometrics.com/files/profit_loss.json');
    const supplyRows = await fetchChartSeries('https://charts.bgeometrics.com/files/supply.json');
    const supplyByDate = new Map(supplyRows.map((row) => [row.date, row.value]));
    const profitRows: Array<{ date: string; values: number[] }> = [];
    const lossRows: Array<{ date: string; values: number[] }> = [];

    for (const row of profitPctRows) {
      if (row.date < fetchFrom) continue;
      const supply = supplyByDate.get(row.date);
      if (!supply) continue;
      const profit = supply * (row.value / 100);
      profitRows.push({ date: row.date, values: [profit] });
      lossRows.push({ date: row.date, values: [supply - profit] });
    }

    const insertedProfit = await insertRows(env, 'supply_profit_data', ['supply_in_profit'], profitRows);
    const insertedLoss = await insertRows(env, 'supply_loss_data', ['supply_in_loss'], lossRows);
    return { inserted: insertedProfit + insertedLoss, skipped: false, fetched: profitPctRows.length };
  } catch (error: unknown) {
    logFetchFailure('CHART:supply_profit_loss', errorUrl(error, 'https://charts.bgeometrics.com/files/profit_loss.json'), errorStatus(error), error);
    return { inserted: 0, skipped: false, fetched: 0, error: errorMessage(error), statusCode: errorStatus(error), endpointUrl: sanitizeUrl(errorUrl(error, 'https://charts.bgeometrics.com/files/profit_loss.json')) };
  }
}

type FreshnessResult = {
  indicator: string;
  table: string;
  latest: string | null;
  lagDays: number | null;
  status: 'OK' | 'STALE';
  consecutiveStaleDays: number;
  upstreamStale: boolean;
};

async function runFreshnessSanityCheck(env: Env): Promise<FreshnessResult[]> {
  const today = toDateStr(new Date());
  const results: FreshnessResult[] = [];

  for (const [indicator, table] of BGEOMETRICS_FRESHNESS_TABLES) {
    const latest = await getLatestDate(env.DB, table);
    const lagDays = calculateLagDays(latest, today);
    const status: 'OK' | 'STALE' = lagDays !== null && lagDays <= BGEOMETRICS_FRESHNESS_STALE_THRESHOLD_DAYS ? 'OK' : 'STALE';
    const staleState = await recordUpstreamStaleState(env.DB, table, latest, lagDays);
    const knownUpstreamDelay = KNOWN_UPSTREAM_DELAYED_TABLES.has(table) && lagDays !== null && lagDays > BGEOMETRICS_FRESHNESS_STALE_THRESHOLD_DAYS;
    const item = {
      indicator,
      table,
      latest,
      lagDays,
      status,
      consecutiveStaleDays: staleState.consecutiveStaleDays,
      upstreamStale: staleState.upstreamStale || knownUpstreamDelay,
    };
    results.push(item);
    if (status === 'STALE') {
      if (item.upstreamStale) {
        logWarn(
          `[UPSTREAM STALE][Freshness] indicator=${indicator} table=${table} latest=${latest ?? 'none'} lagDays=${lagDays ?? 'unknown'} consecutiveStaleDays=${item.consecutiveStaleDays} timestamp=${timestamp()}`
        );
      } else {
        console.error(`[CRITICAL][Freshness] indicator=${indicator} table=${table} latest=${latest ?? 'none'} lagDays=${lagDays ?? 'unknown'} thresholdDays=${BGEOMETRICS_FRESHNESS_STALE_THRESHOLD_DAYS} timestamp=${timestamp()}`);
      }
    }
  }

  return results;
}


async function updateBGeometricsIndicator(
  env: Env,
  key: string,
  endpoint: typeof BGEOMETRICS_ENDPOINTS[string],
): Promise<UpdateResult> {
  let url = `${BGEOMETRICS_BASE}/${endpoint.path}`;
  try {
    const latestDate = await getLatestDate(env.DB, endpoint.table);
    const today = toDateStr(new Date());

    if (latestDate) {
      const latest = new Date(latestDate + 'T00:00:00Z');
      const todayDate = new Date(today + 'T00:00:00Z');
      const diffDays = Math.floor((todayDate.getTime() - latest.getTime()) / 86400000);
    } else {
    }

    const { fetchFrom, mode } = await getFetchPlan(env.DB, key, endpoint.table, latestDate);

    url = `${BGEOMETRICS_BASE}/${endpoint.path}?startday=${fetchFrom}&token=${getBgeometricsToken(env, 'BGEOMETRICS_API_KEY', key)}`;
    const raw: unknown = await fetchBgeometricsApiJson(env, key, url);

    if (!Array.isArray(raw)) {
      throw new Error(`Unexpected response shape: ${typeof raw}`);
    }

    const records = raw as BGeometricsRecord[];
    const apiLatest = records.length > 0 ? records[records.length - 1].d : 'none';

    if (latestDate && apiLatest <= latestDate) {
    }

    // Filter to only records newer than what we already have
    const newRecords = records.filter(r => r.d >= fetchFrom);


    if (newRecords.length === 0) {
      return { inserted: 0, skipped: false, fetched: records.length };
    }

    // Build column list for INSERT
    const extraCols = endpoint.extraColumns ? Object.keys(endpoint.extraColumns) : [];
    const extraVals = endpoint.extraColumns ? Object.values(endpoint.extraColumns) : [];
    const allCols = ['date', endpoint.column, ...extraCols].join(', ');
    const allPlaceholders = ['?', '?', ...extraCols.map(() => '?')].join(', ');

    // Batch insert in chunks of 100
    const CHUNK = 100;
    let inserted = 0;

    for (let i = 0; i < newRecords.length; i += CHUNK) {
      const chunk = newRecords.slice(i, i + CHUNK);
      const stmts: D1PreparedStatement[] = [];

      for (const record of chunk) {
        const rawVal = record[endpoint.field];
        const value = parseFloat(String(rawVal));
        if (isNaN(value)) continue; // skip invalid records

        stmts.push(
          env.DB.prepare(
            `INSERT OR IGNORE INTO ${endpoint.table} (${allCols}) VALUES (${allPlaceholders})`
          ).bind(record.d, value, ...extraVals)
        );
      }

      if (stmts.length > 0) {
        await env.DB.batch(stmts);
        inserted += stmts.length;
      }
    }

    return { inserted, skipped: false, fetched: records.length };

  } catch (error: unknown) {
    logFetchFailure(key, errorUrl(error, url), errorStatus(error), error);
    return { inserted: 0, skipped: false, fetched: 0, error: errorMessage(error), statusCode: errorStatus(error), endpointUrl: sanitizeUrl(errorUrl(error, url)) };
  }
}


async function updateKey2Indicator(
  env: Env,
  key: string,
  endpoint: Key2Endpoint,
): Promise<UpdateResult> {
  let url = `${BGEOMETRICS_BASE}/${endpoint.path}`;
  try {
    const latestDate = await getLatestDate(env.DB, endpoint.table);
    const today = toDateStr(new Date());

    if (latestDate) {
      const diffDays = Math.floor(
        (new Date(today + 'T00:00:00Z').getTime() - new Date(latestDate + 'T00:00:00Z').getTime()) / 86400000
      );
    } else {
    }

    const { fetchFrom, mode } = await getFetchPlan(env.DB, `KEY2:${key}`, endpoint.table, latestDate);

    url = `${BGEOMETRICS_BASE}/${endpoint.path}?startday=${fetchFrom}&token=${getBgeometricsToken(env, 'BGEOMETRICS_API_KEY_2', `KEY2:${key}`)}`;
    const raw: unknown = await fetchBgeometricsApiJson(env, `KEY2:${key}`, url);
    if (!Array.isArray(raw)) throw new Error(`Unexpected response shape: ${typeof raw}`);

    const records = raw as BGeometricsRecord[];
    const apiLatest = records.length > 0 ? records[records.length - 1].d : 'none';

    const newRecords = records.filter(r => r.d >= fetchFrom);

    if (newRecords.length === 0) return { inserted: 0, skipped: false, fetched: records.length };

    const colList = ['date', ...endpoint.fields.map(f => f.column)].join(', ');
    const placeholders = ['?', ...endpoint.fields.map(() => '?')].join(', ');

    const CHUNK = 100;
    let inserted = 0;

    for (let i = 0; i < newRecords.length; i += CHUNK) {
      const chunk = newRecords.slice(i, i + CHUNK);
      const stmts: D1PreparedStatement[] = [];

      for (const record of chunk) {
        const values: (string | number)[] = [record.d];
        let valid = true;

        for (const field of endpoint.fields) {
          const rawVal = record[field.apiField];
          if (field.type === 'real') {
            const num = parseFloat(String(rawVal));
            if (isNaN(num)) { valid = false; break; }
            values.push(num);
          } else {
            if (!rawVal) { valid = false; break; }
            values.push(String(rawVal));
          }
        }

        if (!valid) continue;
        stmts.push(
          env.DB.prepare(
            `INSERT OR IGNORE INTO ${endpoint.table} (${colList}) VALUES (${placeholders})`
          ).bind(...values)
        );
      }

      if (stmts.length > 0) {
        await env.DB.batch(stmts);
        inserted += stmts.length;
      }
    }

    return { inserted, skipped: false, fetched: records.length };

  } catch (error: unknown) {
    logFetchFailure(`KEY2:${key}`, errorUrl(error, url), errorStatus(error), error);
    return { inserted: 0, skipped: false, fetched: 0, error: errorMessage(error), statusCode: errorStatus(error), endpointUrl: sanitizeUrl(errorUrl(error, url)) };
  }
}

async function updateKey3Indicator(
  env: Env,
  key: string,
  endpoint: Key2Endpoint,
): Promise<UpdateResult> {
  let url = `${BGEOMETRICS_BASE}/${endpoint.path}`;
  try {
    const latestDate = await getLatestDate(env.DB, endpoint.table);
    const today = toDateStr(new Date());

    if (latestDate) {
      const diffDays = Math.floor(
        (new Date(today + 'T00:00:00Z').getTime() - new Date(latestDate + 'T00:00:00Z').getTime()) / 86400000
      );
    } else {
    }

    const { fetchFrom, mode } = await getFetchPlan(env.DB, `KEY3:${key}`, endpoint.table, latestDate);

    url = `${BGEOMETRICS_BASE}/${endpoint.path}?startday=${fetchFrom}&token=${getBgeometricsToken(env, 'BGEOMETRICS_API_KEY_3', `KEY3:${key}`)}`;
    const raw: unknown = await fetchBgeometricsApiJson(env, `KEY3:${key}`, url);
    if (!Array.isArray(raw)) throw new Error(`Unexpected response shape: ${typeof raw}`);

    const records = raw as BGeometricsRecord[];
    const apiLatest = records.length > 0 ? records[records.length - 1].d : 'none';

    // Field discovery: log available fields if expected field is missing
    if (records.length > 0) {
      const sample = records[0];
      for (const field of endpoint.fields) {
        if (!(field.apiField in sample)) {
          console.error(`[KEY3:${key}] FIELD MISMATCH: expected '${field.apiField}' not found. Available keys: ${Object.keys(sample).join(', ')}`);
        }
      }
    }

    const newRecords = records.filter(r => (r.d || '').split(' ')[0] >= fetchFrom);

    if (newRecords.length === 0) return { inserted: 0, skipped: false, fetched: records.length };

    const colList = ['date', ...endpoint.fields.map(f => f.column)].join(', ');
    const placeholders = ['?', ...endpoint.fields.map(() => '?')].join(', ');

    const CHUNK = 100;
    let inserted = 0;

    for (let i = 0; i < newRecords.length; i += CHUNK) {
      const chunk = newRecords.slice(i, i + CHUNK);
      const stmts: D1PreparedStatement[] = [];

      for (const record of chunk) {
        // Normalize date: some endpoints (e.g. funding-rate) return datetime strings
        const dateStr = (record.d || '').split(' ')[0]; // "2025-01-01 01:00:00" → "2025-01-01"
        if (!dateStr) continue;
        const values: (string | number)[] = [dateStr];
        let valid = true;

        for (const field of endpoint.fields) {
          let rawVal: unknown = record[field.apiField];
          if (
            key === 'open_interest' &&
            field.apiField === 'openInterestFutures' &&
            (rawVal === null || rawVal === undefined || rawVal === '')
          ) {
            const exchangeTotal = OPEN_INTEREST_EXCHANGE_FIELDS.reduce((sum, exchangeField) => {
              const exchangeValue = parseFloat(String(record[exchangeField]));
              return Number.isFinite(exchangeValue) ? sum + exchangeValue : sum;
            }, 0);
            rawVal = exchangeTotal > 0 ? exchangeTotal : rawVal;
          }
          if (field.type === 'real') {
            const num = parseFloat(String(rawVal));
            if (isNaN(num)) { valid = false; break; }
            values.push(num);
          } else {
            if (!rawVal) { valid = false; break; }
            values.push(String(rawVal));
          }
        }

        if (!valid) continue;
        stmts.push(
          env.DB.prepare(
            `INSERT OR IGNORE INTO ${endpoint.table} (${colList}) VALUES (${placeholders})`
          ).bind(...values)
        );
      }

      if (stmts.length > 0) {
        await env.DB.batch(stmts);
        inserted += stmts.length;
      }
    }

    return { inserted, skipped: false, fetched: records.length };

  } catch (error: unknown) {
    logFetchFailure(`KEY3:${key}`, errorUrl(error, url), errorStatus(error), error);
    return { inserted: 0, skipped: false, fetched: 0, error: errorMessage(error), statusCode: errorStatus(error), endpointUrl: sanitizeUrl(errorUrl(error, url)) };
  }
}


async function updateKey4Indicator(
  env: Env,
  key: string,
  endpoint: Key2Endpoint,
): Promise<UpdateResult> {
  let url = `${BGEOMETRICS_BASE}/${endpoint.path}`;
  try {
    const latestDate = await getLatestDate(env.DB, endpoint.table);
    const today = toDateStr(new Date());

    if (latestDate) {
      const diffDays = Math.floor(
        (new Date(today + 'T00:00:00Z').getTime() - new Date(latestDate + 'T00:00:00Z').getTime()) / 86400000
      );
    } else {
    }

    const { fetchFrom, mode } = await getFetchPlan(env.DB, `KEY4:${key}`, endpoint.table, latestDate);

    url = `${BGEOMETRICS_BASE}/${endpoint.path}?startday=${fetchFrom}&token=${getBgeometricsToken(env, 'BGEOMETRICS_API_KEY_4', `KEY4:${key}`)}`;
    const raw: unknown = await fetchBgeometricsApiJson(env, `KEY4:${key}`, url);
    if (!Array.isArray(raw)) throw new Error(`Unexpected response shape: ${typeof raw}`);

    const records = raw as BGeometricsRecord[];
    // Date field fallback: realized-price may use 'theDay' OR 'd' depending on API version.
    // Try configured dateField first; fall back to 'd' if that field is missing in the record.
    const df = endpoint.dateField ?? 'd';
    const getDate = (r: BGeometricsRecord): string => (r[df] ?? r.d) as string;
    const apiLatest = records.length > 0 ? getDate(records[records.length - 1]) : 'none';

    // Field discovery: log available fields if expected field is missing
    if (records.length > 0) {
      const sample = records[0];
      for (const field of endpoint.fields) {
        if (!(field.apiField in sample)) {
          console.error(`[KEY4:${key}] FIELD MISMATCH: expected '${field.apiField}' not found. Available keys: ${Object.keys(sample).join(', ')}`);
        }
      }
    }

    const newRecords = records.filter(r => getDate(r) >= fetchFrom);

    if (newRecords.length === 0) return { inserted: 0, skipped: false, fetched: records.length };

    const colList = ['date', ...endpoint.fields.map(f => f.column)].join(', ');
    const placeholders = ['?', ...endpoint.fields.map(() => '?')].join(', ');

    const CHUNK = 100;
    let inserted = 0;

    for (let i = 0; i < newRecords.length; i += CHUNK) {
      const chunk = newRecords.slice(i, i + CHUNK);
      const stmts: D1PreparedStatement[] = [];

      for (const record of chunk) {
        const values: (string | number)[] = [getDate(record)];
        let valid = true;

        for (const field of endpoint.fields) {
          const rawVal = record[field.apiField];
          if (field.type === 'real') {
            const num = parseFloat(String(rawVal));
            if (isNaN(num)) { valid = false; break; }
            values.push(num);
          } else {
            if (!rawVal) { valid = false; break; }
            values.push(String(rawVal));
          }
        }

        if (!valid) continue;
        stmts.push(
          env.DB.prepare(
            `INSERT OR IGNORE INTO ${endpoint.table} (${colList}) VALUES (${placeholders})`
          ).bind(...values)
        );
      }

      if (stmts.length > 0) {
        await env.DB.batch(stmts);
        inserted += stmts.length;
      }
    }

    return { inserted, skipped: false, fetched: records.length };

  } catch (error: unknown) {
    logFetchFailure(`KEY4:${key}`, errorUrl(error, url), errorStatus(error), error);
    return { inserted: 0, skipped: false, fetched: 0, error: errorMessage(error), statusCode: errorStatus(error), endpointUrl: sanitizeUrl(errorUrl(error, url)) };
  }
}

// Identical to updateKey4Indicator but uses BGEOMETRICS_API_KEY_5.

async function updateKey5Indicator(
  env: Env,
  key: string,
  endpoint: Key2Endpoint,
): Promise<UpdateResult> {
  let url = `${BGEOMETRICS_BASE}/${endpoint.path}`;
  try {
    const latestDate = await getLatestDate(env.DB, endpoint.table);
    const today = toDateStr(new Date());

    if (latestDate) {
      const diffDays = Math.floor(
        (new Date(today + 'T00:00:00Z').getTime() - new Date(latestDate + 'T00:00:00Z').getTime()) / 86400000
      );
    } else {
    }

    const { fetchFrom, mode } = await getFetchPlan(env.DB, `KEY5:${key}`, endpoint.table, latestDate);

    url = `${BGEOMETRICS_BASE}/${endpoint.path}?startday=${fetchFrom}&token=${getBgeometricsToken(env, 'BGEOMETRICS_API_KEY_5', `KEY5:${key}`)}`;
    const raw: unknown = await fetchBgeometricsApiJson(env, `KEY5:${key}`, url);
    if (!Array.isArray(raw)) throw new Error(`Unexpected response shape: ${typeof raw}`);

    const records = raw as BGeometricsRecord[];
    const df = endpoint.dateField ?? 'd';
    const getDate = (record: BGeometricsRecord): string => String(record[df] ?? record.d ?? '');
    const apiLatest = records.length > 0 ? getDate(records[records.length - 1]) || 'none' : 'none';

    if (latestDate && apiLatest !== 'none' && apiLatest <= latestDate) {
      const context = key === 'etf'
        ? 'ETF endpoint can lag upstream; direct API was confirmed on 2026-05-11 to stop at 2026-05-07'
        : 'source lag, not a D1 write bug';
    }

    // Field discovery: log available fields if expected field is missing
    if (records.length > 0) {
      const sample = records[0];
      for (const field of endpoint.fields) {
        if (!(field.apiField in sample)) {
          console.error(`[KEY5:${key}] FIELD MISMATCH: expected '${field.apiField}' not found. Available keys: ${Object.keys(sample).join(', ')}`);
        }
      }
    }

    const newRecords = records.filter(r => getDate(r) >= fetchFrom);

    if (newRecords.length === 0) return { inserted: 0, skipped: false, fetched: records.length };

    const colList = ['date', ...endpoint.fields.map(f => f.column)].join(', ');
    const placeholders = ['?', ...endpoint.fields.map(() => '?')].join(', ');

    const CHUNK = 100;
    let inserted = 0;

    for (let i = 0; i < newRecords.length; i += CHUNK) {
      const chunk = newRecords.slice(i, i + CHUNK);
      const stmts: D1PreparedStatement[] = [];

      for (const record of chunk) {
        const dateStr = getDate(record);
        if (!dateStr) continue;
        const values: (string | number)[] = [dateStr];
        let valid = true;

        for (const field of endpoint.fields) {
          const rawVal = record[field.apiField];
          if (field.type === 'real') {
            const num = parseFloat(String(rawVal));
            if (isNaN(num)) { valid = false; break; }
            values.push(num);
          } else {
            if (!rawVal) { valid = false; break; }
            values.push(String(rawVal));
          }
        }

        if (!valid) continue;
        stmts.push(
          env.DB.prepare(
            `INSERT OR IGNORE INTO ${endpoint.table} (${colList}) VALUES (${placeholders})`
          ).bind(...values)
        );
      }

      if (stmts.length > 0) {
        await env.DB.batch(stmts);
        inserted += stmts.length;
      }
    }

    return { inserted, skipped: false, fetched: records.length };

  } catch (error: unknown) {
    logFetchFailure(`KEY5:${key}`, errorUrl(error, url), errorStatus(error), error);
    return { inserted: 0, skipped: false, fetched: 0, error: errorMessage(error), statusCode: errorStatus(error), endpointUrl: sanitizeUrl(errorUrl(error, url)) };
  }
}

// NOTE: FRED macro indicators have been moved to workers/fred-cron/index.ts
// (runs at 07:00 UTC in a separate worker to stay under the 50-subreq/invocation limit)

async function updateBgFreeIndicator(
  env: Env,
  key: string,
  endpoint: BgFreeEndpoint,
): Promise<UpdateResult> {
  let url = `${BGEOMETRICS_BASE}/${endpoint.path}`;
  try {
    const latestDate = await getLatestDate(env.DB, endpoint.table);
    const today = toDateStr(new Date());

    if (latestDate) {
      const diffDays = Math.floor(
        (new Date(today + 'T00:00:00Z').getTime() - new Date(latestDate + 'T00:00:00Z').getTime()) / 86400000
      );
    } else {
    }

    const { fetchFrom: fetchFromFree, mode } = await getFetchPlan(env.DB, `BGFREE:${key}`, endpoint.table, latestDate);
    url = `${BGEOMETRICS_BASE}/${endpoint.path}?startday=${fetchFromFree}&token=${getBgeometricsToken(env, 'BGEOMETRICS_API_KEY_5', `BGFREE:${key}`)}`;
    const raw: unknown = await fetchBgeometricsApiJson(env, `BGFREE:${key}`, url);
    if (!Array.isArray(raw)) throw new Error(`Unexpected response shape: ${typeof raw}`);

    const records = raw as Array<Record<string, string>>;
    const apiLatest = records.length > 0 ? records[records.length - 1].d : 'none';

    const newRecords = records.filter(r => r.d >= fetchFromFree);

    if (newRecords.length === 0) return { inserted: 0, skipped: false, fetched: records.length };

    const CHUNK = 100;
    let inserted = 0;

    for (let i = 0; i < newRecords.length; i += CHUNK) {
      const chunk = newRecords.slice(i, i + CHUNK);
      const stmts: D1PreparedStatement[] = [];

      for (const record of chunk) {
        const value = endpoint.computeValue(record);
        if (isNaN(value)) continue;
        stmts.push(
          env.DB.prepare(`INSERT OR IGNORE INTO ${endpoint.table} (date, value) VALUES (?, ?)`)
            .bind(record.d, value)
        );
      }

      if (stmts.length > 0) {
        await env.DB.batch(stmts);
        inserted += stmts.length;
      }
    }

    return { inserted, skipped: false, fetched: records.length };

  } catch (error: unknown) {
    logFetchFailure(`BGFREE:${key}`, errorUrl(error, url), errorStatus(error), error);
    return { inserted: 0, skipped: false, fetched: 0, error: errorMessage(error), statusCode: errorStatus(error), endpointUrl: sanitizeUrl(errorUrl(error, url)) };
  }
}


type CmcGlobalMetricsResponse = {
  data?: {
    btc_dominance?: number;
    eth_dominance?: number;
  };
};

type CoinGeckoGlobalResponse = {
  data?: {
    market_cap_percentage?: {
      btc?: number;
      eth?: number;
    };
  };
};

type CoinGeckoMarketChartResponse = {
  market_caps?: Array<[number, number]>;
  prices?: Array<[number, number]>;
};

type FearGreedRecord = {
  timestamp: string;
  value: string;
  value_classification: string;
};

type FearGreedResponse = {
  data?: FearGreedRecord[];
};

async function updateDominance(env: Env, today: string): Promise<{ inserted: number; skipped: boolean; error?: string }> {
  try {
    const latestDate = await getLatestDate(env.DB, 'dominance_data');

    if (latestDate) {
      const latest = new Date(latestDate + 'T00:00:00Z');
      const todayDate = new Date(today + 'T00:00:00Z');
      const diffDays = Math.floor((todayDate.getTime() - latest.getTime()) / 86400000);
      if (diffDays <= 1) {
        return { inserted: 0, skipped: true };
      }
    }


    if (!env.CMC_API_KEY) {
      logWarn('[Dominance] CMC_API_KEY missing — using CoinGecko global fallback');
      const globalRes = await fetch('https://api.coingecko.com/api/v3/global', {
        headers: { Accept: 'application/json', 'User-Agent': 'NOVRIX Sentiment Cron' },
        signal: AbortSignal.timeout(15000),
      });
      if (!globalRes.ok) throw new Error(`CoinGecko global ${globalRes.status}: ${await globalRes.text().catch(() => '')}`);
      const globalData = await globalRes.json() as CoinGeckoGlobalResponse;
      const btcDom = Number(globalData.data?.market_cap_percentage?.btc);
      const ethDom = Number(globalData.data?.market_cap_percentage?.eth);
      if (!Number.isFinite(btcDom) || !Number.isFinite(ethDom)) throw new Error('CoinGecko global dominance missing btc/eth');
      await env.DB.prepare(
        `INSERT OR IGNORE INTO dominance_data (date, btc_dominance, eth_dominance) VALUES (?, ?, ?)`
      ).bind(today, Math.round(btcDom * 100) / 100, Math.round(ethDom * 100) / 100).run();
      return { inserted: 1, skipped: false };
    }

    const cmcResponse = await fetch(CMC_API_URL, {
      headers: { 'X-CMC_PRO_API_KEY': env.CMC_API_KEY, Accept: 'application/json' },
    });

    if (!cmcResponse.ok) {
      throw new Error(`CMC API ${cmcResponse.status}: ${await cmcResponse.text()}`);
    }

    const cmcResult = await cmcResponse.json() as CmcGlobalMetricsResponse;
    const realBtcDom = cmcResult.data?.btc_dominance;
    const realEthDom = cmcResult.data?.eth_dominance;

    if (!realBtcDom || !realEthDom) {
      throw new Error('No dominance data from CoinMarketCap');
    }


    const geckoHeaders = { 'User-Agent': 'NOVRIX Terminal', Accept: 'application/json' };
    const [btcRes, ethRes] = await Promise.all([
      fetch(`${COINGECKO_BTC_URL}?vs_currency=usd&days=7&interval=daily`, { headers: geckoHeaders }),
      fetch(`${COINGECKO_ETH_URL}?vs_currency=usd&days=7&interval=daily`, { headers: geckoHeaders }),
    ]);

    if (!btcRes.ok || !ethRes.ok) {
      throw new Error(`CoinGecko API failed: BTC=${btcRes.status}, ETH=${ethRes.status}`);
    }

    const btcData = await btcRes.json() as CoinGeckoMarketChartResponse;
    const ethData = await ethRes.json() as CoinGeckoMarketChartResponse;
    const btcMcaps = btcData.market_caps || [];
    const ethMcaps = ethData.market_caps || [];

    if (!btcMcaps.length || !ethMcaps.length) {
      throw new Error('Empty CoinGecko market cap data');
    }

    const currentBtcMcap = btcMcaps[btcMcaps.length - 1][1];
    const currentEthMcap = ethMcaps[ethMcaps.length - 1][1];
    const realTotalMcap = currentBtcMcap / (realBtcDom / 100);
    const currentSum = currentBtcMcap + currentEthMcap;

    let inserted = 0;
    const stmts: D1PreparedStatement[] = [];
    for (let i = 0; i < btcMcaps.length; i++) {
      const tsMs = btcMcaps[i][0];
      const date = new Date(tsMs).toISOString().split('T')[0];
      const histBtc = btcMcaps[i][1];
      const histEth = i < ethMcaps.length ? ethMcaps[i][1] : 0;
      const histSum = histBtc + histEth;
      const ratio = currentSum > 0 ? histSum / currentSum : 1;
      const histTotal = realTotalMcap * ratio;
      const btcDom = histTotal > 0 ? Math.round(((histBtc / histTotal) * 100) * 100) / 100 : 0;
      const ethDom = histTotal > 0 ? Math.round(((histEth / histTotal) * 100) * 100) / 100 : 0;

      stmts.push(
        env.DB.prepare(
          `INSERT OR IGNORE INTO dominance_data (date, btc_dominance, eth_dominance) VALUES (?, ?, ?)`
        ).bind(date, btcDom, ethDom)
      );
      inserted++;
    }

    if (stmts.length > 0) await env.DB.batch(stmts);
    return { inserted, skipped: false };

  } catch (error: unknown) {
    console.error(`[Dominance Error] ${errorMessage(error)}`);
    return { inserted: 0, skipped: false, error: errorMessage(error) };
  }
}


function getSentimentLabel(score: number): string {
  if (score >= 0 && score <= 25) return 'Extreme Fear';
  if (score >= 26 && score <= 46) return 'Fear';
  if (score >= 47 && score <= 54) return 'Neutral';
  if (score >= 55 && score <= 75) return 'Greed';
  if (score >= 76 && score <= 100) return 'Extreme Greed';
  return 'Neutral';
}

function getTrendDirection(label: string): string {
  if (label === 'Extreme Fear' || label === 'Fear') return 'bearish';
  if (label === 'Extreme Greed' || label === 'Greed') return 'bullish';
  return 'neutral';
}

async function updateFearGreed(env: Env): Promise<{ success: boolean; inserted?: number; error?: string }> {
  try {
    // Check current state of fear_greed_data
    const stateRow = await env.DB.prepare(
      `SELECT COUNT(*) as count, MAX(date) as latest FROM fear_greed_data`
    ).first<{ count: number; latest: string | null }>();

    const count = stateRow?.count ?? 0;
    const latestDate = stateRow?.latest ?? null;
    const today = toDateStr(new Date());

    // Determine fetch strategy
    let limit = 1;
    if (count < 30 || !latestDate) {
      // First run or very sparse — seed full 3000-day history from Alternative.me
      limit = 3000;
    } else {
      const diffDays = Math.floor(
        (new Date(today + 'T00:00:00Z').getTime() - new Date(latestDate + 'T00:00:00Z').getTime()) / 86400000
      );
      if (diffDays <= 1) {
        return { success: true, inserted: 0 };
      }
    }

    const fngResponse = await fetch(`https://api.alternative.me/fng/?limit=${limit}&format=json`, {
      headers: { Accept: 'application/json', 'User-Agent': 'NOVRIX Terminal' },
      signal: AbortSignal.timeout(30000),
    });

    if (!fngResponse.ok) throw new Error(`Alternative.me API failed: ${fngResponse.status}`);

    const fngData = await fngResponse.json() as FearGreedResponse;
    if (!fngData.data?.length) throw new Error('No data from Alternative.me');

    // Alternative.me returns newest first — reverse to chronological order
    const records: FearGreedRecord[] = [...fngData.data].reverse();

    // Batch insert into fear_greed_data
    const CHUNK = 100;
    let inserted = 0;

    for (let i = 0; i < records.length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK);
      const stmts: D1PreparedStatement[] = [];

      for (const record of chunk) {
        const date = new Date(parseInt(record.timestamp) * 1000).toISOString().split('T')[0];
        const score = parseInt(record.value);
        if (!date || isNaN(score)) continue;

        stmts.push(
          env.DB.prepare(
            `INSERT OR IGNORE INTO fear_greed_data (date, score, classification) VALUES (?, ?, ?)`
          ).bind(date, score, record.value_classification)
        );
      }

      if (stmts.length > 0) {
        await env.DB.batch(stmts);
        inserted += stmts.length;
      }
    }


    // Also maintain sentiment_data with the latest record (for cached.ts / gauge)
    const latestRecord = fngData.data[0]; // newest first
    const score = parseInt(latestRecord.value);
    const label = getSentimentLabel(score);
    const trend = getTrendDirection(label);

    let btcDominance: number | null = null;
    let ethDominance: number | null = null;
    try {
      const cmcResponse = await fetch(CMC_API_URL, {
        headers: { 'X-CMC_PRO_API_KEY': env.CMC_API_KEY!, Accept: 'application/json' },
      });
      if (cmcResponse.ok) {
        const cmcData = await cmcResponse.json() as CmcGlobalMetricsResponse;
        const btc = cmcData.data?.btc_dominance;
        const eth = cmcData.data?.eth_dominance;
        if (Number.isFinite(btc) && Number.isFinite(eth)) {
          btcDominance = Math.round(Number(btc) * 100) / 100;
          ethDominance = Math.round(Number(eth) * 100) / 100;
        }
      }
    } catch {}


    await env.DB.prepare(`
      INSERT INTO sentiment_data
      (score, label, dominance, eth_dominance, trend_direction, source, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(score, label, btcDominance, ethDominance, trend, 'alternative.me', JSON.stringify(latestRecord)).run();

    // Cleanup old sentiment_data records
    const cleanup = await env.DB.prepare(`
      DELETE FROM sentiment_data
      WHERE timestamp < datetime('now', '-3650 days') AND source = 'alternative.me'
    `).run();
    if (cleanup.meta.changes && cleanup.meta.changes > 0) {
    }

    return { success: true, inserted };

  } catch (error: unknown) {
    console.error(`[FearGreed Error] ${errorMessage(error)}`);
    return { success: false, error: errorMessage(error) };
  }
}

// Called after KEY1's BGeometrics update. If btc_price_data is still 2+ days
// stale (BGeometrics publishes with a 1-2 day lag), fill missing days from
// CoinGecko free API so D1 stays current.

async function supplementBtcPriceFromCoinGecko(env: Env): Promise<{ inserted: number; skipped: boolean; error?: string }> {
  try {
    const latestDate = await getLatestDate(env.DB, 'btc_price_data');
    const today = toDateStr(new Date());
    if (!latestDate) return { inserted: 0, skipped: true };

    const daysBehind = Math.floor(
      (new Date(today + 'T00:00:00Z').getTime() - new Date(latestDate + 'T00:00:00Z').getTime()) / 86400000
    );
    if (daysBehind < 2) {
      return { inserted: 0, skipped: true };
    }

    const days = Math.min(daysBehind + 3, 14);
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      { headers: { Accept: 'application/json', 'User-Agent': 'NOVRIX Sentiment Cron' }, signal: AbortSignal.timeout(15000) }
    );

    if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${await res.text().catch(() => '')}`);

    const json = await res.json() as CoinGeckoMarketChartResponse;
    const prices: Array<[number, number]> = json.prices ?? [];
    if (!prices.length) throw new Error('Empty CoinGecko price data');

    const newEntries = prices
      .map(([ts, rawPrice]) => ({ date: new Date(ts).toISOString().slice(0, 10), price: Math.round(rawPrice * 100) / 100 }))
      .filter(e => e.date > latestDate && e.date <= today);

    if (newEntries.length === 0) {
      return { inserted: 0, skipped: false };
    }

    const stmts: D1PreparedStatement[] = newEntries.map(e =>
      env.DB.prepare(`INSERT OR IGNORE INTO btc_price_data (date, price) VALUES (?, ?)`).bind(e.date, e.price)
    );
    await env.DB.batch(stmts);
    return { inserted: stmts.length, skipped: false };

  } catch (error: unknown) {
    console.error(`[BTC Price CG Error] ${errorMessage(error)}`);
    return { inserted: 0, skipped: false, error: errorMessage(error) };
  }
}


type ApiJob = {
  label: string;
  table: string;
  run: (env: Env) => Promise<UpdateResult>;
};

type RunSummary = {
  total: number;
  succeeded: number;
  failed: number;
  failureRate: number;
  failedIndicators: Array<{ indicator: string; error: string; statusCode?: number | string | null; endpointUrl?: string }>;
};

function getBgeometricsApiJobs(): ApiJob[] {
  return [
    ...Object.entries(BGEOMETRICS_ENDPOINTS).map(([key, endpoint]) => ({
      label: `KEY1:${key}`,
      table: endpoint.table,
      run: (env: Env) => updateBGeometricsIndicator(env, key, endpoint),
    })),
    ...Object.entries(KEY2_ENDPOINTS).map(([key, endpoint]) => ({
      label: `KEY2:${key}`,
      table: endpoint.table,
      run: (env: Env) => updateKey2Indicator(env, key, endpoint),
    })),
    ...Object.entries(KEY3_ENDPOINTS).map(([key, endpoint]) => ({
      label: `KEY3:${key}`,
      table: endpoint.table,
      run: (env: Env) => updateKey3Indicator(env, key, endpoint),
    })),
    ...Object.entries(KEY4_ENDPOINTS).map(([key, endpoint]) => ({
      label: `KEY4:${key}`,
      table: endpoint.table,
      run: (env: Env) => updateKey4Indicator(env, key, endpoint),
    })),
    ...Object.entries(KEY5_ENDPOINTS).map(([key, endpoint]) => ({
      label: `KEY5:${key}`,
      table: endpoint.table,
      run: (env: Env) => updateKey5Indicator(env, key, endpoint),
    })),
    ...Object.entries(BGFREE_ENDPOINTS).map(([key, endpoint]) => ({
      label: `BGFREE:${key}`,
      table: endpoint.table,
      run: (env: Env) => updateBgFreeIndicator(env, key, endpoint),
    })),
  ];
}

function getSlotForDate(date: Date): number | null {
  const slot = date.getUTCHours() - BGEOMETRICS_SLOT_START_HOUR_UTC;
  const maxSlots = Math.ceil(getBgeometricsApiJobs().length / BGEOMETRICS_API_JOBS_PER_SLOT);
  return slot >= 0 && slot < maxSlots ? slot : null;
}

function summarizeResults(label: string, results: Record<string, UpdateResult>): RunSummary {
  const entries = Object.entries(results);
  const failedIndicators = entries
    .filter(([, result]) => Boolean(result.error))
    .map(([indicator, result]) => ({
      indicator,
      error: String(result.error),
      statusCode: result.statusCode,
      endpointUrl: typeof result.endpointUrl === 'string' ? result.endpointUrl : undefined,
    }));
  const failed = failedIndicators.length;
  const total = entries.length;
  const succeeded = total - failed;
  const failureRate = total === 0 ? 0 : failed / total;

  if (failed > 0) {
    console.error(`[Sentiment Cron Failures] label=${label} failed=${JSON.stringify(failedIndicators)}`);
  }
  if (total > 0 && failureRate > 0.1) {
    console.error(`[CRITICAL][Sentiment Cron] label=${label} failed=${failed}/${total} failureRate=${(failureRate * 100).toFixed(1)}% threshold=10% timestamp=${timestamp()}`);
  }

  return { total, succeeded, failed, failureRate, failedIndicators };
}

async function runChartRefresh(env: Env): Promise<Record<string, UpdateResult>> {
  const results: Record<string, UpdateResult> = {};

  for (const [key, endpoint] of Object.entries(SIMPLE_CHART_SERIES)) {
    results[`CHART:${key}`] = await updateChartSeriesIndicator(env, key, endpoint);
  }
  results['CHART:mayer'] = await updateMayerFromCharts(env);
  results['CHART:mvrv_zscore'] = await updateMvrvZscoreFromCharts(env);
  results['CHART:stablecoin_supply'] = await updateStablecoinSupplyFromCharts(env);
  results['CHART:hashribbons'] = await updateHashribbonsFromCharts(env);
  results['CHART:supply_profit_loss'] = await updateSupplyProfitLossFromCharts(env);

  return results;
}

async function runApiJobWithPriority(env: Env, job: ApiJob): Promise<UpdateResult> {
  const staleState = await getUpstreamStaleProbeState(env.DB, job.table, job.table);

  if (staleState.upstreamStale) {
    const attemptedToday = await hasUpstreamStaleAttemptToday(env.DB, job.table);
    if (attemptedToday) {
      logWarn(
        `[UPSTREAM STALE][Skipped] indicator=${job.label} table=${job.table} latest=${staleState.latest ?? 'none'} lagDays=${staleState.lagDays ?? 'unknown'} consecutiveStaleDays=${staleState.consecutiveStaleDays} reason=daily_probe_already_used timestamp=${timestamp()}`
      );
      return {
        skipped: true,
        success: true,
        reason: 'upstream_stale_daily_probe_already_used',
        latest: staleState.latest,
        lagDays: staleState.lagDays,
        consecutiveStaleDays: staleState.consecutiveStaleDays,
      };
    }

    await markUpstreamStaleAttemptToday(env.DB, job.table);
    logWarn(
      `[UPSTREAM STALE][Daily Probe] indicator=${job.label} table=${job.table} latest=${staleState.latest ?? 'none'} lagDays=${staleState.lagDays ?? 'unknown'} consecutiveStaleDays=${staleState.consecutiveStaleDays} timestamp=${timestamp()}`
    );
  }

  return runWithRetry(job.label, () => job.run(env));
}

async function runScheduledSlot(env: Env, slot: number): Promise<{
  slot: number;
  apiJobStart: number;
  apiJobEnd: number;
  apiJobTotal: number;
  results: Record<string, UpdateResult>;
  freshness: Awaited<ReturnType<typeof runFreshnessSanityCheck>>;
  summary: RunSummary;
}> {
  const today = toDateStr(new Date());
  const apiJobs = getBgeometricsApiJobs();
  const start = slot * BGEOMETRICS_API_JOBS_PER_SLOT;
  const jobs = apiJobs.slice(start, start + BGEOMETRICS_API_JOBS_PER_SLOT);
  const results: Record<string, UpdateResult> = {};

  console.log(
    `[Sentiment Cron] slot=${slot} startIndex=${start} jobs=${jobs.length} totalApiJobs=${apiJobs.length} maxApiRequestsPerHour=${BGEOMETRICS_API_LIMIT_PER_HOUR} timestamp=${timestamp()}`
  );

  if (slot === 0) {
    Object.assign(results, await runChartRefresh(env));
    results.btc_price_coingecko_supplement = await supplementBtcPriceFromCoinGecko(env);
    results.dominance = await updateDominance(env, today);
    results.fear_greed = await updateFearGreed(env);
  }

  for (const job of jobs) {
    results[job.label] = await runApiJobWithPriority(env, job);
  }

  const freshness = await runFreshnessSanityCheck(env);
  const summary = summarizeResults(`slot-${slot}`, results);

  return {
    slot,
    apiJobStart: start,
    apiJobEnd: start + jobs.length - 1,
    apiJobTotal: apiJobs.length,
    results,
    freshness,
    summary,
  };
}

const worker = {
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const slot = getSlotForDate(new Date());

    if (slot === null) {
      const freshness = await runFreshnessSanityCheck(env);
      return;
    }

    await runScheduledSlot(env, slot);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') ?? 'slot';

    if (mode === 'freshness') {
      const freshness = await runFreshnessSanityCheck(env);
      return new Response(JSON.stringify({ success: true, mode, freshness, timestamp: timestamp() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'plan') {
      const jobs = getBgeometricsApiJobs().map((job, index) => ({
        slot: Math.floor(index / BGEOMETRICS_API_JOBS_PER_SLOT),
        index,
        label: job.label,
        table: job.table,
      }));
      return new Response(JSON.stringify({
        success: true,
        mode,
        jobsPerSlot: BGEOMETRICS_API_JOBS_PER_SLOT,
        maxApiRequestsPerHour: BGEOMETRICS_API_LIMIT_PER_HOUR,
        apiBudgetWindowSeconds: BGEOMETRICS_API_LIMIT_WINDOW_SECONDS,
        retryDelayMs: BGEOMETRICS_RETRY_DELAY_MS,
        slots: Math.ceil(jobs.length / BGEOMETRICS_API_JOBS_PER_SLOT),
        jobs,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (mode === 'job') {
      const label = url.searchParams.get('label');
      const job = getBgeometricsApiJobs().find((candidate) => candidate.label === label);

      if (!label || !job) {
        return new Response(
          JSON.stringify({ error: 'Invalid job label. Use mode=plan to list labels.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await runApiJobWithPriority(env, job);
      const results = { [job.label]: result };
      const freshness = await runFreshnessSanityCheck(env);
      const summary = summarizeResults(`job-${job.label}`, results);

      return new Response(JSON.stringify({
        success: summary.failed === 0,
        mode,
        label,
        result,
        freshness,
        summary,
        timestamp: timestamp(),
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/health') {
      const checks: Record<string, { ok: boolean; detail?: string }> = {};
      let healthy = true;
      try {
        await env.DB.prepare('SELECT 1').first();
        checks.d1 = { ok: true };
      } catch (e) {
        checks.d1 = { ok: false, detail: String(e) };
        healthy = false;
      }
      checks.secrets = {
        ok: Boolean(env.BGEOMETRICS_API_KEY),
        detail: `BGEOMETRICS_API_KEY=${env.BGEOMETRICS_API_KEY ? 'SET' : 'MISSING'}`,
      };
      const status = healthy ? 200 : 503;
      return Response.json(
        { success: healthy, checks, timestamp: new Date().toISOString() },
        { status }
      );
    }

    const slotParam = url.searchParams.get('slot');
    const resolvedSlot = slotParam === null ? getSlotForDate(new Date()) : Number(slotParam);
    const maxSlots = Math.ceil(getBgeometricsApiJobs().length / BGEOMETRICS_API_JOBS_PER_SLOT);

    if (resolvedSlot === null || !Number.isInteger(resolvedSlot) || resolvedSlot < 0 || resolvedSlot >= maxSlots) {
      return new Response(
        JSON.stringify({ error: `Invalid slot. Use 0-${maxSlots - 1}, mode=plan, mode=freshness, or mode=job&label=<job label>.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const slot = resolvedSlot;
    const result = await runScheduledSlot(env, slot);
    const hasErrors = result.summary.failed > 0;
    return new Response(
      JSON.stringify({ success: !hasErrors, mode, ...result, timestamp: timestamp() }),
      { status: hasErrors ? 500 : 200, headers: { 'Content-Type': 'application/json' } }
    );
  },
};

export default worker;
