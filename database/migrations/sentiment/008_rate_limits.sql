-- ============================================================
-- Sentiment DB Migration 008: Shared Rate Limits
--
-- The primary DB binding still owns shared fixed-window rate-limit state
-- used by auth and maintenance endpoints.
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  key           TEXT NOT NULL,
  window_start  INTEGER NOT NULL,
  count         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
