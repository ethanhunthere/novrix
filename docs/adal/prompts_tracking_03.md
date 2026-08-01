# PROMPT 03 — TRACKING: Address Risk Scoring & Counterparty Graph

**Role:** You are a senior blockchain forensics specialist with 20 years of experience in address clustering, risk assessment, and counterparty analysis for institutional compliance and trading desks.

**Context:** Novrix Tracking page has an address detail view (`app/tracking/address/page.tsx`) showing basic stats and history. It lacks risk scoring and counterparty relationship visualization — critical for institutional users assessing wallet legitimacy.

**File to modify:** `app/tracking/address/page.tsx` (497 lines)

**API to extend:** `functions/api/address/index.ts` (or create new route)

---

## TASK: Enhance Address Detail Page with Risk Scoring & Counterparty Graph

### 1. Risk Score Card
Add a prominent risk assessment card at the top of the address page:
- **Overall Risk Score:** 0-100 (0 = safe, 100 = high risk)
- **Score factors (display as breakdown):**
  - Mixer interaction: +30 if any tx with known mixers (Tornado Cash, etc.)
  - Sanctioned entity interaction: +50 if any tx with OFAC-listed addresses
  - Exchange-only history: -10 (lower risk, KYC'd)
  - High velocity: +15 if >50 txs in 24h
  - New wallet (<7 days): +20
  - Darknet market interaction: +40
- **Color:** 0-20 green, 21-50 amber, 51-100 red
- **Label:** "LOW RISK" / "MODERATE RISK" / "HIGH RISK"

### 2. Counterparty Graph (Top 10 Connections)
- **Visual:** Horizontal bar chart showing top 10 counterparties by volume
- **Each bar:** Entity name (or truncated address), total volume, tx count, direction (sent/received)
- **Color:** Green for received, red for sent, amber for mixed
- **Click:** Navigate to that address's detail page
- **Hover:** Tooltip showing first interaction date and last interaction date

### 3. Address Timeline
- **First seen:** Date of first transaction
- **Last active:** Date of most recent transaction
- **Active period:** X days/months/years
- **Activity heatmap:** 7x24 grid showing hourly activity patterns (like GitHub contributions)
- **Peak activity:** Most active hour and day of week

### 4. Token Exposure Enhancement
- Add **percentage allocation** to each token holding
- Add **historical balance sparkline** for each token (7d trend)
- Add **concentration risk** flag if any single token >80% of portfolio

### Implementation:

**Backend:** Add to `/api/address/` response:
```json
{
  "risk_score": {
    "score": 35,
    "level": "MODERATE",
    "factors": [
      {"name": "Exchange-only history", "impact": -10},
      {"name": "New wallet", "impact": 20},
      {"name": "High velocity", "impact": 15}
    ]
  },
  "counterparties": [
    {
      "address": "0x...",
      "entity": "Binance",
      "volume_sent": 123456,
      "volume_received": 654321,
      "tx_count": 12,
      "first_seen": "2026-01-15",
      "last_seen": "2026-07-30"
    }
  ],
  "timeline": {
    "first_seen": "2026-01-10",
    "last_active": "2026-07-30",
    "active_days": 201,
    "hourly_pattern": [0,0,0,0,0,0,2,5,12,18,25,30,28,22,15,10,8,5,3,2,1,0,0,0],
    "peak_hour": 14,
    "peak_day": "Tuesday"
  }
}
```

**Frontend:**
- Risk card: prominent placement, border color matches risk level
- Counterparty graph: horizontal bars, 200px tall, scrollable if >10
- Timeline: compact row with key dates + mini heatmap
- Token exposure: add % column and 7d sparkline per row

**Styling:**
- Risk card: 2px border, color matches level, subtle glow effect
- Heatmap cells: 8px squares, 1px gap, opacity based on activity
- Counterparty bars: height 24px, rounded corners, hover lift effect

**Edge Cases:**
- New address with <5 txs: show "Insufficient data for risk assessment"
- No counterparties: show "No significant counterparties detected"
- All activity in last 24h: highlight as "NEW WALLET ALERT"
