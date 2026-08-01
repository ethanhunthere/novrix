'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { prefetch as bootPrefetch } from '@/lib/bootCache';
import { useAuth } from '@/lib/hooks/useAuth';

const BOOT_MS = 2500;   // minimum overlay duration
const ENTER_MS = 2500;  // minimum entering overlay duration
const FADE_MS = 280;    // CSS fade-out before unmount
const ENTER_FAILSAFE_MS = 9000;   // hard cap for entering overlay — must never trap the user
const BOOT_FAILSAFE_MS = 12000;   // hard cap for first-boot overlay
const BOOT_SESSION_KEY = 'novrix-terminal-boot-shown';
const LEGACY_BOOT_SESSION_KEY = 'novrix-booted';
const AUTH_BOOT_PENDING_KEY = 'novrix-auth-boot-pending';

function setSessionFlag(key: string) {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // Storage can be unavailable in hardened browser modes; fall back to per-load behavior.
  }
}

function removeSessionFlag(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}

const LINES = [
  { text: 'Waking up',                                            delay: 0,    accent: false },
  { text: 'Pulling in live prices',                               delay: 90,   accent: false },
  { text: 'Preparing the charts',                                 delay: 200,  accent: false },
  { text: 'Getting the latest network data',                      delay: 290,  accent: false },
  { text: 'Reading the sentiment',                                delay: 380,  accent: false },
  { text: 'Checking macro conditions',                            delay: 470,  accent: false },
  { text: 'Loading tracker feeds',                                delay: 745,  accent: false },
  { text: 'Warming up analytics',                                 delay: 860,  accent: false },
  { text: 'Double-checking the data',                             delay: 975,  accent: false },
  { text: 'Locking in your session',                              delay: 1240, accent: false },
  { text: "You're in",                                            delay: 1650, accent: true  },
  { text: 'All set',                                              delay: 2080, accent: true  },
] as const;

type BootPhase = 'booting' | 'entering' | 'done';

interface BootSequenceProps {
  children: React.ReactNode;
  prefetchUrls?: string[]; // URLs to pre-fetch during the 2.5 s boot animation
  enterLabel?: string;     // e.g. "SENTIMENT" — shown on subsequent terminal navigations
  dataReady?: boolean;     // primary route data has finished its initial load
}

const INTERNAL_NAV_KEY = 'novrix-terminal-internal-nav';

const ENTER_MODULES: Record<string, {
  title: string;
  code: string;
  accent: string;
  accentRgb: string;
  secondary: string;
}> = {
  SENTIMENT: {
    title: 'Entering Sentiment Terminal',
    code: 'SE-01',
    accent: '#C2344D',
    accentRgb: '194,52,77',
    secondary: 'Preparing market sentiment',
  },
  TRACKING: {
    title: 'Entering Tracking Terminal',
    code: 'WT-02',
    accent: '#0EA5C8',
    accentRgb: '14,165,200',
    secondary: 'Preparing wallet flow',
  },
  METRILYTICS: {
    title: 'Entering Metrilytics Terminal',
    code: 'ML-03',
    accent: '#E8960C',
    accentRgb: '232,150,12',
    secondary: 'Preparing DeFi macro',
  },
};

const getEnterModule = (label?: string) => {
  const key = label?.trim().toUpperCase() || '';
  return ENTER_MODULES[key] ?? {
    title: 'Entering Intelligence Terminal',
    code: 'NVX',
    accent: '#E8960C',
    accentRgb: '232,150,12',
    secondary: 'Preparing workspace',
  };
};

const TERMINAL_MODULES = ['/sentiment', '/tracking', '/metrilytics'];

function isInternalTerminalNav(): boolean {
  // Primary: explicit flag set by Navbar before module-to-module navigation.
  try {
    if (sessionStorage.getItem(INTERNAL_NAV_KEY) === '1') {
      sessionStorage.removeItem(INTERNAL_NAV_KEY);
      return true;
    }
  } catch {
    // Storage unavailable — continue to fallback.
  }

  // Fallback: referrer is a different terminal module or sub-page (covers
  // edge cases where sessionStorage was cleared or the flag never got set).
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    try {
      const ref = document.referrer;
      if (ref) {
        const refPath = new URL(ref).pathname;
        const currentPath = window.location.pathname;
        const refIsTerminal = TERMINAL_MODULES.some(m => refPath === m || refPath.startsWith(m + '/'));
        const currentIsTerminal = TERMINAL_MODULES.some(m => currentPath === m || currentPath.startsWith(m + '/'));
        if (refIsTerminal && currentIsTerminal && refPath !== currentPath) {
          return true;
        }
      }
    } catch {
      // Ignore parsing errors.
    }
  }

  return false;
}

