import { EditorialPage, DocSection, Prose, P, DataRow, PageLinks } from '@/components/layout/EditorialPage';
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

const LIMITS = [
  ['Not an advisor', 'Nothing here is financial advice. On-chain metrics are analytical tools, not trading signals. Past patterns do not predict future performance.'],
  ['Not a trading platform', 'NOVRIX does not execute trades, custody assets, or connect to an exchange. It is a reading surface.'],
  ['Not a data broker', 'There are no accounts and no user profiles. Nothing is sold or shared.'],
];

const STACK = [
  ['Edge runtime', 'Cloudflare Pages and Workers. Static editorial pages, dynamic API routes, no origin server.'],
  ['Editorial store', 'Cloudflare D1 holds dispatch metadata, body text, and author links.'],
  ['Cache', 'Edge cache with a session-scoped browser cache; stale responses trigger a live fetch before display.'],
  ['On-chain data', 'BGeometrics for Bitcoin on-chain metrics.'],
  ['Market data', 'CoinGecko and CoinMarketCap for prices, dominance, and trending assets.'],
  ['Macro data', 'FRED for rates, inflation, money supply, employment, and yields.'],
];

const PARTNERS = [
  ['BGeometrics', 'Comprehensive Bitcoin on-chain analytics and historical data.'],
  ['FRED', 'Macroeconomic indicators and financial data.'],
  ['Alternative.me', 'Crypto Fear & Greed Index.'],
  ['CoinGecko', 'Cryptocurrency market data, prices, and trending assets.'],
  ['CoinMarketCap', 'Market capitalization and dominance data.'],
];

export default function AboutPage() {
  return (
    <EditorialPage
      title="About"
      standfirst="An on-chain and macro reading surface, built to be used without an account."
    >
      <DocSection title="What NOVRIX is">
        <Prose>
          <P>NOVRIX is a crypto sentiment workspace. It reads on-chain and macro indicators as one calm surface, with the sources and limits stated in plain language.</P>
          <P>It also publishes two editorial formats: Our View and Deep Dive. No aggregator feed, no recycled headlines, no account wall.</P>
        </Prose>
      </DocSection>

      <DocSection title="What NOVRIX is not">
        <div>
          {LIMITS.map(([label, body]) => (
            <DataRow key={label} label={label}>{body}</DataRow>
          ))}
        </div>
      </DocSection>

      <DocSection title="The philosophy">
        <Prose>
          <P>Intelligence should be readable without a sales call.</P>
          <P>The product stays free, open source, and free of ads. There is no sign-up, no paywall, and no analytics script watching the reading column.</P>
          <P>The interface should make the data legible, not make the operator feel busy. One accent, one reading measure, one place for the numbers.</P>
        </Prose>
      </DocSection>

      <DocSection title="The stack">
        <div>
          {STACK.map(([label, body]) => (
            <DataRow key={label} label={label}>{body}</DataRow>
          ))}
        </div>
      </DocSection>

      <DocSection title="Data partners">
        <div>
          {PARTNERS.map(([name, desc]) => (
            <DataRow key={name} label={name}>{desc}</DataRow>
          ))}
        </div>
        <Prose style={{ marginTop: '18px' }}>
          <P>All trademarks and data belong to their respective owners. NOVRIX aggregates and presents this data for analytical purposes only.</P>
        </Prose>
      </DocSection>

      <PageLinks items={[{ label: 'Data Policy', href: '/privacy' }, { label: 'Methodology', href: '/methodology' }]} />
    </EditorialPage>
  );
}
