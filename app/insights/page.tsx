'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════════════════
   RESPONSIVE BREAKPOINTS
   xs < 375  |  sm 375-639  |  md 640-767  |  lg 768-1023
   xl 1024-1439  |  2xl 1440-1919  |  3xl 1920-2559  |  4xl >= 2560
   ═══════════════════════════════════════════════════════════════════════ */

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('xl');
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w < 375) setBp('xs');
      else if (w < 640) setBp('sm');
      else if (w < 768) setBp('md');
      else if (w < 1024) setBp('lg');
      else if (w < 1440) setBp('xl');
      else if (w < 1920) setBp('2xl');
      else if (w < 2560) setBp('3xl');
      else setBp('4xl');
    };
    check();
    let t: ReturnType<typeof setTimeout>;
    const debounced = () => { clearTimeout(t); t = setTimeout(check, 120); };
    window.addEventListener('resize', debounced);
    return () => { window.removeEventListener('resize', debounced); clearTimeout(t); };
  }, []);
  return bp;
}

/* Convenience helpers derived from breakpoint */
function useIsMobile() {
  const bp = useBreakpoint();
  return bp === 'xs' || bp === 'sm';
}

function useIsNarrow() {
  const bp = useBreakpoint();
  return bp === 'xs' || bp === 'sm' || bp === 'md' || bp === 'lg';
}

function useIsTablet() {
  const bp = useBreakpoint();
  return bp === 'md' || bp === 'lg';
}

function useIsSmallPhone() {
  const bp = useBreakpoint();
  return bp === 'xs';
}

import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

interface Article {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  source_name: string;
  category: string;
  published_at: string;
  image_url: string | null;
}

interface AuthorLink {
  platform: string;
  url: string;
}

interface NovrixPost {
  id: string;
  title: string;
  content: string;
  images: string[];
  cover_image?: string | null;
  author_links?: AuthorLink[];
  category: string;
  author: string;
  published_at: string;
  slug: string;
}

/* ═══════════════════════════════════════════════════════════════════════
   CATEGORY CONFIG
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Category accent colors ────────────────────────────── */
const CAT_COLORS = {
  'novrix-view' : '#d4af37',
  'privacy-watch': '#14b8a6',
  'right-group' : '#3b82f6',
} as const;

const CAT: Record<string, { color: string; label: string; accentBg: string }> = {
  latest: { color: '#ffffff', label: 'All', accentBg: 'rgba(255,255,255,0.06)' },
  crypto: { color: '#ffffff', label: 'Crypto', accentBg: 'rgba(255,255,255,0.06)' },
  macro:  { color: '#ffffff', label: 'Macro', accentBg: 'rgba(255,255,255,0.06)' },
};

const SOURCE_LABELS: Record<string, string> = {
  cointelegraph: 'Cointelegraph',
  'investing.com': 'Investing',
};

function sourceLabel(name: string): string {
  return SOURCE_LABELS[name.toLowerCase()] ?? name;
}

const ALLOWED_NEWS_SOURCE_KEYS = new Set([
  'cointelegraph',
  'investingcom',
]);

function sourceKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function visibleNewsArticles(articles: Article[]): Article[] {
  return articles.filter(article => ALLOWED_NEWS_SOURCE_KEYS.has(sourceKey(article.source_name)));
}

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

