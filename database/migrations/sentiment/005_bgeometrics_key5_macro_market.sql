-- ============================================================
-- Migration 006: BGeometrics KEY5 — Macro & Market Indicators
-- M2, DXY, VIX, Fed Funds, ETF Balances,
-- S&P 500, Gold, Stablecoin Supply (BGeometrics),
-- Crypto Market Cap
-- ============================================================

CREATE TABLE IF NOT EXISTS m2_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS dxy_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS vix_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);


CREATE TABLE IF NOT EXISTS fedfunds_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS etf_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sp500_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS gold_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS stablecoin_supply_bgeometrics_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS crypto_market_cap_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_m2_date                ON m2_data(date);
CREATE INDEX IF NOT EXISTS idx_dxy_date               ON dxy_data(date);
CREATE INDEX IF NOT EXISTS idx_vix_date               ON vix_data(date);
CREATE INDEX IF NOT EXISTS idx_fedfunds_date          ON fedfunds_data(date);
CREATE INDEX IF NOT EXISTS idx_etf_date               ON etf_data(date);
CREATE INDEX IF NOT EXISTS idx_sp500_date             ON sp500_data(date);
CREATE INDEX IF NOT EXISTS idx_gold_date              ON gold_data(date);
CREATE INDEX IF NOT EXISTS idx_stablecoin_supply_bg_date ON stablecoin_supply_bgeometrics_data(date);
CREATE INDEX IF NOT EXISTS idx_crypto_market_cap_date ON crypto_market_cap_data(date);
