# PROMPT 08 — METRILYTICS: Stablecoin Deep Dive & Issuer Analytics

**Role:** You are a senior stablecoin market analyst with 20 years of experience tracking issuer reserves, redemption mechanics, and peg stability across centralized and decentralized stablecoins.

**Context:** Novrix Metrilytics has basic stablecoin supply tracking but lacks issuer-level analysis, reserve composition, and depeg risk assessment — critical for institutional stablecoin allocation.

**File to modify:** `components/metrilytics/MetrilyticsBody.tsx` (enhance StablecoinPanel)

**New component:** `components/metrilytics/panels/StablecoinDeepDive.tsx`

---

## TASK: Build Stablecoin Deep Dive & Issuer Analytics

### 1. Issuer Reserve Composition
For each major issuer (Tether, Circle, MakerDAO, First Digital, etc.):
- **Reserve Breakdown:** Cash, T-bills, corporate bonds, crypto, other
- **Attestation Date:** Last audit/attestation date
- **Attestation Firm:** Auditor name
- **Reserve Ratio:** Total reserves / total supply (should be >1)
- **Visual:** Stacked bar showing composition

### 2. Peg Stability Monitor
- **Current Peg:** Price vs $1.00 (premium/discount)
- **Peg Deviation:** % from $1.00
- **Historical Peg:** 30d chart showing peg stability
- **Depeg Events:** Flag times when peg deviated >0.5%
- **Recovery Time:** How long to return to peg after depeg

### 3. Mint/Burn Tracking
- **24h Mints:** Count + USD value
- **24h Burns:** Count + USD value
- **Net Issuance:** Mint - Burn
- **Large Events:** Flag mints/burns >$100M
- **Mint/Burn History:** 30d chart

### 4. Chain Distribution & Migration
- **Supply by Chain:** Current distribution (ETH, TRX, SOL, BSC, etc.)
- **30d Change:** Net flow between chains
- **Bridge Activity:** Cross-chain transfers
- **Visual:** Sankey diagram or stacked bar

### 5. Depeg Risk Score
Composite score (0-100) based on:
- **Reserve Quality:** Cash % (higher = safer)
- **Attestation Recency:** Days since last audit
- **Peg Stability:** 30d deviation from $1
- **Redemption Queue:** If applicable (e.g., USDC redemption time)
- **Regulatory Risk:** Jurisdiction, enforcement actions

**Display:** Score badge + risk level (Low/Moderate/High)

### 6. Stablecoin Comparison Matrix
- **Side-by-side table:** USDT, USDC, DAI, FDUSD, TUSD, PYUSD
- **Metrics:** Supply, peg, reserve quality, attestation date, chain count
- **Ranking:** By safety score, by yield (if applicable), by liquidity

### Implementation:

**Enhance existing API:** `/api/metrilytics/stablecoins`
```json
{
  "stablecoins": [
    {
      "symbol": "USDT",
      "issuer": "Tether",
      "supply": 112345678901,
      "peg_price": 0.9998,
      "peg_deviation": -0.02,
      "reserves": {
        "cash": 85.5,
        "t_bills": 12.3,
        "corporate_bonds": 1.2,
        "crypto": 0.5,
        "other": 0.5
      },
      "attestation_date": "2026-06-30",
      "attestation_firm": "BDO",
      "reserve_ratio": 1.02,
      "risk_score": 35,
      "mints_24h": 5,
      "mint_volume_24h": 500000000,
      "burns_24h": 2,
      "burn_volume_24h": 100000000,
      "chain_distribution": {
        "Ethereum": 45,
        "Tron": 35,
        "Solana": 12,
        "BSC": 8
      }
    }
  ]
}
```

**Frontend:**
- Issuer card: expandable, showing reserve breakdown
- Peg chart: LineChart with $1.00 reference line
- Mint/burn: BarChart (green=mint, red=burn)
- Risk score: circular badge
- Comparison: sortable table

**Styling:**
- Peg on target (±0.1%): green
- Slight deviation (0.1-0.5%): amber
- Depeg (>0.5%): red
- Cash reserves: green
- Crypto reserves: red
- Recent attestation (<30d): green
- Old attestation (>90d): red

**Edge Cases:**
- No attestation data: show "Attestation unavailable"
- Algorithmic stable: note "No reserves — algorithmic peg"
- Depegged (>2%): highlight with red border, show "DEPEG ALERT"
- Missing chain data: show "Distribution unavailable"
