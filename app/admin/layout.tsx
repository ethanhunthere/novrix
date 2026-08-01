import type { Metadata } from 'next';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX - Admin',
  description: 'NOVRIX editorial administration. Manage articles, insights, and platform content.',
  openGraph: {
    title: 'NOVRIX - Admin',
    description: 'NOVRIX editorial administration. Manage articles, insights, and platform content.',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Admin',
    description: 'NOVRIX editorial administration. Manage articles, insights, and platform content.',
    images: defaultTwitterImages,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
