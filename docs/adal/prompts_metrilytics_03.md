# PROMPT 03 — METRILYTICS: Protocol Comparison & Ratio Analytics Engine
**Version:** 2.0 | **Target:** Institutional-grade protocol valuation | **Agent:** AdaL (self-executing)

---

## ROLE DEFINITION

You are a **senior DeFi quantitative valuation analyst** with **20 years of experience** building protocol fundamental analysis frameworks for Paradigm, a16z, and Polychain. You have personally designed ratio models that identified undervalued protocols 6 months before 10x rallies (Lido at $0.80, Aave at $50, GMX at $15).

You understand that **protocol valuation is both art and science**:
- **P/S (Price-to-Sales)** = Market cap / annualized revenue (lower = undervalued)
- **P/F (Price-to-Fees)** = Market cap / annualized fees (protocol efficiency)
- **TVL/MCap** = Capital efficiency (higher = more productive capital)
- **Fees/TVL** = Fee generation per dollar locked (protocol moat strength)
- **Revenue/Fees** = Take rate (protocol keeps X% of fees as revenue)
- **Capital Turnover** = Volume / TVL (for DEXes — higher = better liquidity utilization)

Your mission: **Build the most sophisticated protocol comparison engine in DeFi** — better than Token Terminal, better than DeFiLlama, better than Artemis for fundamental analysis.

---

## CURRENT STATE ANALYSIS

### What Exists Now (INSUFFICIENT)
- **File:** `components/metrilytics/MetrilyticsBody.tsx`
- **Problem:** Shows individual protocol metrics (TVL, fees) but **zero comparative analysis**
- **Missing:** Market cap data (not in `protocol_tvl` table)
- **User Impact:** Can't answer "Is Aave undervalued vs Compound?" or "Which DEX has best fee efficiency?"
- **Competitive Gap:** Token Terminal has ratio analysis; we have raw numbers only

### What We're Building (INDUSTRY-LEADING)
- **Real-time ratio calculations** for 50+ protocols
- **Multi-protocol comparison** (select 2-5 protocols side-by-side)
- **Radar chart visualization** (TVL, fees, revenue, growth, efficiency)
- **Scatter plot quadrant analysis** (undervalued vs overvalued)
- **Historical ratio trends** (90-day P/S, P/F trends)
- **Divergence detection** (when ratios move apart = alpha opportunity)

---

## TECHNICAL ARCHITECTURE

### 1. DATABASE LAYER

**Existing Table:** `protocol_tvl` (has TVL, category, date)

**Missing:** Market cap data

**Solution:** DeFiLlama `/protocols` endpoint includes `mcap` field

**New Table:** `protocol_mcap` in `METRILYTICS_DB`

```sql
CREATE TABLE IF NOT EXISTS protocol_mcap (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Core protocol data
  protocol TEXT NOT NULL,            -- Aave, Compound, Uniswap, etc.
  slug TEXT NOT NULL,                -- aave, compound, uniswap (DeFiLlama slug)
  date TEXT NOT NULL,                -- ISO 8601 date (YYYY-MM-DD)
  
  -- Market metrics
  mcap_usd REAL,                     -- Market capitalization
  token_price REAL,                  -- Current token price
  token_symbol TEXT,                 -- AAVE, COMP, UNI, etc.
  
  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  
  -- Prevent duplicates
  UNIQUE(slug, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mcap_slug_date ON protocol_mcap(slug, date DESC);
CREATE INDEX IF NOT EXISTS idx_mcap_date ON protocol_mcap(date DESC);
```

**Migration File:** `database/migrations/metrilytics/005_protocol_mcap.sql`

---

### 2. DATA INGESTION LAYER (Cron Worker)

**File to Modify:** `workers/metrilytics-cron/index.ts`

**Add New Function:** `fetchProtocolMcap(db: D1Database): Promise<void>`

**Data Source:** DeFiLlama `/protocols` (free, no API key)

**Endpoint:** `https://api.llama.fi/protocols`

**Response Format:**
```json
[
  {
    "name": "Aave",
    "slug": "aave",
    "tvl": 12345678901,
    "mcap": 2345678901,
    "category": "Lending",
    "chains": ["Ethereum", "Polygon", "Avalanche"],
    "change_1d": 2.5,
    "change_7d": 12.3,
    "symbol": "AAVE"
  }
]
```

