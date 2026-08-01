-- ============================================================
-- Metrilytics DB Migration 001: DeFi Macro Analytics
-- ============================================================

CREATE TABLE IF NOT EXISTS chain_tvl (
  chain   TEXT NOT NULL,
  date    TEXT NOT NULL,
  tvl_usd REAL NOT NULL,
  PRIMARY KEY (chain, date)
);

CREATE INDEX IF NOT EXISTS idx_chain_tvl_date ON chain_tvl(date DESC);

CREATE TABLE IF NOT EXISTS protocol_tvl (
  protocol TEXT NOT NULL,
  slug     TEXT NOT NULL,
  date     TEXT NOT NULL,
  tvl_usd  REAL NOT NULL,
  category TEXT,
  PRIMARY KEY (slug, date)
);

CREATE INDEX IF NOT EXISTS idx_protocol_tvl_date ON protocol_tvl(date DESC);

CREATE TABLE IF NOT EXISTS protocol_fees (
  protocol          TEXT NOT NULL,
  slug              TEXT NOT NULL,
  date              TEXT NOT NULL,
  daily_fees_usd    REAL,
  daily_revenue_usd REAL,
  PRIMARY KEY (slug, date)
);

CREATE TABLE IF NOT EXISTS dex_volumes (
  chain            TEXT NOT NULL,
  date             TEXT NOT NULL,
  daily_volume_usd REAL NOT NULL,
  PRIMARY KEY (chain, date)
);

CREATE TABLE IF NOT EXISTS stablecoin_supply (
  symbol     TEXT NOT NULL,
  date       TEXT NOT NULL,
  supply_usd REAL NOT NULL,
  peg_price  REAL,
  PRIMARY KEY (symbol, date)
);

CREATE TABLE IF NOT EXISTS stablecoin_total (
  date             TEXT PRIMARY KEY,
  total_supply_usd REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS derivatives_data (
  symbol            TEXT NOT NULL,
  date              TEXT NOT NULL,
  open_interest_usd REAL,
  funding_rate      REAL,
  long_short_ratio  REAL,
  PRIMARY KEY (symbol, date)
);

CREATE TABLE IF NOT EXISTS metrilytics_summary (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS yields_data (
  pool_id    TEXT PRIMARY KEY,
  protocol   TEXT NOT NULL,
  chain      TEXT NOT NULL,
  symbol     TEXT NOT NULL,
  apy        REAL,
  tvl_usd    REAL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_yields_tvl ON yields_data(tvl_usd DESC);

CREATE TABLE IF NOT EXISTS options_volume (
  chain    TEXT NOT NULL,
  date     TEXT NOT NULL,
  volume_usd REAL NOT NULL,
  PRIMARY KEY (chain, date)
);

CREATE INDEX IF NOT EXISTS idx_options_volume_date ON options_volume(date DESC);

CREATE TABLE IF NOT EXISTS btc_prices (
  date    TEXT PRIMARY KEY,
  open    REAL,
  high    REAL,
  low     REAL,
  close   REAL,
  volume  REAL
);

CREATE INDEX IF NOT EXISTS idx_btc_prices_date ON btc_prices(date DESC);
