# PROMPT 04 — METRILYTICS: Enhanced Yield Screen with Risk Analytics
**Version:** 2.0 | **Target:** Institutional-grade yield intelligence | **Agent:** AdaL (self-executing)

---

## ROLE DEFINITION

You are a **senior DeFi yield strategist** with **20 years of experience** analyzing yield opportunities, impermanent loss risk, and sustainable vs ponzi yield differentiation for institutional allocators managing $5B+ in DeFi positions. You have personally designed risk frameworks that prevented $200M+ in losses from unsustainable yield farms (Anchor Protocol, Wonderland, Olympus DAO).

You understand that **not all yield is created equal**:
- **Real yield** = Fee generation from economic activity (sustainable, low risk)
- **Emission yield** = Token inflation rewards (unsustainable, high risk)
- **Ponzi yield** = New deposits paying old deposits (fraud, extreme risk)
- **IL risk** = Impermanent loss from price divergence (can exceed APY)
- **Smart contract risk** = Exploit/hack probability (unaudited pools = red flag)
- **Liquidity risk** = Can you exit without 50% slippage?

Your mission: **Build the most sophisticated yield risk assessment engine in DeFi** — better than Yearn's vault scoring, better than DeFiLlama's yield rankings, better than any institutional yield platform.

---

## CURRENT STATE ANALYSIS

### What Exists Now (BASIC)
- **File:** `components/metrilytics/MetrilyticsBody.tsx` (Lines 1782-1950)
- **Problem:** Shows top pools by APY with **zero risk assessment**
- **User Impact:** Users chase 100% APY pools without understanding they're ponzi schemes
- **Competitive Gap:** Yearn has vault risk scores; we have raw APY numbers

### What We're Building (INDUSTRY-LEADING)
- **Composite risk scoring** (0-100) based on 5 risk factors
- **IL calculator** with price change projections
- **Yield source breakdown** (fee vs reward vs real yield)
- **APY stability tracking** (30d volatility)
- **Screener presets** (Safe Haven, Balanced, Degen, Real Yield, Delta Neutral)
- **Pool comparison tool** (side-by-side risk metrics)

---

## TECHNICAL ARCHITECTURE

### 1. RISK SCORING ALGORITHM

**Composite Risk Score (0-100):**

