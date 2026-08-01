# PROMPT 07 — METRILYTICS: Perp DEX Analytics (Hyperliquid, dYdX, GMX)

**Role:** You are a senior DeFi derivatives analyst with 20 years of experience tracking perpetual DEX market structure, liquidity depth, and decentralized leverage positioning.

**Context:** Novrix Metrilytics tracks CEX derivatives (Binance, Bybit) but misses the fastest-growing segment: perpetual DEXes like Hyperliquid, dYdX, GMX, and Vertex. These now rival CEX volumes.

**File to modify:** `components/metrilytics/MetrilyticsBody.tsx` (new panel)

**New API endpoint:** `functions/api/metrilytics/perp-dex.ts`

**New DB tables:** `perp_dex_data` in METRILYTICS_DB

---

## TASK: Build Perp DEX Analytics Panel

### 1. Perp DEX Overview
- **Total Perp DEX OI:** Across all tracked protocols
- **24h Volume:** Aggregated
- **Top Protocol:** By OI and volume
- **DEX vs CEX Ratio:** Perp DEX OI / CEX perp OI

### 2. Protocol Breakdown
For each perp DEX (Hyperliquid, dYdX, GMX, Vertex, Aevo, etc.):
- **OI:** Total open interest
- **24h Volume:** Trading volume
- **Funding Rate:** Current average funding
- **Top Markets:** BTC, ETH, SOL, etc.
- **Chain:** Where it's deployed (Arbitrum, Hyperliquid L1, etc.)
- **Trend:** 7d OI change

### 3. Cross-DEX Comparison
- **OI Market Share:** Pie chart of perp DEX dominance
- **Volume Share:** Bar chart comparison
- **Funding Rate Spread:** Heatmap showing funding differences across DEXes
- **Arbitrage Opportunities:** Flag >0.05% funding spreads

### 4. Hyperliquid Deep Dive (if largest)
- **HLP TVL:** Hyperliquidity Provider total value locked
- **HLP APY:** Current yield for liquidity providers
- **Top Traders:** Leaderboard by PnL (if public data)
- **Liquidation Heatmap:** Where liquidations cluster

### 5. Perp DEX vs CEX Flow
- **OI Migration:** Net flow from CEX to DEX perps
- **Volume Migration:** % of total perp volume on DEX
- **Chart:** 30d trend of DEX perp market share

### Implementation:

**Cron worker:** Add to `workers/metrilytics-cron`
- Sources:
  - Hyperliquid: API (https://api.hyperliquid.xyz)
  - dYdX: Indexer API
  - GMX: Arbitrum subgraph or Stats API
  - Vertex: API
- Frequency: Hourly for OI/volume, daily for historical
- Store: protocol-level aggregates

**DB table:**
```sql
CREATE TABLE perp_dex_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protocol TEXT NOT NULL,
  chain TEXT NOT NULL,
  symbol TEXT NOT NULL,
  oi_usd REAL,
  volume_24h_usd REAL,
  funding_rate REAL,
  timestamp TEXT NOT NULL,
  UNIQUE(protocol, symbol, timestamp)
);

CREATE INDEX idx_perp_dex_time ON perp_dex_data(timestamp DESC);
```

**API (`functions/api/metrilytics/perp-dex.ts`):**
```typescript
// GET /api/metrilytics/perp-dex
{
  "overview": {
    "total_oi": 1234567890,
    "total_volume_24h": 567890123,
    "top_protocol": "Hyperliquid",
    "dex_cex_ratio": 0.35
  },
  "protocols": [
    {
      "name": "Hyperliquid",
      "chain": "Hyperliquid L1",
      "oi": 567890123,
      "volume_24h": 234567890,
      "funding_avg": 0.0001,
      "top_markets": ["BTC", "ETH", "SOL"],
      "change_7d": 12.5,
      "hlp_tvl": 234567890,
      "hlp_apy": 15.5
    }
  ],
  "market_share": {
    "oi": {"Hyperliquid": 45, "dYdX": 25, "GMX": 20, "Others": 10},
    "volume": {"Hyperliquid": 50, "dYdX": 22, "GMX": 18, "Others": 10}
  },
  "funding_spread": [
    {"symbol": "BTC", "min": 0.0001, "max": 0.0003, "spread": 0.0002}
  ]
}
```

**Frontend:**
- New panel: "PERP DEX" in Metrilytics grid
- Overview: 4 metric tiles
- Protocol table: sortable, expandable rows
- Market share: side-by-side pie charts
- Funding spread: table with min/max/spread

**Styling:**
- Hyperliquid: #97FCE4 (brand color)
- dYdX: #6966FF
- GMX: #2D42FC
- Positive funding: green, negative: red
- Arbitrage flag: amber border

**Edge Cases:**
- API unavailable for one protocol: show "Data unavailable" for that row
- New protocol launch: show "New" badge
- Zero volume: show "No recent activity"
