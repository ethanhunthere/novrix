'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

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
   TOKENS
   ═══════════════════════════════════════════════════════════════════════ */

const SANS = 'var(--ff-sans)';
const MONO = 'var(--ff-mono)';
const DISPLAY = 'var(--ff-display)';

const INK = '#F5F1EA';
const MUTED = 'rgba(245, 241, 234, 0.60)';
const FAINT = 'rgba(245, 241, 234, 0.42)';
const HAIRLINE = 'rgba(245, 241, 234, 0.08)';
const ACCENT = '#C2344D';

/* ═══════════════════════════════════════════════════════════════════════
   SECTIONS
   ═══════════════════════════════════════════════════════════════════════ */

interface Section {
  key: string;
  api: string;
  label: string;
  title: string;
  subtitle: string;
}

const SECTIONS: Section[] = [
  {
    key: 'our-view',
    api: 'novrix_view',
    label: 'Our View',
    title: 'Our read.',
    subtitle: 'Opinionated analysis on sentiment, positioning, and the forces moving the market.',
  },
  {
    key: 'deep-dive',
    api: 'privacy_watch',
    label: 'Deep Dive',
    title: 'The long read.',
    subtitle: 'Slower research into privacy technology, market structure, and the stories underneath the price.',
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

function stripHtml(raw: string): string {
  return raw
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
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/---/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function readMinutes(content: string): number {
  return Math.max(1, Math.round(stripHtml(content).split(/\s+/).filter(Boolean).length / 200));
}

function excerpt(content: string, max: number): string {
  const clean = stripHtml(content);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf(' '));
  return `${cut.slice(0, end > max * 0.6 ? end : max).trim()}…`;
}

/* ═══════════════════════════════════════════════════════════════════════
   CACHE
   ═══════════════════════════════════════════════════════════════════════ */

const postsCache = new Map<string, { posts: NovrixPost[]; error: string | null }>();

/* ═══════════════════════════════════════════════════════════════════════
   SMALL PARTS
   ═══════════════════════════════════════════════════════════════════════ */

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: '10px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: FAINT,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function Dot() {
  return <span aria-hidden="true" style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(245,241,234,0.22)' }} />;
}

function AuthorLinks({ links, compact = false }: { links?: AuthorLink[]; compact?: boolean }) {
  if (!links || links.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      {links.map(link => (
        <a
          key={`${link.platform}-${link.url}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'relative',
            zIndex: 2,
            fontFamily: MONO,
            fontSize: compact ? '9px' : '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(245,241,234,0.34)',
            textDecoration: 'none',
            borderBottom: '1px solid rgba(245,241,234,0.14)',
            paddingBottom: '1px',
            transition: 'color 160ms ease, border-color 160ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = INK; e.currentTarget.style.borderColor = 'rgba(245,241,234,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,241,234,0.34)'; e.currentTarget.style.borderColor = 'rgba(245,241,234,0.14)'; }}
        >
          {link.platform}
        </a>
      ))}
    </span>
  );
}

function CoverArt({ post, section, tall = false }: { post: NovrixPost; section: Section; tall?: boolean }) {
  const [failed, setFailed] = useState(false);
  const hasImage = !!post.cover_image && !failed;

  if (hasImage) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: tall ? '4 / 3' : '16 / 10',
          overflow: 'hidden',
          background: '#11100E',
        }}
      >
        <img
          src={post.cover_image!}
          alt={post.title || "Research cover image"}
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 30%',
            transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(10,9,8,0.10) 0%, rgba(10,9,8,0.0) 45%, rgba(10,9,8,0.55) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: tall ? '4 / 3' : '16 / 10',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 70% 20%, rgba(194,52,77,0.10) 0%, transparent 62%), #11100E',
        borderLeft: `1px solid ${HAIRLINE}`,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        padding: 'clamp(18px, 3vw, 32px)',
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: '9.5px',
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color: 'rgba(245,241,234,0.45)',
        }}
      >
        NOVRIX · {section.label}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FEATURE
   ═══════════════════════════════════════════════════════════════════════ */

function Feature({ post, section }: { post: NovrixPost; section: Section }) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'grid',
        gap: 'clamp(24px, 4vw, 56px)',
        alignItems: 'center',
        paddingTop: 'clamp(24px, 4vh, 40px)',
        paddingBottom: 'clamp(40px, 6vh, 72px)',
        borderBottom: `1px solid ${HAIRLINE}`,
      }}
      className="insight-feature"
    >
      <a
        href={`/insights/post?slug=${post.slug}`}
        aria-label={`Read ${post.title}`}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      />

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: 'clamp(16px, 2.4vh, 24px)' }}>
          <span style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: ACCENT }}>
            {section.label}
          </span>
          <Dot />
          <Meta>{formatDate(post.published_at)}</Meta>
          <Dot />
          <Meta>{readMinutes(post.content)} min</Meta>
        </div>

        <h2
          style={{
            fontFamily: DISPLAY,
            fontSize: 'clamp(2rem, 1.2rem + 3.4vw, 3.6rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.026em',
            fontWeight: 500,
            color: hovered ? '#FFFCF6' : INK,
            margin: 0,
            maxWidth: '20ch',
            transition: 'color 220ms ease',
          }}
        >
          {post.title}
        </h2>

        <p
          style={{
            fontFamily: SANS,
            fontSize: 'clamp(0.95rem, 0.9rem + 0.2vw, 1.05rem)',
            lineHeight: 1.7,
            color: MUTED,
            margin: 'clamp(16px, 2.4vh, 22px) 0 0',
            maxWidth: '56ch',
          }}
        >
          {excerpt(post.content, 300)}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: 'clamp(22px, 3.2vh, 34px)' }}>
          <span style={{ fontFamily: SANS, fontSize: '13px', fontWeight: 500, color: 'rgba(245,241,234,0.86)' }}>
            {post.author}
          </span>
          <AuthorLinks links={post.author_links} />
          <span
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: MONO,
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: hovered ? INK : 'rgba(245,241,234,0.42)',
              transition: 'color 180ms ease',
            }}
          >
            Read
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: hovered ? 'translateX(3px)' : 'none', transition: 'transform 180ms ease' }}>
              <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" />
            </svg>
          </span>
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        <CoverArt post={post} section={section} tall />
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ENTRY ROW
   ═══════════════════════════════════════════════════════════════════════ */

function Entry({ post }: { post: NovrixPost; index?: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={`/insights/post?slug=${post.slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'block',
        padding: 'clamp(22px, 3vh, 30px) 0',
        borderTop: `1px solid ${HAIRLINE}`,
        textDecoration: 'none',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
          <h3
            style={{
              flex: 1,
              minWidth: 'min(100%, 280px)',
              fontFamily: DISPLAY,
              fontSize: 'clamp(1.3rem, 1rem + 0.9vw, 1.75rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.018em',
              fontWeight: 500,
              color: hovered ? '#FFFCF6' : 'rgba(245,241,234,0.92)',
              margin: 0,
              transition: 'color 180ms ease',
            }}
          >
            {post.title}
          </h3>
          <Meta>{readMinutes(post.content)} min</Meta>
        </div>

        <p
          style={{
            fontFamily: SANS,
            fontSize: '0.94rem',
            lineHeight: 1.65,
            color: 'rgba(245,241,234,0.72)',
            margin: '10px 0 0',
            maxWidth: '68ch',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {excerpt(post.content, 180)}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
          <Meta>{formatDate(post.published_at)}</Meta>
          <Dot />
          <span style={{ fontFamily: SANS, fontSize: '12px', color: 'rgba(245,241,234,0.60)' }}>{post.author}</span>
          <AuthorLinks links={post.author_links} compact />
        </div>
      </div>
    </a>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION BODY
   ═══════════════════════════════════════════════════════════════════════ */

function SectionBody({ section }: { section: Section }) {
  const [state, setState] = useState(postsCache.get(section.api) ?? null);

  useEffect(() => {
    if (postsCache.has(section.api)) return;
    const controller = new AbortController();
    fetch(`/api/posts?category=${section.api}`, { signal: controller.signal })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json() as { success: boolean; data: NovrixPost[]; error?: { message?: string } | string };
        const message = typeof d.error === 'string' ? d.error : d.error?.message;
        const next = { posts: d.success ? d.data || [] : [], error: d.success ? null : message || 'Failed to load posts' };
        postsCache.set(section.api, next);
        setState(next);
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        const next = { posts: [], error: 'Could not load this section.' };
        postsCache.set(section.api, next);
        setState(next);
      });
    return () => controller.abort();
  }, [section.api]);

  if (!state) {
    return (
      <div style={{ paddingTop: 'clamp(24px, 4vh, 40px)' }} aria-busy="true">
        <div style={{ height: '1px', background: HAIRLINE }} />
        <div style={{ padding: 'clamp(28px, 4vh, 44px) 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ height: '10px', width: '120px', background: 'rgba(245,241,234,0.07)' }} />
          <div style={{ height: 'clamp(2rem, 4vw, 3rem)', width: 'min(90%, 620px)', background: 'rgba(245,241,234,0.06)' }} />
          <div style={{ height: '14px', width: 'min(70%, 460px)', background: 'rgba(245,241,234,0.035)' }} />
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ padding: 'clamp(48px, 8vh, 88px) 0', borderTop: `1px solid ${HAIRLINE}`, marginTop: 'clamp(24px, 4vh, 40px)' }}>
        <p style={{ fontFamily: SANS, fontSize: '14px', color: 'rgba(245,241,234,0.62)', margin: 0 }}>{state.error}</p>
        <p style={{ fontFamily: SANS, fontSize: '13px', color: FAINT, margin: '8px 0 0' }}>Refresh the page to try again.</p>
      </div>
    );
  }

  const posts = state.posts;

  if (posts.length === 0) {
    return (
      <div style={{ padding: 'clamp(56px, 10vh, 108px) 0', borderTop: `1px solid ${HAIRLINE}`, marginTop: 'clamp(24px, 4vh, 40px)' }}>
        <p style={{ fontFamily: DISPLAY, fontSize: '1.4rem', color: 'rgba(245,241,234,0.7)', margin: 0 }}>Nothing published here yet.</p>
        <p style={{ fontFamily: SANS, fontSize: '13.5px', color: FAINT, margin: '10px 0 0' }}>The next piece is being written.</p>
      </div>
    );
  }

  const [feature, ...rest] = posts;

  return (
    <div>
      <Feature post={feature} section={section} />
      {rest.length > 0 && (
        <div style={{ marginTop: 'clamp(8px, 1.6vh, 14px)' }}>
          {rest.map((post, i) => (
            <Entry key={post.id} post={post} index={i + 2} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function InsightsPage() {
  const [activeKey, setActiveKey] = useState(SECTIONS[0].key);
  const active = SECTIONS.find(s => s.key === activeKey) ?? SECTIONS[0];

  return (
    <div style={{ minHeight: '100vh', background: '#120F0D', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .insight-feature { grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr); }
        @media (max-width: 899px) { .insight-feature { grid-template-columns: minmax(0, 1fr); } }
        .insight-tab:hover { color: ${INK} !important; }
        .insight-tab:focus-visible { outline: 1px solid rgba(194,52,77,0.6); outline-offset: 4px; }
        @keyframes insightFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .insight-body { animation: none !important; }
        }
      `}</style>

      <Navbar />

      <main style={{ flex: 1 }}>
        <section style={{ padding: 'clamp(44px, 8vh, 112px) var(--container-pad) clamp(24px, 4vh, 44px)' }}>
          <div className="mx-auto w-full max-w-[1180px] 2xl:max-w-[1400px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] min-w-0">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'clamp(16px, 2.5vh, 30px)' }}>
              <span style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: ACCENT }}>
                Insights
              </span>
              <span aria-hidden="true" style={{ flex: 1, height: '1px', background: HAIRLINE }} />
            </div>

            <h1
              style={{
                fontFamily: DISPLAY,
                fontSize: 'clamp(1.75rem, 1.2rem + 4vw, 5.4rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
                fontWeight: 500,
                color: INK,
                margin: 0,
                maxWidth: 'min(100%, 18ch)',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              What we think, and why.
            </h1>

            <p
              style={{
                fontFamily: SANS,
                fontSize: 'clamp(0.95rem, 0.88rem + 0.25vw, 1.2rem)',
                lineHeight: 1.7,
                color: MUTED,
                margin: 'clamp(16px, 2.4vh, 26px) 0 0',
                maxWidth: 'min(100%, 56ch)',
                overflowWrap: 'break-word',
              }}
            >
              Editorial analysis from the NOVRIX desk, plus the longer reads behind the calls.
            </p>
          </div>
        </section>

        <div style={{ borderTop: `1px solid ${HAIRLINE}`, borderBottom: `1px solid ${HAIRLINE}` }}>
          <div
            className="mx-auto w-full max-w-[1180px] 2xl:max-w-[1400px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] min-w-0 flex items-center gap-5 sm:gap-8 overflow-x-auto"
            style={{
              padding: '0 var(--container-pad)',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {SECTIONS.map(section => {
              const isActive = section.key === activeKey;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveKey(section.key)}
                  className="insight-tab shrink-0"
                  style={{
                    appearance: 'none',
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? `1px solid ${ACCENT}` : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'baseline',
                    padding: '18px 0 16px',
                    marginBottom: '-1px',
                    color: isActive ? INK : 'rgba(245,241,234,0.60)',
                    transition: 'color 180ms ease, border-color 180ms ease',
                    whiteSpace: 'nowrap',
                  }}
                  aria-pressed={isActive}
                >
                  <span style={{ fontFamily: SANS, fontSize: '14px', fontWeight: 500, letterSpacing: '0.01em' }}>
                    {section.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <section style={{ padding: '0 var(--container-pad) clamp(72px, 12vh, 132px)' }}>
          <div className="mx-auto w-full max-w-[1180px] 2xl:max-w-[1400px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] min-w-0" style={{ paddingTop: 'clamp(32px, 5vh, 52px)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', marginBottom: 'clamp(8px, 1.4vh, 12px)' }}>
              <h2
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 'clamp(1.5rem, 1.1rem + 1.3vw, 2.1rem)',
                  lineHeight: 1.08,
                  letterSpacing: '-0.02em',
                  fontWeight: 500,
                  color: 'rgba(245,241,234,0.92)',
                  margin: 0,
                }}
              >
                {active.title}
              </h2>
              <p style={{ fontFamily: SANS, fontSize: '13px', lineHeight: 1.6, color: FAINT, margin: 0, maxWidth: '52ch' }}>
                {active.subtitle}
              </p>
            </div>

            <div key={active.key} className="insight-body" style={{ animation: 'insightFade 420ms cubic-bezier(0.22, 1, 0.36, 1) both' }}>
              <SectionBody key={active.key} section={active} />
            </div>
          </div>
        </section>
      </main>

      <FooterHome />
    </div>
  );
}
