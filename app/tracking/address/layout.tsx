import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Address Tracking',
  description: 'Deep-dive into specific wallet addresses. Track balances, transactions, and on-chain activity.',
  openGraph: {
    title: 'NOVRIX - Address Tracking',
    description: 'Deep-dive into specific wallet addresses. Track balances, transactions, and on-chain activity.',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Address Tracking',
    description: 'Deep-dive into specific wallet addresses. Track balances, transactions, and on-chain activity.',
    images: defaultTwitterImages,
  },
};

export default function AddressLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
