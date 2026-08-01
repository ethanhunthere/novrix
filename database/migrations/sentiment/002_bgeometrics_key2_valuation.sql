-- ============================================================
-- Migration 003: BGeometrics KEY2 — On-Chain Valuation Indicators
-- Puell, Mayer, Reserve Risk, AVIV, Realized Cap, VDD,
-- Liveliness, Hot Supply, Supply Shock,
-- Active Addresses, Hash Ribbons
-- ============================================================

CREATE TABLE IF NOT EXISTS puell_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS mayer_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS reserve_risk_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS aviv_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS realized_cap_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS vdd_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS liveliness_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS hot_supply_data (
  date           TEXT PRIMARY KEY,
  hot_supply     REAL NOT NULL,
  hot_supply_usd REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS supply_shock_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS active_addresses_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS hashribbons_data (
  date   TEXT PRIMARY KEY,
  sma_30 REAL NOT NULL,
  sma_60 REAL NOT NULL,
  signal TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_puell_date            ON puell_data(date);
CREATE INDEX IF NOT EXISTS idx_mayer_date            ON mayer_data(date);
CREATE INDEX IF NOT EXISTS idx_reserve_risk_date     ON reserve_risk_data(date);
CREATE INDEX IF NOT EXISTS idx_aviv_date             ON aviv_data(date);
CREATE INDEX IF NOT EXISTS idx_realized_cap_date     ON realized_cap_data(date);
CREATE INDEX IF NOT EXISTS idx_vdd_date              ON vdd_data(date);
CREATE INDEX IF NOT EXISTS idx_liveliness_date       ON liveliness_data(date);
CREATE INDEX IF NOT EXISTS idx_hot_supply_date       ON hot_supply_data(date);
CREATE INDEX IF NOT EXISTS idx_supply_shock_date     ON supply_shock_data(date);
CREATE INDEX IF NOT EXISTS idx_active_addresses_date ON active_addresses_data(date);
CREATE INDEX IF NOT EXISTS idx_hashribbons_date      ON hashribbons_data(date);
