import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Research Note & Deep Dive',
  description: 'Editorial analysis, on-chain breakdowns, and market commentary from the NOVRIX research desk.',
  keywords: ['Bitcoin research note', 'on-chain deep dive', 'market analysis', 'crypto intelligence'],
  openGraph: {
    title: 'NOVRIX - Research Note & Deep Dive',
    description: 'Editorial analysis, on-chain breakdowns, and market commentary from the NOVRIX research desk.',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Research Note & Deep Dive',
    description: 'Editorial analysis, on-chain breakdowns, and market commentary from the NOVRIX research desk.',
    images: defaultTwitterImages,
  },
};

const postJsonLd = {
  '@context': 'https://schema.org',
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
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Research Note',
      item: 'https://novrix.io/insights/post',
    },
  ],
};

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd) }}
      />
      {children}
    </>
  );
}
