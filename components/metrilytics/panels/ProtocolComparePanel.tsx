'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const MONO = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const RED = '#C2344D';
const GREEN = '#22C55E';
const AMBER = '#E8960C';
const BLUE = '#38BDF8';
const PURPLE = '#A855F7';
const PINK = '#EC4899';
const TEXT = 'var(--text-primary)';
const MUTED = 'var(--text-secondary)';
const FAINT = 'var(--text-ghost)';

const PROTOCOL_COLORS = [AMBER, BLUE, GREEN, PURPLE, PINK];

interface Protocol {
  slug: string;
  name: string;
  category: string;
  tvl_usd: number;
  mcap_usd: number;
  fees_24h: number;
  revenue_24h: number;
  ratios: {
    p_s: number;
    p_f: number;
    tvl_mcap: number;
    fees_tvl: number;
    rev_tvl: number;
    fee_capture: number;
  };
  change_7d: { tvl: number; fees: number; revenue: number };
  change_30d: { tvl: number; fees: number; revenue: number };
  history: {
    dates: string[];
    p_s: number[];
    p_f: number[];
    tvl: number[];
    mcap: number[];
  };
}

interface Ranking {
  slug: string;
  name: string;
  tvl_usd: number;
  mcap_usd: number;
  revenue_annualized: number;
  p_s: number;
  quadrant: string;
}

interface Divergence {
  protocols: string[];
  metric: string;
  divergence_pct: number;
  signal: string;
}

interface CompareData {
  protocols: Protocol[];
  rankings: Ranking[];
  divergences: Divergence[];
}

