'use client';

import React, { memo } from 'react';

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
 * Intel Registry sidebar — clean, high-contrast, minimalist terminal navigation.
 * Monochromatic hierarchy without glowing dots, neon accents, or AI slop.
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

  // Total count of concrete indicators
  const totalIndicators = registryCats.reduce((acc, cat) => {
    return acc + cat.items.filter((it) => !it.isDivider).length;
  }, 0);

  return (
    <div
      className="w-full flex flex-col overflow-hidden select-none"
      style={{
        height: 'calc(100vh - 64px)',
        maxHeight: 'calc(100vh - 64px)',
        background: '#120F0D',
        border: '1px solid rgba(245, 241, 234, 0.08)',
        borderRadius: '2px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* ── Header ── */}
      <div className="shrink-0 p-3" style={{ borderBottom: '1px solid rgba(245, 241, 234, 0.08)', background: '#0F0C0A' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.12em',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontFamily: 'var(--ff-mono)',
              color: '#FAF7F2',
            }}
          >
            Intel Registry
          </span>
          <span
            style={{
              fontSize: '9.5px',
              fontFamily: 'var(--ff-mono)',
              color: '#8C857C',
              background: '#191512',
              border: '1px solid rgba(245, 241, 234, 0.08)',
              padding: '1px 6px',
              borderRadius: '2px',
              fontWeight: 600,
            }}
          >
            {totalIndicators}
          </span>
        </div>

        {/* ── Overview / Reset button ── */}
        <button
          type="button"
          onClick={() => setSelectedIndicator(null)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors duration-140"
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: '10.5px',
            letterSpacing: '0.06em',
            background: selectedIndicator === null ? '#1E1915' : 'transparent',
            border: selectedIndicator === null ? '1px solid rgba(245, 241, 234, 0.16)' : '1px solid rgba(245, 241, 234, 0.06)',
            borderLeft: selectedIndicator === null ? '2px solid #FAF7F2' : '1px solid rgba(245, 241, 234, 0.06)',
            color: selectedIndicator === null ? '#FAF7F2' : '#A8A196',
            fontWeight: selectedIndicator === null ? 600 : 500,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            if (selectedIndicator !== null) {
              e.currentTarget.style.color = '#FAF7F2';
              e.currentTarget.style.background = '#171411';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedIndicator !== null) {
              e.currentTarget.style.color = '#A8A196';
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <span>ALL PANELS</span>
          <span style={{ fontSize: '9px', opacity: 0.6 }}>VIEW</span>
        </button>
      </div>

      {/* ── Search Input ── */}
      <div className="shrink-0 p-2.5" style={{ borderBottom: '1px solid rgba(245, 241, 234, 0.06)', background: '#120F0D' }}>
        <div className="relative flex items-center">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8C857C"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: '8px', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={registrySearch}
            onChange={(e) => setRegistrySearch(e.target.value)}
            placeholder="Search indicators..."
            style={{
              width: '100%',
              height: '30px',
              padding: '0 26px 0 26px',
              background: '#0A0908',
              border: '1px solid rgba(245, 241, 234, 0.10)',
              borderRadius: '2px',
              color: '#FAF7F2',
              fontSize: '11px',
              fontFamily: 'var(--ff-sans)',
              letterSpacing: '0.01em',
              outline: 'none',
              caretColor: '#FAF7F2',
              boxSizing: 'border-box',
              transition: 'border-color 140ms ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(245, 241, 234, 0.28)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(245, 241, 234, 0.10)';
            }}
          />
          {registrySearch && (
            <button
              type="button"
              onClick={() => setRegistrySearch('')}
              style={{
                position: 'absolute',
                right: '6px',
                background: 'none',
                border: 'none',
                color: '#8C857C',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '2px 4px',
                lineHeight: 1,
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Category Accordions ── */}
      <div
        className="overflow-y-auto flex-1 min-h-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#2B2521 #120F0D',
        }}
      >
        {registryCats.map((cat) => {
          const indicatorItems = cat.items.filter((item): item is IndicatorEntry => !item.isDivider);
          const visibleIndicators = q
            ? indicatorItems.filter((item) => item.name.toLowerCase().includes(q))
            : indicatorItems;

          if (q && visibleIndicators.length === 0) return null;
          const isOpen = q ? true : openAccordion === cat.id;

          return (
            <div key={cat.id} style={{ borderBottom: '1px solid rgba(245, 241, 234, 0.05)' }}>
              {/* Category Header */}
              <button
                type="button"
                onClick={() => {
                  if (!q) setOpenAccordion((prev) => (prev === cat.id ? null : cat.id));
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors duration-140"
                style={{
                  background: isOpen ? '#151210' : '#120F0D',
                  cursor: q ? 'default' : 'pointer',
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!q && !isOpen) e.currentTarget.style.background = '#171411';
                }}
                onMouseLeave={(e) => {
                  if (!q && !isOpen) e.currentTarget.style.background = '#120F0D';
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 650,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--ff-mono)',
                      color: isOpen ? '#FAF7F2' : '#A8A196',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    style={{
                      fontSize: '9px',
                      fontFamily: 'var(--ff-mono)',
                      color: '#736B63',
                    }}
                  >
                    {visibleIndicators.length}
                  </span>
                  {!q && (
                    <span
                      style={{
                        fontSize: '9px',
                        color: '#736B63',
                        fontFamily: 'var(--ff-mono)',
                        lineHeight: 1,
                        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 140ms ease',
                        display: 'inline-block',
                      }}
                    >
                      ›
                    </span>
                  )}
                </div>
              </button>

              {/* Indicator Items */}
              {isOpen && (
                <div style={{ background: '#0D0B0A', padding: '2px 0' }}>
                  {(q ? visibleIndicators : cat.items).map((item, idx) => {
                    if (item.isDivider) {
                      const divItem = item as DividerEntry;
                      return (
                        <div
                          key={`div-${divItem.dividerLabel}`}
                          style={{
                            padding: '8px 12px 3px 12px',
                            borderTop: idx === 0 ? 'none' : '1px solid rgba(245, 241, 234, 0.04)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '8.5px',
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              fontWeight: 600,
                              color: '#736B63',
                              fontFamily: 'var(--ff-mono)',
                            }}
                          >
                            {divItem.dividerLabel}
                          </span>
                        </div>
                      );
                    }

                    const indItem = item as IndicatorEntry;
                    const isSelected = selectedIndicator === indItem.id;
                    const hi = q
                      ? (() => {
                          const i = indItem.name.toLowerCase().indexOf(q);
                          if (i === -1) return null;
                          return {
                            before: indItem.name.slice(0, i),
                            match: indItem.name.slice(i, i + q.length),
                            after: indItem.name.slice(i + q.length),
                          };
                        })()
                      : null;

                    return (
                      <button
                        key={indItem.id}
                        type="button"
                        onClick={() => {
                          setSelectedIndicator(indItem.id);
                          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
                        }}
                        className="w-full flex items-center justify-between text-left transition-colors duration-120"
                        style={{
                          height: '28px',
                          padding: '0 10px 0 14px',
                          cursor: 'pointer',
                          background: isSelected ? '#1E1915' : 'transparent',
                          borderLeft: isSelected ? '2px solid #FAF7F2' : '2px solid transparent',
                          borderTop: 'none',
                          borderRight: 'none',
                          borderBottom: 'none',
                          outline: 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = '#15120F';
                            const titleSpan = e.currentTarget.querySelector('span');
                            if (titleSpan) titleSpan.style.color = '#FAF7F2';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'transparent';
                            const titleSpan = e.currentTarget.querySelector('span');
                            if (titleSpan) titleSpan.style.color = '#C5BEB3';
                          }
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: isSelected ? 600 : 400,
                            lineHeight: '1.4',
                            color: isSelected ? '#FAF7F2' : '#C5BEB3',
                            fontFamily: 'var(--ff-sans)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {hi ? (
                            <>
                              {hi.before}
                              <span style={{ color: '#FAF7F2', fontWeight: 700, textDecoration: 'underline' }}>
                                {hi.match}
                              </span>
                              {hi.after}
                            </>
                          ) : (
                            indItem.name
                          )}
                        </span>
                        {indItem.freq && (
                          <span
                            style={{
                              fontSize: '8.5px',
                              fontFamily: 'var(--ff-mono)',
                              fontWeight: 500,
                              color: '#736B63',
                              letterSpacing: '0.04em',
                              flexShrink: 0,
                              marginLeft: '4px',
                            }}
                          >
                            {indItem.freq}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default SentimentSidebar;
