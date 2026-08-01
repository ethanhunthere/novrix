# PROMPT 09 — TRACKING: Token-Level Drill-Down & Market Impact Analysis

**Role:** You are a senior tokenomics analyst with 20 years of experience analyzing whale impact on token prices, liquidity depth, and market microstructure across CEX and DEX venues.

**Context:** Novrix Tracking page shows transactions but lacks token-specific analytics. Users can't drill down into "show me all BTC whale activity" or understand "how did this $50M transfer impact the market."

**File to modify:** `components/tracking/TrackingBody.tsx` + new page

**New page:** `app/tracking/token/[symbol]/page.tsx`

**API to extend:** `functions/api/tracking/index.ts`

---

## TASK: Build Token-Level Drill-Down & Market Impact Analysis

### 1. Token Selector & Navigation
- Add token icons in the live feed (BTC, ETH, SOL, etc.)
- Click token icon → navigate to `/tracking/token/[symbol]`
- Token page shows ALL whale activity for that specific token

### 2. Token Overview Dashboard
For selected token (e.g., BTC):
- **24h Whale Volume:** Total USD moved by whales
- **24h TX Count:** Number of whale transactions
- **Largest TX:** Biggest single transfer with link
- **Net Exchange Flow:** Inflow - Outflow for this token only
- **Active Whales:** Unique addresses moving this token
- **Market Impact Score:** Estimated price impact of recent whale moves

### 3. Token-Specific Transaction Feed
- Same table as main feed but filtered to selected token
- Additional columns:
  - **% of Daily Volume:** This TX as % of token's 24h whale volume
  - **Price Impact:** Estimated slippage if this hit the market
  - **Liquidity Depth:** Current order book depth at ±2% (if available)

### 4. Whale Concentration Analysis
- **Top 10 Holders:** Entity leaderboard for this token
- **Holding Distribution:** Pie chart of top 10 vs rest
- **Concentration Risk:** Flag if top 10 hold >50% of tracked volume
- **Accumulation Trend:** 7d chart showing net whale accumulation/distribution

### 5. Market Impact Timeline
- **Chart:** Whale volume overlaid with price (if price data available)
- **Correlation:** Highlight large TXs that preceded price moves
- **Event markers:** Flag TXs >$10M with "Market Mover" badge

### 6. Token Comparison Mode
- Select up to 3 tokens to compare side-by-side
- Metrics: Volume, TX count, avg TX size, whale count, net flow
- Visual: Grouped bar chart or radar chart

### Implementation:

**New API endpoint:** `/api/tracking/token/[symbol]`
```json
{
  "symbol": "BTC",
  "overview": {
    "volume_24h": 1234567890,
    "tx_count_24h": 342,
    "largest_tx": 50000000,
    "largest_tx_id": "tx_123",
    "net_exchange_flow": 12345678,
    "active_whales": 89,
    "market_impact_score": 7.5
  },
  "transactions": [/* same as main feed */],
  "concentration": {
    "top_10": [
      {"entity": "Binance", "volume": 123456789, "pct": 12.3}
    ],
    "top_10_pct": 45.6,
    "risk_flag": false
  },
  "accumulation_trend": {
    "dates": ["2026-07-24", ...],
    "net_flow": [1234567, -234567, ...]
  },
  "price_correlation": {
    "timestamps": [...],
    "whale_volume": [...],
    "price": [...]
  }
}
```

**Frontend:**
- Token page: reuse TerminalModulePageShell, add token icon + name header
- Overview: 6 metric tiles in 2 rows
- Feed: same component as main feed, pre-filtered
- Concentration: pie chart + leaderboard table
- Impact timeline: ComposedChart (Bar for volume, Line for price)

**Styling:**
- Token icon: 32px, colored border matching chain
- Market impact score: 0-10 scale, color gradient green→red
- "Market Mover" badge: amber background, dark text
- Comparison mode: side-by-side cards, equal width

**Edge Cases:**
- Token with no whale activity: show "No whale transactions for [TOKEN]"
- Price data unavailable: hide impact timeline, show note
- Single whale dominant (>80%): highlight concentration risk
- New token (no history): show "Insufficient data for trend analysis"
