import { requireSeedAdmin } from '../../lib/admin';

interface Env {
  DB: D1Database;
  SEED_ADMIN_SECRET?: string;
}

type HealthStatus = 'OK' | 'UPSTREAM STALE' | 'CRITICAL';

type IndicatorHealth = {
  indicator: string;
  table: string;
  latestDate: string | null;
  daysBehindToday: number | null;
  consecutiveStaleDays: number;
  status: HealthStatus;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

const FRESHNESS_STALE_THRESHOLD_DAYS = 2;
const UPSTREAM_STALE_CONSECUTIVE_DAYS = 5;
const UPSTREAM_STALE_KEY_PREFIX = 'sentiment-cron:upstream-stale';
const KNOWN_UPSTREAM_DELAYED_TABLES = new Set(['etf_data']);

const BGEOMETRICS_HEALTH_TABLES = [
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
  ['open_interest_data', 'open_interest_data'],
  ['funding_rate_data', 'funding_rate_data'],
  ['etf_data', 'etf_data'],
  ['ssr_data', 'ssr_data'],
  ['crypto_market_cap_data', 'crypto_market_cap_data'],
] as const;

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function utcDayStartSeconds(date = new Date()): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000);
}

function calculateDaysBehind(latestDate: string | null, today: string): number | null {
  if (!latestDate) return null;
  const todayMs = new Date(`${today}T00:00:00Z`).getTime();
  const latestMs = new Date(`${latestDate}T00:00:00Z`).getTime();
  return Math.floor((todayMs - latestMs) / 86400000);
}

function upstreamStaleStateKey(table: string, latest: string | null): string {
  return `${UPSTREAM_STALE_KEY_PREFIX}:${table}:${latest ?? 'none'}`;
}

async function getLatestDate(db: D1Database, table: string): Promise<string | null> {
  const row = await db.prepare(`SELECT MAX(date) as latest FROM ${table}`).first<{ latest: string | null }>();
  return row?.latest ?? null;
}

async function getConsecutiveStaleDays(db: D1Database, table: string, latest: string | null): Promise<number> {
  if (!latest) return 0;
  const rows = await db.prepare(
    `SELECT window_start
     FROM rate_limits
     WHERE key = ?
     ORDER BY window_start DESC
     LIMIT 30`
  ).bind(upstreamStaleStateKey(table, latest)).all<{ window_start: number }>();

  const seen = new Set((rows.results ?? []).map(row => Number(row.window_start)));
  let consecutive = 0;
  for (let day = utcDayStartSeconds(); seen.has(day); day -= 86400) {
    consecutive += 1;
  }
  return consecutive;
}

function getStatus(table: string, daysBehindToday: number | null, consecutiveStaleDays: number): HealthStatus {
  if (daysBehindToday !== null && daysBehindToday <= FRESHNESS_STALE_THRESHOLD_DAYS) return 'OK';
  if (
    daysBehindToday !== null &&
    KNOWN_UPSTREAM_DELAYED_TABLES.has(table) &&
    daysBehindToday > FRESHNESS_STALE_THRESHOLD_DAYS
  ) {
    return 'UPSTREAM STALE';
  }
  if (consecutiveStaleDays > UPSTREAM_STALE_CONSECUTIVE_DAYS) return 'UPSTREAM STALE';
  return 'CRITICAL';
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: JSON_HEADERS });
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  const denied = requireSeedAdmin(request, env);
  if (denied) return denied;

  const today = toDateStr(new Date());
  const indicators: IndicatorHealth[] = [];

  try {
    for (const [indicator, table] of BGEOMETRICS_HEALTH_TABLES) {
      const latestDate = await getLatestDate(env.DB, table);
      const daysBehindToday = calculateDaysBehind(latestDate, today);
      const consecutiveStaleDays = await getConsecutiveStaleDays(env.DB, table, latestDate);
      indicators.push({
        indicator,
        table,
        latestDate,
        daysBehindToday,
        consecutiveStaleDays,
        status: getStatus(table, daysBehindToday, consecutiveStaleDays),
      });
    }

    const summary = indicators.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] += 1;
        return acc;
      },
      { total: 0, OK: 0, 'UPSTREAM STALE': 0, CRITICAL: 0 } as Record<HealthStatus | 'total', number>,
    );

    return new Response(JSON.stringify({
      success: true,
      today,
      timestamp: new Date().toISOString(),
      summary,
      indicators,
    }), { headers: JSON_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[sentiment-health] error=${message}`);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
