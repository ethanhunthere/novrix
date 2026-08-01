import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';
import Link from 'next/link';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata = {
  title: 'NOVRIX - Documentation',
  description: 'Complete guide to using NOVRIX: account creation, terminal module navigation, chart controls, CLI commands, and indicator interpretation.',
  keywords: ['NOVRIX documentation', 'crypto analytics guide', 'how to use NOVRIX', 'terminal tutorial', 'CLI commands'],
  alternates: {
    canonical: 'https://novrix.io/documentation',
  },
  openGraph: {
    title: 'NOVRIX - Documentation',
    description: 'Complete guide to using NOVRIX: account creation, terminal module navigation, chart controls, CLI commands, and indicator interpretation.',
    url: 'https://novrix.io/documentation',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Documentation',
    description: 'Complete guide to using NOVRIX: account creation, terminal module navigation, chart controls, CLI commands, and indicator interpretation.',
    images: defaultTwitterImages,
  },
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="mb-10 scroll-mt-16 sm:scroll-mt-20">
      <div className="flex items-start gap-3 mb-4">
        <div style={{ width: '1px', height: '14px', background: 'rgba(71,85,105,0.4)' }} />
        <h2 className="min-w-0 flex-1 text-[13px] tracking-[0.18em] font-black leading-relaxed break-words" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#CBD5E1' }}>{title}</h2>
      </div>
      <div className="p-4 sm:p-5" style={{ background: 'linear-gradient(135deg, #040912 0%, #050A16 60%, #040810 100%)', border: '1px solid rgba(255,255,255,0.06)', contain: 'paint layout' }}>
        {children}
      </div>
    </div>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-[12.5px] leading-relaxed mb-4 last:mb-0" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.85 }}>{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[11px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#CBD5E1', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', overflowWrap: 'anywhere' }}>
      {children}
    </code>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-5 last:mb-0">
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-6 h-6 flex items-center justify-center text-[9px] font-black" style={{ border: '1px solid rgba(100,116,139,0.3)', color: '#64748B', fontFamily: 'Inter, system-ui, sans-serif', background: 'rgba(71,85,105,0.06)' }}>{n}</div>
        <div style={{ width: '1px', flex: 1, background: 'rgba(71,85,105,0.2)' }} />
      </div>
      <div className="pb-4 min-w-0">
        <div className="text-[11px] font-bold mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#CBD5E1' }}>{title}</div>
        <p className="text-[11.5px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.75 }}>{children}</p>
      </div>
    </div>
  );
}

