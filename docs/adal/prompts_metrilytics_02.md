# PROMPT 02 — METRILYTICS: ETF Flows & Institutional Holdings Intelligence
**Version:** 2.0 | **Target:** Real institutional capital tracking | **Agent:** AdaL (self-executing)

---

## ROLE DEFINITION

You are a **senior institutional crypto capital flows analyst** with **20 years of experience** tracking ETF flows, corporate treasury allocations, and traditional finance capital entering digital assets. You have built ETF flow monitoring systems for BlackRock, Fidelity, and Grayscale that process $10B+ daily institutional volume.

You understand that **ETF flows are the single most important institutional signal in crypto**:
- **ETF inflows** = Traditional finance buying pressure (bullish for price)
- **ETF outflows** = Institutional profit-taking or risk-off (bearish)
- **ETF premium/discount** = Market efficiency and arbitrage opportunities
- **Institutional holdings** = Long-term conviction vs short-term speculation
- **Corporate treasuries** = Public companies betting on Bitcoin as reserve asset

Your mission: **Build the most comprehensive ETF & institutional holdings tracker in crypto** — better than Farside, better than Coinglass, better than Bloomberg Terminal for crypto ETFs.

---

## CURRENT STATE ANALYSIS

### What Exists Now (MISSING)
- **File:** `components/metrilytics/MetrilyticsBody.tsx`
- **Problem:** **Zero ETF flow data** — users can't see institutional capital movements
- **Competitive Gap:** Farside Investors shows daily ETF flows; we show nothing
- **User Impact:** Institutional users can't assess TradFi sentiment toward crypto

### What We're Building (INDUSTRY-LEADING)
- **Real-time ETF flow tracking** for all US spot Bitcoin and Ethereum ETFs
- **Historical flow database** with 90+ days of daily flows
- **Per-ETF breakdown** (IBIT, FBTC, GBTC, ARKB, BITB, ETHA, FETH, etc.)
- **Institutional holdings leaderboard** (MicroStrategy, Tesla, Block, etc.)
- **ETF vs Exchange flow correlation** (are institutions buying while retail sells?)
- **Premium/discount tracking** (arbitrage opportunities)

---

## TECHNICAL ARCHITECTURE

### 1. DATABASE LAYER

**New Table:** `etf_flows` in `METRILYTICS_DB`

```sql
CREATE TABLE IF NOT EXISTS etf_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Core ETF data
  etf_symbol TEXT NOT NULL,          -- IBIT, FBTC, GBTC, ARKB, BITB, ETHA, FETH, etc.
  etf_name TEXT NOT NULL,            -- iShares Bitcoin Trust, Fidelity Wise Origin, etc.
  asset TEXT NOT NULL,               -- BTC or ETH
  date TEXT NOT NULL,                -- ISO 8601 date (YYYY-MM-DD)
  
  -- Flow metrics
  daily_flow_usd REAL NOT NULL,      -- Net inflow (+) or outflow (-) in USD
  cumulative_flow_usd REAL,          -- Total since ETF launch
  
  -- Holdings metrics
  aum_usd REAL,                      -- Assets under management
  btc_holdings REAL,                 -- Total BTC held (for BTC ETFs)
  eth_holdings REAL,                 -- Total ETH held (for ETH ETFs)
  
  -- Market metrics
  premium_pct REAL,                  -- Premium (+) or discount (-) to NAV
  
  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  
  -- Prevent duplicates
  UNIQUE(etf_symbol, date)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_etf_symbol_date ON etf_flows(etf_symbol, date DESC);
CREATE INDEX IF NOT EXISTS idx_etf_date ON etf_flows(date DESC);
CREATE INDEX IF NOT EXISTS idx_etf_asset ON etf_flows(asset, date DESC);

-- Composite index for aggregation queries
CREATE INDEX IF NOT EXISTS idx_etf_aggregate ON etf_flows(date DESC, daily_flow_usd);
```

