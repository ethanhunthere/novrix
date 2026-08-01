-- ============================================================
-- Insights DB Migration 001
-- News feed, editorial posts, insights registry, picks, and
-- idempotency tables for the standalone INSIGHTS_DB binding.
--
-- Apply with:
--   wrangler d1 execute novrix-insights-db --remote --file=database/migrations/insights/001_insights.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS articles (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  url          TEXT NOT NULL UNIQUE,
  summary      TEXT,
  source_name  TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'crypto',
  published_at TEXT NOT NULL,
  inserted_at  TEXT DEFAULT (datetime('now')),
  image_url    TEXT
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category  ON articles(category, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_inserted  ON articles(inserted_at DESC);

CREATE TABLE IF NOT EXISTS feed_sources (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  url             TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  fetch_interval  INTEGER NOT NULL DEFAULT 300,
  last_fetched_at TEXT,
  last_error      TEXT,
  total_inserted  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS novrix_posts (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  images       TEXT NOT NULL DEFAULT '[]',
  category     TEXT NOT NULL,
  author       TEXT NOT NULL DEFAULT 'NOVRIX',
  published_at TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_posts_category ON novrix_posts(category, published_at DESC);

CREATE TABLE IF NOT EXISTS novrix_insights (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  images       TEXT NOT NULL DEFAULT '[]',
  category     TEXT NOT NULL,
  author       TEXT NOT NULL DEFAULT 'NOVRIX',
  published_at TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_insights_category ON novrix_insights(category, published_at DESC);

CREATE TABLE IF NOT EXISTS novrix_picks (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  images       TEXT NOT NULL DEFAULT '[]',
  category     TEXT NOT NULL,
  author       TEXT NOT NULL DEFAULT 'NOVRIX',
  published_at TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_picks_category ON novrix_picks(category, published_at DESC);

CREATE TABLE IF NOT EXISTS post_idempotency (
  key        TEXT PRIMARY KEY,
  post_slug  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_post_idempotency_created ON post_idempotency(created_at);
