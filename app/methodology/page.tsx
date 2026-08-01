import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';
import Link from 'next/link';
import { AuthGateButton } from '@/components/auth/AuthGateButton';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata = {
  title: 'NOVRIX - Methodology',
  description: 'Data sources, update frequencies, and interpretation guidance for all NOVRIX on-chain metrics. How we calculate sentiment, tracking, and metrilytics data.',
  keywords: ['NOVRIX methodology', 'on-chain metrics explained', 'crypto indicator definitions', 'data sources', 'analytics methodology'],
  alternates: {
    canonical: 'https://novrix.io/methodology',
  },
  openGraph: {
    title: 'NOVRIX - Methodology',
    description: 'Data sources, update frequencies, and interpretation guidance for all NOVRIX on-chain metrics. How we calculate sentiment, tracking, and metrilytics data.',
    url: 'https://novrix.io/methodology',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Methodology',
    description: 'Data sources, update frequencies, and interpretation guidance for all NOVRIX on-chain metrics. How we calculate sentiment, tracking, and metrilytics data.',
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

export default function MethodologyPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020508' }}>
      <Navbar />

      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-14 flex-1">
        <div className="max-w-4xl">

          <Section id="data-sources" title="DATA SOURCES">
            <Para>NOVRIX aggregates data from multiple providers to build a comprehensive intelligence layer. Each source is queried server-side — your browser never contacts these APIs directly.</Para>
            <div className="space-y-3">
              {[
                {
                  name: 'BGeometrics (bitcoin-data.com)',
                  desc: 'Source for all on-chain Bitcoin metrics including valuation, supply, and network metrics. Full history from 2013. Updated daily.',
                  url: 'bitcoin-data.com',
                },
                {
                  name: 'FRED (Federal Reserve Economic Data)',
                  desc: 'Macroeconomic indicators including interest rates, inflation data, money supply, unemployment, and treasury yields.',
                  url: 'fred.stlouisfed.org',
                },
                {
                  name: 'DeFiLlama',
                  desc: 'Multi-chain DeFi protocol analytics including TVL, fees, revenue, and active addresses across 20+ networks.',
                  url: 'defillama.com',
                },
                {
                  name: 'Alternative.me',
                  desc: 'Fear & Greed Index composite score (0–100). Full daily history from 2018. Updated daily.',
                  url: 'alternative.me/crypto/fear-and-greed-index',
                },
                {
                  name: 'CoinMarketCap',
                  desc: 'BTC and ETH market dominance percentage. Updated daily.',
                  url: 'coinmarketcap.com',
                },
                {
                  name: 'CoinGecko',
                  desc: 'Market cap history for dominance calculation and trending coins data. Updated daily.',
                  url: 'coingecko.com',
                },
                {
                  name: 'Etherscan',
                  desc: 'On-chain transaction data for whale tracking module. Real-time.',
                  url: 'etherscan.io',
                },
              ].map(src => (
                <div key={src.name} className="p-4" style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.015)' }}>
                  <div className="text-[12px] font-bold mb-1.5" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#CBD5E1' }}>{src.name}</div>
                  <p className="text-[11px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.7 }}>{src.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="update-schedule" title="UPDATE SCHEDULE">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['DATA TYPE', 'SOURCE', 'SCHEDULE', 'LATENCY'].map(h => (
                      <th key={h} className="text-left pb-3 pr-6" style={{ color: '#475569', fontSize: '8px', letterSpacing: '0.20em', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['On-Chain Metrics', 'BGeometrics', '04:00 UTC daily', '~1h after publish'],
                    ['Fear & Greed Index', 'Alternative.me', '04:00 UTC daily', '~3h after publish'],
                    ['Macro Indicators', 'FRED', 'Daily / Weekly / Monthly', 'Varies by indicator'],
                    ['DeFi Analytics', 'DeFiLlama', 'Hourly', '~15 min'],
                    ['Market Dominance', 'CMC + CoinGecko', '04:00 UTC daily', '~1h after publish'],
                    ['Social Sentiment', 'CoinGecko', 'On-demand', 'Real-time'],
                    ['Trending Coins', 'CoinGecko', 'On-demand', 'Real-time'],
                    ['Whale Transactions', 'Etherscan', 'On-demand', 'Real-time'],
                  ].map(row => (
                    <tr key={row[0]} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      {row.map((cell, i) => (
                        <td key={i} className="py-2.5 pr-6" style={{ color: i === 0 ? '#CBD5E1' : '#64748B', fontSize: '11px' }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Para>Staleness fallback: if any data source has not been updated within expected windows when a module is loaded, the platform will initiate an emergency fetch before serving data.</Para>
          </Section>

          <Section id="interpretation" title="INTERPRETATION GUIDANCE">
            <Para>On-chain metrics are powerful analytical tools with known structural limitations. The following principles govern how NOVRIX presents and interprets data:</Para>
            <div className="space-y-3">
              {[
                { title: 'Zone-Based Signaling', body: 'Each indicator is divided into zones (e.g., undervalued, fair value, overvalued) based on historical thresholds. These zones are visualized as colored background bands on charts. Green zones typically indicate bullish territory; red zones indicate bearish territory. The exact thresholds vary by indicator and are derived from historical cycle analysis.' },
                { title: 'Not Trading Signals', body: 'Zone colors are interpretive guides, not buy/sell signals. They show where current values sit relative to historical ranges. A metric in a "bearish" zone does not mean price will fall — it means the metric is in a range that has historically correlated with bearish conditions.' },
                { title: 'Lag and Estimation', body: 'On-chain data is inherently delayed. Most metrics reflect yesterday\'s on-chain activity, not real-time price action. Network hashrate is estimated, not directly measured. Realized cap calculations depend on UTXO age methodology which includes assumptions about lost coins.' },
                { title: 'Exchange Custody', body: 'Large exchange cold wallets move coins in ways that can trigger false signals. Metrics based on UTXO movement (movement-based metrics) are particularly sensitive to exchange operations.' },
                { title: 'Composite Nature', body: 'No single indicator should drive decisions. NOVRIX provides multiple indicators precisely because each captures a different dimension of market structure. The strongest signals emerge when multiple indicators converge on the same interpretation.' },
                { title: 'Past Performance', body: 'All historical signal accuracy reflects backward-looking analysis. Markets adapt. Widely-known signals become less reliable as they are traded. Use indicators as one input among many.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3 items-start">
                  <div style={{ width: '2px', background: 'rgba(100,116,139,0.25)', flexShrink: 0, marginTop: '2px', alignSelf: 'stretch' }} />
                  <div>
                    <div className="text-[8.5px] tracking-[0.14em] font-bold mb-1.5" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#64748B' }}>{item.title}</div>
                    <p className="text-[11.5px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.75 }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="limitations" title="GENERAL LIMITATIONS">
            <Para>On-chain metrics are powerful analytical tools with known structural limitations that users must understand:</Para>
            <div className="space-y-3">
              {[
                { title: 'Exchange Custody', body: 'Large exchange cold wallets move coins in ways that trigger false UTXO signals. movement-based metrics are particularly sensitive to exchange operations.' },
                { title: 'Lost Coins', body: 'Estimated millions of BTC are permanently lost (Satoshi wallet, early miners). Their presence in realized cap calculations affects certain valuation readings.' },
                { title: 'Data Lag', body: 'BGeometrics publishes data with a 1–2 day lag relative to on-chain events. Our update at 04:00 UTC means the freshest data point is typically yesterday\'s.' },
                { title: 'No Futures/Derivatives', body: 'These are pure on-chain spot metrics. Derivatives market dynamics are not captured. Basis, funding rates, and open interest are separate analytical dimensions.' },
                { title: 'Past Signals ≠ Future Performance', body: 'All historical signal accuracy described in this document reflects backward-looking analysis. Markets adapt. Widely-known signals become less reliable as they are traded.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3 items-start">
                  <div style={{ width: '2px', background: 'rgba(100,116,139,0.25)', flexShrink: 0, marginTop: '2px', alignSelf: 'stretch' }} />
                  <div>
                    <div className="text-[8.5px] tracking-[0.14em] font-bold mb-1.5" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#64748B' }}>{item.title}</div>
                    <p className="text-[11.5px]" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.75 }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="credits" title="ACKNOWLEDGMENTS">
            <Para>NOVRIX would not exist without the exceptional work of the following data providers and open-source projects:</Para>
            <div className="space-y-4">
              {[
                { name: 'BGeometrics', desc: 'For comprehensive Bitcoin on-chain analytics and historical data spanning over a decade. The foundation of our on-chain intelligence layer.' },
                { name: 'FRED (Federal Reserve Economic Data)', desc: 'For decades of meticulously maintained macroeconomic data that powers our macro analysis module.' },
                { name: 'DeFiLlama', desc: 'For open, transparent, and comprehensive DeFi protocol analytics across the entire multi-chain ecosystem.' },
                { name: 'Alternative.me', desc: 'For the Fear & Greed Index, a benchmark sentiment metric used across the cryptocurrency industry.' },
                { name: 'CoinGecko', desc: 'For reliable market data, trending asset tracking, and market dominance metrics.' },
                { name: 'CoinMarketCap', desc: 'For market capitalization data and cryptocurrency market benchmarks.' },
                { name: 'Etherscan', desc: 'For Ethereum blockchain explorer services and on-chain transaction data.' },
              ].map(src => (
                <div key={src.name} className="flex gap-4">
                  <div style={{ width: '2px', background: 'rgba(100,116,139,0.25)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div className="text-[12px] font-bold mb-1" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#CBD5E1' }}>{src.name}</div>
                    <p className="text-[11.5px] leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.75 }}>{src.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Para>All trademarks and data belong to their respective owners. NOVRIX aggregates and presents this data for analytical purposes only. We are deeply grateful to these providers for making their data accessible.</Para>
          </Section>

          <div className="flex items-center gap-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Link href="/documentation" className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors" style={{ fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.10em', textDecoration: 'none' }}>Documentation →</Link>
            <AuthGateButton className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors cursor-pointer bg-transparent border-none" style={{ fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.10em', textDecoration: 'none' }}>Sentiment Module →</AuthGateButton>
          </div>
        </div>
      </div>

      <FooterHome />
    </div>
  );
}
