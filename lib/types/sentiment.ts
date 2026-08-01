/**
 * Foundational types for the NOVRIX sentiment indicator system.
 *
 * Every on-chain indicator API returns a time-series of points.
 * The shape is normalized at the API boundary (see _middleware.ts):
 *   { time: "2024-01-01T00:00:00Z", value: number }
 */

/** Single data point in any indicator time-series.
 *  This is intentionally a wide union — the hook stores raw API rows
 *  (which have indicator-specific field names) in the same arrays
 *  before/instead of normalising to {time,value}.
 */
export interface IndicatorPoint {
  time: string;
  date?: string;
  d?: string;
  timestamp?: string;
  value?: string | number;
  score?: number;
  label?: string;
  value_classification?: string;
  dominance?: number | null;
  eth_dominance?: number | null;
  trend_direction?: string;
  net_unrealized_profit_loss?: number;
  mvrv?: number;
  sopr?: number;
  lth_mvrv?: number;
  ssr?: number;
  supply_in_loss?: number;
  supply_in_profit?: number;
  realized_profit?: number;
  realized_loss?: number;
  sth_mvrv?: number;
  hashrate?: number;
  btc_dominance?: number;
  sma_30?: number;
  sma_60?: number;
  signal?: string;
  hot_supply?: number;
  hot_supply_usd?: number;
  illiquid_supply?: number;
  liquid_supply?: number;
  price?: number;
}

/** Generic API response wrapper for indicator data. */
export interface IndicatorApiResponse<T = IndicatorPoint> {
  success: boolean;
  data: T[];
  payload: number;
  source: string;
}

/** Error response from indicator APIs. */
export interface IndicatorApiError {
  success: false;
  error: string;
  message?: string;
  table?: string;
  rows?: number;
  source: string;
}

/** Fear & Greed Index data point. */
export interface FngPoint {
  time: string;
  value: number;
  value_classification: string;
}

/** Fear & Greed API response. */
export interface FngApiResponse {
  success: boolean;
  data: FngPoint[];
}

/** Market dominance data point. */
export interface DominancePoint {
  time: string;
  btc_dominance: number;
  eth_dominance: number;
  others_dominance: number;
}

/** Hashrate-specific point. */
export interface HashratePoint {
  time: string;
  hashrate: number;
}

/** Hashribbons-specific point. */
export interface HashribbonsPoint {
  time: string;
  sma_30: number;
  sma_60: number;
  signal: string;
}

/** Hot supply point. */
export interface HotSupplyPoint {
  time: string;
  hot_supply: number;
  hot_supply_usd: number;
}

/** Illiquid supply point. */
export interface IlliquidSupplyPoint {
  time: string;
  illiquid_supply: number;
  liquid_supply: number;
}

/** Realized profit/loss point. */
export interface RealizedPnlPoint {
  time: string;
  realized_profit?: number;
  realized_loss?: number;
}

/** Supply in profit/loss point. */
export interface SupplyPnlPoint {
  time: string;
  supply_in_profit?: number;
  supply_in_loss?: number;
}

/** STH/LTH MVRV point. */
export interface MvrvPoint {
  time: string;
  mvrv?: number;
  sth_mvrv?: number;
  lth_mvrv?: number;
  mvrv_zscore?: number;
}

/** NUPL point. */
export interface NuplPoint {
  time: string;
  net_unrealized_profit_loss: number;
}

/** SOPR point. */
export interface SoprPoint {
  time: string;
  sopr: number;
}

/** SSR point. */
export interface SsrPoint {
  time: string;
  ssr: number;
}

/** Social sentiment coin data. */
export interface SocialCoin {
  id: string;
  symbol: string;
  name: string;
  bullish: number;
  bearish: number;
  marketCapRank: number;
  price: number;
  priceChange24h: number;
  watchlistUsers: number;
}

/** Social sentiment payload. */
export interface SocialSentimentPayload {
  coins: SocialCoin[];
  avgBullish: number;
  avgBearish: number;
}

/** Trending coin from CoinGecko API. */
export interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    market_cap_rank?: number;
    data?: {
      price?: number;
      price_change_percentage_24h?: { usd?: number };
    };
    thumb?: string;
    small?: string;
  };
}

/** Generic chart data point returned by chart data builders. */
export interface ChartDataPoint {
  index: number;
  value?: number | string | null;
  dateFormatted: string;
  dateObj: Date;
  rawDate?: string;
  btcPrice?: number | null;
  [key: string]: unknown;
}

/** Time-series data loaded from a cached fetch. */
export type SeriesData = IndicatorPoint[];

/** Response from /api/sentiment/all — batch of core indicators. */
export interface BulkIndicatorsResponse {
  nupl: NuplPoint[] | null;
  mvrv: MvrvPoint[] | null;
  sopr: SoprPoint[] | null;
  lthMvrv: MvrvPoint[] | null;
  ssr: SsrPoint[] | null;
  supplyLoss: SupplyPnlPoint[] | null;
  supplyProfit: SupplyPnlPoint[] | null;
  realizedProfit: RealizedPnlPoint[] | null;
  realizedLoss: RealizedPnlPoint[] | null;
  sthMvrv: MvrvPoint[] | null;
  hashrate: HashratePoint[] | null;
  btcPrice: IndicatorPoint[] | null;
}