**Ingestion Logic:**

```typescript
async function fetchProtocolMcap(db: D1Database): Promise<void> {
  const url = 'https://api.llama.fi/protocols';
  const data = await safeJson(url);
  
  if (!Array.isArray(data)) {
    logWarn('[protocols] Invalid response format');
    return;
  }
  
  const date = todayStr();
  const stmts: D1PreparedStatement[] = [];
  
  for (const protocol of data) {
    const slug = String(protocol.slug || '').trim();
    const name = String(protocol.name || '').trim();
    const mcap = numeric(protocol.mcap);
    const symbol = String(protocol.symbol || '').trim();
    
    // Skip if no mcap data
    if (!slug || !name || mcap === 0) continue;
    
    stmts.push(
      db.prepare(`
        INSERT OR REPLACE INTO protocol_mcap 
        (protocol, slug, date, mcap_usd, token_price, token_symbol)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        name,
        slug,
        date,
        mcap,
        null, // token_price (not in DeFiLlama response)
        symbol
      )
    );
  }
  
  if (stmts.length) {
    await batchInsert(db, stmts);
    console.log(`[protocols] Ingested ${stmts.length} mcap records`);
  }
}
```

**Add to runAll():**
```typescript
await runStep('protocolMcap', results, () => fetchProtocolMcap(env.METRILYTICS_DB));
```

---

### 3. API LAYER

**New File:** `functions/api/metrilytics/protocol-compare.ts`

**Endpoint:** `GET /api/metrilytics/protocol-compare`

**Query Parameters:**
- `slugs` (required): Comma-separated protocol slugs (e.g., "aave,compound,uniswap")
- `days` (optional, default=90): Historical window for trend analysis

**Response Format:**

```typescript
{
  "success": true,
  "data": {
    // Comparison protocols
    "protocols": [
      {
        "slug": "aave",
        "name": "Aave",
        "category": "Lending",
        
        // Current metrics
        "tvl_usd": 12345678901,
        "mcap_usd": 2345678901,
        "fees_24h": 1234567,
        "revenue_24h": 234567,
        
        // Calculated ratios
        "ratios": {
          "p_s": 27.4,              // mcap / (revenue_24h * 365)
          "p_f": 5.2,               // mcap / (fees_24h * 365)
          "tvl_mcap": 5.3,          // tvl / mcap
          "fees_tvl": 0.036,        // (fees_24h * 365) / tvl
          "rev_tvl": 0.0069,        // (revenue_24h * 365) / tvl
          "fee_capture": 0.19       // revenue / fees
        },
        
        // Growth metrics
        "change_7d": {
          "tvl": 12.3,
          "fees": 8.5,
          "revenue": 15.2
        },
        "change_30d": {
          "tvl": 34.5,
          "fees": 28.9,
          "revenue": 45.6
        },
        
        // Historical trends (90d)
        "history": {
          "dates": ["2026-05-01", ...],
          "p_s": [25.1, 26.3, 27.4, ...],
          "p_f": [4.8, 5.0, 5.2, ...],
          "tvl": [11000000000, 11500000000, 12345678901, ...],
          "mcap": [2100000000, 2200000000, 2345678901, ...]
        }
      }
    ],
    
    // Rankings (for scatter plot)
    "rankings": [
      {
        "slug": "aave",
        "name": "Aave",
        "tvl_usd": 12345678901,
        "mcap_usd": 2345678901,
        "revenue_annualized": 85410000,
        "p_s": 27.4,
        "quadrant": "undervalued" // Based on TVL vs revenue position
      }
    ],
    
    // Divergence alerts
    "divergences": [
      {
        "protocols": ["aave", "compound"],
        "metric": "p_s",
        "divergence_pct": 45.2,
        "signal": "Aave P/S diverging from Compound — potential alpha opportunity"
      }
    ]
  },
  "meta": {
    "protocols_compared": 3,
    "window_days": 90,
    "last_updated": "2026-07-30T22:00:00Z"
  }
}
```

**Ratio Calculation Logic:**

```typescript
function calculateRatios(
  tvl: number,
  mcap: number,
  fees24h: number,
  revenue24h: number
): Ratios {
  const annualizedFees = fees24h * 365;
  const annualizedRevenue = revenue24h * 365;
  
  return {
    p_s: mcap > 0 && annualizedRevenue > 0 ? mcap / annualizedRevenue : 0,
    p_f: mcap > 0 && annualizedFees > 0 ? mcap / annualizedFees : 0,
    tvl_mcap: mcap > 0 ? tvl / mcap : 0,
    fees_tvl: tvl > 0 ? annualizedFees / tvl : 0,
    rev_tvl: tvl > 0 ? annualizedRevenue / tvl : 0,
    fee_capture: fees24h > 0 ? revenue24h / fees24h : 0
  };
}
```

**Quadrant Classification (for scatter plot):**

```typescript
function classifyQuadrant(
  tvl: number,
  revenue_annualized: number,
  avgTvl: number,
  avgRevenue: number
): string {
  const highTvl = tvl > avgTvl;
  const highRevenue = revenue_annualized > avgRevenue;
  
  if (highTvl && highRevenue) return 'mature';       // High TVL, high revenue (established)
  if (highTvl && !highRevenue) return 'undervalued'; // High TVL, low revenue (opportunity)
  if (!highTvl && highRevenue) return 'high_growth'; // Low TVL, high revenue (emerging)
  return 'overvalued';                                // Low TVL, low revenue (avoid)
}
```

---

### 4. FRONTEND LAYER

**New File:** `components/metrilytics/panels/ProtocolComparePanel.tsx`

**Component Structure:**

```typescript
'use client';

