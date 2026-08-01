'use client';

import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

const MONO = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const RED = '#C2344D';
const GREEN = '#22C55E';
const AMBER = '#E8960C';
const TEXT = 'var(--text-primary)';
const MUTED = 'var(--text-secondary)';
const FAINT = 'var(--text-ghost)';

interface LiquidationsData {
  summary: {
    total_long_usd: number;
    total_short_usd: number;
    total_usd: number;
    long_count: number;
    short_count: number;
    largest_single: number;
    most_liquidated_symbol: string;
    most_toxic_exchange: string;
    cascade_score: number;
  };
  hourly: Array<{
    hour: string;
    long_usd: number;
    short_usd: number;
    total_usd: number;
    count: number;
    avg_size: number;
    max_size: number;
  }>;
  heatmap: {
    price_levels: number[];
    hours: string[];
    values: number[][];
  };
  recent: Array<{
    symbol: string;
    side: string;
    size_usd: number;
    price: number;
    exchange: string;
    timestamp: string;
    leverage: number | null;
    time_ago: string;
  }>;
  by_exchange: Array<{
    exchange: string;
    total_usd: number;
    count: number;
    avg_size: number;
    long_pct: number;
    short_pct: number;
  }>;
  by_symbol: Array<{
    symbol: string;
    total_usd: number;
    count: number;
    long_usd: number;
    short_usd: number;
    long_pct: number;
  }>;
  cascade: {
    score: number;
    level: 'low' | 'moderate' | 'high' | 'extreme';
    factors: {
      volume_1h: number;
      volume_ratio: number;
      price_velocity: number;
      oi_change_1h: number;
      funding_extreme: boolean;
    };
    alert: string;
  };
}

function formatUsd(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function LiquidationHeatmap({ data }: { data: LiquidationsData['heatmap'] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || !data.price_levels.length || !data.hours.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { price_levels, hours, values } = data;
    const cellWidth = canvas.width / hours.length;
    const cellHeight = canvas.height / price_levels.length;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Find max value for color scaling
    const maxValue = Math.max(...values.flat(), 1);

    // Draw heatmap cells
    values.forEach((row, hourIndex) => {
      row.forEach((value, priceIndex) => {
        if (value === 0) return;

        const intensity = Math.min(1, value / maxValue);
        const alpha = intensity * 0.9;
        ctx.fillStyle = `rgba(194, 52, 77, ${alpha})`;

        ctx.fillRect(
          hourIndex * cellWidth,
          (price_levels.length - 1 - priceIndex) * cellHeight, // Flip Y axis (higher price at top)
          cellWidth,
          cellHeight
        );
      });
    });

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= hours.length; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= price_levels.length; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(canvas.width, i * cellHeight);
      ctx.stroke();
    }
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={300}
      style={{
        width: '100%',
        height: '300px',
        border: '1px solid var(--border-subtle)',
        borderRadius: '2px'
      }}
    />
  );
}

function CascadeAlert({ score, level, alert }: { score: number; level: string; alert: string }) {
  const colors: Record<string, string> = {
    moderate: AMBER,
    high: '#FF6B35',
    extreme: RED
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '12px 16px',
        border: `1px solid ${colors[level] || AMBER}`,
        borderRadius: '4px',
        background: 'rgba(0, 0, 0, 0.4)',
        marginBottom: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}
    >
      <div style={{ fontSize: '24px' }}>⚠️</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 700,
          color: colors[level] || AMBER,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '4px'
        }}>
          {level.toUpperCase()} CASCADE RISK DETECTED
        </div>
        <div style={{
          fontSize: '11px',
          color: MUTED,
          fontFamily: MONO
        }}>
          Risk Score: {score}/100 — {alert}
        </div>
      </div>
    </motion.div>
  );
}

