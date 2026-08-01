/**
 * GET /api/sentiment/all
 *
 * D1-only batch endpoint for the core BGeometrics sentiment panels. The cron
 * worker owns every upstream BGeometrics call and every D1 write; this endpoint
 * only reads already-normalized rows.
 *
 * RESILIENCE: Uses db.batch() for speed, but falls back to individual queries
 * if any statement in the batch fails, so one broken table cannot zero out the
 * entire response.
 */

interface Env {
  DB: D1Database;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const CACHE = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200';

type BatchRow = Record<string, string | number | null>;

function mapRows<T>(res: D1Result<unknown>, minRows: number, mapper: (row: BatchRow) => T): T[] | null {
  if (!res.success || !res.results || res.results.length < minRows) return null;
  return (res.results as BatchRow[]).map(mapper);
}

interface QueryDef {
  key: string;
  sql: string;
  minRows: number;
  mapper: (row: BatchRow) => Record<string, unknown>;
}

const QUERIES: QueryDef[] = [
  {
    key: 'nupl',
    sql: `SELECT date, nupl FROM nupl_data ORDER BY date ASC`,
    minRows: 30,
    mapper: (row) => ({ time: `${row.date}T00:00:00Z`, net_unrealized_profit_loss: row.nupl }),
  },
  {
    key: 'mvrv',
    sql: `SELECT date, mvrv FROM mvrv_data ORDER BY date ASC`,
    minRows: 30,
    mapper: (row) => ({ time: `${row.date}T00:00:00Z`, mvrv: row.mvrv }),
  },
  {
    key: 'sopr',
    sql: `SELECT date, sopr FROM sopr_data ORDER BY date ASC`,
    minRows: 30,
    mapper: (row) => ({ time: `${row.date}T00:00:00Z`, sopr: row.sopr }),
  },
  {
    key: 'lthMvrv',
    sql: `SELECT date, lth_mvrv FROM lth_mvrv_data ORDER BY date ASC`,
    minRows: 30,
    mapper: (row) => ({ time: `${row.date}T00:00:00Z`, lth_mvrv: row.lth_mvrv }),
  },
  {
    key: 'ssr',
    sql: `SELECT date, ssr FROM ssr_data ORDER BY date ASC`,
    minRows: 30,
    mapper: (row) => ({ time: `${row.date}T00:00:00Z`, ssr: row.ssr }),
  },
  {
    key: 'supplyLoss',
    sql: `SELECT date, supply_in_loss FROM supply_loss_data ORDER BY date ASC`,
    minRows: 30,
    mapper: (row) => ({ time: `${row.date}T00:00:00Z`, supply_in_loss: row.supply_in_loss }),
  },
  {
    key: 'supplyProfit',
    sql: `SELECT date, supply_in_profit FROM supply_profit_data ORDER BY date ASC`,
    minRows: 30,
    mapper: (row) => ({ time: `${row.date}T00:00:00Z`, supply_in_profit: row.supply_in_profit }),
  },
  {
    key: 'realizedProfit',
    sql: `SELECT date, realized_profit FROM realized_profit_data ORDER BY date ASC`,
    minRows: 30,
    mapper: (row) => ({ time: `${row.date}T00:00:00Z`, realized_profit: row.realized_profit }),
  },
  {
    key: 'realizedLoss',
    sql: `SELECT date, realized_loss FROM realized_loss_data ORDER BY date ASC`,
    minRows: 30,
    mapper: (row) => ({ time: `${row.date}T00:00:00Z`, realized_loss: row.realized_loss }),
  },
  {
    key: 'sthMvrv',
    sql: `SELECT date, sth_mvrv FROM sth_mvrv_data ORDER BY date ASC`,
    minRows: 30,
    mapper: (row) => ({ time: `${row.date}T00:00:00Z`, sth_mvrv: row.sth_mvrv }),
  },
  {
    key: 'hashrate',
    sql: `SELECT date, hashrate FROM hashrate_data ORDER BY date ASC`,
    minRows: 1,
    mapper: (row) => ({ time: `${row.date}T00:00:00Z`, hashrate: row.hashrate }),
  },
  {
    key: 'btcPrice',
    sql: `SELECT date, price FROM btc_price_data ORDER BY date ASC`,
    minRows: 2000,
    mapper: (row) => ({ time: `${row.date}T00:00:00Z`, price: row.price }),
  },
];

async function runBatch(db: D1Database): Promise<Record<string, unknown[] | null>> {
  // Fast path: run all queries in a single D1 batch.
  try {
    const stmts = QUERIES.map((q) => db.prepare(q.sql));
    const batch = await db.batch(stmts);
    const out: Record<string, unknown[] | null> = {};
    for (let i = 0; i < QUERIES.length; i++) {
      const q = QUERIES[i];
      out[q.key] = mapRows(batch[i], q.minRows, q.mapper);
    }
    return out;
  } catch {
    // Slow path: one bad table should not zero out the entire response.
    // Fall back to individual queries so partial data still reaches the UI.
    const out: Record<string, unknown[] | null> = {};
    for (const q of QUERIES) {
      try {
        const res = await db.prepare(q.sql).all<BatchRow>();
        out[q.key] = mapRows(res, q.minRows, q.mapper);
      } catch {
        out[q.key] = null;
      }
    }
    return out;
  }
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: CORS },
    );
  }

  try {
    const data = await runBatch(env.DB);
    const partial = Object.values(data).some((v) => v === null);
    return new Response(JSON.stringify({ success: true, data, partial, source: 'd1-batch' }), {
      headers: { ...CORS, 'Cache-Control': CACHE },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[sentiment/all] D1 batch error: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: 'D1 batch failed', message }),
      { status: 503, headers: CORS },
    );
  }
};
