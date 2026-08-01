import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata = {
  title: 'NOVRIX - Changelog',
  description: 'NOVRIX development history. Platform releases, feature improvements, and architectural changes in reverse chronological order.',
  keywords: ['NOVRIX changelog', 'release notes', 'platform updates', 'feature history'],
  alternates: {
    canonical: 'https://novrix.io/changelog',
  },
  openGraph: {
    title: 'NOVRIX - Changelog',
    description: 'NOVRIX development history. Platform releases, feature improvements, and architectural changes in reverse chronological order.',
    url: 'https://novrix.io/changelog',
    images: defaultOgImages,
  },
  twitter: {
    title: 'NOVRIX - Changelog',
    description: 'NOVRIX development history. Platform releases, feature improvements, and architectural changes in reverse chronological order.',
    images: defaultTwitterImages,
  },
};

const ENTRIES = [ {
version: 'v1.0.0 — CURRENT (Closed Beta & Audit Phase)',
date: '2026·03',
tag: 'CURRENT',
tagColor: '#00FF88',
changes: [
  'Core Intelligence Modules: Deployed the primary analytical environments including Macro Sentiment, Whale Tracking with entity registry, and DeFi Metrilytics.',
  'Terminal Interface: Engineered a precision dark-mode terminal UI featuring advanced data visualization engines, including multi-channel layouts, depth spectrums, and dual Y-axis charting.',
  'Data Architecture: Established a globally distributed, low-latency infrastructure. Integrated automated data synchronization pipelines with fallback protocols to ensure uninterrupted market data integrity.',
  'Authentication: Implemented a NOVRIX ID account system with secure access keys and session management.',
  'Analytical Tooling: Introduced dynamic timeframe selectors, historical market markers, instant metric pre-loading, and high-fidelity chart export capabilities.',
  'Platform Documentation: Published the foundational platform framework, including Methodology, Privacy, Terms, and comprehensive operating documentation to support external auditing.'
]
}
]

export default function ChangelogPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020508' }}>
      <Navbar />

      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-14 flex-1">
        <div className="max-w-3xl">

          <div className="relative">
            {/* Timeline spine */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-2 bottom-2 w-px"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 80%, transparent 100%)' }}
            />

            <div className="space-y-8">
              {ENTRIES.map((entry, idx) => (
                <div key={entry.version} className="flex gap-6">
                  {/* Timeline node */}
                  <div className="flex flex-col items-center shrink-0" style={{ width: '16px' }}>
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 mt-1.5"
                      style={{
                        background: idx === 0 ? entry.tagColor : 'rgba(30,42,68,0.9)',
                        border: `1px solid ${idx === 0 ? entry.tagColor + '60' : 'rgba(71,85,105,0.3)'}`,
                        boxShadow: idx === 0 ? `0 0 10px ${entry.tagColor}50` : 'none',
                      }}
                    />
                  </div>

                  {/* Entry content */}
                  <div className="min-w-0 flex-1 pb-2">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span
                        className="min-w-0 text-[15px] sm:text-[18px] font-black tracking-[0.08em] break-words"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#E2E8F0' }}
                      >
                        {entry.version}
                      </span>
                      <span
                        className="text-[9px] sm:text-[10px] tracking-[0.20em] px-2 py-0.5 font-black"
                        style={{
                          fontFamily: 'Inter, system-ui, sans-serif',
                          color: entry.tagColor,
                          border: `1px solid ${entry.tagColor}35`,
                          background: `${entry.tagColor}0A`,
                        }}
                      >
                        {entry.tag}
                      </span>
                      <span
                        className="text-[9px] sm:text-[10px] tracking-[0.14em]"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#334155' }}
                      >
                        {entry.date}
                      </span>
                    </div>

                    {/* Changes */}
                    <div
                      className="p-4 sm:p-5 lg:p-6"
                      style={{
                        background: idx === 0
                          ? 'linear-gradient(135deg, #040912 0%, #050A16 60%, #040810 100%)'
                          : 'rgba(4,9,18,0.6)',
                        border: `1px solid ${idx === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)'}`,
                        contain: 'paint layout',
                      }}
                    >
                      <ul className="space-y-2.5">
                        {entry.changes.map(change => (
                          <li key={change} className="flex gap-2.5 items-start">
                            <span
                              style={{
                                color: idx === 0 ? '#00FF88' : '#475569',
                                fontSize: 'clamp(8px, 1.2vw, 11px)',
                                marginTop: '3px',
                                flexShrink: 0,
                                fontFamily: 'Inter, system-ui, sans-serif',
                              }}
                            >
                              {idx === 0 ? '▸' : '·'}
                            </span>
                            <span
                              className="text-[12px] leading-relaxed"
                              style={{
                                fontFamily: 'Inter, system-ui, sans-serif',
                                color: idx === 0 ? '#94A3B8' : '#64748B',
                                lineHeight: 1.75,
                              }}
                            >
                              {change}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <FooterHome />
    </div>
  );
}
