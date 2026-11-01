'use client';

import { useState } from 'react';
import Link from 'next/link';

type TabKey = 'valuation' | 'cost' | 'liquidity';

interface TabConfig {
  id: TabKey;
  tabLabel: string;
  question: string;
  metricValue: string;
  statusBadge: string;
  contextNote: string;
  simpleExplanation: string;
}

const TABS: TabConfig[] = [
  {
    id: 'valuation',
    tabLabel: 'Is Bitcoin Cheap?',
    question: 'Market Valuation Score (MVRV)',
    metricValue: 'Fair Value',
    statusBadge: 'Score 2.14 · Normal Zone',
    contextNote: 'Historical Bargain: < 0.10 · Bubble Top: > 6.00',
    simpleExplanation:
      'Compares Bitcoin current market price to what every investor actually paid for their coins. Below zero means historic discount. Above 6 means the market is dangerously overheated.',
  },
  {
    id: 'cost',
    tabLabel: 'Average Buy Price',
    question: 'Network Average Purchase Cost',
    metricValue: '$34,920',
    statusBadge: 'Spot Price $69,500 · 2x In Profit',
    contextNote: 'Historic safety floor across every past crash',
    simpleExplanation:
      'The exact average price at which all circulating Bitcoin was purchased. In every past market crash, Bitcoin price bounced off this exact cost floor without staying below it.',
  },
  {
    id: 'liquidity',
    tabLabel: 'Market Cash Flow',
    question: 'US Financial System Liquidity',
    metricValue: '$6.42T',
    statusBadge: 'Money Supply Expanding',
    contextNote: '+ $142 Billion added over past 30 days',
    simpleExplanation:
      'Total cash flowing into markets from the US Federal Reserve. When central banks pump cash into the system, Bitcoin prices tend to expand. When cash dries up, markets cool off.',
  },
];

const INK = '#FAF7F2';
const BODY = '#D8D2C7';
const MUTED = '#A8A196';
const HAIRLINE = 'rgba(250, 247, 242, 0.10)';

