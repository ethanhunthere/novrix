# PROMPT 06 — TRACKING: Cross-Chain Entity Resolution & Unified Portfolio View

**Role:** You are a senior blockchain identity engineer with 20 years of experience in address clustering, cross-chain entity resolution, and unified portfolio tracking across 12+ networks.

**Context:** Novrix Tracking page shows entities per-chain but doesn't unify cross-chain holdings. Institutional users need to see TOTAL exposure across all chains, not fragmented per-chain views.

**File to modify:** `components/tracking/TrackingBody.tsx` + `app/tracking/address/page.tsx`

**API to extend:** `functions/api/entities/index.ts` + `functions/api/holdings/index.ts`

---

## TASK: Build Cross-Chain Entity Resolution & Unified Portfolio

### 1. Unified Entity Portfolio Card
When viewing an entity detail (e.g., MicroStrategy, Jump Trading):
- **Total Portfolio Value:** Sum across ALL chains (current: only per-chain)
- **Chain Allocation:** Stacked horizontal bar showing % on each chain
- **Token Allocation (Cross-Chain):** Aggregate by token symbol, not by chain
  - Example: Show total BTC held across Bitcoin, Ethereum (WBTC), Solana (WBT)
  - Group wrapped versions with native: WBTC → BTC, WETH → ETH, etc.
- **Cross-Chain Flow:** Net flow aggregated across all chains (not per-chain)

### 2. Entity Address Clustering Visualization
- **Address Graph:** Show all known addresses for entity, grouped by chain
- **Connection Lines:** Draw lines between addresses that have transacted with each other
- **Hover:** Show balance and tx count for each address
- **Click:** Navigate to that specific address detail page

### 3. Cross-Chain Movement Alerts
- **Bridge Detection:** Flag transactions that move value between chains (e.g., ETH → Arbitrum via bridge)
- **Display:** "Entity moved $X from Ethereum to Arbitrum via Across Protocol"
- **Bridge leaderboard:** Show most used bridges by this entity

### 4. Unified Risk Assessment
- **Chain Concentration Risk:** Flag if >70% of portfolio on single chain
- **Token Concentration Risk:** Flag if >50% in single token (across all chains)
- **Counterparty Risk:** Show top 5 cross-chain counterparties with volume

### Implementation:

**Backend (`functions/api/entities/index.ts`):**
- Add `?unified=true&entity=X` returning:
```json
{
  "entity": "Jump Trading",
  "total_portfolio_usd": 1234567890,
  "chain_allocation": {
    "Ethereum": {"value": 456789012, "pct": 37},
    "Solana": {"value": 345678901, "pct": 28},
    "Arbitrum": {"value": 234567890, "pct": 19},
    "Base": {"value": 197530987, "pct": 16}
  },
  "token_allocation": {
    "ETH": {"value": 456789012, "pct": 37, "chains": ["Ethereum", "Arbitrum"]},
    "SOL": {"value": 345678901, "pct": 28, "chains": ["Solana"]},
    "BTC": {"value": 234567890, "pct": 19, "chains": ["Bitcoin", "Ethereum"]}
  },
  "cross_chain_flow_24h": 12345678,
  "addresses": [
    {"address": "0x...", "chain": "Ethereum", "balance_usd": 123456, "tx_count": 45},
    {"address": "0x...", "chain": "Solana", "balance_usd": 234567, "tx_count": 32}
  ],
  "bridges_used": [
    {"bridge": "Across", "volume_30d": 1234567, "tx_count": 5},
    {"bridge": "Stargate", "volume_30d": 987654, "tx_count": 3}
  ],
  "risks": {
    "chain_concentration": {"chain": "Ethereum", "pct": 37, "flag": false},
    "token_concentration": {"token": "ETH", "pct": 37, "flag": false}
  }
}
```

**Frontend:**
- Unified portfolio: prominent card at top of entity detail panel
- Chain allocation: 100% stacked bar, hover for exact values
- Token allocation: expandable list, click to see per-chain breakdown
- Address graph: SVG-based, circular layout, chain-colored nodes
- Bridge alerts: inline badges in transaction feed

**Styling:**
- Chain colors: use existing CHAIN_COLORS constant
- Wrapped token grouping: subtle badge "Wrapped" on aggregated tokens
- Address nodes: 12px circles, entity-colored border
- Bridge badges: small pill, bridge name + chain arrows (ETH→ARB)

**Edge Cases:**
- Entity with single address: show "Single address entity" note
- No cross-chain activity: hide bridge section
- Missing balance data for some addresses: show "Balance unavailable"
- Unknown wrapped token mapping: show raw token symbol

**Data Quality:**
- Create wrapped token mapping: WBTC→BTC, WETH→ETH, WSOL→SOL, etc.
- Handle bridge contracts as intermediate addresses (not final destination)
- Cache unified portfolio calculation for 5 minutes
