'use client';

import { useEffect, useState } from 'react';

const MONO = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const AMBER = '#E8960C';
const BLUE = '#38BDF8';
const GREEN = '#22C55E';
const RED = '#C2344D';
const TEXT = 'var(--text-primary)';
const MUTED = 'var(--text-secondary)';
const FAINT = 'var(--text-ghost)';

interface DexProtocol {
  protocol: string;
  slug: string;
  volume_24h: number | null;
  volume_30d: number | null;
  volume_1y: number | null;
  volume_all_time: number | null;
  change_1d: number | null;
  change_7d: number | null;
  change_30d: number | null;
  category: string | null;
  chains: string[];
}

interface DexProtocolData {
  protocols: DexProtocol[];
  totals: { volume_24h: number; volume_30d: number; volume_1y: number };
  count: number;
}

function formatUsd(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function pctColor(v: number | null): string {
  if (v == null) return FAINT;
  return v >= 0 ? GREEN : RED;
}

export default function DexProtocolPanel() {
  const [data, setData] = useState<DexProtocolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'24h' | '30d' | '1y'>('24h');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/metrilytics/dex-protocols?limit=60&sort=${sort}`);
        const json = (await res.json()) as { success?: boolean; protocols?: DexProtocol[]; totals?: DexProtocolData['totals']; count?: number };
        if (!cancelled && json.success) {
          setData({ protocols: json.protocols ?? [], totals: json.totals ?? { volume_24h: 0, volume_30d: 0, volume_1y: 0 }, count: json.count ?? 0 });
        }
      } catch (e) {
        console.error('[DexProtocolPanel] fetch error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [sort]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: FAINT, fontSize: 11, fontFamily: MONO }}>Loading per-protocol DEX volume…</div>;
  }
  if (!data || !data.protocols.length) {
    return <div style={{ padding: '40px', textAlign: 'center', color: FAINT, fontSize: 11, fontFamily: MONO }}>Per-protocol DEX volume unavailable. Waiting for cron to populate dex_protocol_volume…</div>;
  }

  const max24h = Math.max(...data.protocols.map((p) => p.volume_24h ?? 0), 1);

  return (
    <div id="module-dex-protocols" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, border: '1px solid rgba(255,255,255,0.09)', background: 'linear-gradient(135deg, rgba(16,16,22,0.97), rgba(8,9,13,0.98))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: MUTED, fontFamily: MONO, letterSpacing: '0.13em', textTransform: 'uppercase' }}>Venue Leaderboard</div>
          <div style={{ fontSize: 18, color: TEXT, fontFamily: MONO, fontWeight: 600 }}>Per-Protocol DEX Volume</div>
          <div style={{ fontSize: 11, color: FAINT, fontFamily: MONO }}>{data.count} venues · 24h {formatUsd(data.totals.volume_24h)} · 30d {formatUsd(data.totals.volume_30d)} · 1y {formatUsd(data.totals.volume_1y)}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['24h', '30d', '1y'] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)} style={{ padding: '4px 12px', fontSize: 10, fontFamily: MONO, background: sort === s ? AMBER : 'transparent', color: sort === s ? '#000' : MUTED, border: `1px solid ${sort === s ? AMBER : 'var(--border-subtle)'}`, borderRadius: 2, cursor: 'pointer' }}>{s}</button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 110px 90px 80px 70px', gap: 8, padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 9, fontFamily: MONO, color: FAINT, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <span>#</span><span>Protocol</span><span style={{ textAlign: 'right' }}>24h Vol</span><span style={{ textAlign: 'right' }}>30d Vol</span><span style={{ textAlign: 'right' }}>1d Δ</span><span style={{ textAlign: 'right' }}>30d Δ</span>
        </div>
        {data.protocols.slice(0, 30).map((p, i) => {
          const vol = p.volume_24h ?? 0;
          const share = (vol / max24h) * 100;
          return (
            <div key={p.slug} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '28px 1fr 110px 90px 80px 70px', gap: 8, padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11, fontFamily: MONO, color: TEXT, alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${share}%`, background: 'linear-gradient(90deg, rgba(56,189,248,0.16), rgba(56,189,248,0))', pointerEvents: 'none' }} />
              <span style={{ color: FAINT }}>{i + 1}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.protocol}<span style={{ color: FAINT, fontSize: 9 }}> · {p.category || 'DEX'}</span></span>
              <span style={{ textAlign: 'right', color: BLUE }}>{formatUsd(vol)}</span>
              <span style={{ textAlign: 'right', color: MUTED }}>{formatUsd(p.volume_30d ?? 0)}</span>
              <span style={{ textAlign: 'right', color: pctColor(p.change_1d) }}>{p.change_1d == null ? '—' : `${p.change_1d >= 0 ? '+' : ''}${p.change_1d.toFixed(1)}%`}</span>
              <span style={{ textAlign: 'right', color: pctColor(p.change_30d) }}>{p.change_30d == null ? '—' : `${p.change_30d >= 0 ? '+' : ''}${p.change_30d.toFixed(1)}%`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

