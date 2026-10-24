import { EditorialPage, DocSection, Prose, P, DataRow, InlineCode } from '@/components/layout/EditorialPage';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata = {
  title: 'NOVRIX - Documentation & System Reference',
  description: 'Complete documentation for the NOVRIX on-chain intelligence workspace, quantitative methodology, platform architecture, data policy, and operations.',
  keywords: ['NOVRIX documentation', 'crypto analytics guide', 'how to use NOVRIX', 'sentiment methodology', 'on-chain indicators'],
  alternates: {
    canonical: 'https://novrix.io/documentation',
  },
  openGraph: {
    title: 'NOVRIX - Documentation & System Reference',
    description: 'Complete documentation for the NOVRIX on-chain intelligence workspace, quantitative methodology, platform architecture, data policy, and operations.',
    url: 'https://novrix.io/documentation',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Documentation & System Reference',
    description: 'Complete documentation for the NOVRIX on-chain intelligence workspace, quantitative methodology, platform architecture, data policy, and operations.',
    images: defaultTwitterImages,
  },
};

const CONTROLS = [
  ['Timeframe', 'Every panel switches between 1W, 1M, 6M, 1Y, 4Y, and ALL. The default is 1Y.'],
  ['Price overlay', 'The PRICE toggle adds BTC price on a secondary log-scale axis so the indicator and price share one frame.'],
  ['Maximize', 'The expand control fills most of the viewport with one panel. Escape, or a click outside, returns to the grid.'],
  ['Export', 'The camera control captures that panel as a clean PNG screenshot for research.'],
  ['Halving markers', 'On 4Y and ALL views, Bitcoin halvings appear as vertical dashed reference lines.'],
  ['Zone bands', 'Shaded bands mark historical ranges. Green marks lower/bullish distribution; red marks upper/bearish distribution.'],
  ['Registry', 'The sidebar lists every indicator with its current zone reading. Selecting a row focuses that panel.'],
];

const SOURCES = [
  ['BGeometrics', 'Bitcoin on-chain metrics: valuation, supply, holder behavior, miners, and network health. Full history from 2013, updated daily.'],
  ['FRED', 'Federal Reserve Economic Data: policy rates, inflation, money supply, employment, GDP, and treasury yields.'],
  ['Alternative.me', 'Fear & Greed Index composite score from 0 to 100, with daily history from 2018.'],
  ['CoinMarketCap', 'BTC and ETH market dominance percentages, updated daily.'],
  ['CoinGecko', 'Market capitalization history, spot prices, and trending assets.'],
];

const SCHEDULE = [
  ['On-chain metrics', 'BGeometrics · 04:00 UTC daily · roughly one hour after provider publication.'],
  ['Fear & Greed', 'Alternative.me · 04:00 UTC daily · roughly three hours after publish.'],
  ['Macro indicators', 'FRED · daily, weekly, or monthly depending on the reporting series.'],
  ['Market dominance', 'CoinMarketCap & CoinGecko · 04:00 UTC daily.'],
  ['Social & Trending', 'CoinGecko · on demand live query.'],
];

const LIMITS = [
  ['Zones, not signals', 'Indicators show where current readings sit relative to historical cycles. Shaded zones represent structural distribution, not financial advice or deterministic trade triggers.'],
  ['Structural lag', 'Most metrics reflect completed on-chain block settlement. Hashrate is estimated from difficulty and block timestamps rather than metered power.'],
  ['Lost coins', 'An estimated 3–4 million early coins are permanently dormant or lost. Their presence impacts realized cap calculations.'],
  ['Exchange custody', 'Large exchange internal wallet sweeps occasionally produce transient spikes in movement-based metrics.'],
];

const STACK = [
  ['Edge runtime', 'Cloudflare Pages and Workers. Static editorial pages, dynamic API routes, zero origin server.'],
  ['Database & cache', 'Cloudflare D1 SQL store with tiered Cloudflare edge caching.'],
  ['Client cache', 'Tab-scoped sessionStorage cache with automatic version invalidation.'],
  ['Interface', 'TypeScript, Next.js, and Recharts wrapped in an intentional warm ink design system.'],
];

const OPERATIONS = [
  ['Bitcoin (BTC)', '18d6ybiWceKC3QwAGveMUijVyBMbNvUZmd'],
  ['Monero (XMR)', '495CrEJ9p8CPn8YUiU5zv2MCjTuQ167cDR5F1ejrb5RRHzu8vTeUgJjY4kCMirkcP9VRFcBXKPXQN4XJpj35H7YmEqeHpU6'],
  ['Zcash (ZEC)', 'u1gjdr3v4tutx7g9jf045sxm35m380q2phsmnhvzs2sygwcxq0w79whuv0k8mksue6fk9k2x5dgt43knkqfjqt2rrf3kr48pkcqqflsux0uzkpkrul2eh4wyql00agn6rkuayw5zuuhf4ehaar8805a2acengl2hrgqzzmsczhlqrxm3l5'],
];

