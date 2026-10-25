import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';

export const metadata: Metadata = {
  title: 'Novrix Terminal',
  description:
    'Bitcoin on-chain metrics, holder distribution data, and macro liquidity charts across historical market cycles.',
  openGraph: {
    title: 'Novrix Terminal',
    description:
      'Bitcoin on-chain metrics, holder distribution data, and macro liquidity charts across historical market cycles.',
  },
};

const INK = '#FAF7F2';
const BODY = '#D8D2C7';
const MUTED = '#A8A196';
const HAIRLINE = 'rgba(250, 247, 242, 0.12)';

const MODULES = [
  {
    category: 'MARKET INDICATORS',
    label: 'Open workspace',
    href: '/sentiment',
    title: 'On-chain valuation and sentiment',
    lede: 'Interactive charts for NUPL, MVRV, miner reserves, futures leverage, and global central bank liquidity.',
  },
  {
    category: 'EDITORIAL RESEARCH',
    label: 'Read publications',
    href: '/insights',
    title: 'Research and perspectives',
    lede: 'Long-form analysis covering capital rotation, exchange reserves, and structural tendencies observed across Bitcoin history.',
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
          <div className="mx-auto w-full max-w-[1180px] 2xl:max-w-[1400px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] min-w-0">
            <h1
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 'clamp(1.25rem, 2.8vw, 3.2rem)',
                lineHeight: 1.2,
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
                marginTop: '18px',
                maxWidth: 'min(100%, 640px)',
                color: BODY,
                fontSize: 'clamp(0.85rem, 0.8rem + 0.35vw, 1.25rem)',
                lineHeight: 1.72,
                overflowWrap: 'break-word',
              }}
            >
              Novrix tracks Bitcoin market cycles through on-chain data and central bank liquidity. Built for investors who study historical distribution, holder behavior, and macro trends directly from the source.
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mt-6 sm:mt-8">
              <Link href="/sentiment" className="home-btn home-btn-primary">
                Open workspace
                <Arrow />
              </Link>
              <Link href="/insights" className="home-quiet-link">
                Read research
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
          <div className="mx-auto w-full max-w-[1180px] 2xl:max-w-[1400px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] min-w-0">
            <h2
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 'clamp(1.2rem, 2.2vw, 2.4rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.018em',
                fontWeight: 500,
                color: INK,
                overflowWrap: 'break-word',
              }}
            >
              Workspaces
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7 mt-6 sm:mt-8 md:mt-10">
              {MODULES.map((item) => (
                <Link key={item.href} href={item.href} className="home-entry min-w-0">
                  <div className="mb-4">
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', letterSpacing: '0.14em', color: MUTED, textTransform: 'uppercase' }}>
                      {item.category}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--ff-display)',
                      fontSize: 'clamp(1.1rem, 1.6vw, 1.85rem)',
                      lineHeight: 1.25,
                      letterSpacing: '-0.015em',
                      fontWeight: 500,
                      color: INK,
                      overflowWrap: 'break-word',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ marginTop: '12px', color: BODY, fontSize: 'clamp(0.85rem, 0.82rem + 0.2vw, 1.05rem)', lineHeight: 1.72, overflowWrap: 'break-word' }}>
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
