import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';
import Link from 'next/link';
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

function PolicySection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="mb-10 scroll-mt-16 sm:scroll-mt-20">
      <div className="flex items-start gap-3 mb-4">
        <span
          className="text-[8px] sm:text-[9px] tracking-[0.26em]"
          style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#475569' }}
        >
        </span>
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

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 items-start mb-3 last:mb-0">
      <span className="text-[8.5px] tracking-[0.14em] font-bold pt-0.5" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#475569' }}>{label}</span>
      <span className="text-[11.5px] leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94A3B8', lineHeight: 1.7 }}>{value}</span>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020508' }}>
      <Navbar />

      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-14 flex-1">
        <div className="max-w-3xl">

          <PolicySection id="data-stored" title="DATA WE STORE">
            <Para>Account creation requires only a NOVRIX ID issued at signup.</Para>
            <Item
              label="SESSION TOKEN"
              value="A cryptographic cookie stored in your browser. Required to maintain your authenticated session. Expires after 30 days of inactivity. Contains only a session identifier."
            />
            <Para>That is everything stored that is associated with your account.</Para>
          </PolicySection>

          <PolicySection id="account-security" title="ACCOUNT SECURITY">
            <Para>
              Account creation requires only a NOVRIX ID issued at signup.
            </Para>
            <Para>
              Your NOVRIX ID is the only credential. We have no mechanism to recover it if lost.
            </Para>
            <Para>
              Your account is stored as: the NOVRIX ID, a created-at timestamp, and a last-active timestamp.
            </Para>
            <div
              className="p-4 mt-3"
              style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}
            >
              <p
                className="text-[11px]"
                style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#64748B', lineHeight: 1.7 }}
              >
                <strong style={{ color: '#94A3B8' }}>Account recovery is not possible.</strong> If you lose your NOVRIX ID, the account cannot be recovered. There is no recovery mechanism.
              </p>
            </div>
          </PolicySection>

          <PolicySection id="data-retention" title="DATA RETENTION">
            <Item label="SESSION TOKENS" value="Expire after 30 days of inactivity. Invalidated immediately on logout." />
            <Item label="ACCOUNT RECORDS" value="Retained while the account is active. No automatic deletion schedule." />
            <Item label="APPLICATION LOGS" value="No application-level logs are retained beyond what Cloudflare Workers emit during request processing. These are ephemeral and not stored." />
            <Item label="ON-CHAIN DATA CACHE" value="Public blockchain data (indicator history, price data) is stored in our edge data cache. This is public data with no personal association." />
            <Para>We do not run scheduled log retention or deletion jobs because we do not produce application logs that require retention.</Para>
          </PolicySection>

          <PolicySection id="third-parties" title="THIRD PARTIES">
            <Para>
              NOVRIX uses one infrastructure provider: Cloudflare. They handle DNS resolution, content delivery, and DDoS protection at the network layer. We have no control over their infrastructure-level logs, which may include IP addresses and request metadata as part of standard CDN operation.
            </Para>
            <Para>
              Cloudflare&apos;s data policy governs what they collect at the network level. We do not receive this data and have no access to it.
            </Para>
            <Para>
              Data source APIs are queried server-side by NOVRIX infrastructure. Your browser never contacts these APIs directly. These requests contain no user-identifying information.
            </Para>
          </PolicySection>

          <PolicySection id="cookies" title="COOKIES">
            <Para>NOVRIX uses exactly one cookie:</Para>
            <Item
              label="nvrix-session"
              value="Session authentication token. HttpOnly, Secure, SameSite=Strict. Set on login. Cleared on logout or after 30 days. Contains a session identifier."
            />
          </PolicySection>

          <PolicySection id="contact" title="CONTACT">
            <Para>
              NOVRIX does not list public social channels on this website.
            </Para>
          </PolicySection>

          <div
            className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <Link
              href="/terms"
              className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.10em', textDecoration: 'none' }}
            >
              Terms of Service →
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
