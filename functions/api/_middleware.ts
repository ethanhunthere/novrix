/**
 * BGeometrics API routes are D1-only by design.
 *
 * The sentiment cron worker is the only place allowed to call BGeometrics and
 * write normalized rows. Pages Functions must read D1 only; live upstream
 * fetches here can hide cron failures and burn the shared API rate limit from
 * user traffic.
 */

interface Env {
  DB: D1Database;
}

type D1Row = Record<string, string | number | null>;

type D1IndicatorConfig = {
  table: string;
  columns: string[];
  minRows?: number;
  mapRow: (row: D1Row) => Record<string, unknown>;
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const CACHE = 'public, s-maxage=3600, stale-while-revalidate=7200';
const DEFAULT_MIN_ROWS = 1;

function withTime(row: D1Row, values: Record<string, unknown>): Record<string, unknown> {
  return {
    time: `${row.date}T00:00:00Z`,
    ...values,
  };
}

function valueRow(row: D1Row): Record<string, unknown> {
  return withTime(row, { value: row.value });
}

function fieldRow(column: string, field: string): (row: D1Row) => Record<string, unknown> {
  return (row) => withTime(row, { [field]: row[column] });
}

const D1_BGEOMETRICS_ROUTES: Record<string, D1IndicatorConfig> = {
  '/api/200-week-ma': { table: 'week_ma_200_data', columns: ['value'], mapRow: valueRow },
  '/api/active-addresses': { table: 'active_addresses_data', columns: ['value'], mapRow: valueRow },
  '/api/aviv': { table: 'aviv_data', columns: ['value'], mapRow: valueRow },
  '/api/btc-price': { table: 'btc_price_data', columns: ['price'], mapRow: fieldRow('price', 'price') },
  '/api/crypto-market-cap': { table: 'crypto_market_cap_data', columns: ['value'], mapRow: valueRow },
  '/api/cvdd': { table: 'cvdd_data', columns: ['value'], mapRow: valueRow },
  '/api/etf': { table: 'etf_data', columns: ['value'], mapRow: valueRow },
  '/api/funding-rate': { table: 'funding_rate_data', columns: ['value'], mapRow: valueRow },
  '/api/hashrate': { table: 'hashrate_data', columns: ['hashrate'], mapRow: fieldRow('hashrate', 'hashrate') },
  '/api/hashribbons': {
    table: 'hashribbons_data',
    columns: ['sma_30', 'sma_60', 'signal'],
    mapRow: (row) => withTime(row, { sma_30: row.sma_30, sma_60: row.sma_60, signal: row.signal }),
  },
  '/api/highly-liquid-supply': { table: 'highly_liquid_data', columns: ['value'], mapRow: valueRow },
  '/api/hot-supply': {
    table: 'hot_supply_data',
    columns: ['hot_supply', 'hot_supply_usd'],
    mapRow: (row) => withTime(row, { hot_supply: row.hot_supply, hot_supply_usd: row.hot_supply_usd }),
  },
  '/api/lth-mvrv': { table: 'lth_mvrv_data', columns: ['lth_mvrv'], mapRow: fieldRow('lth_mvrv', 'lth_mvrv') },
  '/api/lth-position-change': { table: 'lth_position_change_data', columns: ['value'], mapRow: valueRow },
  '/api/market-cap': { table: 'market_cap_data', columns: ['value'], mapRow: valueRow },
  '/api/mayer-multiple': { table: 'mayer_data', columns: ['value'], mapRow: valueRow },
  '/api/miner-sell-pressure': { table: 'miner_sell_pressure_data', columns: ['value'], mapRow: valueRow },
  '/api/mpi': { table: 'mpi_data', columns: ['value'], mapRow: valueRow },
  '/api/mvrv': { table: 'mvrv_data', columns: ['mvrv'], mapRow: fieldRow('mvrv', 'mvrv') },
  '/api/mvrv-zscore': {
    table: 'mvrv_zscore_data',
    columns: ['mvrv_zscore'],
    mapRow: fieldRow('mvrv_zscore', 'value'),
  },
  '/api/nrpl': { table: 'nrpl_data', columns: ['value'], mapRow: valueRow },
  '/api/nupl': {
    table: 'nupl_data',
    columns: ['nupl'],
    mapRow: fieldRow('nupl', 'net_unrealized_profit_loss'),
  },
  '/api/nvt-zscore': { table: 'nvt_zscore_data', columns: ['value'], mapRow: valueRow },
  '/api/nvts': { table: 'nvts_data', columns: ['value'], mapRow: valueRow },
  '/api/open-interest': { table: 'open_interest_data', columns: ['value'], mapRow: valueRow },
  '/api/puell-multiple': { table: 'puell_data', columns: ['value'], mapRow: valueRow },
  '/api/realized-loss': {
    table: 'realized_loss_data',
    columns: ['realized_loss'],
    mapRow: fieldRow('realized_loss', 'realized_loss'),
  },
  '/api/realized-price': { table: 'realized_price_data', columns: ['value'], mapRow: valueRow },
  '/api/realized-profit': {
    table: 'realized_profit_data',
    columns: ['realized_profit'],
    mapRow: fieldRow('realized_profit', 'realized_profit'),
  },
  '/api/reserve-risk': { table: 'reserve_risk_data', columns: ['value'], mapRow: valueRow },
  '/api/rhodl-ratio': { table: 'rhodl_data', columns: ['value'], mapRow: valueRow },
  '/api/sopr': { table: 'sopr_data', columns: ['sopr'], mapRow: fieldRow('sopr', 'sopr') },
  '/api/ssr': { table: 'ssr_data', columns: ['ssr'], mapRow: fieldRow('ssr', 'ssr') },
  '/api/stablecoin-supply': { table: 'stablecoin_supply_data', columns: ['value'], mapRow: valueRow },
  '/api/sth-mvrv': { table: 'sth_mvrv_data', columns: ['sth_mvrv'], mapRow: fieldRow('sth_mvrv', 'sth_mvrv') },
  '/api/sth-position-change': { table: 'sth_position_change_data', columns: ['value'], mapRow: valueRow },
  '/api/supply-loss': {
    table: 'supply_loss_data',
    columns: ['supply_in_loss'],
    mapRow: fieldRow('supply_in_loss', 'supply_in_loss'),
  },
  '/api/supply-profit': {
    table: 'supply_profit_data',
    columns: ['supply_in_profit'],
    mapRow: fieldRow('supply_in_profit', 'supply_in_profit'),
  },
  '/api/supply-shock-ratio': { table: 'supply_shock_data', columns: ['value'], mapRow: valueRow },
  '/api/utxo-loss': { table: 'utxo_loss_data', columns: ['value'], mapRow: valueRow },
  '/api/utxo-profit': { table: 'utxo_profit_data', columns: ['value'], mapRow: valueRow },
  '/api/vdd': { table: 'vdd_data', columns: ['value'], mapRow: valueRow },
};

function json(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status,
    headers: {
      ...CORS,
      ...(init.headers ?? {}),
    },
  });
}

