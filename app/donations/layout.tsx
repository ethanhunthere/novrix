import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Operations Funding',
  description: 'Support NOVRIX. Community-funded infrastructure for crypto sentiment analysis and on-chain intelligence.',
  keywords: ['NOVRIX donations', 'crypto intelligence funding', 'open source crypto tools', 'blockchain analytics support'],
  alternates: {
    canonical: 'https://novrix.io/donations',
  },
  openGraph: {
    title: 'NOVRIX - Operations Funding',
    description: 'Support NOVRIX. Community-funded infrastructure for crypto sentiment analysis and on-chain intelligence.',
    url: 'https://novrix.io/donations',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Operations Funding',
    description: 'Support NOVRIX. Community-funded infrastructure for crypto sentiment analysis and on-chain intelligence.',
    images: defaultTwitterImages,
  },
};

export default function DonationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
