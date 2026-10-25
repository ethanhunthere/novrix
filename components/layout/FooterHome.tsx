import Link from 'next/link';
import Image from 'next/image';

const SANS = 'var(--ff-sans)';
const INK = '#FAF7F2';
const MUTED = '#C5BEB3';
const HAIRLINE = 'rgba(250, 247, 242, 0.12)';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Sentiment', href: '/sentiment' },
  { label: 'Insights', href: '/insights' },
  { label: 'Documentation', href: '/documentation' },
];

export default function FooterHome() {
  return (
    <footer style={{ borderTop: `1px solid ${HAIRLINE}` }}>
      <style>{`
        .footer-link { transition: color 160ms ease; }
        .footer-link:hover { color: ${INK}; }
      `}</style>

      <div style={{ padding: 'clamp(40px, 5vw, 60px) var(--container-pad)' }}>
        <div
          className="mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8"
          style={{ maxWidth: '1180px' }}
        >
          <div className="flex items-center gap-3.5">
            <Image
              src="/logo.png" alt=""
              width={26} height={26}
              className="w-[26px] h-[26px] block"
              style={{ pointerEvents: 'none' }}
            />
            <p style={{ color: MUTED, fontSize: '13.5px', fontFamily: SANS, margin: 0 }}>
              On-chain intelligence, read as one calm surface.
            </p>
          </div>

          <nav>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="footer-link"
                    style={{ fontFamily: SANS, fontSize: '13.5px', color: MUTED, textDecoration: 'none' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
