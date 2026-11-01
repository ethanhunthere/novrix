'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';

const SECTIONS = [
  { id: 'overview', num: '01', title: 'Platform Overview' },
  { id: 'workspace', num: '02', title: 'Workspace Controls' },
  { id: 'methodology', num: '03', title: 'Data Methodology' },
  { id: 'limitations', num: '04', title: 'Structural Limitations' },
  { id: 'architecture', num: '05', title: 'System Architecture' },
  { id: 'operations', num: '06', title: 'Node Operations' },
  { id: 'policy', num: '07', title: 'Data Policy' },
  { id: 'changelog', num: '08', title: 'Release Changelog' },
];

const CONTROLS = [
  { label: 'Timeframe', tag: '1Y / ALL', desc: 'Every panel toggles between a 1 year rolling window and full historical depth since origin. The default is 1Y.' },
  { label: 'Price overlay', tag: 'PRICE', desc: 'The PRICE toggle overlays the Bitcoin spot price on a secondary log scale axis so indicator signals and price action share one frame.' },
  { label: 'Maximize', tag: 'EXPAND', desc: 'Expands any panel into a high resolution single focus view. Press Escape or click outside to return to the grid.' },
  { label: 'Export', tag: 'PNG', desc: 'Exports a clean high DPI screenshot of the current chart panel with all active overlays and date indicators.' },
  { label: 'Halving markers', tag: 'EPOCHS', desc: 'Vertical dashed reference lines delineate historical four year halving epochs across full cycle charts.' },
  { label: 'Zone bands', tag: 'REGIMES', desc: 'Shaded distribution bands mark structural accumulation bottoms (green) and elevated risk tops (red).' },
  { label: 'Intel Registry', tag: 'SIDEBAR', desc: 'The left sidebar categorizes every indicator with live status. Selecting a row scrolls directly to that panel.' },
];

const SOURCES = [
  { name: 'BGeometrics', tag: 'On-Chain Ledger', cadence: 'Daily · 04:00 UTC', desc: 'Bitcoin on chain metrics including realized valuation, supply dynamics, long and short term holder behavior, miner economics, and UTXO profitability. Full history from 2013.' },
  { name: 'FRED St. Louis', tag: 'Federal Reserve', cadence: 'Daily / Weekly', desc: 'Official macroeconomic data: Fed funds rate, SOFR, Treasury yield curve spreads, inflation gauges (CPI, PCE), and money supply aggregates (M1, M2).' },
  { name: 'Alternative.me', tag: 'Market Psychology', cadence: 'Daily · 04:00 UTC', desc: 'Crypto Fear and Greed composite sentiment index scaled from 0 (extreme fear) to 100 (extreme greed).' },
  { name: 'CoinMarketCap', tag: 'Market Dominance', cadence: 'Daily · 04:00 UTC', desc: 'Bitcoin and Ethereum aggregate market share percentages calculated across global exchange liquidity.' },
  { name: 'CoinGecko', tag: 'Spot & Trending', cadence: 'Real-time Live Query', desc: 'Cryptocurrency market capitalization totals, volume, spot pricing, and social search trending coins.' },
];

const LIMITATIONS = [
  { title: 'Zones, not trading signals', desc: 'Shaded reference zones mark historical statistical distribution across past Bitcoin halving cycles. They describe macro structure, not short term trading advice or automated buy sell signals.' },
  { title: 'Structural on chain lag', desc: 'Metrics reflect confirmed transaction outputs mined into blocks. Hashrate is calculated from mining difficulty and average block intervals rather than physical electrical draw.' },
  { title: 'Dormant and lost coins', desc: 'An estimated 3 to 4 million early Bitcoin have remained immobile since 2011. Their presence in total supply influences realized price and capitalization models.' },
  { title: 'Exchange internal transfers', desc: 'Large cold wallet consolidations by centralized custodians can create temporary spikes in volume or movement based indicators without reflecting organic retail selling.' },
];

const STACK = [
  { component: 'Edge Compute', provider: 'Cloudflare Workers & Pages', detail: 'Edge rendered single page delivery with sub millisecond global routing and zero origin server exposure.' },
  { component: 'Edge Database', provider: 'Cloudflare D1 SQL', detail: 'Distributed SQLite database caching upstream provider responses with automated version invalidation.' },
  { component: 'Client Cache', provider: 'Tab-Scoped SessionStorage', detail: 'Local in browser cache preventing redundant round trips when toggling between timeframes.' },
  { component: 'Interface Engine', provider: 'Next.js & Recharts & Tailwind', detail: 'High performance vector charting with dark tactile editorial typography.' },
];

