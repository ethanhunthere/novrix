# PROMPT 1/10 — TRACKING PAGE · Copy gjithçka nga kjo rresht dhe dërgoja agjentit

---

# ROLE

You are a senior on-chain data engineer and crypto-intelligence architect with 20 years of institutional experience (Chainalysis, Nansen, Arkham, Glassnode-grade rigor) building whale-tracking, fund-flow, and entity-surveillance systems. You work inside the Novrix repo at **/home/f0id/novrix**. You NEVER guess — you read the actual code before editing, make surgical changes, verify with `tsc --noEmit` + `pnpm build` and live D1 queries, and treat every existing feature as sacred: **zero regressions**. You communicate decisions with evidence.

# PROJECT CONTEXT (VERIFIED 2026-08-01 — trust, but re-verify before each edit)

Novrix = Next.js 16 App Router **static export** on Cloudflare Pages + Pages Functions (`functions/api/**`) + cron Workers (`workers/**`) + **5 D1 databases**. This is the TRACKING page:

- **Shell**: `app/tracking/page.tsx` → `next/dynamic(ssr:false)` → `components/tracking/TrackingBody.tsx` (**2428 LOC**) + `components/tracking/WeeklyVolumeChart.tsx` (260 LOC). Address drill-down: `app/tracking/address/page.tsx` (497 LOC). All gated behind `AuthGuard` (NOVRIX ID login).
- **APIs**: `functions/api/tracking/index.ts` (whale feed + stats + rolling windows), `functions/api/tracking/weekly.ts` (12-week aggregates), `functions/api/address/index.ts`, `functions/api/entities/index.ts`, `functions/api/holdings/index.ts`.
- **Cron**: `workers/tracking-cron/index.ts` — every 15 min, ingests whale transactions across 14 chains (Bitcoin, Ethereum, ERC20, Solana, Tron, TRC20, SUI, SEI, XRP, NEAR, Base, Arbitrum, Polygon, BSC, Optimism, Avalanche) with multi-source fallbacks, cursor-based ingestion (cron_state), in-memory labeling, institutional flow classification, 30-day retention with weekly snapshots. Prices via Binance/CoinGecko. Entity labels from `lib/trackingSeed.ts` (15k LOC).
- **D1** (binding `TRACKING_DB`, migrations `database/migrations/tracking/`): `whale_transactions` (uniq hash+chain+token, composite idx 002), `known_addresses`, `entity_holdings`, `entity_token_holdings`, `api_rate_tracker`. A NEW uncommitted migration `003_case_normalize_and_perf_indexes.sql` adds LOWER() expression indexes (do NOT rewrite stored address casing — Solana/Tron are base58 case-sensitive).
- **Client**: `lib/bootCache.ts` `fetchCached`; prefetch URLs in `lib/terminalModulePrefetch.ts` (`TRACKING_PREFETCH_URLS`).

**What ALREADY exists (verified — do not rebuild, build ON it):**
- Feed with filters (chain, token, USD threshold, flow), pagination, max-500 cap.
- Stats strip: total_volume, total_txs, largest_tx, inflow/outflow/net_flow, avg_tx_usd, unique_entities, most_active_chain, by_chain, by_token.
- **Rolling windows already in the API response**: `window_24h`, `window_7d`, `prev_24h`, `prev_7d` (filter-independent) — these exist server-side but need wiring into the UI stats strip with delta arrows.
- Entity Radar: watchlist (MicroStrategy, BlackRock, etc.), leaderboard, entity detail panel, holdings per entity, big exchange labels (Binance, Coinbase, Kraken, OKX, Bybit...), categories ETF/Exchange/Corporate/Government/DeFi/Whale/MM/Fund/Miner/VC/Stablecoin.

**Known verified gaps (in priority):**
1. Rolling window stats exist in API but NOT surfaced in the UI (no 24h/7d deltas, no delta arrows).
2. No exchange netflow aggregates (only per-tx direction — no "Binance net inflow" panel).
3. Entity detail panel still often empty ("No data available") when the cron hasn't pre-mapped an entity — no on-the-fly fallback from whale_transactions+known_addresses.
4. No smart-money analytics (accumulation streaks, dormancy, wallet age) — labels limited to seed.
5. No ENS/SNS resolution, no community/heuristic label expansion.
6. Address page lacks risk scoring, counterparty context, first/last active, balance history chart.
7. No alerts/notification layer for big-move triggers; polling only (no push).
8. No CSV/export; no stablecoin-flow or bridge-flow views.

# YOUR TASK (Prompt 1 of 10): HARDEN THE WHALE FEED + WIRE UP NETFLOW DELTAS + EXCHANGE NETFLOW PANEL

Work through these in order. Work autonomously — make the senior call, document it.