function stripHtml(raw: string): string {
  const stripped = raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/<[^>]*$/, '')
    // Strip markdown syntax
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // [text](url)
    .replace(/^#{1,6}\s+/gm, '')          // ## headings
    .replace(/^>\s?/gm, '')               // > blockquotes
    .replace(/^[-*]\s+/gm, '')            // - list items
    .replace(/\*\*([^*]+)\*\*/g, '$1')    // **bold**
    .replace(/\*([^*]+)\*/g, '$1')        // *italic*
    .replace(/---/g, '')                   // horizontal rule
    .replace(/\s{2,}/g, ' ')
    .trim();
  return stripped
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g,          (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(diff / 86_400_000);
  return `${days}d`;
}

function applyTimeFilter(articles: Article[], filter: 'all' | 'today' | 'week'): Article[] {
  if (filter === 'all') return articles;
  const now = Date.now();
  const cutoff = filter === 'today' ? now - 86_400_000 : now - 7 * 86_400_000;
  return articles.filter(a => new Date(a.published_at).getTime() >= cutoff);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function readTime(article: Article): string {
  const words = ((article.title ?? '') + ' ' + (article.summary ?? '')).replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min`;
}

function isVeryNew(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 3 * 60 * 1000;
}

/* ═══════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════════════ */

const INTER = 'var(--font-inter), Inter, system-ui, sans-serif';
const MONO  = 'var(--font-jetbrains-mono), "JetBrains Mono", monospace';
const BG = '#08080c';

function NewsReadArticleCta({ hovered, compact = false }: { hovered: boolean; compact?: boolean }) {
  return (
    <span style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: compact ? '7px' : '9px',
      width: 'fit-content',
      paddingBottom: compact ? '4px' : '5px',
      fontFamily: MONO,
      fontSize: compact ? '10px' : '11px',
      fontWeight: 700,
      letterSpacing: compact ? '0.12em' : '0.14em',
      color: hovered ? '#f8fafc' : '#94a3b8',
      textTransform: 'uppercase',
      transform: hovered ? 'translateX(2px)' : 'translateX(0)',
      transition: 'color 0.3s ease, transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    }}>
      <span>Read article</span>
      <span style={{
        display: 'inline-block',
        transform: hovered ? 'translateX(5px)' : 'translateX(0)',
        transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}>
        →
      </span>
      <span aria-hidden="true" style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '1px',
        background: 'linear-gradient(90deg, rgba(248,250,252,0.85), rgba(148,163,184,0.08))',
        opacity: hovered ? 1 : 0.45,
        transform: hovered ? 'scaleX(1)' : 'scaleX(0.35)',
        transformOrigin: 'left center',
        transition: 'opacity 0.3s ease, transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }} />
    </span>
  );
}

function safeExternalHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    const isHttp = url.protocol === 'https:' || url.protocol === 'http:';
    const isExternalHost = url.hostname.includes('.') || url.hostname === 'localhost';
    return isHttp && isExternalHost ? url.href : null;
  } catch {
    return null;
  }
}

function AuthorLinkLabels({ links, compact = false }: { links?: AuthorLink[]; compact?: boolean }) {
  const visible = (links ?? [])
    .map(link => ({ platform: link.platform.trim(), url: safeExternalHref(link.url) }))
    .filter((link): link is { platform: string; url: string } => Boolean(link.platform && link.url));

  if (visible.length === 0) return null;

  return (
    <span style={{
      position: 'relative',
      zIndex: 3,
      display: 'inline-flex',
      alignItems: 'center',
      gap: compact ? '6px' : '8px',
      flexWrap: 'wrap',
      pointerEvents: 'auto',
    }}>
      {visible.map(link => (
        <a
          key={`${link.platform}-${link.url}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            fontFamily: MONO,
            fontSize: compact ? '10px' : '11px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: '#93c5fd',
            textDecoration: 'none',
            textTransform: 'uppercase',
            border: '1px solid rgba(147,197,253,0.18)',
            background: 'rgba(147,197,253,0.06)',
            borderRadius: '999px',
            padding: compact ? '3px 8px' : '4px 10px',
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
        >
          {link.platform}
        </a>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION CONFIG
   ═══════════════════════════════════════════════════════════════════════ */

const NEWS_SECTIONS     = ['latest', 'crypto', 'macro'] as const;
const ANALYSIS_SECTIONS = ['novrix-view', 'privacy-watch'] as const;
const NAV_SECTIONS = ['novrix-view', 'privacy-watch', 'latest', 'crypto', 'macro'] as const;

const SECTION_LABELS: Record<string, string> = {
  latest: 'Latest',
  crypto: 'Crypto',
  macro: 'Macro',
  'novrix-view': 'Our View',
  'privacy-watch': 'Deep Dive',
};

/* ═══════════════════════════════════════════════════════════════════════
   PREMIUM HEADER  —  Editorial masthead
   ═══════════════════════════════════════════════════════════════════════ */

function InsightsHeader({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) {
  const bp = useBreakpoint();
  const isNarrow = useIsNarrow();
  const isMobile = useIsMobile();
  const [isFocused, setIsFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { queueMicrotask(() => setMounted(true)); }, []);

  /* Responsive values keyed by breakpoint */
  const padX = bp === 'xs' ? '12px' : bp === 'sm' ? '16px' : bp === 'md' ? '20px' : bp === 'lg' ? '24px' : bp === 'xl' ? '32px' : '40px';
  const padTop = bp === 'xs' ? '20px' : bp === 'sm' ? '24px' : bp === 'md' ? '28px' : bp === 'lg' ? '32px' : bp === 'xl' ? '36px' : '40px';
  const contentPadY = bp === 'xs' ? '16px 0 16px' : bp === 'sm' ? '20px 0 20px' : bp === 'md' ? '24px 0 24px' : bp === 'lg' ? '28px 0 28px' : '32px 0 32px';
  const heroGap = bp === 'xs' ? '20px' : bp === 'sm' ? '24px' : bp === 'md' ? '32px' : bp === 'lg' ? '40px' : '48px';
  const heroFont = bp === 'xs' ? '20px' : bp === 'sm' ? '24px' : bp === 'md' ? '28px' : bp === 'lg' ? '32px' : bp === 'xl' ? '36px' : bp === '2xl' ? '40px' : bp === '3xl' ? '42px' : '44px';
  const subFont = bp === 'xs' ? '14px' : bp === 'sm' ? '15px' : bp === 'md' ? '16px' : '18px';

  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#07090f',
      }}
    >
      {/* ─── Background layers — cold, subtle, designed ─── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 60% 50% at 40% 0%, rgba(59,130,246,0.04) 0%, transparent 70%),
          radial-gradient(ellipse 50% 40% at 80% 100%, rgba(20,184,166,0.02) 0%, transparent 60%),
          radial-gradient(ellipse 40% 30% at 20% 80%, rgba(148,163,184,0.015) 0%, transparent 60%),
          repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.004) 59px, rgba(255,255,255,0.004) 60px, transparent 60px),
          repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.003) 59px, rgba(255,255,255,0.003) 60px, transparent 60px)
        `,
        opacity: mounted ? 1 : 0,
        transition: 'opacity 1.4s ease',
        pointerEvents: 'none',
      }} />

      {/* ─── Main content ─── */}
      <div style={{
        position: 'relative',
        padding: `0 ${padX}`,
      }}>
        <div style={{
          maxWidth: bp === '4xl' ? '1800px' : '1400px',
          margin: '0 auto',
          paddingTop: padTop,
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}>
          {/* ─── Main content ─── */}
          <div style={{
            padding: contentPadY,
            display: 'flex',
            gap: heroGap,
            flexDirection: isNarrow ? 'column' : 'row',
            alignItems: isNarrow ? 'stretch' : 'center',
          }}>
            {/* LEFT — Editorial masthead */}
            <div style={{
              flex: 1,
              minWidth: 0,
            }}>
              <div style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
                transitionDelay: '0.1s',
              }}>
                <h1 style={{
                  fontFamily: INTER,
                  fontSize: heroFont,
                  lineHeight: 1.35,
                  color: '#f1f5f9',
                  margin: 0,
                  maxWidth: '760px',
                  fontWeight: 600,
                  letterSpacing: '-0.015em',
                }}>
                  Everything worth reading about crypto and macro in one place.
                </h1>

                <p style={{
                  fontFamily: INTER,
                  fontSize: subFont,
                  lineHeight: 1.6,
                  color: '#475569',
                  margin: '16px 0 0',
                  maxWidth: '600px',
                  fontWeight: 400,
                }}>
                  News feeds and original analysis side by side.
                </p>
              </div>
            </div>

            {/* RIGHT — Search */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              width: isNarrow ? '100%' : '340px',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.9s ease, transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
              transitionDelay: isNarrow ? '0.1s' : '0.9s',
            }}>
              {/* Search */}
              <div style={{
                position: 'relative',
              }}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isFocused ? '#94a3b8' : '#4a5568'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    transition: 'stroke 0.25s ease',
                    zIndex: 1,
                  }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  style={{
                    width: '100%',
                    background: isFocused
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${
                      isFocused
                        ? 'rgba(148,163,184,0.25)'
                        : 'rgba(255,255,255,0.06)'
                    }`,
                    borderRadius: '12px',
                    padding: '11px 38px 11px 42px',
                    fontFamily: INTER,
                    fontSize: '14px',
                    color: '#e2e8f0',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                  }}
                />
                <kbd style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontFamily: MONO,
                  fontSize: '9px',
                  color: '#4a5568',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  lineHeight: 1.4,
                  pointerEvents: 'none',
                  display: isMobile ? 'none' : 'block',
                }}>
                  ⌘K
                </kbd>
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: isMobile ? '12px' : '44px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.05)',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      fontSize: '14px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      lineHeight: 1,
                      transition: 'background 0.2s',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── Bottom decorative rule ─── */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, rgba(148,163,184,0.06) 0%, rgba(255,255,255,0.04) 50%, rgba(148,163,184,0.06) 100%)',
            marginTop: isMobile ? '20px' : (isNarrow ? '28px' : '36px'),
          }} />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CATEGORY NAVIGATION
   ═══════════════════════════════════════════════════════════════════════ */

function Tab({ section, isActive, onSelect, bp }: { section: string; isActive: boolean; onSelect: (s: string) => void; bp: string }) {
  return (
    <button
      onClick={() => onSelect(section)}
      style={{
        position: 'relative',
        background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: 'none',
        padding: bp === 'xs' ? '12px 8px 10px' : bp === 'sm' ? '14px 10px 12px' : bp === 'md' ? '14px 12px 12px' : bp === 'lg' ? '16px 16px 14px' : '20px 28px 18px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
        borderRadius: '8px',
        transition: 'background 0.25s ease',
      }}
    >
      {/* Label */}
      <span style={{
        fontFamily: INTER,
        fontSize: bp === 'xs' ? '12px' : bp === 'sm' ? '13px' : bp === 'md' ? '13px' : bp === 'lg' ? '14px' : '14px',
        fontWeight: isActive ? 600 : 500,
        color: isActive ? '#ffffff' : '#475569',
        letterSpacing: '0.02em',
        transition: 'color 0.2s ease',
        whiteSpace: 'nowrap',
      }}>
        {SECTION_LABELS[section]}
      </span>

      {/* Active indicator — clean bottom line */}
      {isActive && (
        <div style={{
          position: 'absolute',
          bottom: '4px',
          left: '20%',
          right: '20%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
          borderRadius: '1px',
        }} />
      )}
    </button>
  );
}

function CategoryNav({
  activeSection,
  setActiveSection,
}: {
  activeSection: string;
  setActiveSection: (s: string) => void;
}) {
  const bp = useBreakpoint();
  const isMobile = useIsMobile();

  return (
    <div style={{
      background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.015) 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      position: 'relative',
    }}>
      {/* Fade edges for scroll hint */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        background: `
          linear-gradient(90deg, #07090f 0%, transparent ${bp === 'xs' ? '6px' : bp === 'sm' ? '8px' : '12px'}, transparent calc(100% - ${bp === 'xs' ? '6px' : bp === 'sm' ? '8px' : '12px'}), #07090f 100%)
        `,
      }} />
      
      <div style={{
        maxWidth: bp === '4xl' ? '1800px' : '1400px',
        margin: '0 auto',
        padding: bp === 'xs' ? '0 12px' : bp === 'sm' ? '0 16px' : bp === 'md' ? '0 20px' : bp === 'lg' ? '0 24px' : bp === 'xl' ? '0 32px' : '0 40px',
      }}>
        <div className="scrollbar-hide" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Our View + Privacy Coins — Left group */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Tab section="novrix-view" isActive={activeSection === 'novrix-view'} onSelect={setActiveSection} bp={bp} />
            <Tab section="privacy-watch" isActive={activeSection === 'privacy-watch'} onSelect={setActiveSection} bp={bp} />
          </div>

          {/* Spacer */}
          <div style={{ flex: 1, minWidth: bp === 'xs' ? '8px' : bp === 'sm' ? '12px' : bp === 'md' ? '24px' : bp === 'lg' ? '32px' : '48px' }} />

          {/* News categories — Right group */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: bp === 'xs' ? '2px' : bp === 'sm' ? '4px' : bp === 'md' ? '16px' : bp === 'lg' ? '24px' : 'clamp(24px, 4vw, 64px)',
            flexShrink: 0,
          }}>
            {NAV_SECTIONS.filter(s => s !== 'novrix-view' && s !== 'privacy-watch').map(section => (
              <Tab key={section} section={section} isActive={activeSection === section} onSelect={setActiveSection} bp={bp} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EDITORIAL BODY — Complete visual rebuild
   ═══════════════════════════════════════════════════════════════════════ */

/* ── HERO ARTICLE — Cinematic full-width feature ─────────────────────── */

function HeroCard({ article, isNew }: { article: Article; isNew?: boolean }) {
  const cat = CAT[article.category] ?? CAT.crypto;
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const clean = article.summary ? stripHtml(article.summary) : null;
  const showImage = !!article.image_url && !imgFailed;
  const bp = useBreakpoint();
  const isNarrow = useIsNarrow();

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        position: 'relative',
        width: '100%',
        textDecoration: 'none',
        borderRadius: '20px',
        overflow: 'hidden',
        background: '#0a0a12',
        border: '1px solid rgba(255,255,255,0.05)',
        transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.5s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 32px 64px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 8px 24px -8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)',
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'xs' || bp === 'sm' || bp === 'md' ? '1fr' : '1.4fr 1fr',
        minHeight: bp === 'xs' || bp === 'sm' || bp === 'md' ? 'auto' : bp === 'lg' ? '400px' : bp === 'xl' ? '440px' : '480px',
      }}>
        {/* Image Side */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: bp === 'xs' ? '180px' : bp === 'sm' ? '200px' : bp === 'md' ? '220px' : bp === 'lg' ? '400px' : bp === 'xl' ? '440px' : '480px',
        }}>
          {showImage ? (
            <img
              src={article.image_url!}
              alt=""
              loading="eager"
              decoding="async"
              onError={() => setImgFailed(true)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 30%',
                transform: hovered ? 'scale(1.06)' : 'scale(1)',
                transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
            />

        ) : (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(135deg, ${cat.color}10 0%, #0a0a12 100%)`,
            }} />
          )}

          {/* Gradient overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: bp === 'xs' || bp === 'sm' || bp === 'md'
              ? 'linear-gradient(to top, rgba(10,10,18,0.98) 0%, rgba(10,10,18,0.5) 50%, transparent 100%)'
              : 'linear-gradient(to right, transparent 30%, rgba(10,10,18,0.95) 100%)',
            pointerEvents: 'none',
          }} />

          {/* Category badge — floating on image */}
          <div style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              fontFamily: MONO,
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: cat.color,
              background: 'rgba(10,10,18,0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${cat.color}40`,
              padding: '6px 14px',
              borderRadius: '8px',
              textTransform: 'uppercase',
            }}>
              {cat.label}
            </span>
            {isNew && (
              <span style={{
                fontFamily: MONO,
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#4ade80',
                background: 'rgba(10,10,18,0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(74,222,128,0.3)',
                padding: '6px 12px',
                borderRadius: '8px',
              }}>
                NEW
              </span>
            )}
          </div>
        </div>

        {/* Content Side */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: bp === 'xs' ? '20px 16px 24px' : bp === 'sm' ? '24px 20px 28px' : bp === 'md' ? '28px 24px 32px' : bp === 'lg' ? '36px' : bp === 'xl' ? '42px' : '48px',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Meta */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '20px',
          }}>
            <span style={{
              fontFamily: MONO,
              fontSize: '11px',
              color: '#475569',
              letterSpacing: '0.06em',
            }}>
              {sourceLabel(article.source_name)}
            </span>
            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#334155' }} />
            <span style={{
              fontFamily: MONO,
              fontSize: '11px',
              color: '#475569',
            }}>
              {timeAgo(article.published_at)}
            </span>
            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#334155' }} />
            <span style={{
              fontFamily: MONO,
              fontSize: '11px',
              color: '#475569',
            }}>
              {readTime(article)}
            </span>
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: INTER,
            fontSize: bp === 'xs' ? '20px' : bp === 'sm' ? '22px' : bp === 'md' ? '24px' : bp === 'lg' ? '26px' : bp === 'xl' ? '28px' : bp === '2xl' ? '30px' : '32px',
            fontWeight: 700,
            color: '#f8fafc',
            lineHeight: 1.2,
            margin: '0 0 16px',
            letterSpacing: '-0.02em',
            transition: 'color 0.3s',
            overflowWrap: 'break-word',
          }}>
            {article.title}
          </h2>

          {/* Summary */}
          {clean && (
            <p style={{
              fontFamily: INTER,
              fontSize: '15px',
              color: '#94a3b8',
              lineHeight: 1.65,
              margin: '0 0 28px',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {clean}
            </p>
          )}

          {/* CTA */}
          <NewsReadArticleCta hovered={hovered} />
        </div>
      </div>
    </a>
  );
}

