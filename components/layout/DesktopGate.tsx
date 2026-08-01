'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const INTER = 'var(--font-inter), Inter, system-ui, sans-serif';
const MONO  = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';

function getGateTarget(pathname: string | null): string {
  if (pathname?.startsWith('/tracking')) return 'the tracking module';
  if (pathname?.startsWith('/sentiment')) return 'the sentiment module';
  if (pathname?.startsWith('/metrilytics')) return 'the metrilytics module';
  if (pathname?.startsWith('/terminal')) return 'terminal';
  return 'this page';
}

export default function DesktopGate({
  children,
  onViewportCheck,
}: {
  children: React.ReactNode;
  onViewportCheck?: (isMobile: boolean) => void;
}) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked]   = useState(false);
  const gateTarget = getGateTarget(pathname);

  useEffect(() => {
    const check = () => {
      // Gate on the physical screen size, NOT the layout viewport: browser
      // zoom shrinks window.innerWidth in CSS pixels, which used to flip
      // desktop users into the mobile gate when zooming in (Chrome).
      // window.screen.width is unaffected by page zoom.
      const screenW = window.screen?.width ?? 0;
      const nextIsMobile = screenW > 0 ? screenW < 1024 : window.innerWidth < 1024;
      setIsMobile(nextIsMobile);
      onViewportCheck?.(nextIsMobile);
    };
    queueMicrotask(() => {
      check();
      setChecked(true);
    });
    let timer: ReturnType<typeof setTimeout>;
    const debounced = () => { clearTimeout(timer); timer = setTimeout(check, 150); };
    window.addEventListener('resize', debounced);
    return () => { window.removeEventListener('resize', debounced); clearTimeout(timer); };
  }, [onViewportCheck]);

  if (!checked) return null;
  if (!isMobile) return <>{children}</>;

  return (
    <div style={{
      minHeight: '100svh',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(148,163,184,0.055) 0%, transparent 46%), #010206',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Terminal texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(148,163,184,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.018) 1px, transparent 1px), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.010) 2px, rgba(255,255,255,0.010) 4px)',
        backgroundSize: '48px 48px, 48px 48px, auto',
        maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 82%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 18%, transparent 78%, rgba(148,163,184,0.035) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Mobile viewport frame */}
      <div aria-hidden="true" style={{ position: 'absolute', top: '12px', left: '12px', width: '20px', height: '20px', borderTop: '1px solid rgba(148,163,184,0.50)', borderLeft: '1px solid rgba(148,163,184,0.50)', pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', top: '12px', right: '12px', width: '20px', height: '20px', borderTop: '1px solid rgba(148,163,184,0.50)', borderRight: '1px solid rgba(148,163,184,0.50)', pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', bottom: '12px', left: '12px', width: '20px', height: '20px', borderBottom: '1px solid rgba(148,163,184,0.50)', borderLeft: '1px solid rgba(148,163,184,0.50)', pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', bottom: '12px', right: '12px', width: '20px', height: '20px', borderBottom: '1px solid rgba(148,163,184,0.50)', borderRight: '1px solid rgba(148,163,184,0.50)', pointerEvents: 'none' }} />

      {/* ── Main panel ── */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '390px',
      }}>

        {/* Outer brackets */}
        <div aria-hidden="true" style={{ position: 'absolute', top: '-10px', left: '-10px', width: '20px', height: '20px', borderTop: '1.5px solid rgba(148,163,184,0.55)', borderLeft: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', borderTop: '1.5px solid rgba(148,163,184,0.55)', borderRight: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', bottom: '-10px', left: '-10px', width: '20px', height: '20px', borderBottom: '1.5px solid rgba(148,163,184,0.55)', borderLeft: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', bottom: '-10px', right: '-10px', width: '20px', height: '20px', borderBottom: '1.5px solid rgba(148,163,184,0.55)', borderRight: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />

        <div style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.012) 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 0,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.06)',
          position: 'relative',
        }}>
          <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.60) 28%, rgba(148,163,184,0.60) 72%, transparent 100%)' }} />
          <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', color: '#CBD5E1', textTransform: 'uppercase' }}>
            Screen Requirement
          </span>
          <span style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 500, letterSpacing: '0.10em', color: 'rgba(148,163,184,0.58)', textTransform: 'uppercase' }}>
            1024px+
          </span>
        </div>

        {/* Card body */}
        <div style={{
          background: 'linear-gradient(180deg, #0C0E16 0%, #090A10 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderTop: 'none',
          padding: '28px 22px 22px',
          textAlign: 'left',
          boxShadow: '0 32px 80px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.04)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(148,163,184,0.08) 0%, transparent 42%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr',
              gap: '16px',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0F111A',
                border: '1px solid rgba(255,255,255,0.14)',
                borderLeft: '3px solid rgba(148,163,184,0.90)',
                boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.08), 0 0 20px rgba(148,163,184,0.06)',
              }}>
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                  <rect x="6.5" y="8.5" width="21" height="14" stroke="#CBD5E1" strokeWidth="1.4" />
                  <path d="M12 26.5H22M17 22.5V26.5" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="square" />
                  <path d="M10.5 13.5H23.5M10.5 17H18.5" stroke="#64748B" strokeWidth="1.2" strokeLinecap="square" />
                </svg>
              </div>

              <div>
                <div style={{
                  fontFamily: MONO,
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  color: '#CBD5E1',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}>
                  Display Check
                </div>
                <h1 style={{
                  fontFamily: INTER,
                  fontSize: 'clamp(22px, 7vw, 30px)',
                  fontWeight: 700,
                  color: '#F8FAFC',
                  margin: 0,
                  letterSpacing: 0,
                  lineHeight: 1.05,
                }}>
                  Workstation required
                </h1>
              </div>
            </div>

            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, rgba(148,163,184,0.40), rgba(148,163,184,0.10), transparent)',
              marginBottom: '22px',
            }} />

            <p style={{
              fontFamily: INTER,
              fontSize: '14px',
              fontWeight: 500,
              color: '#AEB8C7',
              lineHeight: 1.65,
              margin: '0 0 20px',
            }}>
              This view needs a wider screen so charts, controls, and terminal panels stay readable. Open {gateTarget} on a laptop or desktop to continue.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.025)',
              marginBottom: '22px',
            }}>
              <div style={{ padding: '12px 14px', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily: MONO, fontSize: '8px', letterSpacing: '0.16em', color: 'rgba(148,163,184,0.55)', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Current
                </div>
                <div style={{ fontFamily: MONO, fontSize: '12px', color: '#CBD5E1', letterSpacing: '0.08em' }}>
                  Compact
                </div>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontFamily: MONO, fontSize: '8px', letterSpacing: '0.16em', color: 'rgba(148,163,184,0.55)', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Required
                </div>
                <div style={{ fontFamily: MONO, fontSize: '12px', color: '#CBD5E1', letterSpacing: '0.08em' }}>
                  1024px+
                </div>
              </div>
            </div>

            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                minHeight: '48px',
                padding: '0 18px',
                border: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.08)',
                textDecoration: 'none',
                color: '#F1F5F9',
                fontFamily: MONO,
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                boxSizing: 'border-box',
                width: '100%',
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.8} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return Home
            </Link>
          </div>

        </div>

        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderTop: 'none',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.50)',
        }}>
          <span style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 500, letterSpacing: '0.10em', color: 'rgba(148,163,184,0.70)', textTransform: 'uppercase' }}>
            Secure
          </span>
          <span style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 500, letterSpacing: '0.10em', color: 'rgba(148,163,184,0.55)', textTransform: 'uppercase' }}>
            Terminal modules
          </span>
        </div>

      </div>
    </div>
  );
}
