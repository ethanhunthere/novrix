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

const INK = '#FAF7F2';
const BODY = '#D8D2C7';
const MUTED = '#A8A196';
const HAIRLINE = 'rgba(250, 247, 242, 0.12)';

const MODULES = [
  {
    category: 'INTELLIGENCE WORKSPACE',
    label: 'Open Workspace',
    href: '/sentiment',
    title: 'Sentiment intelligence',
    lede: 'Daily visual metrics for market valuation, miner reserves, supply distribution, and futures leverage across historical market regimes.',
  },
  {
    category: 'EDITORIAL RESEARCH',
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
            padding: 'clamp(52px, 8vh, 84px) var(--container-pad) clamp(44px, 6vh, 64px)',
          }}
        >
          <div className="mx-auto w-full" style={{ maxWidth: '1180px' }}>
            <h1
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 'clamp(1.5rem, 2.2vw, 2.1rem)',
                lineHeight: 1.25,
                letterSpacing: '-0.015em',
                fontWeight: 500,
                color: INK,
                maxWidth: '38ch',
              }}
            >
              Bitcoin network fundamentals and macro liquidity intelligence.
            </h1>

            <p
              style={{
                marginTop: '18px',
                maxWidth: '620px',
                color: BODY,
                fontSize: 'clamp(0.96rem, 0.92rem + 0.2vw, 1.02rem)',
                lineHeight: 1.72,
              }}
            >
              Novrix aggregates on-chain metrics, holder distribution patterns, and central bank balance sheets into real-time visual records. Explore structural shifts, miner activity, and historical cycle dynamics across interactive workspaces.
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3.5 mt-8">
              <Link href="/sentiment" className="home-btn home-btn-primary">
                Open Sentiment Workspace
                <Arrow />
              </Link>
              <Link href="/insights" className="home-quiet-link">
                Read Publications
                <Arrow />
              </Link>
            </div>
          </div>
        </section>

        <section
          style={{
            borderTop: `1px solid ${HAIRLINE}`,
            padding: 'clamp(48px, 6vh, 76px) var(--container-pad) clamp(64px, 8vh, 96px)',
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mt-8 md:mt-10">
              {MODULES.map((item) => (
                <Link key={item.href} href={item.href} className="home-entry">
                  <div className="mb-4">
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', letterSpacing: '0.14em', color: MUTED, textTransform: 'uppercase' }}>
                      {item.category}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--ff-display)',
                      fontSize: 'clamp(1.25rem, 1.4vw, 1.55rem)',
                      lineHeight: 1.25,
                      letterSpacing: '-0.015em',
                      fontWeight: 500,
                      color: INK,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ marginTop: '12px', color: BODY, fontSize: '0.94rem', lineHeight: 1.72 }}>
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
