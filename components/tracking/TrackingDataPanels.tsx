'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Line, Cell, PieChart, Pie,
} from 'recharts';

const MONO = "'JetBrains Mono', monospace";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface FlowPoint {
  period: string;
  inflow_volume: number;
  outflow_volume: number;
  net_flow: number;
  tx_count: number;
  avg_tx_size: number;
  largest_tx: number;
}

interface TokenFlow {
  token: string;
  volume: number;
  tx_count: number;
  inflow: number;
  outflow: number;
}

interface ExchangeFlow {
  exchange: string;
  inflow: number;
  outflow: number;
  net_flow: number;
  tx_count: number;
}

interface LargeTx {
  id: number;
  signature: string;
  amount_usd: number;
  amount_native: number;
  flow_type: string;
  sender: string;
  receiver: string;
  sender_label: string;
  receiver_label: string;
  timestamp: string;
  blockchain: string;
  token: string;
  block_height: number;
}

interface FlowTypeDist {
  flow_type: string;
  tx_count: number;
  volume: number;
}

interface FlowHistoryResponse {
  success: boolean;
  granularity: string;
  hours: number;
  flow_history: FlowPoint[];
  chain_flows: { period: string; blockchain: string; volume: number; tx_count: number }[];
  token_flows: TokenFlow[];
  exchange_flows: ExchangeFlow[];
  large_transactions: LargeTx[];
  flow_type_distribution: FlowTypeDist[];
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function formatUSD(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function formatPeriod(period: string, granularity: string): string {
  const d = new Date(period.replace(' ', 'T') + ':00Z');
  if (granularity === 'daily') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function timeAgo(ts: string): string {
  const normalized = ts.includes('Z') || ts.includes('+') ? ts : ts + 'Z';
  const diff = Date.now() - new Date(normalized).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'NOW';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

const CHAIN_COLORS: Record<string, string> = {
  Bitcoin: '#FFB84D',
  Ethereum: '#9BAEFF',
  Solana: '#C084FC',
  Tron: '#FF5A6C',
  Sui: '#7DD3FC',
  Sei: '#FB7185',
  Base: '#60A5FA',
  Arbitrum: '#67E8F9',
  Polygon: '#C4B5FD',
  BSC: '#F0B90B',
  Optimism: '#FF0420',
  Avalanche: '#E84142',
  XRP: '#00AAE4',
  NEAR: '#00C08B',
};

const FLOW_COLORS: Record<string, string> = {
  'Exchange Inflow': '#34E7FF',
  'Exchange Outflow': '#0EA5C8',
  'Exchange Transfer': '#9BAEFF',
  'Whale Transfer': '#C084FC',
  'Miner Movement': '#FFB84D',
  'Mint': '#34D399',
  'Burn': '#FF5A6C',
  'Transfer': '#D2DAE5',
  'Self': '#8EA0B7',
};

const TOKEN_COLORS: Record<string, string> = {
  BTC: '#FFB84D',
  ETH: '#9BAEFF',
  SOL: '#C084FC',
  TRX: '#FF5A6C',
  USDC: '#60A5FA',
  USDT: '#34D399',
  WBTC: '#FDBA74',
  SUI: '#7DD3FC',
  SEI: '#FB7185',
};

/* ═══════════════════════════════════════════════════════════
   TOOLTIP COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function FlowTooltip({ active, payload, label, granularity }: {
  active?: boolean;
  payload?: Array<{ payload: FlowPoint }>;
  label?: string;
  granularity: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="px-4 py-3" style={{ background: 'rgba(5,10,14,0.98)', border: '1px solid rgba(14,165,200,0.35)', fontFamily: MONO }}>
      <div className="text-[10px] tracking-[0.14em] mb-2" style={{ color: '#5A7A94' }}>
        {label ? formatPeriod(label, granularity) : '—'}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <div>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: '#64748B' }}>INFLOW</div>
          <div className="text-[12px] font-bold" style={{ color: '#34E7FF' }}>{formatUSD(d.inflow_volume)}</div>
        </div>
        <div>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: '#64748B' }}>OUTFLOW</div>
          <div className="text-[12px] font-bold" style={{ color: '#0EA5C8' }}>{formatUSD(d.outflow_volume)}</div>
        </div>
        <div>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: '#64748B' }}>NET FLOW</div>
          <div className="text-[12px] font-bold" style={{ color: d.net_flow >= 0 ? '#22C55E' : '#EF4444' }}>
            {d.net_flow >= 0 ? '+' : ''}{formatUSD(d.net_flow)}
          </div>
        </div>
        <div>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: '#64748B' }}>TX COUNT</div>
          <div className="text-[12px] font-bold" style={{ color: '#FAFAFA' }}>{d.tx_count}</div>
        </div>
        <div>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: '#64748B' }}>AVG TX</div>
          <div className="text-[12px] font-bold" style={{ color: '#B4C0CF' }}>{formatUSD(d.avg_tx_size)}</div>
        </div>
        <div>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: '#64748B' }}>LARGEST</div>
          <div className="text-[12px] font-bold" style={{ color: '#FFD08A' }}>{formatUSD(d.largest_tx)}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PANEL: EXCHANGE FLOW HISTORY
   ═══════════════════════════════════════════════════════════ */

function ExchangeFlowHistoryPanel({ data, granularity }: { data: FlowPoint[]; granularity: string }) {
  const chartData = useMemo(() =>
    data.map(d => ({
      ...d,
      label: formatPeriod(d.period, granularity),
    })),
    [data, granularity]
  );

  const totals = useMemo(() => {
    const totalInflow = data.reduce((s, d) => s + d.inflow_volume, 0);
    const totalOutflow = data.reduce((s, d) => s + d.outflow_volume, 0);
    return {
      inflow: totalInflow,
      outflow: totalOutflow,
      net: totalInflow - totalOutflow,
      txCount: data.reduce((s, d) => s + d.tx_count, 0),
    };
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className="panel-glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-[10px] tracking-[0.16em] font-black mb-1" style={{ fontFamily: MONO, color: '#7DD3FC' }}>
            EXCHANGE FLOW HISTORY
          </div>
          <div className="text-[10px] leading-relaxed max-w-md font-sans" style={{ color: '#64748B' }}>
            Inflow vs outflow to exchanges. Sustained inflow may signal selling pressure; outflow suggests accumulation.
          </div>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <div className="text-[8px] tracking-[0.12em]" style={{ fontFamily: MONO, color: '#5A7A94' }}>TOTAL INFLOW</div>
            <div className="text-[14px] font-black tabular-nums" style={{ fontFamily: MONO, color: '#34E7FF' }}>{formatUSD(totals.inflow)}</div>
          </div>
          <div className="text-right">
            <div className="text-[8px] tracking-[0.12em]" style={{ fontFamily: MONO, color: '#5A7A94' }}>TOTAL OUTFLOW</div>
            <div className="text-[14px] font-black tabular-nums" style={{ fontFamily: MONO, color: '#0EA5C8' }}>{formatUSD(totals.outflow)}</div>
          </div>
          <div className="text-right">
            <div className="text-[8px] tracking-[0.12em]" style={{ fontFamily: MONO, color: '#5A7A94' }}>NET FLOW</div>
            <div className="text-[14px] font-black tabular-nums" style={{ fontFamily: MONO, color: totals.net >= 0 ? '#22C55E' : '#EF4444' }}>
              {totals.net >= 0 ? '+' : ''}{formatUSD(totals.net)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: '240px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(52,231,255,0.4)" />
                <stop offset="100%" stopColor="rgba(52,231,255,0.02)" />
              </linearGradient>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(14,165,200,0.4)" />
                <stop offset="100%" stopColor="rgba(14,165,200,0.02)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fontFamily: MONO, fill: '#475569' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fontFamily: MONO, fill: '#475569' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatUSD}
              width={60}
            />
            <Tooltip content={<FlowTooltip granularity={granularity} />} />
            <Area type="monotone" dataKey="inflow_volume" stroke="#34E7FF" strokeWidth={2} fill="url(#inflowGrad)" />
            <Area type="monotone" dataKey="outflow_volume" stroke="#0EA5C8" strokeWidth={2} fill="url(#outflowGrad)" />
            <Line type="monotone" dataKey="net_flow" stroke="#22C55E" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-5 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2" style={{ background: 'rgba(52,231,255,0.6)' }} />
          <span className="text-[8px] tracking-[0.1em]" style={{ fontFamily: MONO, color: '#64748B' }}>INFLOW</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2" style={{ background: 'rgba(14,165,200,0.6)' }} />
          <span className="text-[8px] tracking-[0.1em]" style={{ fontFamily: MONO, color: '#64748B' }}>OUTFLOW</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5" style={{ background: '#22C55E' }} />
          <span className="text-[8px] tracking-[0.1em]" style={{ fontFamily: MONO, color: '#64748B' }}>NET FLOW</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PANEL: TOKEN FLOW BREAKDOWN
   ═══════════════════════════════════════════════════════════ */

function TokenFlowPanel({ data }: { data: TokenFlow[] }) {
  if (data.length === 0) return null;

  const maxVolume = Math.max(...data.map(d => d.volume));

  return (
    <div className="panel-glass p-5">
      <div className="text-[10px] tracking-[0.16em] font-black mb-4" style={{ fontFamily: MONO, color: '#7DD3FC' }}>
        TOKEN FLOW BREAKDOWN
      </div>

      <div className="space-y-3">
        {data.slice(0, 10).map((token) => {
          const pct = maxVolume > 0 ? (token.volume / maxVolume) * 100 : 0;
          const color = TOKEN_COLORS[token.token] || '#0EA5C8';
          const netFlow = token.inflow - token.outflow;
          return (
            <div key={token.token}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold" style={{ color }}>{token.token}</span>
                  <span className="text-[9px] font-mono" style={{ color: '#64748B' }}>{token.tx_count} txs</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: '#FAFAFA' }}>{formatUSD(token.volume)}</span>
                  <span className="text-[9px] font-mono tabular-nums" style={{ color: netFlow >= 0 ? '#22C55E' : '#EF4444' }}>
                    {netFlow >= 0 ? '▲' : '▼'} {formatUSD(Math.abs(netFlow))}
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PANEL: EXCHANGE FLOWS TABLE
   ═══════════════════════════════════════════════════════════ */

function ExchangeFlowsPanel({ data }: { data: ExchangeFlow[] }) {
  if (data.length === 0) return null;

  return (
    <div className="panel-glass p-5">
      <div className="text-[10px] tracking-[0.16em] font-black mb-4" style={{ fontFamily: MONO, color: '#7DD3FC' }}>
        EXCHANGE FLOWS
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(214,226,242,0.14)' }}>
              {['EXCHANGE', 'INFLOW', 'OUTFLOW', 'NET', 'TXS'].map(col => (
                <th key={col} className="px-3 py-2 text-left text-[8px] font-mono tracking-[0.14em]" style={{ color: 'rgba(125,211,252,0.95)' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 12).map((ex) => (
              <tr key={ex.exchange} style={{ borderBottom: '0.5px solid rgba(214,226,242,0.08)' }}>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-mono font-bold text-white">{ex.exchange}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: '#34E7FF' }}>{formatUSD(ex.inflow)}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: '#0EA5C8' }}>{formatUSD(ex.outflow)}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: ex.net_flow >= 0 ? '#22C55E' : '#EF4444' }}>
                    {ex.net_flow >= 0 ? '+' : ''}{formatUSD(ex.net_flow)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: '#B4C0CF' }}>{ex.tx_count}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PANEL: LARGE TRANSACTIONS
   ═══════════════════════════════════════════════════════════ */

function LargeTransactionsPanel({ data }: { data: LargeTx[] }) {
  if (data.length === 0) return null;

  return (
    <div className="panel-glass p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] tracking-[0.16em] font-black" style={{ fontFamily: MONO, color: '#FFD08A' }}>
          ⚡ LARGE TRANSACTIONS ($10M+)
        </div>
        <span className="text-[9px] font-mono" style={{ color: '#64748B' }}>{data.length} found</span>
      </div>

      <div className="space-y-2">
        {data.slice(0, 8).map((tx) => {
          const cc = CHAIN_COLORS[tx.blockchain] || '#0EA5C8';
          const isExceptional = tx.amount_usd >= 50_000_000;
          return (
            <div
              key={tx.id}
              className="flex items-center justify-between px-3 py-2.5 transition-all hover:bg-[rgba(14,165,200,0.08)]"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderLeft: `2px solid ${isExceptional ? '#F7931A' : cc}`,
              }}
            >
              <div className="flex items-center gap-3">
                <span style={{ color: cc, fontSize: '14px' }}>
                  {tx.blockchain === 'Bitcoin' ? '₿' : tx.blockchain === 'Ethereum' ? 'Ξ' : tx.blockchain === 'Solana' ? '◎' : '◈'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold" style={{ color: tx.sender_label ? '#B4C0CF' : '#8EA0B7' }}>
                      {tx.sender_label || 'Unknown'}
                    </span>
                    <span className="text-[8px]" style={{ color: '#64748B' }}>→</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: tx.receiver_label ? '#B4C0CF' : '#8EA0B7' }}>
                      {tx.receiver_label || 'Unknown'}
                    </span>
                  </div>
                  <div className="text-[8px] font-mono" style={{ color: '#64748B' }}>
                    {timeAgo(tx.timestamp)} · {tx.flow_type}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-mono font-bold tabular-nums" style={{ color: isExceptional ? '#FFD08A' : '#FAFAFA' }}>
                  {formatUSD(tx.amount_usd)}
                </div>
                <div className="text-[8px] font-mono tabular-nums" style={{ color: cc }}>
                  {tx.amount_native > 0 ? `${tx.amount_native.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${tx.token}` : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PANEL: FLOW TYPE DISTRIBUTION
   ═══════════════════════════════════════════════════════════ */

function FlowTypeDistributionPanel({ data }: { data: FlowTypeDist[] }) {
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.volume, 0);
  const chartData = data
    .filter(d => d.flow_type !== 'Self')
    .map(d => ({
      name: d.flow_type,
      value: d.volume,
      txCount: d.tx_count,
      pct: total > 0 ? (d.volume / total) * 100 : 0,
    }));

  return (
    <div className="panel-glass p-5">
      <div className="text-[10px] tracking-[0.16em] font-black mb-4" style={{ fontFamily: MONO, color: '#7DD3FC' }}>
        FLOW TYPE DISTRIBUTION
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div style={{ height: '180px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={FLOW_COLORS[entry.name] || '#0EA5C8'} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { name: string; value: number; txCount: number; pct: number };
                  return (
                    <div className="px-3 py-2" style={{ background: 'rgba(5,10,14,0.98)', border: '1px solid rgba(14,165,200,0.35)', fontFamily: MONO }}>
                      <div className="text-[10px] font-bold mb-1" style={{ color: FLOW_COLORS[d.name] || '#0EA5C8' }}>{d.name}</div>
                      <div className="text-[9px]" style={{ color: '#B4C0CF' }}>{formatUSD(d.value)} · {d.txCount} txs · {d.pct.toFixed(1)}%</div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2" style={{ background: FLOW_COLORS[d.name] || '#0EA5C8' }} />
                <span className="text-[9px] font-mono" style={{ color: '#B4C0CF' }}>{d.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono tabular-nums" style={{ color: '#FAFAFA' }}>{formatUSD(d.value)}</span>
                <span className="text-[8px] font-mono tabular-nums" style={{ color: '#64748B' }}>{d.pct.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT: ALL TRACKING PANELS
   ═══════════════════════════════════════════════════════════ */

export default function TrackingDataPanels() {
  const [data, setData] = useState<FlowHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [granularity, setGranularity] = useState<'hourly' | 'daily'>('hourly');
  const [hours, setHours] = useState(168); // 7 days
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const resp = await fetch(`/api/tracking/flow-history?granularity=${granularity}&hours=${hours}`);
        const json = await resp.json() as FlowHistoryResponse;
        if (!cancelled && json.success) setData(json);
      } catch { /* silent */ } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void fetchData();
    return () => { cancelled = true; };
  }, [granularity, hours, refreshKey]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="panel-glass p-5 animate-pulse">
            <div className="h-4 w-48 bg-[rgba(14,165,200,0.15)] mb-4" />
            <div className="h-48 bg-[rgba(14,165,200,0.08)]" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Time range controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-[#B4C0CF] tracking-wider">RANGE:</span>
          {[
            { label: '24H', hours: 24 },
            { label: '72H', hours: 72 },
            { label: '7D', hours: 168 },
            { label: '14D', hours: 336 },
            { label: '30D', hours: 720 },
          ].map((r) => (
            <button
              key={r.hours}
              onClick={() => { setHours(r.hours); setGranularity(r.hours > 168 ? 'daily' : 'hourly'); }}
              className="px-2.5 py-1.5 text-[8px] font-mono font-bold transition-all"
              style={{
                color: hours === r.hours ? '#0EA5C8' : '#B4C0CF',
                background: hours === r.hours ? 'rgba(14,165,200,0.18)' : 'transparent',
                border: `1px solid ${hours === r.hours ? 'rgba(14,165,200,0.50)' : 'transparent'}`,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setIsLoading(true); setRefreshKey(k => k + 1); }}
          className="px-3 py-1.5 text-[8px] font-mono font-bold transition-all hover:bg-[rgba(14,165,200,0.13)]"
          style={{ color: '#7DD3FC', border: '1px solid rgba(14,165,200,0.32)' }}
        >
          ↻ REFRESH
        </button>
      </div>

      {/* Exchange Flow History Chart */}
      <ExchangeFlowHistoryPanel data={data.flow_history} granularity={granularity} />

      {/* Two column layout for smaller panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TokenFlowPanel data={data.token_flows} />
        <ExchangeFlowsPanel data={data.exchange_flows} />
      </div>

      {/* Large Transactions */}
      <LargeTransactionsPanel data={data.large_transactions} />

      {/* Flow Type Distribution */}
      <FlowTypeDistributionPanel data={data.flow_type_distribution} />
    </div>
  );
}
