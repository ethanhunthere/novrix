import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';
import Link from 'next/link';
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

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="mb-10 scroll-mt-16 sm:scroll-mt-20">
      <div className="flex items-start gap-3 mb-4">
        <span
          className="text-[8px] sm:text-[9px] tracking-[0.26em]"
          style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#475569' }}
        >
        </span>
        <div style={{ width: '1px', height: '14px', background: 'rgba(71,85,105,0.4)' }} />
        <h2
          className="min-w-0 flex-1 text-[13px] tracking-[0.18em] font-black leading-relaxed break-words"
          style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#CBD5E1' }}
        >
          {title}
        </h2>
      </div>
      <div
        className="p-4 sm:p-5"
        style={{
          background: 'linear-gradient(135deg, #040912 0%, #050A16 60%, #040810 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          contain: 'paint layout',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[12.5px] leading-relaxed mb-4 last:mb-0"
      style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.85 }}
    >
      {children}
    </p>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020508' }}>
      <Navbar />

      {/* Content */}
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-14 flex-1">
        <div className="max-w-3xl">

          <Section id="platform-access" title="PLATFORM ACCESS">
            <Para>
              NOVRIX grants you a non-exclusive, non-transferable right to access and use the platform for personal, non-commercial intelligence and research purposes. You may access the platform using your NOVRIX ID.
            </Para>
            <Para>
              We reserve the right to suspend or terminate access to any account, at any time, for any reason, without notice. Such action means the account ceases to function. We do not issue warnings or appeals.
            </Para>
            <Para>
              You must be at least 18 years old to use NOVRIX.
            </Para>
          </Section>

          <Section id="no-financial-advice" title="NO FINANCIAL ADVICE">
            <Para>
              Everything on NOVRIX — every chart, every indicator, every metric, every piece of data — is for informational purposes only. Nothing on this platform constitutes financial advice, investment advice, trading advice, or any other form of financial or professional advice.
            </Para>
            <Para>
              NOVRIX is an analytical intelligence infrastructure. The indicators displayed represent mathematical relationships derived from on-chain data. They do not predict prices. They do not guarantee outcomes. Past patterns in on-chain metrics do not guarantee future market behavior.
            </Para>
            <Para>
              You are solely responsible for your financial decisions. Consult a licensed financial professional before making investment decisions.
            </Para>
          </Section>

          <Section id="acceptable-use" title="ACCEPTABLE USE">
            <Para>You agree not to:</Para>
            <div className="space-y-2">
              {[
                'Attempt to reverse-engineer, scrape, or systematically extract platform data at scale',
                'Use automated tools to make requests that degrade platform performance for other users',
                'Attempt to circumvent authentication or access data belonging to other accounts',
                'Represent NOVRIX data as your own proprietary research without attribution',
                'Use the platform for any purpose that is illegal under applicable law',
                'Share your account credentials with others',
              ].map(item => (
                <div key={item} className="flex gap-2.5 items-start">
                  <span style={{ color: '#C2344D', fontSize: '8px', marginTop: '3px', flexShrink: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>✕</span>
                  <span
                    className="text-[11.5px]"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.7 }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="account-responsibility" title="ACCOUNT RESPONSIBILITY">
            <Para>
              Your account is identified by a NOVRIX ID. You are solely responsible for safeguarding this credential. NOVRIX has no recovery mechanism.
            </Para>
            <Para>
              If you lose your NOVRIX ID, the account is permanently inaccessible. We cannot help you.
            </Para>
            <Para>
              Store your NOVRIX ID securely.
            </Para>
          </Section>

          <Section id="intellectual-property" title="INTELLECTUAL PROPERTY">
            <Para>
              The NOVRIX platform — its interface, design, code architecture, and presentation — is proprietary. You may not reproduce, distribute, or create derivative works without explicit permission.
            </Para>
            <Para>
              The underlying on-chain data displayed is sourced from public blockchains and third-party data providers. This data is not proprietary to NOVRIX. Attribution to original sources is appropriate when referencing specific indicators.
            </Para>
            <Para>
              &quot;NOVRIX&quot; as a name and any associated wordmarks are not to be used without permission.
            </Para>
          </Section>

          <Section id="disclaimers" title="DISCLAIMERS AND LIMITATION OF LIABILITY">
            <Para>
              NOVRIX IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. WE MAKE NO WARRANTIES REGARDING ACCURACY, COMPLETENESS, TIMELINESS, OR FITNESS FOR ANY PARTICULAR PURPOSE.
            </Para>
            <Para>
              IN NO EVENT SHALL NOVRIX OR ITS OPERATORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING BUT NOT LIMITED TO FINANCIAL LOSSES, ARISING FROM YOUR USE OF OR INABILITY TO USE THE PLATFORM.
            </Para>
            <Para>
              On-chain data may be delayed, incomplete, or inaccurate. Data providers may experience outages, API changes, or data errors that affect the accuracy of metrics displayed on NOVRIX. We do not guarantee real-time accuracy of any data.
            </Para>
            <Para>
              Any legal claims would need to be addressed against the platform itself, which operates through Cloudflare&apos;s infrastructure. Jurisdictional questions are consequently complex.
            </Para>
          </Section>

          <Section id="modifications" title="MODIFICATIONS TO TERMS">
            <Para>
              These terms may be updated. The date at the top of this page indicates when they were last revised. Continued use of the platform after terms are updated constitutes acceptance of the new terms.
            </Para>
            <Para>
              Changes are posted on this page. Check back periodically.
            </Para>
          </Section>

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
              href="/about"
              className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.10em', textDecoration: 'none' }}
            >
              About NOVRIX →
            </Link>
          </div>
        </div>
      </div>

      <FooterHome />
    </div>
  );
}
