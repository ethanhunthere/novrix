import Link from 'next/link';
import Image from 'next/image';

const SANS = 'var(--ff-sans)';
const MONO = 'var(--ff-mono)';
const INK = '#F5F1EA';
const MUTED = 'rgba(245, 241, 234, 0.58)';
const FAINT = 'rgba(245, 241, 234, 0.46)';
const HAIRLINE = 'rgba(245, 241, 234, 0.08)';

const PLATFORM_NAV = [
  { label: 'Home', href: '/' },
  { label: 'Insights', href: '/insights' },
  { label: 'Terminal', href: '/terminal' },
  { label: 'Operations', href: '/donations' },
];

const INTEL_NAV = [
  { label: 'About', href: '/about' },
  { label: 'Documentation', href: '/documentation' },
  { label: 'Methodology', href: '/methodology' },
  { label: 'Changelog', href: '/changelog' },
];

const LEGAL_NAV = [
  { label: 'Data Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Disclaimers', href: '/terms#disclaimers' },
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
      <p
        style={{
          fontFamily: MONO,
          fontSize: '10.5px',
          fontWeight: 500,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: FAINT,
          margin: '0 0 16px',
        }}
      >
        {title}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {links.map((link) => (
          <li key={link.label}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
                style={{ fontFamily: SANS, fontSize: '14px', color: MUTED, textDecoration: 'none', letterSpacing: '0.005em' }}
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="footer-link"
                style={{ fontFamily: SANS, fontSize: '14px', color: MUTED, textDecoration: 'none', letterSpacing: '0.005em' }}
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
    <footer style={{ borderTop: `1px solid ${HAIRLINE}` }}>
      <style>{`
        .footer-link { transition: color 160ms ease; }
        .footer-link:hover { color: ${INK}; }
      `}</style>

      <div style={{ padding: 'clamp(48px, 6vw, 76px) var(--container-pad)' }}>
        <div
          className="mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10 lg:gap-12"
          style={{ maxWidth: '1180px' }}
        >
          <div>
            <Image
              src="/logo.png" alt=""
              width={30} height={30}
              className="w-[30px] h-[30px] block"
              style={{ pointerEvents: 'none' }}
            />
            <p style={{ color: MUTED, fontSize: '14px', lineHeight: 1.65, maxWidth: '280px', margin: '16px 0 0' }}>
              On-chain intelligence, read as one calm surface.
            </p>
          </div>

          <NavColumn title="Platform" links={PLATFORM_NAV} />
          <NavColumn title="Intelligence" links={INTEL_NAV} />
          <NavColumn title="Legal" links={LEGAL_NAV} />
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${HAIRLINE}` }}>
        <div
          className="mx-auto flex flex-col sm:flex-row justify-between gap-2"
          style={{
            maxWidth: '1180px',
            padding: '18px var(--container-pad)',
            color: FAINT,
            fontFamily: SANS,
            fontSize: '11.5px',
            letterSpacing: '0.01em',
          }}
        >
          <span>© All rights reserved.</span>
          <span>All data belongs to its respective owners.</span>
        </div>
      </div>
    </footer>
  );
}