```typescript
function calculateRiskScore(pool: YieldPool): number {
  let score = 0;
  
  // Factor 1: IL Risk (0-25 points)
  const ilRisk = assessILRisk(pool.symbol);
  score += ilRisk; // 0-25
  
  // Factor 2: Protocol Risk (0-25 points)
  const protocolRisk = assessProtocolRisk(pool.protocol, pool.audited, pool.pool_age_days);
  score += protocolRisk; // 0-25
  
  // Factor 3: APY Sustainability (0-20 points)
  const apyRisk = assessAPYSustainability(pool.apy);
  score += apyRisk; // 0-20
  
  // Factor 4: Liquidity Risk (0-15 points)
  const liquidityRisk = assessLiquidityRisk(pool.tvl_usd);
  score += liquidityRisk; // 0-15
  
  // Factor 5: Smart Contract Risk (0-15 points)
  const contractRisk = assessContractRisk(pool.protocol, pool.pool_age_days);
  score += contractRisk; // 0-15
  
  return Math.min(100, score);
}

function assessILRisk(symbol: string): number {
  // Stable/stable pairs = low IL (0-5 points)
  if (isStablePair(symbol)) return 2;
  
  // Correlated pairs (ETH/stETH, BTC/WBTC) = low IL (5-10 points)
  if (isCorrelatedPair(symbol)) return 7;
  
  // Blue chip/stable (ETH/USDC, BTC/USDT) = medium IL (10-15 points)
  if (isBlueChipStablePair(symbol)) return 12;
  
  // Volatile/volatile (ETH/SOL, BTC/ETH) = high IL (15-20 points)
  if (isVolatilePair(symbol)) return 18;
  
  // Exotic/volatile (SHIB/DOGE, PEPE/FLOKI) = extreme IL (20-25 points)
  return 23;
}

function assessProtocolRisk(protocol: string, audited: boolean, ageDays: number): number {
  let score = 0;
  
  // Una audited = +15 points
  if (!audited) score += 15;
  
  // New protocol (<90 days) = +10 points
  if (ageDays < 90) score += 10;
  
  // Unknown protocol (not in top 50) = +5 points
  if (!isBlueChipProtocol(protocol)) score += 5;
  
  return Math.min(25, score);
}

function assessAPYSustainability(apy: number): number {
  // <10% APY = sustainable (0 points)
  if (apy < 10) return 0;
  
  // 10-30% APY = moderate (5 points)
  if (apy < 30) return 5;
  
  // 30-50% APY = high (10 points)
  if (apy < 50) return 10;
  
  // 50-100% APY = very high (15 points)
  if (apy < 100) return 15;
  
  // >100% APY = likely ponzi (20 points)
  return 20;
}

function assessLiquidityRisk(tvlUsd: number): number {
  // >$100M TVL = deep liquidity (0 points)
  if (tvlUsd > 100e6) return 0;
  
  // $50M-$100M = good liquidity (3 points)
  if (tvlUsd > 50e6) return 3;
  
  // $10M-$50M = moderate liquidity (7 points)
  if (tvlUsd > 10e6) return 7;
  
  // $1M-$10M = low liquidity (12 points)
  if (tvlUsd > 1e6) return 12;
  
  // <$1M = very low liquidity (15 points)
  return 15;
}

function assessContractRisk(protocol: string, ageDays: number): number {
  let score = 0;
  
  // Recently exploited protocol = +10 points
  if (hasRecentExploit(protocol)) score += 10;
  
  // New pool (<30 days) = +5 points
  if (ageDays < 30) score += 5;
  
  return Math.min(15, score);
}

function isStablePair(symbol: string): boolean {
  const stables = ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'TUSD', 'FDUSD'];
  const tokens = symbol.split('-').map(t => t.trim());
  return tokens.every(t => stables.includes(t));
}

function isCorrelatedPair(symbol: string): boolean {
  const correlated = [
    ['ETH', 'stETH'], ['ETH', 'wstETH'], ['ETH', 'rETH'], ['ETH', 'cbETH'],
    ['BTC', 'WBTC'], ['BTC', 'tBTC'], ['BTC', 'renBTC'],
    ['SOL', 'stSOL'], ['SOL', 'mSOL']
  ];
  const tokens = symbol.split('-').map(t => t.trim());
  return correlated.some(pair => 
    (tokens.includes(pair[0]) && tokens.includes(pair[1])) ||
    (tokens.includes(pair[1]) && tokens.includes(pair[0]))
  );
}

function isBlueChipStablePair(symbol: string): boolean {
  const blueChips = ['ETH', 'BTC', 'WBTC'];
  const stables = ['USDC', 'USDT', 'DAI'];
  const tokens = symbol.split('-').map(t => t.trim());
  return tokens.some(t => blueChips.includes(t)) && tokens.some(t => stables.includes(t));
}

function isVolatilePair(symbol: string): boolean {
  const volatile = ['ETH', 'BTC', 'SOL', 'AVAX', 'MATIC', 'ARB', 'OP'];
  const tokens = symbol.split('-').map(t => t.trim());
  return tokens.filter(t => volatile.includes(t)).length >= 2;
}

function isBlueChipProtocol(protocol: string): boolean {
  const blueChips = [
    'Uniswap', 'Curve', 'Aave', 'Compound', 'MakerDAO', 'Lido',
    'Balancer', 'SushiSwap', 'Yearn', 'Convex', 'PancakeSwap'
  ];
  return blueChips.some(bc => protocol.toLowerCase().includes(bc.toLowerCase()));
}

function hasRecentExploit(protocol: string): boolean {
  // Hardcoded list of protocols with recent exploits (update quarterly)
  const exploited = [
    'Multichain', 'Poly Network', 'Wormhole', 'Ronin', 'Nomad',
    'Harmony', 'BNB Bridge', 'Orbit', 'Hundred Finance'
  ];
  return exploited.some(e => protocol.toLowerCase().includes(e.toLowerCase()));
}
```

---

### 2. IL CALCULATOR

**IL Formula:**
```typescript
function calculateIL(priceChangePercent: number): number {
  // IL = 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
  // where priceRatio = 1 + priceChangePercent / 100
  
  const priceRatio = 1 + priceChangePercent / 100;
  const il = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
  
  return il * 100; // Return as percentage
}

// Examples:
// calculateIL(10) = -0.11% (negligible)
// calculateIL(25) = -0.62% (small)
// calculateIL(50) = -2.02% (moderate)
// calculateIL(100) = -5.72% (significant)
// calculateIL(200) = -13.39% (severe)
// calculateIL(500) = -31.75% (catastrophic)
```

