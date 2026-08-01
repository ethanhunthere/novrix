/**
 * Protocol Comparison & Ratio Analytics API
 * 
 * Endpoint: GET /api/metrilytics/protocol-compare
 * 
 * Query Parameters:
 * - slugs (required): Comma-separated protocol slugs (e.g., "aave,compound,uniswap")
 * - days (optional, default=90): Historical window for trend analysis
 */

interface Env {
  METRILYTICS_DB: D1Database;
}

interface Ratios {
  p_s: number;
  p_f: number;
  tvl_mcap: number;
  fees_tvl: number;
  rev_tvl: number;
  fee_capture: number;
}

interface ProtocolComparison {
  slug: string;
  name: string;
  category: string;
  tvl_usd: number;
  mcap_usd: number;
  fees_24h: number;
  revenue_24h: number;
  ratios: Ratios;
  change_7d: { tvl: number; fees: number; revenue: number };
  change_30d: { tvl: number; fees: number; revenue: number };
  history: { dates: string[]; p_s: number[]; p_f: number[]; tvl: number[]; mcap: number[] };
}

interface Divergence {
  protocols: string[];
  metric: string;
  divergence_pct: number;
  signal: string;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Parse query parameters
  const slugsParam = url.searchParams.get('slugs');
  const days = parseInt(url.searchParams.get('days') || '90');
  
  if (!slugsParam) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing required parameter: slugs'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const slugs = slugsParam.split(',').map(s => s.trim()).filter(Boolean);
  
