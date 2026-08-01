# PROMPT 1/10 — METRILYTICS PAGE · Copy gjithçka nga kjo rresht dhe dërgoja agjentit

---

# ROLE

You are a senior DeFi / macro-crypto data engineer with 20 years of institutional experience (Glassnode, DeFi Llama, Artemis, Token Terminal, Nansen-grade rigor). You work inside the Novrix repo at **/home/f0id/novrix**. You NEVER guess — you read the actual code before editing, make surgical changes, verify with `tsc --noEmit` + `pnpm build` and live D1 queries, and you treat every existing feature as sacred: **zero regressions**. You communicate decisions with evidence.

# PROJECT CONTEXT (VERIFIED 2026-08-01 — trust, but re-verify before each edit)

Novrix = Next.js 16 App Router **static export** on Cloudflare Pages + Pages Functions (`functions/api/**`) + cron Workers (`workers/**`) + **5 D1 databases**. This is the METRILYTICS page:

- **Shell**: `app/metrilytics/page.tsx` → `next/dynamic(ssr:false)` → `components/metrilytics/MetrilyticsBody.tsx` (**3177 LOC**) + `components/metrilytics/panels/DeFiCategoriesPanel.tsx` + `panels/FundraisingPanel.tsx`. Sidebar: `components/shared/IntelRegistry.tsx` (17+ indicator categories).
- **Panels** (rendered by `renderPanel()`): Overview, Tvl, Protocol, Fees, Dex, Stablecoin, Yield, Options, BtcPrice, DexPaprika, MarketStructure, Bridges, Lending, DeFiCategories, Fundraising, **Derivatives**, **Liquidations**.
- **CRITICAL — the LiquidationsPanel is currently a STUB** at `~L2254`: it computes `OI x |funding| x 0.15` and is titled "Liquidation Risk Estimate". This is NOT real liquidation data and must be replaced in this prompt.
- **APIs** (`functions/api/metrilytics/*`, binding `METRILYTICS_DB`): index(summary KV), market, protocols, protocol/[slug], chains, stablecoins, dex, dex-networks, fees, lending, bridges, yields, derivatives, options, prices.
- **Cron**: `workers/metrilytics-cron/index.ts` — DAILY 03:00 UTC. Fetch functions (read their bodies): fetchGlobalTvl, fetchChainTvl, fetchProtocols, fetchFees, fetchDexVolumes, fetchStablecoins, fetchDefiOpenInterest, fetchBinanceDerivatives, fetchYields, fetchOptionsVolume, fetchBtcPrices, fetchLendingData, fetchBridgeData, fetchMarketData, fetchDexNetworks, fetchEthPrices, fetchSolPrices, then updateSummary.
- **Client fallback**: `applyHistoricalFallbacks` (~L598 in MetrilyticsBody) calls external APIs directly when D1 history < 365d. `sessionStorage` cache `novrix_metrilytics_v9` 1h TTL.
- **D1** (migrations `database/migrations/metrilytics/`): 001 -> chain_tvl, protocol_tvl, protocol_fees, dex_volumes, stablecoin_supply, stablecoin_total, derivatives_data, yields_data, options_volume, btc_prices. 002 -> lending_data, bridge_data, market_data, token_prices, dex_networks, eth_prices, sol_prices.
- Client prefetch: `lib/terminalModulePrefetch.ts` (`METRILYTICS_API_URLS` + `METRILYTICS_PREFETCH_URLS`).

**Known verified gaps (in priority):**
1. LiquidationsPanel = fake estimate (real liquidations missing).
2. `lending_data.borrowed_usd` often NULL (sub-adapter gaps).
3. `dex_networks.tokens_count` frequently NULL — UI renders `0` instead of `—`.
4. No per-panel freshness indicators / `last_updated` surfaced to user.
5. Daily cron cadence too coarse for derivatives (funding/OI) — liquidations/OI need an hourly schedule.
6. No ratio charts (fees/TVL, mcap/TVL), no anomaly flags.

# YOUR TASK (Prompt 1 of 10): DATA INTEGRITY, PER-PANEL FRESHNESS + REPLACE THE FAKE LIQUIDATIONS WITH REAL DATA

Do these in order. Work autonomously — make the senior call, document it.

## A. Verify the pipeline is alive (evidence first)
1. Read root `wrangler.toml` + `workers/metrilytics-cron/wrangler.toml`. Confirm `METRILYTICS_DB` binding name matches what `functions/api/metrilytics/*` read from `context.env`.
2. Live D1 health (use `npx wrangler d1 execute novrix-metrilytics-db --remote --command "..."`): for EVERY table in migrations 001+002, report `COUNT(*)` and `MAX(date)`/`MAX(updated_at)`. Build a **freshness matrix**. Flag any table whose freshest row is > 2 days old — read the exact cron fetch function for that vertical and state the precise failure mode (HTTP error, schema drift, parse error, silent catch/logWarn path).
3. Curl `/api/metrilytics`, `/api/metrilytics/market`, `/api/metrilytics/derivatives`, `/api/metrilytics/yields`, `/api/metrilytics/lending` — confirm non-empty, sane payloads; paste trimmed JSON.

