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
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full flex flex-col overflow-hidden"
      style={{
        height: 'calc(100vh - 68px)',
        maxHeight: 'calc(100vh - 68px)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.40)',
      }}
    >
      {/* ── Sidebar header ── */}
      <div className="shrink-0">
        <div className="px-3.5 pt-3.5 pb-2.5" style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between">
            <span style={{
              fontSize: '10px',
              letterSpacing: '0.18em',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontFamily: 'var(--ff-mono)',
              color: 'var(--text-tertiary)',
            }}>
              Intel Registry
            </span>
            {selectedIndicator && (
              <button
                type="button"
                onClick={() => setSelectedIndicator(null)}
                className="px-1.5 py-0.5 text-[9px] font-mono tracking-wider uppercase transition-colors"
                style={{
                  background: 'rgba(245,241,234,0.06)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-heading)';
                  e.currentTarget.style.borderColor = 'var(--accent-novrix)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-default) var(--bg-base)' }}>
        {/* ── Search ── */}
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-raised)' }}>
          <div className="relative">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-ghost)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={registrySearch}
              onChange={(e) => setRegistrySearch(e.target.value)}
              placeholder="Filter..."
              style={{
                width: '100%',
                height: '30px',
                padding: '0 8px 0 26px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '3px',
                color: 'var(--text-primary)',
                fontSize: '11px',
                fontFamily: 'var(--ff-sans)',
                letterSpacing: '0.01em',
                outline: 'none',
                caretColor: 'var(--accent-novrix)',
                boxSizing: 'border-box',
                transition: 'border-color 140ms ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
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
                  padding: '9px 12px',
                  background: isOpen ? 'var(--bg-raised)' : 'var(--bg-surface)',
                  borderLeft: `2px solid ${isOpen ? cat.accent : 'transparent'}`,
                  cursor: q ? 'default' : 'pointer',
                  userSelect: 'none',
                  transition: 'background 140ms ease, border-left-color 140ms ease',
                }}
                onMouseEnter={(e) => { if (!q && !isOpen) { e.currentTarget.style.background = 'var(--bg-base)'; e.currentTarget.style.borderLeftColor = cat.accent + '88'; } }}
                onMouseLeave={(e) => { if (!q && !isOpen) { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderLeftColor = 'transparent'; } }}
              >
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: 650,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--ff-sans)',
                  color: isOpen ? 'var(--text-heading)' : 'var(--text-tertiary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'color 140ms ease',
                }}>
                  {cat.label}
                </span>
                {!q && (
                  <span style={{
                    fontSize: '11px',
                    color: isOpen ? cat.accent : 'var(--text-ghost)',
                    fontFamily: 'var(--ff-sans)',
                    lineHeight: 1,
                    transition: 'color 140ms ease, transform 160ms ease',
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
                          padding: '10px 12px 4px 14px',
                          borderTop: idx === 0 ? 'none' : '1px solid var(--border-subtle)',
                        }}>
                          <span style={{
                            fontSize: '9px',
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
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
                          minHeight: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0 10px 0 12px',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--bg-raised)' : 'transparent',
                          borderLeft: isSelected ? `2px solid ${cat.accent}` : '2px solid transparent',
                          userSelect: 'none',
                          outline: 'none',
                          transition: 'background 120ms ease',
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface)'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{
                          flex: 1,
                          fontSize: '11.5px',
                          fontWeight: isSelected ? 600 : 400,
                          lineHeight: '1.4',
                          color: isSelected ? 'var(--text-heading)' : 'var(--text-secondary)',
                          fontFamily: 'var(--ff-sans)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          transition: 'color 120ms ease',
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
                            fontSize: '9px',
                            fontFamily: 'var(--ff-mono)',
                            fontWeight: 500,
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
