'use client';

import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const MONO = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const AMBER = '#E8960C';
const BLUE = '#38BDF8';
const GREEN = '#22C55E';
const RED = '#C2344D';
const PURPLE = '#A78BFA';
const PINK = '#EC4899';
const TEXT = 'var(--text-primary)';
const MUTED = 'var(--text-secondary)';
const FAINT = 'var(--text-ghost)';

const CATEGORY_COLORS = [BLUE, AMBER, GREEN, PURPLE, PINK, '#14B8A6', '#F97316', RED, '#7DD3FC', '#FB7185'];

interface CategoryHistoryData {
  dates: string[];
  categories: Record<string, number[]>;
  ranking: Array<{ category: string; latest_tvl: number }>;
  meta: { days: number; points: number; categories: number };
}

function formatUsd(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function CategoryTvlHistoryPanel() {
  const [data, setData] = useState<CategoryHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'1M' | '3M' | '1Y' | 'ALL'>('1Y');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const days = range === '1M' ? 30 : range === '3M' ? 90 : range === '1Y' ? 365 : 730;
        const res = await fetch(`/api/metrilytics/category-history?days=${days}`);
        const json = (await res.json()) as { success?: boolean; dates?: string[]; categories?: Record<string, number[]>; ranking?: Array<{ category: string; latest_tvl: number }>; meta?: CategoryHistoryData['meta'] };
        if (!cancelled && json.success) {
          setData({ dates: json.dates ?? [], categories: json.categories ?? {}, ranking: json.ranking ?? [], meta: json.meta ?? { days, points: 0, categories: 0 } });
        }
      } catch (e) {
        console.error('[CategoryTvlHistory] fetch error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [range]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: FAINT, fontSize: 11, fontFamily: MONO }}>Loading category TVL history…</div>;
  }
  if (!data || !data.dates.length || !data.ranking.length) {
    return <div style={{ padding: '40px', textAlign: 'center', color: FAINT, fontSize: 11, fontFamily: MONO }}>Category history unavailable. Waiting for cron to populate protocol_tvl…</div>;
  }

  const top = data.ranking.slice(0, 8);
  const otherCats = data.ranking.slice(8);
  const chartData = data.dates.map((date, i) => {
    const row: Record<string, number | string> = { date };
    for (const c of top) row[c.category] = data.categories[c.category]?.[i] ?? 0;
    row['Other'] = otherCats.reduce((sum, c) => sum + (data.categories[c.category]?.[i] ?? 0), 0);
    return row;
  });
  const stackKeys = [...top.map((c) => c.category), 'Other'];


  return (
    <div id="module-category-history" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, border: '1px solid rgba(255,255,255,0.09)', background: 'linear-gradient(135deg, rgba(16,16,22,0.97), rgba(8,9,13,0.98))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: MUTED, fontFamily: MONO, letterSpacing: '0.13em', textTransform: 'uppercase' }}>Sector Composition</div>
          <div style={{ fontSize: 18, color: TEXT, fontFamily: MONO, fontWeight: 600 }}>DeFi Category TVL History</div>
          <div style={{ fontSize: 11, color: FAINT, fontFamily: MONO }}>{data.meta.categories} categories · {data.meta.points} days · stacked TVL over time</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['1M', '3M', '1Y', 'ALL'] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{ padding: '4px 12px', fontSize: 10, fontFamily: MONO, background: range === r ? AMBER : 'transparent', color: range === r ? '#000' : MUTED, border: `1px solid ${range === r ? AMBER : 'var(--border-subtle)'}`, borderRadius: 2, cursor: 'pointer' }}>{r}</button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={chartData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 8" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }} tickFormatter={(d) => String(d).slice(5)} minTickGap={40} />
          <YAxis tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }} tickFormatter={(v) => formatUsd(Number(v))} width={64} />
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontFamily: MONO, fontSize: 11 }} formatter={(value, name) => [formatUsd(Number(value)), String(name)]} />
          {stackKeys.map((key, idx) => (
            <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} fillOpacity={0.55} strokeWidth={1} />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {data.ranking.slice(0, 12).map((c, i) => (
          <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: MONO, color: MUTED }}>
            <span style={{ width: 8, height: 8, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length], borderRadius: 1 }} />
            {c.category} <span style={{ color: FAINT }}>{formatUsd(c.latest_tvl)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
