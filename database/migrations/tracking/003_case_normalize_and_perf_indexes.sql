-- 003: Expression indexes for the LOWER() join predicates used by the
-- entity/holdings APIs.
--
-- IMPORTANT: we deliberately do NOT rewrite stored address casing.
-- EVM addresses are case-insensitive hex, but Solana and Tron use base58
-- where case is significant — a blanket LOWER() backfill would corrupt
-- canonical addresses and break explorer links. Instead, SQLite expression
-- indexes let the query planner use an index for LOWER(col) = LOWER(?)
-- predicates with zero data mutation. Idempotent: safe to re-run.

CREATE INDEX IF NOT EXISTS idx_whale_sender_lower   ON whale_transactions(LOWER(sender));
CREATE INDEX IF NOT EXISTS idx_whale_receiver_lower ON whale_transactions(LOWER(receiver));
CREATE INDEX IF NOT EXISTS idx_whale_ts             ON whale_transactions(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_known_address_lower  ON known_addresses(LOWER(address));
CREATE INDEX IF NOT EXISTS idx_known_entity_lower   ON known_addresses(LOWER(entity));

CREATE INDEX IF NOT EXISTS idx_holdings_address_lower ON entity_holdings(LOWER(address));
CREATE INDEX IF NOT EXISTS idx_holdings_entity_lower  ON entity_holdings(LOWER(entity));

