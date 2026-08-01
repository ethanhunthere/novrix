-- ============================================================
-- Migration 002: BGeometrics KEY1 — Core Sentiment Indicators
-- NUPL, MVRV, SOPR, Supply P/L, Realized P/L, STH-MVRV,
-- Hashrate, BTC Price, Dominance, LTH-MVRV, SSR, NVT
-- ============================================================

CREATE TABLE IF NOT EXISTS nupl_data (
  date TEXT PRIMARY KEY,
  nupl REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS mvrv_data (
  date TEXT PRIMARY KEY,
  mvrv REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sopr_data (
  date TEXT PRIMARY KEY,
  sopr REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS supply_loss_data (
  date           TEXT PRIMARY KEY,
  supply_in_loss REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS supply_profit_data (
  date             TEXT PRIMARY KEY,
  supply_in_profit REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS realized_profit_data (
  date            TEXT PRIMARY KEY,
  realized_profit REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS realized_loss_data (
  date          TEXT PRIMARY KEY,
  realized_loss REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sth_mvrv_data (
  date     TEXT PRIMARY KEY,
  sth_mvrv REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS hashrate_data (
  date     TEXT PRIMARY KEY,
  hashrate REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS btc_price_data (
  date  TEXT PRIMARY KEY,
  price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS dominance_data (
  date          TEXT PRIMARY KEY,
  btc_dominance REAL NOT NULL,
  eth_dominance REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS lth_mvrv_data (
  date     TEXT PRIMARY KEY,
  lth_mvrv REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS ssr_data (
  date TEXT PRIMARY KEY,
  ssr  REAL NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nupl_date            ON nupl_data(date);
CREATE INDEX IF NOT EXISTS idx_mvrv_date            ON mvrv_data(date);
CREATE INDEX IF NOT EXISTS idx_sopr_date            ON sopr_data(date);
CREATE INDEX IF NOT EXISTS idx_supply_loss_date     ON supply_loss_data(date);
CREATE INDEX IF NOT EXISTS idx_supply_profit_date   ON supply_profit_data(date);
CREATE INDEX IF NOT EXISTS idx_realized_profit_date ON realized_profit_data(date);
CREATE INDEX IF NOT EXISTS idx_realized_loss_date   ON realized_loss_data(date);
CREATE INDEX IF NOT EXISTS idx_sth_mvrv_date        ON sth_mvrv_data(date);
CREATE INDEX IF NOT EXISTS idx_hashrate_date        ON hashrate_data(date);
CREATE INDEX IF NOT EXISTS idx_btc_price_date       ON btc_price_data(date);
CREATE INDEX IF NOT EXISTS idx_dominance_date       ON dominance_data(date);
CREATE INDEX IF NOT EXISTS idx_lth_mvrv_date        ON lth_mvrv_data(date);
CREATE INDEX IF NOT EXISTS idx_ssr_date             ON ssr_data(date);