function formatUsd(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function normalize(value: number, min: number, max: number): number {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function ProtocolRadarChart({ protocols }: { protocols: Protocol[] }) {
  const metrics = ['TVL', 'Fees', 'Revenue', 'Growth', 'Efficiency', 'Value'];

  const chartData = metrics.map(metric => {
    const dataPoint: Record<string, string | number> = { metric };

    protocols.forEach(protocol => {
      let value = 0;

      switch (metric) {
        case 'TVL':
          value = normalize(protocol.tvl_usd, 0, 50e9);
          break;
        case 'Fees':
          value = normalize(protocol.fees_24h * 365, 0, 1e9);
          break;
        case 'Revenue':
          value = normalize(protocol.revenue_24h * 365, 0, 500e6);
          break;
        case 'Growth':
          value = normalize(protocol.change_30d.tvl, -50, 100);
          break;
        case 'Efficiency':
          value = normalize(protocol.ratios.fees_tvl, 0, 0.1);
          break;
        case 'Value':
          value = 100 - normalize(protocol.ratios.p_s, 0, 100);
          break;
      }

      dataPoint[protocol.name] = value;
    });

    return dataPoint;
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={chartData}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: MUTED, fontSize: 11, fontFamily: MONO }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: FAINT, fontSize: 9, fontFamily: MONO }}
        />
        {protocols.map((protocol, i) => (
          <Radar
            key={protocol.slug}
            name={protocol.name}
            dataKey={protocol.name}
            stroke={PROTOCOL_COLORS[i % PROTOCOL_COLORS.length]}
            fill={PROTOCOL_COLORS[i % PROTOCOL_COLORS.length]}
            fillOpacity={0.3}
          />
        ))}
        <Legend
          wrapperStyle={{ fontFamily: MONO, fontSize: 11, color: TEXT }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function ProtocolScatterPlot({ rankings }: { rankings: Ranking[] }) {
  if (!rankings.length) return null;

  const avgTvl = rankings.reduce((sum, r) => sum + r.tvl_usd, 0) / rankings.length;
  const avgRevenue = rankings.reduce((sum, r) => sum + r.revenue_annualized, 0) / rankings.length;

  const quadrantColors: Record<string, string> = {
    undervalued: GREEN,
    high_growth: BLUE,
    mature: AMBER,
    overvalued: RED
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
        <XAxis
          type="number"
          dataKey="tvl_usd"
          name="TVL"
          tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }}
          tickFormatter={formatUsd}
        />
        <YAxis
          type="number"
          dataKey="revenue_annualized"
          name="Revenue"
          tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }}
          tickFormatter={formatUsd}
        />
        <ReferenceLine x={avgTvl} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
        <ReferenceLine y={avgRevenue} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            fontFamily: MONO,
            fontSize: 11
          }}
          formatter={(value, name) => {
            const v = Number(value);
            if (name === 'TVL') return [formatUsd(v), 'TVL'];
            if (name === 'Revenue') return [formatUsd(v), 'Revenue (Annualized)'];
            return [value, name];
          }}
          cursor={{ strokeDasharray: '3 3' }}
        />
        <Scatter data={rankings} fill={AMBER}>
          {rankings.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={quadrantColors[entry.quadrant] || AMBER} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export default function ProtocolComparePanel() {
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>(['aave', 'compound']);
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState<30 | 90>(90);

  // Common protocols for quick selection
  const availableProtocols = [
    { slug: 'aave', name: 'Aave' },
    { slug: 'compound', name: 'Compound' },
    { slug: 'uniswap', name: 'Uniswap' },
    { slug: 'curve-dex', name: 'Curve' },
    { slug: 'lido', name: 'Lido' },
    { slug: 'makerdao', name: 'MakerDAO' },
    { slug: 'gmx', name: 'GMX' },
    { slug: 'pancakeswap-amm', name: 'PancakeSwap' }
  ];

  const fetchComparison = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        slugs: selectedProtocols.join(','),
        days: window.toString()
      });

      const response = await fetch(`/api/metrilytics/protocol-compare?${params}`);
      const json = (await response.json()) as { success?: boolean; data?: CompareData };

      if (json.success) {
        setData(json.data ?? null);
      }
      setLoading(false);
    } catch (error) {
      console.error('[ProtocolCompare] fetch error:', error);
      setLoading(false);
    }
  }, [selectedProtocols, window]);

  useEffect(() => {
    if (selectedProtocols.length >= 2) {
      const timeout = setTimeout(fetchComparison, 0);
      return () => clearTimeout(timeout);
    }
  }, [fetchComparison]);

  function toggleProtocol(slug: string) {
    setSelectedProtocols(prev => {
      if (prev.includes(slug)) {
        return prev.filter(s => s !== slug);
      } else if (prev.length < 5) {
        return [...prev, slug];
      }
      return prev;
    });
  }

  if (loading && !data) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: FAINT,
        fontSize: '11px',
        fontFamily: MONO
      }}>
        Loading protocol comparison...
      </div>
    );
  }

  if (!data || data.protocols.length < 2) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: FAINT,
        fontSize: '11px',
        fontFamily: MONO
      }}>
        Select at least 2 protocols to compare
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Protocol Selector */}
      <div>
        <div style={{
          fontSize: '11px',
          color: TEXT,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
          fontFamily: MONO
        }}>
          Select Protocols (2-5)
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {availableProtocols.map(p => (
            <button
              key={p.slug}
              onClick={() => toggleProtocol(p.slug)}
              disabled={!selectedProtocols.includes(p.slug) && selectedProtocols.length >= 5}
              style={{
                padding: '6px 12px',
                fontSize: '10px',
                fontFamily: MONO,
                background: selectedProtocols.includes(p.slug) ? AMBER : 'transparent',
                color: selectedProtocols.includes(p.slug) ? '#000' : MUTED,
                border: `1px solid ${selectedProtocols.includes(p.slug) ? AMBER : 'var(--border-subtle)'}`,
                borderRadius: '2px',
                cursor: selectedProtocols.length >= 5 && !selectedProtocols.includes(p.slug) ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                opacity: selectedProtocols.length >= 5 && !selectedProtocols.includes(p.slug) ? 0.5 : 1
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div>
        <div style={{
          fontSize: '11px',
          color: TEXT,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
          fontFamily: MONO
        }}>
          Ratio Comparison
        </div>
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px',
          overflowX: 'auto'
        }}>
          <table style={{
            width: '100%',
            fontSize: '10px',
            fontFamily: MONO,
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '8px', textAlign: 'left', color: FAINT, textTransform: 'uppercase' }}>Protocol</th>
                <th style={{ padding: '8px', textAlign: 'right', color: FAINT, textTransform: 'uppercase' }}>TVL</th>
                <th style={{ padding: '8px', textAlign: 'right', color: FAINT, textTransform: 'uppercase' }}>MCap</th>
                <th style={{ padding: '8px', textAlign: 'right', color: FAINT, textTransform: 'uppercase' }}>P/S</th>
                <th style={{ padding: '8px', textAlign: 'right', color: FAINT, textTransform: 'uppercase' }}>P/F</th>
                <th style={{ padding: '8px', textAlign: 'right', color: FAINT, textTransform: 'uppercase' }}>TVL/MCap</th>
                <th style={{ padding: '8px', textAlign: 'right', color: FAINT, textTransform: 'uppercase' }}>Fees/TVL</th>
                <th style={{ padding: '8px', textAlign: 'right', color: FAINT, textTransform: 'uppercase' }}>30d Growth</th>
              </tr>
            </thead>
            <tbody>
              {data.protocols.map((p, i) => (
                <tr key={p.slug} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px', color: PROTOCOL_COLORS[i % PROTOCOL_COLORS.length], fontWeight: 700 }}>
                    {p.name}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: TEXT }}>
                    {formatUsd(p.tvl_usd)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: TEXT }}>
                    {formatUsd(p.mcap_usd)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: p.ratios.p_s < 20 ? GREEN : p.ratios.p_s < 50 ? AMBER : RED }}>
                    {p.ratios.p_s.toFixed(1)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: p.ratios.p_f < 10 ? GREEN : p.ratios.p_f < 20 ? AMBER : RED }}>
                    {p.ratios.p_f.toFixed(1)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: TEXT }}>
                    {p.ratios.tvl_mcap.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: TEXT }}>
                    {(p.ratios.fees_tvl * 100).toFixed(2)}%
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: p.change_30d.tvl > 0 ? GREEN : RED }}>
                    {p.change_30d.tvl > 0 ? '+' : ''}{p.change_30d.tvl.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Radar Chart */}
      <div>
        <div style={{
          fontSize: '11px',
          color: TEXT,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
          fontFamily: MONO
        }}>
          Multi-Dimensional Comparison
        </div>
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px',
          padding: '16px'
        }}>
          <ProtocolRadarChart protocols={data.protocols} />
        </div>
      </div>

      {/* Scatter Plot */}
      <div>
        <div style={{
          fontSize: '11px',
          color: TEXT,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
          fontFamily: MONO
        }}>
          Valuation Quadrant Analysis
        </div>
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px',
          padding: '16px'
        }}>
          <ProtocolScatterPlot rankings={data.rankings} />
          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '12px',
            fontSize: '9px',
            fontFamily: MONO,
            justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '12px', height: '12px', background: GREEN, borderRadius: '2px' }} />
              <span style={{ color: MUTED }}>Undervalued</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '12px', height: '12px', background: BLUE, borderRadius: '2px' }} />
              <span style={{ color: MUTED }}>High Growth</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '12px', height: '12px', background: AMBER, borderRadius: '2px' }} />
              <span style={{ color: MUTED }}>Mature</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '12px', height: '12px', background: RED, borderRadius: '2px' }} />
              <span style={{ color: MUTED }}>Overvalued</span>
            </div>
          </div>
        </div>
      </div>

      {/* Divergence Alerts */}
      {data.divergences.length > 0 && (
        <div>
          <div style={{
            fontSize: '11px',
            color: TEXT,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
            fontFamily: MONO
          }}>
            Divergence Alerts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.divergences.map((div, i) => (
              <div
                key={i}
                style={{
                  padding: '12px',
                  border: `1px solid ${AMBER}`,
                  borderRadius: '2px',
                  background: 'rgba(232, 150, 12, 0.05)',
                  fontSize: '10px',
                  fontFamily: MONO
                }}
              >
                <div style={{ color: AMBER, fontWeight: 700, marginBottom: '4px' }}>
                  {div.divergence_pct.toFixed(1)}% Divergence Detected
                </div>
                <div style={{ color: MUTED }}>
                  {div.signal}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