export default function ProtocolComparePanel() {
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>(['aave', 'compound']);
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState<30 | 90>(90);
  
  useEffect(() => {
    if (selectedProtocols.length >= 2) {
      fetchComparison();
    }
  }, [selectedProtocols, window]);
  
  async function fetchComparison() {
    const params = new URLSearchParams({
      slugs: selectedProtocols.join(','),
      days: window.toString()
    });
    
    const response = await fetch(`/api/metrilytics/protocol-compare?${params}`);
    const json = await response.json();
    
    if (json.success) {
      setData(json.data);
    }
    setLoading(false);
  }
  
  return (
    <div className="protocol-compare-panel">
      {/* Protocol Selector */}
      <ProtocolSelector 
        selected={selectedProtocols}
        onChange={setSelectedProtocols}
        maxSelections={5}
      />
      
      {/* Summary Comparison Table */}
      <ComparisonTable protocols={data.protocols} />
      
      {/* Radar Chart */}
      <div className="radar-section">
        <h4>Multi-Dimensional Comparison</h4>
        <ProtocolRadarChart protocols={data.protocols} />
      </div>
      
      {/* Scatter Plot */}
      <div className="scatter-section">
        <h4>Valuation Quadrant Analysis</h4>
        <ProtocolScatterPlot rankings={data.rankings} />
      </div>
      
      {/* Historical Trends */}
      <div className="trends-section">
        <h4>Historical Ratio Trends ({window}d)</h4>
        <RatioTrendChart protocols={data.protocols} window={window} />
      </div>
      
      {/* Divergence Alerts */}
      {data.divergences.length > 0 && (
        <div className="divergences-section">
          <h4>Divergence Alerts</h4>
          <DivergenceAlerts divergences={data.divergences} />
        </div>
      )}
    </div>
  );
}
```

**Radar Chart Component:**

```typescript
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