/* ── SECONDARY CARD — Magazine-style curated card ─────────────────────── */

function SecondaryCard({ article, isNew, index }: { article: Article; isNew?: boolean; index: number }) {
  const cat = CAT[article.category] ?? CAT.crypto;
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const clean = article.summary ? stripHtml(article.summary) : null;
  const showImage = !!article.image_url && !imgFailed;
  const bp = useBreakpoint();
  const isNarrow = useIsNarrow();

  const imgH = bp === 'xs' ? '160px' : bp === 'sm' ? '180px' : bp === 'md' ? '190px' : index === 0 ? '220px' : '180px';

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        textDecoration: 'none',
        borderRadius: bp === 'xs' ? '12px' : '16px',
        overflow: 'hidden',
        background: '#0c0c14',
        border: '1px solid rgba(255,255,255,0.04)',
        transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 24px 48px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)'
          : '0 4px 16px -6px rgba(0,0,0,0.3)',
        animation: `fadeInUp 0.5s ease-out ${0.15 + index * 0.08}s both`,
      }}
    >
      {/* Image */}
      <div style={{
        position: 'relative',
        height: imgH,
        overflow: 'hidden',
      }}>
        {showImage ? (
          <img
            src={article.image_url!}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 30%',
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: `linear-gradient(135deg, ${cat.color}08 0%, #0c0c14 100%)`,
          }} />
        )}

        {/* Gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(12,12,20,0.9) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        {/* Floating badges */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          display: 'flex',
          gap: '8px',
          zIndex: 2,
        }}>
          <span style={{
            fontFamily: MONO,
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: cat.color,
            background: 'rgba(10,10,18,0.8)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${cat.color}35`,
            padding: '5px 10px',
            borderRadius: '6px',
            textTransform: 'uppercase',
          }}>
            {cat.label}
          </span>
          {isNew && (
            <span style={{
              fontFamily: MONO,
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#4ade80',
              background: 'rgba(10,10,18,0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(74,222,128,0.25)',
              padding: '5px 10px',
              borderRadius: '6px',
            }}>
              NEW
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: bp === 'xs' ? '16px 16px 20px' : bp === 'sm' ? '18px 20px 22px' : '20px 24px 24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
        }}>
          <span style={{
            fontFamily: MONO,
            fontSize: bp === 'xs' ? '10px' : '11px',
            color: '#475569',
          }}>
            {sourceLabel(article.source_name)}
          </span>
          <span style={{ color: '#334155', fontSize: '10px' }}>·</span>
          <span style={{
            fontFamily: MONO,
            fontSize: bp === 'xs' ? '10px' : '11px',
            color: '#475569',
          }}>
            {timeAgo(article.published_at)}
          </span>
        </div>

        <h3 style={{
          fontFamily: INTER,
          fontSize: bp === 'xs' ? '14px' : bp === 'sm' ? '15px' : bp === 'md' ? '16px' : '17px',
          fontWeight: 600,
          color: hovered ? '#f1f5f9' : '#e2e8f0',
          lineHeight: 1.4,
          margin: '0 0 10px',
          letterSpacing: '-0.01em',
          transition: 'color 0.3s',
          overflowWrap: 'break-word',
        }}>
          {article.title}
        </h3>

        {clean && (
          <p style={{
            fontFamily: INTER,
            fontSize: '13px',
            color: '#64748b',
            lineHeight: 1.55,
            margin: '0 0 16px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {clean}
          </p>
        )}

        <NewsReadArticleCta hovered={hovered} compact />
      </div>
    </a>
  );
}

