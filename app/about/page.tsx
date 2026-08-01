import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';
import Link from 'next/link';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata = {
  title: 'NOVRIX - About',
  description: 'What NOVRIX is, what it is not, and the mission behind the intelligence infrastructure.',
  keywords: ['NOVRIX about', 'on-chain intelligence', 'crypto analytics platform', 'institutional analytics'],
  alternates: {
    canonical: 'https://novrix.io/about',
  },
  openGraph: {
    title: 'NOVRIX - About',
    description: 'What NOVRIX is, what it is not, and the mission behind the intelligence infrastructure.',
    url: 'https://novrix.io/about',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - About',
    description: 'What NOVRIX is, what it is not, and the mission behind the intelligence infrastructure.',
    images: defaultTwitterImages,
  },
};

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div style={{ width: '1px', height: '32px', background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)' }} />
      <div className="min-w-0">
        <div
          className="text-[11px] tracking-[0.22em] font-black"
          style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8' }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function ContentPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-8 p-4 sm:p-6"
      style={{
        background: 'linear-gradient(135deg, #040912 0%, #050A16 60%, #040810 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        contain: 'paint layout',
      }}
    >
      {children}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020508' }}>
      <Navbar />

      {/* Content */}
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-14 flex-1">
        <div className="max-w-3xl">

          {/* Section 1 */}
          <SectionHeader label="WHAT NOVRIX IS" />
          <ContentPanel>
            <p
              className="text-[13px] leading-relaxed mb-5"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#CBD5E1', lineHeight: 1.85 }}
            >
              NOVRIX is an on-chain intelligence infrastructure. Built to give institutional-grade analytical capability to any operator.
            </p>
            <p
              className="text-[13px] leading-relaxed"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.85 }}
            >
              NOVRIX provides comprehensive on-chain analytics, market sentiment data, whale transaction tracking, and multi-chain protocol analytics. All data is updated on automated schedules with fallback mechanisms to ensure continuity.
            </p>
            <div
              className="mt-5 pt-5 flex flex-wrap gap-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              {['ON-CHAIN INTELLIGENCE', 'INSTITUTIONAL-GRADE', 'REAL-TIME DATA'].map(tag => (
                <span
                  key={tag}
                  className="text-[9px] sm:text-[10px] tracking-[0.18em] px-2 py-1"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#475569', border: '1px solid rgba(71,85,105,0.25)', background: 'rgba(71,85,105,0.06)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </ContentPanel>

          {/* Section 2 */}
          <SectionHeader label="WHAT NOVRIX IS NOT" />
          <ContentPanel>
            <div className="space-y-4">
              {[
                {
                  label: 'NOT A FINANCIAL ADVISOR',
                  body: 'Nothing on NOVRIX constitutes financial advice. On-chain metrics are analytical tools, not trading signals. Past patterns do not predict future performance. You make your own decisions with your own capital.',
                },
                {
                  label: 'NOT A TRADING PLATFORM',
                  body: 'NOVRIX does not execute trades, custody assets, or connect to any exchange. It is a pure intelligence layer. What you do with the intelligence is entirely your responsibility.',
                },
                {
                  label: 'NOT A DATA BROKER',
                  body: 'NOVRIX does not sell or share user data.',
                },
              ].map(item => (
                <div key={item.label} className="flex gap-4">
                  <div style={{ width: '2px', background: 'rgba(100,116,139,0.25)', flexShrink: 0, marginTop: '2px' }} />
                  <div className="min-w-0">
                    <div
                      className="text-[8px] tracking-[0.22em] font-black mb-2"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#64748B' }}
                    >
                      {item.label}
                    </div>
                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.8 }}
                    >
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ContentPanel>

          {/* Section 3 */}
          <SectionHeader label="THE PHILOSOPHY" />
          <ContentPanel>
            <p
              className="text-[13px] leading-relaxed mb-5"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#CBD5E1', lineHeight: 1.85 }}
            >
              Intelligence should be accessible to any operator.
            </p>
            <p
              className="text-[13px] leading-relaxed mb-5"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.85 }}
            >
              The platform authenticates with a NOVRIX ID — a numeric access key generated on first use. The ID is the only credential. Lose it and the account is gone.
            </p>

          </ContentPanel>

          {/* Section 4 */}
          <SectionHeader label="THE STACK" />
          <ContentPanel>
            <p
              className="text-[12px] mb-5"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#64748B', lineHeight: 1.7 }}
            >
              Technical infrastructure for operators who want to know what&apos;s running.
            </p>
            <div className="space-y-3">
              {[
                { key: 'EDGE RUNTIME', value: 'Cloudflare Pages + Workers. Zero cold starts. Global edge network. No server to compromise.' },
                { key: 'DATABASE', value: 'Cloudflare edge storage. On-chain indicator history, price data, account authentication.' },
                { key: 'ON-CHAIN DATA', value: 'BGeometrics API for Bitcoin on-chain metrics. Updated daily at 04:00 UTC.' },
                { key: 'SENTIMENT DATA', value: 'Alternative.me Fear & Greed Index. Full historical series. Updated daily at 04:00 UTC.' },
                { key: 'WHALE TRACKING', value: 'Etherscan API for on-chain transaction monitoring across configured whale addresses.' },
                { key: 'AUTH', value: 'NOVRIX ID — numeric access key generated on first use. No email, no password. Session cookie only.' },
                { key: 'THIRD PARTIES', value: 'Cloudflare handles CDN and DNS at the network level.' },
              ].map(row => (
                <div key={row.key} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 items-start">
                  <span
                    className="text-[8.5px] tracking-[0.14em] font-bold pt-0.5"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#475569' }}
                  >
                    {row.key}
                  </span>
                  <span
                    className="text-[11.5px] leading-relaxed"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.7 }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </ContentPanel>

          {/* Section 5 — Credits */}
          <SectionHeader label="DATA PARTNERS" />
          <ContentPanel>
            <p
              className="text-[13px] leading-relaxed mb-5"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#CBD5E1', lineHeight: 1.85 }}
            >
              NOVRIX stands on the shoulders of exceptional data providers and open-source infrastructure.
            </p>
            <div className="space-y-4">
              {[
                { name: 'BGeometrics', desc: 'Comprehensive Bitcoin on-chain analytics and historical data.' },
                { name: 'FRED (Federal Reserve Economic Data)', desc: 'Macroeconomic indicators and financial data.' },
                { name: 'DeFiLlama', desc: 'Multi-chain DeFi protocol analytics, TVL, and revenue metrics.' },
                { name: 'Alternative.me', desc: 'Crypto Fear & Greed Index.' },
                { name: 'CoinGecko', desc: 'Cryptocurrency market data, prices, and trending assets.' },
                { name: 'CoinMarketCap', desc: 'Market capitalization and dominance data.' },
                { name: 'Etherscan', desc: 'Ethereum blockchain explorer and transaction data.' },
              ].map(src => (
                <div key={src.name} className="flex gap-4">
                  <div style={{ width: '2px', background: 'rgba(100,116,139,0.25)', flexShrink: 0, marginTop: '2px' }} />
                  <div className="min-w-0">
                    <div
                      className="text-[12px] font-bold mb-1"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#CBD5E1' }}
                    >
                      {src.name}
                    </div>
                    <p
                      className="text-[11.5px] leading-relaxed"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.75 }}
                    >
                      {src.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p
              className="text-[12px] mt-5 pt-5"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#64748B', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              All trademarks and data belong to their respective owners. NOVRIX aggregates and presents this data for analytical purposes only.
            </p>
          </ContentPanel>

          {/* Footer links */}
          <div
            className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <Link
              href="/privacy"
              className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.10em', textDecoration: 'none' }}
            >
              Data Policy →
            </Link>
            <Link
              href="/methodology"
              className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.10em', textDecoration: 'none' }}
            >
              Methodology →
            </Link>
          </div>

        </div>
      </div>

      <FooterHome />
    </div>
  );
}
