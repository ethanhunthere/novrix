'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import type { AuthUser } from '@/lib/hooks/useAuth';

type GateMode = 'signin' | 'signup';

export default function AuthGate() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<GateMode>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [focusField, setFocusField] = useState('');
  const [siId, setSiId] = useState('');
  const [novrixId, setNovrixId] = useState('');
  const [idLoading, setIdLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [granted, setGranted] = useState(false);
  const [grantedFlash, setGrantedFlash] = useState(false);
  const [authedUser, setAuthedUser] = useState<AuthUser | null>(null);
  const idFetched = useRef(false);

  const closeGate = () => {
    setIsOpen(false);
    setMode('signin');
    setError('');
    setGranted(false);
    setGrantedFlash(false);
    idFetched.current = false;
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeGate();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('open-auth-gate', handler);
    return () => window.removeEventListener('open-auth-gate', handler);
  }, []);

  const navigateAfterAuth = () => {
    const pending = sessionStorage.getItem('novrix-pending-nav');
    if (pending) {
      sessionStorage.removeItem('novrix-pending-nav');
      // Force the module boot gate on the target terminal page.
      sessionStorage.setItem('novrix-auth-boot-pending', '1');
      window.location.href = pending;
    }
  };

  const fetchNewId = useCallback(() => {
    if (idFetched.current) return;
    idFetched.current = true;
    setIdLoading(true);
    setError('');
    fetch('/api/auth/generate-id', { method: 'POST', credentials: 'include' })
      .then(r => r.json() as Promise<{ success?: boolean; novrix_id?: string; error?: string }>)
      .then((d) => { if (d.success && d.novrix_id) setNovrixId(d.novrix_id); else { idFetched.current = false; setError(d.error || 'Failed to generate ID. Try again.'); } })
      .catch(() => { idFetched.current = false; setError('Connection error. Try again.'); })
      .finally(() => setIdLoading(false));
  }, []);

  useEffect(() => {
    if (mode !== 'signup') return;
    fetchNewId();
  }, [mode, fetchNewId]);

  const shake = () => { setShaking(true); setTimeout(() => setShaking(false), 600); };

  const signIn = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ novrix_id: siId.trim() }) });
      const data = await res.json() as { success?: boolean; user?: AuthUser; error?: string };
      if (res.ok && data.success && data.user) {
        window.dispatchEvent(new CustomEvent('auth-success', { detail: data.user }));
        navigateAfterAuth();
        return;
      }
      shake(); setError(data.error || 'Invalid credentials');
    } catch { shake(); setError('Connection error. Try again.'); }
    finally { setLoading(false); }
  };

  const signUp = async () => {
    setError(''); setLoading(true);
    try {
      const signupRes = await fetch('/api/auth/signup', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ novrix_id: novrixId }) });
      const signupData = await signupRes.json() as { success?: boolean; error?: string };
      if (!signupRes.ok || !signupData.success) { shake(); setError(signupData.error || 'Initialization failed'); return; }
      let resolvedUser: AuthUser | null = null;
      try {
        const loginRes = await fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ novrix_id: novrixId }) });
        const loginData = await loginRes.json() as { success?: boolean; user?: AuthUser };
        if (loginRes.ok && loginData.success && loginData.user) { resolvedUser = loginData.user; setAuthedUser(loginData.user); }
      } catch { /* silent */ }
      const capturedId = novrixId;
      setGranted(true);
      setGrantedFlash(true);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('auth-success', { detail: resolvedUser || { id: '', novrix_id: capturedId } }));
        navigateAfterAuth();
      }, 300);
    } catch { shake(); setError('Connection error. Try again.'); }
    finally { setLoading(false); }
  };

  const copyId = () => {
    navigator.clipboard.writeText(novrixId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (!isOpen) return null;

  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-6 overflow-y-auto"
      style={{ background: '#000000' }}
      initial={false} animate={{ opacity: 1 }} transition={{ duration: 0 }}
      onClick={e => { if (e.target === e.currentTarget) closeGate(); }}>

      <motion.div
        style={{ position: 'relative', width: '480px', maxWidth: 'calc(100vw - 32px)' }}
        initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0 }}>

        {/* Corner brackets — visible institutional frame */}
        <div aria-hidden="true" style={{ position: 'absolute', top: '-10px', left: '-10px', width: '20px', height: '20px', borderTop: '1.5px solid rgba(148,163,184,0.55)', borderLeft: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', borderTop: '1.5px solid rgba(148,163,184,0.55)', borderRight: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', bottom: '-10px', left: '-10px', width: '20px', height: '20px', borderBottom: '1.5px solid rgba(148,163,184,0.55)', borderLeft: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', bottom: '-10px', right: '-10px', width: '20px', height: '20px', borderBottom: '1.5px solid rgba(148,163,184,0.55)', borderRight: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />

        {/* Card */}
        <div style={{
          background: 'linear-gradient(180deg, #0C0E16 0%, #090A10 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 0,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.50), 0 32px 80px rgba(0,0,0,0.80), inset 0 1px 0 rgba(255,255,255,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top accent bar — visible slate */}
          <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.60) 30%, rgba(148,163,184,0.60) 70%, transparent 100%)', zIndex: 3 }} />

          {/* ── HEADER ── */}
          <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', borderBottom: '1px solid rgba(255,255,255,0.10)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', letterSpacing: '0.16em', color: '#CBD5E1', textTransform: 'uppercase', fontWeight: 600 }}>TERMINAL ACCESS</span>
            </div>
            <button onClick={closeGate}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.08em', transition: 'color 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.80)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
              [ESC]
            </button>
          </div>

          {/* ── CARD BODY ── */}
          <div style={{ padding: '36px 32px', position: 'relative', zIndex: 4, animation: shaking ? 'gateShake 0.5s ease' : 'none' }}>

            {/* ─ SIGN IN ─ */}
            {mode === 'signin' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#CBD5E1', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px', display: 'block', fontWeight: 600 }}>
                  Operator Access ID
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Enter 15-character access ID"
                    value={siId}
                    onChange={e => setSiId(e.target.value)}
                    onFocus={() => setFocusField('si-id')}
                    onBlur={() => setFocusField('')}
                    onKeyDown={e => e.key === 'Enter' && signIn()}
                    className="w-full focus:outline-none gate-input"
                    style={{
                      background: '#0F111A',
                      border: `1px solid ${focusField === 'si-id' ? 'rgba(148,163,184,0.65)' : 'rgba(255,255,255,0.14)'}`,
                      borderLeft: `3px solid ${focusField === 'si-id' ? 'rgba(148,163,184,0.90)' : 'rgba(255,255,255,0.10)'}`,
                      borderRadius: 0,
                      height: '50px',
                      padding: '0 16px',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '16px',
                      color: '#F8FAFC',
                      caretColor: '#94A3B8',
                      boxShadow: focusField === 'si-id' ? 'inset 0 0 0 1px rgba(148,163,184,0.08), 0 0 20px rgba(148,163,184,0.06)' : 'none',
                      transition: 'border-color 150ms, background 150ms, box-shadow 150ms',
                    }}
                    autoComplete="username"
                    spellCheck={false}
                  />
                </div>

                <button
                  onClick={signIn}
                  disabled={loading || !siId}
                  style={{
                    marginTop: '18px', width: '100%', height: '48px', borderRadius: 0,
                    background: loading || !siId ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${loading || !siId ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.22)'}`,
                    color: loading || !siId ? 'rgba(255,255,255,0.35)' : '#F1F5F9',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', letterSpacing: '0.14em', fontWeight: 600, textTransform: 'uppercase',
                    cursor: loading || !siId ? 'not-allowed' : 'pointer',
                    transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => { if (!loading && siId) { e.currentTarget.style.background = 'rgba(148,163,184,0.15)'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.65)'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.boxShadow = '0 0 24px rgba(148,163,184,0.10)'; } }}
                  onMouseLeave={e => { if (!loading && siId) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = '#F1F5F9'; e.currentTarget.style.boxShadow = 'none'; } }}>
                  {loading ? 'AUTHENTICATING…' : 'AUTHENTICATE'}
                </button>

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <button
                    onClick={() => { setMode('signup'); setError(''); }}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'rgba(148,163,184,0.80)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 150ms', letterSpacing: '0.04em' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#E2E8F0')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.80)')}>
                    Issue new credential
                  </button>
                </div>
              </div>
            )}

            {/* ─ SIGN UP ─ */}
            {mode === 'signup' && (
              <>
                {granted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#CBD5E1', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                      Generated Access ID
                    </label>
                    <div style={{ background: '#0F111A', border: '1px solid rgba(148,163,184,0.35)', height: '50px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '17px', color: '#E2E8F0', letterSpacing: '0.04em' }}>{novrixId}</span>
                      <button type="button" onClick={copyId}
                        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#4ADE80' : 'rgba(255,255,255,0.45)', padding: '4px', transition: 'color 150ms' }}
                        onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
                        onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                        title={copied ? 'Copied' : 'Copy ID'}>
                        {copied
                          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
                      </button>
                    </div>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#FCA5A5', margin: 0, lineHeight: 1.6, letterSpacing: '0.02em' }}>
                      This credential cannot be recovered. Save it before continuing.
                    </p>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('auth-success', { detail: authedUser || { id: '', novrix_id: novrixId } }));
                        navigateAfterAuth();
                      }}
                      style={{ width: '100%', height: '48px', borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.22)', color: '#F1F5F9', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', letterSpacing: '0.14em', fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,163,184,0.15)'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.65)'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.boxShadow = '0 0 24px rgba(148,163,184,0.10)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = '#F1F5F9'; e.currentTarget.style.boxShadow = 'none'; }}>
                      INITIALIZE ACCESS
                    </button>
                    <div style={{ textAlign: 'center' }}>
                      <button onClick={() => { setMode('signin'); setError(''); }}
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'rgba(148,163,184,0.80)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 150ms', letterSpacing: '0.04em' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#E2E8F0')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.80)')}>
                        Already have credentials? Sign in
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#CBD5E1', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px', display: 'block', fontWeight: 600 }}>
                      Generated Access ID
                    </label>
                    <div style={{ background: '#0F111A', border: `1px solid ${idLoading ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.35)'}`, height: '50px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      {idLoading ? (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#94A3B8' }}>Generating…</span>
                      ) : (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '17px', color: '#E2E8F0', letterSpacing: '0.04em' }}>{novrixId}</span>
                      )}
                      {!idLoading && novrixId && (
                        <button type="button" onClick={copyId}
                          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#4ADE80' : 'rgba(255,255,255,0.45)', padding: '4px', transition: 'color 150ms' }}
                          onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
                          onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                          title={copied ? 'Copied' : 'Copy ID'}>
                          {copied
                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
                        </button>
                      )}
                    </div>

                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#FCA5A5', marginTop: '14px', marginBottom: '0', lineHeight: 1.6, letterSpacing: '0.02em' }}>
                      This credential cannot be recovered. Save it before continuing.
                    </p>

                    <button
                      onClick={signUp}
                      disabled={loading || idLoading || !novrixId || grantedFlash}
                      style={{
                        marginTop: '18px', width: '100%', height: '48px', borderRadius: 0,
                        background: grantedFlash ? 'rgba(74,222,128,0.08)' : loading || idLoading || !novrixId ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                        border: grantedFlash ? '1px solid rgba(74,222,128,0.35)' : `1px solid ${loading || idLoading || !novrixId ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.22)'}`,
                        color: grantedFlash ? '#4ADE80' : loading || idLoading || !novrixId ? 'rgba(255,255,255,0.35)' : '#F1F5F9',
                        fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', letterSpacing: '0.14em', fontWeight: 600, textTransform: 'uppercase',
                        cursor: loading || idLoading || !novrixId || grantedFlash ? 'not-allowed' : 'pointer',
                        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={e => { if (!loading && !idLoading && novrixId && !grantedFlash) { e.currentTarget.style.background = 'rgba(148,163,184,0.15)'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.65)'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.boxShadow = '0 0 24px rgba(148,163,184,0.10)'; } }}
                      onMouseLeave={e => { if (!loading && !idLoading && novrixId && !grantedFlash) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = '#F1F5F9'; e.currentTarget.style.boxShadow = 'none'; } }}>
                      {grantedFlash ? 'ACCESS GRANTED' : loading ? 'INITIALIZING…' : 'INITIALIZE ACCESS'}
                    </button>

                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                      <button
                        onClick={() => { setMode('signin'); setError(''); }}
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'rgba(148,163,184,0.80)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 150ms', letterSpacing: '0.04em' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#E2E8F0')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.80)')}>
                        Already have credentials? Sign in
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Error */}
            {error && (
              <div style={{ marginTop: '18px', padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)', borderLeft: '3px solid #EF4444', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#FECACA', margin: 0, lineHeight: 1.6, letterSpacing: '0.02em' }}>{error}</p>
                {mode === 'signup' && !novrixId && (
                  <button onClick={fetchNewId} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.12em', color: '#FCA5A5', background: 'none', border: '1px solid rgba(252,165,165,0.35)', cursor: 'pointer', padding: '5px 10px', flexShrink: 0, textTransform: 'uppercase', transition: 'all 150ms' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(252,165,165,0.12)'; e.currentTarget.style.borderColor = 'rgba(252,165,165,0.50)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(252,165,165,0.35)'; }}>
                    RETRY
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 4 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(148,163,184,0.70)' }}>
              SECURE
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(148,163,184,0.55)' }}>
              TERMINAL
            </span>
          </div>

        </div>{/* /card */}

        <style jsx global>{`
          @keyframes gateShake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-6px)} 30%{transform:translateX(6px)} 45%{transform:translateX(-4px)} 60%{transform:translateX(4px)} 75%{transform:translateX(-2px)} 90%{transform:translateX(2px)} }
          .gate-input::placeholder { color: rgba(255,255,255,0.45); }
          .gate-input:focus::placeholder { color: rgba(255,255,255,0.20); }
          .gate-input:focus-visible { outline: none !important; }
        `}</style>
      </motion.div>
    </motion.div>
  );
}
