'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Instrument {
  code: string;
  name: string;
  category: 'VALUATION' | 'FED' | 'SUPPLY' | 'FLOWS';
  summary: string;
}

const INSTRUMENTS: Instrument[] = [
  {
    code: 'MVRV',
    name: 'MVRV Z-Score',
    category: 'VALUATION',
    summary: 'Standard deviations from realized value to pinpoint cycle tops and bottoms',
  },
  {
    code: 'WALCL',
    name: 'Fed Balance Sheet Assets',
    category: 'FED',
    summary: 'Federal Reserve total assets measuring broad central bank liquidity injection',
  },
  {
    code: 'NUPL',
    name: 'Net Unrealized Profit / Loss',
    category: 'VALUATION',
    summary: 'Aggregate investor profitability tracking capitulation, belief, and euphoria',
  },
  {
    code: 'T10Y2Y',
    name: '10Y - 2Y Treasury Yield Spread',
    category: 'FED',
    summary: 'Bond market yield curve inversion and steepening cycle recession gauge',
  },
  {
    code: 'HRIBBON',
    name: 'Hash Ribbons',
    category: 'SUPPLY',
    summary: '30-day vs 60-day miner hashrate moving averages signaling capitulation buy zones',
  },
  {
    code: 'RRP',
    name: 'Overnight Reverse Repo',
    category: 'FED',
    summary: 'Cash parked at the Fed draining liquidity from risk assets',
  },
  {
    code: 'RPRICE',
    name: 'Realized Price',
    category: 'VALUATION',
    summary: 'The aggregate on-chain cost basis of all circulating coins',
  },
  {
    code: 'LTHPC',
    name: 'Long-Term Holder Position Change',
    category: 'SUPPLY',
    summary: 'Net 30-day accumulation or distribution by veteran investors',
  },
  {
    code: 'FNG',
    name: 'Fear & Greed Index',
    category: 'FLOWS',
    summary: 'Daily composite market emotion score ranging from 0 to 100',
  },
  {
    code: 'ETF',
    name: 'US Spot Bitcoin ETF AUM',
    category: 'FLOWS',
    summary: 'Institutional capital flows and cumulative spot ETF balance sheets',
  },
];

const TABS: { id: 'ALL' | 'VALUATION' | 'FED' | 'SUPPLY' | 'FLOWS'; label: string; count: number }[] = [
  { id: 'ALL', label: 'All', count: 94 },
  { id: 'VALUATION', label: 'Valuation', count: 28 },
  { id: 'FED', label: 'Fed & Macro', count: 34 },
  { id: 'SUPPLY', label: 'Supply & Miners', count: 22 },
  { id: 'FLOWS', label: 'Market Flows', count: 10 },
];

const INK = '#FAF7F2';
const BODY = '#D8D2C7';
const MUTED = '#A8A196';
const HAIRLINE = 'rgba(250, 247, 242, 0.10)';

export default function TerminalWorkspaceIndex() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'VALUATION' | 'FED' | 'SUPPLY' | 'FLOWS'>('ALL');

  const visibleInstruments =
    activeTab === 'ALL'
      ? INSTRUMENTS.slice(0, 5)
      : INSTRUMENTS.filter((item) => item.category === activeTab).slice(0, 5);

  return (
    <div
      className="w-full min-w-0"
      style={{
        background: '#14110E',
        border: `1px solid ${HAIRLINE}`,
        borderTop: '1px solid rgba(250, 247, 242, 0.22)',
        borderRadius: '4px',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.55)',
        overflow: 'hidden',
      }}
    >
      {/* Terminal Title Bar */}
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
          Workspace Directory
        </span>
        <span
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: '10.5px',
            letterSpacing: '0.04em',
            color: MUTED,
          }}
        >
          94 live panels
        </span>
      </div>

      {/* Filter Tabs */}
      <div
        className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 overflow-x-auto no-scrollbar"
        style={{
          borderBottom: `1px solid ${HAIRLINE}`,
          background: 'rgba(18, 15, 13, 0.6)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] transition-colors duration-150 shrink-0"
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: '10px',
                fontWeight: isActive ? 600 : 500,
                letterSpacing: '0.04em',
                color: isActive ? INK : MUTED,
                background: isActive ? 'rgba(250, 247, 242, 0.12)' : 'transparent',
                border: isActive
                  ? '1px solid rgba(250, 247, 242, 0.24)'
                  : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '9px',
                  color: isActive ? '#FFFFFF' : 'rgba(168, 161, 150, 0.7)',
                }}
              >
                ({tab.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Curated Instrument Rows */}
      <div className="divide-y" style={{ borderColor: 'rgba(250, 247, 242, 0.06)' }}>
        {visibleInstruments.map((instrument) => (
          <Link
            key={instrument.code}
            href="/sentiment"
            className="group flex items-start justify-between gap-4 px-4 sm:px-5 py-3 transition-colors duration-150 text-decoration-none block"
            style={{
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(250, 247, 242, 0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    color: INK,
                  }}
                >
                  {instrument.code}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--ff-sans)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: INK,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {instrument.name}
                </span>
              </div>
              <p
                style={{
                  marginTop: '3px',
                  fontFamily: 'var(--ff-sans)',
                  fontSize: '11.5px',
                  lineHeight: 1.45,
                  color: MUTED,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {instrument.summary}
              </p>
            </div>

            <span
              className="shrink-0 self-center opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150"
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: '11px',
                color: INK,
              }}
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        ))}
      </div>

      {/* Footer Callout */}
      <div
        className="px-4 sm:px-5 py-3"
        style={{
          borderTop: `1px solid ${HAIRLINE}`,
          background: 'rgba(250, 247, 242, 0.02)',
        }}
      >
        <Link
          href="/sentiment"
          className="group flex items-center justify-between text-decoration-none"
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
            Open full workspace to inspect all 94 panels
          </span>
          <span
            className="group-hover:translate-x-1 transition-transform duration-160"
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
    </div>
  );
}
