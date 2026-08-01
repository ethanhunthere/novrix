import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Tracking Intelligence',
  description: 'Whale tracking and significant capital movement monitoring across twelve blockchain networks. Exchange flow analysis, entity registry, and address-level lookups.',
  keywords: ['whale tracking', 'crypto whale alerts', 'on-chain tracking', 'large transaction monitoring', 'exchange flows'],
  alternates: {
    canonical: 'https://novrix.io/tracking',
  },
  openGraph: {
    title: 'NOVRIX - Tracking Intelligence',
    description: 'Whale tracking and significant capital movement monitoring across twelve blockchain networks. Exchange flow analysis, entity registry, and address-level lookups.',
    url: 'https://novrix.io/tracking',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Tracking Intelligence',
    description: 'Whale tracking and significant capital movement monitoring across twelve blockchain networks. Exchange flow analysis, entity registry, and address-level lookups.',
    images: defaultTwitterImages,
  },
};

export default function TrackingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
