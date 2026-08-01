'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const MONO = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const RED = '#C2344D';
const GREEN = '#22C55E';
const AMBER = '#E8960C';
const BLUE = '#38BDF8';
const TEXT = 'var(--text-primary)';
const MUTED = 'var(--text-secondary)';
const FAINT = 'var(--text-ghost)';

interface ETFData {
  summary: {
    daily_flow_usd: number;
    cumulative_flow_usd: number;
    streak_days: number;
    total_aum_usd: number;
    total_btc_holdings: number;
    pct_circulating_supply: number;
  };
  etfs: Array<{
    etf_symbol: string;
    etf_name: string;
    asset: string;
    daily_flow_usd: number;
    cumulative_flow_usd: number;
    aum_usd: number;
    btc_holdings: number | null;
    eth_holdings: number | null;
    premium_pct: number | null;
  }>;
  history: {
    dates: string[];
    daily_flows: number[];
    cumulative_flows: number[];
    btc_price: number[];
  };
  institutional: Array<{
    entity_name: string;
    entity_type: string;
    country: string;
    btc_holdings: number;
    eth_holdings: number | null;
    usd_value: number;
    pct_total_supply: number;
    change_30d: number | null;
    change_30d_usd: number | null;
    last_update: string;
  }>;
  comparison: {
    etf_net_flow_24h: number;
    exchange_net_flow_24h: number;
    correlation: string;
    signal: string;
  };
}

