'use client';

import { useState } from 'react';
import Link from 'next/link';

type TabKey = 'mvrv' | 'realized' | 'liquidity';

interface TabConfig {
  id: TabKey;
  label: string;
  metricLabel: string;
  metricValue: string;
  subLabel: string;
  regime: string;
  rangeNote: string;
  insight: string;
}

const TABS: TabConfig[] = [
  {
    id: 'mvrv',
    label: 'MVRV Z-Score',
    metricLabel: 'Current Z-Score',
    metricValue: '2.14',
    subLabel: 'Historical Mean: 1.00',
    regime: 'Mid-Cycle Expansion',
    rangeNote: 'Bottom < 0.10 · Mania Top > 6.00',
    insight: 'Measures standard deviations between market value and aggregate cost basis. Identifies generational bottoms when score dips below zero.',
  },
  {
    id: 'realized',
    label: 'Realized Price',
    metricLabel: 'Network Cost Basis',
    metricValue: '$34,920',
    subLabel: 'BTC Spot: $69,500 · 1.99x Multiple',
    regime: 'Sovereign Floor Intact',
    rangeNote: 'Historical cycle support baseline',
    insight: 'The true aggregate cost basis of all circulating coins. Throughout Bitcoin history, realized price has acted as the ultimate cycle floor.',
  },
  {
    id: 'liquidity',
    label: 'US Net Liquidity',
    metricLabel: 'Federal Net Liquidity',
    metricValue: '$6.42T',
    subLabel: 'WALCL $7.01T - TGA $820B - RRP $210B',
    regime: 'Expanding Fiat Trend',
    rangeNote: '+ $142B 30-day net expansion',
    insight: 'Federal Reserve balance sheet minus Treasury General Account and Reverse Repo. Tracks global fiat liquidity backing macro risk assets.',
  },
];

const INK = '#FAF7F2';
const BODY = '#D8D2C7';
const MUTED = '#A8A196';
const HAIRLINE = 'rgba(250, 247, 242, 0.10)';

