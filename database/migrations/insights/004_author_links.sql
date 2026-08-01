-- ============================================================
-- Insights DB Migration 004
-- Optional author social links for editorial posts.
--
-- Apply with:
--   wrangler d1 execute novrix-insights-db --remote --file=database/migrations/insights/004_author_links.sql
-- ============================================================

ALTER TABLE novrix_posts ADD COLUMN author_links TEXT NOT NULL DEFAULT '[]';
