import { EditorialPage, DocSection, Prose, P, DataRow, PageLinks } from '@/components/layout/EditorialPage';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata = {
  title: 'NOVRIX - Data Policy',
  description: 'NOVRIX data collection practices, account security, and operator responsibilities.',
  keywords: ['NOVRIX data policy', 'account security', 'data collection'],
  alternates: {
    canonical: 'https://novrix.io/privacy',
  },
  openGraph: {
    title: 'NOVRIX - Data Policy',
    description: 'NOVRIX data collection practices, account security, and operator responsibilities.',
    url: 'https://novrix.io/privacy',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Data Policy',
    description: 'NOVRIX data collection practices, account security, and operator responsibilities.',
    images: defaultTwitterImages,
  },
};

export default function PrivacyPage() {
  return (
    <EditorialPage
      title="Data Policy"
      standfirst="No accounts, no analytics, no advertising cookies. This page lists the small amount of data the product does handle."
    >
      <DocSection id="accounts" title="Accounts">
        <Prose>
          <P>NOVRIX has no public accounts. There is no sign-up, no login, no profile, and no credential to lose.</P>
          <P>The private admin surface accepts a password to publish dispatches. It does not create a user account or store a session cookie.</P>
        </Prose>
      </DocSection>

      <DocSection id="stored-data" title="What is stored">
        <div>
          <DataRow label="Browser cache">Indicator responses are held in <code style={{ fontFamily: 'var(--ff-mono)' }}>sessionStorage</code> for up to one hour to avoid repeat fetches. The cache is scoped to the tab and clears when it closes.</DataRow>
          <DataRow label="Edge cache">Public on-chain and market data is cached at the edge. It contains no personal association.</DataRow>
          <DataRow label="Editorial store">Dispatch text, titles, images, and author links live in Cloudflare D1. No reader data is stored there.</DataRow>
          <DataRow label="Analytics">None. There is no analytics script, pixel, or third-party tag.</DataRow>
        </div>
      </DocSection>

      <DocSection id="cookies" title="Cookies">
        <Prose>
          <P>NOVRIX sets no cookies for public visitors. There is no consent banner because there is nothing to consent to.</P>
          <P>The admin password is held in page memory only and is sent with each publish request. It is not written to a cookie or to local storage.</P>
        </Prose>
      </DocSection>

      <DocSection id="third-parties" title="Third parties">
        <Prose>
          <P>Cloudflare provides DNS, content delivery, and network-level protection. Their infrastructure logs may include IP addresses and request metadata as part of normal CDN operation. NOVRIX does not receive or access those logs.</P>
          <P>Data provider APIs are queried server-side. Your browser never contacts BGeometrics, FRED, Alternative.me, CoinGecko, or CoinMarketCap directly, and those requests contain no user-identifying information.</P>
        </Prose>
      </DocSection>

      <DocSection id="retention" title="Retention">
        <div>
          <DataRow label="Browser cache">Up to one hour, or until the tab closes.</DataRow>
          <DataRow label="Edge cache">Per-response cache lifetime set by each API route.</DataRow>
          <DataRow label="Application logs">Ephemeral request logs emitted by Cloudflare Workers. Not retained by NOVRIX.</DataRow>
        </div>
      </DocSection>

      <DocSection id="contact" title="Contact">
        <Prose>
          <P>NOVRIX does not list public social channels on this site. For infrastructure or data corrections, use the repository linked from the project.</P>
        </Prose>
      </DocSection>

      <PageLinks items={[{ label: 'Terms of Service', href: '/terms' }, { label: 'About NOVRIX', href: '/about' }]} />
    </EditorialPage>
  );
}
