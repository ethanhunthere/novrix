/**
 * Cloudflare Pages Function — Staking & Restaking Data
 * Returns staking metrics for major protocols (Lido, EigenLayer, Rocket Pool, etc.)
 * Data sourced from DeFi Llama.
 */

interface Env {
  METRILYTICS_DB: D1Database;
}

interface StakingProtocol {
  name: string;
  slug: string;
  category: string;
  tvl_usd: number;
  chain: string;
  change_24h: number;
  change_7d: number;
}

interface StakingSummary {
  total_staked_usd: number;
  total_restaked_usd: number;
  liquid_staking_usd: number;
  protocol_count: number;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
};

// Major staking/restaking protocol slugs
const STAKING_PROTOCOLS = [
  'lido', 'rocket-pool', 'stakewise', 'frax-ether', 'mantle-staked-eth',
  'eigenlayer', 'ether-fi', 'renzo', 'puffer-finance', 'kelp-dao',
  'swell-network', 'stader-labs', 'ankr', 'bifrost-liquid-staking',
  'marinade-finance', 'jito', 'blaze-staking', 'solayer',
];

const RESTAKING_PROTOCOLS = [
  'eigenlayer', 'ether-fi', 'renzo', 'puffer-finance', 'kelp-dao',
  'swell-network', 'bedrock-technology', 'kernel-dao', 'symbiotic',
];

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
    const latestBySlug: Record<string, { protocol: string; tvl_usd: number; category: string | null; date: string }> = {};
    for (const row of protocolResult.results || []) {
      if (!latestBySlug[row.slug]) {
        latestBySlug[row.slug] = {
          protocol: row.protocol,
          tvl_usd: row.tvl_usd,
          category: row.category,
          date: row.date,
        };
      }
    }

    // Build staking protocols list
    const stakingProtocols: StakingProtocol[] = [];
    let totalStaked = 0;
    let totalRestaked = 0;
    let liquidStaking = 0;

    for (const slug of STAKING_PROTOCOLS) {
      const data = latestBySlug[slug];
      if (data && data.tvl_usd > 0) {
        const isRestaking = RESTAKING_PROTOCOLS.includes(slug);
        const isLiquidStaking = data.category?.toLowerCase().includes('liquid staking') ||
                                ['lido', 'rocket-pool', 'stakewise', 'frax-ether', 'mantle-staked-eth',
                                 'marinade-finance', 'jito', 'blaze-staking', 'solayer'].includes(slug);

        stakingProtocols.push({
          name: data.protocol,
          slug,
          category: isRestaking ? 'Restaking' : isLiquidStaking ? 'Liquid Staking' : 'Staking',
          tvl_usd: data.tvl_usd,
          chain: 'Ethereum', // Most are on Ethereum
          change_24h: 0,
          change_7d: 0,
        });

        if (isRestaking) {
          totalRestaked += data.tvl_usd;
        } else {
          totalStaked += data.tvl_usd;
        }
        if (isLiquidStaking) {
          liquidStaking += data.tvl_usd;
        }
      }
    }

    // Sort by TVL
    stakingProtocols.sort((a, b) => b.tvl_usd - a.tvl_usd);

    const summary: StakingSummary = {
      total_staked_usd: totalStaked,
      total_restaked_usd: totalRestaked,
      liquid_staking_usd: liquidStaking,
      protocol_count: stakingProtocols.length,
    };

    return new Response(
      JSON.stringify({
        success: true,
        protocols: stakingProtocols,
        summary,
      }),
      { headers: CORS }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[Staking] Error: ${message}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: CORS }
    );
  }
};
