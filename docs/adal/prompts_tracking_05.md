# PROMPT 05 — TRACKING: Stablecoin Flow Monitor Panel

**Role:** You are a senior stablecoin market analyst with 20 years of experience tracking USDT/USDC/DAI flows, mint/burn events, and peg stability across all major chains.

**Context:** Novrix Tracking page monitors whale transactions but lacks dedicated stablecoin flow analysis — critical for understanding market liquidity, institutional on/off ramping, and potential depeg events.

**File to modify:** `components/tracking/TrackingBody.tsx`

**API to extend:** `functions/api/tracking/index.ts`

---

## TASK: Build a Stablecoin Flow Monitor Panel

### 1. Stablecoin Netflow Summary (Top Row)
- **Total Stable Inflow (24h):** USD value flowing into exchanges
- **Total Stable Outflow (24h):** USD value flowing out of exchanges
- **Net Stable Flow:** Inflow - Outflow with trend arrow
- **Interpretation label:** "Net minting" / "Net redemption" / "Neutral"

### 2. Per-Stablecoin Breakdown
For each major stablecoin (USDT, USDC, DAI, FDUSD, TUSD):
- **Mint Events (24h):** Count + total USD value
- **Burn Events (24h):** Count + total USD value
- **Net Issuance:** Mint - Burn with color coding
- **Exchange Netflow:** Inflow - Outflow to/from exchanges
- **Chain Distribution:** Mini bar showing % on ETH, TRX, SOL, BSC, etc.

### 3. Large Stable Transfer Alerts
- **Threshold:** $10M+ single transfers
- **Display:** Last 5 large transfers with:
  - Amount (USD + token amount)
  - From/To (entity labels if known)
  - Type: Mint/Burn/Exchange Inflow/Exchange Outflow/Whale Transfer
  - Time ago
- **Flash animation:** New alerts pulse for 3 seconds

### 4. Stablecoin Dominance Trend
- **7-day mini chart:** Line chart showing USDT vs USDC vs DAI dominance %
- **Current split:** Pie chart or stacked bar showing current market share
- **Change indicator:** % change in dominance over 7d

### Implementation:

**Backend:** Add `?stable_flows=true` returning:
```json
{
  "summary": {
    "total_inflow": 1234567890,
    "total_outflow": 987654321,
    "net_flow": 246913569,
    "interpretation": "net_minting"
  },
  "by_stable": [
    {
      "symbol": "USDT",
      "mints_24h": 5,
      "mint_volume": 500000000,
      "burns_24h": 2,
      "burn_volume": 100000000,
      "net_issuance": 400000000,
      "exchange_netflow": 150000000,
      "chain_split": {"ETH": 45, "TRX": 35, "SOL": 12, "BSC": 8}
    }
  ],
  "large_transfers": [
    {
      "amount_usd": 50000000,
      "amount_native": 50000000,
      "token": "USDT",
      "from": "Tether Treasury",
      "to": "Binance",
      "type": "mint",
      "timestamp": "2026-07-30T14:32:00Z",
      "chain": "ETH"
    }
  ],
  "dominance": {
    "dates": ["2026-07-24", "2026-07-25", ...],
    "usdt": [65.2, 65.5, ...],
    "usdc": [24.1, 23.8, ...],
    "dai": [5.3, 5.4, ...],
    "current": {"usdt": 65.8, "usdc": 23.5, "dai": 5.2, "others": 5.5},
    "change_7d": {"usdt": 0.6, "usdc": -0.3, "dai": -0.1}
  }
}
```

**Frontend:**
- Panel position: LEFT column, below Live Feed (collapsible)
- Summary row: 4 tiles, compact, horizontal
- Per-stable: expandable rows, click to drill down
- Large transfers: scrollable list, max 150px height
- Dominance: 80px mini chart + current split bar

**Styling:**
- Mint events: green (#22C55E) indicators
- Burn events: red (#C2344D) indicators
- Exchange inflow: amber (#E8960C) left border
- Exchange outflow: blue (#38BDF8) left border
- Dominance chart: USDT = #26A17B, USDC = #2775CA, DAI = #F5AC37

**Edge Cases:**
- No stablecoin txs in 24h: show "Minimal stablecoin activity"
- Single stablecoin dominant (>90%): highlight concentration risk
- Missing chain data: show "Unknown" category in split