/* ── LIST CARD — Horizontal editorial row ────────────────────────────── */

function ListCard({ article, isNew, index }: { article: Article; isNew?: boolean; index: number }) {
  const cat = CAT[article.category] ?? CAT.crypto;
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const clean = article.summary ? stripHtml(article.summary) : null;
  const showImage = !!article.image_url && !imgFailed;
  const bp = useBreakpoint();
  const isNarrow = useIsNarrow();

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: bp === 'xs' ? '12px' : bp === 'sm' ? '14px' : bp === 'md' ? '16px' : bp === 'lg' ? '20px' : '28px',
        padding: bp === 'xs' ? '16px 0' : bp === 'sm' ? '20px 0' : '24px 0',
        textDecoration: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        transition: 'all 0.3s ease',
        animation: `fadeInUp 0.4s ease-out ${0.3 + index * 0.05}s both`,
      }}
    >
      {/* Image */}
      <div style={{
        width: bp === 'xs' ? '80px' : bp === 'sm' ? '90px' : bp === 'md' ? '100px' : bp === 'lg' ? '140px' : bp === 'xl' ? '170px' : '200px',
        height: bp === 'xs' ? '58px' : bp === 'sm' ? '65px' : bp === 'md' ? '72px' : bp === 'lg' ? '100px' : bp === 'xl' ? '120px' : '136px',
        flexShrink: 0,
        borderRadius: bp === 'xs' ? '8px' : bp === 'sm' ? '10px' : '12px',
        overflow: 'hidden',
        background: showImage ? '#090910' : `linear-gradient(135deg, ${cat.color}10 0%, transparent 100%)`,
        border: '1px solid rgba(255,255,255,0.04)',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        boxShadow: hovered ? '0 8px 24px -8px rgba(0,0,0,0.5)' : 'none',
      }}>
        {showImage ? (
          <img
            src={article.image_url!}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 30%',
              opacity: 0.85,
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: `linear-gradient(135deg, ${cat.color}10 0%, transparent 100%)`,
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        {/* Meta */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '10px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: MONO,
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: cat.color,
            textTransform: 'uppercase',
          }}>
            {cat.label}
          </span>
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#334155' }} />
          <span style={{
            fontFamily: MONO,
            fontSize: '12px',
            color: '#475569',
          }}>
            {sourceLabel(article.source_name)}
          </span>
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#334155' }} />
          <span style={{
            fontFamily: MONO,
            fontSize: '12px',
            color: '#475569',
          }}>
            {timeAgo(article.published_at)}
          </span>
          {isNew && (
            <span style={{
              fontFamily: MONO,
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#4ade80',
              background: 'rgba(74,222,128,0.08)',
              border: '1px solid rgba(74,222,128,0.15)',
              padding: '3px 8px',
              borderRadius: '4px',
            }}>
              NEW
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: INTER,
          fontSize: bp === 'xs' ? '14px' : bp === 'sm' ? '15px' : bp === 'md' ? '16px' : bp === 'lg' ? '17px' : '18px',
          fontWeight: 600,
          color: hovered ? '#f1f5f9' : '#e2e8f0',
          lineHeight: 1.4,
          margin: '0 0 8px',
          letterSpacing: '-0.01em',
          transition: 'color 0.3s',
          overflowWrap: 'break-word',
        }}>
          {article.title}
        </h3>

        {/* Summary */}
        {(bp === 'lg' || bp === 'xl' || bp === '2xl' || bp === '3xl' || bp === '4xl') && clean && (
          <p style={{
            fontFamily: INTER,
            fontSize: bp === 'xl' ? '13px' : '14px',
            color: '#64748b',
            lineHeight: 1.55,
            margin: '0 0 12px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {clean}
          </p>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: MONO,
            fontSize: '11px',
            color: '#475569',
            letterSpacing: '0.04em',
          }}>
            {readTime(article)}
          </span>
          <NewsReadArticleCta hovered={hovered} compact />
        </div>
      </div>
    </a>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   NEWS FEED — New editorial layout
   ═══════════════════════════════════════════════════════════════════════ */

function NewsFeed({
  filtered,
  loading,
  error,
  searchQuery,
  newArticleIds,
}: {
  filtered: Article[];
  loading: boolean;
  error: boolean;
  searchQuery: string;
  newArticleIds: Set<string>;
}) {
  const bp = useBreakpoint();
  const isNarrow = useIsNarrow();

  if (error) {
    return (
      <div style={{
        padding: '100px 20px',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: INTER,
          fontSize: '16px',
          color: '#64748b',
          marginBottom: '8px',
        }}>
          Unable to load articles
        </p>
        <p style={{
          fontFamily: INTER,
          fontSize: '14px',
          color: '#475569',
        }}>
          Please try again in a moment
        </p>
      </div>
    );
  }

  if (loading) {
    return <FeedSkeleton />;
  }

  if (filtered.length === 0) {
    return (
      <div style={{
        padding: '100px 20px',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: INTER,
          fontSize: '16px',
          color: '#64748b',
        }}>
          {searchQuery ? 'No articles match your search' : 'No articles available'}
        </p>
      </div>
    );
  }

  const hero = filtered[0];
  const secondary = filtered.slice(1, 4);
  const rest = filtered.slice(4);

  return (
    <div>
      {/* Hero Article */}
      <div style={{
        marginBottom: '48px',
        animation: 'fadeInUp 0.6s ease-out both',
      }}>
        <HeroCard
          article={hero}
          isNew={newArticleIds.has(hero.id)}
        />
      </div>

      {/* Secondary Grid */}
      {secondary.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: bp === 'xs' || bp === 'sm' || bp === 'md'
              ? '1fr'
              : bp === 'lg'
                ? secondary.length === 1 ? '1fr' : 'repeat(2, 1fr)'
                : secondary.length === 1
                  ? '1fr'
                  : secondary.length === 2
                    ? 'repeat(2, 1fr)'
                    : 'repeat(3, 1fr)',
            gap: bp === 'xs' ? '16px' : bp === 'sm' ? '20px' : bp === 'md' ? '22px' : '24px',
            marginBottom: bp === 'xs' ? '32px' : bp === 'sm' ? '40px' : '48px',
          }}>
            {secondary.map((article, i) => (
              <SecondaryCard
                key={article.id}
                article={article}
                isNew={newArticleIds.has(article.id)}
                index={i}
              />
            ))}
          </div>
        </>
      )}

      {/* Editorial Divider */}
      {rest.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '36px',
          padding: '0 4px',
        }}>
          <div style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06))',
          }} />
          <span style={{
            fontFamily: MONO,
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.25em',
            color: '#475569',
            textTransform: 'uppercase',
          }}>
            The Feed
          </span>
          <div style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.06))',
          }} />
        </div>
      )}

      {/* Article List */}
      <div>
        {rest.map((article, i) => (
          <ListCard
            key={article.id}
            article={article}
            isNew={newArticleIds.has(article.id)}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SKELETON LOADER
   ═══════════════════════════════════════════════════════════════════════ */

function FeedSkeleton() {
  const bp = useBreakpoint();
  const isNarrow = useIsNarrow();

  return (
    <div>
      {/* Hero skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'xs' || bp === 'sm' || bp === 'md' ? '1fr' : '1.4fr 1fr',
        minHeight: bp === 'xs' || bp === 'sm' || bp === 'md' ? 'auto' : bp === 'lg' ? '400px' : bp === 'xl' ? '440px' : '480px',
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
        overflow: 'hidden',
        marginBottom: bp === 'xs' ? '32px' : bp === 'sm' ? '40px' : '48px',
      }}>
        <div style={{
          minHeight: bp === 'xs' ? '180px' : bp === 'sm' ? '200px' : bp === 'md' ? '220px' : bp === 'lg' ? '400px' : bp === 'xl' ? '440px' : '480px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
            animation: 'shimmer 2s infinite',
          }} />
        </div>
        {!(bp === 'xs' || bp === 'sm' || bp === 'md') && (
          <div style={{ padding: bp === 'lg' ? '36px' : bp === 'xl' ? '42px' : '48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
            <div style={{ height: '12px', width: '140px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }} />
            <div style={{ height: '28px', width: '90%', background: 'rgba(255,255,255,0.06)', borderRadius: '8px' }} />
            <div style={{ height: '28px', width: '70%', background: 'rgba(255,255,255,0.06)', borderRadius: '8px' }} />
            <div style={{ height: '16px', width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginTop: '8px' }} />
            <div style={{ height: '16px', width: '80%', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }} />
          </div>
        )}
      </div>

      {/* Secondary skeletons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: bp === 'xs' || bp === 'sm' || bp === 'md' ? '1fr' : bp === 'lg' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gap: bp === 'xs' ? '16px' : bp === 'sm' ? '20px' : bp === 'md' ? '22px' : '24px',
        marginBottom: bp === 'xs' ? '32px' : bp === 'sm' ? '40px' : '48px',
      }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '180px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                animation: 'shimmer 2s infinite',
                animationDelay: `${i * 0.2}s`,
              }} />
            </div>
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ height: '10px', width: '100px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
              <div style={{ height: '18px', width: '90%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }} />
              <div style={{ height: '14px', width: '60%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EDITORIAL POST CARD — Premium design for Our View & Privacy Coins
   ═══════════════════════════════════════════════════════════════════════ */

function EditorialCard({ post, index, featured = false }: { post: NovrixPost; index: number; featured?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const preview = stripHtml(post.content).slice(0, featured ? 300 : 220);
  const bp = useBreakpoint();

  const CATEGORY_META: Record<string, { label: string; color: string; accentBg: string }> = {
    novrix_view:   { label: 'Our View',      color: '#ffffff', accentBg: 'rgba(255,255,255,0.06)' },
    privacy_watch: { label: 'Deep Dive', color: '#ffffff', accentBg: 'rgba(255,255,255,0.06)' },
    weekly_brief:  { label: 'Weekly Brief',  color: '#ffffff', accentBg: 'rgba(255,255,255,0.06)' },
  };

  const cat = CATEGORY_META[post.category] ?? { label: 'Article', color: '#ffffff', accentBg: 'rgba(255,255,255,0.06)' };
  const hasImage = !!post.cover_image && !imgFailed;
  const readMinutes = Math.max(1, Math.round(post.content.split(/\s+/).length / 200));

  /* Responsive values */
  const isSmall = bp === 'xs' || bp === 'sm';
  const cardPad = featured
    ? (bp === 'xs' ? '16px' : bp === 'sm' ? '20px' : bp === 'md' ? '24px' : bp === 'lg' ? '28px' : '32px')
    : (bp === 'xs' ? '14px' : bp === 'sm' ? '18px' : bp === 'md' ? '20px' : '24px');
  const imgH = featured
    ? (bp === 'xs' ? '180px' : bp === 'sm' ? '220px' : bp === 'md' ? '260px' : bp === 'lg' ? '300px' : bp === 'xl' ? '340px' : '380px')
    : (bp === 'xs' ? '140px' : bp === 'sm' ? '170px' : bp === 'md' ? '190px' : '220px');
  const titleSize = featured
    ? (bp === 'xs' ? '22px' : bp === 'sm' ? '26px' : bp === 'md' ? '30px' : bp === 'lg' ? '34px' : bp === 'xl' ? '38px' : '42px')
    : (bp === 'xs' ? '17px' : bp === 'sm' ? '19px' : bp === 'md' ? '21px' : bp === 'lg' ? '22px' : '24px');
  const previewSize = bp === 'xs' ? '14px' : bp === 'sm' ? '15px' : '16px';
  const metaSize = bp === 'xs' ? '11px' : '12px';

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        position: 'relative',
        textDecoration: 'none',
        borderRadius: bp === 'xs' ? '14px' : bp === 'sm' ? '16px' : '20px',
        overflow: 'hidden',
        background: '#0a0a12',
        border: '1px solid rgba(255,255,255,0.05)',
        transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 32px 64px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)'
          : '0 8px 24px -8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)',
        animation: `fadeInUp 0.5s ease-out ${index * 0.12}s both`,
      }}
    >
      <a
        href={`/insights/post?slug=${post.slug}`}
        aria-label={`Read ${post.title}`}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          textDecoration: 'none',
        }}
      />
      {/* Cover Image */}
      {hasImage && (
        <div style={{
          position: 'relative',
          width: '100%',
          height: imgH,
          overflow: 'hidden',
          background: '#08080c',
        }}>
          <img
            src={post.cover_image!}
            alt=""
            loading={featured ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setImgFailed(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 30%',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(10,10,18,0.9) 0%, rgba(10,10,18,0.3) 40%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          {/* Category badge floating on image */}
          <div style={{
            position: 'absolute',
            bottom: bp === 'xs' ? '12px' : '16px',
            left: bp === 'xs' ? '12px' : '16px',
            zIndex: 2,
            pointerEvents: 'none',
          }}>
            <span style={{
              fontFamily: MONO,
              fontSize: metaSize,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: cat.color,
              background: 'rgba(10,10,18,0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${cat.color}40`,
              padding: bp === 'xs' ? '5px 10px' : '6px 14px',
              borderRadius: '8px',
              textTransform: 'uppercase',
            }}>
              {cat.label}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: cardPad, position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
        {!hasImage && (
          <span style={{
            fontFamily: MONO,
            fontSize: metaSize,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: cat.color,
            textTransform: 'uppercase',
            display: 'inline-block',
            marginBottom: '14px',
          }}>
            {cat.label}
          </span>
        )}

        {/* Title */}
        <h3 style={{
          fontFamily: INTER,
          fontSize: titleSize,
          fontWeight: featured ? 700 : 600,
          color: hovered ? '#f8fafc' : '#f1f5f9',
          lineHeight: featured ? 1.15 : 1.3,
          margin: '0 0 16px',
          letterSpacing: featured ? '-0.025em' : '-0.02em',
          transition: 'color 0.3s ease',
          overflowWrap: 'break-word',
        }}>
          {post.title}
        </h3>

        {/* Preview */}
        {preview && (
          <p style={{
            fontFamily: INTER,
            fontSize: previewSize,
            color: '#94a3b8',
            lineHeight: 1.7,
            margin: '0 0 24px',
            display: '-webkit-box',
            WebkitLineClamp: featured ? 3 : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {preview}{post.content.length > (featured ? 300 : 220) ? '...' : ''}
          </p>
        )}

        {/* Author + Date + Read time row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: INTER,
            fontSize: bp === 'xs' ? '13px' : '14px',
            fontWeight: 500,
            color: '#e2e8f0',
          }}>
            {post.author}
          </span>

          <AuthorLinkLabels links={post.author_links} compact={!featured} />

          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#334155' }} />

          <span style={{
            fontFamily: MONO,
            fontSize: metaSize,
            color: '#475569',
            letterSpacing: '0.04em',
          }}>
            {formatDate(post.published_at)}
          </span>

          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#334155' }} />

          <span style={{
            fontFamily: MONO,
            fontSize: metaSize,
            color: '#475569',
            letterSpacing: '0.04em',
          }}>
            {readMinutes} min read
          </span>
        </div>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EDITORIAL SECTION — Our View & Privacy Coins
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Editorial cache (module-level, survives unmount) ────────────────── */
const editorialCache = new Map<string, { posts: NovrixPost[]; error: string | null }>();

function EditorialSection({ category }: { category: string }) {
  const bp = useBreakpoint();
  const [, forceRender] = useState(0);

  const sectionMeta: Record<string, { label: string; color: string; subtitle: string }> = {
    novrix_view:   { label: 'Our View',      color: '#ffffff', subtitle: 'Editorial analysis and perspective' },
    privacy_watch: { label: 'Privacy Coins', color: '#ffffff', subtitle: 'Deep dives into privacy technology' },
  };
  const meta = sectionMeta[category] ?? { label: 'Analysis', color: '#ffffff', subtitle: '' };

  const cached = editorialCache.get(category);
  const posts = cached?.posts ?? [];
  const hasCache = !!cached;
  const error = cached?.error ?? null;

  useEffect(() => {
    if (editorialCache.has(category)) return; // already cached
    fetch(`/api/posts?category=${category}`)
      .then(async r => {
        const d = await r.json() as { success: boolean; data: NovrixPost[]; error?: { message: string } };
        if (!d.success) {
          editorialCache.set(category, { posts: [], error: d.error?.message || 'Failed to load posts' });
        } else {
          editorialCache.set(category, { posts: d.data || [], error: null });
        }
        forceRender(n => n + 1);
      })
      .catch((e: Error) => {
        editorialCache.set(category, { posts: [], error: e.message || 'Network error' });
        forceRender(n => n + 1);
      });
  }, [category]);

  if (!hasCache) {
    return (
      <div style={{ padding: '40px 0' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ height: '14px', width: '140px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '12px' }} />
          <div style={{ height: '10px', width: '260px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
        </div>
        <div style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden', marginBottom: '32px' }}>
          <div style={{ height: '300px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)', animation: 'shimmer 2s infinite' }} />
          </div>
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ height: '36px', width: '80%', background: 'rgba(255,255,255,0.06)', borderRadius: '8px' }} />
            <div style={{ height: '18px', width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }} />
            <div style={{ height: '18px', width: '70%', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ fontFamily: INTER, fontSize: '15px', color: '#F87171', marginBottom: '8px' }}>{error}</p>
        <p style={{ fontFamily: INTER, fontSize: '13px', color: '#475569' }}>Please try refreshing the page.</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <p style={{ fontFamily: INTER, fontSize: '16px', color: '#64748b' }}>No articles published yet.</p>
      </div>
    );
  }

  const featured = posts[0];
  const secondary = posts.slice(1, 4);
  const rest = posts.slice(4);

  return (
    <div style={{ padding: bp === 'xs' ? '4px 0 32px' : bp === 'sm' ? '8px 0 36px' : '12px 0 40px' }}>
      {/* Section Header */}
      <div style={{
        marginBottom: bp === 'xs' ? '28px' : bp === 'sm' ? '32px' : bp === 'md' ? '36px' : '40px',
        paddingBottom: bp === 'xs' ? '20px' : bp === 'sm' ? '24px' : '28px',
        borderBottom: `1px solid ${meta.color}15`,
      }}>
        <p style={{
          fontFamily: INTER,
          fontSize: bp === 'xs' ? '14px' : '15px',
          color: '#475569',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {meta.subtitle}
        </p>
      </div>

      {/* Featured Article */}
      <div style={{ marginBottom: bp === 'xs' ? '28px' : bp === 'sm' ? '32px' : bp === 'md' ? '36px' : '40px' }}>
        <EditorialCard post={featured} index={0} featured={true} />
      </div>

      {/* Secondary Grid */}
      {secondary.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: bp === 'xs' || bp === 'sm'
            ? '1fr'
            : bp === 'md' || bp === 'lg'
              ? 'repeat(2, 1fr)'
              : 'repeat(3, 1fr)',
          gap: bp === 'xs' ? '16px' : bp === 'sm' ? '20px' : bp === 'md' ? '22px' : '24px',
          marginBottom: bp === 'xs' ? '28px' : bp === 'sm' ? '32px' : bp === 'md' ? '36px' : '40px',
        }}>
          {secondary.map((post, i) => (
            <EditorialCard key={post.id} post={post} index={i + 1} />
          ))}
        </div>
      )}

      {/* Editorial Divider + Rest */}
      {rest.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: bp === 'xs' ? '24px' : bp === 'sm' ? '28px' : bp === 'md' ? '32px' : '36px',
        }}>
          <div style={{
            flex: 1,
            height: '1px',
            background: `linear-gradient(to right, transparent, ${meta.color}20)`,
          }} />
          <span style={{
            fontFamily: MONO,
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.25em',
            color: '#475569',
            textTransform: 'uppercase',
          }}>
            More from {meta.label}
          </span>
          <div style={{
            flex: 1,
            height: '1px',
            background: `linear-gradient(to left, transparent, ${meta.color}20)`,
          }} />
        </div>
      )}

      {rest.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: bp === 'xs' || bp === 'sm'
            ? '1fr'
            : bp === 'md' || bp === 'lg'
              ? 'repeat(2, 1fr)'
              : 'repeat(3, 1fr)',
          gap: bp === 'xs' ? '16px' : bp === 'sm' ? '20px' : bp === 'md' ? '22px' : '24px',
        }}>
          {rest.map((post, i) => (
            <EditorialCard key={post.id} post={post} index={i + 4} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Per-category caches (persist across switches) ───────────────────── */
interface CategoryCache {
  articles: Article[];
  counts: Record<string, number>;
  lastPoll: string;
  fetchedAt: number;
}

export default function InsightsPage() {
  const bp = useBreakpoint();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<string>('novrix-view');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week'>('all');
  const [newArticleIds, setNewArticleIds] = useState<Set<string>>(new Set());

  /* Cache: one entry per news category. Lives in a ref because the fetch/poll
     callbacks mutate it asynchronously and every mutation that must become
     visible ends in forceRender — so these render-time reads are always in
     sync. Converting to useState would force stale-closure workarounds in the
     30s poll and idle prefetch. react-hooks/refs disables stay confined to
     the read sites below. */
  const cacheRef = useRef<Record<string, CategoryCache>>({});
  const [, forceRender] = useState(0);

  const isNewsSection = NEWS_SECTIONS.includes(activeSection as typeof NEWS_SECTIONS[number]);

  /* Current cached data for active section (may be stale while re-fetching) */
  const cached = cacheRef.current[activeSection];
  // eslint-disable-next-line react-hooks/refs
  const articles = cached?.articles ?? [];
  // eslint-disable-next-line react-hooks/refs
  const counts = cached?.counts ?? {};
  // eslint-disable-next-line react-hooks/refs
  const lastPoll = cached?.lastPoll ?? new Date().toISOString();

  /* Loading = no cache yet for this category */
  // eslint-disable-next-line react-hooks/refs
  const loadingNews = isNewsSection && !cached;
  /* Error tracking per category */
  const errorRef = useRef<Record<string, boolean>>({});
  // eslint-disable-next-line react-hooks/refs
  const newsError = isNewsSection && !!errorRef.current[activeSection];

  /* Fetch articles — writes to cache, never clears visible data */
  const fetchArticles = useCallback(async (section: string, silent = false) => {
    if (!NEWS_SECTIONS.includes(section as typeof NEWS_SECTIONS[number])) return;
    const cat = section === 'latest' ? 'all' : section;
    try {
      const res = await fetch(`/api/news?category=${cat}&limit=80`);
      if (!res.ok) throw new Error('API error');
      delete errorRef.current[section];
      const data = await res.json() as {
        articles: Article[];
        total: number;
        counts: { category: string; count: number }[];
        serverTime?: string;
      };
      const visibleArticles = visibleNewsArticles(data.articles);
      const newCounts: Record<string, number> = {};
      for (const c of data.counts) newCounts[c.category] = c.count;
      cacheRef.current[section] = {
        articles: visibleArticles,
        counts: newCounts,
        lastPoll: data.serverTime ?? new Date().toISOString(),
        fetchedAt: Date.now(),
      };
      if (!silent) forceRender(n => n + 1);
    } catch {
      if (!cacheRef.current[section]) {
        errorRef.current[section] = true;
        if (!silent) forceRender(n => n + 1);
      }
    }
  }, []);

  /* Initial fetch + refetch on section change */
  useEffect(() => {
    if (!isNewsSection) return;
    // If no cache for this section, fetch immediately
    if (!cacheRef.current[activeSection]) {
      fetchArticles(activeSection);
    }
  }, [activeSection, isNewsSection, fetchArticles]);

  /* Prefetch adjacent categories on idle */
  useEffect(() => {
    if (!isNewsSection) return;
    const adjacent = NAV_SECTIONS.filter(s => s !== activeSection && !cacheRef.current[s]);
    if (adjacent.length === 0) return;
    const handle = typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? window.requestIdleCallback(() => {
          adjacent.forEach((s, i) => {
            setTimeout(() => fetchArticles(s, true), i * 300);
          });
        }, { timeout: 2000 })
      : setTimeout(() => {
          adjacent.forEach((s, i) => {
            setTimeout(() => fetchArticles(s, true), i * 300);
          });
        }, 1000);
    return () => {
      if (typeof handle === 'number') clearTimeout(handle);
      else if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(handle as unknown as number);
      }
    };
  }, [activeSection, isNewsSection, fetchArticles]);

  /* Poll for new articles */
  const pollForNewArticles = useCallback(async () => {
    if (!isNewsSection) return;
    const since = cacheRef.current[activeSection]?.lastPoll ?? new Date().toISOString();
    const cat = activeSection === 'latest' ? 'all' : activeSection;
    try {
      const res = await fetch(`/api/news?category=${cat}&limit=50&since=${encodeURIComponent(since)}`);
      if (!res.ok) return;
      const data = await res.json() as { articles: Article[]; serverTime: string };
      if (!cacheRef.current[activeSection]) return;
      cacheRef.current[activeSection].lastPoll = data.serverTime;
      const visibleArticles = visibleNewsArticles(data.articles ?? []);
      if (visibleArticles.length === 0) return;

      const incomingIds = new Set(visibleArticles.map(a => a.id));
      const existing = cacheRef.current[activeSection].articles;
      const existingIds = new Set(existing.map(a => a.id));
      const brandNew = visibleArticles.filter(a => !existingIds.has(a.id));
      if (brandNew.length > 0) {
        cacheRef.current[activeSection].articles = [...brandNew, ...existing];
        forceRender(n => n + 1);
      }

      setNewArticleIds(prev => new Set([...prev, ...incomingIds]));
      setTimeout(() => {
        setNewArticleIds(prev => {
          const next = new Set(prev);
          incomingIds.forEach(id => next.delete(id));
          return next;
        });
      }, 10_000);
    } catch { /* silently ignore */ }
  }, [isNewsSection, activeSection]);

  useEffect(() => {
    if (!isNewsSection) return;
    // Paused while the tab is hidden — background tabs don't poll.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void pollForNewArticles();
    }, 30_000);
    return () => clearInterval(interval);
  }, [isNewsSection, pollForNewArticles]);

  /* Filtered articles */
  const filtered = useMemo(() => applyTimeFilter(
    // eslint-disable-next-line react-hooks/refs
    visibleNewsArticles(articles).filter(a =>
      searchQuery.trim() === '' ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stripHtml(a.summary ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    ),
    timeFilter
  ), [articles, searchQuery, timeFilter]);

  const switchSection = (s: string) => {
    setActiveSection(s);
    setSearchQuery('');
    setTimeFilter('all');
    setNewArticleIds(new Set());
    delete errorRef.current[s];
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes ambientSweep {
          0%, 100% { transform: rotate(25deg) translateX(-10%); }
          50% { transform: rotate(25deg) translateX(10%); }
        }
        @keyframes ambientBreathe {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.35; box-shadow: 0 0 4px rgba(148,163,184,0.1); }
          50% { opacity: 0.6; box-shadow: 0 0 12px rgba(148,163,184,0.25); }
        }
        @keyframes ruleBreathe {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.18; }
        }
      `}</style>

      <Navbar />

      <InsightsHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <CategoryNav
        activeSection={activeSection}
        setActiveSection={switchSection}
      />

      {/* Horizontal editorial divider */}
      <div style={{
        maxWidth: bp === '4xl' ? '1800px' : '1400px',
        margin: '0 auto',
        padding: `0 ${bp === 'xs' ? '12px' : bp === 'sm' ? '16px' : bp === 'md' ? '20px' : bp === 'lg' ? '24px' : bp === 'xl' ? '32px' : '40px'}`,
      }}>
        <div style={{
          height: '20px',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.15) 10%, rgba(148,163,184,0.06) 50%, rgba(148,163,184,0.15) 90%, transparent 100%)',
          }} />
        </div>
      </div>

      <main style={{ flex: 1 }}>
        <div style={{
          maxWidth: bp === '4xl' ? '1800px' : '1400px',
          margin: '0 auto',
          padding: bp === 'xs' ? '20px 12px 60px' : bp === 'sm' ? '24px 16px 70px' : bp === 'md' ? '28px 20px 75px' : bp === 'lg' ? '32px 24px 80px' : bp === 'xl' ? '36px 32px 80px' : '40px 40px 80px',
          position: 'relative',
        }}>
          {/* Vertical gradient line — descends from top and fades away */}
          <div style={{
            position: 'absolute',
            left: '0',
            top: '0',
            width: '1px',
            height: '140px',
            background: 'linear-gradient(180deg, rgba(148,163,184,0.2) 0%, rgba(148,163,184,0.04) 50%, transparent 100%)',
            pointerEvents: 'none',
          }} />
          {isNewsSection && (
            <NewsFeed
              filtered={filtered}
              loading={loadingNews}
              error={newsError}
              searchQuery={searchQuery}
              newArticleIds={newArticleIds}
            />
          )}

          {ANALYSIS_SECTIONS.includes(activeSection as typeof ANALYSIS_SECTIONS[number]) && (
            <EditorialSection category={activeSection.replaceAll('-', '_')} />
          )}
        </div>
      </main>

      <FooterHome />
    </div>
  );
}
