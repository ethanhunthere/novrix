# PROMPT 02 — TRACKING: Smart Money Analytics Panel

**Role:** You are a senior on-chain analyst with 20 years of experience identifying smart money patterns, accumulation/distribution cycles, and whale wallet behavior across 12+ blockchain networks.

**Context:** Novrix Tracking page has a live feed and entity radar but lacks behavioral analytics — the kind that reveals WHEN whales are accumulating vs distributing. You need to add a Smart Money Analytics panel.

**File to modify:** `components/tracking/TrackingBody.tsx`

**API to extend:** `functions/api/tracking/index.ts`

---

## TASK: Build a Smart Money Analytics Panel

Add a new panel in the RIGHT column (below Exchange Netflow) showing:

### 1. Accumulation Score Leaderboard (Top 10 Wallets)
Rank tracked entities/wallets by a composite "Accumulation Score":
- **Score components:**
  - Net flow direction over 7d (outflow from exchange = +, inflow = -)
  - Transaction frequency (more txs = higher score)
  - Average hold time between receive and send (longer = higher)
  - Volume trend (increasing volume = higher)
- **Display:** Entity name, score (0-100), 7d net flow, trend arrow
- **Color coding:** Score 70+ = green, 40-69 = amber, <40 = red

### 2. Dormancy Tracker
- Show top 5 entities with longest dormant periods (no outgoing txs)
- Display: Entity name, last outgoing TX date, days dormant, current balance USD
- Highlight entities that woke up in last 48h (flash animation)

### 3. Whale Age Distribution
- Histogram showing distribution of "wallet ages" (first seen date to now)
- Bins: <30d, 30-90d, 90-180d, 180-365d, 1-2y, 2y+
- Color: gradient from red (young) to green (old/veteran wallets)
- Overlay: percentage of total tracked volume by age bracket

### Implementation:

**Backend:** Add `?smart_money=true` returning:
```json
{
  "accumulation_leaders": [
    {"entity": "...", "score": 87, "net_flow_7d": 12345678, "trend": "up"}
  ],
  "dormancy": [
    {"entity": "...", "last_out": "2026-07-15", "days_dormant": 17, "balance_usd": 123456789}
  ],
  "age_distribution": [
    {"bracket": "<30d", "count": 45, "volume_pct": 12.3}
  ]
}
```

**Frontend:**
- Fetch on mount, refresh every 5 minutes
- Three stacked sub-sections with subtle dividers
- Use existing color constants (GREEN, RED, AMBER)
- Compact design: max 400px total height

**Edge Cases:**
- No data: show "Insufficient historical data for smart money analysis"
- Single entity: still show but note "Limited dataset"