const DONATIONS = [
  { asset: 'Bitcoin', symbol: 'BTC', address: '18d6ybiWceKC3QwAGveMUijVyBMbNvUZmd' },
  { asset: 'Monero', symbol: 'XMR', address: '495CrEJ9p8CPn8YUiU5zv2MCjTuQ167cDR5F1ejrb5RRHzu8vTeUgJjY4kCMirkcP9VRFcBXKPXQN4XJpj35H7YmEqeHpU6' },
  { asset: 'Zcash', symbol: 'ZEC', address: 'u1gjdr3v4tutx7g9jf045sxm35m380q2phsmnhvzs2sygwcxq0w79whuv0k8mksue6fk9k2x5dgt43knkqfjqt2rrf3kr48pkcqqflsux0uzkpkrul2eh4wyql00agn6rkuayw5zuuhf4ehaar8805a2acengl2hrgqzzmsczhlqrxm3l5' },
];

const POLICIES = [
  { title: 'Zero User Accounts', desc: 'No email registration, password creation, OAuth sign-in, or user profiles. The entire terminal is instantly accessible to anyone without friction.' },
  { title: 'Zero Behavioral Telemetry', desc: 'No Google Analytics, Meta Pixel, Hotjar session recorders, or third party tracking scripts. Your browsing and analysis patterns remain entirely private.' },
  { title: 'Edge Proxy Privacy', desc: 'Your browser never communicates directly with upstream data providers. All queries are relayed server-side via our edge infrastructure to prevent IP exposure.' },
  { title: 'Research & Analytical Scope', desc: 'All indicators, historical charts, and mathematical models are published solely for independent research and education. None of the content constitutes financial, investment, or legal advice.' },
];

const RELEASES = [
  {
    version: 'v2.0.0',
    date: 'October 2026',
    items: [
      'Architectural streamlining: completely removed auxiliary bloated routes including metrilytics, tracking, standalone methodology, about, changelog, privacy, terms, and donations.',
      'Core focus: consolidated the entire platform into three dedicated surfaces: Home, Sentiment, and Documentation.',
      'Unified system reference: merged platform architecture, analytical methodology, update schedules, privacy policies, and node infrastructure support into one comprehensive reference.',
      'Intel Registry upgrade: expanded the on chain analysis engine across Bitcoin valuation, profitability, holder behavior, miner security, and macroeconomic liquidity series.',
      'Edge routing reliability: mapped previous legacy URLs to permanent 301 redirects with instant browser and search crawler resolution.',
    ],
  },
  {
    version: 'v1.0.0',
    date: 'October 2026',
    items: [
      'Sentiment workspace with initial verified on chain and macro indicators.',
      'D1 backed edge caching pipeline with automatic version invalidation.',
      'Unified single page system reference consolidating docs, methodology, architecture, and policy.',
      'Zero tracker, zero account, ad free public infrastructure.',
    ],
  },
];

