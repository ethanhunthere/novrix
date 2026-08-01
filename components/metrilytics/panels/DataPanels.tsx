'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const MONO = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function fmtMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '$0';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627EEA',
  bsc: '#F0B90B',
  tron: '#FF3352',
  arbitrum: '#28A0F0',
  solana: '#9B5CFF',
  polygon: '#A855F7',
  base: '#4DA2FF',
  optimism: '#FF4661',
  avalanche: '#E84142',
  sui: '#62C4FF',
};

const CHAIN_ICONS: Record<string, string> = {
  ethereum: 'Ξ',
  bsc: '◆',
  tron: '⟁',
  arbitrum: '◆',
  solana: '◎',
  polygon: '⬡',
  base: '◇',
  optimism: '◐',
  avalanche: '◈',
  sui: '◐',
};

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface ChainActivity {
  chain: string;
  active_addresses_24h: number;
  tx_count_24h: number;
  avg_gas_fee_usd: number;
  gas_fee_trend: number;
  tvl_usd: number;
  volume_24h_usd: number;
}

interface ChainActivityResponse {
  success: boolean;
  chains: ChainActivity[];
  totals: {
    tvl_usd: number;
    volume_24h_usd: number;
    chains_tracked: number;
  };
}

interface StakingProtocol {
  name: string;
  slug: string;
  category: string;
  tvl_usd: number;
  chain: string;
  change_24h: number;
  change_7d: number;
}

interface StakingResponse {
  success: boolean;
  protocols: StakingProtocol[];
  summary: {
    total_staked_usd: number;
    total_restaked_usd: number;
    liquid_staking_usd: number;
    protocol_count: number;
  };
}

interface RwaProtocol {
  name: string;
  slug: string;
  category: string;
  tvl_usd: number;
  chains: string[];
}

interface RwaResponse {
  success: boolean;
  protocols: RwaProtocol[];
  summary: {
    total_tvl_usd: number;
    protocol_count: number;
    categories: { name: string; tvl_usd: number }[];
  };
}

/* ═══════════════════════════════════════════════════════════
   PANEL: CHAIN ACTIVITY
   ═══════════════════════════════════════════════════════════ */