async function readD1Indicator(env: Env, config: D1IndicatorConfig): Promise<Response> {
  const columns = ['date', ...config.columns].join(', ');
  const result = await env.DB.prepare(
    `SELECT ${columns} FROM ${config.table} ORDER BY date ASC`
  ).all<D1Row>();

  const rows = result.results ?? [];
  const minRows = config.minRows ?? DEFAULT_MIN_ROWS;
  if (!result.success || rows.length < minRows) {
    return json(
      {
        success: false,
        error: 'D1 indicator data unavailable',
        table: config.table,
        rows: rows.length,
        source: 'd1',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const data = rows.map(config.mapRow);
  return json(
    { success: true, data, payload: data.length, source: 'd1' },
    { headers: { 'Cache-Control': CACHE } }
  );
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const rawPathname = new URL(context.request.url).pathname;
  const pathname = rawPathname.length > 1 && rawPathname.endsWith('/')
    ? rawPathname.slice(0, -1)
    : rawPathname;
  const config = D1_BGEOMETRICS_ROUTES[pathname];

  if (!config) {
    return context.next();
  }

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  if (context.request.method !== 'GET') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    return await readD1Indicator(context.env, config);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[BGeometrics D1 API] path=${pathname} error=${message}`);
    return json(
      { success: false, error: 'D1 indicator query failed', message, source: 'd1' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
};
