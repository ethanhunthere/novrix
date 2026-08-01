-- Auth DB Migration 001
-- Consolidated Auth schema for users and sessions.

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  novrix_id       TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_login      TEXT,
  novrix_id_hash  TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_novrix_id ON users(novrix_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_novrix_id_hash ON users(novrix_id_hash);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