export default function LiquidationsPanel() {
  const [data, setData] = useState<LiquidationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState<24 | 48 | 168>(24);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');
  const [minSize, setMinSize] = useState<number>(0);

  const fetchLiquidations = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        hours: window.toString(),
        ...(selectedSymbol !== 'all' && { symbol: selectedSymbol }),
        ...(minSize > 0 && { min_size: minSize.toString() })
      });

      const response = await fetch(`/api/metrilytics/liquidations?${params}`);
      const json = (await response.json()) as { success?: boolean; data?: LiquidationsData };
      
      if (json.success) {
        setData(json.data ?? null);
      }
      setLoading(false);
    } catch (error) {
      console.error('[LiquidationsPanel] fetch error:', error);
      setLoading(false);
    }
  }, [window, selectedSymbol, minSize]);

  useEffect(() => {
    const timeout = setTimeout(fetchLiquidations, 0);
    const interval = setInterval(fetchLiquidations, 60_000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchLiquidations]);

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: FAINT,
        fontSize: '11px',
        fontFamily: MONO
      }}>
        Loading liquidations data...
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
        Liquidation data unavailable. Waiting for cron worker...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[24, 48, 168].map(h => (
            <button
              key={h}
              onClick={() => setWindow(h as 24 | 48 | 168)}
              style={{
                padding: '4px 12px',
                fontSize: '10px',
                fontFamily: MONO,
                background: window === h ? AMBER : 'transparent',
                color: window === h ? '#000' : MUTED,
                border: `1px solid ${window === h ? AMBER : 'var(--border-subtle)'}`,
                borderRadius: '2px',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {h}H
            </button>
          ))}
        </div>

        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          style={{
            padding: '4px 8px',
            fontSize: '10px',
            fontFamily: MONO,
            background: 'var(--bg-elevated)',
            color: TEXT,
            border: '1px solid var(--border-subtle)',
            borderRadius: '2px',
            textTransform: 'uppercase'
          }}
        >
          <option value="all">ALL SYMBOLS</option>
          <option value="BTC">BTC</option>
          <option value="ETH">ETH</option>
          <option value="SOL">SOL</option>
        </select>

        <input
          type="number"
          placeholder="MIN SIZE USD"
          value={minSize || ''}
          onChange={(e) => setMinSize(parseFloat(e.target.value) || 0)}
          style={{
            padding: '4px 8px',
            fontSize: '10px',
            fontFamily: MONO,
            background: 'var(--bg-elevated)',
            color: TEXT,
            border: '1px solid var(--border-subtle)',
            borderRadius: '2px',
            width: '120px'
          }}
        />
      </div>

      {/* Cascade Alert */}
      {data.cascade.score >= 50 && (
        <CascadeAlert score={data.cascade.score} level={data.cascade.level} alert={data.cascade.alert} />
      )}

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div style={{
          padding: '12px',
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ fontSize: '9px', color: FAINT, textTransform: 'uppercase', marginBottom: '4px', fontFamily: MONO }}>
            Long Liquidations
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: RED, fontFamily: MONO }}>
            {formatUsd(data.summary.total_long_usd)}
          </div>
          <div style={{ fontSize: '9px', color: MUTED, fontFamily: MONO }}>
            {data.summary.long_count} events
          </div>
        </div>

        <div style={{
          padding: '12px',
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ fontSize: '9px', color: FAINT, textTransform: 'uppercase', marginBottom: '4px', fontFamily: MONO }}>
            Short Liquidations
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: GREEN, fontFamily: MONO }}>
            {formatUsd(data.summary.total_short_usd)}
          </div>
          <div style={{ fontSize: '9px', color: MUTED, fontFamily: MONO }}>
            {data.summary.short_count} events
          </div>
        </div>

        <div style={{
          padding: '12px',
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ fontSize: '9px', color: FAINT, textTransform: 'uppercase', marginBottom: '4px', fontFamily: MONO }}>
            Largest Single
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: AMBER, fontFamily: MONO }}>
            {formatUsd(data.summary.largest_single)}
          </div>
          <div style={{ fontSize: '9px', color: MUTED, fontFamily: MONO }}>
            {data.summary.most_liquidated_symbol}
          </div>
        </div>

        <div style={{
          padding: '12px',
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ fontSize: '9px', color: FAINT, textTransform: 'uppercase', marginBottom: '4px', fontFamily: MONO }}>
            Cascade Risk
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: data.cascade.score >= 50 ? RED : data.cascade.score >= 30 ? AMBER : GREEN,
            fontFamily: MONO
          }}>
            {data.cascade.score}/100
          </div>
          <div style={{ fontSize: '9px', color: MUTED, fontFamily: MONO, textTransform: 'uppercase' }}>
            {data.cascade.level}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div>
        <div style={{
          fontSize: '11px',
          color: TEXT,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
          fontFamily: MONO
        }}>
          Price-Time Liquidation Heatmap
        </div>
        <LiquidationHeatmap data={data.heatmap} />
        <div style={{
          fontSize: '9px',
          color: FAINT,
          marginTop: '4px',
          fontFamily: MONO
        }}>
          Darker = More liquidations at this price/time
        </div>
      </div>

      {/* Recent Liquidations Feed */}
      <div>
        <div style={{
          fontSize: '11px',
          color: TEXT,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
          fontFamily: MONO
        }}>
          Recent Liquidations
        </div>
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px'
        }}>
          {data.recent.map((liq, i) => (
            <motion.div
              key={`${liq.timestamp}-${i}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'grid',
                gridTemplateColumns: '60px 60px 80px 100px 80px 1fr',
                gap: '12px',
                fontSize: '10px',
                fontFamily: MONO,
                alignItems: 'center'
              }}
            >
              <div style={{ color: MUTED }}>{liq.time_ago}</div>
              <div style={{ color: TEXT, fontWeight: 700 }}>{liq.symbol}</div>
              <div style={{ color: liq.side === 'long' ? RED : GREEN, textTransform: 'uppercase' }}>
                {liq.side}
              </div>
              <div style={{ color: TEXT }}>{formatUsd(liq.size_usd)}</div>
              <div style={{ color: MUTED }}>${liq.price.toFixed(2)}</div>
              <div style={{ color: FAINT, textTransform: 'uppercase' }}>{liq.exchange}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Exchange Breakdown */}
      <div>
        <div style={{
          fontSize: '11px',
          color: TEXT,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
          fontFamily: MONO
        }}>
          Exchange Breakdown
        </div>
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px'
        }}>
          {data.by_exchange.map((ex, i) => (
            <div
              key={ex.exchange}
              style={{
                padding: '8px 12px',
                borderBottom: i < data.by_exchange.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                display: 'grid',
                gridTemplateColumns: '120px 100px 80px 1fr',
                gap: '12px',
                fontSize: '10px',
                fontFamily: MONO,
                alignItems: 'center'
              }}
            >
              <div style={{ color: TEXT, fontWeight: 700, textTransform: 'uppercase' }}>{ex.exchange}</div>
              <div style={{ color: TEXT }}>{formatUsd(ex.total_usd)}</div>
              <div style={{ color: MUTED }}>{ex.count} events</div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <div style={{
                  height: '4px',
                  background: RED,
                  width: `${ex.long_pct}%`,
                  borderRadius: '2px'
                }} />
                <div style={{
                  height: '4px',
                  background: GREEN,
                  width: `${ex.short_pct}%`,
                  borderRadius: '2px'
                }} />
                <span style={{ fontSize: '9px', color: FAINT, marginLeft: '8px' }}>
                  {ex.long_pct.toFixed(0)}% L / {ex.short_pct.toFixed(0)}% S
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
