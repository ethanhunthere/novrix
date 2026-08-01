'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCLI } from '@/lib/state/CLIContext';
import { useAuth } from '@/lib/hooks/useAuth';
import { openAuthGate } from '@/lib/utils/auth';

const VERSION = '1.0.0';

type LineType = 'input' | 'output' | 'error' | 'success' | 'info' | 'accent' | 'muted';

interface OutputLine {
  id:   number;
  text: string;
  type: LineType;
}

const LINE_COLORS: Record<LineType, string> = {
  input:   '#71717A',
  output:  '#A1A1AA',
  error:   '#EF4444',
  success: '#10B981',
  info:    '#3B82F6',
  accent:  '#C2344D',
  muted:   '#52525B',
};

const ROUTES: Record<string, string> = {
  sentiment:   '/sentiment',
  terminal:    '/terminal',
  tracking:    '/tracking',
  metrilytics: '/metrilytics',
  insights:    '/insights',
  methodology: '/methodology',
  about:       '/about',
  changelog:   '/changelog',
};

/* ── Sentiment indicator shortcuts ──
   `n <key>` → scroll to the panel with the matching DOM id on /sentiment. */
const INDICATOR_MAP: Record<string, string> = {
  fg:                 'indicator-fear-greed',
  nupl:               'indicator-nupl',
  nrpl:               'indicator-nrpl',
  trending:           'indicator-trending',
  mvrv:               'indicator-mvrv',
  aviv:               'indicator-aviv',
  'mvrv-z':           'indicator-mvrv-zscore',
  'market-cap':       'indicator-market-cap-k4',
  'crypto-mcap':      'indicator-crypto-market-cap',
  'realized-price':   'indicator-realized-price',
  '200wma':           'indicator-200-week-ma',
  cvdd:               'indicator-cvdd',
  mayer:              'indicator-mayer-multiple',
  'reserve-risk':     'indicator-reserve-risk',
  rhodl:              'indicator-rhodl-ratio',
  sopr:               'indicator-sopr',
  'supply-profit':    'indicator-supply-profit',
  'supply-loss':      'indicator-supply-loss',
  'realized-profit':  'indicator-realized-profit',
  'realized-loss':    'indicator-realized-loss',
  'utxo-profit':      'indicator-utxo-profit',
  'utxo-loss':        'indicator-utxo-loss',
  'sth-mvrv':         'indicator-sth-mvrv',
  'lth-mvrv':         'indicator-lth-mvrv',
  'lth-delta':        'indicator-lth-position-change',
  'sth-delta':        'indicator-sth-position-change',
  vdd:                'indicator-vdd',
  nvts:               'indicator-nvts',
  'nvt-z':            'indicator-nvt-zscore',
  'hot-supply':       'indicator-hot-supply',
  'liquid-supply':    'indicator-highly-liquid-supply',
  'supply-shock':     'indicator-supply-shock',
  'stablecoin-supply':'indicator-stablecoin-supply',
  'active-addr':      'indicator-active-addresses',
  hashrate:           'indicator-hashrate',
  hashribbons:        'indicator-hashribbons',
  puell:              'indicator-puell-multiple',
  'miner-sell':       'indicator-miner-sell-pressure',
  mpi:                'indicator-mpi',
  dominance:          'indicator-dominance',
  oi:                 'indicator-open-interest',
  funding:            'indicator-funding-rate',
  etf:                'indicator-etf',
  ssr:                'indicator-ssr',
};

