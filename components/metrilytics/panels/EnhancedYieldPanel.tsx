'use client';

import { useCallback, useEffect, useState } from 'react';

const MONO = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const RED = '#C2344D';
const GREEN = '#22C55E';
const AMBER = '#E8960C';
const BLUE = '#38BDF8';
const TEXT = 'var(--text-primary)';
const MUTED = 'var(--text-secondary)';
const FAINT = 'var(--text-ghost)';

interface YieldPool {
  pool_id: string;
  protocol: string;
  chain: string;
  symbol: string;
  apy: number;
  apy_base: number | null;
  apy_reward: number | null;
  real_yield: number;
  tvl_usd: number;
  risk_score: number | null;
  risk_level: string;
  il_risk: string | null;
  yield_type: string;
  audited: boolean;
  pool_age_days: number | null;
  updated_at: string;
}

function formatUsd(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function RiskBadge({ score }: { score: number }) {
  const color = score < 30 ? GREEN : score < 60 ? AMBER : RED;
  const label = score < 30 ? 'LOW' : score < 60 ? 'MODERATE' : 'HIGH';

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 8px',
      border: `1px solid ${color}`,
      borderRadius: '2px',
      fontSize: '9px',
      fontFamily: MONO,
      color: color,
      textTransform: 'uppercase'
    }}>
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color
      }} />
      {score} {label}
    </div>
  );
}

function ILRiskBadge({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    low: GREEN,
    medium: AMBER,
    high: RED,
    extreme: RED,
    unknown: FAINT
  };

  return (
    <div style={{
      display: 'inline-block',
      padding: '3px 6px',
      fontSize: '8px',
      fontFamily: MONO,
      color: colors[risk] || FAINT,
      textTransform: 'uppercase',
      border: `1px solid ${colors[risk] || FAINT}`,
      borderRadius: '2px'
    }}>
      {risk}
    </div>
  );
}

function APYBreakdown({ apy, base, reward }: { apy: number; base: number | null; reward: number | null }) {
  if (!base && !reward) {
    return (
      <div style={{ fontSize: '14px', fontWeight: 700, color: GREEN }}>
        {apy.toFixed(1)}%
      </div>
    );
  }

  const baseVal = base ?? 0;
  const rewardVal = reward ?? 0;
  const total = baseVal + rewardVal;
  
  if (total === 0) {
    return (
      <div style={{ fontSize: '14px', fontWeight: 700, color: GREEN }}>
        {apy.toFixed(1)}%
      </div>
    );
  }

  const feePercent = (baseVal / total) * 100;
  const rewardPercent = (rewardVal / total) * 100;

  return (
    <div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: GREEN }}>
        {apy.toFixed(1)}%
      </div>
      <div style={{
        display: 'flex',
        height: '3px',
        borderRadius: '2px',
        overflow: 'hidden',
        marginTop: '4px',
        width: '60px'
      }}>
        <div style={{
          width: `${feePercent}%`,
          background: GREEN
        }} />
        <div style={{
          width: `${rewardPercent}%`,
          background: AMBER
        }} />
      </div>
      <div style={{ fontSize: '7px', color: FAINT, marginTop: '2px' }}>
        {feePercent.toFixed(0)}% fee / {rewardPercent.toFixed(0)}% reward
      </div>
    </div>
  );
}

