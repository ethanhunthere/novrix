-- Tracking DB Migration 002
-- Fixes whale_transactions.signature from a single-column UNIQUE constraint to
-- a composite UNIQUE(signature, blockchain, token). A single raw tx hash can
-- legitimately produce more than one row (e.g. a Solana tx that moves both
-- native SOL and USDC, or an ETH tx that swaps USDT for USDC) — under the old
-- single-column constraint, INSERT OR IGNORE silently dropped every row after
-- the first one sharing that hash. SQLite has no ALTER TABLE for constraints,
-- so this rebuilds the table.

CREATE TABLE whale_transactions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  signature TEXT NOT NULL,
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
  transaction_type TEXT DEFAULT 'transfer',
  UNIQUE(signature, blockchain, token)
);

INSERT INTO whale_transactions_new
  (id, signature, amount_usd, amount_native, flow_type, sender, receiver,
   sender_label, receiver_label, timestamp, blockchain, token, token_name,
   source, block_height, is_pending, transaction_type)
SELECT
  id, signature, amount_usd, amount_native, flow_type, sender, receiver,
  sender_label, receiver_label, timestamp, blockchain, token, token_name,
  source, block_height, is_pending, transaction_type
FROM whale_transactions;

DROP TABLE whale_transactions;
ALTER TABLE whale_transactions_new RENAME TO whale_transactions;

CREATE INDEX IF NOT EXISTS idx_whale_timestamp ON whale_transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whale_blockchain ON whale_transactions(blockchain);
CREATE INDEX IF NOT EXISTS idx_whale_token ON whale_transactions(token);
CREATE INDEX IF NOT EXISTS idx_whale_amount ON whale_transactions(amount_usd DESC);