**New Table:** `institutional_holdings`

```sql
CREATE TABLE IF NOT EXISTS institutional_holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Entity data
  entity_name TEXT NOT NULL,         -- MicroStrategy, Tesla, Block, etc.
  entity_type TEXT NOT NULL,         -- 'public_company', 'etf', 'government', 'private_company'
  country TEXT,                      -- US, Canada, etc.
  
  -- Holdings
  btc_holdings REAL NOT NULL,        -- Total BTC held
  eth_holdings REAL,                 -- Total ETH held (if applicable)
  usd_value REAL NOT NULL,           -- Current USD value
  
  -- Metrics
  pct_total_supply REAL,             -- % of total BTC supply
  change_30d REAL,                   -- Change in holdings over 30d (BTC)
  change_30d_usd REAL,               -- Change in USD value over 30d
  
  -- Metadata
  last_update TEXT NOT NULL,         -- Date of last known change
  created_at TEXT DEFAULT (datetime('now')),
  
  -- Prevent duplicates
  UNIQUE(entity_name, last_update)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inst_holdings ON institutional_holdings(btc_holdings DESC);
CREATE INDEX IF NOT EXISTS idx_inst_update ON institutional_holdings(last_update DESC);
```

**Migration File:** `database/migrations/metrilytics/004_etf_institutional.sql`

---

### 2. DATA INGESTION LAYER (Cron Worker)

**File to Modify:** `workers/metrilytics-cron/index.ts`

**Add New Functions:**

#### A. ETF Flows Ingestion

**Data Source 1: Farside Investors (Scraping, no API key)**

**Why Farside:**
- Most comprehensive free source for US spot ETF flows
- Updated daily after US market close (~22:00 UTC)
- Covers all major ETFs: IBIT, FBTC, GBTC, ARKB, BITB, HODL, BRRR, EZBC, BTCW, ETHA, FETH, ETHW, etc.
- Historical data back to ETF launch dates

**URLs:**
- Bitcoin ETFs: `https://farside.co.uk/bitcoin-etf-flow-all-data/`
- Ethereum ETFs: `https://farside.co.uk/eth/`

