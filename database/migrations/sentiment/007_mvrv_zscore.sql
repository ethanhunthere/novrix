-- Migration 012: MVRV Z-Score indicator (KEY5)
-- Replaces deprecated realized_cap_data (removed)

CREATE TABLE IF NOT EXISTS mvrv_zscore_data (
  date TEXT PRIMARY KEY,
  value REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mvrv_zscore_date ON mvrv_zscore_data(date);

-- Drop old realized_cap table (no longer used)
DROP TABLE IF EXISTS realized_cap_data;
