import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Insights',
  description: 'Market research and on-chain intelligence notes from the NOVRIX team. Context on sentiment shifts, whale movements, protocol developments, and macro trends.',
  keywords: ['crypto research', 'on-chain analysis', 'market intelligence', 'blockchain insights', 'DeFi research', 'whale tracking analysis'],
  alternates: {
    canonical: 'https://novrix.io/insights',
  },
  openGraph: {
    title: 'NOVRIX - Insights',
    description: 'Market research and on-chain intelligence notes from the NOVRIX team. Context on sentiment shifts, whale movements, protocol developments, and macro trends.',
    url: 'https://novrix.io/insights',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Insights',
    description: 'Market research and on-chain intelligence notes from the NOVRIX team. Context on sentiment shifts, whale movements, protocol developments, and macro trends.',
    images: defaultTwitterImages,
  },
};

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
