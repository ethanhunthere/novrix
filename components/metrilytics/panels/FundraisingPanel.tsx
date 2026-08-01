'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';

const MONO = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const MUTED = 'var(--text-secondary)';
const TEXT = 'var(--text-primary)';
const AMBER = '#E8960C';
const GREEN = '#22C55E';

function fmtMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '$0';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function numberOrZero(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}


type Raise = {
  date: string;
  name: string;
  amount: number;
  round: string;
  sector: string;
  chains: string[];
};

type MonthlyAgg = { month: string; count: number; total: number };


async function fetchJson<T>(url: string, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`${response.status}`);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
  }
}


export default function FundraisingPanel() {
  const [raises, setRaises] = useState<Raise[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'6M' | '1Y' | '2Y' | 'ALL'>('1Y');

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setLoading(true); });

    async function load() {
      try {
        const data = await fetchJson<{ raises?: { date: string; name: string; amount?: number; round?: string; sector?: string; chains?: string[] }[] }>('https://api.llama.fi/raises', 20_000);
        if (cancelled) return;

        const items = (data.raises ?? [])
          .filter((r): r is { date: string; name: string; amount: number; round: string; sector: string; chains: string[] } => !!r.date && !!r.name)
          .map(r => ({
            date: r.date.slice(0, 10),
            name: r.name,
            amount: numberOrZero(r.amount),
            round: r.round || 'Unknown',
            sector: r.sector || 'Other',
            chains: r.chains ?? [],
          }))
          .sort((a, b) => b.date.localeCompare(a.date));

        setRaises(items);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const rangeMonths = { '6M': 6, '1Y': 12, '2Y': 24, ALL: 999 };
  const cutoff = useMemo(() => {
    if (range === 'ALL') return '1900-01-01';
    const d = new Date();
    d.setMonth(d.getMonth() - rangeMonths[range]);
    return d.toISOString().slice(0, 10);
  }, [range]);

  const filtered = useMemo(() => raises.filter(r => r.date >= cutoff), [raises, cutoff]);

  const monthly = useMemo(() => {
    const byMonth = new Map<string, MonthlyAgg>();
    for (const r of filtered) {
      const month = r.date.slice(0, 7);
      const curr = byMonth.get(month) ?? { month, count: 0, total: 0 };
      curr.count += 1;
      curr.total += r.amount;
      byMonth.set(month, curr);
    }
    return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  const bySector = useMemo(() => {
    const byName = new Map<string, number>();
    for (const r of filtered) {
      byName.set(r.sector, (byName.get(r.sector) ?? 0) + r.amount);
    }
    return [...byName.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filtered]);

  const tickStyle = { fill: 'rgba(255,255,255,0.58)', fontSize: 11, fontFamily: MONO };
  const gridProps = { stroke: 'rgba(255,255,255,0.07)', strokeDasharray: '3 8', vertical: false };

  return (
    <div id="module-fundraising" style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'linear-gradient(135deg, rgba(16,16,22,0.97) 0%, rgba(8,9,13,0.98) 100%)' }}>
      <div className="flex items-center justify-between gap-5 px-6 py-5 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span style={{ width: 5, height: 5, borderRadius: 99, background: GREEN }} />
            <span style={{ fontFamily: MONO, fontSize: 11, color: GREEN, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 650 }}>Fundraising</span>
          </div>
          <h2 style={{ fontFamily: MONO, fontSize: 17, color: 'var(--text-heading)', fontWeight: 800 }}>Capital Formation</h2>
        </div>
        <div className="flex shrink-0" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.28)', borderRadius: 6, overflow: 'hidden' }}>
          {(['6M', '1Y', '2Y', 'ALL'] as const).map(option => (
            <button key={option} onClick={() => setRange(option)} style={{
              minWidth: 40, padding: '7px 10px', fontFamily: MONO, fontSize: 10, lineHeight: 1,
              color: range === option ? '#0A0A0F' : MUTED, background: range === option ? GREEN : 'transparent', border: 0,
              borderRight: option === 'ALL' ? 0 : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
            }}>{option}</button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div style={{ height: 220, border: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(110deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.035) 70%)', backgroundSize: '240% 100%', animation: 'metrilytics-scan 2.4s ease infinite' }} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div style={{ padding: '18px 20px', border: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(155deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 50%, rgba(0,0,0,0.22) 100%)' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Total Raised</div>
                <div style={{ fontFamily: MONO, fontSize: 25, color: TEXT, fontWeight: 800 }}>{fmtMoney(filtered.reduce((s, r) => s + r.amount, 0))}</div>
              </div>
              <div style={{ padding: '18px 20px', border: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(155deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 50%, rgba(0,0,0,0.22) 100%)' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Rounds</div>
                <div style={{ fontFamily: MONO, fontSize: 25, color: TEXT, fontWeight: 800 }}>{filtered.length}</div>
              </div>
              <div style={{ padding: '18px 20px', border: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(155deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 50%, rgba(0,0,0,0.22) 100%)' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Avg Round</div>
                <div style={{ fontFamily: MONO, fontSize: 25, color: TEXT, fontWeight: 800 }}>{fmtMoney(filtered.length > 0 ? filtered.reduce((s, r) => s + r.amount, 0) / filtered.length : 0)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div style={{ height: 260 }}>
                <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Monthly Funding</p>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="raise-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GREEN} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="month" tickFormatter={v => v.slice(5)} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} width={68} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload as MonthlyAgg;
                        return (
                          <div style={{ minWidth: 180, padding: 12, border: `1px solid ${GREEN}66`, borderTop: `2px solid ${GREEN}`, background: 'rgba(8,10,16,0.98)', fontFamily: MONO }}>
                            <div style={{ color: MUTED, fontSize: 11, marginBottom: 8 }}>{label}</div>
                            <div style={{ color: TEXT, fontSize: 13, fontWeight: 800 }}>{fmtMoney(item.total)}</div>
                            <div style={{ color: MUTED, fontSize: 11 }}>{item.count} rounds</div>
                          </div>
                        );
                      }}
                      cursor={{ stroke: `${GREEN}88`, strokeDasharray: '3 5' }}
                    />
                    <Area type="monotone" dataKey="total" name="Total" stroke={GREEN} fill="url(#raise-grad)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div>
                <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>By Sector</p>
                <div className="space-y-2">
                  {bySector.map(s => (
                    <div key={s.name} className="flex items-center justify-between gap-3 py-2 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.055)' }}>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: TEXT }}>{s.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: GREEN, fontWeight: 700 }}>{fmtMoney(s.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
