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
  withSentimentDataVersion('/data/fred/dxy.json'),
  withSentimentDataVersion('/data/fred/sp500.json'),
  withSentimentDataVersion('/data/fred/vix.json'),
  withSentimentDataVersion('/data/fred/gold.json'),
  withSentimentDataVersion('/data/fred/m2.json'),
  withSentimentDataVersion('/data/fred/fedfunds.json'),
  withSentimentDataVersion('/data/fred/cpiaucsl.json'),
  withSentimentDataVersion('/data/fred/cpilfesl.json'),
  withSentimentDataVersion('/data/fred/pcepi.json'),
  withSentimentDataVersion('/data/fred/pcepilfe.json'),
  withSentimentDataVersion('/data/fred/walcl.json'),
  withSentimentDataVersion('/data/fred/wresbal.json'),
  withSentimentDataVersion('/data/fred/unrate.json'),
  withSentimentDataVersion('/data/fred/rrpontsyd.json'),
  withSentimentDataVersion('/data/fred/sofr.json'),
  withSentimentDataVersion('/data/fred/t10y2y.json'),
  withSentimentDataVersion('/data/fred/t10y3m.json'),
  withSentimentDataVersion('/data/fred/t10yie.json'),
  withSentimentDataVersion('/data/fred/t5yie.json'),
  withSentimentDataVersion('/data/fred/bamlh0a0hym2.json'),
  withSentimentDataVersion('/data/fred/dcoilwtico.json'),
  withSentimentDataVersion('/data/fred/mortgage30us.json'),
  withSentimentDataVersion('/data/fred/payems.json'),
  withSentimentDataVersion('/data/fred/icsa.json'),
  withSentimentDataVersion('/data/fred/jtsjol.json'),
  withSentimentDataVersion('/data/fred/emratio.json'),
  withSentimentDataVersion('/data/fred/gdpc1.json'),
  withSentimentDataVersion('/data/fred/indpro.json'),
  withSentimentDataVersion('/data/fred/houst.json'),
  withSentimentDataVersion('/data/fred/umcsent.json'),
  withSentimentDataVersion('/data/fred/rsxfs.json'),
  withSentimentDataVersion('/data/fred/m1sl.json'),
  withSentimentDataVersion('/data/fred/mabmm301usm189s.json'),
  withSentimentDataVersion('/data/fred/bogmbase.json'),
  withSentimentDataVersion('/data/fred/totalsl.json'),
  withSentimentDataVersion('/data/fred/mich.json'),
  withSentimentDataVersion('/data/fred/dgs1mo.json'),
  withSentimentDataVersion('/data/fred/dgs3mo.json'),
  withSentimentDataVersion('/data/fred/dgs6mo.json'),
  withSentimentDataVersion('/data/fred/dgs1.json'),
  withSentimentDataVersion('/data/fred/dgs5.json'),
  withSentimentDataVersion('/data/fred/dgs20.json'),
  withSentimentDataVersion('/data/fred/dgs30.json'),
];

const MODULE_PREFETCH_URLS: Record<TerminalModuleKey, string[]> = {
  sentiment: SENTIMENT_PREFETCH_URLS,
};

export function prefetchTerminalModule(module: TerminalModuleKey): void {
  MODULE_PREFETCH_URLS[module].forEach(bootPrefetch);
}

export function prefetchPeerTerminalModules(_currentModule: TerminalModuleKey): void {
}
