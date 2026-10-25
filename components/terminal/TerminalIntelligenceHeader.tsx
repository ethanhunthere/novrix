import type { ReactNode } from 'react';

export type TerminalIntelligenceHeaderProps = {
  sectionLabel: string;
  title: string;
  subtitle: string;
  accent: string;
  accentDark: string;
  background: string;
  clock: ReactNode;
};

export default function TerminalIntelligenceHeader({
  sectionLabel,
  title,
  subtitle,
  accent,
  accentDark,
  background,
  clock,
}: TerminalIntelligenceHeaderProps) {
  return (
    <div className="mb-5 -mx-4 lg:-mx-6 xl:-mx-8 2xl:-mx-10 relative" style={{ background, borderBottom: '1px solid var(--border-default)' }}>
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${accentDark} 0%, ${accent} 50%, ${accentDark} 100%)` }} />

      <div className="px-4 lg:px-6 xl:px-8 2xl:px-10 pt-[14px] pb-0">
        <div className="flex items-center gap-0 mb-1.5">
          <span style={{ fontFamily: 'var(--ff-sans), sans-serif', fontSize: '11px', fontWeight: 400, letterSpacing: '0.02em', color: 'rgba(245,241,234,0.40)', textTransform: 'uppercase' }}>NOVRIX</span>
          <span className="mx-2" style={{ fontFamily: 'var(--ff-sans), sans-serif', fontSize: '11px', color: 'rgba(245,241,234,0.28)' }}>·</span>
          <span style={{ fontFamily: 'var(--ff-sans), sans-serif', fontSize: '11px', fontWeight: 400, letterSpacing: '0.02em', color: 'rgba(245,241,234,0.40)', textTransform: 'uppercase' }}>INTELLIGENCE</span>
          <span className="mx-2" style={{ fontFamily: 'var(--ff-sans), sans-serif', fontSize: '11px', color: 'rgba(245,241,234,0.28)' }}>·</span>
          <span style={{ fontFamily: 'var(--ff-sans), sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em', color: 'rgba(245,241,234,0.72)', textTransform: 'uppercase' }}>{sectionLabel}</span>
          <div className="ml-4 h-px flex-1" style={{ background: `linear-gradient(90deg, ${accentDark}4D 0%, transparent 60%)` }} />
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex items-stretch gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 style={{ fontFamily: 'var(--ff-sans), sans-serif', fontSize: '19px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-heading)', lineHeight: 1 }}>{title}</h1>
              </div>
              <p style={{ fontFamily: 'var(--ff-sans), sans-serif', fontSize: '12px', fontWeight: 400, color: 'rgba(245,241,234,0.56)', letterSpacing: '0.01em', margin: 0, lineHeight: 1.45 }}>{subtitle}</p>
            </div>
          </div>

          <div className="flex items-stretch gap-1 shrink-0">
            <div className="text-right px-2" style={{ borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="mb-0.5" style={{ fontFamily: 'var(--ff-mono), monospace', fontSize: '9px', letterSpacing: '0.12em', color: 'rgba(245,241,234,0.42)', textTransform: 'uppercase' }}>SYS &middot; CLOCK &middot; UTC</div>
              {clock}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2" style={{ height: '1px', background: 'var(--border-subtle)' }} />
    </div>
  );
}
