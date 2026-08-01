-- ============================================================
-- Metrilytics DB Migration 007: Per-Protocol DEX Volume
-- ============================================================
-- Free endpoint: https://api.llama.fi/overview/dexs?dataType=dailyVolume
-- Stores a daily snapshot of per-protocol DEX volume (Uniswap, Curve, PancakeSwap, ...)
-- with 24h/30d/1y/all-time totals and 1d/7d/30d change. Distinct from dex_volumes
-- (which is per-chain aggregate). Ingested daily by metrilytics-cron.
CREATE TABLE IF NOT EXISTS dex_protocol_volume (
  protocol         TEXT NOT NULL,
  slug             TEXT NOT NULL,
  date             TEXT NOT NULL,
  volume_24h       REAL,
  volume_30d       REAL,
  volume_1y        REAL,
  volume_all_time  REAL,
  change_1d        REAL,
  change_7d        REAL,
  change_30d       REAL,
  category         TEXT,
  chains           TEXT,
  PRIMARY KEY (slug, date)
);

CREATE INDEX IF NOT EXISTS idx_dex_proto_volume_24h ON dex_protocol_volume(date DESC, volume_24h DESC);
CREATE INDEX IF NOT EXISTS idx_dex_proto_date ON dex_protocol_volume(date DESC);
