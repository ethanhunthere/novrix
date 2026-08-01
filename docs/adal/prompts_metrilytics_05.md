# PROMPT 05 — METRILYTICS: DATA DENSITY & FREE HISTORICAL-API INTEGRATION

**Version:** 1.0 | **Target:** Beat DeFiLlama + Artemis combined | **Agent:** AdaL (self-executing) | **Launched:** Launch Day (2026-08-01)

---

## ROLE DEFINITION

You are a **senior on-chain macro data engineer** with **20 years of experience** building analytics terminals for Glassnode, Nansen, Arkham, and Token Terminal. You live and breathe the free-tier data API landscape, and you know exactly how to extract institutional-grade historical charts **without paying a cent**.

You understand that DeFiLlama wins on TVL and Artemis wins on multi-chain revenue — but **both have blind spots** that Novrix will exploit to become the *single best free terminal*:

- **DeFiLlama** has deep protocol TVL/Fees but *zero* asset-price history, *zero* aggregate sentiment, and no on-chain fundamentals (hashrate, exchange netflows, difficulty).
- **Artemis** has multi-chain revenue but *zero* Fear & Greed, no per-asset long-horizon OHLC, and no aggregate market-cap history chart on the free tier.
- **Neither** gives a clean, launch-day-ready terminal with a live "top-20 coin" price panel, a total-crypto market-cap historical chart, a Fear & Greed index, and per-exchange liquidations.

Your mission: **Extend the Metrilytics page with multiple FREE historical data layers so that, on launch day, the page displays far more real, charted data than either competitor — with zero API spend.** Act like the on-chain veteran you are: wire free endpoints responsibly (rate-limit, idempotent backfills, graceful fallbacks), and never ship a panel that renders an empty shell.

---

## CONTEXT: WHAT ALREADY EXISTS (VERIFIED — DO NOT REBUILD)

The Metrilytics pipeline is already deep. Do **not** delete or rebuild what works. You are **additive-only**.

- **Cron:** `workers/metrilytics-cron/index.ts` (1,721 lines, runs daily 03:00 UTC). Steps: globalTvl, chainTvl, protocols, fees, dexVolumes, stablecoins, defiOpenInterest, binanceDerivatives, yields, optionsVolume, btcPrices, ethPrices, solPrices, lendingData, bridgeData, marketData, dexNetworks, liquidations, etfAndInstitutional, protocolMcap, summary.
- **D1:** `METRILYTICS_DB`. Migrations 001-006 in `database/migrations/metrilytics/`.
- **APIs:** `functions/api/metrilytics/*.ts` (index, chains, protocols, protocol/[slug], fees, dex, stablecoins, derivatives, yields, lending, bridges, market, options, prices, dex-networks, **etf, liquidations, protocol-compare**).
- **Frontend:** `components/metrilytics/MetrilyticsBody.tsx` (3,177 lines, 18+ panels) + `components/metrilytics/panels/*` (DeFiCategories, Fundraising, **ETF, EnhancedYield, Liquidations, ProtocolCompare**).
- **Prefetch:** `lib/terminalModulePrefetch.ts` `METRILYTICS_PREFETCH_URLS`.
- **Client cache:** `lib/bootCache.ts` + `sessionStorage` key `novrix_metrilytics_v9`.

---

## TRUTH: CURRENT BUILD IS BROKEN — BEFORE ANY FEATURE, MAKE IT GREEN

The recent Prompts 01-04 left the type system broken. **You cannot launch on a red build.** FIX ALL of these before adding anything:

- `functions/api/metrilytics/etf.ts` (lines 75, 78, 167, 173) — `unknown` rows, bad date/arithmetic types.
- `functions/api/metrilytics/liquidations.ts` (lines 172, 248, 352, 370, 386, 393, 410, 414) — `unknown` -> `number[][]`, `{}` not assignable to Date/number.
- `functions/api/metrilytics/protocol-compare.ts` (lines 133, 137, 138) — `{}` not number.
- `workers/metrilytics-cron/index.ts` (lines 1604, 1606) — `companies` on `{}`.
- `components/metrilytics/panels/ETFPanel.tsx` (105, 152, 153), `EnhancedYieldPanel.tsx` (163, 164), `LiquidationsPanel.tsx` (228, 229), `ProtocolComparePanel.tsx` (203, 255, 256) — Recharts `formatter` signature + `json` typed as `unknown`.
- `components/metrilytics/MetrilyticsBody.tsx` (3051, 3053) — `PanelId` union missing `'etf'` and `'protocol-compare'`.

