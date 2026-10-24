'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';

const SANS = 'var(--ff-sans)';
const DISPLAY = 'var(--ff-display)';
const MONO = 'var(--ff-mono)';

const ZEC_ADDRESS = 'u1gjdr3v4tutx7g9jf045sxm35m380q2phsmnhvzs2sygwcxq0w79whuv0k8mksue6fk9k2x5dgt43knkqfjqt2rrf3kr48pkcqqflsux0uzkpkrul2eh4wyql00agn6rkuayw5zuuhf4ehaar8805a2acengl2hrgqzzmsczhlqrxm3l5';
const BTC_ADDRESS = '18d6ybiWceKC3QwAGveMUijVyBMbNvUZmd';
const XMR_ADDRESS = '495CrEJ9p8CPn8YUiU5zv2MCjTuQ167cDR5F1ejrb5RRHzu8vTeUgJjY4kCMirkcP9VRFcBXKPXQN4XJpj35H7YmEqeHpU6';

const ADDRESSES = [
  { symbol: 'ZEC', name: 'Zcash', address: ZEC_ADDRESS, qrSrc: '/zecqrcode.png' },
  { symbol: 'BTC', name: 'Bitcoin', address: BTC_ADDRESS, qrSrc: '/btcqrcode.png' },
  { symbol: 'XMR', name: 'Monero', address: XMR_ADDRESS, qrSrc: '/xmrqrcode.png' },
];

function shortAddress(address: string) {
  if (address.length <= 24) return address;
  return `${address.slice(0, 12)}…${address.slice(-8)}`;
}

export default function DonationsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const copy = async (symbol: string, address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setFailed(null);
      setCopied(symbol);
      window.setTimeout(() => setCopied(current => (current === symbol ? null : current)), 2000);
    } catch {
      setFailed(symbol);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <Navbar />

      <main style={{ flex: 1, width: '100%' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto', padding: 'clamp(56px, 8vw, 104px) var(--container-pad) clamp(72px, 10vw, 120px)' }}>
          <header style={{ maxWidth: '640px' }}>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontSize: 'clamp(36px, 5.4vw, 58px)',
                fontWeight: 500,
                lineHeight: 1.02,
                letterSpacing: '-0.025em',
                color: 'var(--text-heading)',
                margin: 0,
                textWrap: 'balance',
              }}
            >
              Operations funding
            </h1>
            <p
              style={{
                fontFamily: SANS,
                fontSize: 'clamp(16px, 1.5vw, 18px)',
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
                margin: '20px 0 0',
              }}
            >
              I built this because I was bored and annoyed at existing crypto tools. Other people found it useful. If you want to throw some crypto at the infrastructure bill, cool. If not, also cool. It stays free and open source either way.
            </p>
          </header>

          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: 'clamp(36px, 5vw, 52px) 0' }} />

          <div
            className="grid grid-cols-1 md:grid-cols-3"
            style={{ gap: 'clamp(16px, 2vw, 24px)' }}
          >
            {ADDRESSES.map(item => {
              const isCopied = copied === item.symbol;
              const isFailed = failed === item.symbol;
              return (
                <div
                  key={item.symbol}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: 'clamp(20px, 2.4vw, 28px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '4px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.qrSrc}
                      alt={`${item.name} donation address QR code`}
                      width={144}
                      height={144}
                      style={{ display: 'block', width: 'clamp(120px, 15vw, 144px)', height: 'auto', imageRendering: 'pixelated' }}
                    />
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: SANS, fontSize: '15px', color: 'var(--text-primary)' }}>{item.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.16em', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      {item.symbol}
                    </div>
                  </div>

                  <code
                    style={{
                      fontFamily: MONO,
                      fontSize: '11.5px',
                      lineHeight: 1.5,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-subtle)',
                      padding: '10px 12px',
                      width: '100%',
                      textAlign: 'center',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {shortAddress(item.address)}
                  </code>

                  <button
                    type="button"
                    onClick={() => copy(item.symbol, item.address)}
                    aria-live="polite"
                    className="donation-copy"
                    style={{
                      minHeight: '44px',
                      width: '100%',
                      fontFamily: SANS,
                      fontSize: '13px',
                      fontWeight: 500,
                      color: isFailed ? 'var(--status-critical)' : isCopied ? 'var(--accent-novrix)' : 'var(--text-primary)',
                      background: 'transparent',
                      border: `1px solid ${isCopied ? 'var(--border-accent)' : 'var(--border-default)'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    {isFailed ? 'Copy failed — select the address' : isCopied ? 'Copied' : 'Copy address'}
                  </button>
                </div>
              );
            })}
          </div>

          <p style={{ fontFamily: SANS, fontSize: '13px', lineHeight: 1.7, color: 'var(--text-tertiary)', margin: '24px 0 0', maxWidth: '620px' }}>
            Donations cover data provider access and hosting. Nothing here unlocks a feature, and nothing is tracked.
          </p>
        </div>
      </main>

      <FooterHome />

      <style>{`
        .donation-copy { transition: color 160ms var(--ease-standard), border-color 160ms var(--ease-standard), background 160ms var(--ease-standard); }
        .donation-copy:hover { background: var(--bg-raised); }
        .donation-copy:active { transform: scale(.98); }
        .donation-copy:focus-visible { outline: 1px solid var(--accent-novrix); outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .donation-copy { transition: none; } .donation-copy:active { transform: none; } }
      `}</style>
    </div>
  );
}
