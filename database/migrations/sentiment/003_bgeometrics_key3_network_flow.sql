-- ============================================================
-- Migration 004: BGeometrics KEY3 — Network & Flow Indicators
-- NRPL, RHODL, Open Interest, Funding Rate,
-- NVTS, NVT Z-Score, CVDD
-- ============================================================

CREATE TABLE IF NOT EXISTS nrpl_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS rhodl_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS open_interest_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS funding_rate_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS nvts_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS nvt_zscore_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS cvdd_data (
  date  TEXT PRIMARY KEY,
  value REAL NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nrpl_date                ON nrpl_data(date);
CREATE INDEX IF NOT EXISTS idx_rhodl_date               ON rhodl_data(date);
CREATE INDEX IF NOT EXISTS idx_open_interest_date        ON open_interest_data(date);
CREATE INDEX IF NOT EXISTS idx_funding_rate_date         ON funding_rate_data(date);
CREATE INDEX IF NOT EXISTS idx_nvts_date                 ON nvts_data(date);
CREATE INDEX IF NOT EXISTS idx_nvt_zscore_date           ON nvt_zscore_data(date);
CREATE INDEX IF NOT EXISTS idx_cvdd_date                 ON cvdd_data(date);
