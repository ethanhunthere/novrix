# PROMPT 10 — TRACKING: Entity Intelligence Report & Historical Analysis

**Role:** You are a senior blockchain intelligence analyst with 20 years of experience building entity profiling systems for hedge funds, family offices, and compliance teams.

**Context:** Novrix Tracking page shows entity basics (holdings, recent txs) but lacks deep historical analysis, behavioral patterns, and exportable intelligence reports.

**File to modify:** `components/tracking/TrackingBody.tsx` + new modal/page

**API to extend:** `functions/api/entities/index.ts`

---

## TASK: Build Entity Intelligence Report & Historical Analysis

### 1. Entity Intelligence Report Modal
When clicking "Deep Dive" on any entity, open a full-screen modal with:

**Section A: Executive Summary**
- Entity name, category (Fund, Exchange, OTC Desk, etc.), first seen date
- Total tracked addresses, total portfolio value, 30d activity level
- Key insight: "Accumulating BTC", "Reducing ETH exposure", "Dormant", etc.

**Section B: Historical Portfolio Chart**
- **90-day portfolio value chart:** Line chart showing total USD value over time
- **Token allocation over time:** Stacked area chart showing how allocation shifted
- **Major events:** Markers on chart for large inflows/outflows

**Section C: Behavioral Analysis**
- **Trading Patterns:**
  - Most active hours (heatmap)
  - Most active days of week
  - Average hold time between receive and send
  - Preferred chains (by volume)
- **Counterparty Analysis:**
  - Top 10 counterparties by volume
  - Exchange usage breakdown (which exchanges they use most)
  - OTC desk interactions
- **Risk Metrics:**
  - Volatility of portfolio value (30d std dev)
  - Largest single-day drawdown
  - Concentration risk score

**Section D: Transaction History (Enhanced)**
- **Full history table:** All tracked transactions, paginated
- **Export to CSV:** Download complete transaction history
- **Filter within report:** Date range, chain, token, direction

**Section E: Comparative Analysis**
- **vs Category Peers:** Compare this entity to others in same category
  - Portfolio value percentile
  - Activity level percentile
  - Accumulation score vs peers
- **vs Market:** Entity flow vs total market flow correlation

### 2. Entity Comparison Tool
- Select 2-3 entities to compare side-by-side
- Metrics: Portfolio value, 30d volume, TX count, top tokens, activity pattern
- Visual: Radar chart or grouped bars

### 3. Entity Timeline
- **Major events timeline:** Vertical timeline showing:
  - First seen date
  - Large accumulation periods
  - Major distributions
  - Dormancy periods
  - Notable transactions (>$10M)

### Implementation:

**Backend (`functions/api/entities/index.ts`):**
- Add `?report=true&entity=X&days=90` returning:
```json
{
  "entity": "Jump Trading",
  "category": "Market Maker",
  "first_seen": "2024-03-15",
  "summary": {
    "total_addresses": 45,
    "portfolio_value": 1234567890,
    "activity_30d": "high",
    "key_insight": "Accumulating ETH, reducing SOL exposure"
  },
  "portfolio_history": {
    "dates": ["2026-05-01", ...],
    "total_value": [1100000000, ...],
    "by_token": {
      "ETH": [400000000, ...],
      "BTC": [300000000, ...],
      "SOL": [200000000, ...]
    }
  },
  "behavior": {
    "active_hours": [0,0,0,0,0,0,2,5,12,18,25,30,28,22,15,10,8,5,3,2,1,0,0,0],
    "active_days": [5,12,18,22,25,15,8],
    "avg_hold_time_hours": 72,
    "preferred_chains": [
      {"chain": "Ethereum", "volume_pct": 45},
      {"chain": "Solana", "volume_pct": 30}
    ]
  },
  "counterparties": [
    {"entity": "Binance", "volume": 123456789, "tx_count": 45, "direction": "both"}
  ],
  "risk": {
    "volatility_30d": 0.15,
    "max_drawdown": -0.08,
    "concentration_score": 6.5
  },
  "transactions": [/* full history */]
}
```

**Frontend:**
- Modal: full-screen overlay, close on Escape or X button
- Charts: use recharts (LineChart, AreaChart, BarChart)
- Export: generate CSV from transaction array, trigger download
- Comparison: side-by-side entity cards, synchronized charts
- Timeline: vertical line with event nodes, scrollable

**Styling:**
- Modal: dark background, subtle border, close button top-right
- Section headers: uppercase, amber color, letter-spacing
- Charts: consistent with existing terminal aesthetic
- Export button: amber border, hover fill

**Edge Cases:**
- Entity with <30d history: show "Limited historical data"
- No transactions in period: show "No activity in selected range"
- Single transaction: hide behavioral analysis, show "Insufficient data"
- Export >1000 rows: warn "Large export may take a moment"
