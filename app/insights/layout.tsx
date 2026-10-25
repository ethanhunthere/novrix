import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Editorial & Market Research',
  description: 'Long-form on-chain research, liquidity regime analysis, and historical cycle notes from the NOVRIX desk.',
  keywords: [
    'Bitcoin research',
    'on-chain analysis',
    'market intelligence',
    'liquidity cycle',
    'macroeconomics Bitcoin',
    'holder behavior',
    'cycle analysis',
  ],
  alternates: {
    canonical: 'https://novrix.io/insights',
  },
  openGraph: {
    title: 'NOVRIX - Editorial & Market Research',
    description: 'Long-form on-chain research, liquidity regime analysis, and historical cycle notes from the NOVRIX desk.',
    url: 'https://novrix.io/insights',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Editorial & Market Research',
    description: 'Long-form on-chain research, liquidity regime analysis, and historical cycle notes from the NOVRIX desk.',
    images: defaultTwitterImages,
  },
};

const insightsJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': 'https://novrix.io/insights#collection',
      name: 'NOVRIX Editorial & Market Research',
      description: 'Long-form on-chain research, liquidity regime analysis, and historical cycle notes from the NOVRIX desk.',
      url: 'https://novrix.io/insights',
      publisher: {
        '@type': 'Organization',
        name: 'NOVRIX',
        url: 'https://novrix.io',
      },
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
          name: 'Insights',
          item: 'https://novrix.io/insights',
        },
      ],
    },
  ],
};

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(insightsJsonLd) }}
      />
      {children}
    </>
  );
}
