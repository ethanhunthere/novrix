import { prefetch as bootPrefetch } from '@/lib/bootCache';
import { withSentimentDataVersion } from '@/lib/sentimentDataVersion';

export type TerminalModuleKey = 'sentiment';

export const SENTIMENT_PRELOAD_URL = withSentimentDataVersion('/api/sentiment/all');

export const SENTIMENT_PREFETCH_URLS = [
  SENTIMENT_PRELOAD_URL,
  withSentimentDataVersion('/api/sentiment/cached'),
  withSentimentDataVersion('/api/fear-greed?days=3000'),
];

const MODULE_PREFETCH_URLS: Record<TerminalModuleKey, string[]> = {
  sentiment: SENTIMENT_PREFETCH_URLS,
};

export function prefetchTerminalModule(module: TerminalModuleKey): void {
  MODULE_PREFETCH_URLS[module].forEach(bootPrefetch);
}

export function prefetchPeerTerminalModules(_currentModule: TerminalModuleKey): void {
}