const POLICY_ITEMS = [
  ['Zero public accounts', 'There is no sign-up, no login, no profile, and no password to lose.'],
  ['Zero tracking scripts', 'No Google Analytics, Meta Pixel, tracking pixels, or invasive behavioral telemetry.'],
  ['Local session storage', 'Indicator responses are held in browser sessionStorage solely to prevent redundant network fetches.'],
  ['No financial advice', 'All content, metrics, and charts are provided strictly for research and analytical purposes.'],
];

const RELEASES = [
  {
    version: 'v1.0.0',
    date: 'October 2026',
    changes: [
      'Sentiment workspace with 15+ verified on-chain and macro indicators.',
      'D1-backed edge caching pipeline with automatic version invalidation.',
      'Unified single-page system reference consolidating docs, methodology, architecture, and policy.',
      'Zero-tracker, zero-account, ad-free public infrastructure.',
    ],
  },
];

export default function DocumentationPage() {
  return (
    <EditorialPage
      title="Documentation & Reference"
      standfirst="The complete reference for the NOVRIX workspace: how to navigate the indicators, where the data comes from, how it is calculated, and the operational principles governing the platform."
      width="820px"
    >
      <DocSection id="overview" title="Platform overview">
        <Prose>
          <P>NOVRIX is an autonomous on-chain and macroeconomic intelligence terminal. It reads blockchain behavior, market valuation, and macroeconomic conditions into a single unified analytical surface.</P>
          <P>The entire platform is accessible directly without an account, paywall, email registration, or tracking cookies.</P>
        </Prose>
      </DocSection>

      <DocSection id="workspace" title="Sentiment workspace & controls">
        <Prose>
          <P>The Sentiment page organizes quantitative metrics into panels. Each panel features a high-density interactive chart, latest numerical reading, and historical distribution zone.</P>
        </Prose>
        <div style={{ marginTop: '18px' }}>
          {CONTROLS.map(([label, body]) => (
            <DataRow key={label} label={label}>{body}</DataRow>
          ))}
        </div>
        <Prose style={{ marginTop: '18px' }}>
          <P>Keyboard navigation: <InlineCode>Tab</InlineCode> traverses interactive elements in DOM order; <InlineCode>Escape</InlineCode> minimizes any expanded chart panel.</P>
          <P>Viewports: The multi-panel Sentiment workspace requires a desktop screen (≥1024px) for legible side-by-side analysis. Editorial and documentation surfaces adapt to all screen sizes.</P>
        </Prose>
      </DocSection>

      <DocSection id="methodology" title="Quantitative methodology">
        <Prose>
          <P>All data is queried server-side and cached at the edge. Your browser connects only to our edge proxy, never directly contacting upstream data providers.</P>
        </Prose>
        <div style={{ marginTop: '18px' }}>
          {SOURCES.map(([name, desc]) => (
            <DataRow key={name} label={name}>{desc}</DataRow>
          ))}
        </div>
        <div style={{ marginTop: '22px' }}>
          {SCHEDULE.map(([label, value]) => (
            <DataRow key={label} label={label}>{value}</DataRow>
          ))}
        </div>
      </DocSection>

      <DocSection id="limitations" title="Structural limitations">
        <div style={{ marginTop: '12px' }}>
          {LIMITS.map(([title, body]) => (
            <DataRow key={title} label={title}>{body}</DataRow>
          ))}
        </div>
      </DocSection>

      <DocSection id="architecture" title="Architecture & stack">
        <div style={{ marginTop: '12px' }}>
          {STACK.map(([label, body]) => (
            <DataRow key={label} label={label}>{body}</DataRow>
          ))}
        </div>
      </DocSection>

      <DocSection id="operations" title="Operations & infrastructure">
        <Prose>
          <P>NOVRIX runs as an independent public intelligence project. The terminal is free, ad-free, and open source. If you wish to support node infrastructure and API costs, you can send crypto to the dedicated addresses below:</P>
        </Prose>
        <div style={{ marginTop: '18px' }}>
          {OPERATIONS.map(([coin, addr]) => (
            <DataRow key={coin} label={coin}>
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', wordBreak: 'break-all', userSelect: 'all' }}>
                {addr}
              </span>
            </DataRow>
          ))}
        </div>
      </DocSection>

      <DocSection id="policy" title="Data policy & disclaimers">
        <div style={{ marginTop: '12px' }}>
          {POLICY_ITEMS.map(([label, body]) => (
            <DataRow key={label} label={label}>{body}</DataRow>
          ))}
        </div>
      </DocSection>

      <DocSection id="changelog" title="Releases & changelog">
        <div style={{ marginTop: '16px' }}>
          {RELEASES.map(rel => (
            <div key={rel.version} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 700, fontSize: '14px', color: 'var(--text-heading)' }}>{rel.version}</span>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>{rel.date}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.6 }}>
                {rel.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DocSection>
    </EditorialPage>
  );
}