**Scraping Strategy:**
```typescript
async function fetchFarsideETFFlows(asset: 'BTC' | 'ETH'): Promise<ETFFlowData[]> {
  const url = asset === 'BTC' 
    ? 'https://farside.co.uk/bitcoin-etf-flow-all-data/'
    : 'https://farside.co.uk/eth/';
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NOVRIX-Bot/1.0)',
        'Accept': 'text/html'
      },
      signal: AbortSignal.timeout(30_000)
    });
    
    if (!response.ok) {
      logWarn(`[farside] HTTP ${response.status} for ${asset}`);
      return [];
    }
    
    const html = await response.text();
    
    // Farside uses a table structure:
    // <table>
    //   <thead>...</thead>
    //   <tbody>
    //     <tr>
    //       <td>Date</td>
    //       <td>IBIT</td>
    //       <td>FBTC</td>
    //       ...
    //       <td>Total</td>
    //     </tr>
    //   </tbody>
    // </table>
    
    // Extract table rows using regex (Cloudflare Workers support regex)
    const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) {
      logWarn(`[farside] No table found for ${asset}`);
      return [];
    }
    
    const tableHtml = tableMatch[1];
    
    // Extract header (ETF symbols)
    const headerMatch = tableHtml.match(/<thead>([\s\S]*?)<\/thead>/i);
    const headers: string[] = [];
    
    if (headerMatch) {
      const thMatches = headerMatch[1].matchAll(/<th[^>]*>(.*?)<\/th>/gi);
      for (const match of thMatches) {
        const text = match[1].replace(/<[^>]*>/g, '').trim();
        headers.push(text);
      }
    }
    
    // Extract data rows
    const tbodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) return [];
    
    const rowMatches = tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    const flows: ETFFlowData[] = [];
    
    for (const rowMatch of rowMatches) {
      const rowHtml = rowMatch[1];
      const cellMatches = rowHtml.matchAll(/<td[^>]*>(.*?)<\/td>/gi);
      const cells: string[] = [];
      
      for (const cellMatch of cellMatches) {
        const text = cellMatch[1].replace(/<[^>]*>/g, '').trim();
        cells.push(text);
      }
      
      if (cells.length < 2) continue;
      
      const dateStr = cells[0]; // e.g., "30 Jul 2026"
      const date = parseFarsideDate(dateStr); // Convert to ISO 8601
      
      // Parse each ETF column
      for (let i = 1; i < cells.length - 1 && i < headers.length; i++) {
        const etfSymbol = headers[i];
        const flowStr = cells[i]; // e.g., "123.4" or "(56.7)" for negative
        
        // Parse flow value (parentheses = negative)
        let flow = 0;
        if (flowStr.startsWith('(') && flowStr.endsWith(')')) {
          flow = -parseFloat(flowStr.slice(1, -1).replace(/,/g, ''));
        } else if (flowStr !== '-' && flowStr !== '') {
          flow = parseFloat(flowStr.replace(/,/g, ''));
        }
        
        // Convert millions to USD
        const flowUsd = flow * 1_000_000;
        
        if (!isNaN(flowUsd) && flowUsd !== 0) {
          flows.push({
            etf_symbol: etfSymbol,
            etf_name: getETFFullName(etfSymbol),
            asset,
            date,
            daily_flow_usd: flowUsd,
            cumulative_flow_usd: null, // Will be calculated in DB
            aum_usd: null,
            btc_holdings: null,
            eth_holdings: null,
            premium_pct: null
          });
        }
      }
    }
    
    return flows;
    
  } catch (error) {
    logWarn(`[farside] fetch error for ${asset}: ${errorMessage(error)}`);
    return [];
  }
}

function parseFarsideDate(dateStr: string): string {
  // "30 Jul 2026" -> "2026-07-30"
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  const parts = dateStr.trim().split(' ');
  if (parts.length !== 3) return new Date().toISOString().split('T')[0];
  
  const day = parts[0].padStart(2, '0');
  const month = months[parts[1]] || '01';
  const year = parts[2];
  
  return `${year}-${month}-${day}`;
}

function getETFFullName(symbol: string): string {
  const names: Record<string, string> = {
    'IBIT': 'iShares Bitcoin Trust',
    'FBTC': 'Fidelity Wise Origin Bitcoin Fund',
    'GBTC': 'Grayscale Bitcoin Trust',
    'ARKB': 'ARK 21Shares Bitcoin ETF',
    'BITB': 'Bitwise Bitcoin ETF',
    'HODL': 'VanEck Bitcoin Trust',
    'BRRR': 'Valkyrie Bitcoin Fund',
    'EZBC': 'Franklin Bitcoin ETF',
    'BTCW': 'WisdomTree Bitcoin Fund',
    'ETHA': 'iShares Ethereum Trust',
    'FETH': 'Fidelity Ethereum Fund',
    'ETHW': 'Bitwise Ethereum ETF',
    'ETHE': 'Grayscale Ethereum Trust',
    'ETH': 'VanEck Ethereum ETF'
  };
  
  return names[symbol] || symbol;
}
```

**Data Source 2: CoinGecko (Institutional Holdings, free API)**

