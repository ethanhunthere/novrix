'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useLogout } from '@/lib/hooks/useAuth';
import { useCLI } from '@/lib/state/CLIContext';

const MONO  = 'var(--ff-mono)';
const INTER = 'var(--ff-sans)';

const NAV: React.CSSProperties = {
  fontFamily: INTER,
  fontSize: '13px',
  fontWeight: 500,
  letterSpacing: '0.01em',
  textTransform: 'none',
  lineHeight: 1,
};

const MODULES = [
  {
    href : '/sentiment',
    label: 'Sentiment',
    desc : 'Market psychology',
    Icon : () => (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 7.5Q3 4 5 7.5Q7 11 9 7.5Q11 4 13.5 7.5" />
        <circle cx="13.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href : '/metrilytics',
    label: 'Metrilytics',
    desc : 'On-chain metrics',
    Icon : () => (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
        <rect x="0.5" y="8.5" width="3.5" height="6" rx="0.5" opacity="0.45" />
        <rect x="5.5" y="5.5" width="3.5" height="9" rx="0.5" opacity="0.72" />
        <rect x="10.5" y="2" width="3.5" height="12.5" rx="0.5" />
      </svg>
    ),
  },
  {
    href : '/tracking',
    label: 'Tracking',
    desc : 'Whale monitoring',
    Icon : () => (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="7.5" cy="7.5" r="3" />
        <line x1="7.5" y1="1"   x2="7.5" y2="4"   />
        <line x1="7.5" y1="11"  x2="7.5" y2="14"  />
        <line x1="1"   y1="7.5" x2="4"   y2="7.5" />
        <line x1="11"  y1="7.5" x2="14"  y2="7.5" />
        <circle cx="7.5" cy="7.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];


export default function Navbar() {
  type TermMode = 'hover' | 'click' | null;
  const [termMode,   setTermMode]   = useState<TermMode>(null);
  const [userOpen,   setUserOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  const termRef  = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const logout   = useLogout();
  const { toggle: toggleCLI } = useCLI();

  /* Close dropdowns on outside click */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (termRef.current && !termRef.current.contains(e.target as Node)) {
        setTermMode(null);
        if (hoverLeaveTimer.current) {
          clearTimeout(hoverLeaveTimer.current);
          hoverLeaveTimer.current = null;
        }
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  /* Scroll state for navbar elevation shift */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const norm           = pathname.replace(/\/+$/, '') || '/';
  const isActive       = (p: string) => norm === p;
  const terminalActive = MODULES.map(m => m.href).concat(['/terminal']).includes(norm);

  return (
    <>
      <style>{`
        @keyframes terminalPanelIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.985); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes terminalModuleIn {
          from { opacity: 0; transform: translate3d(0, -7px, 0) scale(0.985); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        .terminal-menu:focus-within .terminal-dropdown {
          opacity: 1 !important;
          pointer-events: auto !important;
          transform: translateX(-50%) translateY(0) scale(1) !important;
        }

        .terminal-menu:focus-within .terminal-dropdown-module {
          opacity: 1 !important;
          transform: translate3d(0, 0, 0) scale(1) !important;
        }
      `}</style>
      {/* ════════════════════════ NAVBAR ════════════════════════ */}
      <nav
        className="relative z-[50]"
        style={{
          background: 'rgba(10, 9, 8, 0.86)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(245, 241, 234, 0.07)',
        }}
      >


        <div className="max-w-[1800px] 3xl:max-w-[2200px] 4xl:max-w-[2800px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 3xl:px-32 4xl:px-48">
          <div className="grid grid-cols-3 items-center h-[60px] sm:h-[64px] md:h-[68px] 2xl:h-[72px] 3xl:h-[76px]">

            {/* ══════════════════════════════════════════
                LOGO + SYSTEM STATUS
            ══════════════════════════════════════════ */}
            <div className="flex items-center">
              <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', padding: '0 6px', flexShrink: 0 }}>
                <Image
                  src="/logo.png" alt="NOVRIX"
                  width={32} height={32} priority quality={100}
                  className="w-7 h-7 md:w-8 md:h-8 block"
                  style={{ pointerEvents: 'none' }}
                />
              </Link>
            </div>

            {/* ══════════════════════════════════════════
                CENTER NAVIGATION
            ══════════════════════════════════════════ */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="flex items-center" style={{ height: '68px' }}>

                <NavLink href="/" active={isActive('/')}>Home</NavLink>
                <NavSep />
                <NavLink href="/insights" active={isActive('/insights')}>Insights</NavLink>
                <NavSep />

                {/* Terminal dropdown trigger */}
                <div
                  className="terminal-menu relative flex h-full items-stretch"
                  ref={termRef}
                  onMouseEnter={() => {
                    if (hoverLeaveTimer.current) {
                      clearTimeout(hoverLeaveTimer.current);
                      hoverLeaveTimer.current = null;
                    }
                    if (termMode === null) {
                      setTermMode('hover');
                    }
                  }}
                  onMouseLeave={() => {
                    if (termMode === 'hover') {
                      hoverLeaveTimer.current = setTimeout(() => {
                        setTermMode(null);
                        hoverLeaveTimer.current = null;
                      }, 200);
                    }
                  }}
                >
                  <button
                    onClick={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.preventDefault()}
                    className="relative flex flex-col items-center justify-center group"
                    style={{ padding: '0 26px', height: '100%', background: 'none', border: 'none', cursor: 'pointer', gap: 0 }}
                  >
                    <span
                      style={{
                        ...NAV,
                        display: 'flex', alignItems: 'center', gap: '5px',
                        color: terminalActive ? '#F5F1EA' : 'rgba(245, 241, 234, 0.48)',
                        fontWeight: terminalActive ? 600 : 500,
                        textShadow: 'none',
                        transition: 'color 0.15s ease',
                        pointerEvents: 'none',
                      }}
                      className="group-hover:!text-[rgba(245, 241, 234, 0.78)]"
                    >
                      Terminal
                      <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        style={{ opacity: 0.45, flexShrink: 0, transition: 'transform 0.15s ease', transform: termMode !== null ? 'rotate(180deg)' : 'none', pointerEvents: 'none' }}>
                        <path d="M1 2.5L4 5.5L7 2.5" />
                      </svg>
                    </span>
                    <PrecisionTick active={terminalActive} />
                  </button>

                  {/* Invisible hover bridge — fills gap between button and dropdown */}
                  <div className="absolute left-0 right-0" style={{ top: '100%', height: '10px', zIndex: 1000 }} />

                  {/* ── Dropdown panel ─────────────────── */}
                  <div
                    className="terminal-dropdown absolute z-[1001]"
                    style={{
                      top: 'calc(100% + 9px)',
                      left: '50%',
                      transform: termMode !== null ? 'translateX(-50%) translateY(0) scale(1)' : 'translateX(-50%) translateY(-8px) scale(0.975)',
                      width: 'clamp(244px, 24vw, 282px)',
                      maxWidth: 'calc(100vw - 24px)',
                      maxHeight: 'min(72vh, 356px)',
                      opacity: termMode !== null ? 1 : 0,
                      pointerEvents: termMode !== null ? 'auto' : 'none',
                      transition: 'opacity 0.2s ease, transform 0.24s cubic-bezier(0.22,1,0.36,1)',
                      background: '#11100E',
                      border: '1px solid rgba(245,241,234,0.10)',
                      borderRadius: '6px',
                      boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
                      overflow: 'hidden',
                      animation: termMode !== null ? 'terminalPanelIn 0.24s cubic-bezier(0.22,1,0.36,1) both' : 'none',
                    }}
                  >
                    {/* Panel header */}
                    <div
                      className="px-4 py-3"
                      style={{ position: 'relative', borderBottom: '1px solid rgba(245,241,234,0.075)' }}
                    >
                      <span style={{ fontFamily: INTER, fontSize: '11px', fontWeight: 650, letterSpacing: '0.09em', color: '#EAE5DD', textTransform: 'uppercase' }}>
                        Terminal Modules
                      </span>
                    </div>

                    {/* Module rows */}
                    <div style={{ position: 'relative', padding: '6px' }}>
                      {MODULES.map((m, i) => {
                        const active = isActive(m.href);
                        const dest   = m.href;
                        const isIntelModule = ['/sentiment', '/tracking', '/metrilytics'].includes(dest);
                        return (
                          <DropdownModule
                            key={m.href}
                            href={dest}
                            label={m.label}
                            desc={m.desc}
                            Icon={m.Icon}
                            active={active}
                            open={termMode !== null}
                            index={i}
                            onClick={() => {
                              setTermMode(null);
                              router.push(dest);
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Panel footer */}
                    <div
                      className="px-4 py-2.5"
                      style={{ position: 'relative', borderTop: '1px solid rgba(245,241,234,0.075)' }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 500, letterSpacing: '0.12em', color: 'rgba(245, 241, 234, 0.46)', textTransform: 'uppercase' }}>
                        Active Terminal Modules
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ══════════════════════════════════════════
                RIGHT SIDE — CLI + AUTH
            ══════════════════════════════════════════ */}
            <div className="hidden lg:flex items-center justify-end gap-[10px]">

              {/* CLI button */}
              <CLIButton onClick={toggleCLI} />

              {/* Vertical rule */}
              <div style={{ width: '1px', height: '20px', background: 'rgba(245,241,234,0.08)', flexShrink: 0 }} />

              {/* Auth */}
              {user ? (
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setUserOpen(o => !o)}
                    className="flex items-center gap-[9px]"
                    style={{
                      padding: '7px 11px',
                      border: '1px solid rgba(245,241,234,0.18)',
                      background: 'rgba(245,241,234,0.04)',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      transition: 'border-color 0.15s ease, background 0.15s ease',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(245,241,234,0.30)'; el.style.background = 'rgba(245,241,234,0.08)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(245,241,234,0.18)'; el.style.background = 'rgba(245,241,234,0.04)'; }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.1em', color: '#E0E0E8' }}>{user.novrix_id}</span>
                    <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="#6F6962" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transition: 'transform 0.15s ease', transform: userOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                      <path d="M1 2.5L4 5.5L7 2.5" />
                    </svg>
                  </button>

                  {/* User dropdown */}
                  <div
                    className="absolute right-0 z-[1001]"
                    style={{
                      top: 'calc(100% + 6px)', width: '172px',
                      background: '#0E0E12',
                      border: '1px solid rgba(245,241,234,0.13)',
                      borderRadius: '6px',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 24px 64px rgba(0,0,0,0.95)',
                      opacity: userOpen ? 1 : 0,
                      pointerEvents: userOpen ? 'auto' : 'none',
                      clipPath: userOpen ? 'inset(0 0 0% 0 round 6px)' : 'inset(0 0 100% 0 round 6px)',
                      transition: 'opacity 0.12s ease, clip-path 0.15s cubic-bezier(0,0,0.2,1)',
                    }}
                  >
                    <div style={{ padding: '4px 0' }}>
                      <Link href="/terminal" prefetch={false} onClick={() => setUserOpen(false)}
                        style={{ fontFamily: INTER, fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', padding: '8px 14px', margin: '1px 6px', color: '#D8D2C9', textDecoration: 'none', borderRadius: '4px', transition: 'color 0.12s ease, background 0.12s ease' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F5F1EA'; (e.currentTarget as HTMLElement).style.background = '#191613'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#D8D2C9'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >Terminal</Link>
                      <button onClick={() => { setUserOpen(false); logout(); }}
                        style={{ fontFamily: INTER, fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', width: 'calc(100% - 12px)', padding: '8px 14px', margin: '1px 6px', color: '#D8D2C9', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '4px', transition: 'color 0.12s ease, background 0.12s ease' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#D95168'; (e.currentTarget as HTMLElement).style.background = 'rgba(194,52,77,0.06)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#D8D2C9'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >Disconnect</button>
                    </div>
                  </div>
                </div>
              ) : (
                <AccessButton />
              )}
            </div>

            {/* ── Mobile hamburger ─────────────────────────── */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden col-start-3 justify-self-end flex flex-col items-center justify-center gap-[6px]"
              style={{
                width: '44px', height: '44px',
                border: mobileOpen ? '1px solid rgba(194,52,77,0.40)' : '1px solid rgba(245,241,234,0.09)',
                background: mobileOpen ? 'rgba(194,52,77,0.07)' : 'rgba(245,241,234,0.02)',
                transition: 'border-color 0.22s ease, background 0.22s ease',
              }}
            >
              {[0, 1, 2].map(i => (
                <span key={i} className="block h-px origin-center"
                  style={{
                    width: '18px',
                    background: mobileOpen ? '#C2344D' : '#D8D2C9',
                    opacity: mobileOpen && i === 1 ? 0 : 1,
                    transform: mobileOpen && i === 0 ? 'rotate(45deg) translate(0,6px)' : mobileOpen && i === 2 ? 'rotate(-45deg) translate(0,-6px)' : 'none',
                    transition: 'transform 0.22s ease, opacity 0.22s ease, background 0.22s ease',
                  }}
                />
              ))}
            </button>

          </div>
        </div>
      </nav>

      {/* ════════════════════════ MOBILE MENU ════════════════════════ */}
      <div className="fixed inset-0 z-[100] lg:hidden flex flex-col overflow-y-auto"
        style={{
          background: 'rgba(10,9,8,0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(6px)',
          transition: 'opacity 0.20s ease, transform 0.20s ease',
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px shrink-0"
          style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(194,52,77,0.55) 40%, rgba(194,52,77,0.35) 60%, transparent 95%)' }}
        />

        {/* Header: logo + close */}
        <div className="flex items-center justify-between shrink-0"
          style={{ padding: '0 20px', height: '56px', borderBottom: '1px solid rgba(245,241,234,0.04)' }}>
          <span style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.22em', color: 'rgba(245, 241, 234, 0.50)' }}>NOVRIX</span>
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              width: '36px', height: '36px', border: '1px solid rgba(245,241,234,0.08)',
              background: 'rgba(245,241,234,0.02)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: '#D8D2C9',
              fontFamily: MONO, fontSize: '16px', lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* Main nav links */}
        <div className="shrink-0" style={{ padding: '8px 0' }}>
          {[
            { href: '/',        label: 'Home',     active: isActive('/') },
            { href: '/insights',label: 'Insights', active: isActive('/insights') },
          ].map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                minHeight: '52px', padding: '0 24px',
                textDecoration: 'none',
                borderLeft: `2px solid ${item.active ? '#C2344D' : 'transparent'}`,
                background: item.active ? 'rgba(194,52,77,0.04)' : 'transparent',
              }}
            >
              <span style={{
                fontFamily: INTER, fontSize: '15px', fontWeight: 500,
                letterSpacing: '0.01em',
                color: item.active ? '#F5F1EA' : '#D8D2C9',
              }}>{item.label}</span>
              {item.active && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#C2344D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 6h8M6 2l4 4-4 4" />
                </svg>
              )}
            </Link>
          ))}
        </div>

        {/* Divider: MODULES */}
        <div className="shrink-0" style={{ padding: '4px 24px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: MONO, fontSize: '8px', letterSpacing: '0.28em', color: 'rgba(245, 241, 234, 0.46)', textTransform: 'uppercase', flexShrink: 0 }}>TERMINAL MODULES</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(245,241,234,0.05)' }} />
          </div>
        </div>

        {/* Module rows */}
        <div className="shrink-0" style={{ padding: '4px 0 12px' }}>
          {MODULES.map(m => {
            const href = m.href;
            const active = isActive(m.href);
            const isIntelModule = ['/sentiment', '/tracking', '/metrilytics'].includes(href);
            const handleClick = () => {
              setMobileOpen(false);
              router.push(href);
            };
            const itemStyle = {
              display: 'flex', alignItems: 'center', gap: '14px',
              minHeight: '60px', padding: '0 24px',
              textDecoration: 'none',
              borderLeft: `2px solid ${active ? 'rgba(245,241,234,0.18)' : 'transparent'}`,
              background: active ? 'rgba(245,241,234,0.025)' : 'transparent',
              cursor: 'pointer',
              width: '100%',
              border: 'none',
              borderBottom: 'none',
              borderRight: 'none',
              borderTop: 'none',
            };
            return isIntelModule ? (
              <button key={m.href} onClick={handleClick} style={itemStyle}>
                {/* Icon box */}
                <div style={{
                  width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${active ? 'rgba(245, 241, 234, 0.16)' : 'rgba(245, 241, 234, 0.10)'}`,
                  background: active ? '#191613' : 'transparent',
                  color: active ? '#D8D2C9' : '#6F6962',
                  flexShrink: 0,
                }}>
                  <m.Icon />
                </div>
                {/* Label + desc */}
                <div>
                  <div style={{ fontFamily: INTER, fontSize: '14px', fontWeight: 500, letterSpacing: '0.01em', color: active ? '#EAE5DD' : 'rgba(245, 241, 234, 0.40)', marginBottom: '2px' }}>
                    {m.label}
                  </div>
                  <div style={{ fontFamily: INTER, fontSize: '11px', fontWeight: 400, letterSpacing: '0.02em', color: '#A9A29A' }}>
                    {m.desc}
                  </div>
                </div>
              </button>
            ) : (
              <Link key={m.href} href={href} prefetch={false} onClick={() => setMobileOpen(false)}
                style={itemStyle}
              >
                {/* Icon box */}
                <div style={{
                  width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${active ? 'rgba(245, 241, 234, 0.16)' : 'rgba(245, 241, 234, 0.10)'}`,
                  background: active ? '#191613' : 'transparent',
                  color: active ? '#D8D2C9' : '#6F6962',
                  flexShrink: 0,
                }}>
                  <m.Icon />
                </div>
                {/* Label + desc */}
                <div>
                  <div style={{ fontFamily: INTER, fontSize: '14px', fontWeight: 500, letterSpacing: '0.01em', color: active ? '#EAE5DD' : 'rgba(245, 241, 234, 0.40)', marginBottom: '2px' }}>
                    {m.label}
                  </div>
                  <div style={{ fontFamily: INTER, fontSize: '11px', fontWeight: 400, letterSpacing: '0.02em', color: '#A9A29A' }}>
                    {m.desc}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Auth section */}
        <div className="shrink-0" style={{ padding: '16px 24px', borderTop: '1px solid rgba(245,241,234,0.04)', marginTop: 'auto' }}>
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.16em', color: 'rgba(245, 241, 234, 0.50)' }}>{user.novrix_id}</span>
              </div>
              <button onClick={() => { setMobileOpen(false); logout(); }}
                style={{
                  fontFamily: INTER, fontSize: '12px', fontWeight: 500, letterSpacing: '0.06em',
                  minHeight: '44px', padding: '0 20px', color: '#D8D2C9',
                  border: '1px solid rgba(194,52,77,0.20)', background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                Disconnect
              </button>
            </div>
          ) : (
            <Link href="/sentiment" prefetch={false} onClick={() => setMobileOpen(false)}
              style={{
                fontFamily: INTER, fontSize: '12px', fontWeight: 500, letterSpacing: '0.06em',
                minHeight: '44px', padding: '0 20px', color: '#C0A8B0',
                border: '1px solid rgba(194,52,77,0.40)', background: 'rgba(194,52,77,0.06)',
                textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
              Launch Terminal
            </Link>
          )}
        </div>

        {/* Footer version */}
        <div className="pb-6 shrink-0 flex justify-center">
          <span style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.18em', color: '#8090A0', textTransform: 'uppercase' }}>
            NOVRIX v3.2.1
          </span>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════ */

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={href}
      className="relative flex flex-col items-center justify-center"
      style={{ padding: '0 26px', height: '100%', textDecoration: 'none', gap: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{
        ...NAV,
        color: active ? '#F5F1EA' : hovered ? 'rgba(245, 241, 234, 0.78)' : 'rgba(245, 241, 234, 0.48)',
        fontWeight: active ? 600 : 500,
        textShadow: 'none',
        transition: 'color 0.15s ease, text-shadow 0.15s ease',
        pointerEvents: 'none',
      }}>{children}</span>
      <div style={{
        position: 'absolute', bottom: 0, left: '26px', right: '26px', height: '1px',
        background: active ? '#C2344D' : hovered ? 'rgba(194,52,77,0.20)' : 'transparent',
        transition: 'background 0.15s ease',
      }} />
    </Link>
  );
}

function NavSep() {
  return <div className="self-center shrink-0" style={{ width: '1px', height: '16px', background: 'rgba(245,241,234,0.07)' }} />;
}

function PrecisionTick({ active }: { active: boolean }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: '23px', right: '29px', height: '1px',
      pointerEvents: 'none',
      background: '#C2344D',
      transformOrigin: 'left center',
      transform: active ? 'scaleX(1)' : 'scaleX(0)',
      transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
    }} />
  );
}

function CLIButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Open CLI  (` or Ctrl+K)"
      style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.12em', padding: '7px 11px', color: 'rgba(245, 241, 234, 0.62)', border: '1px solid rgba(245, 241, 234, 0.14)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', transition: 'color 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease', lineHeight: 1, borderRadius: 0 }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(194,52,77,0.48)'; el.style.background = 'rgba(194,52,77,0.05)'; el.style.boxShadow = 'none'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(245,241,234,0.14)'; el.style.background = 'transparent'; el.style.boxShadow = 'none'; }}
    >
      <span style={{ color: '#C2344D', opacity: 0.85, pointerEvents: 'none' }}>&gt;_</span>
      <span className="nav-cli-cursor" style={{ color: 'rgba(245, 241, 234, 0.55)', display: 'inline-block', width: '7px', textAlign: 'center', pointerEvents: 'none' }}>▌</span>
    </button>
  );
}

function AccessButton() {
  return (
    <Link href="/sentiment" prefetch={false}
      style={{ ...NAV, fontSize: '11px', fontWeight: 500, letterSpacing: '0.12em', padding: '8px 15px', color: '#0A0908', border: '1px solid #F5F1EA', background: '#F5F1EA', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '7px', transition: 'background 0.18s ease, border-color 0.18s ease', borderRadius: '2px' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#FFFCF6'; el.style.borderColor = '#FFFCF6'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#F5F1EA'; el.style.borderColor = '#F5F1EA'; }}
    >
      Launch terminal
    </Link>
  );
}

function DropdownModule({ href, label, desc, Icon, active, open, index, onClick }: {
  href: string; label: string; desc: string;
  Icon: () => React.ReactElement; active: boolean; open: boolean; index: number; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const on = active || hovered;

  const content = (
    <>
      {/* Icon box */}
      <div style={{
        width: '34px', height: '34px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
        border: `1px solid ${active ? 'rgba(245,241,234,0.20)' : hovered ? 'rgba(245,241,234,0.18)' : 'rgba(245,241,234,0.08)'}`,
        background: active ? 'rgba(245,241,234,0.095)' : hovered ? 'rgba(245,241,234,0.075)' : 'rgba(245,241,234,0.025)',
        color: on ? '#F5F1EA' : '#A9A29A',
        borderRadius: '7px',
        transform: 'none',
        boxShadow: 'none',
        transition: 'border-color 0.22s ease, background 0.22s ease, color 0.22s ease',
        pointerEvents: 'none',
      }}>
        <Icon />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
        <span style={{
          fontFamily: INTER,
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.01em',
          lineHeight: 1.4,
          color: on ? '#F5F1EA' : '#C9C2B9',
          transition: 'color 0.22s ease'
        }}>
          {label}
        </span>
        <div style={{
          fontFamily: INTER,
          fontSize: '11px',
          fontWeight: 400,
          letterSpacing: '0.02em',
          color: on ? '#A9A29A' : 'rgba(245, 241, 234, 0.46)',
          marginTop: '2px',
          lineHeight: 1.3,
          transition: 'color 0.22s ease'
        }}>
          {desc}
        </div>
      </div>

      {/* Arrow indicator */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: 'relative',
          zIndex: 2,
          flexShrink: 0,
          color: on ? '#EAE5DD' : 'transparent',
          transform: hovered ? 'translateX(2px)' : 'translateX(0)',
          transition: 'color 0.22s ease, transform 0.22s ease',
          opacity: on ? 1 : 0,
          pointerEvents: 'none',
        }}
      >
        <path d="M5 2L10 7L5 12" />
      </svg>
    </>
  );

  const style = {
    position: 'relative' as const,
    display: 'flex', alignItems: 'center', gap: '11px',
    padding: '10px 12px',
    marginBottom: '2px',
    textDecoration: 'none',
    borderRadius: '8px',
    overflow: 'hidden',
    background: hovered
      ? 'rgba(245,241,234,0.065)'
      : active
        ? 'rgba(245,241,234,0.04)'
        : 'transparent',
    border: `1px solid ${active ? 'rgba(245,241,234,0.18)' : hovered ? 'rgba(245,241,234,0.16)' : 'rgba(245,241,234,0.06)'}`,
    transform: open ? 'translate3d(0, 0, 0)' : 'translate3d(0, -6px, 0)',
    boxShadow: 'none',
    opacity: open ? 1 : 0,
    transition: `opacity 0.22s ease ${index * 30}ms, transform 0.22s ease ${index * 30}ms, background 0.22s ease, border-color 0.22s ease`,
    cursor: 'pointer',
    width: '100%',
  };

  return (
    <Link href={href} prefetch={false} onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="terminal-dropdown-module"
      style={style}
    >
      {content}
    </Link>
  );
}
