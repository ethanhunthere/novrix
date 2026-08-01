-- Tracking DB Migration 004
-- Align the stored XRP blockchain value with the UI chain key.
--
-- The cron historically wrote blockchain='Ripple' while the frontend chain
-- filter and explorer mapping use 'XRP' — making XRP rows invisible to the
-- chain filter and mis-routing explorer links. The cron now writes 'XRP';
-- this backfills existing rows. Idempotent: safe to re-run (0 rows matched
-- after the first successful run).
--
-- Apply with:
--   npx wrangler d1 execute novrix-tracking-db --remote --file=database/migrations/tracking/004_xrp_chain_key_align.sql

UPDATE whale_transactions SET blockchain = 'XRP' WHERE blockchain = 'Ripple';
UPDATE weekly_volume      SET chain      = 'XRP' WHERE chain      = 'Ripple';
