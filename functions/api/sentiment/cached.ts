/**
 * NOVRIX Sentiment API - Cached Data from D1 Database
 * Reduces API calls to alternative.me by serving from database
 * Data is populated by Python backend (sentiment_engine.py)
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
  raw_data: string | null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const { DB } = context.env;

    // Query latest sentiment data from D1
    const result = await DB.prepare(`
      SELECT 
        id, score, label, timestamp, volatility, dominance, eth_dominance,
        social_volume, trend_direction, source, raw_data
      FROM sentiment_data
      ORDER BY timestamp DESC
      LIMIT 1
    `).first<SentimentRecord>();

    if (!result) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No sentiment data available',
        message: 'Database is empty. Run sentiment_engine.py to populate data.'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=600', // 5min client, 10min edge
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Calculate data age
    const recordTime = new Date(result.timestamp);
    const now = new Date();
    const ageMinutes = Math.floor((now.getTime() - recordTime.getTime()) / 60000);

    // Return structured response
    return new Response(JSON.stringify({
      success: true,
      data: {
        score: result.score,
        label: result.label,
        timestamp: result.timestamp,
        dominance: result.dominance,
        eth_dominance: result.eth_dominance,
        volatility: result.volatility,
        social_volume: result.social_volume,
        trendDirection: result.trend_direction
      },
      metadata: {
        dataAge: `${ageMinutes} minutes old`,
        source: result.source || 'alternative.me',
        cached: true,
        lastUpdate: result.timestamp
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=600', // Cache for 5min client, 10min edge
        'Access-Control-Allow-Origin': '*',
        'X-Data-Source': 'cloudflare-d1',
        'X-Data-Age-Minutes': ageMinutes.toString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch cached sentiment data:', error);
    
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
