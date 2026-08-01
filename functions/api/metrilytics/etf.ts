/**
 * ETF Flows & Institutional Holdings API
 * 
 * Endpoint: GET /api/metrilytics/etf
 * 
 * Query Parameters:
 * - asset (optional): Filter by BTC or ETH (default: all)
 * - days (optional, default=30): Historical window in days
 * - etf (optional): Filter by specific ETF symbol
 */

interface Env {
  METRILYTICS_DB: D1Database;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Parse query parameters
  const asset = url.searchParams.get('asset');
  const days = parseInt(url.searchParams.get('days') || '30');
  const etfSymbol = url.searchParams.get('etf');
  
  try {
    const db = env.METRILYTICS_DB;
    const since = new Date(Date.now() - days * 24 * 3600_000).toISOString().split('T')[0];
    
    // Build WHERE clause
    const conditions: string[] = ['date >= ?'];
    const params: (string | number)[] = [since];
    
    if (asset && asset !== 'all') {
      conditions.push('asset = ?');
      params.push(asset);
    }
    
    if (etfSymbol) {
      conditions.push('etf_symbol = ?');
      params.push(etfSymbol);
    }
    
    const whereClause = conditions.join(' AND ');
    
    // 1. Summary metrics
    const summaryQuery = `
      SELECT 
        SUM(daily_flow_usd) as daily_flow_usd,
        MAX(cumulative_flow_usd) as cumulative_flow_usd,
        SUM(aum_usd) as total_aum_usd,
        SUM(btc_holdings) as total_btc_holdings
      FROM etf_flows
      WHERE date = (SELECT MAX(date) FROM etf_flows WHERE ${whereClause})
        ${asset && asset !== 'all' ? 'AND asset = ?' : ''}
    `;
    
    const summaryParams = asset && asset !== 'all' ? [...params.slice(1), asset] : params.slice(1);
    const summary = await db.prepare(summaryQuery).bind(...summaryParams).first<{
      daily_flow_usd: number;
      cumulative_flow_usd: number;
      total_aum_usd: number;
      total_btc_holdings: number;
    }>();
    
    // 2. Flow streak (consecutive days of inflow/outflow)
    const streakQuery = `
      SELECT daily_flow_usd
      FROM etf_flows
      WHERE ${whereClause}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `;
    
    const streakData = await db.prepare(streakQuery).bind(...params).all<{ daily_flow_usd: number }>();
    let streakDays = 0;
    
    if (streakData.results && streakData.results.length > 0) {
      const firstFlow = streakData.results[0].daily_flow_usd;
      const isInflow = firstFlow > 0;
      
      for (const row of streakData.results) {
        if ((row.daily_flow_usd > 0) === isInflow) {
          streakDays++;
        } else {
          break;
        }
      }
      
      if (!isInflow) streakDays = -streakDays;
    }
    
    // 3. Per-ETF breakdown
    const etfQuery = `
      SELECT 
        etf_symbol,
        etf_name,
        asset,
        daily_flow_usd,
        cumulative_flow_usd,
        aum_usd,
        btc_holdings,
        eth_holdings,
        premium_pct
      FROM etf_flows
      WHERE date = (SELECT MAX(date) FROM etf_flows WHERE ${whereClause})
        ${asset && asset !== 'all' ? 'AND asset = ?' : ''}
      ORDER BY aum_usd DESC
    `;
    
    const etfs = await db.prepare(etfQuery).bind(...summaryParams).all();
    
    // 4. Historical flows (for chart)
    const historyQuery = `
      SELECT 
        date,
        SUM(daily_flow_usd) as daily_flow,
        SUM(cumulative_flow_usd) as cumulative_flow
      FROM etf_flows
      WHERE ${whereClause}
      GROUP BY date
      ORDER BY date ASC
    `;
    
    const history = await db.prepare(historyQuery).bind(...params).all<{
      date: string;
      daily_flow: number;
      cumulative_flow: number;
    }>();
    
    // 5. BTC prices for correlation
    const priceQuery = `
      SELECT date, close
      FROM btc_prices
      WHERE date >= ?
      ORDER BY date ASC
    `;
    
    const prices = await db.prepare(priceQuery).bind(since).all<{
      date: string;
      close: number;
    }>();
    
    // Merge history with prices
    const historyWithPrices = (history.results || []).map((h) => {
      const priceData = (prices.results || []).find((p) => p.date === h.date);
      return {
        date: h.date,
        daily_flow: h.daily_flow || 0,
        cumulative_flow: h.cumulative_flow || 0,
        btc_price: priceData?.close || 0
      };
    });
    
    // 6. Institutional holdings
    const institutionalQuery = `
      SELECT 
        entity_name,
        entity_type,
        country,
        btc_holdings,
        eth_holdings,
        usd_value,
        pct_total_supply,
        change_30d,
        change_30d_usd,
        last_update
      FROM institutional_holdings
      WHERE last_update = (SELECT MAX(last_update) FROM institutional_holdings)
      ORDER BY btc_holdings DESC
      LIMIT 20
    `;
    
    const institutional = await db.prepare(institutionalQuery).all();
    
    // 7. Calculate total BTC holdings and % of supply
    const totalBtcHoldings = summary?.total_btc_holdings || 0;
    const btcCirculatingSupply = 19_800_000; // Approximate
    const pctCirculatingSupply = (totalBtcHoldings / btcCirculatingSupply) * 100;
    
    // 8. Data freshness
    const freshnessQuery = `SELECT MAX(date) as latest FROM etf_flows`;
    const freshness = await db.prepare(freshnessQuery).first<{ latest: string }>();
    const dataFreshnessHours = freshness?.latest 
      ? Math.floor((Date.now() - new Date(freshness.latest).getTime()) / 3600_000)
      : 999999;
    
    // Build response
    const response = {
      success: true,
      data: {
        summary: {
          daily_flow_usd: summary?.daily_flow_usd || 0,
          cumulative_flow_usd: summary?.cumulative_flow_usd || 0,
          streak_days: streakDays,
          total_aum_usd: summary?.total_aum_usd || 0,
          total_btc_holdings: totalBtcHoldings,
          pct_circulating_supply: pctCirculatingSupply
        },
        etfs: etfs.results || [],
        history: {
          dates: historyWithPrices.map(h => h.date),
          daily_flows: historyWithPrices.map(h => h.daily_flow),
          cumulative_flows: historyWithPrices.map(h => h.cumulative_flow),
          btc_price: historyWithPrices.map(h => h.btc_price)
        },
        institutional: institutional.results || [],
        comparison: {
          etf_net_flow_24h: summary?.daily_flow_usd || 0,
          exchange_net_flow_24h: 0, // TODO: Fetch from tracking API
          correlation: 'neutral',
          signal: 'Insufficient data for correlation analysis'
        }
      },
      meta: {
        window_days: days,
        data_freshness_hours: dataFreshnessHours,
        etfs_tracked: (etfs.results || []).length,
        last_updated: freshness?.latest || new Date().toISOString().split('T')[0]
      }
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // 1 hour cache
      }
    });
    
  } catch (error) {
    console.error('[etf] API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
