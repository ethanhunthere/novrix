'use client';

/**
 * Shared panel utilities for the Sentiment Intelligence page.
 * Extracted from app/sentiment/page.tsx so they can be imported by
 * SentimentChartPanel.tsx and any other components that need them.
 */

import { useState, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';

// updateFreq thresholds: bg=BGeometrics(daily), d=FRED daily, w=weekly, m=monthly, q=quarterly
// Each entry is [liveMaxDays, staleMaxDays] — beyond staleMax is OFFLINE
const FREQ_THRESHOLDS: Record<string, [number, number]> = {
  bg: [2, 7], d: [3, 10], w: [10, 21], m: [45, 90], q: [100, 200],
};

export const PanelHeader = ({
  code,
  title,
  desc,
  value,
  zone,
  tag,
  accentColor = '#C2344D',
  lastUpdated,
  updateFreq = 'bg',
  onScreenshot,
  onMaximize,
  isMaximized,
}: {
  code: string;
  title: string;
  desc?: string;
  value?: string | null;
  zone?: { label: string; color: string } | null;
  tag?: string;
  accentColor?: string;
  lastUpdated?: string | null;
  updateFreq?: 'bg' | 'd' | 'w' | 'm' | 'q';
  onScreenshot?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) => {


  return (
  <div
    className="flex flex-col xl:flex-row xl:items-center xl:justify-between px-4 sm:px-5 border-b"
    style={{
      background: 'linear-gradient(90deg, rgba(255,255,255,0.018) 0%, rgba(3,8,20,0.98) 20%, rgba(3,7,18,0.98) 100%)',
      borderBottomColor: 'rgba(255,255,255,0.06)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.4)',
      minHeight: '64px',
    }}
  >
    <div className="flex items-center gap-3.5 min-w-0 py-3">
      <div
        className="w-[2px] self-stretch shrink-0"
        style={{ background: `linear-gradient(180deg, ${accentColor}90 0%, ${accentColor}00 100%)` }}
      />
      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
        <span
          className="text-[12px] tracking-[0.18em] shrink-0 uppercase font-black px-2 py-1"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            color: accentColor,
            textShadow: `0 0 12px ${accentColor}70`,
            background: `${accentColor}15`,
            border: `1px solid ${accentColor}60`,
          }}
        >
          {code}
        </span>
        {tag && tag !== 'LIVE' && (
          <span style={{
            fontSize: '8px', letterSpacing: '0.12em', fontWeight: 600, padding: '3px 6px',
            fontFamily: 'JetBrains Mono, monospace', color: '#64748B',
            background: 'rgba(10,20,36,0.8)', border: '1px solid rgba(50,70,100,0.7)',
          }}>{tag}</span>
        )}
        <div className="w-px h-4 shrink-0" style={{ background: 'rgba(20,36,64,0.9)' }} />
        <span
          className="min-w-0 text-[17px] font-semibold"
          style={{ fontFamily: 'Inter, JetBrains Mono, monospace', color: '#E4E4E7', letterSpacing: '0.008em', fontWeight: 600, overflowWrap: 'anywhere' }}
        >
          {title}
        </span>
        {desc && (
          <span className="min-w-0" style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '12.5px', fontWeight: 400, color: 'rgba(160,180,210,0.60)', letterSpacing: '0.02em', fontStyle: 'italic', overflowWrap: 'anywhere' }}>
            — {desc}
          </span>
        )}
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3 shrink-0 ml-0 xl:ml-4 py-3">
      {value != null && (
          <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-2">
            <span
              className="tabular-nums leading-none"
              style={{
                fontSize: '28px', fontWeight: 800,
                color: accentColor,
                fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.02em',
                textShadow: `0 0 32px ${accentColor}70, 0 0 10px ${accentColor}40`,
              }}
            >
              {value}
            </span>
            {zone?.label && (
              <span
                className="text-[12px] tracking-[0.12em] px-2.5 py-1.5 font-black shrink-0"
                style={{
                  color: zone.color, background: `${zone.color}20`,
                  border: `1px solid ${zone.color}B3`,
                  fontFamily: 'JetBrains Mono, monospace',
                  boxShadow: `0 0 16px ${zone.color}28, inset 0 1px 0 ${zone.color}20`,
                  letterSpacing: '0.12em',
                }}
              >
                {zone.label}
              </span>
            )}
          </div>
          {lastUpdated && (
            <span style={{ fontSize: '9px', letterSpacing: '0.14em', fontFamily: 'JetBrains Mono, monospace', color: 'rgba(150,170,200,0.62)', fontWeight: 600 }}>
              last updated: {lastUpdated}
            </span>
          )}
        </div>
      )}
      {onScreenshot && <div className="w-px h-6 shrink-0" style={{ background: 'rgba(16,30,56,0.9)' }} />}
      {onScreenshot && (
        <button
          onClick={onScreenshot}
          data-no-capture
          className="w-8 h-8 flex items-center justify-center"
          style={{ background: 'transparent', border: '1px solid rgba(50,70,100,0.6)', color: '#64748B' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(80,110,160,0.7)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(80,110,160,0.06)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#64748B'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(50,70,100,0.6)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          title="Capture panel"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>
      )}
      {onMaximize && <div className="w-px h-6 shrink-0" style={{ background: 'rgba(16,30,56,0.9)' }} />}
      {onMaximize && (
        <button
          onClick={onMaximize}
          data-no-capture
          className="w-8 h-8 flex items-center justify-center"
          style={{ background: 'transparent', border: '1px solid rgba(50,70,100,0.6)', color: '#64748B' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(80,110,160,0.7)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(80,110,160,0.06)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#64748B'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(50,70,100,0.6)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          title={isMaximized ? 'Minimize panel' : 'Maximize panel'}
        >
          {isMaximized ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          )}
        </button>
      )}
    </div>
  </div>
  );
};

export const FngTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value?: number | string; payload?: { date?: string } }> }) => {
  if (!active || !payload?.length) return null;
  const val = Number(payload[0]?.value ?? 0);
  const date = payload[0]?.payload?.date || '';
  const color = val >= 75 ? '#EF4444' : val >= 55 ? '#F7931A' : val >= 45 ? '#88B4D0' : '#10B981';
  const label = val >= 80 ? 'EXTREME GREED' : val >= 60 ? 'GREED' : val >= 45 ? 'NEUTRAL' : val >= 25 ? 'FEAR' : 'EXTREME FEAR';
  return (
    <div style={{
      background: '#0E0E18', border: `1px solid rgba(255,255,255,0.15)`,
      borderTop: `2px solid ${color}`, borderRadius: '1px',
      fontFamily: 'JetBrains Mono, monospace', padding: '14px 18px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.80)`, minWidth: '180px', pointerEvents: 'none',
    }}>
      <div style={{ color: '#8A9BB0', fontSize: '13px', marginBottom: '2px', letterSpacing: '0.12em' }}>{date}</div>
      <div style={{ height: '1px', background: 'rgba(30,60,100,0.9)', margin: '9px 0' }} />
      <div style={{ color: '#6A8EAA', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '7px', textTransform: 'uppercase' }}>Fear &amp; Greed Index</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
        <span style={{ color, fontSize: '18px', fontWeight: 800, lineHeight: 1, textShadow: `0 0 20px ${color}60`, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
        <span style={{ color: '#6A8EAA', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>/100</span>
        <span style={{
          fontSize: '12px', fontWeight: 800, letterSpacing: '0.13em', padding: '4px 9px',
          color, background: `${color}20`, border: `1px solid ${color}B3`,
          boxShadow: `0 0 12px ${color}22`, flexShrink: 0, textTransform: 'uppercase',
        }}>{label}</span>
      </div>
    </div>
  );
};

export const PrecisionTooltip = ({
  active,
  payload,
  accentColor = '#88B4D0',
  getRows,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: string | number | ((obj: unknown) => unknown); value?: unknown; color?: string; name?: unknown; payload?: Record<string, unknown> }>;
  accentColor?: string;
  getRows: (pt: Record<string, unknown>, payload: ReadonlyArray<{ dataKey?: string | number | ((obj: unknown) => unknown); value?: unknown; color?: string; name?: unknown; payload?: Record<string, unknown> }>) => Array<{
    label: string;
    value: string;
    color: string;
    zone?: { label: string; color: string };
  }>;
}) => {
  if (!active || !payload?.length) return null;
  const pt = payload[0]?.payload || {};
  const date = (pt.dateFormatted as string) || '';
  const rows = getRows(pt, payload);
  if (!rows.length) return null;
  return (
    <div style={{
      background: '#0E0E18', border: `1px solid rgba(255,255,255,0.15)`,
      borderTop: `2px solid ${accentColor}`, borderRadius: '1px',
      fontFamily: 'JetBrains Mono, monospace', padding: '14px 18px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.80)`, minWidth: '190px', pointerEvents: 'none',
    }}>
      <div style={{ color: '#8A9BB0', fontSize: '13px', marginBottom: '2px', letterSpacing: '0.12em' }}>{date}</div>
      <div style={{ height: '1px', background: 'rgba(30,60,100,0.9)', margin: '9px 0' }} />
      {rows.map((row, i) => (
        <div key={i} style={{ marginBottom: i < rows.length - 1 ? '12px' : 0 }}>
          <div style={{ color: '#6A8EAA', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '6px', textTransform: 'uppercase' }}>{row.label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', flexWrap: 'nowrap' }}>
            <span style={{
              color: row.color, fontSize: '18px', fontWeight: 800, lineHeight: 1,
              letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
              textShadow: `0 0 18px ${row.color}50`,
            }}>{row.value}</span>
            {row.zone && (
              <span style={{
                fontSize: '12px', fontWeight: 800, letterSpacing: '0.13em',
                padding: '4px 9px', textTransform: 'uppercase',
                color: row.zone.color, background: `${row.zone.color}20`,
                border: `1px solid ${row.zone.color}B3`,
                boxShadow: `0 0 12px ${row.zone.color}22`, flexShrink: 0,
              }}>{row.zone.label}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const SKELETON_BARS = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  h: Math.round(15 + Math.abs(Math.sin(i * 0.45) * 40 + Math.cos(i * 0.18) * 22)),
  d: i * 28,
}));

export const ChartSkeleton = ({ height = 320 }: { height?: number }) => (
  <div style={{ height: `${height}px`, position: 'relative', overflow: 'hidden', background: 'rgba(3,5,12,0.6)' }}>
    {[20, 38, 56, 74].map(pct => (
      <div key={pct} style={{ position: 'absolute', left: '52px', right: '8px', top: `${pct}%`, height: '1px', background: 'rgba(22,45,85,0.14)' }} />
    ))}
    {[20, 38, 56, 74].map(pct => (
      <div key={pct} style={{ position: 'absolute', left: '8px', top: `${pct}%`, transform: 'translateY(-3px)', width: '36px', height: '5px', background: 'rgba(22,45,85,0.12)' }} />
    ))}
    <div style={{ position: 'absolute', bottom: '24px', left: '52px', right: '8px', top: '8px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
      {SKELETON_BARS.map(bar => (
        <div key={bar.id} style={{ flex: 1, height: `${bar.h}%`, background: 'rgba(22,45,85,0.12)' }} />
      ))}
    </div>
    <div style={{
      position: 'absolute', top: 0, bottom: 0, left: '52px', width: '1px',
      background: 'linear-gradient(180deg, transparent 0%, rgba(100,160,220,0.25) 40%, rgba(100,160,220,0.4) 50%, rgba(100,160,220,0.25) 60%, transparent 100%)',
      animation: 'skeletonScan 3s ease-in-out infinite',
    }} />
    <style>{`
      @keyframes skeletonScan {
        0%   { left: 52px; opacity: 0; }
        5%   { opacity: 1; }
        95%  { opacity: 1; }
        100% { left: calc(100% - 8px); opacity: 0; }
      }
    `}</style>
    <div style={{ position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8.5px', color: '#64748B', letterSpacing: '0.20em' }}>SYNCHRONIZING</span>
    </div>
  </div>
);

export const TF_OPTS = [
  { label: '1W',  value: '7'      },
  { label: '1M',  value: '30'     },
  { label: '6M',  value: '180'    },
  { label: '1Y',  value: '365'    },
  { label: '4Y',  value: '1460'   },
  { label: 'ALL', value: '999999' },
] as const;

export const FRED_TF_OPTS = [
  { label: '1Y',   value: '365'    },
  { label: '10Y',  value: '3650'   },
  { label: '20Y',  value: '7300'   },
  { label: 'ALL',  value: '999999' },
] as const;

export const TfSelector = ({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts?: readonly { label: string; value: string }[] }) => {
  const options = opts ?? TF_OPTS;
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', flexWrap: 'wrap',
      border: '1px solid rgba(14,26,52,0.98)',
      background: 'rgba(2,5,14,0.98)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.018)',
    }}>
      {options.map((tf, i) => {
        const active = value === tf.value;
        return (
          <button
            key={tf.value}
            onClick={() => onChange(tf.value)}
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', letterSpacing: '0.11em',
              padding: '6px 10px', borderTop: 'none', borderBottom: 'none', borderLeft: 'none',
              borderRight: i < options.length - 1 ? '1px solid rgba(14,26,52,0.98)' : 'none',
              background: active ? 'rgba(194,52,77,0.20)' : 'transparent',
              color: active ? '#E8405A' : 'rgba(255,255,255,0.45)',
              fontWeight: active ? 800 : 500, cursor: 'pointer', lineHeight: 1,
              textTransform: 'uppercase',
              boxShadow: active ? `inset 0 0 0 1px rgba(194,52,77,0.80)` : `inset 0 0 0 0px transparent`,
            }}
            onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.70)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; } }}
            onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; } }}
          >
            {tf.label}
          </button>
        );
      })}
    </div>
  );
};