export default function EnhancedYieldPanel() {
  const [pools, setPools] = useState<YieldPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [screener, setScreener] = useState<'all' | 'safe' | 'balanced' | 'degen' | 'real'>('all');
  const [sortBy, setSortBy] = useState<'tvl' | 'apy' | 'risk'>('tvl');

  const fetchYields = useCallback(async () => {
    try {
      const response = await fetch('/api/metrilytics/yields?limit=100');
      const json = (await response.json()) as { success?: boolean; yields?: YieldPool[] };

      if (json.success) {
        setPools(json.yields ?? []);
      }
      setLoading(false);
    } catch (error) {
      console.error('[EnhancedYieldPanel] fetch error:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchYields, 0);
    const interval = setInterval(fetchYields, 3600_000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchYields]);

  function filterPools(pools: YieldPool[]): YieldPool[] {
    let filtered = [...pools];

    switch (screener) {
      case 'safe':
        filtered = filtered.filter(p => 
          (p.risk_score ?? 50) < 30 && p.apy < 10
        );
        break;
      case 'balanced':
        filtered = filtered.filter(p => {
          const risk = p.risk_score ?? 50;
          return risk >= 30 && risk <= 60 && p.apy >= 10 && p.apy <= 30;
        });
        break;
      case 'degen':
        filtered = filtered.filter(p => 
          (p.risk_score ?? 50) > 60 || p.apy > 50
        );
        break;
      case 'real':
        filtered = filtered.filter(p => 
          p.yield_type === 'real' || (p.apy_reward ?? 0) === 0
        );
        break;
    }

    // Sort
    switch (sortBy) {
      case 'tvl':
        filtered.sort((a, b) => b.tvl_usd - a.tvl_usd);
        break;
      case 'apy':
        filtered.sort((a, b) => b.apy - a.apy);
        break;
      case 'risk':
        filtered.sort((a, b) => (a.risk_score ?? 50) - (b.risk_score ?? 50));
        break;
    }

    return filtered;
  }

  const filteredPools = filterPools(pools);

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: FAINT,
        fontSize: '11px',
        fontFamily: MONO
      }}>
        Loading yield pools...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Screener Presets */}
      <div>
        <div style={{
          fontSize: '11px',
          color: TEXT,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
          fontFamily: MONO
        }}>
          Yield Screener
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['all', 'safe', 'balanced', 'degen', 'real'] as const).map(preset => (
            <button
              key={preset}
              onClick={() => setScreener(preset)}
              style={{
                padding: '6px 12px',
                fontSize: '10px',
                fontFamily: MONO,
                background: screener === preset ? AMBER : 'transparent',
                color: screener === preset ? '#000' : MUTED,
                border: `1px solid ${screener === preset ? AMBER : 'var(--border-subtle)'}`,
                borderRadius: '2px',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {preset === 'all' ? 'All Pools' : 
               preset === 'safe' ? 'Safe Haven' :
               preset === 'balanced' ? 'Balanced' :
               preset === 'degen' ? 'Degen' : 'Real Yield'}
            </button>
          ))}
        </div>
      </div>

      {/* Sort Controls */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: FAINT, fontFamily: MONO, textTransform: 'uppercase' }}>
          Sort by:
        </span>
        {(['tvl', 'apy', 'risk'] as const).map(key => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            style={{
              padding: '4px 8px',
              fontSize: '9px',
              fontFamily: MONO,
              background: sortBy === key ? BLUE : 'transparent',
              color: sortBy === key ? '#000' : MUTED,
              border: `1px solid ${sortBy === key ? BLUE : 'var(--border-subtle)'}`,
              borderRadius: '2px',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            {key === 'tvl' ? 'TVL' : key === 'apy' ? 'APY' : 'Risk'}
          </button>
        ))}
        <span style={{ fontSize: '9px', color: FAINT, fontFamily: MONO, marginLeft: 'auto' }}>
          {filteredPools.length} pools
        </span>
      </div>

      {/* Pool Table */}
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
              <th style={{ padding: '8px', textAlign: 'left', color: FAINT, textTransform: 'uppercase', fontSize: '9px' }}>Pool</th>
              <th style={{ padding: '8px', textAlign: 'left', color: FAINT, textTransform: 'uppercase', fontSize: '9px' }}>Protocol</th>
              <th style={{ padding: '8px', textAlign: 'left', color: FAINT, textTransform: 'uppercase', fontSize: '9px' }}>Chain</th>
              <th style={{ padding: '8px', textAlign: 'left', color: FAINT, textTransform: 'uppercase', fontSize: '9px' }}>APY</th>
              <th style={{ padding: '8px', textAlign: 'right', color: FAINT, textTransform: 'uppercase', fontSize: '9px' }}>Real Yield</th>
              <th style={{ padding: '8px', textAlign: 'right', color: FAINT, textTransform: 'uppercase', fontSize: '9px' }}>TVL</th>
              <th style={{ padding: '8px', textAlign: 'center', color: FAINT, textTransform: 'uppercase', fontSize: '9px' }}>Risk Score</th>
              <th style={{ padding: '8px', textAlign: 'center', color: FAINT, textTransform: 'uppercase', fontSize: '9px' }}>IL Risk</th>
            </tr>
          </thead>
          <tbody>
            {filteredPools.slice(0, 50).map((pool) => (
              <tr key={pool.pool_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '8px', color: TEXT, fontWeight: 700 }}>
                  {pool.symbol}
                </td>
                <td style={{ padding: '8px', color: MUTED, fontSize: '9px' }}>
                  {pool.protocol}
                  {pool.audited && (
                    <span style={{ marginLeft: '4px', color: GREEN, fontSize: '8px' }}>✓</span>
                  )}
                </td>
                <td style={{ padding: '8px', color: FAINT, fontSize: '9px', textTransform: 'uppercase' }}>
                  {pool.chain}
                </td>
                <td style={{ padding: '8px' }}>
                  <APYBreakdown apy={pool.apy} base={pool.apy_base} reward={pool.apy_reward} />
                </td>
                <td style={{ padding: '8px', textAlign: 'right', color: GREEN, fontWeight: 700 }}>
                  {pool.real_yield.toFixed(1)}%
                </td>
                <td style={{ padding: '8px', textAlign: 'right', color: TEXT }}>
                  {formatUsd(pool.tvl_usd)}
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <RiskBadge score={pool.risk_score ?? 50} />
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <ILRiskBadge risk={pool.il_risk ?? 'unknown'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Risk Legend */}
      <div style={{
        padding: '12px',
        border: '1px solid var(--border-subtle)',
        borderRadius: '2px',
        background: 'rgba(0, 0, 0, 0.2)',
        fontSize: '9px',
        fontFamily: MONO
      }}>
        <div style={{ color: TEXT, fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
          Risk Score Guide
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: MUTED }}>
          <div>
            <span style={{ color: GREEN }}>● 0-30 LOW:</span> Stable pairs, audited protocols, sustainable APY
          </div>
          <div>
            <span style={{ color: AMBER }}>● 30-60 MODERATE:</span> Blue-chip pairs, moderate APY, established protocols
          </div>
          <div>
            <span style={{ color: RED }}>● 60-100 HIGH:</span> Volatile pairs, unaudited protocols, unsustainable APY
          </div>
        </div>
      </div>
    </div>
  );
}
