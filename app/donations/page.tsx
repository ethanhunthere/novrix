'use client';

import { useState } from 'react';
import Link from 'next/link';
import FooterHome from '@/components/layout/FooterHome';

const INTER = 'var(--font-inter), Inter, system-ui, sans-serif';
const MONO  = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const BARLOW = 'var(--font-barlow), Barlow Semi Condensed, sans-serif';

const ZEC_ADDRESS = 'u1gjdr3v4tutx7g9jf045sxm35m380q2phsmnhvzs2sygwcxq0w79whuv0k8mksue6fk9k2x5dgt43knkqfjqt2rrf3kr48pkcqqflsux0uzkpkrul2eh4wyql00agn6rkuayw5zuuhf4ehaar8805a2acengl2hrgqzzmsczhlqrxm3l5';
const BTC_ADDRESS = '18d6ybiWceKC3QwAGveMUijVyBMbNvUZmd';
const XMR_ADDRESS = '495CrEJ9p8CPn8YUiU5zv2MCjTuQ167cDR5F1ejrb5RRHzu8vTeUgJjY4kCMirkcP9VRFcBXKPXQN4XJpj35H7YmEqeHpU6';


function addrShort(addr: string) {
  if (addr.length <= 20) return addr;
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
}

function AddressCard({
  symbol,
  address,
  qrSrc,
  copied,
  onCopy,
}: {
  symbol: string;
  address: string;
  qrSrc: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const fullNames: Record<string, string> = { ZEC: 'Zcash', BTC: 'Bitcoin', XMR: 'Monero' };
  return (
    <div
      className="flex flex-col items-center"
      style={{
        background: '#FAFAFA',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '12px',
        padding: 'clamp(20px, 2.5vw, 28px)',
        gap: '16px',
      }}
    >
      {/* QR Code */}
      <div
        style={{
          background: '#FFFFFF',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <img
          src={qrSrc}
          alt={`${symbol} QR`}
          style={{
            display: 'block',
            borderRadius: '4px',
            width: 'clamp(120px, 16vw, 150px)',
            height: 'clamp(120px, 16vw, 150px)',
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {/* Label */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.12em', color: '#64748B', textTransform: 'uppercase' }}>
          {fullNames[symbol]}
        </span>
      </div>

      {/* Address */}
      <div
        style={{
          background: '#F1F5F9',
          borderRadius: '6px',
          padding: '10px 14px',
          fontFamily: MONO,
          fontSize: '12px',
          color: '#334155',
          letterSpacing: '0.02em',
          wordBreak: 'break-all',
          lineHeight: 1.4,
          textAlign: 'center',
          width: '100%',
        }}
      >
        {addrShort(address)}
      </div>

      {/* Copy */}
      <button
        onClick={onCopy}
        style={{
          fontFamily: MONO,
          fontSize: '10px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: copied ? '#0891B2' : '#64748B',
          background: 'transparent',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '6px',
          padding: '8px 16px',
          cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => { if (!copied) { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'; e.currentTarget.style.color = '#0F172A'; } }}
        onMouseLeave={e => { if (!copied) { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = '#64748B'; } }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}


export default function DonationsPage() {
  const [copied, setCopied] = useState(false);
  const [btcCopied, setBtcCopied] = useState(false);
  const [xmrCopied, setXmrCopied] = useState(false);

  const ADDRESSES = [
    { symbol: 'ZEC', address: ZEC_ADDRESS, qrSrc: '/zecqrcode.png', copied, setCopied: setCopied },
    { symbol: 'BTC', address: BTC_ADDRESS, qrSrc: '/btcqrcode.png', copied: btcCopied, setCopied: setBtcCopied },
    { symbol: 'XMR', address: XMR_ADDRESS, qrSrc: '/xmrqrcode.png', copied: xmrCopied, setCopied: setXmrCopied },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F', color: '#FAFAFA' }}>
      {/* Top bar */}
      <div style={{ padding: 'clamp(16px, 2vw, 32px) clamp(16px, 3vw, 48px) clamp(8px, 1vw, 16px)' }}>
        <Link
          href="/"
          className="inline-flex items-center gap-2.5"
          style={{ fontFamily: MONO, fontSize: 'clamp(10px, 1vw, 11px)', letterSpacing: '0.12em', color: '#475569', textDecoration: 'none', textTransform: 'uppercase' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Return to NOVRIX
        </Link>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <section style={{ padding: 'clamp(24px, 3vw, 48px) clamp(16px, 3vw, 48px) clamp(40px, 6vw, 80px)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <p
              style={{
                fontFamily: INTER,
                fontSize: 'clamp(14px, 1.4vw, 17px)',
                fontWeight: 400,
                color: '#9398A4',
                lineHeight: 1.7,
                maxWidth: '640px',
                margin: '0 0 clamp(32px, 5vw, 56px)',
              }}
            >
              I built this thing because I was bored and annoyed at existing crypto tools. Turns out other people like it too. If you wanna throw some crypto my way so I can keep making it better, cool. If not, also cool. Either way it&apos;s staying free and open source.
            </p>
          </div>
          {/* Cards Grid — single col mobile, 2 col tablet, 3 col desktop */}
          <div
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              gap: 'clamp(16px, 2vw, 24px)',
            }}
          >
            {ADDRESSES.map(addr => (
              <AddressCard
                key={addr.symbol}
                symbol={addr.symbol}
                address={addr.address}
                qrSrc={addr.qrSrc}
                copied={addr.copied}
                onCopy={async () => {
                  await navigator.clipboard.writeText(addr.address);
                  addr.setCopied(true);
                  setTimeout(() => addr.setCopied(false), 2000);
                }}
              />
            ))}
          </div>
        </section>
      </main>

      <FooterHome />
    </div>
  );
}
