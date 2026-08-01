'use client';

function RedactionBars({ accent = '#C2344D' }: { accent?: string }) {
  return (
    <div className="space-y-3">
      {[
        ['68%', 'rgba(255,255,255,0.12)'],
        ['92%', 'rgba(0,0,0,0.72)'],
        ['54%', 'rgba(255,255,255,0.10)'],
        ['78%', 'rgba(0,0,0,0.78)'],
      ].map(([width, color], i) => (
        <div key={`${width}-${i}`} className="h-2 overflow-hidden" style={{ width, background: color }}>
          <div
            className="h-full"
            style={{
              width: i % 2 === 0 ? '42%' : '28%',
              background: accent,
              opacity: i % 2 === 0 ? 0.45 : 0.18,
              animation: `revealWidth ${2.8 + i * 0.25}s ease-in-out infinite alternate`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function ClearanceSeal({ accent = '#C2344D' }: { accent?: string }) {
  return (
    <div className="relative aspect-square w-48 sm:w-64 2xl:w-80 3xl:w-96 4xl:w-[28rem] mx-auto">
      <div className="absolute inset-0 rounded-full border" style={{ borderColor: `${accent}55`, animation: 'orbitalSpin 80s linear infinite' }} />
      <div className="absolute inset-5 rounded-full border" style={{ borderColor: 'rgba(255,255,255,0.12)', animation: 'orbitalSpinReverse 64s linear infinite' }} />
      <div className="absolute inset-10 rounded-full border border-dashed" style={{ borderColor: `${accent}44` }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-24 sm:w-32 2xl:w-40 3xl:w-48 aspect-square rotate-45 border" style={{ borderColor: `${accent}80`, boxShadow: `0 0 70px ${accent}22` }}>
          <div className="absolute inset-5 border" style={{ borderColor: 'rgba(255,255,255,0.14)' }} />
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ background: `linear-gradient(180deg, transparent, ${accent}, transparent)` }} />
          <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
        </div>
      </div>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
        <div className="text-[10px] sm:text-xs 2xl:text-sm 3xl:text-base font-mono uppercase tracking-[0.36em]" style={{ color: '#F4F7FA' }}>NOVRIX</div>
        <div className="mt-2 text-[8px] sm:text-[9px] 2xl:text-xs 3xl:text-sm font-mono uppercase tracking-[0.28em]" style={{ color: 'rgba(255,255,255,0.42)' }}>private brief</div>
      </div>
    </div>
  );
}

export default function DossierBoard() {
  return (
    <div className="relative min-h-[420px] sm:min-h-[480px] md:min-h-[540px] lg:min-h-[620px] 2xl:min-h-[720px] 3xl:min-h-[800px] 4xl:min-h-[900px] overflow-hidden border px-4 sm:px-8 lg:px-10 2xl:px-14 3xl:px-20 4xl:px-28 pt-12 sm:pt-16 2xl:pt-20 3xl:pt-24 4xl:pt-32 pb-6 sm:pb-10 2xl:pb-12 3xl:pb-16 4xl:pb-20" style={{ borderColor: 'rgba(255,255,255,0.085)', background: 'linear-gradient(135deg, rgba(13,16,22,0.96), rgba(3,5,10,0.98))' }}>
      <div className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)`,
          backgroundSize: '42px 42px',
          maskImage: 'linear-gradient(180deg, transparent, black 18%, black 80%, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, black 18%, black 80%, transparent)',
        }}
      />
      <div className="absolute inset-x-7 top-7 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(194,52,77,0.75), transparent)' }} />
      <div className="absolute inset-x-7 bottom-7 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,200,238,0.42), transparent)' }} />
      <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
        <span className="font-mono text-[10px] sm:text-[9px] 2xl:text-xs 3xl:text-sm uppercase tracking-[0.28em]" style={{ color: 'rgba(255,255,255,0.36)' }}>market brief</span>
        <span className="font-mono text-[10px] sm:text-[9px] 2xl:text-xs 3xl:text-sm uppercase tracking-[0.28em]" style={{ color: '#C2344D' }}>private</span>
      </div>
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6 2xl:gap-10 3xl:gap-14 4xl:gap-20 items-stretch">
        <div className="relative border p-4 sm:p-7 2xl:p-10 3xl:p-14 4xl:p-20 flex flex-col justify-between min-h-[260px] sm:min-h-[320px] md:min-h-[380px] 2xl:min-h-[480px] 3xl:min-h-[560px] 4xl:min-h-[640px]" style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.026)' }}>
          <div>
            <div className="flex items-center justify-between gap-4 mb-8">
              <span className="font-mono text-[10px] sm:text-[9px] 2xl:text-xs 3xl:text-sm uppercase tracking-[0.24em]" style={{ color: '#AAB6C5' }}>what matters</span>
              <span className="h-2 w-2 rotate-45" style={{ background: '#C2344D', boxShadow: '0 0 18px rgba(194,52,77,0.55)' }} />
            </div>
            <h3 className="font-black leading-[0.96] tracking-tight text-2xl sm:text-3xl md:text-4xl lg:text-5xl 2xl:text-6xl 3xl:text-7xl 4xl:text-8xl" style={{ color: '#F7F8FA' }}>
              Keep the work focused on what actually matters.
            </h3>
            <p className="mt-6 leading-relaxed" style={{ fontSize: "var(--text-body-lg)", color: 'rgba(218,228,240,0.70)' }}>
              Novrix keeps the facts close, the screen calm, and the next step easy to find when something starts to matter.
            </p>
          </div>
          <div className="mt-10">
            <RedactionBars />
            <div className="mt-7 flex flex-wrap gap-2">
              {['private notes', 'clean context', 'chain signal'].map((tag) => (
                <span key={tag} className="font-mono text-[10px] sm:text-[9px] 2xl:text-xs 3xl:text-sm uppercase tracking-[0.18em] px-3 py-2 2xl:px-4 2xl:py-2.5 3xl:px-5 3xl:py-3 border" style={{ color: '#AAB6C5', borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.20)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden border p-4 sm:p-7 2xl:p-10 min-h-[240px] sm:min-h-[300px] md:min-h-[420px] 2xl:min-h-[480px] 3xl:min-h-[560px] flex items-center justify-center" style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'linear-gradient(180deg, rgba(0,200,238,0.035), rgba(194,52,77,0.035))' }}>
          <div className="absolute inset-0 opacity-[0.26]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 9px, rgba(255,255,255,0.045) 10px)' }} />
          <div className="absolute left-0 right-0 h-px" style={{ top: '36%', background: 'linear-gradient(90deg, transparent, rgba(194,52,77,0.75), transparent)', animation: 'scanDown 7s linear infinite' }} />
          <ClearanceSeal />
          <div className="absolute left-5 bottom-5 right-5">
            <RedactionBars accent="#00C8EE" />
          </div>
        </div>
      </div>
    </div>
  );
}
