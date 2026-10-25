'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SANS = 'var(--ff-sans)';
const DISPLAY = 'var(--ff-display)';
const MONO = 'var(--ff-mono)';

function getGateTarget(pathname: string | null): string {
  if (pathname?.startsWith('/sentiment')) return 'the sentiment workspace';
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
  const [checked, setChecked] = useState(false);
  const gateTarget = getGateTarget(pathname);

  useEffect(() => {
    const check = () => {
      const isNarrow = typeof window !== 'undefined' ? window.innerWidth < 1080 : false;
      setIsMobile(isNarrow);
      onViewportCheck?.(isNarrow);
    };
    check();
    setChecked(true);

    let timer: ReturnType<typeof setTimeout>;
    const debounced = () => { clearTimeout(timer); timer = setTimeout(check, 100); };
    window.addEventListener('resize', debounced);
    return () => { window.removeEventListener('resize', debounced); clearTimeout(timer); };
  }, [onViewportCheck]);

  if (!checked) return null;
  if (!isMobile) return <>{children}</>;

  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(194,52,77,0.05) 0%, transparent 55%), var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginBottom: '18px',
          }}
        >
          Display check
        </div>

        <h1
          style={{
            fontFamily: DISPLAY,
            fontSize: 'clamp(30px, 8vw, 38px)',
            fontWeight: 500,
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            color: 'var(--text-heading)',
            margin: 0,
            textWrap: 'balance',
          }}
        >
          Sentiment needs a wider screen.
        </h1>

        <p
          style={{
            fontFamily: SANS,
            fontSize: '15px',
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
            margin: '16px 0 0',
          }}
        >
          Charts, registry, and panel controls need room to stay readable. Open {gateTarget} on a laptop or desktop, or read the editorial pages on this device.
        </p>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '28px 0' }} />

        <div className="grid grid-cols-2">
          <div style={{ paddingRight: '16px', borderRight: '1px solid var(--border-subtle)' }}>
            <div style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-ghost)', marginBottom: '5px' }}>
              Current
            </div>
            <div style={{ fontFamily: MONO, fontSize: '13px', color: 'var(--text-primary)' }}>Compact</div>
          </div>
          <div style={{ paddingLeft: '16px' }}>
            <div style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-ghost)', marginBottom: '5px' }}>
              Needed
            </div>
            <div style={{ fontFamily: MONO, fontSize: '13px', color: 'var(--text-primary)' }}>1080px+</div>
          </div>
        </div>

        <Link
          href="/"
          className="gate-return"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '48px',
            width: '100%',
            marginTop: '28px',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            color: 'var(--text-heading)',
            fontFamily: SANS,
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none',
            boxSizing: 'border-box',
          }}
        >
          Return home
        </Link>

        <p style={{ fontFamily: SANS, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-tertiary)', textAlign: 'center', margin: '16px 0 0' }}>
          <Link href="/insights" className="gate-return" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Read Insights instead</Link>
        </p>
      </div>

      <style>{`
        .gate-return { transition: background 160ms var(--ease-standard), color 160ms var(--ease-standard), border-color 160ms var(--ease-standard); }
        .gate-return:hover { background: var(--bg-raised); border-color: var(--border-strong); color: var(--text-heading); }
        .gate-return:focus-visible { outline: 1px solid var(--accent-novrix); outline-offset: 3px; }
        .gate-return:active { transform: scale(.99); }
        @media (prefers-reduced-motion: reduce) { .gate-return { transition: none; } }
      `}</style>
    </div>
  );
}
