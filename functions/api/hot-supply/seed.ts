interface Env { DB: D1Database; BGEOMETRICS_API_KEY_2?: string; }
import { requireSeedAdmin } from '../../lib/admin';
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = requireSeedAdmin(request, env); if (denied) return denied;
  try {
    const res = await fetch(`https://bitcoin-data.com/v1/hot-supply?startday=2013-01-01&token=${env.BGEOMETRICS_API_KEY_2 || ''}`, { headers: { Accept: 'application/json', 'User-Agent': 'NOVRIX Seed' }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const raw: Array<{ d: string; hotSupply: number; hotSupplyUsd: number }> = await res.json();
    let inserted = 0;
    for (let i = 0; i < raw.length; i += 100) {
      const stmts = raw.slice(i, i + 100).map((item) => {
        const hs = parseFloat(String(item.hotSupply));
        const hsu = parseFloat(String(item.hotSupplyUsd));
        if (isNaN(hs) || isNaN(hsu)) return null;
        return env.DB.prepare(`INSERT OR REPLACE INTO hot_supply_data (date, hot_supply, hot_supply_usd) VALUES (?, ?, ?)`).bind(item.d, hs, hsu);
      }).filter(Boolean) as D1PreparedStatement[];
      if (stmts.length > 0) { await env.DB.batch(stmts); inserted += stmts.length; }
    }
    return new Response(JSON.stringify({ success: true, inserted, total: raw.length }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: unknown) { const message = error instanceof Error ? error.message : String(error); console.error('[hot-supply seed] Error:', message); return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
