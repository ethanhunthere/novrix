import { prefetch as bootPrefetch } from '@/lib/bootCache';
import { withSentimentDataVersion } from '@/lib/sentimentDataVersion';

export type TerminalModuleKey = 'sentiment' | 'tracking' | 'metrilytics';

export const SENTIMENT_PRELOAD_URL = withSentimentDataVersion('/api/sentiment/all');

export const SENTIMENT_PREFETCH_URLS = [
  '/api/sentiment/all',
  '/api/sentiment/cached',
  '/api/fear-greed?days=3000',
  '/api/nrpl',
  '/api/rhodl-ratio',
  '/api/open-interest',
  '/api/funding-rate',
  '/api/realized-price',
  '/api/market-cap',
  '/api/200-week-ma',
  '/api/highly-liquid-supply',
  '/api/lth-position-change',
  '/api/sth-position-change',
  '/api/mpi',
  '/api/miner-sell-pressure',
  '/api/utxo-profit',
  '/api/utxo-loss',
  '/api/m2',
  '/api/dxy',
  '/api/vix',
  '/api/fedfunds',
  '/api/etf',
  '/api/sp500',
  '/api/gold',
  '/api/stablecoin-supply',
  '/api/crypto-market-cap',
  '/api/nvts',
  '/api/nvt-zscore',
  '/api/cvdd',
  '/api/puell-multiple',
  '/api/mayer-multiple',
  '/api/reserve-risk',
  '/api/aviv',
  '/api/mvrv-zscore',
  '/api/vdd',
  '/api/supply-shock-ratio',
  '/api/active-addresses',
  '/api/hot-supply',
  '/api/hashribbons',
  '/api/dominance/historical',
  '/api/fred-sofr',
  '/api/fred-walcl',
  '/api/fred-rrpontsyd',
  '/api/fred-cpiaucsl',
  '/api/fred-cpilfesl',
  '/api/fred-pcepi',
  '/api/fred-pcepilfe',
  '/api/fred-mich',
  '/api/fred-t5yie',
  '/api/fred-t10yie',
  '/api/fred-dgs1mo',
  '/api/fred-dgs3mo',
  '/api/fred-dgs6mo',
  '/api/fred-dgs1',
  '/api/fred-dgs5',
  '/api/fred-dgs20',
  '/api/fred-dgs30',
  '/api/fred-t10y2y',
  '/api/fred-t10y3m',
  '/api/fred-mabmm301usm189s',
  '/api/fred-unrate',
  '/api/fred-payems',
  '/api/fred-icsa',
  '/api/fred-jtsjol',
  '/api/fred-emratio',
  '/api/fred-gdpc1',
  '/api/fred-indpro',
  '/api/fred-houst',
  '/api/fred-umcsent',
  '/api/fred-rsxfs',
  '/api/fred-dcoilwtico',
  '/api/fred-bamlh0a0hym2',
  '/api/fred-mortgage30us',
  '/api/fred-totalsl',
].map(withSentimentDataVersion);

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

export const METRILYTICS_PREFETCH_URLS = Object.values(METRILYTICS_API_URLS);

const MODULE_PREFETCH_URLS: Record<TerminalModuleKey, string[]> = {
  sentiment: SENTIMENT_PREFETCH_URLS,
  tracking: TRACKING_PREFETCH_URLS,
  metrilytics: METRILYTICS_PREFETCH_URLS,
};

export function prefetchTerminalModule(module: TerminalModuleKey): void {
  MODULE_PREFETCH_URLS[module].forEach(bootPrefetch);
}

export function prefetchPeerTerminalModules(currentModule: TerminalModuleKey): void {
  if (typeof window === 'undefined') return;

  window.setTimeout(() => {
    (Object.keys(MODULE_PREFETCH_URLS) as TerminalModuleKey[])
      .filter(module => module !== currentModule)
      .forEach(prefetchTerminalModule);
  }, 0);
}
