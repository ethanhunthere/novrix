'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth, useLogout } from '@/lib/hooks/useAuth';
import { useCLI } from '@/lib/state/CLIContext';
import { openAuthGate } from '@/lib/utils/auth';

const MONO  = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const INTER = 'var(--font-inter), Inter, system-ui, sans-serif';

const NAV: React.CSSProperties = {
  fontFamily: INTER,
  fontSize: '13px',
  fontWeight: 500,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
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
          from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.975); filter: blur(2px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes terminalModuleIn {
          from { opacity: 0; transform: translate3d(0, -7px, 0) scale(0.985); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes terminalGlassFlow {
          0%, 100% { transform: translate3d(-8%, -2%, 0); opacity: 0.45; }
          50% { transform: translate3d(8%, 2%, 0); opacity: 0.72; }
        }
        @keyframes terminalEdgeSweep {
          from { transform: translate3d(-120%, 0, 0); }
          to { transform: translate3d(220%, 0, 0); }
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
          background: 'rgba(7, 9, 15, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
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
                  style={{
                    filter: 'drop-shadow(0 0 4px rgba(194,52,77,0.42)) drop-shadow(0 1px 0 rgba(0,0,0,0.95))',
                    pointerEvents: 'none',
                  }}
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
                        color: terminalActive ? '#E5E7EB' : '#6B7280',
                        fontWeight: terminalActive ? 600 : 500,
                        textShadow: terminalActive ? '0 0 12px rgba(194,52,77,0.40)' : 'none',
                        transition: 'color 0.15s ease',
                        pointerEvents: 'none',
                      }}
                      className="group-hover:!text-[#A0AAB4]"
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
                      background: 'linear-gradient(180deg, rgba(8,10,16,0.97), rgba(3,5,10,0.95))',
                      backdropFilter: 'blur(26px) saturate(1.35)',
                      WebkitBackdropFilter: 'blur(26px) saturate(1.35)',
                      border: '1px solid rgba(255,255,255,0.11)',
                      borderRadius: '10px',
                      boxShadow: '0 28px 80px rgba(0,0,0,0.68), 0 0 0 1px rgba(0,0,0,0.78), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.025)',
                      overflow: 'hidden',
                      animation: termMode !== null ? 'terminalPanelIn 0.24s cubic-bezier(0.22,1,0.36,1) both' : 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: '-35% -18%',
                        pointerEvents: 'none',
                        background: 'radial-gradient(circle at 18% 20%, rgba(0,200,238,0.13), transparent 28%), radial-gradient(circle at 82% 68%, rgba(194,52,77,0.12), transparent 32%)',
                        filter: 'blur(16px)',
                        opacity: termMode !== null ? 1 : 0,
                        animation: termMode !== null ? 'terminalGlassFlow 5.5s ease-in-out infinite' : 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.24), transparent)',
                        pointerEvents: 'none',
                      }}
                    />
                    {/* Panel header */}
                    <div
                      className="px-4 py-3"
                      style={{ position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.075)' }}
                    >
                      <span style={{ fontFamily: INTER, fontSize: '11px', fontWeight: 650, letterSpacing: '0.09em', color: '#E2E8F0', textTransform: 'uppercase' }}>
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
                              if (isIntelModule) {
                                if (user) {
                                  // Already authenticated — mark as internal terminal hop so
                                  // BootSequence shows the entering card instead of full boot.
                                  sessionStorage.setItem('novrix-terminal-internal-nav', '1');
                                  window.location.href = dest;
                                } else {
                                  sessionStorage.setItem('novrix-pending-nav', dest);
                                  openAuthGate();
                                }
                              }
                            }}
                            useAuthGate={isIntelModule}
                          />
                        );
                      })}
                    </div>

                    {/* Panel footer */}
                    <div
                      className="px-4 py-2.5"
                      style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.075)' }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 500, letterSpacing: '0.12em', color: '#64748B', textTransform: 'uppercase' }}>
                        Authentication Required
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
              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

              {/* Auth */}
              {user ? (
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setUserOpen(o => !o)}
                    className="flex items-center gap-[9px]"
                    style={{
                      padding: '7px 11px',
                      border: '1px solid rgba(255,255,255,0.22)',
                      background: 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      transition: 'border-color 0.15s ease, background 0.15s ease',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.35)'; el.style.background = 'rgba(255,255,255,0.08)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.22)'; el.style.background = 'rgba(255,255,255,0.04)'; }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.1em', color: '#E0E0E8' }}>{user.novrix_id}</span>
                    <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="#52525B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
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
                      border: '1px solid rgba(255,255,255,0.14)',
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
                        style={{ fontFamily: INTER, fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', padding: '8px 14px', margin: '1px 6px', color: '#D0D0D8', textDecoration: 'none', borderRadius: '4px', transition: 'color 0.12s ease, background 0.12s ease' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FFFFFF'; (e.currentTarget as HTMLElement).style.background = '#18181B'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#D0D0D8'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >Terminal</Link>
                      <button onClick={() => { setUserOpen(false); logout(); }}
                        style={{ fontFamily: INTER, fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', width: 'calc(100% - 12px)', padding: '8px 14px', margin: '1px 6px', color: '#D0D0D8', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '4px', transition: 'color 0.12s ease, background 0.12s ease' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FCA5A5'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#D0D0D8'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
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
                border: mobileOpen ? '1px solid rgba(194,52,77,0.40)' : '1px solid rgba(255,255,255,0.09)',
                background: mobileOpen ? 'rgba(194,52,77,0.07)' : 'rgba(255,255,255,0.02)',
                transition: 'border-color 0.22s ease, background 0.22s ease',
              }}
            >
              {[0, 1, 2].map(i => (
                <span key={i} className="block h-px origin-center"
                  style={{
                    width: '18px',
                    background: mobileOpen ? '#C2344D' : '#C0C8D4',
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
          background: 'rgba(2,3,5,0.98)',
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
          style={{ padding: '0 20px', height: '56px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.30em', color: '#8899AA' }}>NOVRIX</span>
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: '#C0C8D4',
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
                fontFamily: INTER, fontSize: '15px', fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: item.active ? '#FFFFFF' : '#C0C8D4',
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
            <span style={{ fontFamily: MONO, fontSize: '8px', letterSpacing: '0.28em', color: '#4A6070', textTransform: 'uppercase', flexShrink: 0 }}>TERMINAL MODULES</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
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
              if (isIntelModule) {
                if (user) {
                  // Internal terminal module hop — show entering card, not full boot.
                  sessionStorage.setItem('novrix-terminal-internal-nav', '1');
                  window.location.href = href;
                } else {
                  sessionStorage.setItem('novrix-pending-nav', href);
                  openAuthGate();
                }
              }
            };
            const itemStyle = {
              display: 'flex', alignItems: 'center', gap: '14px',
              minHeight: '60px', padding: '0 24px',
              textDecoration: 'none',
              borderLeft: `2px solid ${active ? 'rgba(255,255,255,0.22)' : 'transparent'}`,
              background: active ? 'rgba(255,255,255,0.025)' : 'transparent',
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
                  border: `1px solid ${active ? '#3F3F46' : '#27272A'}`,
                  background: active ? '#1A1A1C' : 'transparent',
                  color: active ? '#D4D4D8' : '#52525B',
                  flexShrink: 0,
                }}>
                  <m.Icon />
                </div>
                {/* Label + desc */}
                <div>
                  <div style={{ fontFamily: INTER, fontSize: '13px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: active ? '#E2E8F0' : '#4A6278', marginBottom: '2px' }}>
                    {m.label}
                  </div>
                  <div style={{ fontFamily: INTER, fontSize: '11px', fontWeight: 400, letterSpacing: '0.02em', color: '#94A3B8' }}>
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
                  border: `1px solid ${active ? '#3F3F46' : '#27272A'}`,
                  background: active ? '#1A1A1C' : 'transparent',
                  color: active ? '#D4D4D8' : '#52525B',
                  flexShrink: 0,
                }}>
                  <m.Icon />
                </div>
                {/* Label + desc */}
                <div>
                  <div style={{ fontFamily: INTER, fontSize: '13px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: active ? '#E2E8F0' : '#4A6278', marginBottom: '2px' }}>
                    {m.label}
                  </div>
                  <div style={{ fontFamily: INTER, fontSize: '11px', fontWeight: 400, letterSpacing: '0.02em', color: '#94A3B8' }}>
                    {m.desc}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Auth section */}
        <div className="shrink-0" style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 'auto' }}>
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.16em', color: '#8899AA' }}>{user.novrix_id}</span>
              </div>
              <button onClick={() => { setMobileOpen(false); logout(); }}
                style={{
                  fontFamily: INTER, fontSize: '12px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase',
                  minHeight: '44px', padding: '0 20px', color: '#C0C8D4',
                  border: '1px solid rgba(194,52,77,0.20)', background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                Disconnect
              </button>
            </div>
          ) : (
            <Link href="/terminal" prefetch={false} onClick={() => setMobileOpen(false)}
              style={{
                fontFamily: INTER, fontSize: '12px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase',
                minHeight: '44px', padding: '0 20px', color: '#C0A8B0',
                border: '1px solid rgba(194,52,77,0.40)', background: 'rgba(194,52,77,0.06)',
                textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
              Access Terminal
            </Link>
          )}
        </div>

        {/* Footer version */}
        <div className="pb-6 shrink-0 flex justify-center">
          <span style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.38em', color: '#8090A0', textTransform: 'uppercase' }}>
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
        color: active ? '#E5E7EB' : hovered ? '#A0AAB4' : '#6B7280',
        fontWeight: active ? 600 : 500,
        textShadow: active ? '0 0 12px rgba(194,52,77,0.40)' : 'none',
        transition: 'color 0.15s ease, text-shadow 0.15s ease',
        pointerEvents: 'none',
      }}>{children}</span>
      <div style={{
        position: 'absolute', bottom: 0, left: '26px', right: '26px', height: '2px',
        background: active ? '#C2344D' : hovered ? 'rgba(194,52,77,0.20)' : 'transparent',
        transition: 'background 0.15s ease',
      }} />
    </Link>
  );
}

function NavSep() {
  return <div className="self-center shrink-0" style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.07)' }} />;
}

function PrecisionTick({ active }: { active: boolean }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: '23px', right: '29px', height: '2px',
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
      style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.12em', padding: '7px 11px', color: '#00C8EE', border: '1px solid rgba(0,200,238,0.22)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', transition: 'color 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease', lineHeight: 1, borderRadius: 0 }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,200,238,0.55)'; el.style.background = 'rgba(0,200,238,0.06)'; el.style.boxShadow = '0 0 12px rgba(0,200,238,0.18)'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,200,238,0.22)'; el.style.background = 'transparent'; el.style.boxShadow = 'none'; }}
    >
      <span style={{ color: '#00C8EE', opacity: 0.7, pointerEvents: 'none' }}>&gt;_</span>
      <span className="nav-cli-cursor" style={{ color: '#00C8EE', display: 'inline-block', width: '7px', textAlign: 'center', pointerEvents: 'none' }}>▌</span>
    </button>
  );
}

