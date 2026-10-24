'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth, useLogout } from '@/lib/hooks/useAuth';

const ITEMS = [
  { href: '/',         label: 'Home' },
  { href: '/insights', label: 'Insights' },
  { href: '/terminal', label: 'Terminal' },
];

const TERMINAL_ROUTES = ['/terminal', '/sentiment', '/tracking', '/metrilytics'];

const ZOOM = 1.34;
const LENS_R = 44;

export default function Navbar() {
  const [hovered,    setHovered]    = useState<number | null>(null);
  const [lens,       setLens]       = useState({ x: 0, active: false });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen,   setUserOpen]   = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const { user } = useAuth();
  const logout = useLogout();

  const norm = pathname.replace(/\/+$/, '') || '/';

  const isActive = (href: string) => {
    if (href === '/') return norm === '/';
    if (href === '/terminal') return TERMINAL_ROUTES.includes(norm);
    return norm === href || norm.startsWith(href + '/');
  };

  const activeIdx = ITEMS.findIndex(i => isActive(i.href));

  const onMove = (e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    setLens({ x: e.clientX - r.left, active: true });
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  const itemState = (i: number) => hovered === i || (hovered === null && activeIdx === i);

  const linkContent = (label: string, i: number) => (
    <>
      <span className="nv-link-label">{label}</span>
      {activeIdx === i && <span className="nv-mark" aria-hidden="true" />}
    </>
  );

  return (
    <>
      <style>{`
        .nv-root {
          position: relative;
          z-index: 50;
          background: rgba(10, 9, 8, 0.72);
          -webkit-backdrop-filter: blur(14px) saturate(1.1);
          backdrop-filter: blur(14px) saturate(1.1);
          border-bottom: 1px solid rgba(245, 241, 234, 0.07);
        }
        .nv-wide { max-width: 1800px; }
        .nv-logo { display: inline-flex; align-items: center; text-decoration: none; flex-shrink: 0; }
        .nv-logo img { transition: transform 0.5s cubic-bezier(0.22,1,0.36,1); }
        .nv-logo:hover img { transform: rotate(-8deg) scale(1.06); }

        .nv-track {
          position: relative;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .nv-layer-base { position: relative; z-index: 2; display: flex; align-items: center; height: 100%; }
        .nv-layer-lens {
          position: absolute; inset: 0; z-index: 4;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
          will-change: transform, clip-path;
          transition: opacity 0.18s ease;
        }
        .nv-disc {
          position: absolute;
          top: 50%;
          width: 88px; height: 88px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle at 50% 34%, #17130f 0%, #0c0a09 74%);
          box-shadow: inset 0 1px 0 rgba(245, 241, 234, 0.06), inset 0 -8px 18px rgba(0, 0, 0, 0.45);
          pointer-events: none;
          z-index: 3;
          transition: opacity 0.18s ease;
        }
        .nv-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0 32px;
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
        }
        .nv-link-label {
          font-family: var(--ff-display);
          font-size: 17px;
          font-weight: 500;
          letter-spacing: 0.002em;
          line-height: 1;
          color: rgba(245, 241, 234, 0.44);
          transition: color 0.18s ease;
        }
        .nv-link[data-on="1"] .nv-link-label { color: #F5F1EA; }
        .nv-mark {
          position: absolute;
          left: 50%;
          bottom: 16px;
          width: 4px; height: 4px;
          background: #C2344D;
          transform: translateX(-50%) rotate(45deg);
        }
        .nv-link:focus-visible { outline: 1px solid rgba(194, 52, 77, 0.6); outline-offset: -2px; }

        .nv-lens {
          position: absolute;
          top: 50%;
          width: 92px; height: 92px;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 5;
          transition: opacity 0.18s ease;
          filter: drop-shadow(0 6px 22px rgba(0, 0, 0, 0.45));
        }

        .nv-scope { opacity: 0.9; }
        .nv-sweep { animation: nvSweep 4.2s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
        @keyframes nvSweep {
          0%   { transform: translateX(0);     opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(72px);  opacity: 0; }
        }

        .nv-user {
          display: inline-flex; align-items: center; gap: 8px;
          border: 1px solid rgba(245,241,234,0.14);
          background: rgba(245,241,234,0.03);
          padding: 6px 10px;
          cursor: pointer;
          font-family: var(--ff-mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          color: rgba(245,241,234,0.72);
          transition: border-color 0.18s ease, color 0.18s ease;
        }
        .nv-user:hover { border-color: rgba(245,241,234,0.28); color: #F5F1EA; }
        .nv-user:focus-visible { outline: 1px solid rgba(194,52,77,0.6); outline-offset: 2px; }

        .nv-burger {
          width: 44px; height: 44px;
          flex-direction: column; align-items: center; justify-content: center;
          gap: 5px;
          border: 1px solid rgba(245,241,234,0.10);
          background: rgba(245,241,234,0.02);
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .nv-burger span {
          display: block; width: 17px; height: 1px;
          background: #D8D2C9;
          transition: transform 0.24s ease, opacity 0.2s ease, background 0.2s ease;
        }
        .nv-burger:hover { border-color: rgba(194,52,77,0.45); }
        .nv-burger[data-open="1"] { border-color: rgba(194,52,77,0.45); background: rgba(194,52,77,0.06); }
        .nv-burger[data-open="1"] span { background: #C2344D; }
        .nv-burger[data-open="1"] span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
        .nv-burger[data-open="1"] span:nth-child(2) { opacity: 0; }
        .nv-burger[data-open="1"] span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
        .nv-burger:focus-visible { outline: 1px solid rgba(194,52,77,0.6); outline-offset: 2px; }

        .nv-mobile-row {
          position: relative;
          display: flex;
          align-items: baseline;
          gap: 14px;
          padding: 20px 4px;
          text-decoration: none;
          border-bottom: 1px solid rgba(245,241,234,0.055);
        }
        .nv-mobile-row .m-label {
          font-family: var(--ff-display);
          font-size: 32px;
          font-weight: 500;
          letter-spacing: -0.01em;
          line-height: 1;
          color: rgba(245,241,234,0.62);
          transition: color 0.2s ease;
        }
        .nv-mobile-row[data-on="1"] .m-label { color: #F5F1EA; }
        .nv-mobile-row[data-on="1"]::before {
          content: "";
          position: absolute;
          left: -14px; top: 50%;
          width: 5px; height: 5px;
          background: #C2344D;
          transform: translateY(-50%) rotate(45deg);
        }
        .nv-mobile-row:focus-visible { outline: 1px solid rgba(194,52,77,0.6); outline-offset: 2px; }

        @media (prefers-reduced-motion: reduce) {
          .nv-layer-lens { display: none; }
          .nv-sweep { animation: none; opacity: 0.4; }
          .nv-logo img, .nv-link-label, .nv-mobile-row .m-label { transition: none; }
        }
      `}</style>

      <nav className="nv-root">
        <div className="nv-wide mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
          <div className="flex lg:grid lg:grid-cols-[1fr_auto_1fr] items-center justify-between h-[60px] md:h-[68px]">

            <Link href="/" className="nv-logo" aria-label="Home">
              <Image
                src="/logo.png" alt=""
                width={32} height={32} priority quality={100}
                className="w-7 h-7 md:w-8 md:h-8 block"
                style={{ pointerEvents: 'none' }}
              />
            </Link>

            <div
              ref={trackRef}
              className="nv-track hidden lg:flex"
              onMouseMove={onMove}
              onMouseLeave={() => { setHovered(null); setLens(l => ({ ...l, active: false })); }}
            >
              <div className="nv-layer-base">
                {ITEMS.map((item, i) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="nv-link"
                    data-on={itemState(i) ? '1' : '0'}
                    onMouseEnter={() => setHovered(i)}
                    aria-current={activeIdx === i ? 'page' : undefined}
                  >
                    {linkContent(item.label, i)}
                  </Link>
                ))}
              </div>

              <span
                className="nv-disc"
                style={{ left: lens.x, opacity: lens.active ? 1 : 0 }}
                aria-hidden="true"
              />

              <div
                className="nv-layer-lens"
                aria-hidden="true"
                style={{
                  transform: `scale(${ZOOM})`,
                  transformOrigin: `${lens.x}px 50%`,
                  clipPath: `circle(${LENS_R / ZOOM}px at ${lens.x}px 50%)`,
                  opacity: lens.active ? 1 : 0,
                }}
              >
                {ITEMS.map((item, i) => (
                  <span key={item.href} className="nv-link" data-on={itemState(i) ? '1' : '0'}>
                    {linkContent(item.label, i)}
                  </span>
                ))}
              </div>

              <span className="nv-lens" style={{ left: lens.x, opacity: lens.active ? 1 : 0 }} aria-hidden="true">
                <svg width="92" height="92" viewBox="0 0 92 92" fill="none">
                  <defs>
                    <radialGradient id="nvGlass" cx="50%" cy="36%" r="62%">
                      <stop offset="0%" stopColor="rgba(245,241,234,0.07)" />
                      <stop offset="100%" stopColor="rgba(245,241,234,0)" />
                    </radialGradient>
                  </defs>
                  <circle cx="46" cy="46" r="37" fill="url(#nvGlass)" />
                  <circle cx="46" cy="46" r="45" stroke="rgba(245,241,234,0.10)" strokeWidth="1" />
                  <circle cx="46" cy="46" r="38.5" stroke="rgba(194,52,77,0.55)" strokeWidth="3"
                    strokeDasharray="0.6 6.6" strokeLinecap="round" />
                  <line x1="46" y1="1" x2="46" y2="8" stroke="#C2344D" strokeWidth="1" />
                </svg>
              </span>
            </div>

            <div className="hidden lg:flex items-center justify-end gap-5">
              <svg className="nv-scope" width="72" height="18" viewBox="0 0 72 18" fill="none" aria-hidden="true">
                <path
                  d="M0 9H6L9 4L12 14L15 7L18 11L21 9H30L33 6L36 12L39 9H48L51 3L54 15L57 8L60 10L63 9H72"
                  stroke="rgba(245,241,234,0.22)" strokeWidth="1" strokeLinejoin="round"
                />
                <g className="nv-sweep">
                  <line x1="0" y1="1.5" x2="0" y2="16.5" stroke="#C2344D" strokeWidth="1" />
                </g>
              </svg>

              {user && (
                <div className="relative" ref={userRef}>
                  <button className="nv-user" onClick={() => setUserOpen(o => !o)}>
                    <span>{user.novrix_id}</span>
                    <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                      style={{ opacity: 0.6, transform: userOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}>
                      <path d="M1 2.5L4 5.5L7 2.5" />
                    </svg>
                  </button>
                  <div
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '168px',
                      background: '#11100E',
                      border: '1px solid rgba(245,241,234,0.12)',
                      borderRadius: '5px',
                      boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
                      overflow: 'hidden',
                      opacity: userOpen ? 1 : 0,
                      pointerEvents: userOpen ? 'auto' : 'none',
                      transform: userOpen ? 'translateY(0)' : 'translateY(-4px)',
                      transition: 'opacity 0.14s ease, transform 0.16s ease',
                    }}
                  >
                    <button onClick={() => { setUserOpen(false); logout(); }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 12px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--ff-sans)', fontSize: '12px', fontWeight: 500,
                        color: '#D8D2C9', transition: 'color 0.12s ease, background 0.12s ease',
                      }}
                      onMouseEnter={e => { const el = e.currentTarget; el.style.color = '#D95168'; el.style.background = 'rgba(194,52,77,0.06)'; }}
                      onMouseLeave={e => { const el = e.currentTarget; el.style.color = '#D8D2C9'; el.style.background = 'transparent'; }}
                    >Disconnect</button>
                  </div>
                </div>
              )}
            </div>

            <button
              className="nv-burger flex lg:hidden"
              data-open={mobileOpen ? '1' : '0'}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(o => !o)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      <div
        className="fixed inset-0 z-[100] lg:hidden flex flex-col"
        style={{
          background: 'rgba(10,9,8,0.98)',
          WebkitBackdropFilter: 'blur(20px)',
          backdropFilter: 'blur(20px)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(8px)',
          transition: 'opacity 0.22s ease, transform 0.22s ease',
        }}
      >
        <div className="flex items-center justify-between shrink-0 px-5 h-[60px]" style={{ borderBottom: '1px solid rgba(245,241,234,0.06)' }}>
          <Image src="/logo.png" alt="" width={26} height={26} className="w-[26px] h-[26px] block" style={{ pointerEvents: 'none' }} />
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            style={{
              width: '36px', height: '36px', border: '1px solid rgba(245,241,234,0.10)',
              background: 'rgba(245,241,234,0.02)', color: '#D8D2C9',
              fontFamily: 'var(--ff-mono)', fontSize: '17px', lineHeight: 1, cursor: 'pointer',
            }}
          >×</button>
        </div>

        <div className="px-8 pt-6">
          {ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="nv-mobile-row"
              data-on={isActive(item.href) ? '1' : '0'}
              onClick={() => setMobileOpen(false)}
            >
              <span className="m-label">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-auto px-8 pb-8 pt-6" style={{ borderTop: '1px solid rgba(245,241,234,0.06)' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', letterSpacing: '0.12em', color: 'rgba(245,241,234,0.50)' }}>
                {user.novrix_id}
              </span>
              <button
                onClick={() => { setMobileOpen(false); logout(); }}
                style={{
                  fontFamily: 'var(--ff-sans)', fontSize: '12px', fontWeight: 500,
                  padding: '10px 16px', color: '#D8D2C9', cursor: 'pointer',
                  border: '1px solid rgba(194,52,77,0.22)', background: 'transparent',
                }}
              >Disconnect</button>
            </div>
          ) : (
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', letterSpacing: '0.20em', color: 'rgba(245,241,234,0.28)', textTransform: 'uppercase' }}>
              On-chain intelligence
            </span>
          )}
        </div>
      </div>
    </>
  );
}
