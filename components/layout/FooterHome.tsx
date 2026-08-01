import Link from 'next/link';

const INTER = 'var(--font-inter), Inter, system-ui, sans-serif';
const MONO  = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';


const PLATFORM_NAV = [
  { label: 'Home',     href: '/' },
  { label: 'Insights', href: '/insights' },
  { label: 'Terminal', href: '/terminal' },
  { label: 'Operations', href: '/donations' },
];

const INTEL_NAV = [
  { label: 'About',         href: '/about' },
  { label: 'Documentation', href: '/documentation' },
  { label: 'Methodology',   href: '/methodology' },
  { label: 'Changelog',     href: '/changelog' },
];

const LEGAL_NAV = [
  { label: 'Data Policy',   href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Disclaimers',      href: '/terms#disclaimers' },
];


function NavColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      {/* Column header — mono, tracking, intentionally technical */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', justifyContent: 'center' }}>
        <div style={{ width: '12px', height: '1px', background: 'rgba(100,116,139,0.5)', flexShrink: 0 }} />
        <span style={{ fontFamily: MONO, fontSize: '13px', letterSpacing: '0.22em', fontWeight: 700, color: '#475569' }}>
          {title}
        </span>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        {links.map(link => (
          <li key={link.label}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors duration-100 flex items-center gap-1.5 no-underline"
                style={{ fontFamily: INTER, fontSize: '16px', textDecoration: 'none', letterSpacing: '0.01em' }}
              >
                {link.label}
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35, flexShrink: 0 }}>
                  <path d="M1 9L9 1M9 1H3M9 1V7" />
                </svg>
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors duration-100"
                style={{ fontFamily: INTER, fontSize: '16px', textDecoration: 'none', display: 'block', letterSpacing: '0.01em' }}
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}


export default function FooterHome() {
  return (
    <footer
      className="mt-auto"
      style={{
        background: 'transparent',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Footer divider ────────────────────────────── */}
      <div
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(194,52,77,0.25) 20%, rgba(194,52,77,0.4) 50%, rgba(194,52,77,0.25) 80%, transparent 100%)',
        }}
      />

      {/* ── Main body ────────────────────────────────────────────── */}
      <div className="max-w-[1800px] 3xl:max-w-[2200px] 4xl:max-w-[2800px] mx-auto px-6 lg:px-10 xl:px-16 2xl:px-24 3xl:px-32 4xl:px-48 py-10 2xl:py-14 3xl:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-10 2xl:gap-14 place-items-center text-center">
          <NavColumn title="PLATFORM"     links={PLATFORM_NAV} />
          <NavColumn title="INTELLIGENCE" links={INTEL_NAV} />
          <NavColumn title="LEGAL"        links={LEGAL_NAV} />
        </div>
      </div>


      {/* ── Bottom bar ────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-[1800px] 3xl:max-w-[2200px] 4xl:max-w-[2800px] mx-auto px-6 lg:px-10 xl:px-16 2xl:px-24 3xl:px-32 4xl:px-48 py-4">
          <div className="flex justify-center items-center">
            <span style={{ fontFamily: INTER, fontSize: '11px', color: '#475569', letterSpacing: '0.02em' }}>
              All data belongs to its respective owners.
            </span>
          </div>
        </div>
      </div>

    </footer>
  );
}