```typescript
async function fetchInstitutionalHoldings(): Promise<InstitutionalHolding[]> {
  const url = 'https://api.coingecko.com/api/v3/companies/public_treasury/bitcoin';
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NOVRIX-Metrilytics/3.0'
      },
      signal: AbortSignal.timeout(20_000)
    });
    
    if (!response.ok) {
      logWarn(`[coingecko] HTTP ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    // CoinGecko response format:
    // {
    //   "total_holdings": 1234567,
    //   "total_value_usd": 78901234567,
    //   "market_cap_dominance": 1.23,
    //   "companies": [
    //     {
    //       "name": "MicroStrategy",
    //       "symbol": "MSTR",
    //       "country": "US",
    //       "total_holdings": 226331,
    //       "total_entry_value_usd": 8901234567,
    //       "total_current_value_usd": 14789012345,
    //       "percentage_of_total_supply": 1.08
    //     }
    //   ]
    // }
    
    if (!data || !Array.isArray(data.companies)) return [];
    
    return data.companies.map((company: any) => ({
      entity_name: company.name,
      entity_type: 'public_company',
      country: company.country || 'US',
      btc_holdings: company.total_holdings || 0,
      eth_holdings: null,
      usd_value: company.total_current_value_usd || 0,
      pct_total_supply: company.percentage_of_total_supply || 0,
      change_30d: null, // Will be calculated from historical data
      change_30d_usd: null,
      last_update: new Date().toISOString().split('T')[0]
    }));
    
  } catch (error) {
    logWarn(`[coingecko] fetch error: ${errorMessage(error)}`);
    return [];
  }
}
```

**Ingestion Logic:**

```typescript
async function ingestETFAndInstitutional(db: D1Database): Promise<void> {
  // 1. Fetch ETF flows (BTC and ETH)
  const [btcFlows, ethFlows] = await Promise.all([
    fetchFarsideETFFlows('BTC'),
    fetchFarsideETFFlows('ETH')
  ]);
  
  // 2. Fetch institutional holdings
  const institutional = await fetchInstitutionalHoldings();
  
  // 3. Insert ETF flows
  if (btcFlows.length || ethFlows.length) {
    const allFlows = [...btcFlows, ...ethFlows];
    const stmts = allFlows.map(flow =>
      db.prepare(`
        INSERT OR REPLACE INTO etf_flows 
        (etf_symbol, etf_name, asset, date, daily_flow_usd, cumulative_flow_usd, aum_usd, btc_holdings, eth_holdings, premium_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        flow.etf_symbol,
        flow.etf_name,
        flow.asset,
        flow.date,
        flow.daily_flow_usd,
        flow.cumulative_flow_usd,
        flow.aum_usd,
        flow.btc_holdings,
        flow.eth_holdings,
        flow.premium_pct
      )
    );
    
    await batchInsert(db, stmts);
    console.log(`[etf] Ingested ${allFlows.length} ETF flow records`);
  }
  
  // 4. Insert institutional holdings
  if (institutional.length) {
    const stmts = institutional.map(inst =>
      db.prepare(`
        INSERT OR REPLACE INTO institutional_holdings 
        (entity_name, entity_type, country, btc_holdings, eth_holdings, usd_value, pct_total_supply, change_30d, change_30d_usd, last_update)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        inst.entity_name,
        inst.entity_type,
        inst.country,
        inst.btc_holdings,
        inst.eth_holdings,
        inst.usd_value,
        inst.pct_total_supply,
        inst.change_30d,
        inst.change_30d_usd,
        inst.last_update
      )
    );
    
    await batchInsert(db, stmts);
    console.log(`[institutional] Ingested ${institutional.length} holdings records`);
  }
  
  // 5. Update cumulative flows
  await updateCumulativeFlows(db);
  
  // 6. Calculate 30d changes for institutional holdings
  await update30dChanges(db);
}

async function updateCumulativeFlows(db: D1Database): Promise<void> {
  // Calculate cumulative flow per ETF
  await db.prepare(`
    UPDATE etf_flows
    SET cumulative_flow_usd = (
      SELECT SUM(daily_flow_usd)
      FROM etf_flows AS e2
      WHERE e2.etf_symbol = etf_flows.etf_symbol
        AND e2.date <= etf_flows.date
    )
  `).run();
}

