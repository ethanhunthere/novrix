import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';

export const metadata: Metadata = {
  title: 'Trinity of Intelligence',
  description:
    'On-chain intelligence: market sentiment, wallet movement, and protocol health, read together without the noise.',
  openGraph: {
    title: 'Trinity of Intelligence',
    description:
      'On-chain intelligence: market sentiment, wallet movement, and protocol health, read together without the noise.',
  },
};

const INK = '#F5F1EA';
const MUTED = 'rgba(245, 241, 234, 0.60)';
const FAINT = 'rgba(245, 241, 234, 0.48)';
const HAIRLINE = 'rgba(245, 241, 234, 0.08)';
const ACCENT = '#C2344D';

const MODULES = [
  {
    label: 'SENTIMENT',
    href: '/sentiment',
    title: 'Market mood, minus the noise.',
    lede: 'See what holders are doing, where pressure is building, and whether price is moving with real support.',
    notes: [
      'Social noise stays out of the way.',
      'Price sits beside holder activity.',
    ],
    cta: 'Open sentiment',
  },
  {
    label: 'TRACKING',
    href: '/tracking',
    title: 'Big movement, in context.',
    lede: 'Follow notable wallet activity, exchange flow, and address context without living inside explorers.',
    notes: [
      'Large transfers separated from background noise.',
      'Address context stays close to the trail.',
    ],
    cta: 'Open tracking',
  },
  {
    label: 'METRILYTICS',
    href: '/metrilytics',
    title: 'Protocol health, clearly read.',
    lede: 'Read liquidity, fees, yield, and usage as one picture of network strength.',
    notes: [
      'Usage and liquidity sit side by side.',
      'DeFi context stays readable under pressure.',
    ],
    cta: 'Open metrilytics',
  },
];

