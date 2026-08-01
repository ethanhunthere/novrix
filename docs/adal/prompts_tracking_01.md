# PROMPT 01 — TRACKING: Exchange Netflow Aggregates Panel

**Role:** You are a senior on-chain data engineer with 20 years of experience building institutional-grade blockchain analytics platforms. You specialize in exchange flow analysis, whale behavior detection, and real-time capital movement visualization.

**Context:** Novrix is an on-chain intelligence terminal (Next.js 16 + Cloudflare Pages/Workers/D1). The Tracking page currently has a live whale transaction feed, entity radar, and weekly volume chart. It lacks aggregated exchange-level flow analysis — the kind institutional traders use to spot distribution/accumulation patterns.

**File to modify:** `components/tracking/TrackingBody.tsx` (2429 lines)

**API to extend:** `functions/api/tracking/index.ts`

**DB:** `TRACKING_DB` — tables: `whale_transactions`, `known_addresses`, `entity_holdings`

---

## TASK: Build an Exchange Netflow Aggregates Panel

Add a new collapsible panel in the RIGHT column (above Entity Radar) that shows:

### 1. Exchange Netflow Table (Top 10 Exchanges)
For each known exchange entity (Binance, Coinbase, Kraken, OKX, Bybit, Bitfinex, Gemini, Bitstamp, Huobi, Upbit):
- **Inflow (24h):** Total USD flowing INTO exchange wallets
- **Outflow (24h):** Total USD flowing OUT of exchange wallets
- **Net Flow:** Inflow - Outflow (green for net outflow/accumulation, red for net inflow/distribution)
- **Net Flow Bar:** Horizontal proportional bar showing inflow vs outflow split
- **TX Count:** Number of transactions contributing to this flow

### 2. Aggregate Exchange Netflow Summary Card
- Total exchange inflow (24h)
- Total exchange outflow (24h)
- Overall net flow with trend arrow (↑ net outflow = bullish, ↓ net inflow = bearish)
- Comparison vs previous 24h period (% change)

### 3. Exchange Flow Timeline Sparkline
- Mini chart showing hourly net exchange flow over last 24h
- Green area above zero (net outflow), red below (net inflow)
- Tooltip on hover showing exact hourly values

### Implementation Requirements:

**Backend (`functions/api/tracking/index.ts`):**
- Add a new query parameter `?exchange_flows=true` that returns:
  ```json
  {
    "exchange_flows": [
      {
        "entity": "Binance",
        "inflow_24h": 1234567890,
        "outflow_24h": 987654321,
        "net_flow": 246913569,
        "tx_count": 342,
        "prev_net_flow": 198765432,
        "hourly_net": [/* 24 hourly values */]
      }
    ],
    "aggregate": {
      "total_inflow": 5678901234,
      "total_outflow": 4321098765,
      "net_flow": 1357802469,
      "prev_net_flow": 987654321,
      "change_pct": 37.5
    }
  }
  ```
- Join `whale_transactions` with `known_addresses` to identify exchange wallets
- Use `flow_type` = 'Exchange Inflow' / 'Exchange Outflow' for direction
- Aggregate over rolling 24h window from `timestamp`
- Cache result in memory for 60 seconds to avoid recomputing per request

**Frontend (`TrackingBody.tsx`):**
- New state: `exchangeFlows`, `exchangeFlowsLoading`
- Fetch on mount + every 60 seconds alongside existing feed polling
- Render as a collapsible panel with header "EXCHANGE NETFLOW"
- Match existing terminal aesthetic: JetBrains Mono, amber/blue/green/red color scheme, subtle borders
- Panel should be ~300px tall, scrollable for the table
- Use CSS Grid for the exchange rows: [exchange name | inflow | outflow | net flow bar | tx count]

**Styling:**
- Inflow values: `--text-primary` with `$` prefix, right-aligned
- Outflow values: `--text-primary` with `$` prefix, right-aligned
- Net flow: `#22C55E` (green) for positive (outflow > inflow), `#C2344D` (red) for negative
- Net flow bar: 60px wide, split green/red proportional to inflow/outflow ratio
- Hover on row: subtle `rgba(232,150,12,0.05)` background
- Panel border: `1px solid var(--border-subtle)`

**Edge Cases:**
- If no exchange flow data: show "Awaiting exchange flow data..." with subtle pulse animation
- If exchange has zero flow: show $0 with muted text
- Handle negative numbers correctly in bars and formatting

**Formatting:**
- Use existing `formatUsd()` utility if available, otherwise format as: $1.2B, $345M, $12.3K
- TX count: plain integer, right-aligned
- Percentage change: +37.5% or -12.3% with color coding

**Do NOT:**
- Break existing live feed or entity radar functionality
- Add new npm dependencies
- Modify the database schema (work with existing tables)
- Change the AuthGuard or BootSequence flow
- Add any console.log statements in final code
