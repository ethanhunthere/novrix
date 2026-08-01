'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth, useLogout } from '@/lib/hooks/useAuth';

const MONO = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const INTER = 'var(--font-inter), Inter, system-ui, sans-serif';
const BAR_HEIGHT = '40px';

const MODULES = [
  { href: '/sentiment',   label: 'SENTIMENT',   code: 'SE-01', accent: '#C2344D' },
  { href: '/tracking',    label: 'TRACKING',    code: 'WT-02', accent: '#0EA5C8' },
  { href: '/metrilytics', label: 'METRILYTICS', code: 'ML-03', accent: '#E8960C' },
] as const;

export default function TerminalModuleBar() {
  const pathname = usePathname();
  const { user }  = useAuth();
  const logout    = useLogout();

  const [btcPrice,  setBtcPrice]  = useState<number | null>(null);
  const [btcChange, setBtcChange] = useState<number | null>(null);
  const [dropOpen,  setDropOpen]  = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Derive active module
  const active = MODULES.find(m => pathname?.startsWith(m.href));

  // BTC price — poll CoinGecko every 30s
  useEffect(() => {
    const fetch30 = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const d = await res.json() as { bitcoin?: { usd?: number; usd_24h_change?: number } };
        setBtcPrice(d.bitcoin?.usd ?? null);
        setBtcChange(d.bitcoin?.usd_24h_change ?? null);
      } catch {
        // silently ignore — stale data shown
      }
    };
    fetch30();
    // Paused while the tab is hidden — no point polling prices nobody sees.
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void fetch30();
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const priceColor =
    btcChange === null ? 'rgba(255,255,255,0.45)'
    : btcChange >= 0   ? '#00FF88'
    :                    '#EF4444';

  const operatorId      = user?.novrix_id ?? '——';
  const operatorDisplay = operatorId.length > 14 ? operatorId.slice(0, 14) + '…' : operatorId;

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: BAR_HEIGHT,
        width: '100%',
        boxSizing: 'border-box',
        background: 'rgba(5, 6, 13, 0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        fontFamily: INTER,
        flexShrink: 0,
        boxShadow: '0 1px 0 rgba(0,0,0,0.60)',
      }}
    >
      <div
        className="mx-auto max-w-[2000px]"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(128px, 1fr) minmax(330px, 520px) minmax(210px, 1fr)',
          alignItems: 'center',
          padding: '0 clamp(12px, 1.6vw, 20px)',
          height: '100%',
        }}
      >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          userSelect: 'none',
          minWidth: 0,
          justifySelf: 'start',
          height: BAR_HEIGHT,
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontFamily: MONO,
            color: priceColor,
            letterSpacing: '0.04em',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {btcPrice !== null
            ? `BTC $${Math.round(btcPrice).toLocaleString()}`
            : 'BTC —'}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: BAR_HEIGHT,
          width: '100%',
          minWidth: 0,
          justifySelf: 'center',
        }}
      >
        <div
          role="navigation"
          aria-label="Terminal modules"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            width: '100%',
            height: '28px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.015)',
          }}
        >
          {MODULES.map((mod) => {
            const isActive = pathname?.startsWith(mod.href);
            return (
              <Link
                key={mod.href}
                href={mod.href}
                onClick={(e) => {
                  if (isActive) return;
                  e.preventDefault();
                  sessionStorage.setItem('novrix-terminal-internal-nav', '1');
                  window.location.href = mod.href;
                }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '26px',
                  padding: '0 10px',
                  fontSize: '12px',
                  fontFamily: INTER,
                  fontWeight: isActive ? 700 : 600,
                  letterSpacing: 0,
                  color: isActive ? '#F8FAFC' : 'rgba(255,255,255,0.62)',
                  background: isActive ? 'rgba(255,255,255,0.035)' : 'transparent',
                  borderRight: mod.href === '/metrilytics' ? 'none' : '1px solid rgba(255,255,255,0.055)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease, background 0.15s ease',
                  cursor: isActive ? 'default' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.70)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.42)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      right: '12px',
                      bottom: '-1px',
                      height: '1px',
                      background: mod.accent,
                      boxShadow: `0 0 10px ${mod.accent}66`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {mod.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: 0,
          justifyContent: 'flex-end',
          justifySelf: 'end',
          height: BAR_HEIGHT,
        }}
      >
        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.10)', flexShrink: 0 }} />

        <div ref={dropRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: MONO,
              fontSize: '11px',
              color: 'rgba(255,255,255,0.58)',
              letterSpacing: 0,
              lineHeight: 1,
              width: 'clamp(92px, 11vw, 128px)',
              justifyContent: 'flex-end',
            }}
          >
            {operatorDisplay}
          </button>

          {dropOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: '#06060E',
                border: '1px solid rgba(255,255,255,0.10)',
                minWidth: '160px',
                zIndex: 100,
              }}
            >
              <button
                onClick={() => {
                  setDropOpen(false);
                  logout();
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  fontFamily: MONO,
                  fontSize: '11px',
                  color: '#EF4444',
                  letterSpacing: '0.10em',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                TERMINATE SESSION
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
