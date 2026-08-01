/**
 * GET /api/metrilytics/yields?limit=50
 * Returns top yield pools by TVL from the yields_data table with risk analytics.
 */

interface Env { METRILYTICS_DB: D1Database; }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    const url   = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    const rows = await env.METRILYTICS_DB
      .prepare(
        `SELECT pool_id, protocol, chain, symbol, apy, apy_base, apy_reward, tvl_usd, 
                risk_score, il_risk, audited, pool_age_days, updated_at
         FROM yields_data
         ORDER BY tvl_usd DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<{ 
        pool_id: string; 
        protocol: string; 
        chain: string; 
        symbol: string; 
        apy: number; 
        apy_base: number | null;
        apy_reward: number | null;
        tvl_usd: number; 
        risk_score: number | null;
        il_risk: string | null;
        audited: number | null;
        pool_age_days: number | null;
        updated_at: string 
      }>();

    const yields = (rows.results ?? []).map(row => ({
      ...row,
      real_yield: row.apy_base ?? row.apy,
      risk_level: getRiskLevel(row.risk_score ?? 50),
      yield_type: getYieldType(row.apy_base ?? 0, row.apy_reward ?? 0),
      audited: Boolean(row.audited)
    }));

    return new Response(
      JSON.stringify({ success: true, yields, count: yields.length }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', yields: [] }), {
      status: 500, headers: CORS,
    });
  }
};

function getRiskLevel(score: number): string {
  if (score < 30) return 'low';
  if (score < 60) return 'moderate';
  return 'high';
}

function getYieldType(apyBase: number, apyReward: number): string {
  if (apyReward === 0) return 'real';
  const total = apyBase + apyReward;
  if (total === 0) return 'unknown';
  const rewardPct = (apyReward / total) * 100;
  
  if (rewardPct < 20) return 'mostly_real';
  if (rewardPct < 50) return 'mixed';
  if (rewardPct < 80) return 'mostly_emissions';
  return 'pure_emissions';
}
