import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';

export const metadata: Metadata = {
  title: 'Sentiment Intelligence',
  description:
    'Crypto market sentiment, read as one calm surface. On-chain and macro indicators without the noise.',
  openGraph: {
    title: 'Sentiment Intelligence',
    description:
      'Crypto market sentiment, read as one calm surface. On-chain and macro indicators without the noise.',
  },
};

const INK = '#F5F1EA';
const MUTED = 'rgba(245, 241, 234, 0.60)';
const HAIRLINE = 'rgba(245, 241, 234, 0.08)';
const ACCENT = '#C2344D';

const MODULES = [
  {
    label: 'Open Sentiment',
    href: '/sentiment',
    title: 'Market mood, minus the noise.',
    lede: 'On-chain and macro indicators, from fear and greed to realised profit, read as one picture of where the market is and why.',
  },
  {
    label: 'Read insights',
    href: '/insights',
    title: 'Context, when you need it.',
    lede: 'Research notes on sentiment shifts, macro conditions, and what the data is actually saying.',
  },
];

function Arrow() {
  return (
    <svg className="arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="home-shell min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section
          style={{
            padding: 'clamp(72px, 12vh, 148px) var(--container-pad) clamp(64px, 9vh, 116px)',
          }}
        >
          <div className="mx-auto w-full" style={{ maxWidth: '1180px' }}>
            <h1
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 'clamp(3rem, 7.6vw, 7.25rem)',
                lineHeight: 0.94,
                letterSpacing: '-0.028em',
                fontWeight: 500,
                color: INK,
                maxWidth: '14ch',
              }}
            >
              Sentiment, without the noise
              <span style={{ color: ACCENT }}>.</span>
            </h1>

            <p
              style={{
                marginTop: 'clamp(26px, 3.4vh, 42px)',
                maxWidth: '540px',
                color: MUTED,
                fontSize: 'clamp(1rem, 0.92rem + 0.3vw, 1.12rem)',
                lineHeight: 1.7,
              }}
            >
              On-chain and macro indicators, read as one calm surface. See where
              the market is, and why.
            </p>

            <div className="flex flex-wrap items-center gap-x-7 gap-y-4 mt-10">
              <Link href="/sentiment" className="home-btn home-btn-primary">
                Open Sentiment
                <Arrow />
              </Link>
              <Link href="/insights" className="home-quiet-link">
                Read insights
              </Link>
            </div>
          </div>
        </section>

        <section
          style={{
            borderTop: `1px solid ${HAIRLINE}`,
            padding: 'clamp(56px, 8vh, 104px) var(--container-pad) clamp(64px, 9vh, 120px)',
          }}
        >
          <div className="mx-auto w-full" style={{ maxWidth: '1180px' }}>
            <h2
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 'clamp(1.7rem, 2.6vw, 2.6rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.022em',
                fontWeight: 500,
                color: INK,
              }}
            >
              Start here.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12 mt-12 md:mt-16">
              {MODULES.map((item) => (
                <Link key={item.href} href={item.href} className="home-entry">
                  <h3
                    style={{
                      fontFamily: 'var(--ff-display)',
                      fontSize: 'clamp(1.35rem, 1rem + 0.85vw, 1.75rem)',
                      lineHeight: 1.15,
                      letterSpacing: '-0.015em',
                      fontWeight: 500,
                      color: INK,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ marginTop: '14px', color: MUTED, fontSize: '0.94rem', lineHeight: 1.65 }}>
                    {item.lede}
                  </p>
                  <span className="home-entry-link">
                    {item.label}
                    <Arrow />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <FooterHome />
    </div>
  );
}