export default function DocumentationPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020508' }}>
      <Navbar />

      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-14 flex-1">
        <div className="max-w-3xl">

          <Section id="account-creation" title="ACCOUNT CREATION">
            <Para>NOVRIX uses a NOVRIX ID account system.</Para>
            <Step n={1} title="Generate your access ID">
              Navigate to the sign-up screen. NOVRIX generates a cryptographically unique access ID for you automatically — no input required. The ID uses uppercase, lowercase, digits, and special characters, giving an enormous pool of possible combinations.
            </Step>
            <Step n={2} title="Copy and store your ID">
              Your access ID is your only credential. There is no password. Copy it immediately using the copy button and store it somewhere permanent — a password manager, an encrypted note, or written down offline.
            </Step>
            <Step n={3} title="You're in">
              Your session is valid for 30 days of activity, then requires re-authentication.
            </Step>
            <div className="p-3 mt-2" style={{ border: '1px solid rgba(194,52,77,0.2)', background: 'rgba(194,52,77,0.04)' }}>
              <p className="text-[10.5px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.7 }}>
                <strong style={{ color: '#C2344D' }}>CRITICAL:</strong> Your access ID is your only credential and cannot be recovered. There is no password reset. There is no account recovery. Store it before closing the window.
              </p>
            </div>
          </Section>

          <Section id="terminal" title="TERMINAL MODULE">
            <Para>The Terminal landing page is NOVRIX&apos;s mission control view. Three analytical modules with data visualizations.</Para>
            <div className="space-y-3">
              {[
                {
                  name: 'SENTIMENT ENGINE',
                  desc: 'Fear & Greed Index oscilloscope with signal display. Shows current F&G score with historical waveform context. BTC price overlay. Readouts.',
                },
                {
                  name: 'WHALE TRACKER',
                  desc: 'Radar visualization showing tracked entity network. Real-time signal sweep across monitored blockchain addresses. Multiple chains, multiple entities.',
                },
                {
                  name: 'METRILYTICS',
                  desc: 'Spectrum analyzer for cross-chain protocol revenue. Depth rendering of fee and revenue metrics across protocols.',
                },
              ].map(mod => (
                <div key={mod.name} className="p-3.5" style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.015)' }}>
                  <div className="text-[9px] tracking-[0.18em] font-black mb-1.5" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#64748B' }}>{mod.name}</div>
                  <p className="text-[11px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.7 }}>{mod.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="sentiment" title="SENTIMENT MODULE">
            <Para>Indicator panels covering on-chain valuation, flow, supply, network health, and social metrics.</Para>
            <div className="space-y-2 mb-4">
              {[
                { key: 'TIMEFRAME SELECTOR', val: 'Each indicator panel has a timeframe selector: 1W, 1M, 6M, 1Y, 4Y, ALL. Defaults to 1Y. Click any to change the displayed window.' },
                { key: 'BTC PRICE OVERLAY', val: 'All indicator charts support a BTC price overlay on a secondary log-scale Y-axis. Toggle it via the PRICE button in the panel controls.' },
                { key: 'MAXIMIZE MODE', val: 'Click the expand icon in any panel header to maximize the panel to 85% viewport. Press Escape or click outside to minimize.' },
                { key: 'SCREENSHOT', val: 'Click the camera icon in any panel header to capture a PNG export of that panel. The NOVRIX watermark is excluded from captures.' },
                { key: 'HALVING MARKERS', val: 'In 4Y and ALL timeframes, Bitcoin halving events are marked with vertical reference lines.' },
                { key: 'ZONE BANDS', val: 'Colored background bands show signal zones on each indicator chart (green for bullish territory, red for bearish). These correspond to the zone thresholds defined in Methodology.' },
                { key: 'SIDEBAR REGISTRY', val: 'Left sidebar shows all indicators with signal state (color-coded by current zone). Click any row to scroll directly to that panel.' },
              ].map(item => (
                <div key={item.key} className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-3 items-start py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span className="text-[9px] sm:text-[10px] tracking-[0.14em] font-bold pt-0.5" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#475569' }}>{item.key}</span>
                  <span className="text-[11px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.7 }}>{item.val}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="tracking" title="WHALE TRACKING MODULE">
            <Para>Real-time monitoring of on-chain transactions from a curated list of known significant wallets and exchange addresses across multiple chains.</Para>
            <div className="space-y-2">
              {[
                { key: 'TRANSACTION TABLE', val: 'Feed of large on-chain movements. Each row shows: entity name, wallet address (truncated), chain, transaction value in USD, direction (IN/OUT), and relative timestamp.' },
                { key: 'ENTITY FILTER', val: 'Filter the transaction feed by specific tracked entities using the sidebar registry.' },
                { key: 'CHAIN FILTER', val: 'Filter by blockchain (Ethereum, Bitcoin, BNB Chain, etc.).' },
                { key: 'ALERT THRESHOLD', val: 'Large moves above configured thresholds are highlighted with elevated visual weight.' },
              ].map(item => (
                <div key={item.key} className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-3 items-start py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span className="text-[9px] sm:text-[10px] tracking-[0.14em] font-bold pt-0.5" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#475569' }}>{item.key}</span>
                  <span className="text-[11px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.7 }}>{item.val}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="metrilytics" title="METRILYTICS MODULE">
            <Para>Protocol-level analytics across blockchain networks. Fee revenue, transaction volume, and market metrics in a unified analytical interface.</Para>
            <div className="space-y-2">
              {[
                { key: 'CHAIN SELECTOR', val: 'Switch between Ethereum, Arbitrum, Optimism, Base, BNB Chain, Solana, Avalanche, and other supported chains.' },
                { key: 'METRIC VIEWS', val: 'Toggle between Fees, Revenue, Transactions, Active Addresses, and TVL metrics.' },
                { key: 'TIMEFRAME', val: '24H, 7D, 30D windows available for all metrics.' },
                { key: 'SPECTRUM DISPLAY', val: 'The spectrum view on the terminal landing page uses layered rendering to show relative protocol size at a glance.' },
              ].map(item => (
                <div key={item.key} className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-3 items-start py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span className="text-[9px] sm:text-[10px] tracking-[0.14em] font-bold pt-0.5" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#475569' }}>{item.key}</span>
                  <span className="text-[11px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.7 }}>{item.val}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="keyboard" title="KEYBOARD INTERFACE">
            <Para>NOVRIX is designed for keyboard-first navigation. Common shortcuts:</Para>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                ['Escape', 'Close maximized panel / dismiss modal'],
                ['Click panel expand', 'Maximize indicator panel to fullscreen'],
                ['Click panel camera', 'Screenshot / export panel as PNG'],
                ['Click timeframe button', 'Change chart timeframe (1W–ALL)'],
                ['Click PRICE toggle', 'Show/hide BTC price overlay'],
                ['Click sidebar item', 'Scroll to that indicator panel'],
              ].map(([key, action]) => (
                <div key={key} className="flex gap-3 items-start p-2.5" style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
                  <Code>{key}</Code>
                  <span className="text-[10.5px] min-w-0 flex-1" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#64748B', lineHeight: 1.6 }}>{action}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="credits" title="DATA PARTNERS">
            <Para>NOVRIX integrates data from the following providers:</Para>
            <div className="space-y-3">
              {[
                { name: 'BGeometrics', desc: 'Bitcoin on-chain metrics and historical data.' },
                { name: 'FRED (Federal Reserve Economic Data)', desc: 'Macroeconomic indicators and financial data.' },
                { name: 'DeFiLlama', desc: 'Multi-chain DeFi protocol analytics and TVL data.' },
                { name: 'Alternative.me', desc: 'Crypto Fear & Greed Index.' },
                { name: 'CoinGecko', desc: 'Cryptocurrency market data and trending assets.' },
                { name: 'CoinMarketCap', desc: 'Market capitalization and dominance data.' },
                { name: 'Etherscan', desc: 'Ethereum blockchain explorer and transaction data.' },
              ].map(src => (
                <div key={src.name} className="p-3.5" style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.015)' }}>
                  <div className="text-[9px] tracking-[0.18em] font-black mb-1.5" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#64748B' }}>{src.name}</div>
                  <p className="text-[11px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.7 }}>{src.desc}</p>
                </div>
              ))}
            </div>
            <Para>All data belongs to its respective owners. NOVRIX aggregates and presents this data for analytical purposes only.</Para>
          </Section>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Link href="/methodology" className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors" style={{ fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.10em', textDecoration: 'none' }}>Methodology →</Link>
            <Link href="/changelog" className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors" style={{ fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.10em', textDecoration: 'none' }}>Changelog →</Link>
          </div>
        </div>
      </div>

      <FooterHome />
    </div>
  );
}