function formatUsd(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function ETFFlowChart({ data }: { data: ETFData['history'] }) {
  const chartData = data.dates.map((date, i) => ({
    date,
    daily: data.daily_flows[i] / 1e6, // Convert to millions for readability
    cumulative: data.cumulative_flows[i] / 1e9, // Convert to billions
    price: data.btc_price[i]
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={chartData}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
        <XAxis 
          dataKey="date" 
          tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }}
          tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis 
          yAxisId="left"
          tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }}
          tickFormatter={(v) => `$${v.toFixed(0)}M`}
          label={{ value: 'Daily Flow', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 10, fontFamily: MONO }}
        />
        <YAxis 
          yAxisId="right" 
          orientation="right"
          tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }}
          tickFormatter={(v) => `$${v.toFixed(1)}B`}
          label={{ value: 'Cumulative', angle: 90, position: 'insideRight', fill: MUTED, fontSize: 10, fontFamily: MONO }}
        />
        <Tooltip 
          contentStyle={{ 
            background: 'var(--bg-elevated)', 
            border: '1px solid var(--border-subtle)',
            fontFamily: MONO,
            fontSize: 11
          }}
          formatter={(value, name) => {
            const v = Number(value);
            if (name === 'daily') return [`$${v.toFixed(1)}M`, 'Daily Flow'];
            if (name === 'cumulative') return [`$${v.toFixed(2)}B`, 'Cumulative'];
            return [value, name];
          }}
        />
        <Bar 
          yAxisId="left"
          dataKey="daily" 
          fill={AMBER}
          radius={[2, 2, 0, 0]}
        />
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="cumulative" 
          stroke={BLUE}
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function ETFPanel() {
  const [data, setData] = useState<ETFData | null>(null);
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<'all' | 'BTC' | 'ETH'>('all');
  const [window, setWindow] = useState<30 | 90>(30);

  const fetchETFData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        days: window.toString(),
        ...(asset !== 'all' && { asset })
      });

      const response = await fetch(`/api/metrilytics/etf?${params}`);
      const json = (await response.json()) as { success?: boolean; data?: ETFData };
      
      if (json.success) {
        setData(json.data ?? null);
      }
      setLoading(false);
    } catch (error) {
      console.error('[ETFPanel] fetch error:', error);
      setLoading(false);
    }
  }, [asset, window]);

  useEffect(() => {
    const timeout = setTimeout(fetchETFData, 0);
    const interval = setInterval(fetchETFData, 3600_000); // Refresh hourly
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchETFData]);

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: FAINT,
        fontSize: '11px',
        fontFamily: MONO
      }}>
        Loading ETF data...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: FAINT,
        fontSize: '11px',
        fontFamily: MONO
      }}>
        ETF data unavailable. Waiting for cron worker...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['all', 'BTC', 'ETH'] as const).map(a => (
            <button
              key={a}
              onClick={() => setAsset(a)}
              style={{
                padding: '4px 12px',
                fontSize: '10px',
                fontFamily: MONO,
                background: asset === a ? AMBER : 'transparent',
                color: asset === a ? '#000' : MUTED,
                border: `1px solid ${asset === a ? AMBER : 'var(--border-subtle)'}`,
                borderRadius: '2px',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {a}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {[30, 90].map(d => (
            <button
              key={d}
              onClick={() => setWindow(d as 30 | 90)}
              style={{
                padding: '4px 12px',
                fontSize: '10px',
                fontFamily: MONO,
                background: window === d ? AMBER : 'transparent',
                color: window === d ? '#000' : MUTED,
                border: `1px solid ${window === d ? AMBER : 'var(--border-subtle)'}`,
                borderRadius: '2px',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div style={{
          padding: '12px',
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ fontSize: '9px', color: FAINT, textTransform: 'uppercase', marginBottom: '4px', fontFamily: MONO }}>
            24H Net Flow
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: data.summary.daily_flow_usd > 0 ? GREEN : RED,
            fontFamily: MONO
          }}>
            {formatUsd(data.summary.daily_flow_usd)}
          </div>
          <div style={{ fontSize: '9px', color: MUTED, fontFamily: MONO }}>
            {data.summary.daily_flow_usd > 0 ? '↑ Inflow' : '↓ Outflow'}
          </div>
        </div>

        <div style={{
          padding: '12px',
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ fontSize: '9px', color: FAINT, textTransform: 'uppercase', marginBottom: '4px', fontFamily: MONO }}>
            Cumulative Flow
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: AMBER, fontFamily: MONO }}>
            {formatUsd(data.summary.cumulative_flow_usd)}
          </div>
          <div style={{ fontSize: '9px', color: MUTED, fontFamily: MONO }}>
            Since launch
          </div>
        </div>

        <div style={{
          padding: '12px',
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ fontSize: '9px', color: FAINT, textTransform: 'uppercase', marginBottom: '4px', fontFamily: MONO }}>
            Flow Streak
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: data.summary.streak_days > 0 ? GREEN : RED,
            fontFamily: MONO
          }}>
            {Math.abs(data.summary.streak_days)} days
          </div>
          <div style={{ fontSize: '9px', color: MUTED, fontFamily: MONO }}>
            {data.summary.streak_days > 0 ? 'Inflow' : 'Outflow'}
          </div>
        </div>

        <div style={{
          padding: '12px',
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ fontSize: '9px', color: FAINT, textTransform: 'uppercase', marginBottom: '4px', fontFamily: MONO }}>
            Total AUM
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: BLUE, fontFamily: MONO }}>
            {formatUsd(data.summary.total_aum_usd)}
          </div>
          <div style={{ fontSize: '9px', color: MUTED, fontFamily: MONO }}>
            {data.summary.pct_circulating_supply.toFixed(1)}% of supply
          </div>
        </div>
      </div>

      {/* ETF Flow Chart */}
      <div>
        <div style={{
          fontSize: '11px',
          color: TEXT,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
          fontFamily: MONO
        }}>
          Daily ETF Flows ({window}d)
        </div>
        <ETFFlowChart data={data.history} />
      </div>

      {/* Per-ETF Breakdown */}
      <div>
        <div style={{
          fontSize: '11px',
          color: TEXT,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
          fontFamily: MONO
        }}>
          ETF Breakdown
        </div>
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px'
        }}>
          {data.etfs.map((etf, i) => (
            <div
              key={etf.etf_symbol}
              style={{
                padding: '12px',
                borderBottom: i < data.etfs.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                display: 'grid',
                gridTemplateColumns: '80px 1fr 120px 120px 100px',
                gap: '12px',
                fontSize: '10px',
                fontFamily: MONO,
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ color: TEXT, fontWeight: 700 }}>{etf.etf_symbol}</div>
                <div style={{ fontSize: '8px', color: FAINT }}>{etf.asset}</div>
              </div>
              <div style={{ color: MUTED, fontSize: '9px' }}>{etf.etf_name}</div>
              <div style={{
                color: etf.daily_flow_usd > 0 ? GREEN : RED,
                fontWeight: 700,
                textAlign: 'right'
              }}>
                {formatUsd(etf.daily_flow_usd)}
              </div>
              <div style={{ color: BLUE, textAlign: 'right' }}>
                {formatUsd(etf.aum_usd)}
              </div>
              <div style={{
                color: etf.premium_pct && etf.premium_pct > 0 ? GREEN : RED,
                textAlign: 'right',
                fontSize: '9px'
              }}>
                {etf.premium_pct ? `${etf.premium_pct > 0 ? '+' : ''}${etf.premium_pct.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Institutional Holdings */}
      <div>
        <div style={{
          fontSize: '11px',
          color: TEXT,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
          fontFamily: MONO
        }}>
          Institutional Holdings Leaderboard
        </div>
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px'
        }}>
          {data.institutional.slice(0, 10).map((inst, i) => (
            <div
              key={inst.entity_name}
              style={{
                padding: '12px',
                borderBottom: i < 9 ? '1px solid var(--border-subtle)' : 'none',
                display: 'grid',
                gridTemplateColumns: '200px 120px 120px 100px 1fr',
                gap: '12px',
                fontSize: '10px',
                fontFamily: MONO,
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ color: TEXT, fontWeight: 700 }}>{inst.entity_name}</div>
                <div style={{ fontSize: '8px', color: FAINT }}>{inst.country}</div>
              </div>
              <div style={{ color: TEXT }}>
                {inst.btc_holdings.toLocaleString()} BTC
              </div>
              <div style={{ color: BLUE }}>
                {formatUsd(inst.usd_value)}
              </div>
              <div style={{ color: MUTED }}>
                {inst.pct_total_supply.toFixed(2)}%
              </div>
              <div style={{
                color: inst.change_30d && inst.change_30d > 0 ? GREEN : RED,
                fontSize: '9px',
                textAlign: 'right'
              }}>
                {inst.change_30d ? `${inst.change_30d > 0 ? '+' : ''}${inst.change_30d.toFixed(0)} BTC (30d)` : 'N/A'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