export default function TerminalCycleMonitor() {
  const [activeTabId, setActiveTabId] = useState<TabKey>('mvrv');
  const activeTab = TABS.find((t) => t.id === activeTabId) ?? TABS[0];

  return (
    <div
      className="w-full min-w-0"
      style={{
        background: '#13100E',
        border: `1px solid ${HAIRLINE}`,
        borderTop: '1px solid rgba(250, 247, 242, 0.22)',
        borderRadius: '4px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.55)',
        overflow: 'hidden',
      }}
    >
      {/* Top Header: Sovereign Cycle State */}
      <div
        className="flex items-center justify-between px-4 sm:px-5 py-3"
        style={{
          borderBottom: `1px solid ${HAIRLINE}`,
          background: 'rgba(250, 247, 242, 0.02)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: INK,
            textTransform: 'uppercase',
          }}
        >
          Bitcoin Cycle V Monitor
        </span>
        <span
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: '10.5px',
            letterSpacing: '0.04em',
            color: MUTED,
          }}
        >
          Epoch 5 · Day 560
        </span>
      </div>

      {/* Tab Switcher: The 3 Core On-Chain & Macro Signals */}
      <div
        className="grid grid-cols-3 gap-1 px-3 sm:px-4 py-2"
        style={{
          borderBottom: `1px solid ${HAIRLINE}`,
          background: 'rgba(18, 15, 13, 0.7)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className="px-2.5 py-1.5 rounded-[2px] transition-colors duration-150 text-center truncate"
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                letterSpacing: '0.02em',
                color: isActive ? INK : MUTED,
                background: isActive ? 'rgba(250, 247, 242, 0.12)' : 'transparent',
                border: isActive
                  ? '1px solid rgba(250, 247, 242, 0.22)'
                  : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Signal Telemetry Hero */}
      <div className="px-4 sm:px-5 pt-4 pb-3">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: MUTED, letterSpacing: '0.04em' }}>
              {activeTab.metricLabel}
            </div>
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 'clamp(1.75rem, 3.2vw, 2.4rem)',
                fontWeight: 600,
                color: INK,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
                marginTop: '4px',
              }}
            >
              {activeTab.metricValue}
            </div>
          </div>

          <div className="text-right">
            <span
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: '#FAF7F2',
                background: 'rgba(250, 247, 242, 0.08)',
                padding: '3px 7px',
                borderRadius: '2px',
                border: '1px solid rgba(250, 247, 242, 0.16)',
                display: 'inline-block',
              }}
            >
              {activeTab.regime}
            </span>
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: '10px',
                color: MUTED,
                marginTop: '4px',
              }}
            >
              {activeTab.subLabel}
            </div>
          </div>
        </div>

        {/* Dynamic Vector Cycle Trajectory Visualization */}
        <div className="mt-3.5 mb-2.5">
          {activeTabId === 'mvrv' && (
            <div>
              <div className="flex items-center justify-between text-[9px] text-[#A8A196] font-mono mb-1">
                <span>0.0 CAPITULATION FLOOR</span>
                <span>HISTORICAL MVRV Z-SCORE OSCILLATION</span>
                <span>6.0+ EUPHORIA TOP</span>
              </div>
              <svg viewBox="0 0 380 64" className="w-full h-auto block" aria-hidden="true">
                {/* Zone horizontal reference lines */}
                <line x1="0" y1="52" x2="380" y2="52" stroke="rgba(250,247,242,0.12)" strokeDasharray="2 3" />
                <line x1="0" y1="36" x2="380" y2="36" stroke="rgba(250,247,242,0.06)" />
                <line x1="0" y1="12" x2="380" y2="12" stroke="rgba(250,247,242,0.12)" strokeDasharray="2 3" />

                {/* 4 Historical Cycle MVRV Waves */}
                <path
                  d="M 10 52 Q 25 10 45 10 Q 65 52 85 54 Q 115 14 140 12 Q 170 50 195 53 Q 225 15 255 14 Q 285 52 315 50 Q 345 32 370 34"
                  fill="none"
                  stroke="#FAF7F2"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Current level indicator */}
                <circle cx="370" cy="34" r="3" fill="#FAF7F2" />
                <line x1="370" y1="34" x2="370" y2="52" stroke="rgba(250,247,242,0.4)" strokeDasharray="1 2" />
              </svg>
            </div>
          )}

          {activeTabId === 'realized' && (
            <div>
              <div className="flex items-center justify-between text-[9px] text-[#A8A196] font-mono mb-1">
                <span>LOG BITCOIN SPOT PRICE</span>
                <span>REALIZED PRICE SOVEREIGN FLOOR</span>
              </div>
              <svg viewBox="0 0 380 64" className="w-full h-auto block" aria-hidden="true">
                <line x1="0" y1="56" x2="380" y2="56" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />
                <line x1="0" y1="32" x2="380" y2="32" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />
                <line x1="0" y1="10" x2="380" y2="10" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />

                {/* Stepped Realized Price Floor (sovereign cost basis) */}
                <path
                  d="M 5 60 L 50 58 L 90 52 L 140 48 L 190 40 L 240 34 L 290 26 L 330 22 L 375 20"
                  fill="none"
                  stroke="rgba(255, 160, 40, 0.85)"
                  strokeWidth="1.4"
                  strokeDasharray="3 2"
                />

                {/* Spot Price Waves bounding above Realized Floor */}
                <path
                  d="M 5 62 Q 25 35 50 42 Q 75 60 100 48 Q 135 12 160 25 Q 185 50 215 36 Q 240 8 265 18 Q 295 40 325 24 Q 355 10 375 14"
                  fill="none"
                  stroke="#FAF7F2"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="375" cy="14" r="3" fill="#FAF7F2" />
              </svg>
            </div>
          )}

          {activeTabId === 'liquidity' && (
            <div>
              <div className="flex items-center justify-between text-[9px] text-[#A8A196] font-mono mb-1">
                <span>US NET LIQUIDITY ($T)</span>
                <span>GLOBAL MACRO LIQUIDITY INDEX</span>
              </div>
              <svg viewBox="0 0 380 64" className="w-full h-auto block" aria-hidden="true">
                <line x1="0" y1="50" x2="380" y2="50" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />
                <line x1="0" y1="28" x2="380" y2="28" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />

                {/* Net Liquidity Curve */}
                <path
                  d="M 5 48 Q 45 46 85 44 Q 130 14 175 12 Q 220 32 265 38 Q 310 26 350 20 L 375 18"
                  fill="none"
                  stroke="rgba(250, 247, 242, 0.45)"
                  strokeWidth="1.3"
                  strokeDasharray="2 2"
                />

                {/* Bitcoin Macro Response */}
                <path
                  d="M 5 52 Q 45 50 85 46 Q 130 10 175 16 Q 220 42 265 44 Q 310 22 350 16 L 375 12"
                  fill="none"
                  stroke="#FAF7F2"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="375" cy="12" r="3" fill="#FAF7F2" />
              </svg>
            </div>
          )}
        </div>

        <p
          style={{
            fontFamily: 'var(--ff-sans)',
            fontSize: '12px',
            lineHeight: 1.55,
            color: MUTED,
            margin: 0,
          }}
        >
          {activeTab.insight}
        </p>
      </div>

      {/* Sovereign Cycle Vitals: 3 Critical Institutional Metrics */}
      <div
        className="grid grid-cols-3 divide-x px-2 py-3"
        style={{
          borderTop: `1px solid ${HAIRLINE}`,
          borderBottom: `1px solid ${HAIRLINE}`,
          borderColor: 'rgba(250, 247, 242, 0.08)',
          background: 'rgba(250, 247, 242, 0.015)',
        }}
      >
        <div className="px-2 sm:px-3">
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', color: MUTED }}>
            LTH SUPPLY
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '13.5px', fontWeight: 600, color: INK, marginTop: '2px' }}>
            14.8M BTC
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', color: BODY, marginTop: '1px' }}>
            70.2% diamond hands
          </div>
        </div>

        <div className="px-2 sm:px-3">
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', color: MUTED }}>
            NUPL RATIO
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '13.5px', fontWeight: 600, color: INK, marginTop: '2px' }}>
            0.52
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', color: BODY, marginTop: '1px' }}>
            Belief regime
          </div>
        </div>

        <div className="px-2 sm:px-3">
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', color: MUTED }}>
            PUELL MULTIPLE
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '13.5px', fontWeight: 600, color: INK, marginTop: '2px' }}>
            1.08
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', color: BODY, marginTop: '1px' }}>
            Miner health balance
          </div>
        </div>
      </div>

      {/* Direct Interactive Callout into Sentiment Workspace */}
      <Link
        href="/sentiment"
        className="group flex items-center justify-between px-4 sm:px-5 py-3 transition-colors duration-150 text-decoration-none block"
        style={{
          background: 'rgba(250, 247, 242, 0.03)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(250, 247, 242, 0.07)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(250, 247, 242, 0.03)';
        }}
      >
        <span
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: '11px',
            fontWeight: 500,
            color: BODY,
            letterSpacing: '0.02em',
          }}
        >
          Open Sentiment Workspace · 94 Live Models
        </span>
        <span
          className="group-hover:translate-x-1 transition-transform duration-150"
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: '12px',
            color: INK,
            fontWeight: 600,
          }}
        >
          Launch →
        </span>
      </Link>
    </div>
  );
}
