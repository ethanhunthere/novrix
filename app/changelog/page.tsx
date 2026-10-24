import { EditorialPage, Prose, P, PageLinks } from '@/components/layout/EditorialPage';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata = {
  title: 'NOVRIX - Changelog',
  description: 'NOVRIX development history. Platform releases, feature improvements, and architectural changes in reverse chronological order.',
  keywords: ['NOVRIX changelog', 'release notes', 'platform updates', 'feature history'],
  alternates: {
    canonical: 'https://novrix.io/changelog',
  },
  openGraph: {
    title: 'NOVRIX - Changelog',
    description: 'NOVRIX development history. Platform releases, feature improvements, and architectural changes in reverse chronological order.',
    url: 'https://novrix.io/changelog',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Changelog',
    description: 'NOVRIX development history. Platform releases, feature improvements, and architectural changes in reverse chronological order.',
    images: defaultTwitterImages,
  },
};

const RELEASES = [
  {
    version: 'v1.0.0',
    date: 'October 2026',
    tag: 'Current',
    changes: [
      ['Sentiment workspace', 'On-chain, macro, and market-structure indicators with shared timeframe control, BTC price overlay, panel maximize, PNG export, halving markers, and zone bands.'],
      ['Editorial', 'Two dispatch formats, Our View and Deep Dive, stored in Cloudflare D1 and served by the posts API. The aggregator news feed and its cron worker were removed.'],
      ['Access', 'Direct access. No accounts, no paywall, no ads, no analytics. The sentiment workspace requires a 1024px viewport; editorial pages work on mobile.'],
      ['Data', 'BGeometrics, FRED, Alternative.me, CoinGecko, and CoinMarketCap behind an edge cache with a stale-response fallback.'],
      ['Documentation', 'Methodology, controls documentation, data policy, and terms rewritten to match the shipped product.'],
      ['Design', 'One warm ink system across every public surface, with a single crimson accent and a calm reading measure.'],
      ['Infrastructure', 'Static export on Cloudflare Pages with dynamic API routes on Workers.'],
    ],
  },
];

export default function ChangelogPage() {
  return (
    <EditorialPage
      title="Changelog"
      standfirst="What shipped, in reverse order. No roadmap, no announcements."
    >
      <div style={{ marginTop: 'clamp(40px, 5vw, 56px)' }}>
        {RELEASES.map(release => (
          <article key={release.version}>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <h2
                style={{
                  fontFamily: 'var(--ff-display)',
                  fontSize: 'clamp(24px, 2.6vw, 30px)',
                  fontWeight: 500,
                  letterSpacing: '-0.015em',
                  color: 'var(--text-heading)',
                  margin: 0,
                }}
              >
                {release.version}
              </h2>
              <span
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent-bright)',
                  border: '1px solid var(--border-accent)',
                  padding: '3px 8px',
                }}
              >
                {release.tag}
              </span>
              <span
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.06em',
                  color: 'var(--text-secondary)',
                }}
              >
                {release.date}
              </span>
            </div>

            <div style={{ marginTop: '28px' }}>
              {release.changes.map(([label, body]) => (
                <div
                  key={label}
                  className="grid grid-cols-1 sm:grid-cols-[168px_1fr] gap-1 sm:gap-6"
                  style={{ padding: '14px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'start' }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: '10.5px',
                      fontWeight: 500,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.7,
                      paddingTop: '2px',
                    }}
                  >
                    {label}
                  </span>
                  <p
                    style={{
                      fontFamily: 'var(--ff-sans)',
                      fontSize: '15px',
                      lineHeight: 1.7,
                      color: 'var(--text-secondary)',
                      margin: 0,
                    }}
                  >
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <Prose style={{ marginTop: '32px' }}>
        <P>Earlier builds were internal and are not listed. The changelog starts when the platform became public.</P>
      </Prose>

      <PageLinks items={[{ label: 'Documentation', href: '/documentation' }, { label: 'About', href: '/about' }]} />
    </EditorialPage>
  );
}
