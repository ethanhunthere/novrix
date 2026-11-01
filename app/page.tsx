import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';
import TerminalCycleMonitor from '@/components/home/TerminalCycleMonitor';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata: Metadata = {
  title: 'Novrix',
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
    title: 'Novrix',
    description:
      'Bitcoin network fundamentals, valuation models, holder distribution metrics, and Federal Reserve macro liquidity across historical market cycles.',
    url: 'https://novrix.io/',
    images: defaultOgImages,
  },
  twitter: {
    title: 'Novrix',
    description:
      'Bitcoin network fundamentals, valuation models, holder distribution metrics, and Federal Reserve macro liquidity across historical market cycles.',
    images: defaultTwitterImages,
  },
};

const INK = '#FAF7F2';
const BODY = '#D8D2C7';
const MUTED = '#A8A196';

function Arrow() {
  return (
    <svg className="arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="home-shell min-h-screen lg:h-screen lg:max-h-screen flex flex-col justify-between lg:overflow-hidden">
      <Navbar />

      <main className="flex-1 flex flex-col justify-center min-h-0">
        <section
          style={{
            padding: 'clamp(12px, 2.5vh, 28px) var(--container-pad)',
          }}
        >
          <div className="mx-auto w-full max-w-[1240px] 2xl:max-w-[1440px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-12 items-center">
              {/* Left Column: Editorial Headline & Terminal Actions */}
              <div className="lg:col-span-7 min-w-0">
                <h1
                  style={{
                    fontFamily: 'var(--ff-display)',
                    fontSize: 'clamp(1.45rem, 2.7vw, 3.2rem)',
                    lineHeight: 1.14,
                    letterSpacing: '-0.02em',
                    fontWeight: 500,
                    color: INK,
                    maxWidth: 'min(100%, 30ch)',
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                  }}
                >
                  Bitcoin network data and macro liquidity.
                </h1>

                <p
                  style={{
                    marginTop: 'clamp(10px, 1.6vh, 16px)',
                    maxWidth: 'min(100%, 540px)',
                    color: BODY,
                    fontSize: 'clamp(0.85rem, 0.8rem + 0.22vw, 1.1rem)',
                    lineHeight: 1.62,
                    overflowWrap: 'break-word',
                  }}
                >
                  Novrix tracks Bitcoin market cycles through on-chain data and central bank liquidity. Built for investors who study historical distribution, holder behavior, and macro trends directly from the source.
                </p>

                <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-3.5">
                  <Link href="/sentiment" className="home-btn home-btn-primary">
                    Open workspace
                    <Arrow />
                  </Link>
                  <span
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: '11px',
                      color: MUTED,
                      letterSpacing: '0.04em',
                    }}
                  >
                    Live market radar
                  </span>
                </div>
              </div>

              {/* Right Column: Bitcoin Sovereign Cycle Monitor */}
              <div className="lg:col-span-5 w-full min-w-0">
                <TerminalCycleMonitor />
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterHome />
    </div>
  );
}
