-- ============================================================
-- Insights DB Migration 003
-- Keep only the approved RSS news sources for the public feed.
--
-- Apply with:
--   wrangler d1 execute novrix-insights-db --remote --file=database/migrations/insights/003_allowed_news_sources.sql
-- ============================================================

DELETE FROM feed_sources
WHERE url NOT IN (
  'https://cointelegraph.com/rss',
  'https://www.investing.com/rss/news_14.rss'
);

INSERT INTO feed_sources (url, name, category, fetch_interval)
VALUES
  ('https://cointelegraph.com/rss', 'CoinTelegraph', 'crypto', 60),
  ('https://www.investing.com/rss/news_14.rss', 'Investing.com', 'macro', 300)
ON CONFLICT(url) DO UPDATE SET
  name = excluded.name,
  category = excluded.category,
  fetch_interval = excluded.fetch_interval;

DELETE FROM articles
WHERE source_name NOT IN ('CoinTelegraph', 'Investing.com');
