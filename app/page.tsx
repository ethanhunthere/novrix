import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';
import TerminalTelemetryCard from '@/components/home/TerminalTelemetryCard';
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
    <div className="home-shell min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 flex flex-col justify-center">
        <section
          style={{
            padding: 'clamp(48px, 8vh, 96px) var(--container-pad)',
          }}
        >
          <div className="mx-auto w-full max-w-[1240px] 2xl:max-w-[1440px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
              {/* Left Column: Editorial Headline & Terminal Actions */}
              <div className="lg:col-span-7 min-w-0">
                <h1
                  style={{
                    fontFamily: 'var(--ff-display)',
                    fontSize: 'clamp(1.75rem, 3.4vw, 3.8rem)',
                    lineHeight: 1.15,
                    letterSpacing: '-0.02em',
                    fontWeight: 500,
                    color: INK,
                    maxWidth: 'min(100%, 32ch)',
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                  }}
                >
                  Bitcoin network data and macro liquidity.
                </h1>

                <p
                  style={{
                    marginTop: '20px',
                    maxWidth: 'min(100%, 560px)',
                    color: BODY,
                    fontSize: 'clamp(0.92rem, 0.86rem + 0.3vw, 1.25rem)',
                    lineHeight: 1.72,
                    overflowWrap: 'break-word',
                  }}
                >
                  Novrix tracks Bitcoin market cycles through on-chain data and central bank liquidity. Built for investors who study historical distribution, holder behavior, and macro trends directly from the source.
                </p>

                <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4">
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
                    94 live cycle panels
                  </span>
                </div>
              </div>

              {/* Right Column: Tactical Terminal Telemetry Card */}
              <div className="lg:col-span-5 w-full min-w-0">
                <TerminalTelemetryCard />
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterHome />
    </div>
  );
}
