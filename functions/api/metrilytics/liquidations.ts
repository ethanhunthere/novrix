/**
 * Liquidations Intelligence API
 * 
 * Endpoint: GET /api/metrilytics/liquidations
 * 
 * Query Parameters:
 * - symbol (optional): Filter by symbol (BTC, ETH, SOL, etc.)
 * - hours (optional, default=24): Time window in hours (1, 4, 12, 24, 48, 168)
 * - exchange (optional): Filter by exchange
 * - side (optional): Filter by 'long' or 'short'
 * - min_size (optional): Minimum liquidation size in USD
 */

interface Env {
  METRILYTICS_DB: D1Database;
}

interface LiquidationRow {
  symbol: string;
  side: string;
  size_usd: number;
  price: number;
  exchange: string;
  timestamp: string;
  leverage: number | null;
}

interface CascadeFactors {
  volume_1h: number;
  volume_ratio: number;
  price_velocity: number;
  oi_change_1h: number;
  funding_extreme: boolean;
}

interface CascadeResult {
  score: number;
  level: 'low' | 'moderate' | 'high' | 'extreme';
  factors: CascadeFactors;
  alert: string;
}

// In-memory cache (30 second TTL)
let cachedData: { data: unknown; timestamp: number; key: string } | null = null;
const CACHE_TTL_MS = 30_000;

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Parse query parameters
  const symbol = url.searchParams.get('symbol');
  const hours = parseInt(url.searchParams.get('hours') || '24');
  const exchange = url.searchParams.get('exchange');
  const side = url.searchParams.get('side');
  const minSize = parseFloat(url.searchParams.get('min_size') || '0');
  
  // Check cache
  const cacheKey = `${symbol || 'all'}_${hours}_${exchange || 'all'}_${side || 'all'}_${minSize}`;
  if (cachedData && cachedData.key === cacheKey && Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cachedData.data), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' }
    });
  }
  
  try {
    const db = env.METRILYTICS_DB;
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    
    // Build WHERE clause
    const conditions: string[] = ['timestamp >= ?'];
    const params: (string | number)[] = [since];
    
    if (symbol && symbol !== 'all') {
      conditions.push('symbol = ?');
      params.push(symbol);
    }
    
    if (exchange && exchange !== 'all') {
      conditions.push('exchange = ?');
      params.push(exchange);
    }
    
    if (side && side !== 'all') {
      conditions.push('side = ?');
      params.push(side);
    }
    
    if (minSize > 0) {
      conditions.push('size_usd >= ?');
      params.push(minSize);
    }
    
    const whereClause = conditions.join(' AND ');
    
    // 1. Summary metrics
    const summaryQuery = `
      SELECT 
        SUM(CASE WHEN side = 'long' THEN size_usd ELSE 0 END) as total_long_usd,
        SUM(CASE WHEN side = 'short' THEN size_usd ELSE 0 END) as total_short_usd,
        SUM(size_usd) as total_usd,
        SUM(CASE WHEN side = 'long' THEN 1 ELSE 0 END) as long_count,
        SUM(CASE WHEN side = 'short' THEN 1 ELSE 0 END) as short_count,
        MAX(size_usd) as largest_single,
        COUNT(*) as total_count
      FROM liquidations_data
      WHERE ${whereClause}
    `;
    
    const summary = await db.prepare(summaryQuery).bind(...params).first<{
      total_long_usd: number;
      total_short_usd: number;
      total_usd: number;
      long_count: number;
      short_count: number;
      largest_single: number;
      total_count: number;
    }>();
    
    // 2. Most liquidated symbol
    const mostLiquidatedQuery = `
      SELECT symbol, SUM(size_usd) as total
      FROM liquidations_data
      WHERE ${whereClause}
      GROUP BY symbol
      ORDER BY total DESC
      LIMIT 1
    `;
    
    const mostLiquidated = await db.prepare(mostLiquidatedQuery).bind(...params).first<{ symbol: string; total: number }>();
    
    // 3. Most toxic exchange (highest liquidation ratio)
    const toxicExchangeQuery = `
      SELECT exchange, SUM(size_usd) as total
      FROM liquidations_data
      WHERE ${whereClause}
      GROUP BY exchange
      ORDER BY total DESC
      LIMIT 1
    `;
    
    const toxicExchange = await db.prepare(toxicExchangeQuery).bind(...params).first<{ exchange: string; total: number }>();
    
    // 4. Hourly breakdown
    const hourlyQuery = `
      SELECT 
        strftime('%Y-%m-%dT%H:00:00Z', timestamp) as hour,
        SUM(CASE WHEN side = 'long' THEN size_usd ELSE 0 END) as long_usd,
        SUM(CASE WHEN side = 'short' THEN size_usd ELSE 0 END) as short_usd,
        SUM(size_usd) as total_usd,
        COUNT(*) as count,
        AVG(size_usd) as avg_size,
        MAX(size_usd) as max_size
      FROM liquidations_data
      WHERE ${whereClause}
      GROUP BY hour
      ORDER BY hour ASC
    `;
    
    const hourly = await db.prepare(hourlyQuery).bind(...params).all<{
      hour: string;
      long_usd: number;
      short_usd: number;
      total_usd: number;
      count: number;
      avg_size: number;
      max_size: number;
    }>();
    
    // 5. Heatmap data (price levels x hours)
    const heatmapQuery = `
      SELECT 
        CAST(price / 500 AS INTEGER) * 500 as price_level,
        strftime('%Y-%m-%dT%H:00:00Z', timestamp) as hour,
        SUM(size_usd) as total
      FROM liquidations_data
      WHERE ${whereClause}
      GROUP BY price_level, hour
      ORDER BY price_level ASC, hour ASC
    `;
    
    const heatmapRaw = await db.prepare(heatmapQuery).bind(...params).all<{ price_level: number; hour: string; total: number }>();
    
    // Transform heatmap into matrix format
    const priceLevels = [...new Set(heatmapRaw.results.map((r) => r.price_level))].sort((a, b) => a - b);
    const hoursList = [...new Set(heatmapRaw.results.map((r) => r.hour))].sort();
    
    const heatmapValues: number[][] = hoursList.map(hour => 
      priceLevels.map(price => {
        const match = heatmapRaw.results.find((r) => r.price_level === price && r.hour === hour);
        return match ? match.total : 0;
      })
    );
    
    // 6. Recent liquidations (last 20)
    const recentQuery = `
      SELECT 
        symbol,
        side,
        size_usd,
        price,
        exchange,
        timestamp,
        leverage
      FROM liquidations_data
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT 20
    `;
    
    const recent = await db.prepare(recentQuery).bind(...params).all<{
      symbol: string;
      side: string;
      size_usd: number;
      price: number;
      exchange: string;
      timestamp: string;
      leverage: number | null;
    }>();
    
    // Add time_ago to recent
    const recentWithTimeAgo = recent.results.map((r) => ({
      ...r,
      time_ago: getTimeAgo(new Date(r.timestamp))
    }));
    
    // 7. Exchange breakdown
    const exchangeBreakdownQuery = `
      SELECT 
        exchange,
        SUM(size_usd) as total_usd,
        COUNT(*) as count,
        AVG(size_usd) as avg_size,
        SUM(CASE WHEN side = 'long' THEN size_usd ELSE 0 END) * 100.0 / SUM(size_usd) as long_pct,
        SUM(CASE WHEN side = 'short' THEN size_usd ELSE 0 END) * 100.0 / SUM(size_usd) as short_pct
      FROM liquidations_data
      WHERE ${whereClause}
      GROUP BY exchange
      ORDER BY total_usd DESC
    `;
    
    const byExchange = await db.prepare(exchangeBreakdownQuery).bind(...params).all<{
      exchange: string;
      total_usd: number;
      count: number;
      avg_size: number;
      long_pct: number;
      short_pct: number;
    }>();
    
    // 8. Symbol breakdown
    const symbolBreakdownQuery = `
      SELECT 
        symbol,
        SUM(size_usd) as total_usd,
        COUNT(*) as count,
        SUM(CASE WHEN side = 'long' THEN size_usd ELSE 0 END) as long_usd,
        SUM(CASE WHEN side = 'short' THEN size_usd ELSE 0 END) as short_usd,
        SUM(CASE WHEN side = 'long' THEN size_usd ELSE 0 END) * 100.0 / SUM(size_usd) as long_pct
      FROM liquidations_data
      WHERE ${whereClause}
      GROUP BY symbol
      ORDER BY total_usd DESC
    `;
    
    const bySymbol = await db.prepare(symbolBreakdownQuery).bind(...params).all<{
      symbol: string;
      total_usd: number;
      count: number;
      long_usd: number;
      short_usd: number;
      long_pct: number;
    }>();
    
    // 9. Calculate cascade score
    const cascade = await calculateCascadeScore(db, hours);
    
    // 10. Data freshness
    const freshnessQuery = `
      SELECT MAX(timestamp) as latest
      FROM liquidations_data
    `;
    
    const freshness = await db.prepare(freshnessQuery).first<{ latest: string }>();
    const dataFreshnessSeconds = freshness?.latest 
      ? Math.floor((Date.now() - new Date(freshness.latest).getTime()) / 1000)
      : 999999;
    
    // Build response
    const response = {
      success: true,
      data: {
        summary: {
          total_long_usd: summary?.total_long_usd || 0,
          total_short_usd: summary?.total_short_usd || 0,
          total_usd: summary?.total_usd || 0,
          long_count: summary?.long_count || 0,
          short_count: summary?.short_count || 0,
          largest_single: summary?.largest_single || 0,
          most_liquidated_symbol: mostLiquidated?.symbol || 'N/A',
          most_toxic_exchange: toxicExchange?.exchange || 'N/A',
          cascade_score: cascade.score
        },
        hourly: hourly.results || [],
        heatmap: {
          price_levels: priceLevels,
          hours: hoursList,
          values: heatmapValues
        },
        recent: recentWithTimeAgo,
        by_exchange: byExchange.results || [],
        by_symbol: bySymbol.results || [],
        cascade
      },
      meta: {
        window_hours: hours,
        data_freshness_seconds: dataFreshnessSeconds,
        exchanges: ['binance', 'bybit', 'okx', 'hyperliquid'],
        symbols: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'MATIC']
      }
    };
    
    // Cache response
    cachedData = { data: response, timestamp: Date.now(), key: cacheKey };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30'
      }
    });
    
  } catch (error) {
    console.error('[liquidations] API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper: Calculate cascade score
async function calculateCascadeScore(db: D1Database, windowHours: number): Promise<CascadeResult> {
  const now = Date.now();
  const oneHourAgo = new Date(now - 3600_000).toISOString();
  const sevenDaysAgo = new Date(now - 7 * 24 * 3600_000).toISOString();
  
  // Factor 1: Liquidation volume in last hour
  const volume1hQuery = `
    SELECT SUM(size_usd) as total
    FROM liquidations_data
    WHERE timestamp >= ?
  `;
  
  const volume1h = await db.prepare(volume1hQuery).bind(oneHourAgo).first<{ total: number }>();
  const liquidationVolume1h = volume1h?.total || 0;
  
  // Factor 2: Average hourly volume over 7 days
  const avgVolumeQuery = `
    SELECT AVG(hourly_total) as avg_volume
    FROM (
      SELECT strftime('%Y-%m-%dT%H:00:00Z', timestamp) as hour, SUM(size_usd) as hourly_total
      FROM liquidations_data
      WHERE timestamp >= ?
      GROUP BY hour
    )
  `;
  
  const avgVolume = await db.prepare(avgVolumeQuery).bind(sevenDaysAgo).first<{ avg_volume: number }>();
  const avgLiquidationVolume7d = avgVolume?.avg_volume || 1;
  
  // Factor 3: Price velocity (fetch from prices table)
  const priceQuery = `
    SELECT close
    FROM btc_prices
    WHERE date >= ?
    ORDER BY date DESC
    LIMIT 2
  `;
  
  const prices = await db.prepare(priceQuery).bind(oneHourAgo.split('T')[0]).all<{ close: number }>();
  let priceChange1h = 0;
  
  if (prices.results && prices.results.length >= 2) {
    const current = prices.results[0].close;
    const previous = prices.results[1].close;
    priceChange1h = ((current - previous) / previous) * 100;
  }
  
  // Factor 4: OI change (fetch from derivatives table)
  const oiQuery = `
    SELECT open_interest_usd
    FROM derivatives_data
    WHERE date >= ? AND symbol = 'BTC'
    ORDER BY date DESC
    LIMIT 2
  `;
  
  const oiData = await db.prepare(oiQuery).bind(oneHourAgo.split('T')[0]).all<{ open_interest_usd: number }>();
  let oiChange1h = 0;
  
  if (oiData.results && oiData.results.length >= 2) {
    const current = oiData.results[0].open_interest_usd;
    const previous = oiData.results[1].open_interest_usd;
    oiChange1h = ((current - previous) / previous) * 100;
  }
  
  // Factor 5: Funding rate (fetch from derivatives table)
  const fundingQuery = `
    SELECT funding_rate
    FROM derivatives_data
    WHERE date >= ? AND symbol = 'BTC'
    ORDER BY date DESC
    LIMIT 1
  `;
  
  const fundingData = await db.prepare(fundingQuery).bind(oneHourAgo.split('T')[0]).first<{ funding_rate: number }>();
  const fundingRate = fundingData?.funding_rate || 0;
  
  // Calculate scores
  const volumeRatio = liquidationVolume1h / avgLiquidationVolume7d;
  const volumeScore = Math.min(40, Math.max(0, (volumeRatio - 1) * 20));
  
  const priceScore = Math.min(25, Math.abs(priceChange1h) * 5);
  
  const oiScore = Math.min(20, Math.abs(oiChange1h) * 2);
  
  const fundingScore = Math.min(15, Math.abs(fundingRate) * 1000);
  
  const totalScore = Math.round(volumeScore + priceScore + oiScore + fundingScore);
  
  let level: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
  if (totalScore >= 70) level = 'extreme';
  else if (totalScore >= 50) level = 'high';
  else if (totalScore >= 30) level = 'moderate';
  
  const alert = totalScore >= 50
    ? `Liquidation volume ${volumeRatio.toFixed(1)}x above 7d average. Monitor for cascade.`
    : 'Liquidation activity within normal range.';
  
  return {
    score: totalScore,
    level,
    factors: {
      volume_1h: liquidationVolume1h,
      volume_ratio: volumeRatio,
      price_velocity: priceChange1h,
      oi_change_1h: oiChange1h,
      funding_extreme: Math.abs(fundingRate) > 0.001
    },
    alert
  };
}

// Helper: Time ago formatter
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
