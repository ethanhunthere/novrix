import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Article',
  description: 'Read editorial analysis and deep dives from the NOVRIX desk.',
  openGraph: {
    title: 'NOVRIX - Article',
    description: 'Read editorial analysis and deep dives from the NOVRIX desk.',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Article',
    description: 'Read editorial analysis and deep dives from the NOVRIX desk.',
    images: defaultTwitterImages,
  },
};

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
