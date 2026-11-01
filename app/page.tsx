import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'NOVRIX · Bitcoin On-Chain Intelligence & Macro Liquidity Terminal',
  description:
    'Bitcoin network fundamentals, valuation models, holder distribution metrics, and Federal Reserve macro liquidity across historical market cycles.',
  keywords: [
    'Bitcoin terminal',
    'on-chain intelligence',
    'Bitcoin cycle models',
    'macro liquidity crypto',
    'realized price Bitcoin',
    'NUPL',
    'MVRV Z-Score',
  ],
  alternates: {
    canonical: 'https://novrix.io/',
  },
  openGraph: {
    title: 'NOVRIX · Bitcoin On-Chain Intelligence & Macro Liquidity Terminal',
    description:
      'Bitcoin network fundamentals, valuation models, holder distribution metrics, and Federal Reserve macro liquidity across historical market cycles.',
    url: 'https://novrix.io/',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX · Bitcoin On-Chain Intelligence & Macro Liquidity Terminal',
    description:
      'Bitcoin network fundamentals, valuation models, holder distribution metrics, and Federal Reserve macro liquidity across historical market cycles.',
    images: defaultTwitterImages,
  },
};

const INK = '#FAF7F2';
const BODY = '#D8D2C7';

function Arrow() {
  return (
    <svg className="arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="home-shell min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 flex flex-col justify-center">
        <section
          style={{
            padding: 'clamp(56px, 10vh, 120px) var(--container-pad)',
          }}
        >
          <div className="mx-auto w-full max-w-[1180px] 2xl:max-w-[1400px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] min-w-0">
            <h1
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 'clamp(1.5rem, 3.2vw, 3.6rem)',
                lineHeight: 1.18,
                letterSpacing: '-0.015em',
                fontWeight: 500,
                color: INK,
                maxWidth: 'min(100%, 38ch)',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              Bitcoin network data and macro liquidity.
            </h1>

            <p
              style={{
                marginTop: '20px',
                maxWidth: 'min(100%, 640px)',
                color: BODY,
                fontSize: 'clamp(0.9rem, 0.84rem + 0.3vw, 1.25rem)',
                lineHeight: 1.72,
                overflowWrap: 'break-word',
              }}
            >
              Novrix tracks Bitcoin market cycles through on-chain data and central bank liquidity. Built for investors who study historical distribution, holder behavior, and macro trends directly from the source.
            </p>

            <div className="mt-8 sm:mt-10">
              <Link href="/sentiment" className="home-btn home-btn-primary">
                Open workspace
                <Arrow />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <FooterHome />
    </div>
  );
}