function AccessButton() {
  return (
    <Link href="/terminal" prefetch={false}
      style={{ ...NAV, fontSize: '11px', fontWeight: 600, letterSpacing: '0.20em', padding: '7px 16px', color: '#C2344D', border: '1px solid rgba(194,52,77,0.45)', background: 'transparent', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '7px', transition: 'color 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease', borderRadius: 0 }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#D9485F'; el.style.borderColor = 'rgba(194,52,77,0.80)'; el.style.background = 'rgba(194,52,77,0.08)'; el.style.boxShadow = '0 0 14px rgba(194,52,77,0.15)'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#C2344D'; el.style.borderColor = 'rgba(194,52,77,0.45)'; el.style.background = 'transparent'; el.style.boxShadow = 'none'; }}
    >
      <span style={{ fontSize: '8px', color: '#C2344D', flexShrink: 0, lineHeight: 1, pointerEvents: 'none' }}>&#9679;</span>
      ACCESS TERMINAL
    </Link>
  );
}

function DropdownModule({ href, label, desc, Icon, active, open, index, onClick, useAuthGate }: {
  href: string; label: string; desc: string;
  Icon: () => React.ReactElement; active: boolean; open: boolean; index: number; onClick: () => void; useAuthGate?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const on = active || hovered;
  
  const content = (
    <>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.12) 42%, transparent 68%)',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translate3d(65%,0,0)' : 'translate3d(-105%,0,0)',
          transition: 'opacity 0.18s ease, transform 0.55s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
      {/* Icon box */}
      <div style={{
        width: '34px', height: '34px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
        border: `1px solid ${active ? 'rgba(255,255,255,0.24)' : hovered ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.08)'}`,
        background: active ? 'rgba(255,255,255,0.095)' : hovered ? 'rgba(255,255,255,0.075)' : 'rgba(255,255,255,0.025)',
        color: on ? '#F8FAFC' : '#94A3B8',
        borderRadius: '7px',
        transform: hovered ? 'rotate(-2deg) scale(1.035)' : 'rotate(0deg) scale(1)',
        boxShadow: hovered ? '0 0 18px rgba(148,163,184,0.12)' : 'none',
        transition: 'border-color 0.22s ease, background 0.22s ease, color 0.22s ease, transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s ease',
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
          color: on ? '#F8FAFC' : '#CBD5E1', 
          transition: 'color 0.22s ease' 
        }}>
          {label}
        </span>
        <div style={{ 
          fontFamily: INTER, 
          fontSize: '11px', 
          fontWeight: 400,
          letterSpacing: '0.02em', 
          color: on ? '#94A3B8' : '#64748B', 
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
          color: on ? '#E2E8F0' : 'transparent',
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
      ? 'linear-gradient(135deg, rgba(255,255,255,0.105), rgba(255,255,255,0.045))'
      : active
        ? 'linear-gradient(135deg, rgba(255,255,255,0.072), rgba(255,255,255,0.032))'
        : 'rgba(255,255,255,0.018)',
    border: `1px solid ${active ? 'rgba(255,255,255,0.18)' : hovered ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.055)'}`,
    transform: open
      ? (hovered ? 'translate3d(2px, -1px, 0) scale(1.01)' : 'translate3d(0, 0, 0) scale(1)')
      : 'translate3d(0, -6px, 0) scale(0.985)',
    boxShadow: hovered
      ? '0 14px 28px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.085)'
      : active
        ? '0 8px 18px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)'
        : 'inset 0 1px 0 rgba(255,255,255,0.025)',
    opacity: open ? 1 : 0,
    transition: `opacity 0.22s ease ${index * 30}ms, transform 0.22s ease ${index * 30}ms, background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease`,
    cursor: 'pointer',
    width: '100%',
  };

  if (useAuthGate) {
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="terminal-dropdown-module"
        style={{ ...style, border: 'none', textAlign: 'left' }}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={href} prefetch={false} onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="terminal-dropdown-module"
      style={style}
    >
      {content}
    </Link>
  );
}
