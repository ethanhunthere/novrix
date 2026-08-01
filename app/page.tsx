'use client';
import dynamic from 'next/dynamic';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';
import KineticText from '@/components/effects/KineticText';
import DeskCard from '@/components/home/DeskCard';
import Link from 'next/link';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import { motion } from 'framer-motion';
import {
  useHeroTimeline,
  useModulesReveal,
  useMouseParallax,
} from '@/lib/hooks/useGSAP';

import {
  HERO_STATEMENT,
  DESKS,
  fadeUp,
} from '@/components/home/home-data';
import { openAuthGate } from '@/lib/utils/auth';
import { useAuth } from '@/lib/hooks/useAuth';

const WhaleFlowCanvas = dynamic(
  () => import('@/components/effects/WhaleFlowCanvas'),
  { ssr: false, loading: () => null }
);

function useKineticFirstPaint() {
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const markReady = () => root.classList.add('novrix-kinetic-mounted');
    markReady();
    const frame = requestAnimationFrame(markReady);
    return () => cancelAnimationFrame(frame);
  }, []);
}

function HomeModuleButton({ href, label, variant }: { href: string; label: string; variant: 'primary' | 'secondary' }) {
  const { user } = useAuth();
  const handleClick = () => {
    if (user) {
      window.location.href = href;
    } else {
      sessionStorage.setItem('novrix-pending-nav', href);
      openAuthGate();
    }
  };
  return (
    <button onClick={handleClick} className={variant === 'primary' ? 'btn-intel-primary' : 'btn-intel-secondary'}>
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLOATING STATUS — subtle right-side data readout
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   HERO STATEMENT — typewriter reveal
   ═══════════════════════════════════════════════════════════ */
function HeroStatement({ startTyping }: { startTyping: boolean }) {
  const fullText = HERO_STATEMENT;
  const [phase, setPhase] = useState<'idle' | 'header' | 'typing' | 'done'>('idle');
  const visibleRef = useRef<HTMLSpanElement>(null);
  const idxRef = useRef(1);

  useIsomorphicLayoutEffect(() => {
    if (!startTyping || phase !== 'idle') return;
    setPhase('typing');
  }, [startTyping, phase]);

  useIsomorphicLayoutEffect(() => {
    if (phase !== 'typing') return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (cancelled) return;
      const i = idxRef.current;
      if (i >= fullText.length) {
        setPhase('done');
        return;
      }
      const char = fullText[i];
      const base = char === ' ' ? 38 : 28;
      const jitter = Math.floor(Math.random() * 22);
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        idxRef.current = i + 1;
        if (visibleRef.current) {
          visibleRef.current.textContent = fullText.slice(0, i + 1);
        }
        tick();
      }, base + jitter);
    };

    tick();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [phase, fullText]);

  const showBlock = phase !== 'idle';
  const showCursor = phase === 'typing';
  const typewriterStyle = {
    fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
    fontSize: 'clamp(0.76rem, 1.1vw, 0.96rem)',
    fontWeight: 300,
    lineHeight: 1.65,
    letterSpacing: '0.1em',
    textAlign: 'center',
    textTransform: 'uppercase',
    pointerEvents: 'none',
    color: 'rgba(170, 180, 195, 0.75)',
  } as const;
  const bracketStyle = {
    color: 'rgba(194, 52, 77, 0.55)',
    fontFamily: 'var(--font-jetbrains-mono), monospace',
    fontSize: '1.05em',
    fontWeight: 400,
    pointerEvents: 'none',
  } as const;

  return (
    <div className="hero-statement mx-auto max-w-5xl px-4 pt-4 sm:pt-5 md:pt-6" aria-label={HERO_STATEMENT}>
      <p className="sr-only">{HERO_STATEMENT}</p>
      <div aria-hidden="true" className="hero-statement-stack">
        <div
          style={{
            position: 'relative',
            maxWidth: 'min(720px, 92vw)',
            padding: 'clamp(0.8rem, 2vh, 1.6rem) clamp(0.5rem, 2vw, 2rem)',
            opacity: showBlock ? 1 : 0,
            transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: '1px',
              background:
                'linear-gradient(90deg, transparent, rgba(194,52,77,0.35), rgba(0,200,238,0.15), transparent)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '10%',
              right: '10%',
              height: '1px',
              background:
                'linear-gradient(90deg, transparent, rgba(0,200,238,0.15), rgba(194,52,77,0.35), transparent)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 'clamp(6px, 1.2vw, 14px)',
              height: 'clamp(6px, 1.2vw, 14px)',
              borderLeft: '1px solid rgba(194,52,77,0.35)',
              borderTop: '1px solid rgba(194,52,77,0.35)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 'clamp(6px, 1.2vw, 14px)',
              height: 'clamp(6px, 1.2vw, 14px)',
              borderRight: '1px solid rgba(194,52,77,0.35)',
              borderTop: '1px solid rgba(194,52,77,0.35)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 'clamp(6px, 1.2vw, 14px)',
              height: 'clamp(6px, 1.2vw, 14px)',
              borderLeft: '1px solid rgba(0,200,238,0.25)',
              borderBottom: '1px solid rgba(0,200,238,0.25)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 'clamp(6px, 1.2vw, 14px)',
              height: 'clamp(6px, 1.2vw, 14px)',
              borderRight: '1px solid rgba(0,200,238,0.25)',
              borderBottom: '1px solid rgba(0,200,238,0.25)',
            }}
          />
          <div style={{ display: 'grid' }}>
            <div
              aria-hidden="true"
              className="hero-typewriter-text"
              style={{ ...typewriterStyle, gridArea: '1 / 1', visibility: 'hidden' }}
            >
              <span style={bracketStyle}>[</span> {fullText} <span style={bracketStyle}>]</span>
            </div>
            <div
              className="hero-typewriter-text"
              style={{ ...typewriterStyle, gridArea: '1 / 1' }}
            >
              <span style={bracketStyle}>[</span>{' '}
              <span ref={visibleRef}>{fullText.charAt(0)}</span>
              {showCursor && (
                <span
                  className="hero-typing-cursor"
                  style={{ display: 'inline-block', pointerEvents: 'none' }}
                />
              )}{' '}
              <span style={bracketStyle}>]</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const MARKET_SIGNALS = [
  {
    label: 'Market tone',
    accent: '#C2344D',
    text: 'Separate durable demand from reflexive noise before the chart pulls attention away.',
  },
  {
    label: 'Capital movement',
    accent: '#00C8EE',
    text: 'Follow meaningful wallet and exchange movement without losing the surrounding context.',
  },
  {
    label: 'Protocol demand',
    accent: '#E8960C',
    text: 'Read usage, liquidity, fees, and yield as a combined picture of network strength.',
  },
  {
    label: 'Research record',
    accent: '#8FB7E8',
    text: 'Keep the explanation close to the signal so the next review starts from evidence.',
  },
];

const WORKFLOW_STEPS = [
  {
    label: 'Question',
    text: 'Start from the market claim that needs pressure, not from the loudest movement on screen.',
  },
  {
    label: 'Evidence',
    text: 'Place mood, flow, and protocol demand side by side before accepting the obvious explanation.',
  },
  {
    label: 'Contradiction',
    text: 'Make disagreement visible. Strong views survive opposing data; weak ones do not.',
  },
  {
    label: 'Action',
    text: 'Move into a focused view only when the evidence deserves more attention.',
  },
];

const OPERATING_PRINCIPLES = [
  {
    label: 'Controlled density',
    text: 'Information is packed tightly, but every panel has a defined job and a clear reading order.',
  },
  {
    label: 'Low noise',
    text: 'Decorative motion is restrained. The interface gives weight to the evidence, not the chrome.',
  },
  {
    label: 'Direct movement',
    text: 'The route from a broad question to a focused view is short and predictable.',
  },
  {
    label: 'Plain language',
    text: 'Market behavior is described in terms that help judgment, not in invented jargon.',
  },
];

const STARTING_PROMPTS = [
  'Is conviction improving or fading?',
  'Is capital moving with intent?',
  'Is protocol demand real?',
  'What explains the change?',
];

/* ═══════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Home() {
  useKineticFirstPaint();
  const [kineticDone, setKineticDone] = useState(false);
  const heroRef    = useHeroTimeline(() => setKineticDone(true));
  const modulesRef  = useModulesReveal();
  useMouseParallax(heroRef);
  return (
    <div
      data-click-surface="home"
      className="min-h-screen flex flex-col relative overflow-x-clip"
      style={{ background: 'linear-gradient(180deg, #07090F 0%, #08090F 6%, #06070D 14%, #06080D 30%, #05070B 48%, #06080D 64%, #05060B 80%, #05060B 100%)' }}
    >
      <Navbar />
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ willChange: 'transform', contain: 'paint' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)`,
            backgroundSize: 'var(--grid-size) var(--grid-size)',
            maskImage: 'radial-gradient(ellipse 75% 60% at 50% 35%, black 25%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 75% 60% at 50% 35%, black 25%, transparent 75%)',
            transform: 'translateZ(0)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(ellipse clamp(400px, 35vw, 1000px) clamp(300px, 25vw, 700px) at 15% 25%, rgba(59,130,246,0.045) 0%, transparent 70%),
              radial-gradient(ellipse clamp(300px, 25vw, 700px) clamp(250px, 20vw, 600px) at 85% 70%, rgba(99,102,241,0.030) 0%, transparent 70%)`,
            transform: 'translateZ(0)',
          }}
        />
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.03, mixBlendMode: 'soft-light', transform: 'translateZ(0)' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <filter id="novrix-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#novrix-grain)" />
        </svg>
        <div className="absolute top-[36%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full border hero-orbital-1"
          style={{
            borderColor: 'rgba(255,255,255,0.022)',
            animation: 'orbitalSpin 45s linear infinite',
            willChange: 'transform',
            transform: 'translate(-50%, -50%) translateZ(0)',
          }}
        />
        <div className="absolute top-[36%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full border hero-orbital-2"
          style={{
            borderColor: 'rgba(255,255,255,0.014)',
            animation: 'orbitalSpinReverse 30s linear infinite',
            willChange: 'transform',
            transform: 'translate(-50%, -50%) translateZ(0)',
          }}
        />
      </div>
      <main className="flex-1 w-full relative z-10">
        {/* HERO — above fold, never lazy */}
        <section
          ref={heroRef}
          className="relative flex flex-col items-center justify-start sm:justify-center pt-20 sm:pt-0 pb-8 sm:pb-10 2xl:pb-12 3xl:pb-14 section-contained hero-contained"
          style={{
            background: 'transparent',
            paddingLeft: 'var(--container-pad)',
            paddingRight: 'var(--container-pad)',
            contain: 'layout style paint',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 right-0 pointer-events-none"
            style={{ height: 'clamp(60px, 10vh, 120px)', background: 'linear-gradient(180deg, rgba(7,9,15,0.92) 0%, rgba(7,9,15,0.45) 45%, transparent 100%)', zIndex: 5 }}
          />
          <div className="whale-canvas absolute inset-0 pointer-events-none overflow-hidden">
            <WhaleFlowCanvas />
          </div>

          <div className="hero-corner absolute pointer-events-none border-l border-t border-white/[0.06]" data-depth="3" style={{ top: 'clamp(4rem, 8vh, 12rem)', left: 'var(--container-pad)', width: 'clamp(2rem, 4vw, 10rem)', height: 'clamp(2rem, 4vw, 10rem)' }} />
          <div className="hero-corner absolute pointer-events-none border-r border-t border-white/[0.06]" data-depth="2.5" style={{ top: 'clamp(4rem, 8vh, 12rem)', right: 'var(--container-pad)', width: 'clamp(2rem, 4vw, 10rem)', height: 'clamp(2rem, 4vw, 10rem)' }} />
          <div className="hero-corner absolute pointer-events-none border-l border-b border-white/[0.06]" data-depth="2.8" style={{ bottom: 'clamp(2rem, 5vh, 10rem)', left: 'var(--container-pad)', width: 'clamp(2rem, 4vw, 10rem)', height: 'clamp(2rem, 4vw, 10rem)' }} />
          <div className="hero-corner absolute pointer-events-none border-r border-b border-white/[0.06]" data-depth="3.2" style={{ bottom: 'clamp(2rem, 5vh, 10rem)', right: 'var(--container-pad)', width: 'clamp(2rem, 4vw, 10rem)', height: 'clamp(2rem, 4vw, 10rem)' }} />
          <div className="hero-corner absolute pointer-events-none bg-white/[0.08]" data-depth="3.5" style={{ top: 'clamp(4rem, 8vh, 12rem)', left: 'var(--container-pad)', width: 'clamp(4px, 0.4vw, 10px)', height: 'clamp(4px, 0.4vw, 10px)', transform: 'translate(-50%, -50%)' }} />
          <div className="hero-corner absolute pointer-events-none bg-white/[0.08]" data-depth="2.5" style={{ top: 'clamp(4rem, 8vh, 12rem)', right: 'var(--container-pad)', width: 'clamp(4px, 0.4vw, 10px)', height: 'clamp(4px, 0.4vw, 10px)', transform: 'translate(50%, -50%)' }} />
          <div className="hero-content relative z-10 w-full mx-auto text-center"
            style={{
              opacity: 1,
              maxWidth: 'var(--container-max-lg)',
              willChange: 'transform',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
            }}
          >
            <div className="pt-8 sm:pt-12 md:pt-14">
              <h1
                className="font-black tracking-tight leading-[0.85] sm:leading-[0.9] mb-2 sm:mb-5 md:mb-6 2xl:mb-8"
                style={{ animation: 'titleGlow 4s ease-in-out infinite', fontFeatureSettings: '"tnum" 1, "zero" 1', color: 'transparent', fontSize: 'var(--text-hero)' }}
              >
                <KineticText
                  text="TRINITY OF"
                  marker="hero-line-1"
                  className="block px-2 sm:px-4 font-black"
                  gradient="linear-gradient(90deg, #C8D8E4, #D0E0EC, #C8D8E4)"
                />
                <div className="hero-dash" style={{ height: '1px', width: 'clamp(48px, 4vw, 120px)', margin: 'clamp(14px, 2vh, 40px) auto clamp(12px, 1.8vh, 36px)', background: 'rgba(194, 52, 77, 0.40)' }} />
                <KineticText
                  text="INTELLIGENCE"
                  marker="hero-line-2"
                  className="block px-2 sm:px-4 font-black"
                  gradient="linear-gradient(90deg, #C2344D, #D9485F, #9A2238)"
                />
              </h1>
              <HeroStatement startTyping={kineticDone} />
              <div className="flex items-center justify-center gap-4 sm:gap-8 my-5 sm:my-8 md:my-10 2xl:my-12">
                <div className="hero-separator-line h-px origin-right" style={{ width: 'clamp(4rem, 8vw, 24rem)', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08))' }} />
                <div className="hero-separator-dot rotate-45 shrink-0" style={{ width: 'clamp(3px, 0.4vw, 8px)', height: 'clamp(3px, 0.4vw, 8px)', background: 'rgba(255,255,255,0.15)' }} />
                <div className="hero-separator-line h-px origin-left" style={{ width: 'clamp(4rem, 8vw, 24rem)', background: 'linear-gradient(270deg, transparent, rgba(255,255,255,0.08))' }} />
              </div>
            </div>
             <div className="mb-10 sm:mb-16 2xl:mb-20">
              <style>{`
                @keyframes gateAura {
                  0%, 100% {
                    box-shadow:
                      0 0 0 1px rgba(50, 60, 80, 0.18),
                      0 0 20px rgba(50, 60, 80, 0.05),
                      inset 0 1px 0 rgba(255,255,255,0.06);
                  }
                  50% {
                    box-shadow:
                      0 0 0 1px rgba(60, 70, 90, 0.30),
                      0 0 32px rgba(60, 70, 90, 0.10),
                      inset 0 1px 0 rgba(255,255,255,0.08);
                  }
                }
                @keyframes gateScan {
                  0% { transform: translateX(-120%); }
                  100% { transform: translateX(320%); }
                }
                @keyframes gateBorderTravel {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
                @keyframes gateDataStream {
                  0% { transform: translateX(-100%); opacity: 0; }
                  10% { opacity: 1; }
                  90% { opacity: 1; }
                  100% { transform: translateX(400%); opacity: 0; }
                }
                @keyframes gateTextShimmer {
                  0% { background-position: -200% center; }
                  100% { background-position: 200% center; }
                }
                .hero-terminal-gate {
                  position: relative;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  gap: 12px;
                  min-width: min(280px, 82vw);
                  padding: 14px 28px;
                  overflow: hidden;
                  border: 1px solid rgba(60, 70, 90, 0.18);
                  border-bottom: 2px solid rgba(50, 60, 80, 0.35);
                  background:
                    linear-gradient(180deg, rgba(14, 18, 30, 0.94) 0%, rgba(10, 14, 26, 0.98) 100%);
                  backdrop-filter: blur(8px);
                  -webkit-backdrop-filter: blur(8px);
                  color: rgba(226,232,240,0.88);
                  text-decoration: none;
                  font-family: var(--font-jetbrains-mono), monospace;
                  font-size: clamp(11px, 1.2vw, 14px);
                  font-weight: 700;
                  letter-spacing: 0.22em;
                  text-transform: uppercase;
                  animation: gateAura 4s ease-in-out infinite;
                  transform: translateZ(0);
                  transition:
                    transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
                    border-color 200ms ease,
                    color 200ms ease;
                }
                @media (min-width: 640px) {
                  .hero-terminal-gate {
                    gap: 16px;
                    min-width: 300px;
                    padding: 18px 44px;
                    letter-spacing: 0.28em;
                  }
                }
                /* Scanning light beam */
                .hero-terminal-gate .gate-scanline {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 40%;
                  height: 100%;
                  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
                  animation: gateScan 5s ease-in-out infinite;
                  pointer-events: none;
                }
                /* Traveling border highlight */
                .hero-terminal-gate .gate-border-glow {
                  position: absolute;
                  inset: -1px;
                  border-radius: inherit;
                  padding: 1px;
                  background: linear-gradient(90deg, transparent, rgba(60,70,90,0.35), rgba(40,50,70,0.25), rgba(60,70,90,0.35), transparent);
                  background-size: 300% 100%;
                  animation: gateBorderTravel 6s ease-in-out infinite;
                  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                  -webkit-mask-composite: xor;
                  mask-composite: exclude;
                  opacity: 0.5;
                  pointer-events: none;
                }
                /* Data stream particles */
                .hero-terminal-gate .gate-stream {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  overflow: hidden;
                  pointer-events: none;
                }
                .hero-terminal-gate .gate-stream::before,
                .hero-terminal-gate .gate-stream::after {
                  content: '';
                  position: absolute;
                  height: 1px;
                  background: linear-gradient(90deg, transparent, rgba(60,70,90,0.25), transparent);
                  animation: gateDataStream 4s linear infinite;
                }
                .hero-terminal-gate .gate-stream::before {
                  top: 25%;
                  width: 30%;
                  animation-delay: 0s;
                }
                .hero-terminal-gate .gate-stream::after {
                  top: 75%;
                  width: 20%;
                  animation-delay: 2s;
                }
                /* Text shimmer effect */
                .hero-terminal-gate .gate-text {
                  background: linear-gradient(90deg, rgba(226,232,240,0.88) 0%, rgba(255,255,255,0.95) 25%, rgba(226,232,240,0.88) 50%, rgba(255,255,255,0.95) 75%, rgba(226,232,240,0.88) 100%);
                  background-size: 200% auto;
                  -webkit-background-clip: text;
                  background-clip: text;
                  -webkit-text-fill-color: transparent;
                  animation: gateTextShimmer 6s linear infinite;
                }
                .hero-terminal-gate::before {
                  content: '';
                  position: absolute;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  height: 1px;
                  background: linear-gradient(90deg, transparent 10%, rgba(80, 90, 110, 0.40) 50%, transparent 90%);
                  opacity: 0.5;
                }

                .hero-terminal-gate:hover {
                  border-color: rgba(70, 80, 100, 0.30);
                  border-bottom-color: rgba(60, 70, 90, 0.50);
                  color: #FFFFFF;
                  animation: none;
                  box-shadow:
                    0 0 0 1px rgba(60, 70, 90, 0.25),
                    0 0 40px rgba(60, 70, 90, 0.12),
                    0 16px 48px rgba(0,0,0,0.45),
                    inset 0 1px 0 rgba(255,255,255,0.10);
                }
                .hero-terminal-gate:hover .gate-scanline,
                .hero-terminal-gate:hover .gate-border-glow,
                .hero-terminal-gate:hover .gate-stream,
                .hero-terminal-gate:hover .gate-text {
                  animation-play-state: paused;
                }
                .hero-terminal-gate:active {
                  transform: translate3d(0, -1px, 0);
                  box-shadow:
                    0 0 0 1px rgba(60, 70, 90, 0.20),
                    0 0 20px rgba(60, 70, 90, 0.08),
                    0 4px 16px rgba(0,0,0,0.35),
                    inset 0 1px 0 rgba(255,255,255,0.06);
                }
                @media (prefers-reduced-motion: reduce) {
                  .hero-terminal-gate,
                  .hero-terminal-gate .gate-scanline,
                  .hero-terminal-gate .gate-border-glow,
                  .hero-terminal-gate .gate-stream,
                  .hero-terminal-gate .gate-text { animation: none; }
                }
              `}</style>
              <div className="flex items-center justify-center max-w-xs sm:max-w-none mx-auto">
                <div className="hero-cta">
                  <Link href="/terminal" prefetch={false} className="hero-terminal-gate" aria-label="Open Terminal">
                    <span className="gate-scanline"></span>
                    <span className="gate-border-glow"></span>
                    <span className="gate-stream"></span>
                    <span className="gate-text pointer-events-none">Open Terminal</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Below-fold sections */}
        <section className="relative overflow-hidden section-contained content-visibility-auto" style={{ background: 'transparent' }}>
          <style>{`
            @keyframes homeSheen { from { transform: translate3d(-130%, 0, 0) skewX(-18deg); } to { transform: translate3d(180%, 0, 0) skewX(-18deg); } }
            @keyframes homeTrace { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -220; } }
            @keyframes homePulse { 0%, 100% { opacity: 0.34; transform: scale(0.96); } 50% { opacity: 0.82; transform: scale(1.04); } }
            @keyframes homeFloat { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -10px, 0); } }
            @media (prefers-reduced-motion: reduce) { .home-motion { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; } }
          `}</style>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 18% 14%, rgba(148,163,184,0.10), transparent 34%), radial-gradient(ellipse at 82% 42%, rgba(0,200,238,0.055), transparent 40%)' }} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'linear-gradient(180deg, black, transparent 82%)', WebkitMaskImage: 'linear-gradient(180deg, black, transparent 82%)' }} />

          <div className="mx-auto relative z-10" style={{ maxWidth: 'var(--container-max-lg)', padding: 'var(--space-6) var(--container-pad)' }}>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={fadeUp}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="scroll-stable-motion grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] gap-8 lg:gap-14 xl:gap-20 2xl:gap-28 items-start"
            >
              <div className="relative z-10">
                <div className="inline-flex items-center gap-3 mb-5 px-3 py-2" style={{ background: 'rgba(255,255,255,0.028)', border: '1px solid rgba(255,255,255,0.065)' }}>
                  <div className="w-8 h-px shrink-0" style={{ background: 'linear-gradient(90deg, rgba(148,163,184,0.75), transparent)' }} />
                  <span className="text-[9px] 2xl:text-[10px] 3xl:text-xs font-mono uppercase tracking-[0.28em]" style={{ color: 'rgba(203,213,225,0.68)' }}>SIGNAL DISCIPLINE</span>
                </div>
                <h2 className="font-black leading-[0.98] tracking-tight mb-6 max-w-3xl" style={{ fontSize: 'var(--text-h2)', color: '#E8EAED', textShadow: '0 18px 80px rgba(0,0,0,0.55)' }}>
                  A stricter read on market behavior.
                </h2>
                <p className="leading-relaxed max-w-2xl" style={{ color: 'rgba(203,213,225,0.64)', fontSize: 'var(--text-body)' }}>
                  Price is a surface reading. The useful view checks behavior, capital flow, protocol demand, and research context before forming a conclusion.
                </p>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MARKET_SIGNALS.map(signal => (
                    <div key={signal.label} className="relative overflow-hidden p-4 2xl:p-5" style={{ background: 'rgba(255,255,255,0.028)', border: '1px solid rgba(255,255,255,0.065)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)' }}>
                      <div className="absolute left-0 top-4 bottom-4 w-px" style={{ background: `linear-gradient(180deg, transparent, ${signal.accent}66, transparent)` }} />
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rotate-45 shrink-0" style={{ background: signal.accent, boxShadow: `0 0 18px ${signal.accent}66` }} />
                        <h3 className="font-mono uppercase tracking-[0.18em] text-[10px] 2xl:text-xs" style={{ color: '#E2E8F0' }}>{signal.label}</h3>
                      </div>
                      <p className="leading-relaxed text-sm 2xl:text-base" style={{ color: 'rgba(226,232,240,0.56)' }}>{signal.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <motion.div
                className="scroll-stable-motion relative overflow-hidden p-3 sm:p-4 2xl:p-5"
                style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 36px 120px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.055)' }}
                initial={{ opacity: 1, scale: 0.99, y: 4 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.10, ease: 'easeOut' }}
              >
                <div className="absolute inset-y-0 left-0 w-1/3 pointer-events-none home-motion" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.055), transparent)', animation: 'homeSheen 5s cubic-bezier(0.45,0,0.2,1) infinite', willChange: 'transform' }} />
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 60% 28%, rgba(0,200,238,0.07), transparent 34%), radial-gradient(circle at 34% 82%, rgba(194,52,77,0.08), transparent 42%)' }} />
                <div className="relative overflow-hidden" style={{ background: 'rgba(3,5,10,0.78)', border: '1px solid rgba(255,255,255,0.065)' }}>
                  <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.025)' }}>
                    <div>
                      <div className="font-mono uppercase tracking-[0.22em] text-[10px] 2xl:text-xs" style={{ color: 'rgba(148,163,184,0.72)' }}>EVIDENCE GRID</div>
                      <div className="mt-1 text-sm 2xl:text-base" style={{ color: '#E2E8F0' }}>Conflicting signals stay visible</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5">
                      {['#C2344D', '#00C8EE', '#E8960C'].map(color => (
                        <span key={color} className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 14px ${color}66` }} />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_0.86fr] gap-0">
                    <div className="p-4 sm:p-5 space-y-3">
                      {MARKET_SIGNALS.map((signal, index) => (
                        <div key={signal.label} className="p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.055)' }}>
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <span className="font-mono uppercase tracking-[0.16em] text-[10px] 2xl:text-xs" style={{ color: signal.accent }}>{signal.label}</span>
                            <span className="font-mono uppercase tracking-[0.14em] text-[9px] 2xl:text-[10px]" style={{ color: 'rgba(226,232,240,0.46)' }}>{['pressure', 'flow', 'demand', 'record'][index]}</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.055)' }}>
                            <div className="home-motion h-full rounded-full" style={{ width: ['74%', '58%', '66%', '48%'][index], background: `linear-gradient(90deg, ${signal.accent}22, ${signal.accent}CC)`, animation: `homePulse ${2.2 + index * 0.2}s ease-in-out infinite` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 sm:p-5 md:border-l" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="p-5 h-full min-h-[clamp(200px,30vh,360px)] flex flex-col justify-between" style={{ background: 'linear-gradient(180deg, rgba(148,163,184,0.075), rgba(0,200,238,0.035), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.065)' }}>
                        <div>
                          <div className="font-mono uppercase tracking-[0.2em] text-[10px] 2xl:text-xs mb-4" style={{ color: 'rgba(226,232,240,0.58)' }}>READING RULE</div>
                          <p className="font-black leading-tight tracking-tight" style={{ fontSize: 'var(--text-h4)', color: '#F8FAFC' }}>
                            The strongest view is the one that survives opposing evidence.
                          </p>
                          <p className="mt-4 leading-relaxed text-sm 2xl:text-base" style={{ color: 'rgba(226,232,240,0.58)' }}>
                            When behavior, flow, and demand diverge, the tension stays visible until the market resolves it.
                          </p>
                        </div>
                        <div className="mt-8 grid grid-cols-2 gap-2">
                          {['mood', 'flow', 'health', 'context'].map(tag => (
                            <span key={tag} className="rounded-full px-3 py-2 text-center font-mono uppercase tracking-[0.14em] text-[9px] 2xl:text-[10px]" style={{ color: 'rgba(226,232,240,0.62)', background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
        <section className="relative overflow-hidden section-contained content-visibility-auto" style={{ background: 'transparent' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 14% 10%, rgba(148,163,184,0.075), transparent 34%), radial-gradient(ellipse at 86% 62%, rgba(0,200,238,0.045), transparent 36%)' }} />
          <div ref={modulesRef} className="mx-auto relative z-10" style={{ maxWidth: "var(--container-max-lg)", padding: "var(--space-6) var(--container-pad)" }}>
            <div className="modules-header mb-10 sm:mb-14 2xl:mb-20 3xl:mb-24 grid grid-cols-1 lg:grid-cols-[0.9fr_0.8fr] gap-8 lg:gap-14 items-end">
              <div>
                <div className="modules-label flex items-center gap-3 mb-6">
                  <div className="modules-line h-px w-10 origin-left" style={{ background: 'linear-gradient(90deg, rgba(148,163,184,0.62), transparent)' }} />
                  <span className="text-[10px] 2xl:text-xs 3xl:text-sm font-mono uppercase tracking-[0.28em]" style={{ color: 'rgba(148,163,184,0.78)' }}>FOCUSED VIEWS</span>
                </div>
                <h2 className="modules-title font-black tracking-tight leading-[0.95] max-w-4xl" style={{ fontSize: 'var(--text-h2)', color: '#E8EAED' }}>
                  Select the evidence path before the conclusion.
                </h2>
                <p className="modules-desc mt-6 max-w-2xl leading-relaxed" style={{ fontSize: "var(--text-body)", color: 'rgba(255,255,255,0.52)' }}>
                  Each view isolates a different source of market pressure while keeping the surrounding record close.
                </p>
              </div>
              <div className="p-5 sm:p-6 2xl:p-8" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.014))', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 28px 90px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.045)' }}>
                <div className="font-mono uppercase tracking-[0.22em] text-[10px] 2xl:text-xs mb-4" style={{ color: 'rgba(148,163,184,0.72)' }}>SELECTION GUIDE</div>
                <p className="leading-relaxed" style={{ fontSize: 'var(--text-body)', color: 'rgba(226,232,240,0.66)' }}>
                  Use sentiment for behavior, tracking for movement, and protocol data for durability. The goal is not more screens. The goal is fewer weak assumptions.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {['behavior', 'movement', 'durability'].map(tag => (
                    <span key={tag} className="px-3 py-2 font-mono uppercase tracking-[0.14em] text-[9px] 2xl:text-[10px]" style={{ color: 'rgba(226,232,240,0.58)', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.065)' }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
            <motion.div
              className="scroll-stable-motion modules-grid cq-card-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 2xl:gap-8 3xl:gap-10 4xl:gap-12"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              transition={{ staggerChildren: 0.008 }}
            >
              {DESKS.map((desk) => (
                <DeskCard key={desk.label} desk={desk} />
              ))}
            </motion.div>
          </div>
        </section>
        <section className="relative overflow-hidden section-contained content-visibility-auto" style={{ background: 'transparent' }}>
          <div className="absolute inset-0 pointer-events-none opacity-[0.045]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)', backgroundSize: '38px 38px' }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 18% 45%, rgba(148,163,184,0.08), transparent 38%), radial-gradient(ellipse at 78% 42%, rgba(0,200,238,0.045), transparent 38%)' }} />
          <div className="relative z-10 mx-auto" style={{ maxWidth: "var(--container-max-lg)", padding: "var(--space-6) var(--container-pad)" }}>
            <div className="grid grid-cols-1 xl:grid-cols-[0.82fr_1.18fr] gap-10 lg:gap-16 2xl:gap-24 items-start">
              <motion.div className="scroll-stable-motion" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeUp} transition={{ duration: 0.10, ease: 'easeOut' }}>
                <div className="inline-flex items-center gap-3 mb-5 px-3 py-2" style={{ background: 'rgba(255,255,255,0.028)', border: '1px solid rgba(255,255,255,0.065)' }}>
                  <div className="w-8 h-px shrink-0" style={{ background: 'linear-gradient(90deg, rgba(148,163,184,0.66), transparent)' }} />
                  <span className="text-[9px] 2xl:text-[10px] 3xl:text-xs font-mono uppercase tracking-[0.28em]" style={{ color: 'rgba(203,213,225,0.72)' }}>RESEARCH METHOD</span>
                </div>
                <h2 className="font-black tracking-tight leading-[0.95] mb-6 max-w-4xl" style={{ fontSize: 'var(--text-h2)', color: '#E8EAED' }}>
                  Question, test, and keep contradictions visible.
                </h2>
                <p className="leading-relaxed max-w-2xl" style={{ fontSize: "var(--text-body)", color: 'rgba(226,232,240,0.58)' }}>
                  The page is structured to slow down weak conclusions and speed up useful comparison.
                </p>
                <div className="mt-8 p-5 sm:p-6" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.014))', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="font-mono uppercase tracking-[0.22em] text-[10px] 2xl:text-xs mb-4" style={{ color: 'rgba(148,163,184,0.78)' }}>PRIMARY CHECK</div>
                  <p className="font-black leading-tight tracking-tight" style={{ fontSize: 'var(--text-h4)', color: '#F8FAFC' }}>
                    What would invalidate the view?
                  </p>
                  <p className="mt-4 leading-relaxed text-sm 2xl:text-base" style={{ color: 'rgba(226,232,240,0.56)' }}>
                    Opposing evidence stays close enough to challenge the thesis before the market does.
                  </p>
                </div>
              </motion.div>

              <motion.div className="scroll-stable-motion grid grid-cols-1 sm:grid-cols-2 gap-3 2xl:gap-4" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} transition={{ staggerChildren: 0.008 }}>
                {WORKFLOW_STEPS.map((item, index) => (
                  <motion.div key={item.label} variants={fadeUp} transition={{ duration: 0.12, ease: 'easeOut' }} className="scroll-stable-motion relative overflow-hidden p-5 sm:p-6 2xl:p-8 min-h-[clamp(160px,22vh,260px)]" style={{ border: '1px solid rgba(255,255,255,0.065)', background: 'linear-gradient(160deg, rgba(255,255,255,0.045), rgba(255,255,255,0.014))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)' }}>
                    <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${['#C2344D', '#00C8EE', '#E8960C', '#8FB7E8'][index]}AA, transparent)` }} />
                    <div className="home-motion absolute right-5 top-5 w-16 h-16 pointer-events-none rounded-full" style={{ background: `radial-gradient(circle, ${['#C2344D', '#00C8EE', '#E8960C', '#8FB7E8'][index]}28, transparent 68%)`, animation: `homeFloat ${2.5 + index * 0.2}s ease-in-out infinite` }} />
                    <div className="relative">
                      <h3 className="font-mono uppercase tracking-[0.2em] text-[10px] 2xl:text-xs mb-4" style={{ color: '#E2E8F0' }}>{item.label}</h3>
                      <p className="leading-relaxed" style={{ fontSize: 'var(--text-body)', color: 'rgba(226,232,240,0.58)' }}>{item.text}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden section-contained content-visibility-auto" style={{ background: 'transparent' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.04), transparent 42%), radial-gradient(ellipse at 20% 78%, rgba(148,163,184,0.07), transparent 34%), radial-gradient(ellipse at 82% 58%, rgba(0,200,238,0.045), transparent 38%)' }} />
          <div className="relative z-10 mx-auto" style={{ maxWidth: "var(--container-max-lg)", padding: "var(--space-6) var(--container-pad)" }}>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeUp} transition={{ duration: 0.10, ease: 'easeOut' }} className="scroll-stable-motion grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 2xl:gap-24 items-stretch">
              <div className="p-6 sm:p-8 2xl:p-10" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.052), rgba(255,255,255,0.014))', border: '1px solid rgba(255,255,255,0.075)', boxShadow: '0 36px 120px rgba(0,0,0,0.42)' }}>
                <div className="inline-flex items-center gap-3 mb-6">
                  <div className="w-8 h-px shrink-0" style={{ background: 'linear-gradient(90deg, rgba(148,163,184,0.7), transparent)' }} />
                  <span className="text-[10px] 2xl:text-xs font-mono uppercase tracking-[0.28em]" style={{ color: 'rgba(148,163,184,0.78)' }}>OPERATING STANDARD</span>
                </div>
                <h2 className="font-black tracking-tight leading-[0.95] mb-6" style={{ fontSize: 'var(--text-h2)', color: '#E8EAED' }}>
                  Designed for disciplined market review.
                </h2>
                <p className="leading-relaxed mb-8" style={{ fontSize: "var(--text-body)", color: 'rgba(226,232,240,0.58)' }}>
                  The layout favors controlled density, stable hierarchy, and direct movement into evidence.
                </p>
                <div className="p-5" style={{ background: 'rgba(3,5,10,0.62)', border: '1px solid rgba(255,255,255,0.065)' }}>
                  <div className="font-mono uppercase tracking-[0.2em] text-[10px] 2xl:text-xs mb-4" style={{ color: 'rgba(226,232,240,0.56)' }}>WHAT STAYS VISIBLE</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['source context', 'market behavior', 'wallet pressure', 'protocol strength'].map(item => (
                      <div key={item} className="px-4 py-3 font-mono uppercase tracking-[0.13em] text-[9px] 2xl:text-[10px]" style={{ color: 'rgba(226,232,240,0.64)', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.055)' }}>{item}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 2xl:gap-4">
                {OPERATING_PRINCIPLES.map((item, index) => (
                  <div key={item.label} className="relative overflow-hidden p-5 sm:p-6 2xl:p-8" style={{ background: 'rgba(255,255,255,0.028)', border: '1px solid rgba(255,255,255,0.065)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)' }}>
                    <div className="absolute -right-8 -top-8 w-28 h-28 pointer-events-none rounded-full home-motion" style={{ background: `radial-gradient(circle, ${['#C2344D', '#00C8EE', '#E8960C', '#8FB7E8'][index]}22, transparent 70%)`, animation: `homePulse ${2.3 + index * 0.15}s ease-in-out infinite` }} />
                    <div className="relative">
                      <div className="w-8 h-px mb-5" style={{ background: `linear-gradient(90deg, ${['#C2344D', '#00C8EE', '#E8960C', '#8FB7E8'][index]}AA, transparent)` }} />
                      <h3 className="font-mono uppercase tracking-[0.2em] text-[10px] 2xl:text-xs mb-3" style={{ color: '#E2E8F0' }}>{item.label}</h3>
                      <p className="leading-relaxed" style={{ fontSize: 'var(--text-body)', color: 'rgba(226,232,240,0.56)' }}>{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="relative overflow-hidden section-contained content-visibility-auto" style={{ background: 'transparent' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(148,163,184,0.08), transparent 38%), radial-gradient(ellipse at 74% 68%, rgba(0,200,238,0.055), transparent 34%)' }} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.035]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 42px, rgba(255,255,255,0.08) 42px, rgba(255,255,255,0.08) 43px)' }} />
          <motion.div className="scroll-stable-motion relative z-10 w-full mx-auto" style={{ maxWidth: "var(--container-max-lg)", padding: "var(--space-6) var(--container-pad)" }} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeUp} transition={{ duration: 0.10, ease: 'easeOut' }}>
            <div className="overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.058), rgba(255,255,255,0.016))', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 44px 150px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="p-6 sm:p-8 2xl:p-12 3xl:p-16">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-px shrink-0" style={{ background: 'linear-gradient(90deg, rgba(148,163,184,0.7), transparent)' }} />
                    <span className="text-[10px] 2xl:text-xs 3xl:text-sm font-mono uppercase tracking-[0.28em]" style={{ color: 'rgba(148,163,184,0.78)' }}>NEXT REVIEW</span>
                  </div>
                  <h2 className="font-black mb-6 tracking-tight leading-[0.92] max-w-4xl" style={{ fontSize: 'var(--text-h2)', color: '#F8FAFC' }}>
                    Open a focused market view when the evidence warrants it.
                  </h2>
                  <p className="leading-relaxed max-w-2xl" style={{ fontSize: "var(--text-body)", color: 'rgba(226,232,240,0.62)' }}>
                    Start with the view that fits the question. Keep mood, movement, protocol demand, and research context in the same decision path.
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row gap-2.5 sm:gap-3 max-w-md sm:max-w-none mx-auto sm:mx-0">
                    <HomeModuleButton href="/sentiment" label="OPEN SENTIMENT" variant="primary" />
                    <HomeModuleButton href="/tracking" label="OPEN TRACKING" variant="secondary" />
                  </div>
                </div>
                <div className="p-6 sm:p-8 2xl:p-12 3xl:p-16 lg:border-l" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(3,5,10,0.34)' }}>
                  <div className="font-mono uppercase tracking-[0.22em] text-[10px] 2xl:text-xs mb-5" style={{ color: 'rgba(226,232,240,0.56)' }}>START WITH A BETTER QUESTION</div>
                  <div className="space-y-3">
                    {STARTING_PROMPTS.map(prompt => (
                      <div key={prompt} className="p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.065)' }}>
                        <span className="w-2 h-2 rotate-45 shrink-0" style={{ background: '#00C8EE', boxShadow: '0 0 16px rgba(0,200,238,0.55)' }} />
                        <span className="leading-relaxed" style={{ color: 'rgba(226,232,240,0.70)', fontSize: 'var(--text-body)' }}>{prompt}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/insights" className="mt-6 inline-flex items-center gap-2 py-3 text-[9px] sm:text-[10px] 2xl:text-xs 3xl:text-sm uppercase tracking-[0.22em] font-mono transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.54)' }} onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.78)'; }} onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.54)'; }}>
                    <span>READ INSIGHTS</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── SUPPORT OPERATIONS ── */}
      <section
        className="relative section-contained content-visibility-auto"
        style={{
          background: 'transparent',
          overflow: 'hidden',
        }}
      >
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 18% 18%, rgba(30,64,110,0.20), transparent 38%), radial-gradient(ellipse at 86% 68%, rgba(194,52,77,0.085), transparent 36%)' }} />
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.045]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)', backgroundSize: '42px 42px', maskImage: 'linear-gradient(180deg, transparent, black 18%, black 78%, transparent)', WebkitMaskImage: 'linear-gradient(180deg, transparent, black 18%, black 78%, transparent)' }} />
        <div
          className="relative mx-auto"
          style={{
            maxWidth: 'var(--container-max-lg)',
            padding: 'clamp(48px, 6vw, 100px) clamp(16px, 3vw, 48px)',
          }}
        >
          {/* Donation message */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'clamp(20px, 2.5vw, 32px)' }}>
            <div style={{ width: '24px', height: '1px', background: 'linear-gradient(90deg, #C2344D, transparent)' }} />
            <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 'clamp(9px, 1vw, 11px)', letterSpacing: '0.22em', color: '#C2344D', textTransform: 'uppercase' }}>
              Support NOVRIX
            </span>
          </div>

          <div
            style={{
              background: 'rgba(7,13,24,0.45)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: 'clamp(24px, 3vw, 40px) clamp(20px, 3vw, 40px)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
                gap: 'clamp(24px, 3vw, 36px)',
                alignItems: 'start',
              }}
            >
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 'clamp(14px, 1.2vw, 16px)', fontWeight: 400, color: 'rgba(200,216,228,0.72)', lineHeight: 1.7, margin: 0 }}>
                I&apos;m f0id, the person behind NOVRIX. I built this because I wanted crypto intelligence that actually feels built for the people using it, without ads or paywalls. Everything here is open source and runs on coffee. If you&apos;ve been using our intelligence for trading, research, or simply keeping up with the market and you&apos;ve found genuine value in what we put together, a contribution goes directly toward keeping the infrastructure running and the charts updating.
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <Link
                  href="/donations"
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    fontSize: 'clamp(10px, 0.8vw, 14px)',
                    fontWeight: 600,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: '#FAFAFA',
                    textDecoration: 'none',
                    background: 'linear-gradient(90deg, rgba(194,52,77,0.92), rgba(168,45,66,0.92))',
                    border: '1px solid rgba(194,52,77,0.85)',
                    padding: 'clamp(10px, 1vw, 18px) clamp(20px, 2vw, 48px)',
                    textAlign: 'center',
                    transition: 'color 400ms cubic-bezier(0.16, 1, 0.3, 1), border-color 400ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 400ms cubic-bezier(0.16, 1, 0.3, 1), transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 0,
                    whiteSpace: 'nowrap',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 24px rgba(194,52,77,0.12)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'linear-gradient(90deg, rgba(194,52,77,1), rgba(168,45,66,1))';
                    e.currentTarget.style.borderColor = 'rgba(194,52,77,1)';
                    e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.14), 0 0 34px rgba(194,52,77,0.24)';
                    e.currentTarget.style.transform = 'translate3d(0, -1px, 0)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'linear-gradient(90deg, rgba(194,52,77,0.92), rgba(168,45,66,0.92))';
                    e.currentTarget.style.borderColor = 'rgba(194,52,77,0.85)';
                    e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 24px rgba(194,52,77,0.12)';
                    e.currentTarget.style.transform = 'translate3d(0, 0, 0)';
                  }}
                >
                  Full Details →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FooterHome />
    </div>
  );
}
