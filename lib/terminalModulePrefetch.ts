import { prefetch as bootPrefetch } from '@/lib/bootCache';
import { withSentimentDataVersion } from '@/lib/sentimentDataVersion';

export type TerminalModuleKey = 'sentiment';

export const SENTIMENT_PRELOAD_URL = withSentimentDataVersion('/api/sentiment/all');

export const SENTIMENT_PREFETCH_URLS = [
  SENTIMENT_PRELOAD_URL,
  withSentimentDataVersion('/api/sentiment/cached'),
  withSentimentDataVersion('/api/fear-greed?days=999999'),
  withSentimentDataVersion('/api/dominance/historical'),
  withSentimentDataVersion('/data/onchain/nrpl.json'),
  withSentimentDataVersion('/data/onchain/mpi.json'),
  withSentimentDataVersion('/data/onchain/miner-sell-pressure.json'),
  withSentimentDataVersion('/data/fred/cpiaucsl.json'),
  withSentimentDataVersion('/data/fred/walcl.json'),
  withSentimentDataVersion('/data/fred/unrate.json'),
  withSentimentDataVersion('/data/fred/rrpontsyd.json'),
  withSentimentDataVersion('/data/fred/sofr.json'),
  withSentimentDataVersion('/data/fred/t10y2y.json'),
  withSentimentDataVersion('/data/fred/bamlh0a0hym2.json'),
  withSentimentDataVersion('/data/fred/dcoilwtico.json'),
  withSentimentDataVersion('/data/fred/payems.json'),
  withSentimentDataVersion('/data/fred/m1sl.json'),
];

const MODULE_PREFETCH_URLS: Record<TerminalModuleKey, string[]> = {
  sentiment: SENTIMENT_PREFETCH_URLS,
};

export function prefetchTerminalModule(module: TerminalModuleKey): void {
  MODULE_PREFETCH_URLS[module].forEach(bootPrefetch);
}

export function prefetchPeerTerminalModules(_currentModule: TerminalModuleKey): void {
}
