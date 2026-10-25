'use client';

import { useState, useEffect } from 'react';

const MONO = 'var(--ff-mono)';
const BAR_HEIGHT = '40px';

export default function TerminalModuleBar() {
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [btcChange, setBtcChange] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const d = await res.json() as { bitcoin?: { usd?: number; usd_24h_change?: number } };
        setBtcPrice(d.bitcoin?.usd ?? null);
        setBtcChange(d.bitcoin?.usd_24h_change ?? null);
      } catch {}
    };
    load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const priceColor =
    btcChange === null ? 'rgba(255,255,255,0.45)'
    : btcChange >= 0   ? '#00FF88'
    :                    '#EF4444';

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
        flexShrink: 0,
        boxShadow: '0 1px 0 rgba(0,0,0,0.60)',
      }}
    >
      <div
        className="mx-auto max-w-[2000px] h-full flex items-center justify-between"
        style={{ padding: '0 clamp(12px, 1.6vw, 20px)' }}
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
            : 'BTC'}
        </span>

        <span
          className="flex items-center gap-2"
          style={{
            fontSize: '10px',
            fontFamily: MONO,
            color: 'rgba(255,255,255,0.40)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: '#C2344D',
              boxShadow: '0 0 8px rgba(194,52,77,0.8)',
            }}
          />
          Live
        </span>
      </div>
    </div>
  );
}