  if (slugs.length < 2) {
    return new Response(JSON.stringify({
      success: false,
      error: 'At least 2 protocols required for comparison'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const db = env.METRILYTICS_DB;
    const since = new Date(Date.now() - days * 24 * 3600_000).toISOString().split('T')[0];
    
    // Fetch current data for all protocols
    const protocols = await Promise.all(slugs.map(async (slug) => {
      // Get latest TVL
      const tvlData = await db.prepare(`
        SELECT protocol, tvl_usd, category
        FROM protocol_tvl
        WHERE slug = ?
        ORDER BY date DESC
        LIMIT 1
      `).bind(slug).first<{ protocol: string; tvl_usd: number; category: string | null }>();
      
      // Get latest mcap
      const mcapData = await db.prepare(`
        SELECT mcap_usd, token_symbol
        FROM protocol_mcap
        WHERE slug = ?
        ORDER BY date DESC
        LIMIT 1
      `).bind(slug).first<{ mcap_usd: number; token_symbol: string }>();
      
      // Get latest fees/revenue
      const feesData = await db.prepare(`
        SELECT daily_fees_usd, daily_revenue_usd
        FROM protocol_fees
        WHERE slug = ?
        ORDER BY date DESC
        LIMIT 1
      `).bind(slug).first<{ daily_fees_usd: number; daily_revenue_usd: number }>();
      
      // Get 7d ago TVL for growth calculation
      const tvl7dAgo = await db.prepare(`
        SELECT tvl_usd
        FROM protocol_tvl
        WHERE slug = ? AND date <= date('now', '-7 days')
        ORDER BY date DESC
        LIMIT 1
      `).bind(slug).first<{ tvl_usd: number }>();
      
      // Get 30d ago TVL for growth calculation
      const tvl30dAgo = await db.prepare(`
        SELECT tvl_usd
        FROM protocol_tvl
        WHERE slug = ? AND date <= date('now', '-30 days')
        ORDER BY date DESC
        LIMIT 1
      `).bind(slug).first<{ tvl_usd: number }>();
      
      // Get 7d ago fees for growth calculation
      const fees7dAgo = await db.prepare(`
        SELECT daily_fees_usd, daily_revenue_usd
        FROM protocol_fees
        WHERE slug = ? AND date <= date('now', '-7 days')
        ORDER BY date DESC
        LIMIT 1
      `).bind(slug).first<{ daily_fees_usd: number; daily_revenue_usd: number }>();
      
      // Get 30d ago fees for growth calculation
      const fees30dAgo = await db.prepare(`
        SELECT daily_fees_usd, daily_revenue_usd
        FROM protocol_fees
        WHERE slug = ? AND date <= date('now', '-30 days')
        ORDER BY date DESC
        LIMIT 1
      `).bind(slug).first<{ daily_fees_usd: number; daily_revenue_usd: number }>();
      
      if (!tvlData || !mcapData) {
        return null; // Skip protocols without complete data
      }
      
      const tvl = tvlData.tvl_usd || 0;
      const mcap = mcapData.mcap_usd || 0;
      const fees24h = feesData?.daily_fees_usd || 0;
      const revenue24h = feesData?.daily_revenue_usd || 0;
      
      // Calculate ratios
      const ratios = calculateRatios(tvl, mcap, fees24h, revenue24h);
      
      // Calculate growth metrics
      const change_7d = {
        tvl: calculateChange(tvl, tvl7dAgo?.tvl_usd || 0),
        fees: calculateChange(fees24h, fees7dAgo?.daily_fees_usd || 0),
        revenue: calculateChange(revenue24h, fees7dAgo?.daily_revenue_usd || 0)
      };
      
      const change_30d = {
        tvl: calculateChange(tvl, tvl30dAgo?.tvl_usd || 0),
        fees: calculateChange(fees24h, fees30dAgo?.daily_fees_usd || 0),
        revenue: calculateChange(revenue24h, fees30dAgo?.daily_revenue_usd || 0)
      };
      
      // Get historical data for trends
      const history = await getHistoricalRatios(db, slug, since);
      
      return {
        slug,
        name: tvlData.protocol,
        category: tvlData.category || 'Unknown',
        tvl_usd: tvl,
        mcap_usd: mcap,
        fees_24h: fees24h,
        revenue_24h: revenue24h,
        ratios,
        change_7d,
        change_30d,
        history
      };
    }));
    
    // Filter out null protocols
    const validProtocols = protocols.filter(p => p !== null);
    
    if (validProtocols.length < 2) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Insufficient data for comparison (need at least 2 protocols with complete data)'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Calculate rankings for scatter plot
    const rankings = validProtocols.map(p => ({
      slug: p.slug,
      name: p.name,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      revenue_annualized: p.revenue_24h * 365,
      p_s: p.ratios.p_s,
      quadrant: '' // Will be calculated below
    }));
    
    // Classify quadrants
    const avgTvl = rankings.reduce((sum, r) => sum + r.tvl_usd, 0) / rankings.length;
    const avgRevenue = rankings.reduce((sum, r) => sum + r.revenue_annualized, 0) / rankings.length;
    
    rankings.forEach(r => {
      r.quadrant = classifyQuadrant(r.tvl_usd, r.revenue_annualized, avgTvl, avgRevenue);
    });
    
    // Detect divergences
    const divergences = detectDivergences(validProtocols);
    
    // Build response
    const response = {
      success: true,
      data: {
        protocols: validProtocols,
        rankings,
        divergences
      },
      meta: {
        protocols_compared: validProtocols.length,
        window_days: days,
        last_updated: new Date().toISOString()
      }
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // 1 hour cache
      }
    });
    
  } catch (error) {
    console.error('[protocol-compare] API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper: Calculate ratios
function calculateRatios(tvl: number, mcap: number, fees24h: number, revenue24h: number): Ratios {
  const annualizedFees = fees24h * 365;
  const annualizedRevenue = revenue24h * 365;
  
  return {
    p_s: mcap > 0 && annualizedRevenue > 0 ? mcap / annualizedRevenue : 0,
    p_f: mcap > 0 && annualizedFees > 0 ? mcap / annualizedFees : 0,
    tvl_mcap: mcap > 0 ? tvl / mcap : 0,
    fees_tvl: tvl > 0 ? annualizedFees / tvl : 0,
    rev_tvl: tvl > 0 ? annualizedRevenue / tvl : 0,
    fee_capture: fees24h > 0 ? revenue24h / fees24h : 0
  };
}

// Helper: Calculate % change
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

// Helper: Classify quadrant
function classifyQuadrant(tvl: number, revenue: number, avgTvl: number, avgRevenue: number): string {
  const highTvl = tvl > avgTvl;
  const highRevenue = revenue > avgRevenue;
  
  if (highTvl && highRevenue) return 'mature';
  if (highTvl && !highRevenue) return 'undervalued';
  if (!highTvl && highRevenue) return 'high_growth';
  return 'overvalued';
}

// Helper: Get historical ratios
async function getHistoricalRatios(db: D1Database, slug: string, since: string) {
  const historyData = await db.prepare(`
    SELECT 
      t.date,
      t.tvl_usd,
      m.mcap_usd,
      f.daily_fees_usd,
      f.daily_revenue_usd
    FROM protocol_tvl t
    LEFT JOIN protocol_mcap m ON t.slug = m.slug AND t.date = m.date
    LEFT JOIN protocol_fees f ON t.slug = f.slug AND t.date = f.date
    WHERE t.slug = ? AND t.date >= ?
    ORDER BY t.date ASC
  `).bind(slug, since).all<{
    date: string;
    tvl_usd: number;
    mcap_usd: number;
    daily_fees_usd: number;
    daily_revenue_usd: number;
  }>();
  
  if (!historyData.results) {
    return { dates: [], p_s: [], p_f: [], tvl: [], mcap: [] };
  }
  
  const dates: string[] = [];
  const p_s: number[] = [];
  const p_f: number[] = [];
  const tvl: number[] = [];
  const mcap: number[] = [];
  
  for (const row of historyData.results) {
    const t = row.tvl_usd || 0;
    const m = row.mcap_usd || 0;
    const f = (row.daily_fees_usd || 0) * 365;
    const r = (row.daily_revenue_usd || 0) * 365;
    
    dates.push(row.date);
    tvl.push(t);
    mcap.push(m);
    p_s.push(m > 0 && r > 0 ? m / r : 0);
    p_f.push(m > 0 && f > 0 ? m / f : 0);
  }
  
  return { dates, p_s, p_f, tvl, mcap };
}

// Helper: Detect divergences
function detectDivergences(protocols: ProtocolComparison[]): Divergence[] {
  const divergences: Divergence[] = [];
  
  // Compare P/S ratios
  for (let i = 0; i < protocols.length; i++) {
    for (let j = i + 1; j < protocols.length; j++) {
      const p1 = protocols[i];
      const p2 = protocols[j];
      
      const ps1 = p1.ratios.p_s;
      const ps2 = p2.ratios.p_s;
      
      if (ps1 > 0 && ps2 > 0) {
        const divergencePct = Math.abs((ps1 - ps2) / Math.min(ps1, ps2)) * 100;
        
        if (divergencePct > 30) {
          divergences.push({
            protocols: [p1.slug, p2.slug],
            metric: 'p_s',
            divergence_pct: divergencePct,
            signal: `${p1.name} P/S diverging from ${p2.name} — potential alpha opportunity`
          });
        }
      }
    }
  }
  
  return divergences;
}
