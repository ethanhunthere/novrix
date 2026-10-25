export const SENTIMENT_DATA_VERSION = 'bgeo-fresh-20261025a';

export function withSentimentDataVersion(url: string): string {
  if (!url.startsWith('/api/') || url.includes(`v=${SENTIMENT_DATA_VERSION}`)) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}v=${SENTIMENT_DATA_VERSION}`;
}
