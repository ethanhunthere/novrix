'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth, useLogout } from '@/lib/hooks/useAuth';

const ITEMS = [
  { href: '/',         label: 'Home',     idx: '01' },
  { href: '/insights', label: 'Insights', idx: '02' },
  { href: '/terminal', label: 'Terminal', idx: '03' },
];

const TERMINAL_ROUTES = ['/terminal', '/sentiment', '/tracking', '/metrilytics'];

export default function Navbar() {
  const [hovered,    setHovered]    = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen,   setUserOpen]   = useState(false);
  const [bar, setBar] = useState<{ left: number; width: number; ready: boolean }>({ left: 0, width: 0, ready: false });

  const clusterRef = useRef<HTMLDivElement>(null);
  const itemRefs   = useRef<Array<HTMLAnchorElement | null>>([]);
  const userRef    = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const { user } = useAuth();
  const logout = useLogout();

  const norm = pathname.replace(/\/+$/, '') || '/';

  const isActive = useCallback((href: string) => {
    if (href === '/') return norm === '/';
    if (href === '/terminal') return TERMINAL_ROUTES.includes(norm);
    return norm === href || norm.startsWith(href + '/');
  }, [norm]);

  const activeIdx = ITEMS.findIndex(i => isActive(i.href));
  const shown = hovered ?? (activeIdx >= 0 ? activeIdx : null);

  const measure = useCallback(() => {
    if (shown === null) return;
    const el = itemRefs.current[shown];
    const parent = clusterRef.current;
    if (!el || !parent) return;
    const r = el.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    setBar({ left: r.left - p.left, width: r.width, ready: true });
  }, [shown]);

  useEffect(() => { measure(); }, [measure]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  useEffect(() => {
    document.fonts?.ready.then(() => measure()).catch(() => {});
  }, [measure]);

  useEffect(() => {
    const parent = clusterRef.current;
    if (!parent || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(parent);
    return () => ro.disconnect();
  }, [measure]);

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

  const current = shown !== null ? ITEMS[shown] : null;

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
        .nv-logo { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
        .nv-word {
          font-family: var(--ff-sans);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.30em;
          color: rgba(245, 241, 234, 0.80);
          transition: color 0.25s ease;
        }
        .nv-logo:hover .nv-word { color: #F5F1EA; }

        .nv-cluster { position: relative; align-items: stretch; height: 100%; }
        .nv-item {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 100%;
          padding: 0 22px;
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
        }
        .nv-idx {
          font-family: var(--ff-mono);
          font-size: 8px;
          font-weight: 500;
          letter-spacing: 0.12em;
          color: rgba(245, 241, 234, 0.24);
          transition: color 0.22s ease, opacity 0.22s ease;
        }
        .nv-label {
          font-family: var(--ff-sans);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.02em;
          line-height: 1;
          color: rgba(245, 241, 234, 0.46);
          transition: color 0.22s ease;
        }
        .nv-item:focus-visible,
        .nv-burger:focus-visible,
        .nv-mobile-row:focus-visible,
        .nv-user:focus-visible {
          outline: 1px solid rgba(194, 52, 77, 0.6);
          outline-offset: -1px;
        }
        .nv-item[data-on="1"] .nv-label { color: #F5F1EA; }
        .nv-item[data-on="1"] .nv-idx   { color: #C2344D; }
        .nv-cluster[data-hover="1"] .nv-item[data-on="0"] .nv-label { color: rgba(245, 241, 234, 0.30); }
        .nv-cluster[data-hover="1"] .nv-item[data-on="0"] .nv-idx   { color: rgba(245, 241, 234, 0.16); }

        .nv-rail {
          position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
          background: rgba(245, 241, 234, 0.09);
          pointer-events: none;
        }
        .nv-ticks {
          position: absolute; left: 0; right: 0; bottom: 2px; height: 4px;
          pointer-events: none;
          background-image:
            repeating-linear-gradient(90deg, rgba(245,241,234,0.20) 0 1px, transparent 1px 7px),
            repeating-linear-gradient(90deg, rgba(245,241,234,0.32) 0 1px, transparent 1px 35px);
          background-size: 100% 3px, 100% 4px;
          background-position: left bottom, left bottom;
          background-repeat: repeat-x;
          opacity: 0.55;
        }
        .nv-caliper {
          position: absolute; bottom: 0; height: 1px;
          background: linear-gradient(90deg, rgba(194,52,77,0.55), #C2344D 18%, #C2344D 82%, rgba(194,52,77,0.55));
          transition: left 0.34s cubic-bezier(0.22,1,0.36,1), width 0.34s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease;
          pointer-events: none;
          will-change: left, width;
        }
        .nv-jaw {
          position: absolute; bottom: 0; width: 1px; height: 6px;
          background: #C2344D;
          transition: none;
        }
        .nv-jaw-l { left: 0; }
        .nv-jaw-r { right: 0; }

        .nv-readout {
          font-family: var(--ff-mono);
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(245, 241, 234, 0.38);
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .nv-readout .rd-num { color: #C2344D; }
        .nv-readout .rd-sep { color: rgba(245, 241, 234, 0.20); }

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

        .nv-mobile-row {
          position: relative;
          display: flex;
          align-items: baseline;
          gap: 14px;
          padding: 18px 8px;
          text-decoration: none;
          border-bottom: 1px solid rgba(245,241,234,0.055);
        }
        .nv-mobile-row .m-idx {
          font-family: var(--ff-mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          color: rgba(245,241,234,0.28);
          transition: color 0.2s ease;
        }
        .nv-mobile-row .m-label {
          font-family: var(--ff-display);
          font-size: 30px;
          font-weight: 500;
          letter-spacing: -0.01em;
          line-height: 1;
          color: rgba(245,241,234,0.62);
          transition: color 0.2s ease, transform 0.25s ease;
        }
        .nv-mobile-row:active .m-label { color: #F5F1EA; }
        .nv-mobile-row[data-on="1"] .m-label { color: #F5F1EA; }
        .nv-mobile-row[data-on="1"] .m-idx { color: #C2344D; }

        @media (prefers-reduced-motion: reduce) {
          .nv-caliper, .nv-label, .nv-idx, .nv-mobile-row .m-label { transition: none !important; }
        }
      `}</style>

      <nav className="nv-root">
        <div className="nv-wide mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
          <div className="flex lg:grid lg:grid-cols-[1fr_auto_1fr] items-center justify-between h-[60px] md:h-[68px]">

            {/* Logo lockup */}
            <Link href="/" className="nv-logo" aria-label="NOVRIX home">
              <Image
                src="/logo.png" alt=""
                width={32} height={32} priority quality={100}
                className="w-7 h-7 md:w-8 md:h-8 block"
                style={{ pointerEvents: 'none' }}
              />
              <span className="nv-word hidden sm:inline">NOVRIX</span>
            </Link>

            {/* Instrument cluster */}
            <div
              ref={clusterRef}
              className="nv-cluster hidden lg:flex"
              data-hover={hovered !== null ? '1' : '0'}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="nv-ticks" />
              <div className="nv-rail" />
              <div
                className="nv-caliper"
                style={{ left: bar.left, width: bar.width, opacity: bar.ready ? 1 : 0 }}
                aria-hidden
              >
                <span className="nv-jaw nv-jaw-l" />
                <span className="nv-jaw nv-jaw-r" />
              </div>
              {ITEMS.map((item, i) => {
                const on = hovered === i || activeIdx === i;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    ref={el => { itemRefs.current[i] = el; }}
                    className="nv-item"
                    data-on={on ? '1' : '0'}
                    onMouseEnter={() => setHovered(i)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    aria-current={activeIdx === i ? 'page' : undefined}
                  >
                    <span className="nv-idx">{item.idx}</span>
                    <span className="nv-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Readout + auth */}
            <div className="hidden lg:flex items-center justify-end gap-4">
              <div className="nv-readout" aria-hidden>
                {current ? (
                  <>
                    <span className="rd-num">{current.idx}</span>
                    <span className="rd-sep">/</span>
                    <span>03</span>
                    <span className="rd-sep">·</span>
                    <span>{current.label}</span>
                  </>
                ) : (
                  <>
                    <span className="rd-num">01—03</span>
                    <span className="rd-sep">·</span>
                    <span>NOVRIX</span>
                  </>
                )}
              </div>

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

            {/* Mobile trigger */}
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

      {/* Mobile sheet */}
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
            <Image src="/logo.png" alt="" width={24} height={24} className="w-6 h-6 block" style={{ pointerEvents: 'none' }} />
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', letterSpacing: '0.24em', color: 'rgba(245,241,234,0.45)' }}>NOVRIX</span>
          </span>
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

        <div className="px-6 pt-6">
          {ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="nv-mobile-row"
              data-on={isActive(item.href) ? '1' : '0'}
              onClick={() => setMobileOpen(false)}
            >
              <span className="m-idx">{item.idx}</span>
              <span className="m-label">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-auto px-6 pb-8 pt-6" style={{ borderTop: '1px solid rgba(245,241,234,0.06)' }}>
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
