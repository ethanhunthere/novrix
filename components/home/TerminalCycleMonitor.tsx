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
    statusBadge: 'Score 2.14 · Normal',
    contextNote: 'Bargain: < 0.10 · Bubble: > 6.00',
    simpleExplanation:
      'Compares Bitcoin market price to what every investor actually paid for their coins. Below zero means a historic discount. Above 6 means dangerously overheated.',
  },
  {
    id: 'cost',
    tabLabel: 'Average Buy Price',
    question: 'Network Average Purchase Cost',
    metricValue: '$34,920',
    statusBadge: 'Spot $69.5K · 2x In Profit',
    contextNote: 'Historic safety floor across every past crash',
    simpleExplanation:
      'The exact average price at which all circulating Bitcoin was bought. In every past market crash, Bitcoin price bounced off this exact cost floor.',
  },
  {
    id: 'liquidity',
    tabLabel: 'Market Cash Flow',
    question: 'US Financial System Liquidity',
    metricValue: '$6.42T',
    statusBadge: 'Expanding Trend',
    contextNote: '+ $142B added over past 30 days',
    simpleExplanation:
      'Total cash flowing into markets from the US Federal Reserve. When central banks pump cash into the system, Bitcoin prices tend to grow with it.',
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
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.50)',
        overflow: 'hidden',
      }}
    >
      {/* Top Header: Friendly, plain-English sovereign state */}
      <div
        className="flex items-center justify-between px-3 sm:px-4 py-2"
        style={{
          borderBottom: `1px solid ${HAIRLINE}`,
          background: 'rgba(250, 247, 242, 0.02)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: '10.5px',
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
            fontSize: '10px',
            letterSpacing: '0.04em',
            color: MUTED,
          }}
        >
          Daily On-Chain Sync
        </span>
      </div>

      {/* Tab Switcher: Plain-English Questions */}
      <div
        className="grid grid-cols-3 gap-1 px-2.5 sm:px-3 py-1.5"
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
              className="px-2 py-1 rounded-[2px] transition-colors duration-150 text-center truncate"
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: '10px',
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
      <div className="px-3 sm:px-4 pt-2.5 pb-2">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9.5px', color: MUTED }}>
              {activeTab.question}
            </div>
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 'clamp(1.35rem, 2vw, 1.8rem)',
                fontWeight: 600,
                color: INK,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
                marginTop: '2px',
              }}
            >
              {activeTab.metricValue}
            </div>
          </div>

          <div className="text-right sm:text-right">
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                color: INK,
              }}
            >
              {activeTab.statusBadge}
            </div>
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: '9px',
                color: MUTED,
                marginTop: '2px',
              }}
            >
              {activeTab.contextNote}
            </div>
          </div>
        </div>

        {/* Intuitive compact visual trajectory curve */}
        <div className="my-1.5">
          {activeTabId === 'valuation' && (
            <div>
              <div className="flex items-center justify-between text-[8px] text-[#A8A196] font-mono mb-0.5">
                <span>BARGAIN BOTTOM (&lt; 0)</span>
                <span>FAIR VALUE (2.14)</span>
                <span>BUBBLE TOP (&gt; 6)</span>
              </div>
              <svg viewBox="0 0 380 40" className="w-full h-auto block" style={{ maxHeight: '38px' }} aria-hidden="true">
                <line x1="0" y1="34" x2="380" y2="34" stroke="rgba(250,247,242,0.12)" strokeDasharray="2 3" />
                <line x1="0" y1="22" x2="380" y2="22" stroke="rgba(250,247,242,0.06)" />
                <line x1="0" y1="8" x2="380" y2="8" stroke="rgba(250,247,242,0.12)" strokeDasharray="2 3" />

                <path
                  d="M 10 34 Q 25 8 45 8 Q 65 34 85 36 Q 115 10 140 8 Q 170 32 195 34 Q 225 10 255 8 Q 285 34 315 32 Q 345 20 370 22"
                  fill="none"
                  stroke="#FAF7F2"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="370" cy="22" r="2.5" fill="#FAF7F2" />
                <line x1="370" y1="22" x2="370" y2="34" stroke="rgba(250,247,242,0.4)" strokeDasharray="1 2" />
              </svg>
            </div>
          )}

          {activeTabId === 'cost' && (
            <div>
              <div className="flex items-center justify-between text-[8px] text-[#A8A196] font-mono mb-0.5">
                <span>BITCOIN MARKET SPOT ($69.5K)</span>
                <span>AVERAGE BUY PRICE FLOOR ($34.9K)</span>
              </div>
              <svg viewBox="0 0 380 40" className="w-full h-auto block" style={{ maxHeight: '38px' }} aria-hidden="true">
                <line x1="0" y1="36" x2="380" y2="36" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />
                <line x1="0" y1="20" x2="380" y2="20" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />

                <path
                  d="M 5 38 L 50 36 L 90 32 L 140 28 L 190 24 L 240 20 L 290 16 L 330 14 L 375 12"
                  fill="none"
                  stroke="rgba(255, 160, 40, 0.85)"
                  strokeWidth="1.3"
                  strokeDasharray="3 2"
                />

                <path
                  d="M 5 39 Q 25 20 50 24 Q 75 37 100 28 Q 135 8 160 14 Q 185 31 215 22 Q 240 4 265 10 Q 295 24 325 14 Q 355 6 375 8"
                  fill="none"
                  stroke="#FAF7F2"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="375" cy="8" r="2.5" fill="#FAF7F2" />
              </svg>
            </div>
          )}

          {activeTabId === 'liquidity' && (
            <div>
              <div className="flex items-center justify-between text-[8px] text-[#A8A196] font-mono mb-0.5">
                <span>US CENTRAL BANK LIQUIDITY ($6.42T)</span>
                <span>BITCOIN MARKET CYCLE EXPANSION</span>
              </div>
              <svg viewBox="0 0 380 40" className="w-full h-auto block" style={{ maxHeight: '38px' }} aria-hidden="true">
                <line x1="0" y1="32" x2="380" y2="32" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />
                <line x1="0" y1="16" x2="380" y2="16" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />

                <path
                  d="M 5 34 Q 45 32 85 30 Q 130 10 175 8 Q 220 22 265 24 Q 310 16 350 12 L 375 10"
                  fill="none"
                  stroke="rgba(250, 247, 242, 0.45)"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />

                <path
                  d="M 5 36 Q 45 34 85 30 Q 130 6 175 10 Q 220 26 265 28 Q 310 14 350 8 L 375 6"
                  fill="none"
                  stroke="#FAF7F2"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="375" cy="6" r="2.5" fill="#FAF7F2" />
              </svg>
            </div>
          )}
        </div>

        {/* Plain-English summary anyone can understand */}
        <p
          style={{
            fontFamily: 'var(--ff-sans)',
            fontSize: '11px',
            lineHeight: 1.45,
            color: MUTED,
            margin: 0,
          }}
        >
          {activeTab.simpleExplanation}
        </p>
      </div>

      {/* 3 Plain-English Vitals (Easy for newbies, essential for veterans) */}
      <div
        className="grid grid-cols-3 divide-x px-2 py-1.5"
        style={{
          borderTop: `1px solid ${HAIRLINE}`,
          borderBottom: `1px solid ${HAIRLINE}`,
          borderColor: 'rgba(250, 247, 242, 0.08)',
          background: 'rgba(250, 247, 242, 0.015)',
        }}
      >
        <div className="px-1.5 sm:px-2.5">
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '8.5px', color: MUTED }}>
            STRONG HANDS
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', fontWeight: 600, color: INK, marginTop: '1px' }}>
            70.2%
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '8.5px', color: BODY }}>
            Long-term holders
          </div>
        </div>

        <div className="px-1.5 sm:px-2.5">
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '8.5px', color: MUTED }}>
            MARKET MOOD
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', fontWeight: 600, color: INK, marginTop: '1px' }}>
            Belief
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '8.5px', color: BODY }}>
            Profitable investors
          </div>
        </div>

        <div className="px-1.5 sm:px-2.5">
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '8.5px', color: MUTED }}>
            CYCLE CLOCK
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', fontWeight: 600, color: INK, marginTop: '1px' }}>
            Year 2 of 4
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '8.5px', color: BODY }}>
            Post-halving phase
          </div>
        </div>
      </div>

      {/* Direct Interactive Callout */}
      <Link
        href="/sentiment"
        className="group flex items-center justify-between px-3 sm:px-4 py-2 transition-colors duration-150 text-decoration-none block"
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
            fontSize: '10.5px',
            fontWeight: 500,
            color: BODY,
            letterSpacing: '0.02em',
          }}
        >
          Live Sentiment Radar
        </span>
        <span
          className="group-hover:translate-x-1 transition-transform duration-150"
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: '11px',
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
