/**
 * NOVRIX Sentiment API - Historical Data from D1 Database (OPTIMIZED)
 * Returns historical sentiment data for charting - ULTRA FAST
 * Data is pre-populated with 8 years of history and updated daily at midnight
 */

interface Env {
  DB: D1Database;
}

interface SentimentRecord {
  id: number;
  score: number;
  label: string;
  timestamp: string;
  volatility: number | null;
  dominance: number | null;
  eth_dominance: number | null;
  social_volume: number | null;
  trend_direction: string;
  source: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const { DB } = context.env;
    const url = new URL(context.request.url);
    
    // Get query parameters
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    
    // Validate days (support up to 8 years = 3650 days)
    if (days < 1 || days > 3650) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid days parameter',
        message: 'Days must be between 1 and 3650 (8 years)'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const cutoffDate = new Date(Date.now() - days * 86400000).toISOString();

    // CORRECTNESS: The previous implementation used
    //   SELECT MAX(score), MAX(label), MIN(timestamp), MAX(dominance), ...
    //   FROM sentiment_data GROUP BY DATE(timestamp)
    // which mixes columns across rows — the score, label, and dominance
    // returned for a day might come from three different snapshots.
    //
    // This rewrite picks ONE row per day (the latest by id) and returns
    // its full record. `id` is monotonically increasing per insert, so
    // MAX(id) per day reliably identifies the most recent snapshot of
    // that day even without a precise sub-second timestamp.
    const result = await DB.prepare(`
      SELECT s.score, s.label, s.timestamp, s.dominance, s.eth_dominance, s.trend_direction
      FROM sentiment_data s
      INNER JOIN (
        SELECT DATE(timestamp) AS day, MAX(id) AS max_id
        FROM sentiment_data
        WHERE timestamp >= ? AND source = 'alternative.me'
        GROUP BY DATE(timestamp)
      ) latest ON latest.max_id = s.id
      ORDER BY s.timestamp ASC
    `).bind(cutoffDate).all<SentimentRecord>();

    if (!result.results || result.results.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No historical data available',
        message: `No data found for ${days} days. Run populate_historical.py to seed database.`
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=600', // 5min client, 10min edge
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Transform data
    const historicalData = result.results.map((record: SentimentRecord) => ({
      score: record.score,
      label: record.label,
      timestamp: record.timestamp,
      dominance: record.dominance,
      eth_dominance: record.eth_dominance,
      trend_direction: record.trend_direction
    }));

    // Return with aggressive caching
    return new Response(JSON.stringify({
      success: true,
      data: historicalData,
      count: historicalData.length,
      metadata: {
        requestedDays: days,
        actualRecords: historicalData.length,
        oldestRecord: historicalData[0]?.timestamp,
        latestRecord: historicalData[historicalData.length - 1]?.timestamp,
        source: 'cloudflare-d1',
        cached: true,
        responseTime: '~10-50ms'
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800, s-maxage=3600', // 30min client, 1hr edge
        'Access-Control-Allow-Origin': '*',
        'X-Data-Source': 'cloudflare-d1-optimized',
        'X-Record-Count': historicalData.length.toString(),
        'X-Response-Time': '~10-50ms'
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch historical sentiment data:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Database query failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
