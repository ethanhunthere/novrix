import { EditorialPage, DocSection, Prose, P, PageLinks } from '@/components/layout/EditorialPage';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata = {
  title: 'NOVRIX - Terms of Service',
  description: 'Terms of service governing access to and use of NOVRIX intelligence infrastructure, data usage, and operator responsibilities.',
  keywords: ['NOVRIX terms', 'terms of service', 'usage policy'],
  alternates: {
    canonical: 'https://novrix.io/terms',
  },
  openGraph: {
    title: 'NOVRIX - Terms of Service',
    description: 'Terms of service governing access to and use of NOVRIX intelligence infrastructure, data usage, and operator responsibilities.',
    url: 'https://novrix.io/terms',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Terms of Service',
    description: 'Terms of service governing access to and use of NOVRIX intelligence infrastructure, data usage, and operator responsibilities.',
    images: defaultTwitterImages,
  },
};

export default function TermsPage() {
  return (
    <EditorialPage
      title="Terms of Service"
      standfirst="The terms that govern access to NOVRIX. Last revised October 2026."
    >
      <DocSection id="platform-access" title="Platform access">
        <Prose>
          <P>NOVRIX grants you a non-exclusive, non-transferable right to access and use the platform for personal, non-commercial intelligence and research purposes.</P>
          <P>There is no account to create. Access is direct and does not require a credential.</P>
          <P>You must be at least 18 years old to use NOVRIX.</P>
          <P>We may suspend or withdraw access to the platform at any time, for any reason, without notice.</P>
        </Prose>
      </DocSection>

      <DocSection id="no-financial-advice" title="No financial advice">
        <Prose>
          <P>Everything on NOVRIX — every chart, indicator, metric, and dispatch — is informational only. Nothing here constitutes financial, investment, trading, or professional advice.</P>
          <P>The indicators are mathematical relationships derived from on-chain data. They do not predict prices and do not guarantee outcomes. Past patterns do not guarantee future behavior.</P>
          <P>You are solely responsible for your financial decisions. Consult a licensed professional before making investment decisions.</P>
        </Prose>
      </DocSection>

      <DocSection id="acceptable-use" title="Acceptable use">
        <Prose>
          <P>You agree not to:</P>
        </Prose>
        <ul style={{ margin: '14px 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            'Reverse-engineer, scrape, or systematically extract platform data at scale',
            'Use automated tools to make requests that degrade performance for other users',
            'Attempt to access administrative areas or data that is not public',
            'Represent NOVRIX data as your own proprietary research without attribution',
            'Use the platform for any purpose that is illegal under applicable law',
          ].map(item => (
            <li key={item} style={{ fontFamily: 'var(--ff-sans)', fontSize: '15px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {item}
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection id="intellectual-property" title="Intellectual property">
        <Prose>
          <P>The NOVRIX platform — its interface, design, code architecture, and presentation — is proprietary. You may not reproduce, distribute, or create derivative works without explicit permission.</P>
          <P>The underlying on-chain data comes from public blockchains and third-party providers. It is not proprietary to NOVRIX. Attribution to the original source is appropriate when referencing a specific indicator.</P>
          <P>“NOVRIX” and any associated wordmarks may not be used without permission.</P>
        </Prose>
      </DocSection>

      <DocSection id="disclaimers" title="Disclaimers and limitation of liability">
        <Prose>
          <P>NOVRIX IS PROVIDED “AS IS” WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. WE MAKE NO WARRANTIES REGARDING ACCURACY, COMPLETENESS, TIMELINESS, OR FITNESS FOR ANY PARTICULAR PURPOSE.</P>
          <P>IN NO EVENT SHALL NOVRIX OR ITS OPERATORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING FINANCIAL LOSSES, ARISING FROM YOUR USE OF OR INABILITY TO USE THE PLATFORM.</P>
          <P>On-chain data may be delayed, incomplete, or inaccurate. Providers may experience outages, API changes, or data errors that affect what is displayed. We do not guarantee real-time accuracy.</P>
          <P>Any legal claim would need to be addressed against the platform itself, which operates through Cloudflare’s infrastructure. Jurisdictional questions are consequently complex.</P>
        </Prose>
      </DocSection>

      <DocSection id="modifications" title="Modifications to terms">
        <Prose>
          <P>These terms may be updated. The revision date above identifies the current version. Continued use of the platform after an update constitutes acceptance of the new terms.</P>
          <P>Changes are posted on this page. Check back periodically.</P>
        </Prose>
      </DocSection>

      <PageLinks items={[{ label: 'Data Policy', href: '/privacy' }, { label: 'About NOVRIX', href: '/about' }]} />
    </EditorialPage>
  );
}