const MACRO_MAP: Record<string, string> = {
  fedfunds:        'indicator-fedfunds',
  'fed-balance':   'indicator-fred-walcl',
  repo:            'indicator-fred-rrpontsyd',
  sofr:            'indicator-fred-sofr',
  cpi:             'indicator-fred-cpiaucsl',
  'core-cpi':      'indicator-fred-cpilfesl',
  pce:             'indicator-fred-pcepi',
  'core-pce':      'indicator-fred-pcepilfe',
  'inflation-exp': 'indicator-fred-mich',
  'breakeven-5y':  'indicator-fred-t5yie',
  'breakeven-10y': 'indicator-fred-t10yie',
  t1m:             'indicator-fred-dgs1mo',
  t3m:             'indicator-fred-dgs3mo',
  t6m:             'indicator-fred-dgs6mo',
  t1y:             'indicator-fred-dgs1',
  t5y:             'indicator-fred-dgs5',
  t20y:            'indicator-fred-dgs20',
  t30y:            'indicator-fred-dgs30',
  'spread-10y2y':  'indicator-fred-t10y2y',
  'spread-10y3m':  'indicator-fred-t10y3m',
  m2:              'indicator-m2',
  m3:              'indicator-fred-mabmm301usm189s',
  credit:          'indicator-fred-totalsl',
  unemployment:    'indicator-fred-unrate',
  payrolls:        'indicator-fred-payems',
  jobless:         'indicator-fred-icsa',
  'job-openings':  'indicator-fred-jtsjol',
  'emp-ratio':     'indicator-fred-emratio',
  gdp:             'indicator-fred-gdpc1',
  indpro:          'indicator-fred-indpro',
  housing:         'indicator-fred-houst',
  'consumer-sent': 'indicator-fred-umcsent',
  retail:          'indicator-fred-rsxfs',
  vix:             'indicator-vix',
  dxy:             'indicator-dxy',
  sp500:           'indicator-sp500',
  gold:            'indicator-gold',
  oil:             'indicator-fred-dcoilwtico',
  'hy-spread':     'indicator-fred-bamlh0a0hym2',
  mortgage:        'indicator-fred-mortgage30us',
};

const ALL_COMMANDS: string[] = [
  /* system */
  'help', 'clear', 'version', 'status', 'ping',
  /* auth */
  'login', 'logout', 'whoami', 'session', 'session refresh', 'register', 'id generate',
  /* navigation */
  ...Object.keys(ROUTES).map(k => `go ${k}`), 'home',
  /* sentiment indicators */
  ...Object.keys(INDICATOR_MAP).map(k => `n ${k}`),
  /* macro */
  ...Object.keys(MACRO_MAP).map(k => `macro ${k}`),
  /* misc */
  'whale', 'defi', 'defi tvl', 'defi tvl --chain eth', 'news',
];