**Break-Even APY:**
```typescript
function calculateBreakEvenAPY(ilPercent: number, daysHeld: number): number {
  // APY needed to offset IL
  const dailyIL = Math.abs(ilPercent) / daysHeld;
  const annualizedIL = dailyIL * 365;
  
  return annualizedIL;
}

// Example:
// If IL = -5.72% over 30 days, break-even APY = 69.6%
// If IL = -2.02% over 90 days, break-even APY = 8.2%
```

---

### 3. YIELD SOURCE BREAKDOWN

**Data Source:** DeFiLlama `/pools` endpoint includes `apyBase` and `apyReward`

**Enhanced API Response:**
```typescript
{
  "pool_id": "0x...",
  "protocol": "Uniswap V3",
  "symbol": "ETH-USDC",
  "apy": 15.5,
  "apy_base": 12.3,      // Fee yield (sustainable)
  "apy_reward": 3.2,     // Reward yield (emissions)
  "real_yield": 12.3,    // Same as apy_base (no rewards)
  "tvl_usd": 123456789,
  "risk_score": 35,
  "il_risk": "medium",
  "apy_30d_avg": 14.2,
  "apy_30d_std": 2.1,
  "audited": true,
  "pool_age_days": 365
}
```

**Yield Classification:**
- **100% Real Yield:** `apy_reward === 0` (fee-only pools)
- **Mostly Real Yield:** `apy_reward < 20% of total` (>80% fees)
- **Mixed Yield:** `apy_reward 20-50% of total`
- **Mostly Emissions:** `apy_reward 50-80% of total`
- **Pure Emissions:** `apy_reward > 80% of total` (likely unsustainable)

---

### 4. DATABASE LAYER

**Existing Table:** `yields_data` (has pool_id, protocol, chain, symbol, apy, tvl_usd, updated_at)

**Missing:** apy_base, apy_reward, audited, pool_age_days

**New Columns:** Add to existing table

```sql
-- Add columns to existing yields_data table
ALTER TABLE yields_data ADD COLUMN apy_base REAL;
ALTER TABLE yields_data ADD COLUMN apy_reward REAL;
ALTER TABLE yields_data ADD COLUMN audited INTEGER DEFAULT 0;
ALTER TABLE yields_data ADD COLUMN pool_age_days INTEGER DEFAULT 0;
ALTER TABLE yields_data ADD COLUMN risk_score INTEGER DEFAULT 50;
ALTER TABLE yields_data ADD COLUMN il_risk TEXT DEFAULT 'unknown';
```

**Migration File:** `database/migrations/metrilytics/006_yields_enhanced.sql`

---

### 5. DATA INGESTION LAYER (Cron Worker)

**File to Modify:** `workers/metrilytics-cron/index.ts`

**Update Existing Function:** `fetchYields()`

**DeFiLlama `/pools` Response:**
```json
{
  "data": [
    {
      "pool": "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
      "project": "uniswap-v3",
      "chain": "Ethereum",
      "symbol": "ETH-USDC",
      "tvlUsd": 123456789,
      "apy": 15.5,
      "apyBase": 12.3,
      "apyReward": 3.2,
      "rewardTokens": ["UNI"],
      "underlyingTokens": ["ETH", "USDC"]
    }
  ]
}
```

