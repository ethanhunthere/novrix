/**
 * Cloudflare Pages Function — RWA (Real World Assets) Data
 * Returns RWA protocol metrics from DeFi Llama.
 */

interface Env {
  METRILYTICS_DB: D1Database;
}

interface RwaProtocol {
  name: string;
  slug: string;
  category: string;
  tvl_usd: number;
  chains: string[];
}

interface RwaSummary {
  total_tvl_usd: number;
  protocol_count: number;
  categories: { name: string; tvl_usd: number }[];
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
};

// Major RWA protocol slugs
const RWA_PROTOCOLS = [
  'ondo-finance', 'centrifuge', 'maple-finance', 'goldfinch', 'truefi',
  'clearpool', 'makerdao', 'spark', 'frax-finance', 'angle-protocol',
  'synthetix', 'backed-finance', 'matrixdock', 'openeden', 'superstate',
  'blackrock-usd-institutional-digital-liquidity-fund', 'franklin-templeton',
  'hashnote', 'swipe', 'polymesh', 'mantra-dao',
];

const RWA_CATEGORIES: Record<string, string> = {
  'ondo-finance': 'Tokenized Treasuries',
  'centrifuge': 'Private Credit',
  'maple-finance': 'Institutional Lending',
  'goldfinch': 'Emerging Markets Credit',
  'truefi': 'Unsecured Lending',
  'clearpool': 'Institutional Lending',
  'makerdao': 'Stablecoin / RWA Collateral',
  'spark': 'Lending',
  'frax-finance': 'Algorithmic Stablecoin',
  'angle-protocol': 'Stablecoin',
  'synthetix': 'Synthetic Assets',
  'backed-finance': 'Tokenized Securities',
  'matrixdock': 'Tokenized Treasuries',
  'openeden': 'Tokenized Treasuries',
  'superstate': 'Tokenized Treasuries',
  'blackrock-usd-institutional-digital-liquidity-fund': 'Tokenized Treasuries',
  'franklin-templeton': 'Tokenized Treasuries',
  'hashnote': 'Tokenized Treasuries',
  'swipe': 'Tokenized Assets',
  'polymesh': 'Security Tokens',
  'mantra-dao': 'RWA L1',
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    // Fetch protocol TVL data from D1
    const protocolResult = await env.METRILYTICS_DB.prepare(`
      SELECT protocol, slug, date, tvl_usd, category
      FROM protocol_tvl
      WHERE date >= date('now', '-7 days')
      ORDER BY date DESC
    `).all<{ protocol: string; slug: string; date: string; tvl_usd: number; category: string | null }>();

    // Get latest data per protocol
    const latestBySlug: Record<string, { protocol: string; tvl_usd: number; category: string | null }> = {};
    for (const row of protocolResult.results || []) {
      if (!latestBySlug[row.slug]) {
        latestBySlug[row.slug] = {
          protocol: row.protocol,
          tvl_usd: row.tvl_usd,
          category: row.category,
        };
      }
    }

    // Build RWA protocols list
    const rwaProtocols: RwaProtocol[] = [];
    const categoryTotals: Record<string, number> = {};
    let totalTvl = 0;

    for (const slug of RWA_PROTOCOLS) {
      const data = latestBySlug[slug];
      if (data && data.tvl_usd > 0) {
        const category = RWA_CATEGORIES[slug] || 'RWA';
        rwaProtocols.push({
          name: data.protocol,
          slug,
          category,
          tvl_usd: data.tvl_usd,
          chains: ['Ethereum'], // Most RWAs are on Ethereum
        });

        totalTvl += data.tvl_usd;
        categoryTotals[category] = (categoryTotals[category] || 0) + data.tvl_usd;
      }
    }

    // Sort by TVL
    rwaProtocols.sort((a, b) => b.tvl_usd - a.tvl_usd);

    // Build category summary
    const categories = Object.entries(categoryTotals)
      .map(([name, tvl_usd]) => ({ name, tvl_usd }))
      .sort((a, b) => b.tvl_usd - a.tvl_usd);

    const summary: RwaSummary = {
      total_tvl_usd: totalTvl,
      protocol_count: rwaProtocols.length,
      categories,
    };

    return new Response(
      JSON.stringify({
        success: true,
        protocols: rwaProtocols,
        summary,
      }),
      { headers: CORS }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[RWA] Error: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: CORS }
    );
  }
};
