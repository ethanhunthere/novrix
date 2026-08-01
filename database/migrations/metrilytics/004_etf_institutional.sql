-- ============================================================
-- Metrilytics DB Migration 004: ETF Flows & Institutional Holdings
-- ============================================================
-- Purpose: Track US spot Bitcoin/Ethereum ETF flows and institutional holdings
-- Sources: Farside Investors (scraping), CoinGecko API
-- Update Frequency: Daily at 04:00 UTC (after US market close)

CREATE TABLE IF NOT EXISTS etf_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Core ETF data
  etf_symbol TEXT NOT NULL,          -- IBIT, FBTC, GBTC, ARKB, BITB, ETHA, FETH, etc.
  etf_name TEXT NOT NULL,            -- iShares Bitcoin Trust, Fidelity Wise Origin, etc.
  asset TEXT NOT NULL,               -- BTC or ETH
  date TEXT NOT NULL,                -- ISO 8601 date (YYYY-MM-DD)
  
  -- Flow metrics
  daily_flow_usd REAL NOT NULL,      -- Net inflow (+) or outflow (-) in USD
  cumulative_flow_usd REAL,          -- Total since ETF launch
  
  -- Holdings metrics
  aum_usd REAL,                      -- Assets under management
  btc_holdings REAL,                 -- Total BTC held (for BTC ETFs)
  eth_holdings REAL,                 -- Total ETH held (for ETH ETFs)
  
  -- Market metrics
  premium_pct REAL,                  -- Premium (+) or discount (-) to NAV
  
  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  
  -- Prevent duplicates
  UNIQUE(etf_symbol, date)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_etf_symbol_date ON etf_flows(etf_symbol, date DESC);
CREATE INDEX IF NOT EXISTS idx_etf_date ON etf_flows(date DESC);
CREATE INDEX IF NOT EXISTS idx_etf_asset ON etf_flows(asset, date DESC);

-- Composite index for aggregation queries
CREATE INDEX IF NOT EXISTS idx_etf_aggregate ON etf_flows(date DESC, daily_flow_usd);

-- ============================================================

CREATE TABLE IF NOT EXISTS institutional_holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Entity data
  entity_name TEXT NOT NULL,         -- MicroStrategy, Tesla, Block, etc.
  entity_type TEXT NOT NULL,         -- 'public_company', 'etf', 'government', 'private_company'
  country TEXT,                      -- US, Canada, etc.
  
  -- Holdings
  btc_holdings REAL NOT NULL,        -- Total BTC held
  eth_holdings REAL,                 -- Total ETH held (if applicable)
  usd_value REAL NOT NULL,           -- Current USD value
  
  -- Metrics
  pct_total_supply REAL,             -- % of total BTC supply
  change_30d REAL,                   -- Change in holdings over 30d (BTC)
  change_30d_usd REAL,               -- Change in USD value over 30d
  
  -- Metadata
  last_update TEXT NOT NULL,         -- Date of last known change
  created_at TEXT DEFAULT (datetime('now')),
  
  -- Prevent duplicates
  UNIQUE(entity_name, last_update)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inst_holdings ON institutional_holdings(btc_holdings DESC);
CREATE INDEX IF NOT EXISTS idx_inst_update ON institutional_holdings(last_update DESC);
