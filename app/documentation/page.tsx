import { EditorialPage, DocSection, Prose, P, DataRow, InlineCode, PageLinks } from '@/components/layout/EditorialPage';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata = {
  title: 'NOVRIX - Documentation',
  description: 'How to use NOVRIX: sentiment module navigation, chart controls, and indicator interpretation.',
  keywords: ['NOVRIX documentation', 'crypto analytics guide', 'how to use NOVRIX', 'sentiment tutorial'],
  alternates: {
    canonical: 'https://novrix.io/documentation',
  },
  openGraph: {
    title: 'NOVRIX - Documentation',
    description: 'How to use NOVRIX: sentiment module navigation, chart controls, and indicator interpretation.',
    url: 'https://novrix.io/documentation',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Documentation',
    description: 'How to use NOVRIX: sentiment module navigation, chart controls, and indicator interpretation.',
    images: defaultTwitterImages,
  },
};

const CONTROLS = [
  ['Timeframe', 'Every panel switches between 1W, 1M, 6M, 1Y, 4Y, and ALL. The default is 1Y.'],
  ['Price overlay', 'The PRICE toggle adds BTC price on a secondary log-scale axis so the indicator and price share one frame.'],
  ['Maximize', 'The expand control fills most of the viewport with one panel. Escape, or a click outside, returns to the grid.'],
  ['Export', 'The camera control captures that panel as a PNG. The NOVRIX watermark is left out of the export.'],
  ['Halving markers', 'On 4Y and ALL, Bitcoin halvings appear as vertical reference lines.'],
  ['Zone bands', 'Shaded bands mark each indicator’s historical zones. Green marks the lower or bullish range, red the upper or bearish range. Thresholds live in Methodology.'],
  ['Registry', 'The left sidebar lists every indicator with its current zone state. Selecting a row jumps to that panel.'],
];

const PARTNERS = [
  ['BGeometrics', 'Bitcoin on-chain metrics and historical series.'],
  ['FRED', 'Federal Reserve Economic Data: rates, inflation, money supply, employment, and yields.'],
  ['Alternative.me', 'Crypto Fear & Greed Index.'],
  ['CoinGecko', 'Market prices, dominance inputs, and trending assets.'],
  ['CoinMarketCap', 'Market capitalization and dominance.'],
];

export default function DocumentationPage() {
  return (
    <EditorialPage
      title="Documentation"
      standfirst="How the sentiment workspace is organized, what each control changes, and where the numbers come from."
    >
      <DocSection title="Overview">
        <Prose>
          <P>NOVRIX reads crypto market sentiment through on-chain and macro indicators, presented as one surface.</P>
          <P>Data is aggregated from established providers, cached at the edge, and served without an account or onboarding step.</P>
        </Prose>
      </DocSection>

      <DocSection title="The workspace">
        <Prose>
          <P>The Sentiment page holds a registry of indicator panels. Each panel has one chart, a current reading, and a zone state derived from the thresholds in Methodology.</P>
          <P>Panels are grouped by what they measure: valuation, profitability, holder behavior, supply, miners, market structure, and macro. The registry mirrors those groups.</P>
        </Prose>
      </DocSection>

      <DocSection title="Controls">
        <div>
          {CONTROLS.map(([label, body]) => (
            <DataRow key={label} label={label}>{body}</DataRow>
          ))}
        </div>
      </DocSection>

      <DocSection title="Pointer and keyboard">
        <Prose>
          <P>Every control is a button with a visible label or tooltip. Tab reaches the controls in reading order and the focus ring is visible.</P>
          <P><InlineCode>Escape</InlineCode> closes a maximized panel. There are no hidden global shortcuts; navigation is the browser’s own.</P>
        </Prose>
      </DocSection>

      <DocSection title="Screen requirement">
        <Prose>
          <P>The workspace needs a viewport of 1024px or wider so charts and controls stay legible. Below that width the page explains the requirement and returns you home.</P>
          <P>Editorial pages, including this one, work from 375px up.</P>
        </Prose>
      </DocSection>

      <DocSection title="Data partners">
        <div>
          {PARTNERS.map(([name, desc]) => (
            <DataRow key={name} label={name}>{desc}</DataRow>
          ))}
        </div>
        <Prose style={{ marginTop: '18px' }}>
          <P>Data belongs to its respective owners. NOVRIX aggregates and presents it for analytical purposes only.</P>
        </Prose>
      </DocSection>

      <DocSection title="Reading the numbers">
        <Prose>
          <P>Zone colors are interpretive guides, not trade signals. They show where a value sits relative to its historical range. The Methodology page covers thresholds, update schedules, and structural limitations.</P>
        </Prose>
      </DocSection>

      <PageLinks items={[{ label: 'Methodology', href: '/methodology' }, { label: 'Changelog', href: '/changelog' }]} />
    </EditorialPage>
  );
}