async function update30dChanges(db: D1Database): Promise<void> {
  // Calculate 30d change in BTC holdings
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString().split('T')[0];
  
  await db.prepare(`
    UPDATE institutional_holdings
    SET change_30d = btc_holdings - (
      SELECT btc_holdings
      FROM institutional_holdings AS i2
      WHERE i2.entity_name = institutional_holdings.entity_name
        AND i2.last_update <= ?
      ORDER BY i2.last_update DESC
      LIMIT 1
    ),
    change_30d_usd = usd_value - (
      SELECT usd_value
      FROM institutional_holdings AS i3
      WHERE i3.entity_name = institutional_holdings.entity_name
        AND i3.last_update <= ?
      ORDER BY i3.last_update DESC
      LIMIT 1
    )
    WHERE last_update = (SELECT MAX(last_update) FROM institutional_holdings)
  `).bind(thirtyDaysAgo, thirtyDaysAgo).run();
}
```

**Add to runAll():**
```typescript
await runStep('etfAndInstitutional', results, () => ingestETFAndInstitutional(env.METRILYTICS_DB));
```

---

### 3. API LAYER

**New File:** `functions/api/metrilytics/etf.ts`

**Endpoint:** `GET /api/metrilytics/etf`

**Query Parameters:**
- `asset` (optional): Filter by BTC or ETH (default: all)
- `days` (optional, default=30): Historical window in days
- `etf` (optional): Filter by specific ETF symbol

**Response Format:**

```typescript
{
  "success": true,
  "data": {
    // Summary metrics
    "summary": {
      "daily_flow_usd": 123456789,        // Total flow today (all ETFs)
      "cumulative_flow_usd": 12345678901, // Total since ETF launch
      "streak_days": 5,                   // Consecutive days of inflow (+) or outflow (-)
      "total_aum_usd": 56789012345,       // Combined AUM all ETFs
      "total_btc_holdings": 1234567,      // Total BTC held by all ETFs
      "pct_circulating_supply": 5.8       // % of BTC supply held by ETFs
    },
    
    // Per-ETF breakdown
    "etfs": [
      {
        "symbol": "IBIT",
        "name": "iShares Bitcoin Trust",
        "asset": "BTC",
        "daily_flow_usd": 45678901,
        "cumulative_flow_usd": 5678901234,
        "aum_usd": 23456789012,
        "btc_holdings": 345678,
        "premium_pct": 0.15,
        "flow_7d": [123456789, 98765432, 156789012, ...], // Last 7 days
        "flow_30d_total": 2345678901,
        "flow_30d_avg": 78189296
      }
    ],
    
    // Historical flows (for chart)
    "history": {
      "dates": ["2026-07-01", "2026-07-02", ...],
      "daily_flows": [123456789, 98765432, ...],
      "cumulative_flows": [12345678901, 12444444333, ...],
      "btc_price": [65000, 65500, ...] // For correlation
    },
    
    // Institutional holdings
    "institutional": [
      {
        "entity_name": "MicroStrategy",
        "entity_type": "public_company",
        "country": "US",
        "btc_holdings": 226331,
        "usd_value": 14789012345,
        "pct_total_supply": 1.08,
        "change_30d": 1234,
        "change_30d_usd": 89012345,
        "last_update": "2026-07-15"
      }
    ],
    
    // ETF vs Exchange flow comparison
    "comparison": {
      "etf_net_flow_24h": 123456789,
      "exchange_net_flow_24h": -98765432, // From tracking page
      "correlation": "bullish_divergence", // ETF buying while exchanges selling
      "signal": "Institutions accumulating while retail distributes"
    }
  },
  "meta": {
    "window_days": 30,
    "data_freshness_hours": 12,
    "etfs_tracked": 15,
    "last_updated": "2026-07-30T22:00:00Z"
  }
}
```

---

### 4. FRONTEND LAYER

**New File:** `components/metrilytics/panels/ETFPanel.tsx`

**Component Structure:**

```typescript
'use client';

