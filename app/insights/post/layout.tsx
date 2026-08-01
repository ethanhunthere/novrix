import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Article',
  description: 'Read the latest intelligence from NOVRIX. Editorial and market analysis.',
  openGraph: {
    title: 'NOVRIX - Article',
    description: 'Read the latest intelligence from NOVRIX. Editorial and market analysis.',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Article',
    description: 'Read the latest intelligence from NOVRIX. Editorial and market analysis.',
    images: defaultTwitterImages,
  },
};

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
