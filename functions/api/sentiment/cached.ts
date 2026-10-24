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
      throw new Error('Database is empty');
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
    console.warn('[WARN] D1 sentiment fetch failed, falling back to alternative.me:', error);

    try {
      const fallbackRes = await fetch('https://api.alternative.me/fng/?limit=1', {
        headers: { 'User-Agent': 'NOVRIX Terminal/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (fallbackRes.ok) {
        const json = await fallbackRes.json() as { data: Array<{ value: string; value_classification: string; timestamp: string }> };
        if (json.data && json.data.length > 0) {
          const item = json.data[0];
          const score = parseInt(item.value, 10);
          const isoTime = new Date(parseInt(item.timestamp, 10) * 1000).toISOString();
          return new Response(JSON.stringify({
            success: true,
            data: {
              score,
              label: item.value_classification,
              timestamp: isoTime,
              dominance: null,
              eth_dominance: null,
              volatility: null,
              social_volume: null,
              trendDirection: score < 50 ? 'bearish' : 'bullish',
            },
            metadata: {
              dataAge: 'live',
              source: 'alternative.me',
              cached: false,
              lastUpdate: isoTime,
            },
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=180, s-maxage=300',
              'Access-Control-Allow-Origin': '*',
              'X-Data-Source': 'alternative-me-fallback',
            },
          });
        }
      }
    } catch (fallbackError) {
      console.error('[ERROR] Alternative.me fallback also failed:', fallbackError);
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Database query and fallback failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