export default function GlobalCLI() {
  const { isOpen, close, toggle } = useCLI();
  const { user }   = useAuth();
  const router     = useRouter();
  const pathname   = usePathname();

  const [input,        setInput]        = useState('');
  const [output,       setOutput]       = useState<OutputLine[]>([]);
  const [history,      setHistory]      = useState<string[]>([]);
  const [historyIdx,   setHistoryIdx]   = useState(-1);

  const inputRef    = useRef<HTMLInputElement>(null);
  const outputRef   = useRef<HTMLDivElement>(null);
  const lineId      = useRef(0);
  const isRunning   = useRef(false);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 60);
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === '`' && !e.ctrlKey && !e.metaKey && !e.altKey) ||
          (e.ctrlKey && e.key === 'k')) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  useEffect(() => {
    if (outputRef.current)
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const addLine = useCallback((text: string, type: LineType = 'output') => {
    setOutput(prev => [...prev, { id: lineId.current++, text, type }]);
  }, []);

  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  const typeLines = useCallback(async (
    lines: Array<{ text: string; type?: LineType }>,
    ms = 22,
  ) => {
    for (const l of lines) {
      await delay(ms);
      setOutput(prev => [...prev, { id: lineId.current++, text: l.text, type: l.type ?? 'output' }]);
    }
  }, []);

  const focusIndicator = useCallback((id: string): boolean => {
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const prev = el.style.boxShadow;
    el.style.transition = 'box-shadow 400ms ease';
    el.style.boxShadow  = '0 0 0 2px #C2344D, 0 0 24px rgba(194,52,77,0.45)';
    setTimeout(() => { el.style.boxShadow = prev; }, 1800);
    return true;
  }, []);

  const gotoIndicator = useCallback(async (id: string, label: string) => {
    if (pathname === '/sentiment' && focusIndicator(id)) {
      addLine(`Focused → ${label} (${id})`, 'success');
      setTimeout(close, 220);
      return;
    }
    addLine(`Opening → ${label} on /sentiment`, 'info');
    openAuthGate();
    setTimeout(close, 220);
    // Poll up to ~3.6s for the panel to mount after navigation.
    for (let i = 0; i < 18; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (focusIndicator(id)) return;
    }
  }, [pathname, router, close, focusIndicator, addLine]);

  const handleCommand = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    if (isRunning.current) return;
    isRunning.current = true;

    setHistory(prev => [cmd, ...prev.filter(h => h !== cmd)].slice(0, 200));
    setHistoryIdx(-1);
    addLine(`$ ${cmd}`, 'input');

    const parts = cmd.toLowerCase().split(/\s+/).filter(Boolean);
    const base  = parts[0] ?? '';
    const sub   = parts[1] ?? '';
    const arg2  = parts[2] ?? '';
    const arg3  = parts[3] ?? '';

    const unknown = () => {
      addLine(`command not found: ${cmd}. Type help for available commands.`, 'error');
    };

    try {
      if (base === 'help') {
        await typeLines([
          { text: '──────────────────────────────────────────────', type: 'muted' },
          { text: `NOVRIX CLI v${VERSION} — Command Reference`,    type: 'accent' },
          { text: '──────────────────────────────────────────────', type: 'muted' },
          { text: 'SYSTEM',     type: 'accent' },
          { text: '  help                 Show this reference' },
          { text: '  clear                Clear terminal output' },
          { text: '  version              Print platform version' },
          { text: '  status               Module / session status' },
          { text: '  ping                 API roundtrip latency' },
          { text: 'AUTH',       type: 'accent' },
          { text: '  login                Open login flow' },
          { text: '  logout               End session, return home' },
          { text: '  register             Open register flow' },
          { text: '  whoami               Print session ID and expiry' },
          { text: '  session              Print session expiry timestamp' },
          { text: '  session refresh      Extend current session' },
          { text: '  id generate          Issue a fresh NOVRIX ID' },
          { text: 'NAVIGATION', type: 'accent' },
          { text: '  go sentiment | terminal | tracking | metrilytics' },
          { text: '  go insights | methodology | about | changelog' },
          { text: '  home                 Navigate to /' },
          { text: 'SENTIMENT  (n <indicator>)', type: 'accent' },
          { text: '  e.g. n fg, n nupl, n mvrv, n sopr, n dominance, n oi' },
          { text: '  46 indicators total — see spec for full list' },
          { text: 'MACRO  (macro <key>)', type: 'accent' },
          { text: '  e.g. macro cpi, macro fedfunds, macro vix, macro dxy' },
          { text: '  39 macro series total' },
          { text: 'MODULES',    type: 'accent' },
          { text: '  whale                /tracking — whale flow feed' },
          { text: '  defi                 /metrilytics — DeFi snapshot' },
          { text: '  defi tvl             Total value locked, all chains' },
          { text: '  defi tvl --chain eth Ethereum TVL only' },
          { text: '  news                 /insights — latest news' },
          { text: '──────────────────────────────────────────────', type: 'muted' },
        ], 14);
        return;
      }

      if (base === 'clear') { setOutput([]); return; }

      if (base === 'version') {
        await typeLines([
          { text: 'NOVRIX Intelligence Platform',                    type: 'accent' },
          { text: `Version    v${VERSION}`,                          type: 'success' },
          { text: 'Frontend   Next.js 16 / React 19 / TypeScript',   type: 'output' },
          { text: 'Edge       Cloudflare Pages + Workers + Data Cache', type: 'output' },
          { text: 'Build      Static export (SSG)',                  type: 'output' },
        ], 22);
        return;
      }

      if (base === 'status') {
        addLine('Probing modules...', 'info');
        const probes = [
          { name: 'Sentiment',   url: '/api/sentiment/cached' },
          { name: 'Tracking',    url: '/api/tracking?limit=1' },
          { name: 'Metrilytics', url: '/api/metrilytics' },
          { name: 'News',        url: '/api/news?limit=1' },
        ];
        const results = await Promise.all(probes.map(async p => {
          const t0 = performance.now();
          try {
            const r  = await fetch(p.url, { credentials: 'include' });
            const ms = Math.round(performance.now() - t0);
            return { name: p.name, ok: r.ok, ms };
          } catch {
            return { name: p.name, ok: false, ms: 0 };
          }
        }));
        await typeLines([
          { text: `Auth        ${user ? 'AUTHENTICATED' : 'UNAUTHENTICATED'}`, type: user ? 'success' : 'error' },
          { text: `Identity    ${user ? user.novrix_id : 'NONE'}`,             type: 'output' },
          { text: `Page        ${pathname || '/'}`,                            type: 'output' },
          ...results.map(r => ({
            text: `${r.name.padEnd(11)} ${r.ok ? 'ONLINE' : 'OFFLINE'}  ${r.ok ? r.ms + 'ms' : ''}`,
            type: (r.ok ? 'success' : 'error') as LineType,
          })),
        ], 25);
        return;
      }

      if (base === 'ping') {
        addLine('Pinging /api/auth/me...', 'info');
        const t0 = performance.now();
        try {
          await fetch('/api/auth/me', { credentials: 'include' });
          const ms      = Math.round(performance.now() - t0);
          const quality = ms < 60 ? 'EXCELLENT' : ms < 150 ? 'GOOD' : ms < 300 ? 'ACCEPTABLE' : 'DEGRADED';
          await typeLines([
            { text: `PONG   ${ms}ms — ${quality}`, type: ms < 150 ? 'success' : 'error' },
            { text: 'Edge   Cloudflare Pages',     type: 'info' },
          ], 25);
        } catch { addLine('Ping failed — network error.', 'error'); }
        return;
      }

      if (base === 'login') {
        addLine('Opening terminal. Select a module to authenticate.', 'info');
        setTimeout(() => { router.push('/terminal'); close(); }, 280);
        return;
      }

      if (base === 'register') {
        addLine('Opening terminal. Select a module to issue credentials.', 'info');
        setTimeout(() => { router.push('/terminal'); close(); }, 280);
        return;
      }

      if (base === 'logout') {
        if (!user) { addLine('No active session to terminate.', 'error'); return; }
        addLine('Terminating session...', 'info');
        try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
        addLine('Session cleared. Redirecting...', 'success');
        setTimeout(() => { window.location.href = '/'; }, 600);
        return;
      }

      if (base === 'whoami') {
        if (!user) {
          await typeLines([
            { text: 'NOT AUTHENTICATED',  type: 'error' },
            { text: 'Run: login',         type: 'info'  },
          ], 30);
          return;
        }
        try {
          const r = await fetch('/api/auth/me', { credentials: 'include' });
          const d = r.ok ? (await r.json()) as Record<string, unknown> : null;
          const exp = d?.expires_at ?? d?.expiresAt ?? '—';
          await typeLines([
            { text: `NOVRIX ID   ${user.novrix_id}`, type: 'success' },
            { text: `Expires     ${String(exp)}`,    type: 'output'  },
            { text: 'Clearance   OPERATOR',          type: 'success' },
          ], 30);
        } catch { addLine('Failed to read session.', 'error'); }
        return;
      }

      if (base === 'session' && (sub === '' || sub === 'show')) {
        if (!user) { addLine('No active session.', 'error'); return; }
        try {
          const r = await fetch('/api/auth/me', { credentials: 'include' });
          const d = r.ok ? (await r.json()) as Record<string, unknown> : null;
          const exp = d?.expires_at ?? d?.expiresAt ?? '—';
          await typeLines([
            { text: `Session expires   ${String(exp)}`, type: 'success' },
          ], 25);
        } catch { addLine('Failed to read session.', 'error'); }
        return;
      }

      if (base === 'session' && sub === 'refresh') {
        addLine('Refreshing session...', 'info');
        try {
          const r = await fetch('/api/auth/me', { credentials: 'include' });
          if (!r.ok) { addLine('Refresh failed — not authenticated.', 'error'); return; }
          const d   = (await r.json()) as Record<string, unknown>;
          const exp = d?.expires_at ?? d?.expiresAt ?? '—';
          await typeLines([
            { text: 'Session extended.',         type: 'success' },
            { text: `New expiry  ${String(exp)}`, type: 'output' },
          ], 25);
        } catch { addLine('Network error refreshing session.', 'error'); }
        return;
      }

      if (base === 'id' && sub === 'generate') {
        addLine('Generating NOVRIX ID...', 'info');
        try {
          const r = await fetch('/api/auth/generate-id', {
            method: 'POST', credentials: 'include',
            headers: { 'content-type': 'application/json' },
          });
          const d = (await r.json().catch(() => null)) as Record<string, unknown> | null;
          if (!r.ok || !d?.novrix_id) {
            addLine(`Failed: ${(d?.error as string) || `HTTP ${r.status}`}`, 'error');
            return;
          }
          await typeLines([
            { text: '────────────────────────────────────────────', type: 'muted'  },
            { text: `  ID   ${String(d.novrix_id)}`,               type: 'accent'  },
            { text: '────────────────────────────────────────────', type: 'muted'  },
            { text: '  Preview only — not registered.',            type: 'muted'   },
            { text: '  To create an account: register',            type: 'info'    },
            { text: '  To sign in: login',                         type: 'info'    },
          ], 22);
        } catch { addLine('Network error. Try again.', 'error'); }
        return;
      }

      if (base === 'go' && sub) {
        const path = ROUTES[sub];
        if (!path) { addLine(`go: unknown destination "${sub}".`, 'error'); return; }
        const intelRoutes = ['/sentiment', '/tracking', '/metrilytics'];
        if (intelRoutes.includes(path)) {
          addLine(`Opening ${path}...`, 'info');
          openAuthGate();
          setTimeout(close, 240);
          return;
        }
        addLine(`Navigating to ${path}...`, 'info');
        setTimeout(() => { router.push(path); close(); }, 240);
        return;
      }

      if (base === 'home') {
        addLine('Navigating to /', 'info');
        setTimeout(() => { router.push('/'); close(); }, 240);
        return;
      }

      if (base === 'n') {
        if (!sub) { addLine('n: missing indicator key. e.g. n nupl', 'error'); return; }
        const id = INDICATOR_MAP[sub];
        if (!id) { addLine(`n: unknown indicator "${sub}". Type help for a list.`, 'error'); return; }
        await gotoIndicator(id, sub);
        return;
      }

      if (base === 'macro') {
        if (!sub) { addLine('macro: missing key. e.g. macro cpi', 'error'); return; }
        const id = MACRO_MAP[sub];
        if (!id) { addLine(`macro: unknown key "${sub}". Type help for a list.`, 'error'); return; }
        await gotoIndicator(id, `macro ${sub}`);
        return;
      }

      if (base === 'whale') {
        addLine('Opening whale tracking...', 'info');
        openAuthGate();
        setTimeout(close, 240);
        return;
      }

      if (base === 'defi') {
        if (!sub) {
          addLine('Opening DeFi metrilytics...', 'info');
          openAuthGate();
          setTimeout(close, 240);
          return;
        }
        if (sub === 'tvl') {
          // Optional flag: --chain eth (or other chain slug)
          let chain: string | null = null;
          if (arg2 === '--chain' && arg3) chain = arg3;
          addLine(chain ? `Fetching TVL for chain="${chain}"...` : 'Fetching total DeFi TVL...', 'info');
          try {
            const r = await fetch('https://api.llama.fi/v2/chains');
            if (!r.ok) { addLine('TVL fetch failed.', 'error'); return; }
            const list = (await r.json()) as Array<{ name: string; tokenSymbol?: string; tvl: number; gecko_id?: string }>;
            if (chain) {
              const target = chain.toLowerCase();
              const found  = list.find(c =>
                c.name?.toLowerCase() === target ||
                c.tokenSymbol?.toLowerCase() === target ||
                c.gecko_id?.toLowerCase() === target ||
                (target === 'eth' && c.name?.toLowerCase() === 'ethereum'),
              );
              if (!found) { addLine(`No TVL data for chain "${chain}".`, 'error'); return; }
              const tvl = found.tvl ?? 0;
              const fmt = tvl >= 1e9 ? `$${(tvl / 1e9).toFixed(2)}B` : `$${(tvl / 1e6).toFixed(2)}M`;
              await typeLines([
                { text: `${found.name} TVL   ${fmt}`, type: 'success' },
                { text: 'Source             DeFiLlama', type: 'info' },
              ], 28);
            } else {
              const total = list.reduce((s, c) => s + (c.tvl ?? 0), 0);
              const fmt   = total >= 1e9 ? `$${(total / 1e9).toFixed(2)}B` : `$${(total / 1e6).toFixed(2)}M`;
              await typeLines([
                { text: `Total DeFi TVL     ${fmt}`,         type: 'success' },
                { text: `Chains tracked     ${list.length}`, type: 'output'  },
                { text: 'Source             DeFiLlama',      type: 'info'    },
              ], 28);
            }
          } catch { addLine('Network error fetching TVL.', 'error'); }
          return;
        }
        addLine(`defi: unknown subcommand "${sub}".`, 'error');
        return;
      }

      if (base === 'news') {
        addLine('Opening latest news feed...', 'info');
        setTimeout(() => { router.push('/insights'); close(); }, 240);
        return;
      }

      unknown();
    } finally {
      isRunning.current = false;
    }
  }, [addLine, typeLines, user, router, pathname, close, gotoIndicator]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const v = input.trim();
      setInput('');
      if (v) handleCommand(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(next);
      if (history[next] !== undefined) setInput(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setInput(next === -1 ? '' : history[next] ?? '');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const low = input.toLowerCase();
      const matches = ALL_COMMANDS.filter(c => c.startsWith(low) && c !== low);
      if (matches.length === 1) {
        setInput(matches[0]);
      } else if (matches.length > 1 && matches.length <= 8) {
        addLine(matches.join('    '), 'info');
      }
    } else if (e.key === 'Escape') {
      close();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full max-w-2xl flex flex-col"
        style={{
          background: '#09090B',
          border: '1px solid #27272A',
          boxShadow: '0 0 0 1px rgba(194,52,77,0.07), 0 40px 100px rgba(0,0,0,0.95)',
          fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
          maxHeight: 'min(600px, 90vh)',
        }}
      >
        {/* Title bar */}
        <div
          className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ background: '#111113', borderBottom: '1px solid #1C1C1E' }}
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#3F3F46' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#3F3F46' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#3F3F46' }} />
            </div>
            <span className="text-[9px] uppercase tracking-[0.22em] ml-2 font-mono" style={{ color: '#52525B' }}>
              NOVRIX CLI
            </span>
            {user && (
              <span className="text-[9px] font-mono" style={{ color: '#3B82F6', marginLeft: '8px' }}>
                [{user.novrix_id}]
              </span>
            )}
          </div>
          <button
            onClick={close}
            className="text-[9px] tracking-[0.18em] uppercase font-mono transition-colors duration-150"
            style={{ color: '#52525B' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#A1A1AA')}
            onMouseLeave={e => (e.currentTarget.style.color = '#52525B')}
          >
            [ESC]
          </button>
        </div>

        {/* Boot line */}
        <div
          className="px-4 py-1.5 shrink-0 text-[10px] font-mono"
          style={{ background: '#0C0C0E', borderBottom: '1px solid #1A1A1C', color: '#3B82F6', letterSpacing: '0.02em' }}
        >
          NOVRIX CLI v{VERSION} — type &apos;help&apos; for commands · Ctrl+K or ` to toggle
        </div>

        {/* Output */}
        <div
          ref={outputRef}
          className="flex-1 overflow-y-auto px-4 py-3 min-h-0"
          style={{ fontSize: '11px', lineHeight: '1.7', scrollbarWidth: 'thin', scrollbarColor: '#27272A transparent' }}
        >
          {output.length === 0 ? (
            <div style={{ color: '#3F3F46', fontSize: '11px' }}>
              Type a command and press Enter. Type &apos;help&apos; to see all commands.
            </div>
          ) : output.map(line => (
            <div
              key={line.id}
              style={{
                color: LINE_COLORS[line.type] ?? '#A1A1AA',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              }}
            >
              {line.text || '\u00A0'}
            </div>
          ))}
        </div>

        {/* Input */}
        <div
          className="flex items-center gap-2 px-4 py-3 shrink-0"
          style={{ borderTop: '1px solid #27272A', background: '#0C0C0E' }}
        >
          <span style={{ color: '#C2344D', fontSize: '13px', lineHeight: 1, fontFamily: 'monospace' }}>$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setHistoryIdx(-1); }}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent outline-none"
            style={{
              color: '#FAFAFA',
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              fontSize: '12px',
              caretColor: '#C2344D',
              letterSpacing: '0.02em',
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
