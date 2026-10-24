import { EditorialPage, DocSection, Prose, P, DataRow, PageLinks } from '@/components/layout/EditorialPage';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata = {
  title: 'NOVRIX - Methodology',
  description: 'Data sources, update frequencies, and interpretation guidance for all NOVRIX on-chain metrics. How we calculate sentiment data.',
  keywords: ['NOVRIX methodology', 'on-chain metrics explained', 'crypto indicator definitions', 'data sources', 'analytics methodology'],
  alternates: {
    canonical: 'https://novrix.io/methodology',
  },
  openGraph: {
    title: 'NOVRIX - Methodology',
    description: 'Data sources, update frequencies, and interpretation guidance for all NOVRIX on-chain metrics. How we calculate sentiment data.',
    url: 'https://novrix.io/methodology',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Methodology',
    description: 'Data sources, update frequencies, and interpretation guidance for all NOVRIX on-chain metrics. How we calculate sentiment data.',
    images: defaultTwitterImages,
  },
};

const SOURCES = [
  ['BGeometrics', 'Bitcoin on-chain metrics: valuation, supply, holder behavior, miners, and network health. Full history from 2013, updated daily.'],
  ['FRED', 'Macroeconomic indicators: policy rates, inflation, money supply, employment, GDP, and treasury yields.'],
  ['Alternative.me', 'Fear & Greed Index composite score from 0 to 100, with daily history from 2018.'],
  ['CoinMarketCap', 'BTC and ETH market dominance percentages, updated daily.'],
  ['CoinGecko', 'Market capitalization history, spot prices, and trending assets.'],
];

const SCHEDULE = [
  ['On-chain metrics', 'BGeometrics · 04:00 UTC daily · roughly one hour after the provider publishes'],
  ['Fear & Greed', 'Alternative.me · 04:00 UTC daily · roughly three hours after publish'],
  ['Macro indicators', 'FRED · daily, weekly, or monthly depending on the series'],
  ['Market dominance', 'CoinMarketCap and CoinGecko · 04:00 UTC daily'],
  ['Social sentiment', 'CoinGecko · on demand'],
  ['Trending assets', 'CoinGecko · on demand'],
];

const GUIDANCE = [
  ['Zones, not signals', 'Each indicator is divided into zones based on historical thresholds and drawn as shaded bands. Green marks the lower or bullish range; red marks the upper or bearish range. A value in a bearish zone means the metric is in a range that has historically correlated with bearish conditions, not that price will fall.'],
  ['Lag is structural', 'Most metrics reflect yesterday’s on-chain activity. Network hashrate is estimated rather than measured directly. Realized cap depends on UTXO age assumptions, including assumptions about lost coins.'],
  ['Exchange custody', 'Large exchange wallets move coins in ways that can trigger false signals. Movement-based metrics are especially sensitive to exchange operations.'],
  ['Read in combination', 'No single indicator should drive a decision. Each captures a different dimension of market structure; the useful reading is where several agree.'],
  ['Known signals decay', 'Historical accuracy is backward-looking. Markets adapt, and widely followed signals become less useful as they are traded.'],
];

const LIMITS = [
  ['Lost coins', 'An estimated several million BTC are permanently lost. Their presence affects realized cap and other valuation readings.'],
  ['Provider lag', 'BGeometrics publishes with a one to two day lag. The 04:00 UTC refresh means the freshest point is usually yesterday’s.'],
  ['Spot only', 'These are on-chain spot metrics. Derivatives dynamics such as basis, funding, and open interest are separate dimensions.'],
  ['No forecast', 'Nothing on this page predicts price. The indicators describe current structure relative to historical ranges.'],
];

export default function MethodologyPage() {
  return (
    <EditorialPage
      title="Methodology"
      standfirst="Where the data comes from, when it refreshes, and what the indicators can and cannot tell you."
      width="820px"
    >
      <DocSection id="data-sources" title="Data sources">
        <Prose>
          <P>NOVRIX aggregates data from a small set of providers. Each source is queried server-side; your browser never contacts these APIs directly.</P>
        </Prose>
        <div style={{ marginTop: '18px' }}>
          {SOURCES.map(([name, desc]) => (
            <DataRow key={name} label={name}>{desc}</DataRow>
          ))}
        </div>
      </DocSection>

      <DocSection id="update-schedule" title="Update schedule">
        <div>
          {SCHEDULE.map(([label, value]) => (
            <DataRow key={label} label={label}>{value}</DataRow>
          ))}
        </div>
        <Prose style={{ marginTop: '18px' }}>
          <P>If a provider has not refreshed inside its expected window when a module loads, the platform attempts a live fetch before serving the cached response.</P>
        </Prose>
      </DocSection>

      <DocSection id="interpretation" title="Interpretation guidance">
        <Prose>
          <P>On-chain metrics are useful analytical tools with known structural limits. These principles govern how NOVRIX presents them.</P>
        </Prose>
        <div style={{ marginTop: '18px' }}>
          {GUIDANCE.map(([title, body]) => (
            <DataRow key={title} label={title}>{body}</DataRow>
          ))}
        </div>
      </DocSection>

      <DocSection id="limitations" title="Limitations">
        <div>
          {LIMITS.map(([title, body]) => (
            <DataRow key={title} label={title}>{body}</DataRow>
          ))}
        </div>
      </DocSection>

      <DocSection id="credits" title="Acknowledgments">
        <Prose>
          <P>NOVRIX would not exist without the work of BGeometrics, FRED, Alternative.me, CoinGecko, and CoinMarketCap. All trademarks and data belong to their respective owners.</P>
        </Prose>
      </DocSection>

      <PageLinks items={[{ label: 'Documentation', href: '/documentation' }, { label: 'Sentiment module', href: '/sentiment' }]} />
    </EditorialPage>
  );
}
