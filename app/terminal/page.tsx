'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';
import DesktopGate from '@/components/layout/DesktopGate';

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════
   PALETTE — Underground facility, no bright tones
   ═══════════════════════════════════════════════════════════ */

const C = {
  bg:        '#0A0C10',
  bgElevated:'#111318',
  bgCard:    '#0D0F14',
  border:    'rgba(255,255,255,0.06)',
  borderHover:'rgba(255,255,255,0.10)',
  text:      '#C8CCD4',
  textMuted: '#5A5F6A',
  textDim:   '#3A3F4A',
  accent:    '#8B2335',
  accentMuted:'#5A1A28',
  white:     '#E8EAED',
} as const;

/* ═══════════════════════════════════════════════════════════
   MODULES — Restrained, no bright accents
   ═══════════════════════════════════════════════════════════ */

const MODULES = [
  {
    code: 'SE-01',
    name: 'SENTIMENT',
    desc: 'Market psychology and holder conviction across cycles.',
    href: '/sentiment',
  },
  {
    code: 'WT-02',
    name: 'TRACKING',
    desc: 'Significant capital movement across twelve networks.',
    href: '/tracking',
  },
  {
    code: 'ML-03',
    name: 'METRILYTICS',
    desc: 'Protocol revenue, liquidity depth, and derivative positioning.',
    href: '/metrilytics',
  },
] as const;

function getSafeRedirectTarget(raw: string | null) {
  if (!raw) return '/terminal';
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return '/terminal';
    return ['/sentiment', '/tracking', '/metrilytics'].some(
      mp => decoded === mp || decoded.startsWith(`${mp}/`)
    ) ? decoded : '/terminal';
  } catch { return '/terminal'; }
}

/* ═══════════════════════════════════════════════════════════
   COMPACT HERO
   ═══════════════════════════════════════════════════════════ */

function CompactHero() {
  return (
    <section
      className="relative flex flex-col items-center justify-center"
      style={{
        background: 'transparent',
        minHeight: '220px',
        maxHeight: '280px',
        paddingTop: '24px',
        paddingBottom: '16px',
      }}
    >
      {/* Top hairline */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: 'min(400px, 60vw)',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${C.textDim}, transparent)`,
        }}
      />

      <div className="relative z-10 text-center px-4">
        <p
          style={{
            fontFamily: 'var(--ff-mono), monospace',
            fontSize: '10px',
            letterSpacing: '0.28em',
            color: C.textMuted,
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}
        >
          Intelligence Terminal
        </p>
        <h1
          style={{
            fontFamily: 'var(--ff-sans), sans-serif',
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.05,
            color: C.white,
            marginBottom: '12px',
          }}
        >
          Intelligence
          <span style={{ display: 'block', color: C.textMuted }}>Terminal</span>
        </h1>
        <p
          style={{
            fontFamily: 'var(--ff-sans), sans-serif',
            fontSize: '13px',
            fontWeight: 400,
            color: C.textMuted,
            letterSpacing: '0.04em',
            maxWidth: '420px',
            margin: '0 auto',
            lineHeight: 1.5,
          }}
        >
          Three intelligence modules. Real-time on-chain analytics.
        </p>
      </div>

      {/* Bottom hairline */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: 'min(400px, 60vw)',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${C.textDim}, transparent)`,
        }}
      />
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODULE CARD — Restrained, institutional
   ═══════════════════════════════════════════════════════════ */

function ModuleCard({
  module,
  index,
  onEnter,
}: {
  module: typeof MODULES[number];
  index: number;
  onEnter: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="module-card relative"
      data-module-idx={index}
      onClick={onEnter}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.bgCard,
        border: `1px solid ${hovered ? C.borderHover : C.border}`,
        transition: 'border-color 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '280px',
        padding: '28px',
        cursor: 'pointer',
      }}
    >
      {/* Index badge */}
      <div
        style={{
          fontFamily: 'var(--ff-mono), monospace',
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: C.textDim,
          marginBottom: '20px',
        }}
      >
        {module.code}
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily: 'var(--ff-sans), sans-serif',
          fontSize: 'clamp(20px, 2.5vw, 28px)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: C.white,
          lineHeight: 1.15,
          marginBottom: '16px',
        }}
      >
        {module.name}
      </h2>

      {/* Divider */}
      <div
        style={{
          width: '32px',
          height: '2px',
          background: C.accentMuted,
          marginBottom: '16px',
          transition: 'width 0.3s ease, background 0.3s ease',
          ...(hovered && { width: '48px', background: C.accent }),
        }}
      />

      {/* Description */}
      <p
        style={{
          fontFamily: 'var(--ff-sans), sans-serif',
          fontSize: '13px',
          fontWeight: 400,
          color: C.textMuted,
          lineHeight: 1.6,
          flex: 1,
          marginBottom: '24px',
        }}
      >
        {module.desc}
      </p>

      {/* Enter button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEnter();
        }}
        style={{
          fontFamily: 'var(--ff-mono), monospace',
          fontSize: '11px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 600,
          padding: '12px 20px',
          border: `1px solid ${hovered ? C.accent : C.border}`,
          color: hovered ? C.white : C.textMuted,
          background: hovered ? C.accentMuted : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Launch Module</span>
        <span style={{ fontSize: '14px', opacity: hovered ? 1 : 0.5 }}>→</span>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export default function TerminalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardsRef = useRef<HTMLDivElement>(null);

  const navigateTo = useCallback((href: string) => {
    router.push(href);
  }, [router]);

  const targetModule = getSafeRedirectTarget(searchParams.get('redirect'));

  /* ── Direct redirect if arriving with ?redirect= ── */
  useEffect(() => {
    if (!targetModule || targetModule === '/terminal') return;
    router.replace(targetModule);
  }, [targetModule, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const cards = cardsRef.current?.querySelectorAll('.module-card');
    if (!cards) return;

    const ctx = gsap.context(() => {
      cards.forEach((card, i) => {
        gsap.fromTo(card,
          { opacity: 1, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            delay: i * 0.1,
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <DesktopGate>
      <div
        className="min-h-screen flex flex-col relative"
        style={{ background: C.bg, fontFamily: 'var(--ff-sans), sans-serif' }}
      >
        {/* Seamless navbar connection */}
        <div
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 pointer-events-none z-0"
          style={{
            height: '80px',
            background: `linear-gradient(180deg, ${C.bg} 0%, transparent 100%)`,
          }}
        />

        <Navbar />

        <main className="flex-1 relative" style={{ zIndex: 1 }}>
          <CompactHero />

          {/* Module Cards — tight 3-column grid */}
          <section ref={cardsRef} className="relative" style={{ padding: '0 0 40px' }}>
            <div
              className="mx-auto px-4 lg:px-6"
              style={{
                maxWidth: '1100px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
              }}
            >
              {MODULES.map((mod, i) => (
                <ModuleCard
                  key={mod.code}
                  module={mod}
                  index={i}
                  onEnter={() => navigateTo(mod.href)}
                />
              ))}
            </div>
          </section>
        </main>

        <FooterHome />
      </div>
    </DesktopGate>
  );
}
