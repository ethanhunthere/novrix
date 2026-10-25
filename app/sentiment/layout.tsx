import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Sentiment Intelligence & On-Chain Registry',
  description: 'Bitcoin on-chain intelligence workspace featuring 94 indicators across valuation models, profitability dynamics, holder behavior, miner economics, and Federal Reserve macro liquidity.',
  keywords: [
    'Bitcoin on-chain metrics',
    'NUPL',
    'MVRV Z-Score',
    'SOPR',
    'Puell Multiple',
    'Fear and Greed Index',
    'Hash Ribbons',
    'Realized Price',
    'macro liquidity crypto',
    'Bitcoin valuation models',
    'holder behavior on-chain',
  ],
  alternates: {
    canonical: 'https://novrix.io/sentiment',
  },
  openGraph: {
    title: 'NOVRIX - Sentiment Intelligence & On-Chain Registry',
    description: 'Bitcoin on-chain intelligence workspace featuring 94 indicators across valuation models, profitability dynamics, holder behavior, miner economics, and Federal Reserve macro liquidity.',
    url: 'https://novrix.io/sentiment',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Sentiment Intelligence & On-Chain Registry',
    description: 'Bitcoin on-chain intelligence workspace featuring 94 indicators across valuation models, profitability dynamics, holder behavior, miner economics, and Federal Reserve macro liquidity.',
    images: defaultTwitterImages,
  },
};

const sentimentJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Dataset',
      '@id': 'https://novrix.io/sentiment#dataset',
      name: 'NOVRIX Bitcoin On-Chain & Sentiment Indicator Registry',
      description: 'Historical and daily time-series dataset of 94 indicators spanning Bitcoin valuation, profitability, holder distribution, miner economics, and central bank macro liquidity.',
      url: 'https://novrix.io/sentiment',
      license: 'https://opensource.org/licenses/MIT',
      creator: {
        '@type': 'Organization',
        name: 'NOVRIX',
        url: 'https://novrix.io',
      },
      variableMeasured: [
        'Net Unrealized Profit/Loss (NUPL)',
        'Market Value to Realized Value (MVRV)',
        'MVRV Z-Score',
        'Spent Output Profit Ratio (SOPR)',
        'Puell Multiple',
        'Hash Ribbons (30d/60d Hashrate)',
        'Alternative.me Fear & Greed Index',
        'Realized Price',
        'RHODL Ratio',
        'Cumulative Value Days Destroyed (CVDD)',
        'Short-Term Holder MVRV (STH-MVRV)',
        'Long-Term Holder MVRV (LTH-MVRV)',
        'Federal Funds Effective Rate',
        'Federal Reserve Balance Sheet (WALCL)',
        'M2 Money Supply',
        'US Treasury Yield Curve Spreads',
      ],
      temporalCoverage: '2010/..',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://novrix.io/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Sentiment Intelligence',
          item: 'https://novrix.io/sentiment',
        },
      ],
    },
  ],
};

export default function SentimentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sentimentJsonLd) }}
      />
      {children}
    </>
  );
}
