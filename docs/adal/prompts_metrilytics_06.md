# PROMPT 06 — METRILYTICS: Options Flow & Greeks Analytics

**Role:** You are a senior derivatives strategist with 20 years of experience in options market microstructure, Greeks analytics, and volatility surface modeling across crypto and traditional markets.

**Context:** Novrix Metrilytics has basic options volume data but lacks Greeks, IV analysis, and put/call ratio analytics — essential for institutional options traders.

**File to modify:** `components/metrilytics/MetrilyticsBody.tsx` (enhance OptionsPanel)

**New API endpoint:** `functions/api/metrilytics/options-flow.ts`

**New DB tables:** `options_data`, `options_greeks` in METRILYTICS_DB

---

## TASK: Build Options Flow & Greeks Analytics

### 1. Options Overview Dashboard
- **Put/Call Ratio:** Volume and OI ratios (current, 7d avg, 30d avg)
- **Max Pain:** Strike price with max OI (pin risk indicator)
- **Total OI:** Calls vs Puts breakdown
- **IV Rank:** Current IV percentile vs 1-year range
- **Top 3 Traded Strikes:** By volume with call/put split

### 2. Greeks Summary Panel
For BTC and ETH options:
- **Delta Exposure:** Net delta across all strikes (directional bias)
- **Gamma Exposure:** Total gamma (pin risk/ vol expansion potential)
- **Vega Exposure:** IV sensitivity
- **Theta Decay:** Daily time decay cost
- **Visual:** Horizontal bars showing exposure levels

### 3. IV Surface & Term Structure
- **IV by Strike:** Smile/skew chart for 3 expirations (weekly, monthly, quarterly)
- **Term Structure:** IV by expiration (ATM strikes)
- **Historical IV:** 30d IV chart vs realized vol
- **IV Premium/Discount:** IV - RV spread

### 4. Unusual Options Activity
- **Flag criteria:** 
  - Volume >2x average
  - OI change >50%
  - Large block trades (>$1M)
- **Display:** Last 10 unusual activities with strike, type, size, timestamp

### 5. Options Flow by Expiration
- **Stacked bar chart:** Volume and OI by expiration date
- **Color:** Calls green, puts red
- **Highlight:** Quarterly expirations (highest volume)

### Implementation:

**Cron worker:** Add to `workers/metrilytics-cron`
- Source: Deribit API (public endpoints) for BTC/ETH options
- Frequency: Hourly for OI/volume, daily for Greeks
- Store: strike-level OI, volume, IV, Greeks

**DB tables:**
```sql
CREATE TABLE options_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  expiration TEXT NOT NULL,
  strike REAL NOT NULL,
  type TEXT NOT NULL, -- 'call' or 'put'
  volume_24h REAL,
  oi REAL,
  iv REAL,
  timestamp TEXT NOT NULL,
  UNIQUE(symbol, expiration, strike, type, timestamp)
);

CREATE TABLE options_greeks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  date TEXT NOT NULL,
  delta_exposure REAL,
  gamma_exposure REAL,
  vega_exposure REAL,
  theta_decay REAL,
  iv_rank REAL,
  put_call_ratio REAL,
  max_pain REAL,
  UNIQUE(symbol, date)
);
```

**API (`functions/api/metrilytics/options-flow.ts`):**
```typescript
// GET /api/metrilytics/options-flow?symbol=BTC
{
  "overview": {
    "put_call_volume": 0.65,
    "put_call_oi": 0.72,
    "max_pain": 64000,
    "iv_rank": 45,
    "total_oi_calls": 123456789,
    "total_oi_puts": 98765432
  },
  "greeks": {
    "delta": 1234567,
    "gamma": 45678,
    "vega": 234567,
    "theta": -12345
  },
  "iv_surface": {
    "strikes": [60000, 62000, 64000, 66000, 68000],
    "expirations": ["2026-08-07", "2026-08-28", "2026-09-25"],
    "ivs": [[45, 42, 40, 42, 45], ...]
  },
  "unusual": [
    {
      "strike": 70000,
      "type": "call",
      "volume": 1234567,
      "oi_change": 0.85,
      "timestamp": "2026-07-30T14:00:00Z"
    }
  ]
}
```

**Frontend:**
- Overview: 6 metric tiles
- Greeks: horizontal bar chart
- IV surface: 3D surface or 2D heatmap (use recharts or custom SVG)
- Unusual activity: scrollable feed
- Expiration chart: StackedBarChart

**Styling:**
- Calls: green (#22C55E)
- Puts: red (#C2344D)
- IV rank: color gradient (0-20 green, 20-50 amber, 50-100 red)
- Max pain: vertical reference line on strike chart

**Edge Cases:**
- No options data: show "Options data unavailable — Deribit API required"
- Low liquidity: warn "Limited options data for this symbol"
- Missing Greeks: show "Greeks calculation pending"
