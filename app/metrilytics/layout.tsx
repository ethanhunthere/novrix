import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Metrilytics Intelligence',
  description: 'DeFi protocol analytics including TVL tracking, yield analysis, protocol revenue, liquidity depth, and derivative positioning. Aggregated from DeFiLlama, CoinGecko, Binance, and direct RPC nodes.',
  keywords: ['DeFi analytics', 'TVL tracking', 'protocol revenue', 'yield analysis', 'liquidity metrics', 'on-chain DeFi data', 'crypto protocol health'],
  alternates: {
    canonical: 'https://novrix.io/metrilytics',
  },
  openGraph: {
    title: 'NOVRIX - Metrilytics Intelligence',
    description: 'DeFi protocol analytics including TVL tracking, yield analysis, protocol revenue, liquidity depth, and derivative positioning. Aggregated from DeFiLlama, CoinGecko, Binance, and direct RPC nodes.',
    url: 'https://novrix.io/metrilytics',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Metrilytics Intelligence',
    description: 'DeFi protocol analytics including TVL tracking, yield analysis, protocol revenue, liquidity depth, and derivative positioning. Aggregated from DeFiLlama, CoinGecko, Binance, and direct RPC nodes.',
    images: defaultTwitterImages,
  },
};

export default function MetrilyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
