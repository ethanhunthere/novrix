-- ============================================================
-- Metrilytics DB Migration 006: Enhanced Yields with Risk Analytics
-- ============================================================
-- Purpose: Add risk scoring, IL risk, and yield source breakdown to yields_data
-- Source: DeFiLlama /pools endpoint (includes apyBase, apyReward)
-- Update Frequency: Daily at 03:00 UTC

-- Add new columns to existing yields_data table
ALTER TABLE yields_data ADD COLUMN apy_base REAL;
ALTER TABLE yields_data ADD COLUMN apy_reward REAL;
ALTER TABLE yields_data ADD COLUMN audited INTEGER DEFAULT 0;
ALTER TABLE yields_data ADD COLUMN pool_age_days INTEGER DEFAULT 0;
ALTER TABLE yields_data ADD COLUMN risk_score INTEGER DEFAULT 50;
ALTER TABLE yields_data ADD COLUMN il_risk TEXT DEFAULT 'unknown';

-- Add indexes for risk-based queries
CREATE INDEX IF NOT EXISTS idx_yields_risk ON yields_data(risk_score, tvl_usd DESC);
CREATE INDEX IF NOT EXISTS idx_yields_il_risk ON yields_data(il_risk, apy DESC);
CREATE INDEX IF NOT EXISTS idx_yields_real_yield ON yields_data(apy_reward, apy DESC);
