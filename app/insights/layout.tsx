import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Insights',
  description: 'Market research and on-chain intelligence notes from the NOVRIX team. Context on sentiment shifts, macro conditions, and what the data is saying.',
  keywords: ['crypto research', 'on-chain analysis', 'market intelligence', 'blockchain insights', 'macro research'],
  alternates: {
    canonical: 'https://novrix.io/insights',
  },
  openGraph: {
    title: 'NOVRIX - Insights',
    description: 'Market research and on-chain intelligence notes from the NOVRIX team. Context on sentiment shifts, macro conditions, and what the data is saying.',
    url: 'https://novrix.io/insights',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Insights',
    description: 'Market research and on-chain intelligence notes from the NOVRIX team. Context on sentiment shifts, macro conditions, and what the data is saying.',
    images: defaultTwitterImages,
  },
};

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
