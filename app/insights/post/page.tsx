'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

interface Post {
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

interface AuthorLink {
  platform: string;
  url: string;
}

/* ═══════════════════════════════════════════════════════════════════════
   DESIGN TOKENS  (match insights page)
   ═══════════════════════════════════════════════════════════════════════ */

const INTER = 'var(--font-inter), Inter, system-ui, sans-serif';
const MONO  = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const BG    = '#070A0F';
const RULE  = 'rgba(255,255,255,0.055)';

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  weekly_brief:  { label: 'WEEKLY BRIEF',   color: '#60A5FA' },
  novrix_view:   { label: 'OUR VIEW',       color: '#C2344D' },
  privacy_watch: { label: 'DEEP DIVE',      color: '#D4A74A' },
};

const AUTHOR_META: Record<string, { color: string }> = {
  Novrix:      { color: '#8FB7E8' },
  BullCase:    { color: '#D8B15E' },
  TechLeaks24: { color: '#A78BFA' },
};

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  });
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

function splitTrailingUrlPunctuation(value: string): { urlText: string; trailing: string } {
  let urlText = value;
  let trailing = '';
  while (/[.,!?;:]$/.test(urlText)) {
    trailing = urlText.slice(-1) + trailing;
    urlText = urlText.slice(0, -1);
  }
  return { urlText, trailing };
}

