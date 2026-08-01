'use client';

/* ═══════════════════════════════════════════════════════════════════════
   NOVRIX TERMINAL FOOTER — Sentiment / Tracking / Metrilytics
   Minimal one-line status bar. Looks like the bottom of a terminal session.
   One line. Maximum information density. Minimum visual weight.
   ═══════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';

function UtcClock() {
  const [utc, setUtc] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setUtc(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!utc) return null;
  return (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#64748B', letterSpacing: '0.14em' }}>
      UTC {utc}
    </span>
  );
}

export default function FooterTerminal() {
  return (
    <footer
      style={{
        background: '#020407',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      <div className="max-w-[1800px] mx-auto px-6 lg:px-10 xl:px-16 2xl:px-24">
        <div className="flex items-center justify-between h-8 gap-4">

          {/* Left: Brand */}
          <span
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: '#475569' }}
          >
            NOVRIX<span style={{ color: '#334155' }}>.IO</span>
          </span>

          {/* Center: UTC clock */}
          <UtcClock />

          {/* Right: System status */}
          <div className="flex items-center gap-1.5">
            <span
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '0.16em', color: '#475569' }}
            >
              SYS READY
            </span>
          </div>

        </div>
      </div>
    </footer>
  );
}
