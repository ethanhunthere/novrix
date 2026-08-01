# ROADMAP — 20 Prompts (10 × Tracking + 10 × Metrilytics)

> Statusi: 2026-08-01 · POC f0id · 2 × KIMI-K3 agjentë (jeme unë këtu + një tjetër në CLI tjetër).
> Çdo prompt i dorëzohet me workflow 2-CLI: njëri prompt njërit agjent, tjetri prompt agjentit tjetër, paralelisht.
> Çdo promp ekspert: "senior on-chain analist / DeFi data engineer, 20 vjet eksperiencë (Glassnode / Nansen / Arkham / DeFiLlama-grade rigor)".
> Rregull global për çdo prompt: asnjë regression, ndryshime additive-only, `tsc --noEmit` + `pnpm build` të kalojnë, raport i detajuar në fund.

---

## RRETH — FAKTE TË VERIFIKUARA (2026-08-01)

### TRACKING (`components/tracking/TrackingBody.tsx` 2428 LOC + `WeeklyVolumeChart.tsx`)
- **Feed balenash** live: kolona chain, drejtim (Exchange Inflow/Outflow/Transfer, Mint, Burn, Miner Movement), sender/receiver + labels, USD+native, age, tx hash. Filtrat: chain, token, prag USD, flow. Pagination.
- **Stats strip**: total volume, tx, largest tx, inflow/outflow/net_flow, by-chain, by-token, avg_tx_usd, unique_entities.
- **Window stats tashmë ekzistojnë** në API (`window_24h`, `window_7d`, `prev_24h`, `prev_7d`) — duhet vetëm lidhja në UI.
- **Entity Radar / Watchlist**: listë e madhe exchanges (Binance, Coinbase, Kraken, OKX, Bybit...), categories (ETF/Exchange/Corporate/Government/DeFi/Whale/MM/Fund/Miner/VC/Stablecoin), leaderboard, holdings per entity.
- **Address detail**: `app/tracking/address/page.tsx` (497 LOC).
- API: `/api/tracking/`, `/api/tracking/weekly`, `/api/address/`, `/api/entities/`, `/api/holdings/`.
- Cron: 15 min, 14 chains (BTC, ETH, ERC20, SOL, TRX, TRC20, SUI, SEI, XRP, NEAR, Base, Arbitrum, Polygon, BSC, Optimism, Avalanche), multi-source fallback, cursor-based, label Map nga `lib/trackingSeed.ts` (15k LOC).
- Migrim i ri i pa-commituar: `003_case_normalize_and_perf_indexes.sql` (expression indexes, pa rishkruar casing).

### METRILYTICS (`components/metrilytics/MetrilyticsBody.tsx` 3177 LOC + panels/)
Panels (renderPanel): Overview, Tvl, Protocol, Fees, Dex, Stablecoin, Yield, Options, BtcPrice, DexPaprika, MarketStructure, Bridges, Lending, DeFiCategories, Fundraising, + **Derivatives** dhe **Liquidations**.
- **LiquidationsPanel = STUB AKTUAL** (~L2254): `OI × |funding| × 0.15` — JO likuidime reale.
- API: `functions/api/metrilytics/*` (index, market, protocols, protocol/[slug], stablecoins, dex, fees, lending, bridges, yields, derivatives, options, prices, dex-networks, chains).
- Cron: `workers/metrilytics-cron/index.ts` — daily 03:00 UTC (shumë i trashë për derivatives), funcs: fetchGlobalTvl..fetchSolPrices, updateSummary.
- Fallback klienti: `applyHistoricalFallbacks` (L598) → API të jashtme kur D1 <365d.
- Gaps: borrowed_usd NULL, tokens_count NULL, options të cekëta, asnjë ETF flows/CME basis/perp-DEX OI, asnjë korrelacion/heatmap, asnjë ratio chart, yields pa IL split, asnjë freshness indicator per panel.

---

## PLANI I 20 PROMPTAVE

### TRACKING — 10 PROMPTA
| # | Titull | Fokus |
|---|--------|-------|
| 1 | Hardened Whale Feed + Netflow Panels | Stabilizimi i feed-ut, exchange netflow 24h/7d, delta UI, freshness chips |
| 2 | Entity Radar Deep I | Stockpiling/distribution analytics, accumulation streaks, smart-money flows |
| 3 | Address Intelligence Layer | Address page: risk scoring, counterparty graph, first/last active, balance history |
| 4 | Multi-Source Enrichment | ENS/SNS resolution, community labels, token labels me shumë data providers |
| 5 | Alert & Notification Engine | Big-move triggers, per-threshold alerts, email/webhook/dispatch, dedup |
| 6 | Cross-Chain Flow / Bridges | Stablecoin flows, bridge-flow detection, cross-chain capital movement |
| 7 | Analytics & Export Layer | CSV/JSON export, advanced filters, saved views, shareable query permalinks |
| 8 | Smart-Money & Dormancy | Coin dormancy, realized-cap age bands, whale aging, accumulation distribution |
| 9 | Exchange Reserve & Balance Model | Per-exchange net reserve, reserve axis, treasury tracking (MSTR etc.) |
| 10 | Real-time + Polish | WebSocket/poll upgrade, performance, a11y, empty/error states, onboarding tour |

### METRILYTICS — 10 PROMPTA
| # | Titull | Fokus |
|---|--------|-------|
| 1 | Data Integrity + Real Liquidations | Freshness matrix, `last_updated` per panel, zëvendësimi i stub likuidimeve me të dhëna reale (Binance/Bybit forceOrders) |
| 2 | Derivative Depth | Perp-DEX OI (Hyperliquid/dYdX), CME futures basis, funding heatmap, ETF flows |
| 3 | Ratio & Valuation Analytics | fees/TVL, mcap/TVL, P/S-style, revenue leaders, protocol health scores |
| 4 | Correlation & Macro Overlay | Asset correlation heatmap, macro regime flags, BTC dominance vs DeFi |
| 5 | Yields Deep-Dive | IL risk flags, reward-vs-fee APY split, pool history, yield tiering |
| 6 | Lending & Borrowing Market | borrowed_usd fix, borrow rates, collateralization, top borrowers, liquidation thresholds |
| 7 | Stablecoin & Money Printing | Issuer breakdown, stablecoin velocity, peg health, market-cap vs reserve |
| 8 | Bridge & Interoperability | Bridge TVL/netflows, cross-chain velocity, top bridge routes, security flags |
| 9 | DeFi Categories & Fundraising | Sektori i thellë (DeFiCategoriesPanel), fundraising detail, investor leaderboard |
| 10 | Freshness, Alerts & Polish | Per-panel freshness chips, anomaly flags, real-time tick, performance, export |

---

## SI E SHPPËRNDAJMË (WORKFLOW 2-CLI)
- Unë (këtu) = Agjenti A (KIMI-K3).
- CLI tjetër = Agjenti B (KIMI-K3).
- Çdo raund: keni unë P1(M) dhe P1(T) — njërin ma jepni mua, tjetrin agjentit B.
- Pasi të dy përfundojnë, më ktheni rezultatet për rishikim/merge, pastaj shkojmë te Round 2 (P2(M)+P2(T)).