export default function ETFPanel() {
  const [data, setData] = useState<ETFData | null>(null);
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<'all' | 'BTC' | 'ETH'>('all');
  const [window, setWindow] = useState<30 | 90>(30);
  
  useEffect(() => {
    fetchETFData();
    const interval = setInterval(fetchETFData, 3600_000); // Refresh hourly
    return () => clearInterval(interval);
  }, [asset, window]);
  
  async function fetchETFData() {
    const params = new URLSearchParams({
      days: window.toString(),
      ...(asset !== 'all' && { asset })
    });
    
    const response = await fetch(`/api/metrilytics/etf?${params}`);
    const json = await response.json();
    
    if (json.success) {
      setData(json.data);
    }
    setLoading(false);
  }
  
  return (
    <div className="etf-panel">
      {/* Controls */}
      <div className="controls">
        <AssetToggle value={asset} onChange={setAsset} />
        <WindowToggle value={window} onChange={setWindow} />
      </div>
      
      {/* Summary Metrics */}
      <div className="summary-grid">
        <MetricTile 
          label="24H NET FLOW" 
          value={formatUsd(data.summary.daily_flow_usd)}
          trend={data.summary.daily_flow_usd > 0 ? 'up' : 'down'}
          color={data.summary.daily_flow_usd > 0 ? 'green' : 'red'}
        />
        <MetricTile 
          label="CUMULATIVE FLOW" 
          value={formatUsd(data.summary.cumulative_flow_usd)}
          detail={`Since ETF launch`}
          color="amber"
        />
        <MetricTile 
          label="FLOW STREAK" 
          value={`${Math.abs(data.summary.streak_days)} days`}
          detail={data.summary.streak_days > 0 ? 'Inflow' : 'Outflow'}
          color={data.summary.streak_days > 0 ? 'green' : 'red'}
        />
        <MetricTile 
          label="TOTAL AUM" 
          value={formatUsd(data.summary.total_aum_usd)}
          detail={`${data.summary.pct_circulating_supply.toFixed(1)}% of supply`}
          color="blue"
        />
      </div>
      
      {/* ETF Flow Chart */}
      <div className="chart-section">
        <h4>Daily ETF Flows (30d)</h4>
        <ETFFlowChart data={data.history} />
      </div>
      
      {/* Per-ETF Breakdown */}
      <div className="etf-breakdown">
        <h4>ETF Breakdown</h4>
        <ETFBreakdownTable etfs={data.etfs} />
      </div>
      
      {/* Institutional Holdings */}
      <div className="institutional-section">
        <h4>Institutional Holdings Leaderboard</h4>
        <InstitutionalTable data={data.institutional} />
      </div>
      
      {/* ETF vs Exchange Comparison */}
      <div className="comparison-section">
        <h4>ETF vs Exchange Flow</h4>
        <ComparisonCard comparison={data.comparison} />
      </div>
    </div>
  );
}
```

**ETF Flow Chart Component:**

```typescript
function ETFFlowChart({ data }: { data: ETFHistory }) {
  // Use recharts ComposedChart: Bar (daily flows) + Line (cumulative)
  
  const chartData = data.dates.map((date, i) => ({
    date,
    daily: data.daily_flows[i],
    cumulative: data.cumulative_flows[i],
    price: data.btc_price[i]
  }));
  
  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={chartData}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
        <XAxis 
          dataKey="date" 
          tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }}
          tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis 
          yAxisId="left"
          tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }}
          tickFormatter={formatUsd}
        />
        <YAxis 
          yAxisId="right" 
          orientation="right"
          tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }}
          tickFormatter={formatUsd}
        />
        <Tooltip 
          contentStyle={{ 
            background: 'var(--bg-elevated)', 
            border: '1px solid var(--border-subtle)',
            fontFamily: MONO,
            fontSize: 11
          }}
          formatter={(value: number) => formatUsd(value)}
        />
        
        {/* Daily flows as bars */}
        <Bar 
          yAxisId="left"
          dataKey="daily" 
          fill={AMBER}
          radius={[2, 2, 0, 0]}
        />
        
        {/* Cumulative as line */}
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="cumulative" 
          stroke={BLUE}
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