export function ChainActivityPanel() {
  const [data, setData] = useState<ChainActivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const resp = await window.fetch('/api/metrilytics/chain-activity?days=30');
        const json = await resp.json() as ChainActivityResponse;
        if (!cancelled && json.success) setData(json);
      } catch { /* silent */ } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void fetch();
    return () => { cancelled = true; };
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.chains
      .filter(c => c.tvl_usd > 0)
      .slice(0, 8)
      .map(c => ({
        name: c.chain.charAt(0).toUpperCase() + c.chain.slice(1),
        tvl: c.tvl_usd,
        volume: c.volume_24h_usd,
        color: CHAIN_COLORS[c.chain] || '#0EA5C8',
      }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-5 animate-pulse" style={{ minHeight: '300px' }}>
        <div className="h-4 w-48 bg-[rgba(14,165,200,0.15)] mb-4" />
        <div className="h-56 bg-[rgba(14,165,200,0.08)]" />
      </div>
    );
  }

  if (!data || data.chains.length === 0) return null;

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] tracking-[0.16em] font-black" style={{ fontFamily: MONO, color: '#38BDF8' }}>
            CHAIN ACTIVITY
          </div>
          <div className="text-[9px] mt-1" style={{ color: '#64748B' }}>
            TVL and volume across major chains
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-[8px] tracking-[0.12em]" style={{ fontFamily: MONO, color: '#5A7A94' }}>TOTAL TVL</div>
            <div className="text-[13px] font-black tabular-nums" style={{ fontFamily: MONO, color: '#FAFAFA' }}>
              {fmtMoney(data.totals.tvl_usd)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[8px] tracking-[0.12em]" style={{ fontFamily: MONO, color: '#5A7A94' }}>24H VOLUME</div>
            <div className="text-[13px] font-black tabular-nums" style={{ fontFamily: MONO, color: '#38BDF8' }}>
              {fmtMoney(data.totals.volume_24h_usd)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: '220px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fontFamily: MONO, fill: '#475569' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            />
            <YAxis
              tick={{ fontSize: 9, fontFamily: MONO, fill: '#475569' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtMoney}
              width={60}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { name: string; tvl: number; volume: number; color: string };
                return (
                  <div className="px-3 py-2" style={{ background: 'rgba(5,10,14,0.98)', border: '1px solid rgba(56,189,248,0.35)', fontFamily: MONO }}>
                    <div className="text-[10px] font-bold mb-1" style={{ color: d.color }}>{d.name}</div>
                    <div className="text-[9px]" style={{ color: '#B4C0CF' }}>TVL: {fmtMoney(d.tvl)}</div>
                    <div className="text-[9px]" style={{ color: '#B4C0CF' }}>Volume: {fmtMoney(d.volume)}</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="tvl" radius={[2, 2, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chain list */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-4">
        {data.chains.filter(c => c.tvl_usd > 0).slice(0, 10).map(chain => (
          <div key={chain.chain} className="px-3 py-2" style={{ background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${CHAIN_COLORS[chain.chain] || '#0EA5C8'}` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: CHAIN_COLORS[chain.chain], fontSize: '12px' }}>{CHAIN_ICONS[chain.chain] || '◈'}</span>
              <span className="text-[9px] font-mono font-bold" style={{ color: CHAIN_COLORS[chain.chain] }}>
                {chain.chain.charAt(0).toUpperCase() + chain.chain.slice(1)}
              </span>
            </div>
            <div className="text-[10px] font-mono font-bold tabular-nums" style={{ color: '#FAFAFA' }}>{fmtMoney(chain.tvl_usd)}</div>
            <div className="text-[8px] font-mono" style={{ color: '#64748B' }}>Vol: {fmtMoney(chain.volume_24h_usd)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PANEL: STAKING & RESTAKING
   ═══════════════════════════════════════════════════════════ */

const STAKING_COLORS: Record<string, string> = {
  'Liquid Staking': '#627EEA',
  'Restaking': '#9B5CFF',
  'Staking': '#22C55E',
};

export function StakingPanel() {
  const [data, setData] = useState<StakingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const resp = await window.fetch('/api/metrilytics/staking');
        const json = await resp.json() as StakingResponse;
        if (!cancelled && json.success) setData(json);
      } catch { /* silent */ } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void fetch();
    return () => { cancelled = true; };
  }, []);

  const pieData = useMemo(() => {
    if (!data) return [];
    const cats: Record<string, number> = {};
    for (const p of data.protocols) {
      cats[p.category] = (cats[p.category] || 0) + p.tvl_usd;
    }
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-5 animate-pulse" style={{ minHeight: '280px' }}>
        <div className="h-4 w-48 bg-[rgba(155,92,255,0.15)] mb-4" />
        <div className="h-48 bg-[rgba(155,92,255,0.08)]" />
      </div>
    );
  }

  if (!data || data.protocols.length === 0) return null;

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] tracking-[0.16em] font-black" style={{ fontFamily: MONO, color: '#9B5CFF' }}>
            STAKING & RESTAKING
          </div>
          <div className="text-[9px] mt-1" style={{ color: '#64748B' }}>
            Liquid staking and restaking protocol metrics
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-px mb-4" style={{ background: 'rgba(214,226,242,0.14)', border: '1px solid rgba(214,226,242,0.22)' }}>
        <div className="px-3 py-2.5" style={{ background: '#0B1118' }}>
          <div className="text-[7.5px] font-mono tracking-[0.18em] text-[#8EA0B7] mb-1">TOTAL STAKED</div>
          <div className="text-[13px] font-mono font-bold tabular-nums" style={{ color: '#22C55E' }}>{fmtMoney(data.summary.total_staked_usd)}</div>
        </div>
        <div className="px-3 py-2.5" style={{ background: '#0B1118' }}>
          <div className="text-[7.5px] font-mono tracking-[0.18em] text-[#8EA0B7] mb-1">RESTAKED</div>
          <div className="text-[13px] font-mono font-bold tabular-nums" style={{ color: '#9B5CFF' }}>{fmtMoney(data.summary.total_restaked_usd)}</div>
        </div>
        <div className="px-3 py-2.5" style={{ background: '#0B1118' }}>
          <div className="text-[7.5px] font-mono tracking-[0.18em] text-[#8EA0B7] mb-1">LIQUID STAKING</div>
          <div className="text-[13px] font-mono font-bold tabular-nums" style={{ color: '#627EEA' }}>{fmtMoney(data.summary.liquid_staking_usd)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div style={{ height: '180px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={STAKING_COLORS[entry.name] || '#0EA5C8'} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { name: string; value: number };
                  return (
                    <div className="px-3 py-2" style={{ background: 'rgba(5,10,14,0.98)', border: '1px solid rgba(155,92,255,0.35)', fontFamily: MONO }}>
                      <div className="text-[10px] font-bold mb-1" style={{ color: STAKING_COLORS[d.name] || '#0EA5C8' }}>{d.name}</div>
                      <div className="text-[9px]" style={{ color: '#B4C0CF' }}>{fmtMoney(d.value)}</div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Protocol list */}
        <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
          {data.protocols.slice(0, 10).map(p => (
            <div key={p.slug} className="flex items-center justify-between px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5" style={{ background: STAKING_COLORS[p.category] || '#0EA5C8' }} />
                <span className="text-[9px] font-mono" style={{ color: '#B4C0CF' }}>{p.name}</span>
              </div>
              <span className="text-[9px] font-mono font-bold tabular-nums" style={{ color: '#FAFAFA' }}>{fmtMoney(p.tvl_usd)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PANEL: RWA (REAL WORLD ASSETS)
   ═══════════════════════════════════════════════════════════ */

const RWA_COLORS = ['#22C55E', '#38BDF8', '#F59E0B', '#9B5CFF', '#EC4899', '#627EEA'];

export function RwaPanel() {
  const [data, setData] = useState<RwaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const resp = await window.fetch('/api/metrilytics/rwa');
        const json = await resp.json() as RwaResponse;
        if (!cancelled && json.success) setData(json);
      } catch { /* silent */ } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void fetch();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <div className="p-5 animate-pulse" style={{ minHeight: '260px' }}>
        <div className="h-4 w-48 bg-[rgba(34,197,94,0.15)] mb-4" />
        <div className="h-44 bg-[rgba(34,197,94,0.08)]" />
      </div>
    );
  }

  if (!data || data.protocols.length === 0) return null;

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] tracking-[0.16em] font-black" style={{ fontFamily: MONO, color: '#22C55E' }}>
            REAL WORLD ASSETS (RWA)
          </div>
          <div className="text-[9px] mt-1" style={{ color: '#64748B' }}>
            Tokenized treasuries, private credit, and institutional DeFi
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] tracking-[0.12em]" style={{ fontFamily: MONO, color: '#5A7A94' }}>TOTAL TVL</div>
          <div className="text-[14px] font-black tabular-nums" style={{ fontFamily: MONO, color: '#22C55E' }}>
            {fmtMoney(data.summary.total_tvl_usd)}
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="flex flex-wrap gap-2 mb-4">
        {data.summary.categories.map((cat, i) => (
          <div key={cat.name} className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-2 h-2" style={{ background: RWA_COLORS[i % RWA_COLORS.length] }} />
            <span className="text-[8px] font-mono" style={{ color: '#B4C0CF' }}>{cat.name}</span>
            <span className="text-[8px] font-mono font-bold" style={{ color: '#FAFAFA' }}>{fmtMoney(cat.tvl_usd)}</span>
          </div>
        ))}
      </div>

      {/* Protocol table */}
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(214,226,242,0.14)' }}>
              {['#', 'PROTOCOL', 'CATEGORY', 'TVL'].map(col => (
                <th key={col} className="px-3 py-2 text-left text-[8px] font-mono tracking-[0.14em]" style={{ color: 'rgba(125,211,252,0.95)' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.protocols.slice(0, 12).map((p, i) => (
              <tr key={p.slug} style={{ borderBottom: '0.5px solid rgba(214,226,242,0.08)' }}>
                <td className="px-3 py-2">
                  <span className="text-[9px] font-mono text-[#64748B] tabular-nums">{i + 1}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-mono font-bold text-white">{p.name}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[8px] font-mono px-1.5 py-0.5" style={{ color: '#22C55E', background: 'rgba(34,197,94,0.1)', border: '0.5px solid rgba(34,197,94,0.3)' }}>
                    {p.category}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: '#FAFAFA' }}>{fmtMoney(p.tvl_usd)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
