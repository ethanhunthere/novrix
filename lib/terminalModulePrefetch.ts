import { prefetch as bootPrefetch } from '@/lib/bootCache';
import { withSentimentDataVersion } from '@/lib/sentimentDataVersion';

export type TerminalModuleKey = 'sentiment' | 'tracking' | 'metrilytics';

export const SENTIMENT_PRELOAD_URL = withSentimentDataVersion('/api/sentiment/all');

export const SENTIMENT_PREFETCH_URLS = [
  SENTIMENT_PRELOAD_URL,
  withSentimentDataVersion('/api/sentiment/cached'),
  withSentimentDataVersion('/api/fear-greed?days=3000'),
];

export const TRACKING_PREFETCH_URLS = [
  '/api/tracking/?limit=100&offset=0',
  '/api/entities/?limit=50',
  '/api/holdings/?top=50',
];

const FULL_HISTORY_VERSION = 'full-history-20260513b';

export const METRILYTICS_API_URLS = {
  summary: `/api/metrilytics?v=${FULL_HISTORY_VERSION}`,
  chains: `/api/metrilytics/chains?days=0&v=${FULL_HISTORY_VERSION}`,
  protocols: `/api/metrilytics/protocols?limit=80&v=${FULL_HISTORY_VERSION}`,
  fees: `/api/metrilytics/fees?limit=50&days=0&v=${FULL_HISTORY_VERSION}`,
  stablecoins: `/api/metrilytics/stablecoins?days=0&v=${FULL_HISTORY_VERSION}`,
  dex: `/api/metrilytics/dex?days=0&v=${FULL_HISTORY_VERSION}`,
  btcDerivatives: `/api/metrilytics/derivatives?symbol=BTC&days=365&v=${FULL_HISTORY_VERSION}`,
  ethDerivatives: `/api/metrilytics/derivatives?symbol=ETH&days=365&v=${FULL_HISTORY_VERSION}`,
  solDerivatives: `/api/metrilytics/derivatives?symbol=SOL&days=365&v=${FULL_HISTORY_VERSION}`,
  defiOpenInterest: `/api/metrilytics/derivatives?symbol=DEFI&days=0&v=${FULL_HISTORY_VERSION}`,
  yields: `/api/metrilytics/yields?limit=100&v=${FULL_HISTORY_VERSION}`,
  options: `/api/metrilytics/options?days=0&v=${FULL_HISTORY_VERSION}`,
  prices: `/api/metrilytics/prices?days=0&v=${FULL_HISTORY_VERSION}`,
  ethPrices: `/api/metrilytics/prices?symbol=ETH&days=0&v=${FULL_HISTORY_VERSION}`,
  solPrices: `/api/metrilytics/prices?symbol=SOL&days=0&v=${FULL_HISTORY_VERSION}`,
  lending: `/api/metrilytics/lending?limit=50&v=${FULL_HISTORY_VERSION}`,
  bridges: `/api/metrilytics/bridges?limit=50&v=${FULL_HISTORY_VERSION}`,
  market: `/api/metrilytics/market?v=${FULL_HISTORY_VERSION}`,
  dexNetworks: `/api/metrilytics/dex-networks?v=${FULL_HISTORY_VERSION}`,
  dexProtocols: `/api/metrilytics/dex-protocols?limit=60&v=${FULL_HISTORY_VERSION}`,
  categoryHistory: `/api/metrilytics/category-history?days=365&v=${FULL_HISTORY_VERSION}`,
  concentration: `/api/metrilytics/concentration?days=365&top=10&v=${FULL_HISTORY_VERSION}`,
};

export const METRILYTICS_PREFETCH_URLS = [
  METRILYTICS_API_URLS.summary,
  METRILYTICS_API_URLS.chains,
  METRILYTICS_API_URLS.protocols,
  METRILYTICS_API_URLS.market,
];

const MODULE_PREFETCH_URLS: Record<TerminalModuleKey, string[]> = {
  sentiment: SENTIMENT_PREFETCH_URLS,
  tracking: TRACKING_PREFETCH_URLS,
  metrilytics: METRILYTICS_PREFETCH_URLS,
};

export function prefetchTerminalModule(module: TerminalModuleKey): void {
  MODULE_PREFETCH_URLS[module].forEach(bootPrefetch);
}

export function prefetchPeerTerminalModules(_currentModule: TerminalModuleKey): void {
  // Disabled aggressive 100+ parallel request burst to preserve bandwidth and keep terminal entry instantaneous
}
