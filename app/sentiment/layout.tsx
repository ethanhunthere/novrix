import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Sentiment Intelligence',
  description: 'Crypto market sentiment analysis with 17 active indicators: NUPL, MVRV-Z Score, NRPL, Fear & Greed Index, and macroeconomic overlays. Real-time and historical data.',
  keywords: ['crypto sentiment', 'fear and greed index', 'NUPL', 'MVRV', 'NRPL', 'on-chain metrics', 'bitcoin valuation', 'market psychology'],
  alternates: {
    canonical: 'https://novrix.io/sentiment',
  },
  openGraph: {
    title: 'NOVRIX - Sentiment Intelligence',
    description: 'Crypto market sentiment analysis with 17 active indicators: NUPL, MVRV-Z Score, NRPL, Fear & Greed Index, and macroeconomic overlays. Real-time and historical data.',
    url: 'https://novrix.io/sentiment',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Sentiment Intelligence',
    description: 'Crypto market sentiment analysis with 17 active indicators: NUPL, MVRV-Z Score, NRPL, Fear & Greed Index, and macroeconomic overlays. Real-time and historical data.',
    images: defaultTwitterImages,
  },
};

export default function SentimentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
