# PROMPT 09 — METRILYTICS: Governance & Protocol Health Monitor

**Role:** You are a senior protocol governance analyst with 20 years of experience tracking DAO participation, proposal outcomes, and protocol treasury management across 50+ DeFi protocols.

**Context:** Novrix Metrilytics tracks financial metrics but lacks governance analytics — critical for assessing protocol decentralization, community engagement, and treasury sustainability.

**File to modify:** `components/metrilytics/MetrilyticsBody.tsx` (new panel)

**New API endpoint:** `functions/api/metrilytics/governance.ts`

**New DB tables:** `governance_proposals`, `protocol_treasuries` in METRILYTICS_DB

---

## TASK: Build Governance & Protocol Health Monitor

### 1. Active Proposals Feed
- **Live proposals:** Across all tracked DAOs
- **Columns:** Protocol, Title, Status (Active/Passed/Failed/Executed), Votes For/Against, Quorum %, Time Remaining
- **Filter:** By protocol, by status, by time remaining
- **Click:** Expand for full description and vote breakdown

### 2. Governance Participation Metrics
For each protocol:
- **Voting Power Distribution:** Top 10 holders % of total
- **Average Participation:** % of token holders voting
- **Proposal Success Rate:** % passed vs failed
- **Delegation Rate:** % of tokens delegated
- **Visual:** Participation trend over 90d

### 3. Treasury Dashboard
- **Total Treasury Value:** USD value across all assets
- **Asset Allocation:** Native token, ETH, stablecoins, other
- **Runway:** Months of operations at current burn rate
- **Treasury Change:** 30d net flow
- **Top Holdings:** Largest positions

### 4. Governance Health Score
Composite score (0-100) based on:
- **Decentralization:** Voting power distribution (lower concentration = higher score)
- **Participation:** Average voter turnout
- **Proposal Quality:** Success rate, execution rate
- **Treasury Health:** Runway, diversification
- **Activity:** Proposals per month

**Display:** Score badge + health level (Excellent/Good/Fair/Poor)

### 5. Delegate Leaderboard
- **Top delegates:** By voting power
- **Voting History:** % of proposals voted on
- **Alignment:** % voting with majority
- **Protocols:** Which DAOs they're active in

### Implementation:

**Cron worker:** Add to `workers/metrilytics-cron`
- Sources:
  - Snapshot API (for off-chain governance)
  - Tally API (for on-chain governance)
  - Boardroom API (aggregator)
- Frequency: Daily for proposals, weekly for participation metrics
- Store: proposal data, participation metrics, treasury snapshots

**DB tables:**
```sql
CREATE TABLE governance_proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protocol TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  votes_for REAL,
  votes_against REAL,
  quorum_pct REAL,
  start_time TEXT,
  end_time TEXT,
  executed INTEGER DEFAULT 0,
  UNIQUE(protocol, proposal_id)
);

CREATE TABLE protocol_treasuries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protocol TEXT NOT NULL,
  date TEXT NOT NULL,
  total_usd REAL,
  native_token_pct REAL,
  eth_pct REAL,
  stable_pct REAL,
  other_pct REAL,
  runway_months REAL,
  UNIQUE(protocol, date)
);
```

**API (`functions/api/metrilytics/governance.ts`):**
```typescript
// GET /api/metrilytics/governance?protocol=aave
{
  "protocol": "Aave",
  "health_score": 78,
  "health_level": "Good",
  "active_proposals": [
    {
      "id": "prop_123",
      "title": "Add cbETH as collateral",
      "status": "Active",
      "votes_for": 1234567,
      "votes_against": 234567,
      "quorum_pct": 85,
      "time_remaining": "2d 14h"
    }
  ],
  "participation": {
    "avg_turnout": 12.5,
    "top_10_concentration": 45.6,
    "success_rate": 78.9,
    "delegation_rate": 34.2,
    "trend_90d": [10.2, 11.5, 12.5, ...]
  },
  "treasury": {
    "total_usd": 123456789,
    "allocation": {
      "AAVE": 45,
      "ETH": 25,
      "USDC": 20,
      "Other": 10
    },
    "runway_months": 36,
    "change_30d": 5.2
  },
  "delegates": [
    {
      "address": "0x...",
      "voting_power": 1234567,
      "participation_rate": 95.5,
      "alignment_rate": 78.9,
      "protocols": ["Aave", "Compound"]
    }
  ]
}
```

**Frontend:**
- New panel: "GOVERNANCE" in Metrilytics grid
- Active proposals: scrollable feed, status badges
- Health score: circular gauge
- Treasury: stacked bar + metric tiles
- Delegates: sortable table

**Styling:**
- Active proposal: amber border
- Passed: green badge
- Failed: red badge
- Executed: blue badge
- Health score: 0-40 red, 41-70 amber, 71-100 green
- Quorum met: green checkmark
- Quorum not met: red X

**Edge Cases:**
- No active proposals: show "No active governance proposals"
- No treasury data: show "Treasury data unavailable"
- Low participation (<5%): highlight as risk
- Single delegate dominant (>50%): flag centralization risk
