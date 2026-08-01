import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Intelligence Terminal',
  description: 'The NOVRIX terminal is the secure gateway to three intelligence modules: Sentiment (market psychology), Tracking (whale movement), and Metrilytics (DeFi protocol health).',
  keywords: ['crypto terminal', 'blockchain analytics platform', 'on-chain intelligence', 'DeFi dashboard', 'market sentiment terminal'],
  alternates: {
    canonical: 'https://novrix.io/terminal',
  },
  openGraph: {
    title: 'NOVRIX - Intelligence Terminal',
    description: 'The NOVRIX terminal is the secure gateway to three intelligence modules: Sentiment (market psychology), Tracking (whale movement), and Metrilytics (DeFi protocol health).',
    url: 'https://novrix.io/terminal',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Intelligence Terminal',
    description: 'The NOVRIX terminal is the secure gateway to three intelligence modules: Sentiment (market psychology), Tracking (whale movement), and Metrilytics (DeFi protocol health).',
    images: defaultTwitterImages,
  },
};

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
