# PROMPT 10 — METRILYTICS: MEV & Sandwich Attack Analytics

**Role:** You are a senior MEV researcher with 20 years of experience tracking maximal extractable value, sandwich attacks, and validator behavior across Ethereum, Solana, and other major chains.

**Context:** Novrix Metrilytics tracks DeFi metrics but lacks MEV analytics — a critical revenue/risk factor for protocols and traders. MEV extraction impacts user costs and protocol sustainability.

**File to modify:** `components/metrilytics/MetrilyticsBody.tsx` (new panel)

**New API endpoint:** `functions/api/metrilytics/mev.ts`

**New DB tables:** `mev_data`, `sandwich_attacks` in METRILYTICS_DB

---

## TASK: Build MEV & Sandwich Attack Analytics

### 1. MEV Overview Dashboard
- **Total MEV Extracted (24h):** USD value
- **Sandwich Attack Count (24h):** Number of attacks
- **Average Sandwich Profit:** USD per attack
- **Total User Loss (24h):** USD lost to MEV
- **MEV as % of DEX Volume:** MEV extraction rate

### 2. Sandwich Attack Feed
- **Real-time feed:** Last 20 sandwich attacks
- **Columns:** Time, Chain, DEX, Victim TX, Attacker Profit, User Loss, Token Pair
- **Visual:** Frontrun TX → Victim TX → Backrun TX flow diagram
- **Click:** Expand for full attack details

### 3. MEV by Protocol
- **Top MEV Protocols:** Uniswap, Curve, Balancer, etc.
- **Metrics per protocol:**
  - Total MEV extracted
  - Sandwich attack frequency
  - Average user loss
  - MEV as % of volume
- **Ranking:** By total MEV, by attack frequency, by user impact

### 4. Validator/Searcher Leaderboard
- **Top Searchers:** By total MEV profit
- **Top Validators:** By MEV rewards (if applicable)
- **Metrics:** Total extracted, attack count, avg profit
- **Anonymized:** Show address hash, not full address

### 5. MEV Protection Impact
- **Protected vs Unprotected:** Compare user loss on MEV-protected DEXes (e.g., CoW Swap) vs unprotected
- **Protection Rate:** % of volume using MEV protection
- **Savings:** Total USD saved by protection mechanisms

### 6. Historical MEV Trends
- **30d MEV chart:** Daily MEV extraction
- **Attack frequency trend:** Increasing/decreasing
- **User loss trend:** Cumulative over time
- **Correlation:** MEV vs DEX volume, MEV vs gas price

### Implementation:

**Cron worker:** Add to `workers/metrilytics-cron`
- Sources:
  - Flashbots MEV-Boost API (for Ethereum)
  - EigenPhi API (MEV analytics)
  - Custom sandwich detection (for major DEXes)
- Frequency: Hourly for recent attacks, daily for aggregates
- Store: attack events, protocol aggregates, searcher stats

**DB tables:**
```sql
CREATE TABLE mev_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain TEXT NOT NULL,
  protocol TEXT NOT NULL,
  date TEXT NOT NULL,
  total_mev_usd REAL,
  sandwich_count INTEGER,
  avg_profit_usd REAL,
  total_user_loss_usd REAL,
  UNIQUE(chain, protocol, date)
);

CREATE TABLE sandwich_attacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain TEXT NOT NULL,
  dex TEXT NOT NULL,
  victim_tx TEXT NOT NULL,
  frontrun_tx TEXT NOT NULL,
  backrun_tx TEXT NOT NULL,
  attacker_profit_usd REAL,
  user_loss_usd REAL,
  token_pair TEXT,
  timestamp TEXT NOT NULL,
  UNIQUE(victim_tx)
);

CREATE INDEX idx_sandwich_time ON sandwich_attacks(timestamp DESC);
```

**API (`functions/api/metrilytics/mev.ts`):**
```typescript
// GET /api/metrilytics/mev?chain=ethereum&days=30
{
  "overview": {
    "total_mev_24h": 1234567,
    "sandwich_count_24h": 342,
    "avg_profit": 3612,
    "total_user_loss_24h": 2345678,
    "mev_pct_volume": 0.15
  },
  "recent_attacks": [
    {
      "timestamp": "2026-07-30T14:32:00Z",
      "chain": "Ethereum",
      "dex": "Uniswap V3",
      "victim_tx": "0x...",
      "attacker_profit": 5000,
      "user_loss": 5200,
      "token_pair": "ETH/USDC"
    }
  ],
  "by_protocol": [
    {
      "protocol": "Uniswap V3",
      "total_mev": 567890,
      "attack_count": 156,
      "avg_user_loss": 3641,
      "mev_pct_volume": 0.18
    }
  ],
  "searchers": [
    {
      "address_hash": "0x1234...5678",
      "total_profit": 123456,
      "attack_count": 45,
      "avg_profit": 2743
    }
  ],
  "protection": {
    "protected_volume_pct": 12.5,
    "total_savings": 345678
  },
  "trends": {
    "dates": ["2026-07-01", ...],
    "mev_usd": [123456, ...],
    "attack_count": [234, ...],
    "user_loss": [145678, ...]
  }
}
```

**Frontend:**
- New panel: "MEV ANALYTICS" in Metrilytics grid
- Overview: 5 metric tiles
- Attack feed: scrollable, expandable rows
- Protocol ranking: sortable table
- Searcher leaderboard: anonymized addresses
- Trends: LineChart with 3 series (MEV, attacks, loss)

**Styling:**
- MEV extracted: red (#C2344D) — represents user cost
- User loss: dark red (#8B0000)
- Protected volume: green (#22C55E)
- Attack feed: red left border
- Searcher addresses: truncated with copy button

**Edge Cases:**
- No MEV data for chain: show "MEV data unavailable for [chain]"
- Zero attacks: show "No sandwich attacks detected in period"
- Protected DEX: show "MEV-protected" badge
- Missing searcher data: show "Searcher analytics unavailable"
