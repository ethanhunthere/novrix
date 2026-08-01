'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import TerminalModulePageShell from '@/components/terminal/TerminalModulePageShell';
import FooterTerminal from '@/components/terminal/FooterTerminal';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface AddressInfo {
  address: string;
  label: string;
  entity: string;
  blockchain: string;
  tags: string;
  logo: string;
}

interface AddressStats {
  total_sent: number;
  total_received: number;
  net_flow: number;
  tx_count: number;
  first_seen: string;
  last_seen: string;
  balance_usd: number;
}

interface ApiResponse {
  success: boolean;
  address: AddressInfo;
  stats: AddressStats;
}

const MONO = "'JetBrains Mono', monospace";
const ACCENT = '#0EA5C8';

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

/** Full-precision institutional USD format, e.g. $142,847,291.00 */
function formatFullUSD(val: number): string {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortenAddr(a: string): string {
  return a.length > 20 ? `${a.slice(0, 10)}…${a.slice(-8)}` : a;
}

/* ═══════════════════════════════════════════════════════════
   LIVE CLOCK (header)
   ═══════════════════════════════════════════════════════════ */

function AddrLiveClock() {
  const [t, setT] = useState(() => new Date().toISOString().replace('T', ' ').slice(0, 19));
  useEffect(() => {
    const id = setInterval(() => setT(new Date().toISOString().replace('T', ' ').slice(0, 19)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <div className="text-[15px] tabular-nums font-bold leading-none" style={{ fontFamily: MONO, color: '#FFFFFF', letterSpacing: '0.04em' }}>
        {t.slice(11)}
      </div>
      <div className="text-[11px] tabular-nums mt-0.5" style={{ fontFamily: MONO, color: '#5A6A7A' }}>
        {t.slice(0, 10)}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED VALUE — quick count-up, then holds the exact figure
   ═══════════════════════════════════════════════════════════ */

function AnimatedValue({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 600;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <>{formatFullUSD(display)}</>;
}

/* ═══════════════════════════════════════════════════════════
   INNER COMPONENT (uses useSearchParams)
   ═══════════════════════════════════════════════════════════ */

function AddressDetailInner() {
  const searchParams = useSearchParams();
  const addr = searchParams.get('addr') || '';

  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAddress = useCallback(async () => {
    if (!addr) { setError('No address provided'); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const resp = await fetch(`/api/address/?address=${encodeURIComponent(addr)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json() as ApiResponse;
      if (json.success) setData(json);
      else setError('Address not found');
    } catch {
      setError('Failed to load address data');
    } finally {
      setIsLoading(false);
    }
  }, [addr]);

  useEffect(() => { queueMicrotask(() => { void fetchAddress(); }); }, [fetchAddress]);

  const addrInfo = data?.address;
  const stats = data?.stats;

  // Primary figure: current on-chain balance. Fall back to lifetime volume
  // when the address has no tracked holdings snapshot.
  const balance = stats?.balance_usd ?? 0;
  const lifetimeVolume = (stats?.total_sent ?? 0) + (stats?.total_received ?? 0);
  const totalValue = balance > 0 ? balance : lifetimeVolume;
  const valueLabel = balance > 0 ? 'ESTIMATED WALLET VALUE' : 'LIFETIME TRANSACTION VOLUME';

  const arkhmUrl = `https://intel.arkm.com/explorer/address/${encodeURIComponent(addr)}`;

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: '#050A0E', color: '#F4F7FB', fontFamily: MONO }}
    >
      {/* Ambient grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(160,190,230,0.055) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
      }} />
      {/* Cold top-right ambient */}
      <div className="fixed pointer-events-none" style={{
        top: '-12vh', right: '-10vw', width: '55vw', height: '55vh',
        background: 'radial-gradient(ellipse at center, rgba(56,165,230,0.085) 0%, transparent 70%)',
        zIndex: 0,
      }} />
      {/* Accent lower-left ambient */}
      <div className="fixed pointer-events-none" style={{
        bottom: '-12vh', left: '-8vw', width: '50vw', height: '50vh',
        background: 'radial-gradient(ellipse at center, rgba(14,165,200,0.06) 0%, transparent 70%)',
        zIndex: 0,
      }} />

      <style jsx global>{`
        @keyframes addr-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes addr-sweep {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        .addr-panel { animation: addr-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .addr-arkham { transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease; }
        .addr-arkham:hover { color: #7DD3FC !important; border-color: rgba(14,165,200,0.55) !important; background: rgba(14,165,200,0.10) !important; }
        .addr-arkham:hover .addr-arrow { transform: translateX(3px); }
        .addr-arrow { transition: transform 0.2s ease; display: inline-block; }
      `}</style>

      <TerminalModulePageShell
        header={{
          sectionLabel: 'TRACKING',
          title: 'ADDRESS INTELLIGENCE',
          subtitle: 'Single-wallet valuation and provenance',
          accent: ACCENT,
          accentDark: '#0A4A6B',
          background: '#050A0E',
          clock: <AddrLiveClock />,
        }}
      >
        {/* Single centered, non-scrollable value panel */}
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 220px)' }}>
          <div
            className="addr-panel relative w-full max-w-2xl overflow-hidden px-8 py-14 sm:px-14 sm:py-16 text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(14,18,26,0.99) 0%, rgba(8,11,17,0.99) 100%)',
              border: '1px solid rgba(214,226,242,0.18)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Top accent bar + sweep */}
            <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(14,165,200,0.85) 30%, rgba(14,165,200,0.85) 70%, transparent 100%)' }}>
              <div style={{
                width: '33%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(125,211,252,0.9), transparent)',
                animation: 'addr-sweep 3.5s linear infinite',
              }} />
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center py-10">
                <div className="w-10 h-10 rounded-full border-2 border-[#0EA5C8] border-t-transparent animate-spin mb-4" />
                <span className="text-[10px] tracking-[0.2em]" style={{ color: '#5A7A94' }}>RESOLVING ADDRESS…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center py-8">
                <div className="text-3xl mb-3 opacity-20">⌀</div>
                <div className="text-[12px] font-bold tracking-[0.14em] mb-1" style={{ color: '#C5CEDA' }}>{error.toUpperCase()}</div>
                <div className="text-[11px]" style={{ color: '#8EA0B7' }}>No intelligence found for this address</div>
              </div>
            ) : (
              <>
                {/* Address label */}
                <div className="mb-8">
                  <div className="text-[9px] tracking-[0.24em] mb-2" style={{ color: '#5A7A94' }}>WALLET</div>
                  {addrInfo?.label ? (
                    <div className="text-[16px] sm:text-[18px] font-bold tracking-[0.04em]" style={{ color: '#FFFFFF' }}>
                      {addrInfo.label}
                    </div>
                  ) : (
                    <div className="text-[13px] font-bold" style={{ color: '#8EA0B7' }}>Unknown Address</div>
                  )}
                  <div className="text-[10px] mt-1.5 tabular-nums" style={{ color: '#5A7A94' }}>
                    {shortenAddr(addr)}
                  </div>
                </div>

                {/* Large USD total */}
                <div className="mb-9">
                  <div className="text-[9px] tracking-[0.24em] mb-3" style={{ color: '#5A7A94' }}>{valueLabel}</div>
                  <div
                    className="font-bold tabular-nums leading-none break-all"
                    style={{
                      fontSize: 'clamp(28px, 6vw, 54px)',
                      color: '#FFFFFF',
                      textShadow: '0 0 32px rgba(14,165,200,0.35)',
                    }}
                  >
                    <AnimatedValue value={totalValue} />
                  </div>
                </div>

                {/* Arkham external link */}
                <a
                  href={arkhmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="addr-arkham inline-flex items-center gap-2 px-5 py-3 text-[10px] font-bold tracking-[0.14em]"
                  style={{
                    color: '#9EACBF',
                    border: '1px solid rgba(214,226,242,0.22)',
                    background: 'rgba(255,255,255,0.01)',
                  }}
                >
                  <span>VIEW FULL WALLET INTELLIGENCE ON ARKHAM</span>
                  <span className="addr-arrow">→</span>
                </a>
              </>
            )}
          </div>
        </div>
      </TerminalModulePageShell>

      <FooterTerminal />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE EXPORT (Suspense wrapper for useSearchParams)
   ═══════════════════════════════════════════════════════════ */

export default function AddressPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#050A0E' }}>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#0EA5C8] border-t-transparent animate-spin mb-4" />
            <span className="text-[10px] tracking-[0.2em]" style={{ color: '#5A7A94', fontFamily: MONO }}>LOADING…</span>
          </div>
        </div>
      }>
        <AddressDetailInner />
      </Suspense>
    </AuthGuard>
  );
}