**GATE 0 (must pass before proceeding):** `npx tsc -p functions/tsconfig.json --noEmit`, `npx tsc -p workers/tsconfig.json --noEmit`, and `npx tsc --noEmit` all exit 0.


---

## THE 5 FREE DATA LAYERS TO ADD

Design each layer as: **schema migration → idempotent cron ingester → Pages Function API → frontend panel wired into `renderPanel` + `DEFAULT_PANELS` + `PanelId` + prefetch URLs**. Keep the terminal aesthetic (JetBrains Mono, amber/blue/green/red, sparse grids).

---

### LAYER 1 — FEAR & GREED INDEX (alternative.me — 100% free, no key)

- **Feed:** `https://api.alternative.me/fng/?limit=0` returns full daily history since 2018 (value, value_classification, timestamp). Free, keyless.
- **Migration 007:** `fear_greed (date TEXT PRIMARY KEY, value INTEGER, classification TEXT, timestamp TEXT)`.
- **Cron:** `fetchFearGreed()` — get coverage `MIN(date)/MAX(date)`, backfill missing dates only.
- **API:** `GET /api/metrilytics/fear-greed` -> `{ series: [{date, value, classification}], latest: {value, classification}, change_7d, change_30d, avg_30d }`.
- **Panel:** `FearGreedPanel.tsx` — big current score gauge, colored classification chip, 30/90-day line chart, 7d & 30d deltas. Add to `DEFAULT_PANELS`.
- **Indicators:** one `IndicatorDefinition` in `buildIndicators` (category `'Sentiment'`).

---

### LAYER 2 — TOTAL CRYPTO MARKET-CAP HISTORY (CoinGecko free `/global/market_cap_chart`)

- **Feed:** `https://api.coingecko.com/api/v3/global/market_cap_chart?days=365&vs_currency=usd` returns `{ market_cap: [[ts, val]...], total_volume: [[ts, val]...] }`. Free tier, apply REQUEST_DELAY_MS so it never 429s the daily run.
- **Migration 008:** `market_cap_history (date TEXT PRIMARY KEY, total_market_cap_usd REAL, total_volume_24h_usd REAL, btc_dominance REAL, eth_dominance REAL)`.
- **API:** `GET /api/metrilytics/market-history` -> `{ series: [{date, mcap, volume, btc_dominance}], latest, ytd_change, drawdown_from_ath }`.
- **Cron:** `fetchMarketCapHistory()` — CoinGecko allows 365d on free tier, also fetch 90d and merge so near-term is dense. Idempotent via INSERT OR REPLACE.
- **Panel:** `MarketCapHistoryPanel.tsx` — stacked mcap+volume area chart with 1M/3M/1Y/ALL range buttons; `ytd_change` and `drawdown_from_ath` stat chips.

---

### LAYER 3 — TOP-20 COIN PRICE HISTORY (CoinGecko free `/coins/{id}/market_chart`)

- **Universe:** top 20 by mcap from `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1`.
- **Feed per coin:** `https://api.coingecko.com/api/v3/coins/{id}/market_chart?vs_currency=usd&days=365` -> `{ prices: [[ts, px]...], total_volumes, market_caps }`. **Rate-limit:** 20 coins x 2 calls = 40 calls; stay under free tier. Serialize with delay, skip coins already fresh (< 24h) unless never seen.
- **Migration 009:** `coin_price_history (coin_id TEXT, symbol TEXT, name TEXT, date TEXT, price_usd REAL, market_cap_usd REAL, volume_24h_usd REAL, PRIMARY KEY (coin_id, date))`.
- **API:** `GET /api/metrilytics/coins?days=365&ids=` -> `{ coins: [{id, symbol, name, price, change_24h, change_7d, change_30d, series: [{date, price}]}] }`.
- **Panel:** `TopCoinsPanel.tsx` — sortable leaderboard of top-20 coins (rank, symbol, price, 24h/7d/30d %), row-expand into a sparkline + mini area chart of selected coin's history.
- **Cron:** `fetchTopCoins()` after `fetchMarketData`.

---

### LAYER 4 — HISTORICAL FUNDING & OPEN INTEREST (Binance public futures — free)

- **Feeds (no key):**
  - Funding: `https://fapi.binance.com/fapi/v1/fundingRate?symbol={S}USDT&limit=1000`.
  - OI history: `https://fapi.binance.com/futures/data/openInterestHist?symbol={S}USDT&period=1d&limit=500`.
