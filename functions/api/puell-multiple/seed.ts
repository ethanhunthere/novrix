/**
 * Cloudflare Pages Function - Puell Multiple Seed
 * Seeds full history from BGeometrics KEY 2.
 * Protected: POST only, requires X-Seed-Secret header.
 */

interface Env {
  DB: D1Database;
  BGEOMETRICS_API_KEY_2?: string;
}
import { requireSeedAdmin } from '../../lib/admin';


export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const denied = requireSeedAdmin(request, env);
  if (denied) return denied;

  try {
    const token = env.BGEOMETRICS_API_KEY_2 || '';
    const res = await fetch(
      `https://bitcoin-data.com/v1/puell-multiple?startday=2013-01-01&token=${token}`,
      { headers: { Accept: 'application/json', 'User-Agent': 'NOVRIX Seed' }, signal: AbortSignal.timeout(30000) }
    );
    if (!res.ok) throw new Error(`BGeometrics status ${res.status}`);
    const raw: Array<{ d: string; puellMultiple: string }> = await res.json();

    const CHUNK = 100;
    let inserted = 0;
    for (let i = 0; i < raw.length; i += CHUNK) {
      const stmts = raw.slice(i, i + CHUNK)
        .map((item) => {
          const value = parseFloat(item.puellMultiple);
          if (isNaN(value)) return null;
          return env.DB.prepare(`INSERT OR REPLACE INTO puell_data (date, value) VALUES (?, ?)`).bind(item.d, value);
        })
        .filter(Boolean) as D1PreparedStatement[];
      if (stmts.length > 0) { await env.DB.batch(stmts); inserted += stmts.length; }
    }

    return new Response(JSON.stringify({ success: true, inserted, total: raw.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[puell-multiple seed] Error:', message);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