export const LineToggle = ({ items }: {
  items: Array<{ key: string; label: string; color: string; active: boolean; onClick: () => void }>;
}) => (
  <div style={{
    display: 'flex', alignItems: 'stretch', flexWrap: 'wrap',
    border: '1px solid rgba(14,26,52,0.98)',
    background: 'rgba(2,5,14,0.98)',
  }}>
    {items.map((item, i) => (
      <button
        key={item.key}
        onClick={item.onClick}
        style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.13em',
          padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px',
          borderTop: `2px solid ${item.active ? item.color : 'transparent'}`,
          borderBottom: 'none', borderLeft: 'none',
          borderRight: i < items.length - 1 ? '1px solid rgba(14,26,52,0.98)' : 'none',
          background: item.active ? `${item.color}14` : 'transparent',
          color: item.active ? item.color : '#4E6A88',
          fontWeight: item.active ? 700 : 500, cursor: 'pointer', lineHeight: 1, textTransform: 'uppercase',
        }}
      >
        <div style={{ width: '14px', height: '1.5px', background: item.active ? item.color : 'rgba(78,106,136,0.4)' }} />
        {item.label}
      </button>
    ))}
  </div>
);

export const getXAxisTicks = (data: Array<{ index: number; dateObj?: Date }>, tf: string): number[] => {
  const ticks: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const cur = data[i]?.dateObj as Date | undefined;
    if (!cur) continue;
    const prev = i > 0 ? (data[i - 1]?.dateObj as Date | undefined) : undefined;
    if (tf === '7') {
      ticks.push(i);
    } else if (tf === '30') {
      // ~weekly ticks by DATE — index modulo breaks on downsampled series
      const prevTick = ticks.length > 0 ? (data[ticks[ticks.length - 1]]?.dateObj as Date | undefined) : undefined;
      if (!prevTick || cur.getTime() - prevTick.getTime() >= 6 * 86_400_000) ticks.push(i);
    } else if (tf === '180' || tf === '365') {
      if (!prev || cur.getMonth() !== prev.getMonth()) ticks.push(i);
    } else if (tf === '1460') {
      if (!prev || cur.getMonth() !== prev.getMonth()) {
        if (cur.getMonth() === 0 || cur.getMonth() === 6) ticks.push(i);
      }
    } else {
      if (!prev || cur.getFullYear() !== prev.getFullYear()) ticks.push(i);
    }
  }
  return ticks;
};

