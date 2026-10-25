import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';

const SANS = 'var(--ff-sans)';
const DISPLAY = 'var(--ff-display)';
const MONO = 'var(--ff-mono)';
const INK = 'var(--text-heading)';
const BODY = 'var(--text-secondary)';
const RULE = 'var(--border-subtle)';
const ACCENT = 'var(--accent-novrix)';

type EditorialPageProps = {
  title: string;
  standfirst?: string;
  children: React.ReactNode;
  width?: string;
};

export function EditorialPage({ title, standfirst, children, width = '760px' }: EditorialPageProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#120F0D' }}>
      <Navbar />
      <main style={{ flex: 1, width: '100%' }}>
        <div
          className="mx-auto w-full max-w-[760px] 3xl:max-w-[1000px] 4xl:max-w-[1300px] 5xl:max-w-[1600px] min-w-0"
          style={{
            padding: 'clamp(44px, 6vw, 104px) var(--container-pad) clamp(64px, 8vw, 128px)',
          }}
        >
          <header>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontSize: 'clamp(24px, 4.8vw, 64px)',
                fontWeight: 500,
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                color: INK,
                margin: 0,
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                textWrap: 'balance',
              }}
            >
              {title}
            </h1>
            {standfirst && (
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: 'clamp(14px, 1.3vw, 19px)',
                  lineHeight: 1.65,
                  color: BODY,
                  maxWidth: 'min(100%, 64ch)',
                  margin: '20px 0 0',
                  overflowWrap: 'break-word',
                }}
              >
                {standfirst}
              </p>
            )}
          </header>
          <div style={{ height: '1px', background: RULE, margin: 'clamp(32px, 4vw, 44px) 0 0' }} />
          {children}
        </div>
      </main>
      <FooterHome />
    </div>
  );
}

export function DocSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: '84px', marginTop: 'clamp(40px, 5vw, 60px)', minWidth: 0 }}>
      <div style={{ height: '1px', background: RULE, marginBottom: '22px' }} />
      <h2
        style={{
          fontFamily: DISPLAY,
          fontSize: 'clamp(20px, 2.2vw, 32px)',
          fontWeight: 500,
          lineHeight: 1.2,
          letterSpacing: '-0.012em',
          color: INK,
          margin: '0 0 18px',
          overflowWrap: 'break-word',
          textWrap: 'balance',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Prose({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: SANS,
        fontSize: 'clamp(14px, 1.05vw, 17px)',
        lineHeight: 1.8,
        color: BODY,
        maxWidth: 'min(100%, 72ch)',
        overflowWrap: 'break-word',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, overflowWrap: 'break-word' }}>{children}</p>;
}

export function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-[168px_1fr] 3xl:grid-cols-[220px_1fr] 4xl:grid-cols-[280px_1fr] gap-1 sm:gap-6 min-w-0"
      style={{ padding: '12px 0', borderBottom: `1px solid ${RULE}`, alignItems: 'start', overflowWrap: 'break-word' }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: '10.5px',
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
          paddingTop: '2px',
          overflowWrap: 'break-word',
        }}
      >
        {label}
      </span>
      <div style={{ fontFamily: SANS, fontSize: 'clamp(13.5px, 1vw, 16px)', lineHeight: 1.7, color: BODY, minWidth: 0, overflowWrap: 'break-word' }}>{children}</div>
    </div>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: MONO,
        fontSize: '0.86em',
        color: 'var(--text-primary)',
        background: 'var(--bg-raised)',
        border: `1px solid ${RULE}`,
        padding: '1px 5px',
        overflowWrap: 'anywhere',
      }}
    >
      {children}
    </code>
  );
}

export function PageLinks({ items }: { items: { label: string; href: string }[] }) {
  return (
    <>
      <style>{`
        .editorial-link { border-bottom: 1px solid transparent; transition: color 160ms var(--ease-standard), border-color 160ms var(--ease-standard); }
        .editorial-link:hover { color: ${ACCENT}; border-bottom-color: ${ACCENT}; }
        .editorial-link:focus-visible { outline: 1px solid ${ACCENT}; outline-offset: 4px; }
        @media (prefers-reduced-motion: reduce) { .editorial-link { transition: none; } }
      `}</style>
      <div
        className="flex flex-wrap items-center gap-x-7 gap-y-3"
        style={{ marginTop: 'clamp(48px, 6vw, 64px)', paddingTop: '24px', borderTop: `1px solid ${RULE}` }}
      >
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="editorial-link"
            style={{ fontFamily: SANS, fontSize: '13.5px', color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </>
  );
}
