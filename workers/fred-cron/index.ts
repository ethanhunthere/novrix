/**
 * NOVRIX FRED Cron Worker
 *
 * Schedule: 07:00 UTC daily
 *
 * Fetches 39 FRED (Federal Reserve Economic Data) macro-economic series and
 * upserts them into Cloudflare D1 tables. Runs in a dedicated worker to keep
 * the total subrequest count under the 50/invocation limit.
 *
 * Rate limit: FRED allows 120 API requests/minute on the free tier — no issue
 * with 39 sequential calls + 200ms delay between each.
 */

const FRED_API_BASE = 'https://api.stlouisfed.org/fred/series/observations';

interface FREDEndpoint {
  seriesId: string;   // FRED series identifier
  table: string;      // D1 table name
  scale?: number;     // optional multiplier (e.g. billions → raw units)
}

interface Env {
  DB: D1Database;
  AUTH_DB: D1Database;
  FRED_API_KEY: string;
}

interface FREDUpdateResult {
  inserted: number;
  skipped: boolean;
  fetched: number;
  error?: string;
}

type FREDRunResults = Record<string, FREDUpdateResult> | { _skipped: true; reason: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logWarn(...args: unknown[]): void {
  console.warn(...args);
}

function isFREDUpdateResult(value: unknown): value is FREDUpdateResult {
  return typeof value === 'object' && value !== null && 'inserted' in value;
}

// 39 series — all confirmed valid on FRED as of 2025.
// Note: gold uses GOLDPMGBD228NLBM (London PM fix) — the AM series was discontinued.

const FRED_ENDPOINTS: Record<string, FREDEndpoint> = {
  dxy:       { seriesId: 'DTWEXBGS',          table: 'dxy_data' },
  vix:       { seriesId: 'VIXCLS',            table: 'vix_data' },
  fedfunds:  { seriesId: 'FEDFUNDS',          table: 'fedfunds_data' },
  sp500:     { seriesId: 'SP500',             table: 'sp500_data' },
  gold:      { seriesId: 'NASDAQQGLDI',        table: 'gold_data' }, // NASDAQ Gold Index (USD/oz, daily)
  m2:        { seriesId: 'M2SL',              table: 'm2_data', scale: 1_000_000_000 },

  sofr:      { seriesId: 'SOFR',              table: 'fred_sofr_data' },
  walcl:     { seriesId: 'WALCL',             table: 'fred_walcl_data' },
  rrpontsyd: { seriesId: 'RRPONTSYD',         table: 'fred_rrpontsyd_data' },

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

  mabmm301:  { seriesId: 'MABMM301USM189S',   table: 'fred_mabmm301_data' },

  unrate:    { seriesId: 'UNRATE',            table: 'fred_unrate_data' },
  payems:    { seriesId: 'PAYEMS',            table: 'fred_payems_data' },
  icsa:      { seriesId: 'ICSA',              table: 'fred_icsa_data' },
  jtsjol:    { seriesId: 'JTSJOL',            table: 'fred_jtsjol_data' },
  emratio:   { seriesId: 'EMRATIO',           table: 'fred_emratio_data' },

  gdpc1:     { seriesId: 'GDPC1',             table: 'fred_gdpc1_data' },
  indpro:    { seriesId: 'INDPRO',            table: 'fred_indpro_data' },
  houst:     { seriesId: 'HOUST',             table: 'fred_houst_data' },
  umcsent:   { seriesId: 'UMCSENT',           table: 'fred_umcsent_data' },
  rsxfs:     { seriesId: 'RSXFS',             table: 'fred_rsxfs_data' },

  dcoilwtico:   { seriesId: 'DCOILWTICO',      table: 'fred_dcoilwtico_data' },
  bamlh0a0hym2: { seriesId: 'BAMLH0A0HYM2',   table: 'fred_bamlh0a0hym2_data' },
  mortgage30us: { seriesId: 'MORTGAGE30US',    table: 'fred_mortgage30us_data' },

  totalsl:   { seriesId: 'TOTALSL',           table: 'fred_totalsl_data' },
};

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function getLatestDate(db: D1Database, table: string): Promise<string | null> {
  try {
    const row = await db.prepare(`SELECT MAX(date) as latest FROM ${table}`).first<{ latest: string | null }>();
    return row?.latest ?? null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateFREDIndicator(
  db: D1Database,
  key: string,
  endpoint: FREDEndpoint,
  apiKey: string,
): Promise<{ inserted: number; skipped: boolean; fetched: number; error?: string }> {
  try {
    if (!apiKey) {
      logWarn(`[FRED:${key}] No FRED_API_KEY configured — skipping`);
      return { inserted: 0, skipped: true, fetched: 0, error: 'FRED_API_KEY not set' };
    }

    const latestDate = await getLatestDate(db, endpoint.table);
    const today = toDateStr(new Date());

    if (latestDate) {
      const diffDays = Math.floor(
        (new Date(today + 'T00:00:00Z').getTime() - new Date(latestDate + 'T00:00:00Z').getTime()) / 86400000
      );
      if (diffDays === 0) {
        return { inserted: 0, skipped: true, fetched: 0 };
      }
    }

    const params = new URLSearchParams({
      series_id: endpoint.seriesId,
      api_key: apiKey,
      file_type: 'json',
      observation_start: latestDate ?? '1990-01-01',
    });
    const url = `${FRED_API_BASE}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'NOVRIX FRED Cron/1.0' },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`FRED HTTP ${response.status} for ${endpoint.seriesId}: ${body.substring(0, 200)}`);
    }

    const json: { observations: Array<{ date: string; value: string }> } = await response.json();
    const observations = json.observations ?? [];
    const scale = endpoint.scale ?? 1;
    const records: Array<{ date: string; value: number }> = [];

    for (const obs of observations) {
      if (!obs.date || !obs.value || obs.value === '.') continue;
      const value = parseFloat(obs.value) * scale;
      if (isNaN(value)) continue;
      records.push({ date: obs.date, value });
    }

    const newRecords = latestDate ? records.filter(r => r.date > latestDate) : records;

    if (newRecords.length === 0) return { inserted: 0, skipped: false, fetched: records.length };

    const CHUNK = 100;
    let inserted = 0;

    for (let i = 0; i < newRecords.length; i += CHUNK) {
      const chunk = newRecords.slice(i, i + CHUNK);
      const stmts: D1PreparedStatement[] = chunk.map(r =>
        db.prepare(`INSERT OR REPLACE INTO ${endpoint.table} (date, value) VALUES (?, ?)`)
          .bind(r.date, r.value)
      );
      if (stmts.length > 0) {
        await db.batch(stmts);
        inserted += stmts.length;
      }
    }

    return { inserted, skipped: false, fetched: records.length };

  } catch (error: unknown) {
    const message = errorMessage(error);
    console.error(`[FRED:${key} Error] ${message}`);
    return { inserted: 0, skipped: false, fetched: 0, error: message };
  }
}

const LOCK_KEY = 'fred-cron:running';
const LOCK_TTL_MINUTES = 30;

async function acquireLock(db: D1Database): Promise<boolean> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const row = await db
      .prepare('SELECT window_start FROM rate_limits WHERE key = ?')
      .bind(LOCK_KEY)
      .first<{ window_start: number }>();
    if (row && now - row.window_start < LOCK_TTL_MINUTES * 60) {
      return false;
    }
    await db
      .prepare('INSERT OR REPLACE INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)')
      .bind(LOCK_KEY, now)
      .run();
    return true;
  } catch (error: unknown) {
    console.error(`[FRED Cron] Lock check failed: ${error instanceof Error ? error.message : String(error)}`);
    return true; // fail-open on lock error — better to run twice than never
  }
}

async function runFREDUpdates(env: Env): Promise<FREDRunResults> {
  const results: Record<string, FREDUpdateResult> = {};
  const apiKey = env.FRED_API_KEY ?? '';

  if (!(await acquireLock(env.DB))) {
    return { _skipped: true, reason: 'lock_active' };
  }

  const entries = Object.entries(FRED_ENDPOINTS);
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) await sleep(200);
    const [key, endpoint] = entries[i];
    results[key] = await updateFREDIndicator(env.DB, key, endpoint, apiKey);
  }

  const inserted = Object.values(results).reduce((sum: number, r) => sum + r.inserted, 0);
  const errors = Object.entries(results).filter(([, r]) => r.error).map(([k]) => k);
  if (errors.length > 0) console.error(`[FRED Cron] Errors on: ${errors.join(', ')}`);

  return results;
}

async function cleanupExpiredSessions(db: D1Database): Promise<number> {
  try {
    const result = await db
      .prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`)
      .run();
    return result.meta?.changes ?? 0;
  } catch (error: unknown) {
    console.error(`[FRED Cron] Session cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    return 0;
  }
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const results = await runFREDUpdates(env);
    await cleanupExpiredSessions(env.AUTH_DB);
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

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
        ok: Boolean(env.FRED_API_KEY),
        detail: `FRED_API_KEY=${env.FRED_API_KEY ? 'SET' : 'MISSING'}`,
      };
      const status = healthy ? 200 : 503;
      return Response.json(
        { success: healthy, checks, timestamp: new Date().toISOString() },
        { status }
      );
    }

    const results = await runFREDUpdates(env);
    const hasErrors = Object.values(results).some((r) => isFREDUpdateResult(r) && r.error);
    return new Response(
      JSON.stringify({ success: !hasErrors, results, timestamp: new Date().toISOString() }),
      { status: hasErrors ? 500 : 200, headers: { 'Content-Type': 'application/json' } }
    );
  },
};