export const formatXAxisTick = (data: Array<{ index: number; dateObj?: Date }>, index: number, tf: string): string => {
  const d = data[index]?.dateObj as Date | undefined;
  if (!d) return '';
  if (tf === '7' || tf === '30') return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
  if (tf === '3000' || tf === '3650' || tf === '7300' || tf === '999999') return String(d.getFullYear());
  const mo = d.toLocaleDateString('en-US', { month: 'short' });
  const yr = String(d.getFullYear()).slice(2);
  return `${mo} ${yr}`;
};

export const getHalvingIndices = (data: Array<{ dateObj?: Date; rawDate?: string }>) => {
  const halvings = [
    new Date('2012-11-28'), new Date('2016-07-09'),
    new Date('2020-05-11'), new Date('2024-04-19'),
  ];
  return halvings.flatMap((hDate) => {
    let best = -1, bestDiff = Infinity;
    data.forEach((pt, i) => {
      const d: Date | undefined = pt.dateObj ?? (pt.rawDate ? new Date(pt.rawDate) : undefined);
      if (!d) return;
      const diff = Math.abs(d.getTime() - hDate.getTime());
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    });
    return best >= 0 && bestDiff < 90 * 86400000 ? [{ index: best, year: hDate.getFullYear() }] : [];
  });
};

