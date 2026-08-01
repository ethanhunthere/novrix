interface Env { DB: D1Database; BGEOMETRICS_API_KEY_4?: string; }
import { requireSeedAdmin } from '../../lib/admin';
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = requireSeedAdmin(request, env); if (denied) return denied;
  try {
    const res = await fetch(`https://bitcoin-data.com/v1/highly-liquid-supply?startday=2013-01-01&token=${env.BGEOMETRICS_API_KEY_4 || ''}`, { headers: { Accept: 'application/json', 'User-Agent': 'NOVRIX Seed' }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const raw: Array<{ d: string; highlyLiquidSupply: string | number }> = await res.json();
    let inserted = 0;
    for (let i = 0; i < raw.length; i += 100) {
      const stmts = raw.slice(i, i + 100).map((item) => { const v = parseFloat(String(item.highlyLiquidSupply)); if (isNaN(v)) return null; return env.DB.prepare(`INSERT OR REPLACE INTO highly_liquid_data (date, value) VALUES (?, ?)`).bind(item.d, v); }).filter(Boolean) as D1PreparedStatement[];
      if (stmts.length > 0) { await env.DB.batch(stmts); inserted += stmts.length; }
    }
    return new Response(JSON.stringify({ success: true, inserted, total: raw.length }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: unknown) { const message = error instanceof Error ? error.message : String(error); console.error('[highly-liquid-supply seed] Error:', message); return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
