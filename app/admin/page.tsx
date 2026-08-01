'use client';

import { useState, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════════════
   ADMIN PANEL — NOVRIX Editorial Post Manager
   ═══════════════════════════════════════════════════════════════════════ */

const INTER = 'var(--font-inter), Inter, system-ui, sans-serif';
const MONO  = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';

const BG       = '#0D0E15';
const SURFACE  = '#151720';
const SURFACE2 = '#1C1E2A';
const BORDER   = 'rgba(255,255,255,0.07)';
const BORDER2  = 'rgba(255,255,255,0.04)';
const ACCENT   = '#C2344D';
const TEXT     = '#E4E9F2';
const TEXT2    = '#9BA3B8';
const MUTED    = '#5D667A';

const AUTHOR_COLORS: Record<string, string> = {
  Novrix:     '#6F8FCB',
  BullCase:   '#D4A74A',
  TechLeaks24:'#9B7BDA',
};

const CAT_LABELS: Record<string, string> = {
  novrix_view:   'OUR VIEW',
  privacy_watch: 'DEEP DIVE',
};

const CAT_COLORS: Record<string, string> = {
  novrix_view:   '#C2344D',
  privacy_watch: '#D4A74A',
};

interface Post {
  id: string;
  title: string;
  content: string;
  images: string[];
  cover_image?: string | null;
  category: string;
  author: string;
  published_at: string;
  slug: string;
}


function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <strong key={i} style={{ color: TEXT, fontWeight: 700 }}>
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

  if (first.startsWith('## ')) {
    return (
      <h2 key={idx} style={{
        fontFamily: INTER, fontSize: '24px', fontWeight: 700,
        color: TEXT, letterSpacing: '-0.02em', lineHeight: 1.25, margin: 0,
      }}>
        <InlineText text={first.slice(3)} />
      </h2>
    );
  }
  if (first.startsWith('### ')) {
    return (
      <h3 key={idx} style={{
        fontFamily: INTER, fontSize: '19px', fontWeight: 600,
        color: TEXT, letterSpacing: '-0.01em', lineHeight: 1.3, margin: 0,
      }}>
        <InlineText text={first.slice(4)} />
      </h3>
    );
  }
  if (trimmed === '---') {
    return (
      <hr key={idx} style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: 0 }} />
    );
  }
  const isQuote = lines.every(l => l.startsWith('> ') || l === '>');
  if (isQuote) {
    return (
      <blockquote key={idx} style={{
        borderLeft: `3px solid ${ACCENT}66`,
        paddingLeft: '24px', margin: 0,
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        {lines.map((l, i) => (
          <p key={i} style={{
            fontFamily: INTER, fontSize: '17px', fontStyle: 'italic',
            color: TEXT2, lineHeight: 1.75, margin: 0,
          }}>
            <InlineText text={l.startsWith('> ') ? l.slice(2) : ''} />
          </p>
        ))}
      </blockquote>
    );
  }
  const listLines = lines.filter(l => l.trim());
  const isList = listLines.length > 0 && listLines.every(l => /^[-*]\s/.test(l));
  if (isList) {
    return (
      <ul key={idx} style={{ margin: '0', paddingLeft: '24px', listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {listLines.map((l, i) => (
          <li key={i} style={{ fontFamily: INTER, fontSize: '17px', color: TEXT2, lineHeight: 1.75, listStyleType: 'disc' }}>
            <InlineText text={l.slice(2)} />
          </li>
        ))}
      </ul>
    );
  }
  const text = lines.join(' ').trim();
  return (
    <p key={idx} style={{ fontFamily: INTER, fontSize: '17px', color: TEXT2, lineHeight: 1.85, margin: 0 }}>
      <InlineText text={text} />
    </p>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}


const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: MONO,
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.08em',
  color: MUTED,
  marginBottom: '8px',
};

const inputBase: React.CSSProperties = {
  width: '100%',
  background: SURFACE2,
  border: `1px solid ${BORDER}`,
  borderRadius: '8px',
  padding: '12px 16px',
  fontFamily: INTER,
  fontSize: '15px',
  color: TEXT,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};

const selectBase: React.CSSProperties = {
  width: '100%',
  background: SURFACE2,
  border: `1px solid ${BORDER}`,
  borderRadius: '8px',
  padding: '11px 16px',
  fontFamily: MONO,
  fontSize: '13px',
  color: TEXT,
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '10px 22px',
  background: ACCENT,
  border: 'none',
  borderRadius: '8px',
  fontFamily: MONO,
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  color: '#fff',
  cursor: 'pointer',
  transition: 'opacity 0.15s, transform 0.1s',
};

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '10px 18px',
  background: 'transparent',
  border: `1px solid ${BORDER}`,
  borderRadius: '8px',
  fontFamily: MONO,
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.06em',
  color: TEXT2,
  cursor: 'pointer',
  transition: 'border-color 0.15s, color 0.15s',
};

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<Post | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [category, setCategory] = useState<'novrix_view' | 'privacy_watch'>('novrix_view');
  const [author, setAuthor] = useState<'Novrix' | 'BullCase' | 'TechLeaks24'>('Novrix');
  const [published, setPublished] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [fetchError, setFetchError] = useState('');

  const fetchPosts = useCallback(async () => {
    setFetchError('');
    try {
      const res = await fetch('/api/posts');
      if (res.status === 401) {
        setIsAuthenticated(false);
        setLoginError('Invalid password');
        setPassword('');
        return;
      }
      const json = await res.json() as { success: boolean; data: Post[]; error?: { message: string } };
      if (json.success && json.data) {
        setPosts(json.data);
      } else {
        setFetchError(json.error?.message || 'Failed to load posts');
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Network error');
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    queueMicrotask(() => { void fetchPosts(); });
  }, [isAuthenticated, fetchPosts]);

  /* Auto-dismiss success banner */
  useEffect(() => {
    if (!saveSuccess) return;
    const t = setTimeout(() => setSaveSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [saveSuccess]);

  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async () => {
    const pw = password.trim();
    if (!pw) {
      setLoginError('Password is required');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/posts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (json.success) {
        setIsAuthenticated(true);
        setLoginError('');
      } else {
        setIsAuthenticated(false);
        setLoginError(json.error?.message || 'Invalid password');
        setPassword('');
      }
    } catch {
      setIsAuthenticated(false);
      setLoginError('Network error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const resetEditor = () => {
    setEditing(null);
    setTitle('');
    setContent('');
    setCoverImage('');
    setCategory('novrix_view');
    setAuthor('Novrix');
    setPublished(true);
    setIsPreview(false);
    setSaveError('');
    setSaveSuccess('');
  };

  const handleEdit = (post: Post) => {
    setEditing(post);
    setTitle(post.title);
    setContent(post.content);
    setCoverImage(post.cover_image ?? '');
    setCategory(post.category as 'novrix_view' | 'privacy_watch');
    setAuthor((post.author as 'Novrix' | 'BullCase' | 'TechLeaks24') ?? 'Novrix');
    setPublished(new Date(post.published_at).getFullYear() > 2000 && new Date(post.published_at).getFullYear() < 2050);
    setIsPreview(false);
    setSaveError('');
    setSaveSuccess('');
  };

  const handleDelete = async (post: Post) => {
    if (!confirm(`Delete "${post.title}"?`)) return;
    try {
      const res = await fetch('/api/posts/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Post-Secret': password,
        },
        body: JSON.stringify({ slug: post.slug }),
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        setLoginError('Invalid password');
        setPassword('');
        return;
      }
      const json = await res.json() as { success: boolean };
      if (json.success) {
        setPosts(prev => prev.filter(p => p.slug !== post.slug));
        if (editing?.slug === post.slug) resetEditor();
      }
    } catch {
      alert('Failed to delete post');
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setSaveError('Title and content are required');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const publishedAt = published
      ? new Date().toISOString()
      : '1970-01-01T00:00:00Z';

    try {
      if (editing) {
        const res = await fetch('/api/posts/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Post-Secret': password,
            'Idempotency-Key': `update-${editing.slug}-${Date.now()}`,
          },
          body: JSON.stringify({
            slug: editing.slug,
            title: title.trim(),
            content: content.trim(),
            ...(coverImage.trim() ? { cover_image: coverImage.trim() } : {}),
            category,
            author,
            published_at: publishedAt,
          }),
        });
        if (res.status === 401) {
          setIsAuthenticated(false);
          setLoginError('Invalid password');
          setPassword('');
          setSaving(false);
          return;
        }
        const json = await res.json() as { success: boolean; error?: { message: string } };
        if (json.success) {
          setSaveSuccess('Post updated');
          await fetchPosts();
        } else {
          setSaveError(json.error?.message || 'Update failed');
        }
      } else {
        const res = await fetch('/api/posts/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Post-Secret': password,
            'Idempotency-Key': `create-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            ...(coverImage.trim() ? { cover_image: coverImage.trim() } : {}),
            category,
            author,
            published_at: publishedAt,
          }),
        });
        if (res.status === 401) {
          setIsAuthenticated(false);
          setLoginError('Invalid password');
          setPassword('');
          setSaving(false);
          return;
        }
        const json = await res.json() as { success: boolean; error?: { message: string } };
        if (json.success) {
          setSaveSuccess('Post published');
          await fetchPosts();
          resetEditor();
        } else {
          setSaveError(json.error?.message || 'Publish failed');
        }
      }
    } catch {
      setSaveError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: INTER,
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          padding: '0 20px',
        }}>
          <div style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: '12px',
            padding: '44px 36px',
          }}>
            <div style={{
              fontFamily: INTER,
              fontSize: '26px',
              fontWeight: 800,
              color: TEXT,
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}>
              Admin
            </div>
            <div style={{
              fontFamily: INTER,
              fontSize: '15px',
              color: TEXT2,
              marginBottom: '32px',
              lineHeight: 1.5,
            }}>
              Sign in to manage posts, authors, and content.
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontFamily: MONO,
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                color: MUTED,
                marginBottom: '8px',
              }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setLoginError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
                style={{
                  ...inputBase,
                  borderColor: loginError ? `${ACCENT}99` : BORDER,
                }}
              />
            </div>

            {loginError && (
              <div style={{
                fontFamily: MONO,
                fontSize: '12px',
                color: '#F87171',
                marginBottom: '20px',
                padding: '10px 14px',
                background: 'rgba(248,113,113,0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(248,113,113,0.15)',
              }}>
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loginLoading}
              style={{
                ...btnPrimary,
                opacity: loginLoading ? 0.6 : 1,
                cursor: loginLoading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loginLoading) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { if (!loginLoading) e.currentTarget.style.opacity = '1'; }}
            >
              {loginLoading ? 'VERIFYING...' : 'SIGN IN'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      fontFamily: INTER,
      color: TEXT,
    }}>
      {/* Top bar */}
      <div style={{
        borderBottom: `1px solid ${BORDER2}`,
        background: SURFACE,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 28px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontFamily: MONO,
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.10em',
              color: TEXT2,
            }}>
              Editorial
            </span>
            <span style={{
              width: '1px',
              height: '20px',
              background: BORDER,
              margin: '0 4px',
            }} />
            <span style={{
              fontFamily: MONO,
              fontSize: '11px',
              color: MUTED,
              letterSpacing: '0.04em',
            }}>
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => { resetEditor(); }}
              style={btnPrimary}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              + New Post
            </button>
          </div>
        </div>
      </div>

      {/* Success banner */}
      {saveSuccess && (
        <div style={{
          background: 'rgba(74,222,128,0.12)',
          borderBottom: '1px solid rgba(74,222,128,0.2)',
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '12px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="8" fill="rgba(74,222,128,0.25)" />
              <path d="M5 8l2 2 4-4" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{
              fontFamily: MONO,
              fontSize: '13px',
              fontWeight: 500,
              color: '#4ADE80',
              letterSpacing: '0.02em',
            }}>
              {saveSuccess}
            </span>
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '28px',
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        gap: '28px',
        alignItems: 'start',
      }}>
        {/* ── Sidebar: post list ─────────────────────────────── */}
        <div style={{
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: '12px',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          position: 'sticky',
          top: '28px',
        }}>
          <div style={{
            padding: '18px 20px',
            borderBottom: `1px solid ${BORDER2}`,
            fontFamily: MONO,
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: TEXT2,
          }}>
            Posts
          </div>

          {fetchError && (
            <div style={{
              padding: '12px 20px',
              fontFamily: INTER,
              fontSize: '13px',
              color: '#F87171',
              background: 'rgba(248,113,113,0.08)',
              borderBottom: `1px solid ${BORDER2}`,
            }}>
              {fetchError}
            </div>
          )}

          {posts.length === 0 && !fetchError && (
            <div style={{
              padding: '40px 20px',
              fontFamily: INTER,
              fontSize: '14px',
              color: MUTED,
              textAlign: 'center',
              lineHeight: 1.6,
            }}>
              No posts yet.<br />
              Click + New Post to get started.
            </div>
          )}

          {posts.map(post => {
            const isUnpublished = new Date(post.published_at).getFullYear() < 2000;
            const cat = post.category;
            const catColor = CAT_COLORS[cat] ?? TEXT2;
            const authorColor = AUTHOR_COLORS[post.author] ?? TEXT2;
            const isActive = editing?.id === post.id;

            return (
              <div
                key={post.id}
                onClick={() => handleEdit(post)}
                style={{
                  padding: '16px 20px',
                  borderBottom: `1px solid ${BORDER2}`,
                  cursor: 'pointer',
                  background: isActive ? 'rgba(194,52,77,0.06)' : 'transparent',
                  borderLeft: isActive ? `3px solid ${ACCENT}` : '3px solid transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Top row: category + author + draft badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '8px',
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontFamily: MONO,
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    color: catColor,
                  }}>
                    <span style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: catColor,
                      display: 'inline-block',
                    }} />
                    {CAT_LABELS[cat] ?? cat.toUpperCase()}
                  </span>
                  <span style={{
                    fontFamily: MONO,
                    fontSize: '10px',
                    color: authorColor,
                    opacity: 0.8,
                  }}>
                    {post.author}
                  </span>
                  {isUnpublished && (
                    <span style={{
                      fontFamily: MONO,
                      fontSize: '9px',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      color: '#F59E0B',
                      background: 'rgba(245,158,11,0.1)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}>
                      DRAFT
                    </span>
                  )}
                </div>

                {/* Title */}
                <div style={{
                  fontFamily: INTER,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isActive ? TEXT : '#C8CDD8',
                  lineHeight: 1.4,
                  marginBottom: '6px',
                }}>
                  {post.title}
                </div>

                {/* Bottom: date */}
                <div style={{
                  fontFamily: MONO,
                  fontSize: '10px',
                  color: MUTED,
                  letterSpacing: '0.02em',
                }}>
                  {new Date(post.published_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Editor ─────────────────────────────────────────── */}
        <div style={{
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 120px)',
          overflow: 'hidden',
        }}>
          {/* Editor toolbar */}
          <div style={{
            padding: '16px 24px',
            borderBottom: `1px solid ${BORDER2}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            <div style={{
              fontFamily: MONO,
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: TEXT2,
            }}>
              {editing ? 'Edit Post' : 'New Post'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setIsPreview(!isPreview)}
                style={{
                  ...btnGhost,
                  background: isPreview ? 'rgba(255,255,255,0.04)' : 'transparent',
                  color: isPreview ? TEXT : TEXT2,
                }}
              >
                {isPreview ? 'Edit' : 'Preview'}
              </button>
              {editing && (
                <button
                  onClick={() => handleDelete(editing)}
                  style={{
                    ...btnGhost,
                    borderColor: 'rgba(194,52,77,0.25)',
                    color: ACCENT,
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Form body */}
          <div style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflowY: 'auto',
            flex: 1,
          }}>
            {!isPreview ? (
              <>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Post title"
                    style={{
                      ...inputBase,
                      fontSize: '17px',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Cover Image</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      background: SURFACE2,
                      border: `1px solid ${BORDER}`,
                      borderRadius: '8px',
                      fontFamily: MONO,
                      fontSize: '12px',
                      color: TEXT2,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      userSelect: 'none',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => setCoverImage(reader.result as string);
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {coverImage && (
                      <button
                        onClick={() => setCoverImage('')}
                        style={{
                          ...btnGhost,
                          borderColor: 'rgba(248,113,113,0.2)',
                          color: '#F87171',
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={coverImage}
                    onChange={e => setCoverImage(e.target.value)}
                    placeholder="https://... or upload above"
                    style={inputBase}
                  />
                  {coverImage && (
                    <div style={{
                      marginTop: '12px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      maxHeight: '180px',
                      border: `1px solid ${BORDER}`,
                    }}>
                      <img src={coverImage} alt="" style={{ width: '100%', height: 'auto', maxHeight: '180px', objectFit: 'cover', display: 'block' }} />
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: '16px',
                  alignItems: 'end',
                }}>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as 'novrix_view' | 'privacy_watch')}
                      style={selectBase}
                    >
                      <option value="novrix_view">OUR VIEW</option>
                      <option value="privacy_watch">DEEP DIVE</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Author</label>
                    <select
                      value={author}
                      onChange={e => setAuthor(e.target.value as 'Novrix' | 'BullCase' | 'TechLeaks24')}
                      style={selectBase}
                    >
                      <option value="Novrix">NOVRIX</option>
                      <option value="BullCase">BULLCASE</option>
                      <option value="TechLeaks24">TECHLEAKS24</option>
                    </select>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    paddingBottom: '2px',
                  }}>
                    <button
                      type="button"
                      onClick={() => setPublished(!published)}
                      style={{
                        width: '40px',
                        height: '22px',
                        borderRadius: '11px',
                        border: 'none',
                        background: published ? 'rgba(74,222,128,0.25)' : SURFACE2,
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        padding: 0,
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '3px',
                        left: published ? '20px' : '3px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: published ? '#4ADE80' : '#5D667A',
                        transition: 'left 0.15s, background 0.15s',
                      }} />
                    </button>
                    <span style={{
                      fontFamily: MONO,
                      fontSize: '11px',
                      fontWeight: 500,
                      letterSpacing: '0.06em',
                      color: published ? '#4ADE80' : MUTED,
                    }}>
                      {published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={labelStyle}>Content</label>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="# Heading&#10;&#10;Write your post in markdown..."
                    style={{
                      ...inputBase,
                      flex: 1,
                      minHeight: '350px',
                      fontFamily: MONO,
                      fontSize: '14px',
                      lineHeight: 1.8,
                      resize: 'vertical',
                    }}
                  />
                </div>
              </>
            ) : (
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 4px',
              }}>
                <div style={{
                  fontFamily: INTER,
                  fontSize: 'clamp(24px, 3vw, 36px)',
                  fontWeight: 800,
                  color: TEXT,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  marginBottom: '28px',
                }}>
                  {title || 'Untitled'}
                </div>
                <MarkdownPreview content={content || '*No content*'} />
              </div>
            )}
          </div>

          {/* Footer: save */}
          <div style={{
            padding: '16px 24px',
            borderTop: `1px solid ${BORDER2}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {saveError && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: MONO,
                  fontSize: '12px',
                  color: '#F87171',
                  padding: '6px 12px',
                  background: 'rgba(248,113,113,0.08)',
                  borderRadius: '6px',
                }}>
                  {saveError}
                </span>
              )}
              {saveSuccess && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: MONO,
                  fontSize: '12px',
                  color: '#4ADE80',
                  padding: '6px 12px',
                  background: 'rgba(74,222,128,0.08)',
                  borderRadius: '6px',
                }}>
                  {saveSuccess}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={resetEditor}
                style={{
                  ...btnGhost,
                  padding: '10px 20px',
                  color: MUTED,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...btnPrimary,
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? 'wait' : 'pointer',
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.opacity = '1'; }}
              >
                {saving ? 'Saving...' : editing ? 'Update Post' : 'Publish Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
