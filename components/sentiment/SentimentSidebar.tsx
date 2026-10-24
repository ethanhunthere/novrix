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
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      {/* ── Sidebar header ── */}
      <div className="shrink-0">
        <div className="px-5 pt-5 pb-4" style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
          {/* INTEL REGISTRY label with accent underline */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex flex-col gap-1.5">
              <span style={{
                fontSize: '11px',
                letterSpacing: '0.24em',
                fontWeight: 700,
                textTransform: 'uppercase',
                fontFamily: 'var(--ff-mono)',
                color: 'var(--text-tertiary)',
              }}>
                Intel Registry
              </span>
              <div style={{ width: '34px', height: '2px', background: 'var(--accent-novrix)', borderRadius: '1px' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-default) var(--bg-base)' }}>
        {/* ── Search ── */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-raised)' }}>
          <div className="relative">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-ghost)"
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
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '0.01em',
                outline: 'none',
                caretColor: 'var(--accent-novrix)',
                boxSizing: 'border-box',
                transition: 'border-color 180ms ease, box-shadow 180ms ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--border-accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
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
            <div key={cat.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {/* Category header */}
              <div
                role="button"
                onClick={() => { if (!q) setOpenAccordion(prev => prev === cat.id ? null : cat.id); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 18px',
                  background: isOpen ? 'var(--bg-raised)' : 'var(--bg-surface)',
                  borderLeft: `3px solid ${isOpen ? cat.accent : 'var(--border-subtle)'}`,
                  cursor: q ? 'default' : 'pointer',
                  userSelect: 'none',
                  transition: 'background 160ms ease, border-left-color 160ms ease',
                }}
                onMouseEnter={(e) => { if (!q && !isOpen) { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderLeftColor = cat.accent + 'AA'; } }}
                onMouseLeave={(e) => { if (!q && !isOpen) { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderLeftColor = 'var(--border-subtle)'; } }}
              >
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--ff-sans)',
                  color: isOpen ? 'var(--text-heading)' : 'var(--text-tertiary)',
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
                    color: isOpen ? cat.accent : 'var(--text-ghost)',
                    fontFamily: 'var(--ff-sans)',
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
                          borderTop: idx === 0 ? 'none' : '1px solid var(--border-subtle)',
                        }}>
                          <span style={{
                            fontSize: '10px',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            color: 'var(--text-ghost)',
                            fontFamily: 'var(--ff-sans)',
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
                          background: isSelected ? 'var(--bg-raised)' : 'transparent',
                          borderLeft: isSelected ? `3px solid ${cat.accent}` : '3px solid transparent',
                          userSelect: 'none',
                          outline: 'none',
                          transition: 'background 140ms ease',
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface)'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* Freq indicator spacer */}
                        <div style={{ width: '6px', height: '6px', flexShrink: 0 }} />
                        <span style={{
                          flex: 1,
                          fontSize: '14px',
                          fontWeight: isSelected ? 600 : 400,
                          lineHeight: '1.5',
                          color: isSelected ? 'var(--text-heading)' : 'var(--text-secondary)',
                          fontFamily: 'var(--ff-sans)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          transition: 'color 140ms ease',
                        }}>
                          {hi ? (
                            <>
                              {hi.before}
                              <span style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>{hi.match}</span>
                              {hi.after}
                            </>
                          ) : indItem.name}
                        </span>
                        {/* Frequency badge */}
                        {indItem.freq && (
                          <span style={{
                            fontSize: '10px',
                            fontFamily: 'var(--ff-mono)',
                            fontWeight: 600,
                            color: 'var(--text-ghost)',
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