- **Migration 010:** `derivatives_history (symbol TEXT, date TEXT, funding_rate REAL, open_interest_usd REAL, PRIMARY KEY (symbol, date))`. Separate from `derivatives_data` snapshots.
- **API:** `GET /api/metrilytics/derivatives-history?symbol=BTC&days=365`.
- **Upgrade:** enhance `DerivativesPanel` (or add `FundingHistoryPanel`) to render a funding-rate area chart + OI line on the same axis with a symbol toggle (BTC/ETH/SOL).
- **Cron:** `fetchDerivativesHistory()` — daily for BTC/ETH/SOL, append newest first.

---

### LAYER 5 — ON-CHAIN FUNDAMENTALS (blockchain.info free charts)

- **Feeds (keyless, `format=json&timespan=365days`):**
  - Hashrate: `https://api.blockchain.info/charts/hash-rate?timespan=365days&format=json`
  - Difficulty: `https://api.blockchain.info/charts/difficulty?timespan=365days&format=json`
  - Active addresses: `https://api.blockchain.info/charts/n-unique-addresses?timespan=365days&format=json`
- **Migration 011:** `onchain_fundamentals (date TEXT PRIMARY KEY, hashrate REAL, difficulty REAL, active_addresses REAL)`.
- **API:** `GET /api/metrilytics/onchain` -> `{ series: [{date, hashrate, difficulty, active_addresses}], latest, pct_change_30d }`.
- **Panel:** `OnchainFundamentalsPanel.tsx` — three mini charts (hashrate, difficulty, active addresses) + 30d change chips. Add to `DEFAULT_PANELS`.
- **Cron:** `fetchOnchainFundamentals()` — three keyless calls, idempotent.

---

## WIRING & INTEGRATION (required for every layer)

- Add every new panel id to the `PanelId` union (incl. fixing `'etf'` + `'protocol-compare'`), `PANEL_DOM_ID`, `renderPanel` switch, and a sensible default position in `DEFAULT_PANELS` (respect `MAX_ACTIVE_PANELS = 5` — that constant caps *simultaneously visible* panels; the `default` set is the launch-order baseline).
- Add every new API URL to `METRILYTICS_PREFETCH_URLS`.
- Extend `buildIndicators` (MetrilyticsBody ~L2461) with 1-2 new `IndicatorDefinition`s per layer so the collapse/command-line overview surfaces the new data.
- Add a Chip to the panel data-loading union in `fetchAll` — or, where the panel self-fetches (as ETF/Liquidations/ProtocolCompare already do), keep that pattern and register the URL for prefetch only.

## QUALITY GATES (ALL REQUIRED — launch is today)

- [ ] `npx tsc -p functions/tsconfig.json --noEmit` → 0 errors.
- [ ] `npx tsc -p workers/tsconfig.json --noEmit` → 0 errors.
- [ ] `npx tsc --noEmit` (app) → 0 errors.
- [ ] `pnpm build` completes (webpack export to `out/`).
- [ ] Every new DB table has a matching cron ingester + API + panel — no orphan layers.
- [ ] Every new panel has loading skeleton, empty-state fallback, and error handling.
- [ ] No new npm dependencies beyond what's already installed (recharts is available).
- [ ] No console.log in production components (cron logging is fine).
- [ ] Rate limits respected: CoinGecko calls serialized with `REQUEST_DELAY_MS`, skip-if-fresh.
- [ ] Idempotent: re-running cron twice yields identical rows (INSERT OR REPLACE/IGNORE).
- [ ] Terminal aesthetic preserved.

---

## EXECUTION ORDER

1. **Gate 0:** fix every type error listed above; green `tsc` for functions, workers, app.
2. **Layer 1** (Fear & Greed) end-to-end — smallest, highest-visibility win.
3. **Layer 2** (market-cap history).
4. **Layer 3** (top-20 coins).
5. **Layer 4** (funding/OI history).
6. **Layer 5** (on-chain fundamentals).
7. Wire all into `DEFAULT_PANELS` + prefetch + indicators.
8. Final `tsc` + `pnpm build`; report file-by-file.

---

## REPORT

After executing, report:
- Every file changed/created (path).
- Every `tsc` project result (0 errors).
- Which panels are now default-visible on load.
- Which free APIs are wired and their refresh cadence.
- Any layer you had to downgrade/bundle and why.