export default function BootSequence({ children, prefetchUrls, enterLabel, dataReady = true }: BootSequenceProps) {
  // Start undetermined so SSR always renders a safe blank overlay.
  // useLayoutEffect resolves the real phase immediately after hydration.
  const [phase, setPhase] = useState<BootPhase | null>(null);

  useLayoutEffect(() => {
    queueMicrotask(() => setPhase(isInternalTerminalNav() ? 'entering' : 'booting'));
  }, []);
  const [fadeOut, setFadeOut] = useState(false);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unauthenticated users must fall through so AuthGuard can route them to the
  // terminal login card without trapping them behind a data-ready gate.
  useEffect(() => {
    if (authLoading) return;

    const hasValidSession = Boolean(user);
    if (!hasValidSession) {
      removeSessionFlag(AUTH_BOOT_PENDING_KEY);
      queueMicrotask(() => {
        setFadeOut(false);
        setPhase('done');
      });
      return;
    }

    // Eagerly start the recharts chunk download in parallel with the boot
    // animation. The sentiment / metrilytics / terminal pages all gate their
    // chart render on this chunk; firing the import here gives the browser a
    // 2.5 s head-start so charts can paint immediately when the boot ends.
    // Errors are swallowed — if the prefetch fails the page-level lazy import
    // still works as a fallback.
    if (typeof window !== 'undefined') {
      import(/* webpackPrefetch: true */ 'recharts').catch(() => {});
    }

    // Always warm the current module, even when the session boot was already
    // shown on another terminal module.
    prefetchUrls?.forEach(bootPrefetch);

    setSessionFlag(BOOT_SESSION_KEY);
    setSessionFlag(LEGACY_BOOT_SESSION_KEY);
  }, [authLoading, pathname, prefetchUrls, user]);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setFadeOut(true);
    fadeTimerRef.current = setTimeout(() => {
      setPhase('done');
      removeSessionFlag(AUTH_BOOT_PENDING_KEY);
      setSessionFlag(BOOT_SESSION_KEY);
      setSessionFlag(LEGACY_BOOT_SESSION_KEY);
    }, FADE_MS);
  }, []);

  useEffect(() => {
    if (phase !== 'booting' && phase !== 'entering') return;

    queueMicrotask(() => setMinimumElapsed(false));
    timerRef.current = setTimeout(() => setMinimumElapsed(true), phase === 'entering' ? ENTER_MS : BOOT_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, pathname]);

  useEffect(() => {
    if (phase !== 'booting' && phase !== 'entering') return;
    if (authLoading) return;
    if (!user) return;
    if (!minimumElapsed || !dataReady) return;

    // Equivalent gate to Promise.all([minimumDelay, dataReady]).
    queueMicrotask(() => dismiss());

    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [authLoading, dataReady, dismiss, minimumElapsed, phase, user]);

  // Failsafe dismiss — a slow or hung primary-data fetch must never trap the
  // user behind the overlay. After the hard cap, reveal the page and let
  // individual panels settle into their own loading/empty states.
  useEffect(() => {
    if (phase !== 'booting' && phase !== 'entering') return;
    if (authLoading) return;
    if (!user) return;
    const failsafe = setTimeout(() => dismiss(), phase === 'entering' ? ENTER_FAILSAFE_MS : BOOT_FAILSAFE_MS);
    return () => clearTimeout(failsafe);
  }, [authLoading, dismiss, phase, user]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === 'done') {
      queueMicrotask(() => {
        setFadeOut(false);
        setMinimumElapsed(true);
      });
      return () => {
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      };
    }
  }, [phase]);

  const isDone = phase === 'done';
  const enterModule = getEnterModule(enterLabel);

  return (
    <>
      {/* Content stays mounted so data effects run, but remains visually hidden until boot is complete. */}
      <div
        aria-hidden={!isDone}
        style={{
          opacity: isDone ? 1 : 0,
          visibility: isDone ? 'visible' : 'hidden',
          pointerEvents: isDone ? 'auto' : 'none',
        }}
      >
        {children}
      </div>

      {/* Undetermined phase — blank black frame to prevent SSR/hydration flash */}
      {phase === null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#010102' }} />
      )}

      {/* Entering overlay — terminal module transition gate */}
      {phase === 'entering' && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: '#010102',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: fadeOut ? 0 : 1,
            transition: `opacity ${FADE_MS}ms ease-out`,
          }}
        >
          <style>{`
            @keyframes nvxEnterSweep {
              0%   { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
            @keyframes nvxEnterFade {
              0%   { opacity: 0; transform: translateY(5px); filter: blur(2px); }
              18%  { opacity: 1; transform: translateY(0); filter: blur(0); }
              100% { opacity: 1; transform: translateY(0); filter: blur(0); }
            }
            @keyframes nvxEnterLoad {
              0%   { transform: translateX(-100%); opacity: 0.50; }
              50%  { opacity: 0.90; }
              100% { transform: translateX(260%); opacity: 0.50; }
            }
          `}</style>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: `linear-gradient(90deg, transparent, rgba(${enterModule.accentRgb},0.36), transparent)`,
            animation: `nvxEnterSweep ${ENTER_MS}ms ease-out forwards`,
          }} />
          <div style={{
            width: 'min(390px, calc(100vw - 48px))',
            border: '1px solid rgba(203,213,225,0.18)',
            borderTop: `1px solid rgba(${enterModule.accentRgb},0.50)`,
            background: 'linear-gradient(180deg, rgba(10,14,21,0.96), rgba(4,7,12,0.98))',
            boxShadow: `0 20px 58px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.04)`,
            padding: '18px 20px 19px',
            animation: 'nvxEnterFade 420ms ease-out forwards',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 'clamp(15px, 1.8vw, 20px)',
              lineHeight: 1.22,
              letterSpacing: '0.04em',
              color: '#F4F7FB',
              textTransform: 'uppercase',
              fontWeight: 760,
            }}>
              {enterModule.title}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 12,
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '8.5px',
                letterSpacing: '0.12em',
                color: 'rgba(226,232,240,0.58)',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                {enterModule.secondary}
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '8.5px',
                letterSpacing: '0.16em',
                color: `rgba(${enterModule.accentRgb},0.76)`,
                textTransform: 'uppercase',
                fontWeight: 650,
              }}>
                Loading
              </span>
            </div>
            <div style={{
              position: 'relative',
              height: 2,
              marginTop: 14,
              overflow: 'hidden',
              background: 'rgba(148,163,184,0.13)',
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                width: '34%',
                background: `linear-gradient(90deg, transparent, rgba(${enterModule.accentRgb},0.72), rgba(226,232,240,0.62), rgba(${enterModule.accentRgb},0.72), transparent)`,
                animation: 'nvxEnterLoad 1.2s cubic-bezier(.22,.61,.36,1) infinite',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Boot overlay — full-screen immersive boot experience */}
      {phase === 'booting' && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: '#010102',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: fadeOut ? 0 : 1,
            transition: `opacity ${FADE_MS}ms ease-out`,
          }}
        >
          <style>{`
            @keyframes nvxLine {
              from { opacity: 0; transform: translateX(-4px); }
              to   { opacity: 1; transform: translateX(0); }
            }
            @keyframes nvxProgress {
              from { width: 0%; }
              to   { width: 100%; }
            }
            @keyframes nvxCursor {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0; }
            }
            @keyframes nvxAmbient {
              0%, 100% { opacity: 0.3; transform: scale(1); }
              50% { opacity: 0.5; transform: scale(1.05); }
            }
            @keyframes nvxPulse {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.8; }
            }
          `}</style>

          {/* Deep ambient glow */}
          <div aria-hidden="true" style={{
            position: 'absolute',
            width: '1200px', height: '800px',
            background: 'radial-gradient(ellipse at 50% 45%, rgba(30,35,50,0.15) 0%, transparent 55%)',
            pointerEvents: 'none',
            zIndex: 0,
            animation: 'nvxAmbient 8s ease-in-out infinite',
          }} />

          {/* Secondary subtle glow */}
          <div aria-hidden="true" style={{
            position: 'absolute',
            width: '600px', height: '400px',
            background: 'radial-gradient(ellipse at 50% 50%, rgba(40,45,60,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />

          {/* ── Main content container ─────────────────────────────────────────── */}
          <div style={{ position: 'relative', width: '640px', maxWidth: 'calc(100vw - 48px)', zIndex: 1 }}>

            {/* Corner brackets — visible institutional frame */}
            <div aria-hidden="true" style={{ position: 'absolute', top: '-10px', left: '-10px', width: '20px', height: '20px', borderTop: '1.5px solid rgba(148,163,184,0.55)', borderLeft: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />
            <div aria-hidden="true" style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', borderTop: '1.5px solid rgba(148,163,184,0.55)', borderRight: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />
            <div aria-hidden="true" style={{ position: 'absolute', bottom: '-10px', left: '-10px', width: '20px', height: '20px', borderBottom: '1.5px solid rgba(148,163,184,0.55)', borderLeft: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />
            <div aria-hidden="true" style={{ position: 'absolute', bottom: '-10px', right: '-10px', width: '20px', height: '20px', borderBottom: '1.5px solid rgba(148,163,184,0.55)', borderRight: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />

            {/* ── Card ─────────────────────────────────────────────────────────── */}
            <div style={{
              background: 'linear-gradient(180deg, #0C0E16 0%, #090A10 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 0,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.50), 0 32px 80px rgba(0,0,0,0.80), inset 0 1px 0 rgba(255,255,255,0.06)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Top accent bar — visible slate */}
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.60) 30%, rgba(148,163,184,0.60) 70%, transparent 100%)', zIndex: 3 }} />

              {/* ── Body — boot lines ──────────────────────────────────────────── */}
              <div style={{
                padding: '32px 44px 36px 56px',
                position: 'relative', zIndex: 4,
                minHeight: '340px',
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  letterSpacing: '0.28em',
                  color: 'rgba(148,163,184,0.40)',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  marginBottom: 20,
                }}>
                  System Initialization
                </div>
                {LINES.map((line, i) => {
                  const prevAccent = i > 0 ? LINES[i - 1].accent : false;
                  const groupBreak = prevAccent !== (line.accent ?? false);
                  const ts = `00:00.${String(line.delay).padStart(3, '0')}`;

                  return (
                    <div key={i}>
                      {/* Phase divider */}
                      {groupBreak && i > 0 && (
                        <div aria-hidden="true" style={{
                          height: 1,
                          background: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.08) 30%, rgba(148,163,184,0.08) 70%, transparent 100%)',
                          margin: '16px 0 12px',
                        }} />
                      )}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 20,
                          fontSize: 13.5,
                          lineHeight: '2.0',
                          whiteSpace: 'pre',
                          opacity: 0,
                          animationName: 'nvxLine',
                          animationDuration: '120ms',
                          animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                          animationFillMode: 'forwards',
                          animationDelay: `${line.delay}ms`,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: line.accent ? '#34D399' : 'rgba(148,163,184,0.75)',
                          fontWeight: line.accent ? 500 : 400,
                          letterSpacing: '0.01em',
                        }}
                      >
                        <span style={{
                          display: 'inline-block',
                          width: '64px',
                          flexShrink: 0,
                          color: line.accent ? 'rgba(52,211,153,0.35)' : 'rgba(148,163,184,0.25)',
                          fontSize: 10.5,
                          fontWeight: 400,
                          letterSpacing: '0.06em',
                          userSelect: 'none',
                        }}>
                          {ts}
                        </span>
                        <span>{line.text}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Blinking cursor */}
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 20,
                  marginTop: 8,
                  animationName: 'nvxLine',
                  animationDuration: '120ms',
                  animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  animationFillMode: 'forwards',
                  animationDelay: `${LINES[LINES.length - 1].delay + 120}ms`,
                  opacity: 0,
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '64px', flexShrink: 0,
                    userSelect: 'none',
                  }} />
                  <span style={{
                    color: 'rgba(148,163,184,0.50)',
                    fontSize: 13.5,
                    fontFamily: "'JetBrains Mono', monospace",
                    animationName: 'nvxCursor',
                    animationDuration: '1s',
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    display: 'inline-block',
                  }}>
                    █
                  </span>
                </div>
              </div>

              {/* ── Footer — refined progress indicator ────────────────────────── */}
              <div style={{
                padding: '0 40px 28px',
                position: 'relative', zIndex: 4,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 10,
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '9px',
                    color: 'rgba(148,163,184,0.35)',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    userSelect: 'none',
                  }}>
                    Initializing
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '9px',
                    color: 'rgba(148,163,184,0.35)',
                    letterSpacing: '0.12em',
                    fontWeight: 500,
                    userSelect: 'none',
                  }}>
                    {BOOT_MS}ms
                  </span>
                </div>

                <div style={{
                  height: '2px',
                  background: 'rgba(255,255,255,0.03)',
                  overflow: 'hidden',
                  borderRadius: 0,
                  position: 'relative',
                }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, rgba(148,163,184,0.20), rgba(148,163,184,0.70))',
                    boxShadow: '0 0 12px rgba(148,163,184,0.15)',
                    animationName: 'nvxProgress',
                    animationDuration: `${BOOT_MS}ms`,
                    animationTimingFunction: 'linear',
                    animationFillMode: 'forwards',
                    width: '0%',
                  }} />
                </div>
              </div>
            </div>{/* /card */}

            {/* Bottom accent line */}
            <div aria-hidden="true" style={{
              position: 'absolute', bottom: '-1px', left: '20%', right: '20%', height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(148,163,184,0.15), transparent)',
              zIndex: 3, pointerEvents: 'none',
            }} />
          </div>

        </div>
      )}
    </>
  );
}