**Enhanced Ingestion:**
```typescript
async function fetchYields(db: D1Database): Promise<void> {
  const url = 'https://yields.llama.fi/pools';
  const data = await safeJson(url);
  
  if (!data || !Array.isArray(data.data)) {
    logWarn('[yields] Invalid response format');
    return;
  }
  
  const stmts: D1PreparedStatement[] = [];
  
  for (const pool of data.data) {
    const poolId = String(pool.pool || '').trim();
    const protocol = String(pool.project || '').trim();
    const chain = String(pool.chain || '').trim();
    const symbol = String(pool.symbol || '').trim();
    const tvlUsd = numeric(pool.tvlUsd);
    const apy = numeric(pool.apy);
    const apyBase = numeric(pool.apyBase);
    const apyReward = numeric(pool.apyReward);
    
    if (!poolId || !protocol || !symbol || tvlUsd === 0) continue;
    
    // Calculate risk score
    const riskScore = calculateRiskScore({
      symbol,
      protocol,
      apy,
      tvl_usd: tvlUsd,
      audited: isBlueChipProtocol(protocol),
      pool_age_days: 365 // TODO: Fetch from DeFiLlama pool detail
    });
    
    // Assess IL risk
    const ilRisk = assessILRiskCategory(symbol);
    
    stmts.push(
      db.prepare(`
        INSERT OR REPLACE INTO yields_data 
        (pool_id, protocol, chain, symbol, apy, apy_base, apy_reward, tvl_usd, risk_score, il_risk, audited, pool_age_days, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        poolId,
        protocol,
        chain,
        symbol,
        apy,
        apyBase,
        apyReward,
        tvlUsd,
        riskScore,
        ilRisk,
        isBlueChipProtocol(protocol) ? 1 : 0,
        365 // TODO: Fetch real pool age
      )
    );
  }
  
  if (stmts.length) {
    await batchInsert(db, stmts);
    console.log(`[yields] Ingested ${stmts.length} pools with risk scores`);
  }
}

function assessILRiskCategory(symbol: string): string {
  if (isStablePair(symbol)) return 'low';
  if (isCorrelatedPair(symbol)) return 'low';
  if (isBlueChipStablePair(symbol)) return 'medium';
  if (isVolatilePair(symbol)) return 'high';
  return 'extreme';
}
```

---

### 6. API LAYER

**Update Existing File:** `functions/api/metrilytics/yields.ts`

**Enhanced Response:**
```typescript
{
  "success": true,
  "data": {
    "pools": [
      {
        "pool_id": "0x...",
        "protocol": "Uniswap V3",
        "chain": "Ethereum",
        "symbol": "ETH-USDC",
        "apy": 15.5,
        "apy_base": 12.3,
        "apy_reward": 3.2,
        "real_yield": 12.3,
        "tvl_usd": 123456789,
        "risk_score": 35,
        "risk_level": "moderate",
        "il_risk": "medium",
        "apy_30d_avg": 14.2,
        "apy_30d_std": 2.1,
        "audited": true,
        "pool_age_days": 365,
        "yield_type": "mostly_real"
      }
    ],
    "screener_presets": {
      "safe_haven": [...],  // Stable pairs, <10% APY, risk <30
      "balanced": [...],    // 10-30% APY, risk 30-50
      "degen": [...],       // >30% APY, risk >50
      "real_yield": [...],  // apy_reward = 0
      "delta_neutral": [...] // Stable pairs with lending yield
    }
  }
}
```

---

### 7. FRONTEND LAYER

**Update Existing File:** `components/metrilytics/MetrilyticsBody.tsx` (YieldPanel function)

**OR Create New:** `components/metrilytics/panels/EnhancedYieldPanel.tsx`

**Enhanced Features:**

```typescript
function EnhancedYieldPanel() {
  const [pools, setPools] = useState<YieldPool[]>([]);
  const [screener, setScreener] = useState<'all' | 'safe' | 'balanced' | 'degen' | 'real' | 'delta'>('all');
  const [selectedPools, setSelectedPools] = useState<string[]>([]);
  
  return (
    <div className="enhanced-yield-panel">
      {/* Screener Presets */}
      <ScreenerPresets active={screener} onChange={setScreener} />
      
      {/* Risk Score Legend */}
      <RiskLegend />
      
      {/* Pool Table */}
      <PoolTable 
        pools={filteredPools}
        onSelectPool={(id) => togglePoolSelection(id)}
        selected={selectedPools}
      />
      
      {/* Pool Comparison (if 2-3 selected) */}
      {selectedPools.length >= 2 && (
        <PoolComparison pools={selectedPools.map(id => pools.find(p => p.pool_id === id))} />
      )}
      
      {/* IL Calculator Modal */}
      {showILCalculator && (
        <ILCalculatorModal pool={selectedPool} onClose={() => setShowILCalculator(false)} />
      )}
    </div>
  );
}

