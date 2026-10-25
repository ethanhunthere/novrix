import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';

export const metadata: Metadata = {
  title: 'Novrix Terminal',
  description:
    'On-chain Bitcoin metrics, network health, and macro liquidity indicators tracking market cycle dynamics.',
  openGraph: {
    title: 'Novrix Terminal',
    description:
      'On-chain Bitcoin metrics, network health, and macro liquidity indicators tracking market cycle dynamics.',
  },
};

const INK = '#F5F1EA';
const MUTED = 'rgba(245, 241, 234, 0.68)';
const HAIRLINE = 'rgba(245, 241, 234, 0.08)';

const MODULES = [
  {
    label: 'Open Workspace',
    href: '/sentiment',
    title: 'Sentiment intelligence',
    lede: 'Daily visual metrics for market valuation, miner reserves, supply distribution, and futures leverage across historical market regimes.',
  },
  {
    label: 'Read Publications',
    href: '/insights',
    title: 'Research and perspectives',
    lede: 'Detailed commentary covering capital liquidity, exchange reserves, cryptographic privacy developments, and cyclical tendencies observed in historical records.',
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
            padding: 'clamp(44px, 7vh, 76px) var(--container-pad) clamp(36px, 5vh, 56px)',
          }}
        >
          <div className="mx-auto w-full" style={{ maxWidth: '1180px' }}>
            <h1
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 'clamp(1.30rem, 1.85vw, 1.80rem)',
                lineHeight: 1.3,
                letterSpacing: '-0.012em',
                fontWeight: 500,
                color: INK,
                maxWidth: '36ch',
              }}
            >
              Bitcoin network fundamentals and macro liquidity intelligence.
            </h1>

            <p
              style={{
                marginTop: '16px',
                maxWidth: '600px',
                color: MUTED,
                fontSize: 'clamp(0.92rem, 0.88rem + 0.2vw, 0.98rem)',
                lineHeight: 1.7,
              }}
            >
              Novrix aggregates on-chain metrics, holder distribution patterns, and central bank balance sheets into real-time visual records. Explore structural shifts, miner activity, and historical cycle dynamics across interactive workspaces.
            </p>

            <div className="flex flex-wrap items-center gap-x-7 gap-y-4 mt-7">
              <Link href="/sentiment" className="home-btn home-btn-primary">
                Open Sentiment Workspace
                <Arrow />
              </Link>
              <Link href="/insights" className="home-quiet-link">
                Read Publications
              </Link>
            </div>
          </div>
        </section>

        <section
          style={{
            borderTop: `1px solid ${HAIRLINE}`,
            padding: 'clamp(44px, 6vh, 72px) var(--container-pad) clamp(56px, 8vh, 96px)',
          }}
        >
          <div className="mx-auto w-full" style={{ maxWidth: '1180px' }}>
            <h2
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 'clamp(1.35rem, 1.8vw, 1.85rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.018em',
                fontWeight: 500,
                color: INK,
              }}
            >
              Workspace overview
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 mt-10 md:mt-12">
              {MODULES.map((item) => (
                <Link key={item.href} href={item.href} className="home-entry">
                  <h3
                    style={{
                      fontFamily: 'var(--ff-display)',
                      fontSize: 'clamp(1.2rem, 0.95rem + 0.6vw, 1.45rem)',
                      lineHeight: 1.25,
                      letterSpacing: '-0.015em',
                      fontWeight: 500,
                      color: INK,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ marginTop: '12px', color: MUTED, fontSize: '0.92rem', lineHeight: 1.7 }}>
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
