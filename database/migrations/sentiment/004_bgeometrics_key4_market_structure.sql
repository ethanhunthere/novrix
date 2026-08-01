-- ============================================================
-- Migration 005: BGeometrics KEY4 — Market Structure Indicators
-- Realized Price, Market Cap, 200W MA, Pi Cycle, Highly Liquid,
-- LTH/STH Position Change, MPI, Miner Sell Pressure,
-- UTXO Profit/Loss
-- ============================================================

CREATE TABLE IF NOT EXISTS realized_price_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS market_cap_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS week_ma_200_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);


CREATE TABLE IF NOT EXISTS highly_liquid_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS lth_position_change_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sth_position_change_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS mpi_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS miner_sell_pressure_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS utxo_profit_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS utxo_loss_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_realized_price_date      ON realized_price_data(date);
CREATE INDEX IF NOT EXISTS idx_market_cap_date          ON market_cap_data(date);
CREATE INDEX IF NOT EXISTS idx_week_ma_200_date         ON week_ma_200_data(date);
CREATE INDEX IF NOT EXISTS idx_highly_liquid_date       ON highly_liquid_data(date);
CREATE INDEX IF NOT EXISTS idx_lth_position_change_date ON lth_position_change_data(date);
CREATE INDEX IF NOT EXISTS idx_sth_position_change_date ON sth_position_change_data(date);
CREATE INDEX IF NOT EXISTS idx_mpi_date                 ON mpi_data(date);
CREATE INDEX IF NOT EXISTS idx_miner_sell_pressure_date ON miner_sell_pressure_data(date);
CREATE INDEX IF NOT EXISTS idx_utxo_profit_date         ON utxo_profit_data(date);
CREATE INDEX IF NOT EXISTS idx_utxo_loss_date           ON utxo_loss_data(date);