function Arrow() {
  return (
    <svg className="arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" />
    </svg>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" style={{ width: '26px', height: '1px', background: 'rgba(194, 52, 77, 0.68)' }} />
      <span
        style={{
          fontFamily: 'var(--ff-mono)',
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: MUTED,
        }}
      >
        {children}
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="home-shell min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ── HERO ───────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden"
          style={{ padding: 'clamp(64px, 9vh, 128px) var(--container-pad) clamp(56px, 7vh, 96px)' }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 58% 48% at 20% 0%, rgba(194, 52, 77, 0.07), transparent 70%)',
            }}
          />
          <div className="relative mx-auto w-full" style={{ maxWidth: '1180px' }}>
            <Eyebrow>On-chain intelligence</Eyebrow>

            <h1
              className="mt-7 mb-8"
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 'clamp(3rem, 8.2vw, 8.25rem)',
                lineHeight: 0.9,
                letterSpacing: '-0.022em',
                fontWeight: 500,
              }}
            >
              <span className="block" style={{ color: 'rgba(245, 241, 234, 0.46)', fontStyle: 'italic', fontWeight: 400 }}>
                Trinity of
              </span>
              <span className="block" style={{ color: INK }}>
                Intelligence<span style={{ color: ACCENT, fontStyle: 'normal' }}>.</span>
              </span>
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-10 lg:gap-20 items-end">
              <div style={{ maxWidth: '560px' }}>
                <p style={{ color: MUTED, fontSize: 'clamp(0.95rem, 0.8rem + 0.45vw, 1.15rem)', lineHeight: 1.7 }}>
                  Sentiment, wallet movement, and protocol health, read together
                  without the noise. One calm surface for understanding what the
                  market is actually doing.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-9">
                  <Link href="/sentiment" className="home-btn home-btn-primary">
                    Open the terminal
                    <Arrow />
                  </Link>
                  <Link href="/insights" className="home-btn home-btn-ghost">
                    Read insights
                  </Link>
                </div>
              </div>

              <div className="hidden lg:flex flex-col items-end gap-3 pb-1" aria-hidden="true">
                {MODULES.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span style={{ width: '20px', height: '1px', background: 'rgba(194, 52, 77, 0.35)' }} />
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10.5px', letterSpacing: '0.18em', color: MUTED, textTransform: 'uppercase' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="mt-14 pt-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-2"
              style={{ borderTop: `1px solid ${HAIRLINE}` }}
            >
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10.5px', letterSpacing: '0.18em', color: FAINT, textTransform: 'uppercase' }}>
                Market mood · Wallet movement · Protocol health
              </span>
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10.5px', letterSpacing: '0.18em', color: FAINT, textTransform: 'uppercase' }}>
                Free · Open source · No ads
              </span>
            </div>
          </div>
        </section>

        {/* ── MODULES ────────────────────────────────────────── */}
        <section
          className="relative"
          style={{
            borderTop: `1px solid ${HAIRLINE}`,
            padding: 'clamp(56px, 8vh, 104px) var(--container-pad)',
          }}
        >
          <div className="mx-auto w-full" style={{ maxWidth: '1180px' }}>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-6 lg:gap-16 items-end mb-12 lg:mb-16">
              <div>
                <Eyebrow>The terminal</Eyebrow>
                <h2
                  className="mt-5"
                  style={{
                    fontFamily: 'var(--ff-display)',
                    fontSize: 'clamp(2.1rem, 4vw, 3.75rem)',
                    lineHeight: 0.98,
                    letterSpacing: '-0.022em',
                    fontWeight: 500,
                    color: INK,
                  }}
                >
                  Three views. One clear read.
                </h2>
              </div>
              <p className="max-w-xl" style={{ color: MUTED, fontSize: 'clamp(0.9rem, 0.82rem + 0.3vw, 1rem)', lineHeight: 1.7 }}>
                Each surface isolates a different source of market pressure. Open
                one when the question calls for it, not because there is more to
                scroll.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 lg:gap-x-12">
              {MODULES.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="home-module-card"
                >
                  <div className="flex items-center gap-3 pb-5 mb-6">
                    <span
                      aria-hidden="true"
                      className="home-module-dot block w-1.5 h-1.5 rotate-45"
                    />
                    <span className="home-module-label" style={{ fontFamily: 'var(--ff-mono)', fontSize: '10.5px', fontWeight: 500, letterSpacing: '0.2em' }}>
                      {item.label}
                    </span>
                  </div>

                  <h3
                    className="mb-4"
                    style={{
                      fontFamily: 'var(--ff-display)',
                      fontSize: 'clamp(1.5rem, 1.2rem + 0.9vw, 1.95rem)',
                      lineHeight: 1.08,
                      letterSpacing: '-0.015em',
                      fontWeight: 500,
                      color: INK,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ color: MUTED, fontSize: '0.925rem', lineHeight: 1.65 }}>
                    {item.lede}
                  </p>

                  <ul className="home-module-notes mt-6 mb-8 space-y-2.5" style={{ listStyle: 'none', padding: 0 }}>
                    {item.notes.map((note) => (
                      <li key={note} className="pl-4" style={{ position: 'relative', color: 'rgba(245, 241, 234, 0.56)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                        <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: '0.68em', width: '8px', height: '1px', background: 'rgba(245, 241, 234, 0.22)' }} />
                        {note}
                      </li>
                    ))}
                  </ul>

                  <span
                    className="home-module-cta mt-auto inline-flex items-center gap-2"
                    style={{ fontFamily: 'var(--ff-mono)', fontSize: '10.5px', fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' }}
                  >
                    {item.cta}
                    <Arrow />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── CLOSING ────────────────────────────────────────── */}
        <section
          className="relative"
          style={{
            borderTop: `1px solid ${HAIRLINE}`,
            padding: 'clamp(56px, 8vh, 104px) var(--container-pad)',
          }}
        >
          <div className="mx-auto w-full" style={{ maxWidth: '1180px' }}>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-8 lg:gap-16 items-center">
              <div>
                <Eyebrow>Next step</Eyebrow>
                <h2
                  className="mt-5"
                  style={{
                    fontFamily: 'var(--ff-display)',
                    fontSize: 'clamp(2rem, 3.8vw, 3.5rem)',
                    lineHeight: 0.98,
                    letterSpacing: '-0.022em',
                    fontWeight: 500,
                    color: INK,
                    maxWidth: '680px',
                  }}
                >
                  Start with a question, not a chart.
                </h2>
                <p className="mt-4 max-w-lg" style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.7 }}>
                  The terminal is open. Choose the evidence path that fits what
                  you need to know.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Link href="/sentiment" className="home-btn home-btn-primary">
                  Open sentiment
                  <Arrow />
                </Link>
                <Link href="/tracking" className="home-btn home-btn-ghost">
                  Open tracking
                </Link>
              </div>
            </div>

            <div
              className="mt-14 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ borderTop: `1px solid ${HAIRLINE}` }}
            >
              <p style={{ color: FAINT, fontSize: '0.8rem', lineHeight: 1.6 }}>
                Everything here is free, open source, and ad-free. If it earns
                a place in your workflow, you can{' '}
                <Link href="/donations" style={{ color: MUTED, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  support operations
                </Link>
                .
              </p>
              <Link
                href="/insights"
                className="inline-flex items-center gap-2 shrink-0"
                style={{ fontFamily: 'var(--ff-mono)', fontSize: '10.5px', fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: MUTED }}
              >
                Read insights
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
