-- ============================================================
-- Metrilytics DB Migration 005: Protocol Market Cap Data
-- ============================================================
-- Purpose: Store protocol market capitalization for ratio analysis
-- Source: DeFiLlama /protocols endpoint (free, no API key)
-- Update Frequency: Daily at 03:00 UTC

CREATE TABLE IF NOT EXISTS protocol_mcap (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Core protocol data
  protocol TEXT NOT NULL,            -- Aave, Compound, Uniswap, etc.
  slug TEXT NOT NULL,                -- aave, compound, uniswap (DeFiLlama slug)
  date TEXT NOT NULL,                -- ISO 8601 date (YYYY-MM-DD)
  
  -- Market metrics
  mcap_usd REAL,                     -- Market capitalization
  token_price REAL,                  -- Current token price
  token_symbol TEXT,                 -- AAVE, COMP, UNI, etc.
  
  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  
  -- Prevent duplicates
  UNIQUE(slug, date)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_mcap_slug_date ON protocol_mcap(slug, date DESC);
CREATE INDEX IF NOT EXISTS idx_mcap_date ON protocol_mcap(date DESC);

-- Composite index for ratio calculations
CREATE INDEX IF NOT EXISTS idx_mcap_ratio ON protocol_mcap(date DESC, mcap_usd);