function AuthorLinkLabels({ links }: { links?: AuthorLink[] }) {
  const visible = (links ?? [])
    .map(link => ({ platform: link.platform.trim(), url: safeExternalHref(link.url) }))
    .filter((link): link is { platform: string; url: string } => Boolean(link.platform && link.url));

  if (visible.length === 0) return null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {visible.map(link => (
        <a
          key={`${link.platform}-${link.url}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: MONO,
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#93C5FD',
            textDecoration: 'none',
            textTransform: 'uppercase',
            border: '1px solid rgba(147,197,253,0.18)',
            background: 'rgba(147,197,253,0.06)',
            borderRadius: '999px',
            padding: '4px 10px',
          }}
        >
          {link.platform}
        </a>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MARKDOWN RENDERER
   ═══════════════════════════════════════════════════════════════════════ */

function MarkdownInlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        color: hovered ? '#E0F2FE' : '#7DD3FC',
        textDecoration: 'none',
        borderBottom: `1px solid ${hovered ? 'rgba(224,242,254,0.7)' : 'rgba(125,211,252,0.35)'}`,
        background: hovered ? 'rgba(125,211,252,0.08)' : 'transparent',
        transition: 'color 0.18s ease, border-color 0.18s ease, background 0.18s ease',
        cursor: 'pointer',
      }}
    >
      {children}
    </a>
  );
}

function InlineText({ text }: { text: string }) {
  // Handle markdown links, bare URLs, **bold**, and *italic* inline.
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s<]+|www\.[^\s<]+|\*\*[^*]+\*\*|\*[^*]+\*)/gi);
  return (
    <>
      {parts.map((part, i) => {
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const href = safeExternalHref(linkMatch[2].trim());
          if (href) {
            return (
              <MarkdownInlineLink key={i} href={href}>
                {linkMatch[1]}
              </MarkdownInlineLink>
            );
          }
        }
        if (/^(https?:\/\/[^\s<]+|www\.[^\s<]+)$/i.test(part)) {
          const { urlText, trailing } = splitTrailingUrlPunctuation(part);
          const href = safeExternalHref(urlText);
          if (href) {
            return (
              <span key={i}>
                <MarkdownInlineLink href={href}>{urlText}</MarkdownInlineLink>
                {trailing}
              </span>
            );
          }
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <strong key={i} style={{ color: '#E2E8F0', fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function renderBlock(block: string, idx: number): React.ReactNode {
  const trimmed = block.trim();
  if (!trimmed) return null;

  const lines = trimmed.split('\n');
  const first = lines[0];

  // H2 — strip prefix, render as normal bold paragraph (not a heading)
  if (first.startsWith('## ')) {
    const text = lines.join(' ').trim().slice(3);
    return (
      <p key={idx} style={{
        fontFamily: INTER, fontSize: '17px', fontWeight: 600,
        color: '#E2E8F0', lineHeight: 1.85, margin: 0,
      }}>
        <InlineText text={text} />
      </p>
    );
  }

  // H3 — strip prefix, render as normal paragraph
  if (first.startsWith('### ')) {
    const text = lines.join(' ').trim().slice(4);
    return (
      <p key={idx} style={{
        fontFamily: INTER, fontSize: '17px',
        color: '#94A3B8', lineHeight: 1.85, margin: 0,
      }}>
        <InlineText text={text} />
      </p>
    );
  }

  // HR
  if (trimmed === '---') {
    return (
      <hr key={idx} style={{
        border: 'none', borderTop: `1px solid ${RULE}`, margin: 0,
      }} />
    );
  }

  // Blockquote — all lines start with "> "
  const isQuote = lines.every(l => l.startsWith('> ') || l === '>');
  if (isQuote) {
    return (
      <blockquote key={idx} style={{
        borderLeft: '3px solid rgba(194,52,77,0.45)',
        paddingLeft: '24px',
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {lines.map((l, i) => (
          <p key={i} style={{
            fontFamily: INTER, fontSize: '16px', fontStyle: 'italic',
            color: '#94A3B8', lineHeight: 1.75, margin: 0,
          }}>
            <InlineText text={l.startsWith('> ') ? l.slice(2) : ''} />
          </p>
        ))}
      </blockquote>
    );
  }

  // Unordered list — all non-empty lines start with "- " or "* "
  const listLines = lines.filter(l => l.trim());
  const isList = listLines.length > 0 && listLines.every(l => /^[-*]\s/.test(l));
  if (isList) {
    return (
      <ul key={idx} style={{
        margin: '0', paddingLeft: '24px',
        listStyleType: 'disc',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {listLines.map((l, i) => (
          <li key={i} style={{
            fontFamily: INTER, fontSize: '16px',
            color: '#94A3B8', lineHeight: 1.75,
            listStyleType: 'disc',
          }}>
            <InlineText text={l.slice(2)} />
          </li>
        ))}
      </ul>
    );
  }

  // Paragraph — join lines (handles soft-wrapped paragraphs)
  const text = lines.join(' ').trim();
  return (
    <p key={idx} style={{
      fontFamily: INTER, fontSize: '17px',
      color: '#94A3B8', lineHeight: 1.85, margin: 0,
    }}>
      <InlineText text={text} />
    </p>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════════════ */

function ReadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '4px' }}>
      <div style={{ height: '11px', width: '80px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px' }} />
      <div style={{ height: '38px', width: '85%', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }} />
      <div style={{ height: '38px', width: '65%', background: 'rgba(255,255,255,0.04)', borderRadius: '2px' }} />
      <div style={{ height: '11px', width: '120px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', marginTop: '4px' }} />
      <div style={{ height: '1px', background: RULE, marginTop: '12px' }} />
      {[100, 90, 95, 70, 85, 60].map((w, i) => (
        <div key={i} style={{ height: '16px', width: `${w}%`, background: 'rgba(255,255,255,0.04)', borderRadius: '2px' }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   POST CONTENT  (reads ?slug= from search params)
   ═══════════════════════════════════════════════════════════════════════ */

function PostContent() {
  const searchParams = useSearchParams();
  const slug         = searchParams.get('slug');

  const [post,    setPost]    = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (!slug) {
      queueMicrotask(() => { setLoading(false); setError(true); });
      return;
    }
    fetch(`/api/posts/${slug}`)
      .then(r => r.json() as Promise<{ success: boolean; data: Post }>)
      .then((d) => {
        if (d.success && d.data) setPost(d.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const cat = post
    ? (CATEGORY_META[post.category] ?? { label: post.category.toUpperCase().replace('_', ' '), color: '#475569' })
    : null;

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <div style={{
          maxWidth: '740px',
          margin: '0 auto',
          padding: '56px 32px 100px',
        }}>

          {/* Back link */}
          <div style={{ marginBottom: '44px' }}>
            <a
              href="/insights"
              style={{
                fontFamily: MONO,
                fontSize: '11px',
                letterSpacing: '0.14em',
                color: '#334155',
                textDecoration: 'none',
              }}
            >
              ← BACK TO DISPATCH
            </a>
          </div>

          {/* ── Loading ─────────────────────────────────────────── */}
          {loading && <ReadingSkeleton />}

          {/* ── Error ───────────────────────────────────────────── */}
          {error && !loading && (
            <div style={{
              padding: '64px 48px',
              textAlign: 'center',
              border: `1px solid ${RULE}`,
            }}>
              <div style={{ fontFamily: MONO, fontSize: '13px', color: '#334155', letterSpacing: '0.14em', marginBottom: '10px' }}>
                POST NOT FOUND
              </div>
              <div style={{ fontFamily: INTER, fontSize: '14px', color: '#1E293B' }}>
                The requested article could not be found.
              </div>
            </div>
          )}

          {/* ── Post ────────────────────────────────────────────── */}
          {post && !loading && (
            <>
              {/* Cover Image */}
              {post.cover_image && (
                <div style={{
                  width: '100%',
                  height: 'clamp(240px, 30vw, 400px)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  marginBottom: '36px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <img
                    src={post.cover_image}
                    alt=""
                    onError={e => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center 30%',
                      display: 'block',
                    }}
                  />
                </div>
              )}

              {/* Category badge + date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '22px' }}>
                {cat && (
                  <span style={{
                    fontFamily: MONO,
                    fontSize: '11px',
                    letterSpacing: '0.14em',
                    color: cat.color,
                    border: `1px solid ${cat.color}33`,
                    padding: '4px 10px',
                  }}>
                    {cat.label}
                  </span>
                )}
                <span style={{
                  fontFamily: MONO,
                  fontSize: '12px',
                  color: '#475569',
                  letterSpacing: '0.06em',
                }}>
                  {formatDate(post.published_at)}
                </span>
              </div>

              {/* Title */}
              <h1 style={{
                fontFamily: INTER,
                fontSize: 'clamp(28px, 5vw, 38px)',
                fontWeight: 800,
                color: '#F1F5F9',
                letterSpacing: '-0.03em',
                lineHeight: 1.12,
                margin: '0 0 14px',
              }}>
                {post.title}
              </h1>

              {/* Author */}
              <div style={{ marginBottom: '44px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: MONO,
                  fontSize: '12px',
                  color: (AUTHOR_META[post.author] ?? { color: '#334155' }).color,
                  letterSpacing: '0.08em',
                }}>
                  {post.author}
                </span>
                <AuthorLinkLabels links={post.author_links} />
              </div>

              {/* Rule */}
              <div style={{ height: '1px', background: RULE, marginBottom: '44px' }} />

              {/* Content */}
              <MarkdownContent content={post.content} />

              {/* Images */}
              {post.images.length > 0 && (
                <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {post.images.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt=""
                      style={{
                        width: '100%',
                        display: 'block',
                        border: `1px solid ${RULE}`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Disclaimer */}
              <div style={{ marginTop: '64px', paddingTop: '24px', borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                <p style={{
                  fontFamily: INTER,
                  fontSize: '12px',
                  color: '#334155',
                  lineHeight: 1.7,
                  margin: 0,
                }}>
                  This is informational content only. NOVRIX does not hold positions and does not make financial or trading recommendations. All analysis is based on publicly available data.
                </p>
              </div>
            </>
          )}

        </div>
      </main>

      <FooterHome />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE EXPORT  — Suspense required for useSearchParams in static export
   ═══════════════════════════════════════════════════════════════════════ */

export default function PostPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <main style={{ flex: 1 }} />
        </div>
      }
    >
      <PostContent />
    </Suspense>
  );
}
