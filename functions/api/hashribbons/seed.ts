interface Env { DB: D1Database; BGEOMETRICS_API_KEY_2?: string; }
import { requireSeedAdmin } from '../../lib/admin';
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = requireSeedAdmin(request, env); if (denied) return denied;
  try {
    const res = await fetch(`https://bitcoin-data.com/v1/hashribbons?startday=2013-01-01&token=${env.BGEOMETRICS_API_KEY_2 || ''}`, { headers: { Accept: 'application/json', 'User-Agent': 'NOVRIX Seed' }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const raw: Array<{ d: string; sma_30: number; sma_60: number; hashribbons: string }> = await res.json();
    let inserted = 0;
    for (let i = 0; i < raw.length; i += 100) {
      const stmts = raw.slice(i, i + 100).map((item) => {
        const s30 = parseFloat(String(item.sma_30));
        const s60 = parseFloat(String(item.sma_60));
        const sig = item.hashribbons;
        if (isNaN(s30) || isNaN(s60) || !sig) return null;
        return env.DB.prepare(`INSERT OR REPLACE INTO hashribbons_data (date, sma_30, sma_60, signal) VALUES (?, ?, ?, ?)`).bind(item.d, s30, s60, sig);
      }).filter(Boolean) as D1PreparedStatement[];
      if (stmts.length > 0) { await env.DB.batch(stmts); inserted += stmts.length; }
    }
    return new Response(JSON.stringify({ success: true, inserted, total: raw.length }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: unknown) { const message = error instanceof Error ? error.message : String(error); console.error('[hashribbons seed] Error:', message); return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
