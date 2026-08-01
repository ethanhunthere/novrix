# AUDIT: Tracking & Metrilytics Pages
**Date:** 2026-08-01 | **POC:** AdaL + 2x KIMI K3 agents | **Goal:** Fill both pages with rich, real data by tomorrow

---

## CURRENT STATE — TRACKING PAGE

### Files
- `app/tracking/page.tsx` (44 lines) — Dynamic import shell, ssr:false, AuthGuard
- `app/tracking/layout.tsx` — SEO metadata
- `components/tracking/TrackingBody.tsx` (2429 lines) — Main engine
- `components/tracking/WeeklyVolumeChart.tsx` (9.8KB) — 12-week volume chart
- `app/tracking/address/page.tsx` — Single address detail view
- `functions/api/tracking/index.ts` — Main feed API
- `functions/api/tracking/weekly.ts` — Weekly aggregation API
- `database/migrations/tracking/001_tracking.sql` — DB schema

### UI Sections (Left Panel: Flow Monitor)
1. Rolling Window Stats — 4 tiles (24H Vol, 24H Net, 7D Vol, 7D Net)
2. Chain Filters — 14 chain toggle buttons
3. Threshold Presets — $10K to $1M+ quick filters
4. Filter Bar — Chain/Flow/Token dropdowns
5. Live Feed — Transaction tape (Chain, Dir, From, To, Value, When, TX)
   - Row states: Whale New flash, Exceptional ($50M+), Pending
   - Expandable detail rows, copy-to-clipboard
   - Load More pagination

### UI Sections (Right Panel: Entity Radar)
6. Watchlist Grid — Featured entities with TX count + portfolio value
7. Entity Detail Panel — Stats, allocation bar, holdings, recent movements
8. Leaderboard — Global by portfolio value/volume
9. Market Makers Panel — OTC desks ranking (Wintermute, Jump, etc.)

### Data Feeds
| Feature | Endpoint | Refresh |
|---|---|---|
| Live Feed | `/api/tracking/?limit=100&offset=X` | 30s |
| Weekly Chart | `/api/tracking/weekly?weeks=12` | Once |
| Search | `/api/address/?q=...` | Debounced |
| Entity List | `/api/entities/?limit=50` | Once |
| Entity Detail | `/api/entities/?entity=...` | On click |
| Holdings | `/api/holdings/?entity=...` | On click |
| Leaderboard | `/api/holdings/?top=50` | Once |

### Gaps
- ENTITY_REGISTRY has placeholder entries with empty `addresses: {}`
- No address clustering heuristics beyond known labels
- No historical whale behavior analytics
- No cross-chain entity resolution
- No alert/notification system
- WeeklyVolumeChart is basic (single metric)

---

## CURRENT STATE — METRILYTICS PAGE

### Files
- `app/metrilytics/page.tsx` (41 lines) — Dynamic import shell, ssr:false
- `app/metrilytics/layout.tsx` — SEO metadata
- `components/metrilytics/MetrilyticsBody.tsx` (3177 lines) — Main engine
- `components/metrilytics/panels/DeFiCategoriesPanel.tsx`
- `components/metrilytics/panels/FundraisingPanel.tsx`
- `functions/api/metrilytics/*.ts` — 15 API endpoints
- `database/migrations/metrilytics/001_metrilytics.sql` — DB schema

### UI Panels (16 total)
1. Overview Panel — 5 metric tiles
2. TVL Panel — Stacked area chart, chain list
3. Fees Panel — Area chart, top 10 progress bars
4. Protocol Board — Expandable list with mini charts
5. DEX Panel — Multi-chain bar chart
6. Stablecoin Monitor — Stacked area, peg alerts
7. Derivatives Radar — OI/funding/L-S tabs
8. Yield Screen — Best stable card, top 10, composed chart
9. Options Flow — Area chart, top chains
10. BTC Anchor — OHLC chart, 24h high/low
11. Lending Intel — Borrow/supply rates, APY grid
12. Bridges Monitor — Top 5 tiles, share table
13. Market Structure — MCap tiles, sparklines, scatter
14. Liquidations — Risk tiles, estimate card
15. DeFi Categories — Vertical bar, category ranking
16. Fundraising — Total/avg raised, monthly area chart

### Data Feeds
| Panel | Endpoint | Source |
|---|---|---|
| Overview | `/api/metrilytics` | D1 summary |
| TVL | `/api/metrilytics/chains` | D1 + DeFiLlama fallback |
| Fees | `/api/metrilytics/fees` | D1 |
| Protocols | `/api/metrilytics/protocols` | D1 |
| Protocol Detail | `/api/metrilytics/protocol/[slug]` | D1 |
| DEX | `/api/metrilytics/dex` | D1 |
| Stablecoins | `/api/metrilytics/stablecoins` | D1 |
| Derivatives | `/api/metrilytics/derivatives` | D1 |
| Yields | `/api/metrilytics/yields` | D1 |
| Lending | `/api/metrilytics/lending` | D1 |
| Bridges | `/api/metrilytics/bridges` | D1 |
| Market | `/api/metrilytics/market` | D1 + CoinPaprika |
| Options | `/api/metrilytics/options` | D1 |
| Prices | `/api/metrilytics/prices` | D1 |
| DEX Networks | `/api/metrilytics/dex-networks` | D1 |

### Gaps
- Liquidations are heuristic estimates, not real data
- No MEV/sandwich analytics
- No smart contract audit scores
- No governance participation metrics
- No insurance/Nexus Mutual data
- No NFT market data
- No RWA (real-world assets) tracking
- Limited historical depth (fallback to DeFiLlama for >365 days)
- No comparative analysis tools (protocol vs protocol)
- No custom alerting system

---

## SHARED INFRASTRUCTURE
- Both use: TerminalModulePageShell, BootSequence, DesktopGate, AuthGuard
- Both prefetch: `/lib/terminalModulePrefetch` + `useTerminalModulePrefetch`
- Both use: `bootCache` for client-side caching
- Both are desktop-only (DesktopGate blocks mobile)
- Styling: Tailwind v4, GSAP/Framer Motion, JetBrains Mono font
- Charts: Recharts (Metrilytics), custom SVG (Tracking)
