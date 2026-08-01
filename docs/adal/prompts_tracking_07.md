# PROMPT 07 — TRACKING: Real-Time Alert System & Notification Center

**Role:** You are a senior real-time systems engineer with 20 years of experience building low-latency alert systems for trading desks and institutional monitoring platforms.

**Context:** Novrix Tracking page polls for new data every 30s but has no proactive alerting. Institutional users need configurable alerts for large movements, entity activity, and anomaly detection.

**File to modify:** `components/tracking/TrackingBody.tsx` + new component file

**New file:** `components/tracking/AlertCenter.tsx`

**API to extend:** `functions/api/tracking/index.ts`

---

## TASK: Build Real-Time Alert System & Notification Center

### 1. Alert Configuration Panel
Add a settings gear icon in the Tracking header that opens:
- **Alert Thresholds:**
  - Large TX alert: slider $1M - $100M (default $10M)
  - Entity activity alert: toggle per watchlist entity
  - Exchange flow alert: net flow > $X in 1h
  - New whale alert: first-time address with >$1M
- **Alert Methods:**
  - Browser notification (request permission)
  - In-app toast
  - Sound alert (toggle)
- **Alert History:**
  - Last 50 alerts, persisted in localStorage

### 2. Alert Types & Triggers

**Type A: Large Transaction**
- Trigger: Any tx > configured threshold
- Display: "$X.XM [BTC/ETH/etc] moved from [sender] to [receiver]"
- Color: Red for exchange inflow, green for outflow, amber for transfer

**Type B: Entity Activity**
- Trigger: Watchlist entity sends/receives >$100K
- Display: "[Entity Name] [sent/received] $X.XM [token]"
- Color: Entity-specific or amber

**Type C: Exchange Flow Anomaly**
- Trigger: Net exchange flow > $50M in 1h (configurable)
- Display: "Net $X.XM flowing [into/out of] exchanges in last hour"
- Color: Red for inflow, green for outflow

**Type D: New Whale**
- Trigger: Address with >$1M first seen in last 24h
- Display: "New whale detected: [address] with $X.XM"
- Color: Blue (#38BDF8)

**Type E: Dormant Wallet Awakening**
- Trigger: Entity with no outgoing tx in >30d makes a transfer
- Display: "[Entity] active after X days dormancy"
- Color: Purple (#A855F7)

### 3. Notification Center UI
- **Bell icon** in header with unread count badge
- **Dropdown panel** (300px wide, 400px max height):
  - List of alerts, newest first
  - Each alert: icon, message, timestamp, "View TX" link
  - Mark all read button
  - Clear history button
- **Toast notifications:** Bottom-right, auto-dismiss 5s, click to view

### 4. Alert Persistence
- Store alert history in localStorage: `novrix_tracking_alerts`
- Max 100 alerts, FIFO eviction
- Persist alert config in localStorage: `novrix_tracking_alert_config`

### Implementation:

**Backend:** Add `?alerts=true&since=timestamp` returning new alerts:
```json
{
  "alerts": [
    {
      "id": "alert_123",
      "type": "large_tx",
      "severity": "high",
      "message": "$25.4M BTC moved from Binance to unknown wallet",
      "tx_id": "tx_456",
      "timestamp": "2026-07-30T14:32:00Z",
      "data": {
        "amount_usd": 25400000,
        "token": "BTC",
        "sender": "Binance",
        "receiver": "bc1q...",
        "flow_type": "Exchange Outflow"
      }
    }
  ]
}
```

**Frontend:**
- Poll for alerts every 15s alongside feed polling
- Use Notification API for browser alerts (with permission)
- Toast: fixed position, slide-in animation, stackable (max 3)
- Badge: red circle with white count, pulse on new alert

**Styling:**
- Alert icons: 🔴 large tx, 🟡 entity, 🔵 new whale, 🟣 dormant
- Toast: dark background, colored left border, monospace font
- Dropdown: terminal aesthetic, subtle border, shadow

**Edge Cases:**
- Notification permission denied: fall back to toast only
- localStorage full: evict oldest alerts
- Duplicate alert (same tx): dedupe by tx_id
- Alert config invalid: reset to defaults