export default function DocumentationView() {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
      const scrollPosition = window.scrollY + 140;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i];
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(el.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const copyAddress = async (symbol: string, address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedSymbol(symbol);
      setTimeout(() => setCopiedSymbol(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#120F0D] text-[#D8D2C7]">
      <Navbar />

      {/* Mobile / Tablet Horizontal Section Navigator */}
      <div className="lg:hidden sticky top-0 z-30 bg-[#120F0D]/95 backdrop-blur-md border-b border-[#2A231E] px-4 py-2.5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  isActive
                    ? 'bg-[#C2344D]/20 text-[#FAF7F2] border border-[#C2344D]/50 font-semibold'
                    : 'bg-[#191512] text-[#8C857C] hover:text-[#FAF7F2] border border-[#2A231E]'
                }`}
                style={{ fontFamily: 'var(--ff-mono)' }}
              >
                <span className="text-[#C2344D] mr-1.5">{sec.num}</span>
                {sec.title}
              </a>
            );
          })}
        </div>
      </div>

      {/* Main Documentation Area: Two-Column Left-Aligned Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] xl:grid-cols-[280px_1fr] gap-10 xl:gap-16 items-start">

          {/* Desktop Left Column: Sticky Table of Contents Navigation */}
          <aside className="hidden lg:block sticky top-16 space-y-6">
            <div className="p-4 rounded border border-[#2A231E] bg-[#161210]">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A231E]">
                <span className="text-[10.5px] uppercase tracking-wider text-[#FAF7F2] font-semibold" style={{ fontFamily: 'var(--ff-mono)' }}>
                  System Reference
                </span>
                <span className="text-[9px] uppercase tracking-wider text-[#C2344D] bg-[#C2344D]/10 px-2 py-0.5 rounded border border-[#C2344D]/30" style={{ fontFamily: 'var(--ff-mono)' }}>
                  v2.0
                </span>
              </div>

              <nav className="mt-3 space-y-1">
                {SECTIONS.map((sec) => {
                  const isActive = activeSection === sec.id;
                  return (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className={`group flex items-center justify-between px-2.5 py-1.5 text-xs rounded transition-all ${
                        isActive
                          ? 'bg-[#1F1916] text-[#FAF7F2] font-semibold border-l-2 border-[#C2344D]'
                          : 'text-[#8C857C] hover:text-[#FAF7F2] hover:bg-[#1A1513]'
                      }`}
                      style={{ fontFamily: 'var(--ff-mono)' }}
                    >
                      <span className="truncate">
                        <span className={`mr-2 ${isActive ? 'text-[#C2344D]' : 'text-[#5C554D] group-hover:text-[#8C857C]'}`}>
                          {sec.num}
                        </span>
                        {sec.title}
                      </span>
                      <span className={`text-[10px] transition-transform ${isActive ? 'translate-x-0.5 text-[#C2344D]' : 'opacity-0 group-hover:opacity-100 text-[#5C554D]'}`}>
                        →
                      </span>
                    </a>
                  );
                })}
              </nav>

              <div className="mt-5 pt-4 border-t border-[#2A231E] space-y-2">
                <Link
                  href="/sentiment"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#FAF7F2] bg-[#C2344D] hover:bg-[#D43B55] transition-colors rounded"
                  style={{ fontFamily: 'var(--ff-mono)' }}
                >
                  Open Workspace
                  <span>→</span>
                </Link>
                <Link
                  href="/"
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-[#8C857C] hover:text-[#FAF7F2] transition-colors"
                  style={{ fontFamily: 'var(--ff-mono)' }}
                >
                  Return Home
                </Link>
              </div>
            </div>

            <div className="p-3.5 rounded border border-[#2A231E] bg-[#14100E] text-[11px] text-[#8C857C] space-y-1.5" style={{ fontFamily: 'var(--ff-mono)' }}>
              <div className="text-[#FAF7F2] font-semibold uppercase tracking-wider text-[10px]">Operational Specs</div>
              <div>Network: Bitcoin Mainnet</div>
              <div>Ingestion: Automated Edge Relay</div>
              <div>Telemetry: Strict Zero Tracking</div>
            </div>
          </aside>

          {/* Right Column: Left-Aligned Content Area */}
          <article className="min-w-0 space-y-16">

            {/* Header */}
            <header className="border-b border-[#2A231E] pb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-widest text-[#C2344D] bg-[#C2344D]/10 px-2 py-0.5 rounded border border-[#C2344D]/30" style={{ fontFamily: 'var(--ff-mono)' }}>
                  Technical Documentation
                </span>
                <span className="text-[11px] text-[#736B63]" style={{ fontFamily: 'var(--ff-mono)' }}>
                  Published by NOVRIX Core
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal text-[#FAF7F2] tracking-tight leading-tight">
                Documentation &amp; Reference
              </h1>

              <p className="mt-4 text-base sm:text-lg text-[#A8A196] leading-relaxed max-w-3xl">
                The technical manual for the NOVRIX workspace: mathematical formulation of on chain metrics, macroeconomic data sources, update cadences, edge architecture, and operating policies.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-[#201A16]">
                {['Open Source', 'Zero Analytics', 'Cloudflare D1 Edge', 'Daily UTC Sync', 'Non Custodial'].map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] text-[#8C857C] bg-[#191512] px-2.5 py-1 rounded border border-[#2A231E]"
                    style={{ fontFamily: 'var(--ff-mono)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </header>

            {/* Section 01: Overview */}
            <section id="overview" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#C2344D]" style={{ fontFamily: 'var(--ff-mono)' }}>01</span>
                <h2 className="text-2xl font-serif text-[#FAF7F2]">Platform Overview</h2>
              </div>
              <p className="text-sm sm:text-base text-[#B8B1A6] leading-relaxed">
                NOVRIX is an autonomous on chain intelligence workspace built to observe Bitcoin market cycles without speculative hype. It consolidates raw distributed ledger behavior, long term valuation metrics, holder profitability, and central bank liquidity trends onto one synchronized terminal.
              </p>
              <p className="text-sm sm:text-base text-[#B8B1A6] leading-relaxed">
                The platform is purposefully simplified into three primary destinations: the Home router, the Sentiment workspace, and this technical Documentation. Every metric and chart panel is open to the public without paywalls, email sign-ups, or invasive cookies.
              </p>
            </section>

            {/* Section 02: Workspace Controls */}
            <section id="workspace" className="scroll-mt-24 space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#C2344D]" style={{ fontFamily: 'var(--ff-mono)' }}>02</span>
                <h2 className="text-2xl font-serif text-[#FAF7F2]">Workspace Controls &amp; Visual Navigation</h2>
              </div>
              <p className="text-sm sm:text-base text-[#B8B1A6] leading-relaxed">
                Each indicator panel is engineered as an interactive analytical unit. The workspace allows deep historical inspection alongside spot price context.
              </p>

              <div className="border border-[#2A231E] rounded overflow-hidden divide-y divide-[#2A231E] bg-[#15110F]">
                {CONTROLS.map((c) => (
                  <div key={c.label} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 hover:bg-[#1A1513] transition-colors">
                    <div className="sm:w-44 shrink-0 flex items-center justify-between sm:flex-col sm:items-start gap-1">
                      <span className="text-xs font-semibold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                        {c.label}
                      </span>
                      <span className="text-[10px] text-[#C2344D] bg-[#C2344D]/10 px-1.5 py-0.5 rounded border border-[#C2344D]/30" style={{ fontFamily: 'var(--ff-mono)' }}>
                        {c.tag}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-[#A8A196] leading-relaxed">
                      {c.desc}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded border border-[#2A231E] bg-[#161210] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs" style={{ fontFamily: 'var(--ff-mono)' }}>
                <span className="text-[#8C857C]">Keyboard Shortcuts: <span className="text-[#FAF7F2]">Tab</span> traverses panels, <span className="text-[#FAF7F2]">Esc</span> closes expanded view</span>
                <span className="text-[#8C857C]">Minimum Viewport: <span className="text-[#FAF7F2]">≥ 1024px</span> recommended for side by side chart grids</span>
              </div>
            </section>

            {/* Section 03: Data Methodology */}
            <section id="methodology" className="scroll-mt-24 space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#C2344D]" style={{ fontFamily: 'var(--ff-mono)' }}>03</span>
                <h2 className="text-2xl font-serif text-[#FAF7F2]">Analytical Methodology &amp; Sources</h2>
              </div>
              <p className="text-sm sm:text-base text-[#B8B1A6] leading-relaxed">
                NOVRIX ingests metrics directly from verified blockchain indexers and institutional research databases. All queries run through secure edge workers; your browser never makes unauthenticated calls to third party APIs.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SOURCES.map((s) => (
                  <div key={s.name} className="p-4 sm:p-5 rounded border border-[#2A231E] bg-[#161210] space-y-2 hover:border-[#3A302A] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                        {s.name}
                      </span>
                      <span className="text-[10px] text-[#8C857C] bg-[#1E1916] px-2 py-0.5 rounded border border-[#2A231E]" style={{ fontFamily: 'var(--ff-mono)' }}>
                        {s.cadence}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#C2344D] font-mono">{s.tag}</div>
                    <p className="text-xs text-[#A8A196] leading-relaxed pt-1">
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 04: Limitations */}
            <section id="limitations" className="scroll-mt-24 space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#C2344D]" style={{ fontFamily: 'var(--ff-mono)' }}>04</span>
                <h2 className="text-2xl font-serif text-[#FAF7F2]">Structural Limitations &amp; Caveats</h2>
              </div>
              <p className="text-sm sm:text-base text-[#B8B1A6] leading-relaxed">
                Objective analysis requires understanding the natural boundaries of on chain telemetry. The following structural factors should be considered when interpreting historical series:
              </p>

              <div className="border border-[#2A231E] rounded overflow-hidden divide-y divide-[#2A231E] bg-[#15110F]">
                {LIMITATIONS.map((l) => (
                  <div key={l.title} className="p-4 sm:p-5 space-y-1 hover:bg-[#1A1513] transition-colors">
                    <h3 className="text-xs font-semibold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                      {l.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#A8A196] leading-relaxed">
                      {l.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 05: Architecture */}
            <section id="architecture" className="scroll-mt-24 space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#C2344D]" style={{ fontFamily: 'var(--ff-mono)' }}>05</span>
                <h2 className="text-2xl font-serif text-[#FAF7F2]">System Architecture &amp; Stack</h2>
              </div>
              <p className="text-sm sm:text-base text-[#B8B1A6] leading-relaxed">
                The terminal is architected for zero latency, resilience against DDoS disruptions, and cost efficient autonomy.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {STACK.map((st) => (
                  <div key={st.component} className="p-4 rounded border border-[#2A231E] bg-[#161210] space-y-1.5">
                    <div className="text-xs font-semibold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                      {st.component}
                    </div>
                    <div className="text-[11px] text-[#C2344D]" style={{ fontFamily: 'var(--ff-mono)' }}>
                      {st.provider}
                    </div>
                    <p className="text-xs text-[#A8A196] leading-relaxed pt-1">
                      {st.detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 06: Node Operations */}
            <section id="operations" className="scroll-mt-24 space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#C2344D]" style={{ fontFamily: 'var(--ff-mono)' }}>06</span>
                <h2 className="text-2xl font-serif text-[#FAF7F2]">Node Operations &amp; Support</h2>
              </div>
              <p className="text-sm sm:text-base text-[#B8B1A6] leading-relaxed">
                NOVRIX is operated as an independent public good without venture backing or advertisements. Node hosting, API subscription quotas, and edge bandwidth are funded directly by contributors. To support network node upkeep, you can transfer to the verified multi-currency addresses below:
              </p>

              <div className="space-y-3">
                {DONATIONS.map((d) => {
                  const isCopied = copiedSymbol === d.symbol;
                  return (
                    <div
                      key={d.symbol}
                      className="p-4 rounded border border-[#2A231E] bg-[#161210] hover:border-[#3A302A] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                            {d.asset}
                          </span>
                          <span className="text-[10px] text-[#8C857C] bg-[#1F1916] px-1.5 py-0.5 rounded border border-[#2A231E]" style={{ fontFamily: 'var(--ff-mono)' }}>
                            {d.symbol}
                          </span>
                        </div>
                        <div
                          className="text-xs text-[#A8A196] break-all select-all font-mono hover:text-[#FAF7F2] transition-colors"
                          style={{ fontFamily: 'var(--ff-mono)' }}
                        >
                          {d.address}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyAddress(d.symbol, d.address)}
                        className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center gap-1.5 ${
                          isCopied
                            ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                            : 'bg-[#1F1916] text-[#FAF7F2] hover:bg-[#2A231E] border border-[#2A231E]'
                        }`}
                        style={{ fontFamily: 'var(--ff-mono)' }}
                      >
                        {isCopied ? (
                          <>
                            <span>✓</span>
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <span>⧉</span>
                            <span>Copy Address</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 07: Data Policy */}
            <section id="policy" className="scroll-mt-24 space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#C2344D]" style={{ fontFamily: 'var(--ff-mono)' }}>07</span>
                <h2 className="text-2xl font-serif text-[#FAF7F2]">Data Policy &amp; Disclaimers</h2>
              </div>
              <p className="text-sm sm:text-base text-[#B8B1A6] leading-relaxed">
                Our code of ethics guarantees total anonymity for every analyst visiting the platform.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {POLICIES.map((p) => (
                  <div key={p.title} className="p-4 sm:p-5 rounded border border-[#2A231E] bg-[#161210] space-y-1.5">
                    <h3 className="text-xs font-semibold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                      {p.title}
                    </h3>
                    <p className="text-xs text-[#A8A196] leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 08: Releases & Changelog */}
            <section id="changelog" className="scroll-mt-24 space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#C2344D]" style={{ fontFamily: 'var(--ff-mono)' }}>08</span>
                <h2 className="text-2xl font-serif text-[#FAF7F2]">Release Changelog</h2>
              </div>

              <div className="space-y-6">
                {RELEASES.map((rel) => (
                  <div key={rel.version} className="p-5 rounded border border-[#2A231E] bg-[#161210] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#2A231E]">
                      <span className="text-sm font-bold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                        {rel.version}
                      </span>
                      <span className="text-xs text-[#8C857C]" style={{ fontFamily: 'var(--ff-mono)' }}>
                        {rel.date}
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs sm:text-sm text-[#A8A196] list-disc list-inside leading-relaxed">
                      {rel.items.map((it, idx) => (
                        <li key={idx} className="pl-1">
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom Navigation */}
            <div className="pt-8 border-t border-[#2A231E] flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/"
                className="text-xs text-[#8C857C] hover:text-[#FAF7F2] transition-colors"
                style={{ fontFamily: 'var(--ff-mono)' }}
              >
                ← Return to Home Terminal
              </Link>
              <Link
                href="/sentiment"
                className="px-4 py-2 text-xs font-semibold text-[#FAF7F2] bg-[#C2344D] hover:bg-[#D43B55] transition-colors rounded"
                style={{ fontFamily: 'var(--ff-mono)' }}
              >
                Open Sentiment Workspace →
              </Link>
            </div>

          </article>
        </div>
      </main>

      <FooterHome />
    </div>
  );
}