export default function TerminalCycleMonitor() {
  const [activeTabId, setActiveTabId] = useState<TabKey>('valuation');
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
      {/* Top Header: Friendly, plain-English sovereign state */}
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
          Bitcoin Live Cycle Radar
        </span>
        <span
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: '10.5px',
            letterSpacing: '0.04em',
            color: MUTED,
          }}
        >
          Daily On-Chain Sync
        </span>
      </div>

      {/* Tab Switcher: Plain-English Questions */}
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
                letterSpacing: '0.01em',
                color: isActive ? INK : MUTED,
                background: isActive ? 'rgba(250, 247, 242, 0.12)' : 'transparent',
                border: isActive
                  ? '1px solid rgba(250, 247, 242, 0.22)'
                  : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab.tabLabel}
            </button>
          );
        })}
      </div>

      {/* Active Signal Hero with Clear Explanations */}
      <div className="px-4 sm:px-5 pt-4 pb-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10.5px', color: MUTED }}>
              {activeTab.question}
            </div>
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 'clamp(1.65rem, 3vw, 2.3rem)',
                fontWeight: 600,
                color: INK,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.15,
                marginTop: '4px',
              }}
            >
              {activeTab.metricValue}
            </div>
          </div>

          <div className="text-right sm:text-right">
            <span
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: '#FAF7F2',
                background: 'rgba(250, 247, 242, 0.08)',
                padding: '3px 8px',
                borderRadius: '2px',
                border: '1px solid rgba(250, 247, 242, 0.16)',
                display: 'inline-block',
              }}
            >
              {activeTab.statusBadge}
            </span>
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: '10px',
                color: MUTED,
                marginTop: '4px',
              }}
            >
              {activeTab.contextNote}
            </div>
          </div>
        </div>

        {/* Intuitive visual gauge / trajectory curve */}
        <div className="mt-3.5 mb-2.5">
          {activeTabId === 'valuation' && (
            <div>
              <div className="flex items-center justify-between text-[9px] text-[#A8A196] font-mono mb-1">
                <span>BARGAIN BOTTOM (SCORE &lt; 0)</span>
                <span>FAIR VALUE (SCORE 2.14)</span>
                <span>BUBBLE TOP (SCORE &gt; 6)</span>
              </div>
              <svg viewBox="0 0 380 56" className="w-full h-auto block" aria-hidden="true">
                {/* Zone horizontal reference lines */}
                <line x1="0" y1="46" x2="380" y2="46" stroke="rgba(250,247,242,0.12)" strokeDasharray="2 3" />
                <line x1="0" y1="30" x2="380" y2="30" stroke="rgba(250,247,242,0.06)" />
                <line x1="0" y1="10" x2="380" y2="10" stroke="rgba(250,247,242,0.12)" strokeDasharray="2 3" />

                {/* 4 Historical Cycle Waves */}
                <path
                  d="M 10 46 Q 25 10 45 10 Q 65 46 85 48 Q 115 12 140 10 Q 170 44 195 47 Q 225 12 255 10 Q 285 46 315 44 Q 345 28 370 30"
                  fill="none"
                  stroke="#FAF7F2"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="370" cy="30" r="3" fill="#FAF7F2" />
                <line x1="370" y1="30" x2="370" y2="46" stroke="rgba(250,247,242,0.4)" strokeDasharray="1 2" />
              </svg>
            </div>
          )}

          {activeTabId === 'cost' && (
            <div>
              <div className="flex items-center justify-between text-[9px] text-[#A8A196] font-mono mb-1">
                <span>BITCOIN MARKET PRICE ($69.5K)</span>
                <span>AVERAGE BUY PRICE FLOOR ($34.9K)</span>
              </div>
              <svg viewBox="0 0 380 56" className="w-full h-auto block" aria-hidden="true">
                <line x1="0" y1="48" x2="380" y2="48" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />
                <line x1="0" y1="26" x2="380" y2="26" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />

                {/* Stepped Realized Average Buy Price (Support floor) */}
                <path
                  d="M 5 52 L 50 50 L 90 44 L 140 40 L 190 34 L 240 28 L 290 22 L 330 18 L 375 16"
                  fill="none"
                  stroke="rgba(255, 160, 40, 0.85)"
                  strokeWidth="1.4"
                  strokeDasharray="3 2"
                />

                {/* Bitcoin Market Spot Price */}
                <path
                  d="M 5 54 Q 25 28 50 34 Q 75 52 100 40 Q 135 10 160 20 Q 185 44 215 30 Q 240 6 265 14 Q 295 34 325 20 Q 355 8 375 10"
                  fill="none"
                  stroke="#FAF7F2"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="375" cy="10" r="3" fill="#FAF7F2" />
              </svg>
            </div>
          )}

          {activeTabId === 'liquidity' && (
            <div>
              <div className="flex items-center justify-between text-[9px] text-[#A8A196] font-mono mb-1">
                <span>US CENTRAL BANK LIQUIDITY ($6.42T)</span>
                <span>BITCOIN MARKET CYCLE EXPANSION</span>
              </div>
              <svg viewBox="0 0 380 56" className="w-full h-auto block" aria-hidden="true">
                <line x1="0" y1="42" x2="380" y2="42" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />
                <line x1="0" y1="22" x2="380" y2="22" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />

                {/* Net Liquidity Curve */}
                <path
                  d="M 5 44 Q 45 42 85 40 Q 130 14 175 12 Q 220 28 265 32 Q 310 22 350 16 L 375 14"
                  fill="none"
                  stroke="rgba(250, 247, 242, 0.45)"
                  strokeWidth="1.3"
                  strokeDasharray="2 2"
                />

                {/* Bitcoin Price Waves following Liquidity */}
                <path
                  d="M 5 46 Q 45 44 85 40 Q 130 8 175 14 Q 220 36 265 38 Q 310 18 350 12 L 375 8"
                  fill="none"
                  stroke="#FAF7F2"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="375" cy="8" r="3" fill="#FAF7F2" />
              </svg>
            </div>
          )}
        </div>

        {/* Plain-English summary anyone can understand */}
        <p
          style={{
            fontFamily: 'var(--ff-sans)',
            fontSize: '12px',
            lineHeight: 1.55,
            color: MUTED,
            margin: 0,
          }}
        >
          {activeTab.simpleExplanation}
        </p>
      </div>

      {/* 3 Plain-English Vitals (Easy for newbies, essential for veterans) */}
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
            STRONG HANDS
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '13.5px', fontWeight: 600, color: INK, marginTop: '2px' }}>
            70.2%
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', color: BODY, marginTop: '1px' }}>
            Held by long-term investors
          </div>
        </div>

        <div className="px-2 sm:px-3">
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', color: MUTED }}>
            MARKET MOOD
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '13.5px', fontWeight: 600, color: INK, marginTop: '2px' }}>
            Belief
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', color: BODY, marginTop: '1px' }}>
            Investors are profitable
          </div>
        </div>

        <div className="px-2 sm:px-3">
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', color: MUTED }}>
            CYCLE CLOCK
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '13.5px', fontWeight: 600, color: INK, marginTop: '2px' }}>
            Year 2 of 4
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', color: BODY, marginTop: '1px' }}>
            Post-halving accumulation
          </div>
        </div>
      </div>

      {/* Direct Interactive Callout */}
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
          Open Sentiment Workspace · Explore All 94 Charts
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