## A. Prove the pipeline is alive (evidence first)
1. Read root `wrangler.toml` + `workers/tracking-cron/wrangler.toml`. Confirm `TRACKING_DB` binding matches what `functions/api/tracking/index.ts` expects.
2. Live D1 (use `npx wrangler d1 execute novrix-tracking-db --remote --command "..."`): report `COUNT(*)` + `MAX(timestamp)` per table (`whale_transactions`, `known_addresses`, `entity_holdings`). If the freshest `whale_transactions` row is > 2h old the cron is stale — read the cron path for the affected chains and state the exact failure mode (rate limit, API change, parse error).
3. Curl `/api/tracking?limit=5` and `/api/tracking/weekly` — confirm `success:true`, stats present, `window_24h`/`window_7d` present, `data_freshness_seconds` sane. Paste trimmed JSON.

## B. Wire rolling-window deltas into the UI (the window stats already compute — surface them)
1. In `TrackingBody.tsx`, the stats strip currently shows only the session aggregate. Extend it to show **24h** and **7d** volume + **net flow** using the already-returned `window_24h`/`window_7d`/`prev_24h`/`prev_7d`.
2. Render delta arrows vs the previous equivalent window: ▲ green when up, ▼ red when down (match EXISTING palette — green `#10B981`/`#22C55E`, red `#EF4444`/`#C2344D`; do NOT introduce new colors). Show the % change (compute client-side from the two windows).
3. Label the windows clearly "24H" / "7D" and visually separate from the all-time/session aggregate. Keep changes surgical.

## C. Entity detail panel: kill the empty state with an on-the-fly fallback
1. Read the entity detail fetch logic in `TrackingBody.tsx` (~L1090–L1130) and `functions/api/entities/index.ts`. The panel shows "No data available" whenever the cron hasn't aggregated that entity.
2. Make the API resilient: when pre-aggregated holdings are missing, fall back to computing stats on-the-fly from `whale_transactions` (LOWER joins — reuse the new `003` expression indexes) + `known_addresses`: total_received, total_sent, net_flow, tx_count, last_active, top tokens by volume, 10 most recent transactions. Cache the computed result in KV (or a `computed_entity_stats` table) for 15 min to avoid repeated scans.
3. Graceful degradation in UI: if even the fallback finds nothing, show "Entity registered — no whale activity in the last 30 days" instead of a bare empty state.

## D. Add an Exchange Netflow panel (net inflow/outflow per exchange)
1. New endpoint `functions/api/tracking/netflow.ts` (follow the exact style of `functions/api/tracking/weekly.ts`): for 24h and 7d, aggregate by exchange label from `whale_transactions.sender_label`/`receiver_label` where the label is an exchange (match against a small const list of exchange labels from `TrackingBody.tsx`) → rows { exchange, inflow_usd, outflow_usd, net_usd } for both windows, plus previous windows for delta arrows. Budget the query with the same filter-independent window approach already used in `index.ts`.
2. UI: a new compact panel in `TrackingBody.tsx` (render inside the entities/radar area or as a section under the stats strip) listing top exchanges by absolute net flow with bars (inflow vs outflow), colored by sign. Load on-demand so it does not slow the primary feed — use existing `fetchCached` and add to `TRACKING_PREFETCH_URLS`.
3. Respect existing design tokens; no new colors; reuse `MetricTile`/existing helpers where reasonable (do not refactor unrelated code).

## E. Guardrails (non-negotiable)
- DO NOT rename files. API changes ADDITIVE ONLY (new fields/endpoints; never reshape keys the UI depends on).
- DO NOT touch sentiment / metrilytics / terminal pages.
- Migrations additive only (CREATE TABLE/INDEX/ADD COLUMN, or D1 expression indexes in a NEW `004_*.sql` if needed); never DROP.
- Preserve existing comments; add comments only for non-obvious logic.
- After edits: `cd /home/f0id/novrix && npx tsc --noEmit` clean, then `pnpm run build` passes.
- Verify new/updated endpoints with curl; include trimmed JSON.
- Reuse the existing uncommitted `003` migration — do not rewrite it or change its intent.

# DELIVERABLE REPORT (end of run)
1. Pipeline health: table row counts, freshest timestamps, cron diagnosis if stale.
2. Every file changed, one-line why.
3. Before/after of the `/api/tracking` response showing window stats (trimmed).
4. Entity panel: which previously-empty entities now render data (list them).
5. Netflow panel: sample `/api/tracking/netflow` JSON + how the UI renders it.
6. Typecheck + build proof.
7. Remaining risks / what Prompt 2 should tackle next (suggest: smart-money analytics — accumulation streaks, dormancy, wallet age; plus ENS/SNS resolution).

Work autonomously. Make the senior call, document it in the report.

