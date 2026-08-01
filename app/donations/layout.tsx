import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Operations Funding',
  description: 'Support the NOVRIX on-chain intelligence terminal. Community-funded infrastructure for crypto sentiment analysis, whale tracking, and DeFi analytics.',
  keywords: ['NOVRIX donations', 'crypto intelligence funding', 'open source crypto tools', 'blockchain analytics support'],
  alternates: {
    canonical: 'https://novrix.io/donations',
  },
  openGraph: {
    title: 'NOVRIX - Operations Funding',
    description: 'Support the NOVRIX on-chain intelligence terminal. Community-funded infrastructure for crypto sentiment analysis, whale tracking, and DeFi analytics.',
    url: 'https://novrix.io/donations',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Operations Funding',
    description: 'Support the NOVRIX on-chain intelligence terminal. Community-funded infrastructure for crypto sentiment analysis, whale tracking, and DeFi analytics.',
    images: defaultTwitterImages,
  },
};

export default function DonationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
