-- ============================================================
-- Insights DB Migration 002
-- Add optional cover_image column to novrix_posts
--
-- Apply with:
--   wrangler d1 execute novrix-insights-db --remote --file=database/migrations/insights/002_cover_image.sql
-- ============================================================

ALTER TABLE novrix_posts ADD COLUMN cover_image TEXT;
