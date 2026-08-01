-- ============================================================
-- Metrilytics DB Migration 003: Real Liquidations Intelligence
-- ============================================================
-- Purpose: Store real liquidation events from exchanges
-- Sources: Binance, Bybit, OKX, Hyperliquid
-- Update Frequency: Every 5 minutes via cron worker

CREATE TABLE IF NOT EXISTS liquidations_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Core liquidation event data
  symbol TEXT NOT NULL,              -- BTC, ETH, SOL, etc.
  side TEXT NOT NULL,                -- 'long' or 'short'
  size_usd REAL NOT NULL,            -- Liquidated amount in USD
  price REAL NOT NULL,               -- Price at liquidation
  exchange TEXT NOT NULL,            -- 'binance', 'bybit', 'okx', 'hyperliquid', etc.
  
  -- Timing
  timestamp TEXT NOT NULL,           -- ISO 8601 UTC timestamp
  
  -- Context
  type TEXT DEFAULT 'cross',         -- 'cross' or 'isolated'
  leverage REAL,                     -- Estimated leverage (if available)
  
  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  
  -- Prevent duplicates
  UNIQUE(symbol, exchange, timestamp, price, size_usd)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_liq_symbol_time ON liquidations_data(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_liq_timestamp ON liquidations_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_liq_exchange_time ON liquidations_data(exchange, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_liq_side_time ON liquidations_data(side, timestamp DESC);

-- Composite index for heatmap queries (time range + price bucket aggregation)
CREATE INDEX IF NOT EXISTS idx_liq_heatmap ON liquidations_data(timestamp DESC, price, size_usd);

-- Index for cascade score calculation (recent volume analysis)
CREATE INDEX IF NOT EXISTS idx_liq_cascade ON liquidations_data(timestamp DESC, size_usd);