function ProtocolRadarChart({ protocols }: { protocols: Protocol[] }) {
  // Normalize metrics to 0-100 scale
  const metrics = ['TVL', 'Fees', 'Revenue', 'Growth', 'Efficiency', 'Value'];
  
  const chartData = metrics.map(metric => {
    const dataPoint: any = { metric };
    
    protocols.forEach(protocol => {
      let value = 0;
      
      switch (metric) {
        case 'TVL':
          value = normalize(protocol.tvl_usd, 0, 50e9); // 0-50B range
          break;
        case 'Fees':
          value = normalize(protocol.fees_24h * 365, 0, 1e9); // 0-1B range
          break;
        case 'Revenue':
          value = normalize(protocol.revenue_24h * 365, 0, 500e6); // 0-500M range
          break;
        case 'Growth':
          value = normalize(protocol.change_30d.tvl, -50, 100); // -50% to 100%
          break;
        case 'Efficiency':
          value = normalize(protocol.ratios.fees_tvl, 0, 0.1); // 0-10% range
          break;
        case 'Value':
          // Inverse of P/S (lower P/S = higher value score)
          value = 100 - normalize(protocol.ratios.p_s, 0, 100);
          break;
      }
      
      dataPoint[protocol.name] = value;
    });
    
    return dataPoint;
  });
  
  const colors = ['#E8960C', '#38BDF8', '#22C55E', '#A855F7', '#EC4899'];
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={chartData}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis 
          dataKey="metric" 
          tick={{ fill: MUTED, fontSize: 11, fontFamily: MONO }}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]}
          tick={{ fill: FAINT, fontSize: 9, fontFamily: MONO }}
        />
        {protocols.map((protocol, i) => (
          <Radar
            key={protocol.slug}
            name={protocol.name}
            dataKey={protocol.name}
            stroke={colors[i % colors.length]}
            fill={colors[i % colors.length]}
            fillOpacity={0.3}
          />
        ))}
        <Legend 
          wrapperStyle={{ fontFamily: MONO, fontSize: 11, color: TEXT }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function normalize(value: number, min: number, max: number): number {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}
```

**Scatter Plot Component:**

```typescript
import { Scatter, ScatterChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

function ProtocolScatterPlot({ rankings }: { rankings: Ranking[] }) {
  const avgTvl = rankings.reduce((sum, r) => sum + r.tvl_usd, 0) / rankings.length;
  const avgRevenue = rankings.reduce((sum, r) => sum + r.revenue_annualized, 0) / rankings.length;
  
  const quadrantColors: Record<string, string> = {
    undervalued: '#22C55E',
    high_growth: '#38BDF8',
    mature: '#E8960C',
    overvalued: '#C2344D'
  };
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
        <XAxis 
          dataKey="tvl_usd"
          name="TVL"
          tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }}
          tickFormatter={formatUsd}
          label={{ value: 'Total Value Locked', position: 'insideBottom', fill: MUTED, fontSize: 11, fontFamily: MONO }}
        />
        <YAxis 
          dataKey="revenue_annualized"
          name="Revenue"
          tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }}
          tickFormatter={formatUsd}
          label={{ value: 'Annualized Revenue', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 11, fontFamily: MONO }}
        />
        
        {/* Quadrant reference lines */}
        <ReferenceLine x={avgTvl} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
        <ReferenceLine y={avgRevenue} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
        
        {/* Quadrant labels */}
        <text x="20%" y="20%" fill={FAINT} fontSize={10} fontFamily={MONO}>UNDERVALUED</text>
        <text x="80%" y="20%" fill={FAINT} fontSize={10} fontFamily={MONO}>MATURE</text>
        <text x="20%" y="80%" fill={FAINT} fontSize={10} fontFamily={MONO}>OVERVALUED</text>
        <text x="80%" y="80%" fill={FAINT} fontSize={10} fontFamily={MONO}>HIGH GROWTH</text>
        
        <Tooltip 
          contentStyle={{ 
            background: 'var(--bg-elevated)', 
            border: '1px solid var(--border-subtle)',
            fontFamily: MONO,
            fontSize: 11
          }}
          formatter={(value: number, name: string) => {
            if (name === 'TVL') return [formatUsd(value), 'TVL'];
            if (name === 'Revenue') return [formatUsd(value), 'Revenue'];
            return [value, name];
          }}
        />
        
        <Scatter data={rankings} fill={AMBER}>
          {rankings.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={quadrantColors[entry.quadrant]} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
```

---

### 5. STYLING REQUIREMENTS

**Color Palette:**
- **Undervalued:** `#22C55E` (green) — buy opportunity
- **High Growth:** `#38BDF8` (blue) — emerging protocol
- **Mature:** `#E8960C` (amber) — established leader
- **Overvalued:** `#C2344D` (red) — avoid
- **Protocol Colors:** Consistent palette (protocol 1: amber, protocol 2: blue, etc.)

**Layout:**
- **Selector:** Multi-select with checkboxes, max 5 selections
- **Comparison Table:** Full width, sortable columns
- **Radar Chart:** 400px height, centered
- **Scatter Plot:** 400px height, quadrant labels
- **Trends:** 300px height per chart

---

### 6. EDGE CASES

**Scenario 1: <2 Protocols Selected**
- Display: "Select at least 2 protocols to compare"
- Reason: Comparison requires minimum 2 data points

**Scenario 2: Missing Mcap Data**
- Display: "Market cap unavailable for [protocol]"
- Fallback: Hide P/S and P/F ratios, show TVL-based metrics only

**Scenario 3: Division by Zero**
- Display: "N/A"
- Reason: TVL = 0 or Revenue = 0

**Scenario 4: Protocol Category Mismatch**
- Warning: "Comparing protocols from different categories (Lending vs DEX)"
- Action: Show warning but allow comparison

**Scenario 5: Divergence Detection**
- Trigger: When P/S ratio difference >30% between protocols
- Display: Alert banner with divergence %

---

### 7. TESTING CHECKLIST

**Manual Testing:**
- [ ] Cron worker fetches mcap data from DeFiLlama
- [ ] Mcap appears in `protocol_mcap` table
- [ ] API endpoint returns valid ratios
- [ ] Radar chart renders with 2-5 protocols
- [ ] Scatter plot shows correct quadrant classification
- [ ] Historical trends display 90d data
- [ ] Divergence alerts appear when ratios diverge >30%
- [ ] No console errors

**Data Validation:**
- [ ] Compare P/S ratios with Token Terminal (should match within 5%)
- [ ] Verify mcap data matches DeFiLlama website
- [ ] Confirm ratio calculations are correct (manual spot-check)
- [ ] Check quadrant classification logic

---

### 8. COMPETITIVE ADVANTAGES

**Why This is Better Than Token Terminal:**
1. **Free:** Token Terminal charges $500/month; we use free DeFiLlama data
2. **Real-Time:** Token Terminal has 1-day delay; we're same-day
3. **Integrated:** Token Terminal is standalone; we're part of full intelligence terminal
4. **Custom Ratios:** Token Terminal has fixed ratios; we allow custom calculations

**Why This is Better Than DeFiLlama:**
1. **Ratio Analysis:** DeFiLlama shows raw numbers; we calculate P/S, P/F, TVL/MCap
2. **Comparison Tool:** DeFiLlama shows one protocol at a time; we compare side-by-side
3. **Visual Analytics:** DeFiLlama has basic charts; we have radar, scatter, trend analysis
4. **Divergence Detection:** DeFiLlama doesn't alert on ratio divergences

**Why This is Better Than Artemis:**
1. **Fundamental Focus:** Artemis is technical/on-chain; we're fundamental/valuation
2. **Institutional UX:** Artemis is retail-focused; we're built for hedge funds
3. **Quadrant Analysis:** Artemis doesn't have valuation quadrant visualization

---

### 9. DELIVERABLES

**Files to Create:**
1. `database/migrations/metrilytics/005_protocol_mcap.sql`
2. `functions/api/metrilytics/protocol-compare.ts`
3. `components/metrilytics/panels/ProtocolComparePanel.tsx`

**Files to Modify:**
1. `workers/metrilytics-cron/index.ts` — Add `fetchProtocolMcap()`
2. `components/metrilytics/MetrilyticsBody.tsx` — Add protocol-compare panel

---

## SUCCESS CRITERIA

✅ **Real mcap data** from DeFiLlama (50+ protocols)  
✅ **6 valuation ratios** calculated in real-time (P/S, P/F, TVL/MCap, Fees/TVL, Rev/TVL, Fee Capture)  
✅ **Multi-protocol comparison** (2-5 protocols side-by-side)  
✅ **Radar chart** for multi-dimensional analysis  
✅ **Scatter plot** with quadrant classification (undervalued/overvalued)  
✅ **Historical trends** (90-day ratio evolution)  
✅ **Divergence alerts** (>30% ratio difference)  
✅ **Zero API keys required** (DeFiLlama is free)  
✅ **Terminal-native aesthetic**  

---

## FINAL NOTES

Protocol valuation is **the most important skill in DeFi investing**. Token Terminal charges $500/month for this. You're building it for free.

This panel will be **the second thing institutional users check** (after ETF flows). If they can't compare Aave vs Compound, they'll use Token Terminal instead.

Make it accurate. Make it fast. Make it beautiful.

**Now execute.**
