'use client';

import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const MONO = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const AMBER = '#E8960C';
const BLUE = '#38BDF8';
const GREEN = '#22C55E';
const RED = '#C2344D';
const PURPLE = '#A78BFA';
const TEXT = 'var(--text-primary)';
const MUTED = 'var(--text-secondary)';
const FAINT = 'var(--text-ghost)';

const SHARE_COLORS = [BLUE, AMBER, GREEN, PURPLE, '#14B8A6', '#F97316', '#EC4899', '#7DD3FC', RED, '#FB7185'];

interface ConcentrationData {
  dates: string[];
  series: Array<{ protocol: string; shares: number[] }>;
  other: number[];
  hhi: number[];
  meta: { days: number; top: number; points: number };
}

export default function ConcentrationPanel() {
  const [data, setData] = useState<ConcentrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'3M' | '1Y' | 'ALL'>('1Y');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const days = range === '3M' ? 90 : range === '1Y' ? 365 : 730;
        const res = await fetch(`/api/metrilytics/concentration?days=${days}&top=10`);
        const json = (await res.json()) as { success?: boolean; dates?: string[]; series?: ConcentrationData['series']; other?: number[]; hhi?: number[]; meta?: ConcentrationData['meta'] };
        if (!cancelled && json.success) {
          setData({ dates: json.dates ?? [], series: json.series ?? [], other: json.other ?? [], hhi: json.hhi ?? [], meta: json.meta ?? { days, top: 10, points: 0 } });
        }
      } catch (e) {
        console.error('[ConcentrationPanel] fetch error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [range]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: FAINT, fontSize: 11, fontFamily: MONO }}>Loading protocol concentration…</div>;
  }
  if (!data || !data.dates.length || !data.series.length) {
    return <div style={{ padding: '40px', textAlign: 'center', color: FAINT, fontSize: 11, fontFamily: MONO }}>Concentration data unavailable. Waiting for cron to populate protocol_tvl…</div>;
  }

  const chartData = data.dates.map((date, i) => {
    const row: Record<string, number | string> = { date };
    for (const s of data.series) row[s.protocol] = s.shares[i] ?? 0;
    row['Other'] = data.other[i] ?? 0;
    return row;
  });
  const stackKeys = [...data.series.map((s) => s.protocol), 'Other'];
  const hhiData = data.dates.map((date, i) => ({ date, hhi: data.hhi[i] ?? 0 }));
  const latestHhi = data.hhi[data.hhi.length - 1] ?? 0;
  const hhiLabel = latestHhi >= 2500 ? 'Highly concentrated' : latestHhi >= 1500 ? 'Moderately concentrated' : 'Competitive';

  return (
    <div id="module-concentration" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, border: '1px solid rgba(255,255,255,0.09)', background: 'linear-gradient(135deg, rgba(16,16,22,0.97), rgba(8,9,13,0.98))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: MUTED, fontFamily: MONO, letterSpacing: '0.13em', textTransform: 'uppercase' }}>Capital Concentration</div>
          <div style={{ fontSize: 18, color: TEXT, fontFamily: MONO, fontWeight: 600 }}>Protocol TVL Concentration</div>
          <div style={{ fontSize: 11, color: FAINT, fontFamily: MONO }}>Top {data.meta.top} share over time · HHI {latestHhi} ({hhiLabel}) · {data.meta.points} days</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['3M', '1Y', 'ALL'] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{ padding: '4px 12px', fontSize: 10, fontFamily: MONO, background: range === r ? AMBER : 'transparent', color: range === r ? '#000' : MUTED, border: `1px solid ${range === r ? AMBER : 'var(--border-subtle)'}`, borderRadius: 2, cursor: 'pointer' }}>{r}</button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 8" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }} tickFormatter={(d) => String(d).slice(5)} minTickGap={40} />
          <YAxis tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} width={40} domain={[0, 100]} />
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontFamily: MONO, fontSize: 11 }} formatter={(value, name) => [`${Number(value).toFixed(1)}%`, String(name)]} />
          {stackKeys.map((key, idx) => (
            <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={SHARE_COLORS[idx % SHARE_COLORS.length]} fill={SHARE_COLORS[idx % SHARE_COLORS.length]} fillOpacity={0.5} strokeWidth={1} />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      <div>
        <div style={{ fontSize: 10, color: MUTED, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Herfindahl-Hirschman Index (concentration score)</div>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={hhiData} margin={{ top: 2, right: 14, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 8" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9, fontFamily: MONO }} tickFormatter={(d) => String(d).slice(5)} minTickGap={50} />
            <YAxis tick={{ fill: MUTED, fontSize: 9, fontFamily: MONO }} width={36} />
            <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontFamily: MONO, fontSize: 11 }} formatter={(value) => [String(value), 'HHI']} />
            <defs>
              <linearGradient id="hhiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={AMBER} stopOpacity={0.5} />
                <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="hhi" stroke={AMBER} strokeWidth={1.5} fill="url(#hhiGrad)" />
            <Line type="monotone" dataKey="hhi" stroke={AMBER} dot={false} strokeWidth={0} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

