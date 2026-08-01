'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, ComposedChart,
} from 'recharts';

interface WeeklyData {
  week_start: string;
  total_volume: number;
  tx_count: number;
  avg_tx_size: number;
  inflow_volume: number;
  outflow_volume: number;
  net_flow: number;
  moving_average_3w: number;
}

interface WeeklyResponse {
  success: boolean;
  data: WeeklyData[];
  trend: string;
  summary: {
    total_volume_12w: number;
    total_txs_12w: number;
    largest_week: number;
    latest_week_volume: number;
    latest_week_txs: number;
  };
}

const MONO = "'JetBrains Mono', monospace";

function formatUSDCompact(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: WeeklyData }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as WeeklyData;
  return (
    <div
      className="px-4 py-3"
      style={{
        background: 'rgba(5, 10, 14, 0.98)',
        border: '1px solid rgba(14,165,200,0.35)',
        fontFamily: MONO,
      }}
    >
      <div className="text-[10px] tracking-[0.14em] mb-2" style={{ color: '#5A7A94' }}>
        WEEK OF {label ? formatDate(label) : '—'}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <div>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: '#64748B' }}>TOTAL VOL</div>
          <div className="text-[12px] font-bold" style={{ color: '#7DD3FC' }}>{formatUSDCompact(d.total_volume)}</div>
        </div>
        <div>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: '#64748B' }}>TX COUNT</div>
          <div className="text-[12px] font-bold" style={{ color: '#FAFAFA' }}>{d.tx_count}</div>
        </div>
        <div>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: '#64748B' }}>INFLOW</div>
          <div className="text-[12px] font-bold" style={{ color: '#34E7FF' }}>{formatUSDCompact(d.inflow_volume)}</div>
        </div>
        <div>
          <div className="text-[8px] tracking-[0.12em]" style={{ color: '#64748B' }}>OUTFLOW</div>
          <div className="text-[12px] font-bold" style={{ color: '#0EA5C8' }}>{formatUSDCompact(d.outflow_volume)}</div>
        </div>
        <div className="col-span-2">
          <div className="text-[8px] tracking-[0.12em]" style={{ color: '#64748B' }}>3W MA</div>
          <div className="text-[12px] font-bold" style={{ color: '#F59E0B' }}>{formatUSDCompact(d.moving_average_3w)}</div>
        </div>
      </div>
    </div>
  );
};

export default function WeeklyVolumeChart() {
  const [data, setData] = useState<WeeklyData[]>([]);
  const [summary, setSummary] = useState<WeeklyResponse['summary'] | null>(null);
  const [trend, setTrend] = useState('neutral');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchWeekly() {
      try {
        const resp = await fetch('/api/tracking/weekly?weeks=12');
        const json = (await resp.json()) as WeeklyResponse;
        if (json.success && !cancelled) {
          // Reverse so oldest is first for the chart
          setData([...json.data].reverse());
          setSummary(json.summary);
          setTrend(json.trend);
        }
      } catch {
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchWeekly();
    return () => { cancelled = true; };
  }, []);

  const chartData = useMemo(() =>
    data.map(d => ({
      ...d,
      label: formatDate(d.week_start),
    })),
    [data]
  );

  if (isLoading) {
    return (
      <div className="panel-glass p-5 mb-6" style={{ minHeight: '340px' }}>
        <div className="animate-pulse">
          <div className="h-4 w-48 bg-[rgba(14,165,200,0.15)] mb-4"></div>
          <div className="h-64 bg-[rgba(14,165,200,0.08)]"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="panel-glass p-5 mb-6">
        <div className="text-[10px] tracking-[0.14em] font-bold mb-1" style={{ fontFamily: MONO, color: '#5A7A94' }}>
          WEEKLY WHALE VOLUME
        </div>
        <div className="text-[12px] font-sans" style={{ color: '#64748B' }}>
          Insufficient historical data for weekly aggregation.
        </div>
      </div>
    );
  }

  const isUp = trend === 'up';

  return (
    <div className="panel-glass p-5 mb-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-[10px] tracking-[0.16em] font-black" style={{ fontFamily: MONO, color: '#7DD3FC' }}>
              WEEKLY WHALE VOLUME
            </div>
            <span
              className="text-[8px] tracking-[0.12em] px-1.5 py-0.5 font-bold"
              style={{
                fontFamily: MONO,
                color: isUp ? '#3DFF9E' : '#FF6B7A',
                background: isUp ? 'rgba(61,255,158,0.08)' : 'rgba(255,107,122,0.08)',
                border: `1px solid ${isUp ? 'rgba(61,255,158,0.25)' : 'rgba(255,107,122,0.25)'}`,
              }}
            >
              {isUp ? '▲ RISING' : '▼ FALLING'}
            </span>
          </div>
          <div className="text-[10px] leading-relaxed max-w-lg font-sans" style={{ color: '#64748B' }}>
            Rising volume in large whale transactions historically correlates with increased market
            activity and potential trend reversals. The 3-week moving average (orange) smooths
            volatility to reveal the underlying signal.
          </div>
        </div>
        {summary && (
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-[8px] tracking-[0.12em]" style={{ fontFamily: MONO, color: '#5A7A94' }}>12-WEEK TOTAL</div>
              <div className="text-[14px] font-black tabular-nums" style={{ fontFamily: MONO, color: '#FAFAFA' }}>
                {formatUSDCompact(summary.total_volume_12w)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[8px] tracking-[0.12em]" style={{ fontFamily: MONO, color: '#5A7A94' }}>THIS WEEK</div>
              <div className="text-[14px] font-black tabular-nums" style={{ fontFamily: MONO, color: '#7DD3FC' }}>
                {formatUSDCompact(summary.latest_week_volume)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[8px] tracking-[0.12em]" style={{ fontFamily: MONO, color: '#5A7A94' }}>TRANSACTIONS</div>
              <div className="text-[14px] font-black tabular-nums" style={{ fontFamily: MONO, color: '#FAFAFA' }}>
                {summary.latest_week_txs}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(14,165,200,0.45)" />
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
              tickFormatter={formatUSDCompact}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="total_volume"
              fill="url(#volGradient)"
              stroke="rgba(14,165,200,0.6)"
              strokeWidth={1}
              radius={[2, 2, 0, 0]}
              maxBarSize={48}
            />
            <Area
              type="monotone"
              dataKey="moving_average_3w"
              stroke="#F59E0B"
              strokeWidth={2}
              fill="transparent"
              dot={false}
              activeDot={{ r: 4, fill: '#F59E0B', stroke: '#050A0E', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2" style={{ background: 'rgba(14,165,200,0.6)' }} />
          <span className="text-[8px] tracking-[0.1em]" style={{ fontFamily: MONO, color: '#64748B' }}>WEEKLY VOLUME</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5" style={{ background: '#F59E0B' }} />
          <span className="text-[8px] tracking-[0.1em]" style={{ fontFamily: MONO, color: '#64748B' }}>3-WEEK MA</span>
        </div>
      </div>
    </div>
  );
}