function PoolTable({ pools, onSelectPool, selected }: Props) {
  return (
    <table>
      <thead>
        <tr>
          <th>Pool</th>
          <th>Protocol</th>
          <th>APY</th>
          <th>Real Yield</th>
          <th>TVL</th>
          <th>Risk Score</th>
          <th>IL Risk</th>
          <th>30d Stability</th>
        </tr>
      </thead>
      <tbody>
        {pools.map(pool => (
          <tr key={pool.pool_id}>
            <td>{pool.symbol}</td>
            <td>{pool.protocol}</td>
            <td>
              <APYBreakdown apy={pool.apy} base={pool.apy_base} reward={pool.apy_reward} />
            </td>
            <td>{pool.real_yield.toFixed(1)}%</td>
            <td>{formatUsd(pool.tvl_usd)}</td>
            <td>
              <RiskBadge score={pool.risk_score} />
            </td>
            <td>
              <ILRiskBadge risk={pool.il_risk} />
            </td>
            <td>
              <StabilityIndicator avg={pool.apy_30d_avg} std={pool.apy_30d_std} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RiskBadge({ score }: { score: number }) {
  const color = score < 30 ? GREEN : score < 60 ? AMBER : RED;
  const label = score < 30 ? 'LOW' : score < 60 ? 'MODERATE' : 'HIGH';
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 8px',
      border: `1px solid ${color}`,
      borderRadius: '2px',
      fontSize: '10px',
      fontFamily: MONO,
      color: color
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: color
      }} />
      {score} {label}
    </div>
  );
}

function APYBreakdown({ apy, base, reward }: { apy: number; base: number; reward: number }) {
  const feePercent = (base / apy) * 100;
  const rewardPercent = (reward / apy) * 100;
  
  return (
    <div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: GREEN }}>
        {apy.toFixed(1)}%
      </div>
      <div style={{
        display: 'flex',
        height: '4px',
        borderRadius: '2px',
        overflow: 'hidden',
        marginTop: '4px'
      }}>
        <div style={{
          width: `${feePercent}%`,
          background: GREEN
        }} />
        <div style={{
          width: `${rewardPercent}%`,
          background: AMBER
        }} />
      </div>
      <div style={{ fontSize: '8px', color: FAINT, marginTop: '2px' }}>
        {feePercent.toFixed(0)}% fees / {rewardPercent.toFixed(0)}% rewards
      </div>
    </div>
  );
}
```

---

### 8. SCREENER PRESETS

**Safe Haven:**
- Stable pairs only (USDC-USDT, DAI-USDC, etc.)
- APY <10%
- Risk score <30
- Blue-chip protocols only

**Balanced:**
- APY 10-30%
- Risk score 30-50
- Blue chip/stable pairs (ETH-USDC, BTC-USDT)

**Degen:**
- APY >30%
- Risk score >50
- New protocols, volatile pairs

**Real Yield:**
- apy_reward = 0 (100% fee yield)
- Any APY, any risk score

**Delta Neutral:**
- Stable pairs with lending yield
- Correlated pairs (ETH-stETH, BTC-WBTC)

---

### 9. DELIVERABLES

**Files to Create:**
1. `database/migrations/metrilytics/006_yields_enhanced.sql`
2. `components/metrilytics/panels/EnhancedYieldPanel.tsx`

**Files to Modify:**
1. `workers/metrilytics-cron/index.ts` — Update `fetchYields()` with risk scoring
2. `functions/api/metrilytics/yields.ts` — Add risk_score, il_risk, apy_base, apy_reward to response
3. `components/metrilytics/MetrilyticsBody.tsx` — Replace YieldPanel with EnhancedYieldPanel

---

## SUCCESS CRITERIA

✅ **Composite risk scoring** (0-100) based on 5 factors  
✅ **IL calculator** with price change projections  
✅ **Yield source breakdown** (fee vs reward vs real yield)  
✅ **APY stability tracking** (30d volatility)  
✅ **Screener presets** (Safe Haven, Balanced, Degen, Real Yield, Delta Neutral)  
✅ **Pool comparison tool** (side-by-side risk metrics)  
✅ **Zero API keys required** (DeFiLlama is free)  
✅ **Terminal-native aesthetic**  

---

## FINAL NOTES

Yield farming is **the most dangerous activity in DeFi**. Users chase 100% APY without understanding they're providing exit liquidity for insiders.

This panel will **prevent users from losing money** on ponzi yield farms. Make it clear, make it accurate, make it save lives.

**Now execute.**