## B. Per-panel freshness indicators
1. Every API response under `functions/api/metrilytics/` must include a `last_updated` field (max date of the underlying rows). Most already return data — audit each and ADD `last_updated` where missing (additive only, never reshape existing keys).
2. In MetrilyticsBody, plumb `last_updated` into each panel via a small shared `<FreshnessChip timestamp>` component, rendered in the panel header (colocate a new small file `components/metrilytics/FreshnessChip.tsx`). Style with EXISTING palette tokens (`--text-tertiary`, `--status-nominal` green, `--status-caution` amber, `--status-critical` red) — do NOT introduce new colors.
3. For any panel where `last_updated` is genuinely impossible (pure-aggregate KV like summary), say so explicitly in the report and render "Updated by daily cron" instead.

## C. Replace the Liquidations stub with REAL data (highest value)
1. Source real liquidation events. Preferred: Binance Futures public `GET https://fapi.binance.com/fapi/v1/allForceOrders?symbol=BTCUSDT&limit=1000` (public, no auth) for BTCUSDT/ETHUSDT/SOLUSDT. FIRST curl it to confirm it responds. If Binance geo-blocks (HTTP 451) or works poorly, use `https://fapi.binance.com/fapi/v1/forceOrders?symbol=...` variants or **Bybit** public `GET https://api.bybit.com/v5/market/...` liquidation endpoints — document which source you chose and why, with curl evidence.
2. Cron: add a `fetchLiquidations()` task in `workers/metrilytics-cron/index.ts` writing new table `liquidations_data` (migration `003_liquidations.sql`): columns symbol, side (LONG/SHORT), price, qty, usd_value, ts, `PRIMARY KEY(symbol, ts, price, qty)`. Also maintain an hourly-bucket aggregate `liquidations_hourly` (symbol, hour, long_liq_usd, short_liq_usd).
3. Add a SECOND trigger to `workers/metrilytics-cron/wrangler.toml`: `crons = ["0 3 * * *", "0 * * * *"]` — gate: liquidations (and optionally derivatives refresh) run on the hourly tick, while daily DeFiLlama summary tasks stay on 03:00. Distinguish by reading `event.cron` in the scheduled handler. Respect the existing `logWarn`/`runStep` patterns.
4. API: add `functions/api/metrilytics/liquidations.ts` following the exact style of `functions/api/metrilytics/lending.ts` (read it first as template). Return 24h totals per symbol (long vs short) plus a 7d hourly series.
5. UI: rewrite `LiquidationsPanel` (~L2254) to render: (a) 24h long/short liquidation totals per asset as bar pairs; (b) 7d stacked area (long red / short green — match existing RED `#C2344D` and GREEN `#22C55E`); (c) delete the old `OI x |funding| x 0.15` estimate formula entirely — it must appear NOWHERE. Register the new endpoint in `lib/terminalModulePrefetch.ts` (`METRILYTICS_API_URLS.liquidations` + `METRILYTICS_PREFETCH_URLS`).
6. Handle no-data / first-run with a `DataUnavailable` state (component exists ~L1060) plus a `last_updated` chip showing when liquidations were last synced.

## D. Lending + DEX null fixes
1. In the cron's lending task (`fetchLendingData`): when DeFiLlama's sub-adapter omits `borrowed_usd`, attempt `https://api.llama.fi/protocol/<slug>` detail fetch (exposes per-chain `currentChainTvls.borrowed` for major lending protocols) before writing NULL. Cap detail fetches to the top 15 lending protocols by TVL to stay within cron CPU limits (reuse any existing `ctx.waitUntil`/batching pattern — read it first).
2. For `dex_networks.tokens_count`: if DexPaprika omits it, leave NULL but stop showing `0` in the UI — render `—`. Fix the null-formatting where the DEX network panel renders tokens_count.

## E. Guardrails (non-negotiable)
- DO NOT rename files. API changes are ADDITIVE ONLY (new fields/endpoints; never reshape existing keys/shapes).
- DO NOT touch tracking / sentiment / terminal pages.
- Migrations additive only (CREATE TABLE/INDEX/ADD COLUMN); never DROP.
- Preserve existing comments; add comments only for non-obvious logic.
- After edits: `cd /home/f0id/novrix && npx tsc --noEmit` clean, then `pnpm run build` passes.
- Verify the new liquidations endpoint with curl; include trimmed JSON in the report.

# DELIVERABLE REPORT (end of run)
1. Freshness matrix — table-by-table: count + max date + stale? + exact diagnosis.
2. Files changed, one-line why each.
3. Liquidations: chosen source + curl evidence it works + sample API response.
4. Freshness chips: which panels got them; any panel where `last_updated` was impossible (explain).
5. Lending borrowed_usd fill-rate before vs after your cron change (run the fetch logic manually for >=3 protocols as proof).
6. Typecheck + build proof.
7. What Prompt 2 should tackle next (suggest: derivative depth — perp-DEX OI Hyperliquid/dYdX, CME basis, ETF flows).

Work autonomously. Make the senior call, document it in the report.
