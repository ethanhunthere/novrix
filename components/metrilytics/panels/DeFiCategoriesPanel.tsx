'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const MONO = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const MUTED = 'var(--text-secondary)';
const TEXT = 'var(--text-primary)';
const AMBER = '#E8960C';

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


type CategoryItem = {
  name: string;
  tvl: number;
  protocols: number;
};


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


export default function DeFiCategoriesPanel() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setLoading(true); });

    async function load() {
      try {
        const protocols = await fetchJson<{ category?: string; tvl?: number }[]>('https://api.llama.fi/protocols', 20_000);
        if (cancelled) return;

        const byCategory = new Map<string, { tvl: number; protocols: number }>();
        for (const p of protocols ?? []) {
          const cat = p.category || 'Other';
          const curr = byCategory.get(cat) ?? { tvl: 0, protocols: 0 };
          curr.tvl += numberOrZero(p.tvl);
          curr.protocols += 1;
          byCategory.set(cat, curr);
        }

        const items = [...byCategory.entries()]
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.tvl - a.tvl)
          .slice(0, 12);

        setCategories(items);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const tickStyle = { fill: 'rgba(255,255,255,0.58)', fontSize: 11, fontFamily: MONO };
  const gridProps = { stroke: 'rgba(255,255,255,0.07)', strokeDasharray: '3 8', vertical: false };

  return (
    <div id="module-defi-categories" style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'linear-gradient(135deg, rgba(16,16,22,0.97) 0%, rgba(8,9,13,0.98) 100%)' }}>
      <div className="flex items-center justify-between gap-5 px-6 py-5 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span style={{ width: 5, height: 5, borderRadius: 99, background: AMBER }} />
            <span style={{ fontFamily: MONO, fontSize: 11, color: AMBER, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 650 }}>Categories</span>
          </div>
          <h2 style={{ fontFamily: MONO, fontSize: 17, color: 'var(--text-heading)', fontWeight: 800 }}>DeFi Sector Breakdown</h2>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div style={{ height: 220, border: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(110deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.035) 70%)', backgroundSize: '240% 100%', animation: 'metrilytics-scan 2.4s ease infinite' }} />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div style={{ height: 320 }}>
                <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>TVL by Category</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categories} layout="vertical" margin={{ top: 8, right: 14, left: 100, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis type="number" tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={tickStyle} tickLine={false} axisLine={false} width={90} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload as CategoryItem;
                        return (
                          <div style={{ minWidth: 180, padding: 12, border: `1px solid ${AMBER}66`, borderTop: `2px solid ${AMBER}`, background: 'rgba(8,10,16,0.98)', fontFamily: MONO }}>
                            <div style={{ color: TEXT, fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{item.name}</div>
                            <div style={{ color: MUTED, fontSize: 11 }}>TVL: {fmtMoney(item.tvl)}</div>
                            <div style={{ color: MUTED, fontSize: 11 }}>Protocols: {item.protocols}</div>
                          </div>
                        );
                      }}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Bar dataKey="tvl" name="TVL" fill={`${AMBER}44`} stroke={AMBER} strokeWidth={1} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Category Rankings</p>
                <div className="space-y-2">
                  {categories.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between gap-3 py-2 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.055)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED, width: 20 }}>{String(i + 1).padStart(2, '0')}</span>
                        <span className="truncate" style={{ fontFamily: MONO, fontSize: 12, color: TEXT }}>{c.name}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{c.protocols} protocols</span>
                        <span style={{ fontFamily: MONO, fontSize: 12, color: TEXT, fontWeight: 700 }}>{fmtMoney(c.tvl)}</span>
                      </div>
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
