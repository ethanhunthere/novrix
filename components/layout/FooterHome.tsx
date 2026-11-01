import Link from 'next/link';
import Image from 'next/image';

const SANS = 'var(--ff-sans)';
const INK = '#FAF7F2';
const MUTED = '#C5BEB3';
const HAIRLINE = 'rgba(250, 247, 242, 0.12)';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Sentiment', href: '/sentiment' },
  { label: 'Documentation', href: '/documentation' },
];

export default function FooterHome() {
  return (
    <footer
      style={{
        background: '#120F0D',
        borderTop: `1px solid ${HAIRLINE}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{ padding: 'clamp(12px, 1.5vh, 18px) var(--container-pad)' }}>
        <div
          className="mx-auto w-full max-w-[1240px] 2xl:max-w-[1440px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6 min-w-0"
        >
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png" alt="Novrix"
              width={22} height={22}
              className="w-[20px] h-[20px] block"
              style={{ pointerEvents: 'none' }}
            />
            <p style={{ color: MUTED, fontSize: '12.5px', fontFamily: SANS, margin: 0 }}>
              On-chain intelligence terminal
            </p>
          </div>

          <nav>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[#C5BEB3] hover:text-[#FAF7F2] transition-colors duration-160 text-[12.5px]"
                    style={{ fontFamily: SANS, textDecoration: 'none' }}
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