export function downsample<T>(data: T[], targetLen: number): T[] {
  if (data.length <= targetLen) return data;
  const step = (data.length - 1) / (targetLen - 1);
  return Array.from({ length: targetLen }, (_, i) => {
    const idx = Math.min(Math.round(i * step), data.length - 1);
    return { ...data[idx], index: i };
  });
};

// Isolated clock component — its 1-second setState never causes parent re-renders
export const LiveClock = () => {
  const [t, setT] = useState(() => new Date().toISOString().replace('T', ' ').slice(0, 19));
  useEffect(() => {
    const id = setInterval(() => setT(new Date().toISOString().replace('T', ' ').slice(0, 19)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <div className="text-[15px] tabular-nums font-bold leading-none" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#FFFFFF', letterSpacing: '0.04em' }}>
        {t.slice(11)}
      </div>
      <div className="text-[11px] tabular-nums mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#5A6A7A' }}>
        {t.slice(0, 10)}
      </div>
    </>
  );
};

export const PANEL_CODES: Record<string, string> = {
  'nupl': 'NUPL', 'mvrv': 'MVRV', 'lth-mvrv': 'LTH-MVRV',
  'sopr': 'SOPR', 'sth-mvrv': 'STH-MVRV', 'ssr': 'SSR', 'nvt': 'NVT',
  'supply-loss': 'SUPPLY-LOSS', 'supply-profit': 'SUPPLY-PROFIT',
  'realized-profit': 'REALIZED-PROFIT', 'realized-loss': 'REALIZED-LOSS',
  'hashrate': 'HASHRATE', 'sentiment-oscillator': 'FNG',
  'dominance': 'DOMINANCE', 'social-sentiment': 'SOCIAL', 'trending': 'TRENDING',
  'puell-multiple': 'PUELL', 'mayer-multiple': 'MAYER', 'reserve-risk': 'RESRISK',
  'aviv': 'AVIV', 'realized-cap': 'RCAP', 'vdd': 'VDD',
  'supply-shock': 'SSR2',
  'active-addresses': 'ACTADDR', 'illiquid-supply': 'ILLIQ', 'hot-supply': 'HOTSUP',
  'hashribbons': 'HRIBBON',
  'nrpl': 'NRPL', 'rhodl-ratio': 'RHODL',
  'open-interest': 'OI', 'funding-rate': 'FUNDRATE',
  'nvts': 'NVTS', 'nvt-zscore': 'NVTZSCORE', 'cvdd': 'CVDD',
  'nup': 'NUP', 'nul': 'NUL', 'balanced-price': 'BALP',
  'm2': 'M2', 'dxy': 'DXY', 'vix': 'VIX',
  'yield-2y': 'YIELD2Y', 'yield-10y': 'YIELD10Y',
  'fedfunds': 'FEDFUNDS', 'etf': 'ETF', 'etf-btc': 'ETFBTC',
  'sp500': 'SP500', 'gold': 'GOLD', 'stablecoin-supply': 'STBLSUP',
  'ssr-oscillator': 'SSROSC', 'crypto-market-cap': 'CMCAP',
  'realized-price': 'RPRICE', 'thermocap': 'THERMOCAP', 'market-cap-k4': 'MCAPK4',
  '200-week-ma': 'WMA200', 'pi-cycle': 'PICYCLE',
  'highly-liquid-supply': 'HLIQ',
  'lth-position-change': 'LTHPC', 'sth-position-change': 'STHPC',
  'mpi': 'MPI', 'miner-sell-pressure': 'MINSP',
  'utxo-profit': 'UTXOP', 'utxo-loss': 'UTXOL',
  'fred-sofr': 'SOFR', 'fred-walcl': 'WALCL', 'fred-wresbal': 'WRESBAL',
  'fred-rrpontsyd': 'RRPONTSYD', 'fred-cpiaucsl': 'CPIAUCSL', 'fred-cpilfesl': 'CPILFESL',
  'fred-pcepi': 'PCEPI', 'fred-pcepilfe': 'PCEPILFE', 'fred-mich': 'MICH',
  'fred-t5yie': 'T5YIE', 'fred-t10yie': 'T10YIE', 'fred-dgs1mo': 'DGS1MO',
  'fred-dgs3mo': 'DGS3MO', 'fred-dgs6mo': 'DGS6MO', 'fred-dgs1': 'DGS1',
  'fred-dgs5': 'DGS5', 'fred-dgs20': 'DGS20', 'fred-dgs30': 'DGS30',
  'fred-t10y2y': 'T10Y2Y', 'fred-t10y3m': 'T10Y3M', 'fred-m1sl': 'M1SL',
  'fred-mabmm301usm189s': 'MABMM301USM189S', 'fred-unrate': 'UNRATE',
  'fred-payems': 'PAYEMS', 'fred-icsa': 'ICSA', 'fred-jtsjol': 'JTSJOL',
  'fred-emratio': 'EMRATIO', 'fred-gdpc1': 'GDPC1', 'fred-indpro': 'INDPRO',
  'fred-houst': 'HOUST', 'fred-umcsent': 'UMCSENT', 'fred-rsxfs': 'RSXFS',
  'fred-dcoilwtico': 'DCOILWTICO', 'fred-bamlh0a0hym2': 'BAMLH0A0HYM2',
  'fred-mortgage30us': 'MORTGAGE30US', 'fred-bogmbase': 'BOGMBASE', 'fred-totalsl': 'TOTALSL',
  'vtpx': 'VTPX', 'shax': 'SHAX', 'smfx': 'SMFX', 'levr': 'LEVR', 'rcfx': 'RCFX',
  'cprx': 'CPRX', 'rpix': 'RPIX', 'crrx': 'CRRX', 'sgrx': 'SGRX', 'domx': 'DOMX',
};

export interface PanelMaximizeWrapperProps {
  panelId: string;
  isMaximized: boolean;
  onMinimize: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  'data-panel'?: string;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  fullHeight?: boolean;
}

export const PanelMaximizeWrapper = forwardRef<HTMLDivElement, PanelMaximizeWrapperProps>(
  ({ panelId: _panelId, isMaximized, onMinimize, children, className, style, id, 'data-panel': dataPanelAttr, onMouseEnter, fullHeight }, ref) => {
    useEffect(() => {
      if (!isMaximized) return;
      const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onMinimize(); };
      const preventScroll = (e: Event) => e.preventDefault();
      window.addEventListener('keydown', handleKey);
      // Block all scroll/wheel/touchmove on the body while maximized
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      window.addEventListener('wheel', preventScroll, { passive: false });
      window.addEventListener('touchmove', preventScroll, { passive: false });
      return () => {
        window.removeEventListener('keydown', handleKey);
        window.removeEventListener('wheel', preventScroll);
        window.removeEventListener('touchmove', preventScroll);
        document.body.style.overflow = '';
        document.body.style.overscrollBehavior = '';
      };
    }, [isMaximized, onMinimize]);

    const mergedStyle = fullHeight
      ? { ...style, height: 'calc(100vh - 250px)', display: 'flex' as const, flexDirection: 'column' as const }
      : style;

    const panelEl = (
      <div ref={ref} className={`${className || ''}${fullHeight ? ' [&>div:last-child]:flex-1' : ''}`} style={mergedStyle} id={id} data-panel={dataPanelAttr} onMouseEnter={onMouseEnter}>
        {children}
      </div>
    );

    if (!isMaximized) return panelEl;

    return createPortal(
      <>
        <div
          onClick={onMinimize}
          onWheel={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', inset: 0, zIndex: 9990,
            background: 'rgba(2,4,10,0.78)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            overscrollBehavior: 'contain',
          }}
        />
        <div
          onWheel={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(78vw, 1280px)', height: 'min(76vh, 820px)', zIndex: 9991,
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 0 0 1px rgba(40,80,160,0.28), 0 40px 140px rgba(0,0,0,0.97), 0 0 80px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            overscrollBehavior: 'contain',
          }}
        >
          <div
            ref={ref}
            className={className}
            style={{ ...style, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', overscrollBehavior: 'contain' }}
            id={id}
            data-panel={dataPanelAttr}
            onMouseEnter={onMouseEnter}
          >
            {children}
          </div>
        </div>
      </>,
      document.body
    );
  }
);
PanelMaximizeWrapper.displayName = 'PanelMaximizeWrapper';
