/**
 * Cloudflare Pages Function - Historical BTC & ETH Dominance
 * Primary: Serves from D1 database (pre-populated by cron worker + Python engine)
 * Fallback: Live fetch from CoinGecko + CoinMarketCap APIs
 */

interface Env {
  DB: D1Database;
  CMC_API_KEY?: string;
}

interface DominanceRecord {
  date: string;
  btc_dominance: number;
  eth_dominance: number;
}

interface CMCGlobalMetricsResponse {
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
  };
  data: {
    btc_dominance: number;
    eth_dominance: number;
    last_updated: string;
  };
}

interface CoinGeckoMarketChartResponse {
  market_caps: Array<[number, number]>;
  prices: Array<[number, number]>;
  total_volumes: Array<[number, number]>;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Try D1 database first (fast, pre-populated by cron worker)
  try {
    const result = await env.DB.prepare(
      `SELECT date, btc_dominance, eth_dominance FROM dominance_data ORDER BY date ASC`
    ).all<DominanceRecord>();

    if (result.results && result.results.length > 30) {
      const data = result.results.map((row: DominanceRecord) => ({
        timestamp: `${row.date}T00:00:00Z`,
        btc_dominance: row.btc_dominance,
        eth_dominance: row.eth_dominance,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          data,
          count: data.length,
          source: 'd1_database',
          period: '1 year',
        }),
        {
          headers: {
            ...corsHeaders,
            'Cache-Control': 'public, max-age=1800, s-maxage=3600',
          },
        }
      );
    }
  } catch (dbError) {
    console.error('[Dominance] D1 query failed, falling back to live API:', dbError);
  }

  // Fallback: Live fetch from CoinGecko (+ CMC for accurate total mcap anchor if key available)
  try {
    const days = 365;
    const geckoHeaders = {
      'User-Agent': 'NOVRIX Terminal (https://novrix.io)',
      'Accept': 'application/json',
    };

    const [btcResponse, ethResponse] = await Promise.all([
      fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`, {
        headers: geckoHeaders, signal: AbortSignal.timeout(10000),
      }),
      fetch(`https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=${days}&interval=daily`, {
        headers: geckoHeaders, signal: AbortSignal.timeout(10000),
      }),
    ]);

    if (!btcResponse.ok || !ethResponse.ok) {
      throw new Error(`CoinGecko failures: BTC=${btcResponse.status}, ETH=${ethResponse.status}`);
    }

    const btcData: CoinGeckoMarketChartResponse = await btcResponse.json();
    const ethData: CoinGeckoMarketChartResponse = await ethResponse.json();

    if (!btcData.market_caps?.length || !ethData.market_caps?.length) {
      throw new Error('Invalid CoinGecko market cap data');
    }

    // Try to get accurate current dominance from CMC (optional)
    let realBtcDominance: number | null = null;
    let realEthDominance: number | null = null;
    const CMC_API_KEY = env.CMC_API_KEY;
    if (CMC_API_KEY) {
      try {
        const cmcRes = await fetch('https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest', {
          headers: { 'Accept': 'application/json', 'X-CMC_PRO_API_KEY': CMC_API_KEY },
          signal: AbortSignal.timeout(5000),
        });
        if (cmcRes.ok) {
          const cmcResult: CMCGlobalMetricsResponse = await cmcRes.json();
          realBtcDominance = cmcResult.data?.btc_dominance ?? null;
          realEthDominance = cmcResult.data?.eth_dominance ?? null;
        }
      } catch { /* CMC optional, continue with CoinGecko-only */ }
    }

    const currentBtcMcap = btcData.market_caps[btcData.market_caps.length - 1][1];
    const currentEthMcap = ethData.market_caps[ethData.market_caps.length - 1][1];
    const currentBtcEthSum = currentBtcMcap + currentEthMcap;

    // If CMC provided accurate anchor dominance, use it; otherwise estimate from CoinGecko data
    const anchorBtcDom = realBtcDominance ?? (currentBtcMcap / (currentBtcMcap + currentEthMcap)) * 100;
    const anchorEthDom = realEthDominance ?? (currentEthMcap / (currentBtcMcap + currentEthMcap)) * 100;
    const realTotalMarketCap = currentBtcMcap / (anchorBtcDom / 100);

    const transformedData = btcData.market_caps.map((btcEntry, index) => {
      const timestamp = new Date(btcEntry[0]);
      const historicalBtcMcap = btcEntry[1];
      const historicalEthMcap = ethData.market_caps[index]?.[1] || 0;
      const historicalSum = historicalBtcMcap + historicalEthMcap;
      const ratio = currentBtcEthSum > 0 ? historicalSum / currentBtcEthSum : 1;
      const historicalTotal = realTotalMarketCap * ratio;

      return {
        timestamp: timestamp.toISOString(),
        btc_dominance: parseFloat(((historicalBtcMcap / historicalTotal) * 100).toFixed(2)),
        eth_dominance: parseFloat(((historicalEthMcap / historicalTotal) * 100).toFixed(2)),
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: transformedData,
        count: transformedData.length,
        source: CMC_API_KEY ? 'coingecko_cmc_fallback' : 'coingecko_fallback',
        current_btc_dominance: anchorBtcDom,
        current_eth_dominance: anchorEthDom,
        period: '1 year',
      }),
      { headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=1800, s-maxage=3600' } }
    );
  } catch (error: unknown) {
    console.error('[ERROR] Dominance fetch failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch dominance data',
        source: 'error',
      }),
      { headers: corsHeaders, status: 503 }
    );
  }
};