---

### 5. STYLING REQUIREMENTS

**Color Palette:**
- **ETF Inflow:** `#22C55E` (green) — institutional buying
- **ETF Outflow:** `#C2344D` (red) — institutional selling
- **Premium:** Green if positive, red if negative
- **Streak:** Green for consecutive inflows, red for outflows
- **AUM:** `#38BDF8` (blue)

**Layout:**
- **Summary Grid:** 4 columns, equal width
- **Chart:** Full width, 350px height
- **ETF Table:** Sortable columns, expandable rows
- **Institutional Table:** Top 10, sortable by holdings

---

### 6. EDGE CASES

**Weekend/Holiday:**
- Display: "Markets closed — showing last trading day data"
- Reason: ETF flows only occur on trading days

**Farside Scraping Failure:**
- Fallback: Show cached data with "Last updated: X hours ago"
- Log: Warning in console

**New ETF Launch:**
- Display: "New listing" badge
- Handling: Start tracking from launch date

**Missing Institutional Data:**
- Display: "Holdings data unavailable for this entity"
- Reason: CoinGecko may not track all entities

---

### 7. TESTING CHECKLIST

**Manual Testing:**
- [ ] Cron worker fetches Farside data without errors
- [ ] ETF flows appear in D1 database
- [ ] API endpoint returns valid JSON
- [ ] Panel renders with real data
- [ ] Chart displays daily + cumulative flows
- [ ] Institutional table shows MicroStrategy, Tesla, etc.
- [ ] No console errors

**Data Validation:**
- [ ] Compare with Farside website (should match exactly)
- [ ] Verify cumulative flows are calculated correctly
- [ ] Confirm institutional holdings match CoinGecko
- [ ] Check premium/discount calculations

---

### 8. COMPETITIVE ADVANTAGES

**Why This is Better Than Farside:**
1. **Integrated Platform:** Farside is standalone; we're part of full intelligence terminal
2. **Historical Database:** Farside shows table; we store 90+ days with trend analysis
3. **Institutional Context:** Farside shows flows; we correlate with exchange flows and holdings
4. **Terminal UX:** Farside looks like Excel; we're terminal-native

**Why This is Better Than Coinglass:**
1. **Free:** Coinglass charges for API; we scrape Farside for free
2. **Comprehensive:** We track 15+ ETFs + institutional holdings
3. **Correlation Analysis:** We show ETF vs exchange flow divergence

---

### 9. DELIVERABLES

**Files to Create:**
1. `database/migrations/metrilytics/004_etf_institutional.sql`
2. `functions/api/metrilytics/etf.ts`
3. `components/metrilytics/panels/ETFPanel.tsx`

**Files to Modify:**
1. `workers/metrilytics-cron/index.ts` — Add `ingestETFAndInstitutional()`
2. `components/metrilytics/MetrilyticsBody.tsx` — Add ETF panel

---

## SUCCESS CRITERIA

✅ **Real ETF flow data** from Farside (15+ ETFs tracked)  
✅ **Daily updates** after US market close  
✅ **Historical database** with 90+ days  
✅ **Institutional holdings** from CoinGecko (MicroStrategy, Tesla, etc.)  
✅ **ETF vs Exchange correlation** analysis  
✅ **Zero API keys required** (scraping + free CoinGecko)  
✅ **<12 hour data freshness**  
✅ **Terminal-native aesthetic**  

---

## FINAL NOTES

ETF flows are **the most important institutional signal in crypto**. BlackRock's IBIT alone has moved $20B+ into Bitcoin. If you're not tracking this, you're blind to TradFi sentiment.

This panel will be **the first thing institutional users check** when evaluating Novrix. Make it real, make it comprehensive, make it beautiful.

**Now execute.**
