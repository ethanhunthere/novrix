'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';

type IndicatorEntry = { isDivider?: undefined; name: string; id: string; live: boolean; freq: string };
type DividerEntry   = { isDivider: true; dividerLabel: string };
type AnyEntry = IndicatorEntry | DividerEntry;

export type RegistryCat = {
  id: string;
  label: string;
  accent: string;
  items: AnyEntry[];
};

interface SentimentSidebarProps {
  registryCats: RegistryCat[];
  registrySearch: string;
  setRegistrySearch: (v: string) => void;
  openAccordion: string | null;
  setOpenAccordion: React.Dispatch<React.SetStateAction<string | null>>;
  selectedIndicator: string | null;
  setSelectedIndicator: (v: string | null) => void;
}

/**
 * Intel Registry sidebar — memoized so it only re-renders when its own
 * props change (registry search, accordion state, selected indicator).
 * Chart data loading does not affect these props → zero wasted renders
 * while chart panels populate with data.
 */
const SentimentSidebar = memo(function SentimentSidebar({
  registryCats,
  registrySearch,
  setRegistrySearch,
  openAccordion,
  setOpenAccordion,
  selectedIndicator,
  setSelectedIndicator,
}: SentimentSidebarProps) {
  const q = registrySearch.toLowerCase().trim();

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className="overflow-hidden lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:flex lg:flex-col"
      style={{ background: '#0B0D12', border: '1px solid #1E2435' }}
    >
      {/* ── Sidebar header ── */}
      <div className="shrink-0">
        <div className="px-5 pt-5 pb-4" style={{ background: '#080A0F', borderBottom: '1px solid #1A2030' }}>
          {/* INTEL REGISTRY label with accent underline */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex flex-col gap-1.5">
              <span style={{
                fontSize: '11px',
                letterSpacing: '0.24em',
                fontWeight: 700,
                textTransform: 'uppercase',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#6B7D9A',
              }}>
                Intel Registry
              </span>
              <div style={{ width: '34px', height: '2px', background: '#3B82F6', borderRadius: '1px' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A3040 #111316' }}>
        {/* ── Search ── */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #151B26', background: '#0D0F14' }}>
          <div className="relative">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4A5568"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={registrySearch}
              onChange={(e) => setRegistrySearch(e.target.value)}
              placeholder="Find indicator..."
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px 0 36px',
                background: '#11141C',
                border: '1px solid #1E2635',
                borderRadius: '6px',
                color: '#C8D4E4',
                fontSize: '13px',
                fontFamily: 'Inter, system-ui, sans-serif',
                letterSpacing: '0.01em',
                outline: 'none',
                caretColor: '#3B82F6',
                boxSizing: 'border-box',
                transition: 'border-color 180ms ease, box-shadow 180ms ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3B82F688';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#1E2635';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* ── Accordion ── */}
        {registryCats.map((cat) => {
          const indicatorItems = cat.items.filter((item): item is IndicatorEntry => !item.isDivider);
          const visibleIndicators = q ? indicatorItems.filter(item => item.name.toLowerCase().includes(q)) : indicatorItems;
          if (q && visibleIndicators.length === 0) return null;
          const isOpen = q ? true : openAccordion === cat.id;
          return (
            <div key={cat.id} style={{ borderBottom: '1px solid #161C28' }}>
              {/* Category header */}
              <div
                role="button"
                onClick={() => { if (!q) setOpenAccordion(prev => prev === cat.id ? null : cat.id); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 18px',
                  background: isOpen ? '#131925' : '#0B0D12',
                  borderLeft: `3px solid ${isOpen ? cat.accent : '#1A2030'}`,
                  cursor: q ? 'default' : 'pointer',
                  userSelect: 'none',
                  transition: 'background 160ms ease, border-left-color 160ms ease',
                }}
                onMouseEnter={(e) => { if (!q && !isOpen) { e.currentTarget.style.background = '#10151E'; e.currentTarget.style.borderLeftColor = cat.accent + 'AA'; } }}
                onMouseLeave={(e) => { if (!q && !isOpen) { e.currentTarget.style.background = '#0B0D12'; e.currentTarget.style.borderLeftColor = '#1A2030'; } }}
              >
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  color: isOpen ? '#E2E8F0' : '#6B7D9A',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'color 160ms ease',
                }}>
                  {cat.label}
                </span>
                {!q && (
                  <span style={{
                    fontSize: '13px',
                    color: isOpen ? cat.accent : '#3A4558',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    lineHeight: 1,
                    transition: 'color 160ms ease, transform 200ms ease',
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    display: 'inline-block',
                  }}>
                    ▾
                  </span>
                )}
              </div>
              {/* Items */}
              {isOpen && (
                <div>
                  {(q ? visibleIndicators : cat.items).map((item, idx) => {
                    if (item.isDivider) {
                      const divItem = item as DividerEntry;
                      return (
                        <div key={`div-${divItem.dividerLabel}`} style={{
                          padding: '16px 18px 8px 21px',
                          borderTop: idx === 0 ? 'none' : '1px solid #151B26',
                        }}>
                          <span style={{
                            fontSize: '10px',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            color: '#4A5568',
                            fontFamily: 'Inter, system-ui, sans-serif',
                          }}>
                            {divItem.dividerLabel}
                          </span>
                        </div>
                      );
                    }
                    const indItem = item as IndicatorEntry;
                    const isSelected = selectedIndicator === indItem.id;
                    const hi = q ? (() => {
                      const i = indItem.name.toLowerCase().indexOf(q);
                      if (i === -1) return null;
                      return { before: indItem.name.slice(0, i), match: indItem.name.slice(i, i + q.length), after: indItem.name.slice(i + q.length) };
                    })() : null;
                    return (
                      <div
                        key={indItem.id}
                        role="button"
                        onClick={() => { setSelectedIndicator(indItem.id); window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }}
                        style={{
                          minHeight: '46px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '11px',
                          padding: '0 18px 0 21px',
                          cursor: 'pointer',
                          background: isSelected ? '#131B2A' : 'transparent',
                          borderLeft: isSelected ? `3px solid ${cat.accent}` : '3px solid transparent',
                          userSelect: 'none',
                          outline: 'none',
                          transition: 'background 140ms ease',
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#0F141E'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* Freq indicator spacer */}
                        <div style={{ width: '6px', height: '6px', flexShrink: 0 }} />
                        <span style={{
                          flex: 1,
                          fontSize: '14px',
                          fontWeight: isSelected ? 600 : 400,
                          lineHeight: '1.5',
                          color: isSelected ? '#F1F5F9' : '#A0AEC0',
                          fontFamily: 'Inter, system-ui, sans-serif',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          transition: 'color 140ms ease',
                        }}>
                          {hi ? (
                            <>
                              {hi.before}
                              <span style={{ color: '#F87171', fontWeight: 600 }}>{hi.match}</span>
                              {hi.after}
                            </>
                          ) : indItem.name}
                        </span>
                        {/* Frequency badge */}
                        {indItem.freq && (
                          <span style={{
                            fontSize: '10px',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontWeight: 600,
                            color: '#4A5568',
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                          }}>
                            {indItem.freq}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}


      </div>
    </motion.div>
  );
});

export default SentimentSidebar;
