-- Tracking DB Migration 001
-- Schema for the Tracking module tables used by the Pages Functions and tracking cron.

CREATE TABLE IF NOT EXISTS whale_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  signature TEXT UNIQUE NOT NULL,
  amount_usd REAL NOT NULL,
  amount_native REAL DEFAULT 0,
  flow_type TEXT DEFAULT 'Transfer',
  sender TEXT DEFAULT '',
  receiver TEXT DEFAULT '',
  sender_label TEXT DEFAULT '',
  receiver_label TEXT DEFAULT '',
  timestamp TEXT NOT NULL,
  blockchain TEXT DEFAULT 'Bitcoin',
  token TEXT DEFAULT 'BTC',
  token_name TEXT DEFAULT '',
  source TEXT DEFAULT 'unknown',
  block_height INTEGER DEFAULT 0,
  is_pending INTEGER DEFAULT 0,
  transaction_type TEXT DEFAULT 'transfer'
);

CREATE INDEX IF NOT EXISTS idx_whale_timestamp ON whale_transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whale_blockchain ON whale_transactions(blockchain);
CREATE INDEX IF NOT EXISTS idx_whale_token ON whale_transactions(token);
CREATE INDEX IF NOT EXISTS idx_whale_amount ON whale_transactions(amount_usd DESC);

CREATE TABLE IF NOT EXISTS known_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  label TEXT DEFAULT '',
  entity TEXT DEFAULT '',
  blockchain TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  UNIQUE(address, blockchain)
);

CREATE INDEX IF NOT EXISTS idx_ka_entity ON known_addresses(entity);
CREATE INDEX IF NOT EXISTS idx_ka_address ON known_addresses(address);
CREATE INDEX IF NOT EXISTS idx_ka_blockchain ON known_addresses(blockchain);

CREATE TABLE IF NOT EXISTS entity_holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  address TEXT NOT NULL,
  address_label TEXT DEFAULT '',
  blockchain TEXT NOT NULL,
  token TEXT DEFAULT '',
  balance REAL DEFAULT 0,
  balance_usd REAL DEFAULT 0,
  price REAL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(entity, address, token)
);

CREATE INDEX IF NOT EXISTS idx_holdings_entity ON entity_holdings(entity);
CREATE INDEX IF NOT EXISTS idx_holdings_blockchain ON entity_holdings(blockchain);
CREATE INDEX IF NOT EXISTS idx_holdings_updated ON entity_holdings(updated_at DESC);

CREATE TABLE IF NOT EXISTS entity_token_holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  address TEXT NOT NULL,
  blockchain TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT DEFAULT '',
  balance REAL DEFAULT 0,
  balance_usd REAL DEFAULT 0,
  price REAL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(entity, address, token_symbol)
);

CREATE INDEX IF NOT EXISTS idx_token_holdings_entity ON entity_token_holdings(entity);

CREATE TABLE IF NOT EXISTS api_rate_tracker (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  source           TEXT NOT NULL,
  called_at        TEXT NOT NULL,
  endpoint         TEXT DEFAULT '',
  response_status  INTEGER DEFAULT 200,
  records_returned INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rate_tracker_source_time ON api_rate_tracker(source, called_at);
