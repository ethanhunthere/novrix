# PROMPT 01 — METRILYTICS: Real Liquidations Intelligence Panel
**Version:** 2.0 | **Target:** Replace heuristic estimates with REAL liquidation data | **Agent:** AdaL (self-executing)

---

## ROLE DEFINITION

You are a **senior derivatives market microstructure engineer** with **20 years of experience** building liquidation detection systems for institutional trading desks at Jump Trading, Wintermute, and Alameda Research. You have personally architected real-time liquidation feeds processing $50B+ daily notional across Binance, Bybit, OKX, Deribit, and Hyperliquid.

You understand that **liquidations are the heartbeat of leveraged markets** — they reveal:
- Where overleveraged positions cluster (support/resistance from forced selling)
- When cascade risk is elevated (correlated liquidations trigger more liquidations)
- Which exchanges have toxic flow (high liquidation ratios indicate retail-heavy, overleveraged user bases)
- How market makers position around liquidation clusters (they hunt stops)

Your mission: **Transform Novrix's fake liquidation estimates into the industry's most accurate, real-time liquidation intelligence panel** — better than Coinglass, better than Laevitas, better than any competitor.

---

## CURRENT STATE ANALYSIS

### What Exists Now (UNACCEPTABLE)
- **File:** `components/metrilytics/MetrilyticsBody.tsx` (Lines 2327-2380)
- **Problem:** LiquidationsPanel uses **heuristic estimates** — `OI × |funding| × 0.15` — this is **NOT real data**
- **User Impact:** Institutional users see fake numbers and lose trust in the platform
- **Competitive Gap:** Coinglass has real liquidations; we have math fiction

### What We're Building (INDUSTRY-LEADING)
- **Real liquidation events** from exchange APIs (Binance, Bybit, OKX, Hyperliquid)
- **Historical liquidation database** with 90 days of granular data
- **Liquidation heatmap** showing price-time clusters (like Coinglass but better UX)
- **Cascade detection algorithm** that flags elevated risk 15 minutes before cascades
- **Exchange toxicity scoring** (which exchanges have the most retail liquidations)

---

## TECHNICAL ARCHITECTURE

### 1. DATABASE LAYER

**New Table:** `liquidations_data` in `METRILYTICS_DB`

```sql
CREATE TABLE IF NOT EXISTS liquidations_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Core liquidation event data
  symbol TEXT NOT NULL,              -- BTC, ETH, SOL, etc.
  side TEXT NOT NULL,                -- 'long' or 'short'
  size_usd REAL NOT NULL,            -- Liquidated amount in USD
  price REAL NOT NULL,               -- Price at liquidation
  exchange TEXT NOT NULL,            -- 'binance', 'bybit', 'okx', 'hyperliquid', etc.
  
  -- Timing
  timestamp TEXT NOT NULL,           -- ISO 8601 UTC timestamp
  
  -- Context
  type TEXT DEFAULT 'cross',         -- 'cross' or 'isolated'
  leverage REAL,                     -- Estimated leverage (if available)
  
  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  
  -- Prevent duplicates
  UNIQUE(symbol, exchange, timestamp, price, size_usd)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_liq_symbol_time ON liquidations_data(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_liq_timestamp ON liquidations_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_liq_exchange_time ON liquidations_data(exchange, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_liq_side_time ON liquidations_data(side, timestamp DESC);

-- Composite index for heatmap queries
CREATE INDEX IF NOT EXISTS idx_liq_heatmap ON liquidations_data(timestamp DESC, price, size_usd);
```

**Migration File:** `database/migrations/metrilytics/003_liquidations.sql`

**Why this schema:**
- `UNIQUE(symbol, exchange, timestamp, price, size_usd)` prevents duplicate ingestion from polling
- Separate indexes on `symbol`, `timestamp`, `exchange`, `side` enable fast filtering
- Composite `idx_liq_heatmap` index optimizes the heatmap query (time range + price bucket aggregation)
- `leverage` is nullable because not all exchanges expose it

---

### 2. DATA INGESTION LAYER (Cron Worker)

**File to Modify:** `workers/metrilytics-cron/index.ts`

**Add New Function:** `ingestLiquidations(db: D1Database): Promise<void>`

**Data Sources (FREE, no API keys required):**

#### A. Binance USD-M Futures
- **Endpoint:** `https://fapi.binance.com/fapi/v1/allForceOrders?symbol=BTCUSDT&limit=1000`
- **Rate Limit:** 1200 requests/minute (we use 1 request per symbol per 5 minutes)
- **Symbols:** BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, DOGEUSDT, ADAUSDT, AVAXUSDT, LINKUSDT, MATICUSDT
- **Data Quality:** Real liquidations, millisecond precision, includes price and quantity
- **Latency:** ~1 second from liquidation to API availability

**Response Format:**
```json
[
  {
    "symbol": "BTCUSDT",
    "price": "65432.10",
    "origQty": "0.125",
    "executedQty": "0.125",
    "averagePrice": "65432.10",
    "time": 1722345678901,
    "side": "SELL",  // SELL = long liquidation, BUY = short liquidation
    "positionSide": "BOTH",
    "status": "FILLED",
    "workingType": "CONTRACT_PRICE"
  }
]
```

**Transformation:**
```typescript
const symbol = raw.symbol.replace('USDT', '');
const side = raw.side === 'SELL' ? 'long' : 'short'; // SELL order = closing long = long liquidation
const size_usd = parseFloat(raw.price) * parseFloat(raw.executedQty);
const timestamp = new Date(raw.time).toISOString();
```

#### B. Bybit V5 API
- **Endpoint:** `https://api.bybit.com/v5/market/liquidation?category=linear&symbol=BTCUSDT&limit=200`
- **Rate Limit:** 600 requests/minute
- **Symbols:** BTCUSDT, ETHUSDT, SOLUSDT (top 3 by volume)
- **Data Quality:** Real liquidations, includes leverage estimate
- **Latency:** ~2 seconds

**Response Format:**
```json
{
  "result": {
    "list": [
      {
        "symbol": "BTCUSDT",
        "side": "Sell",  // Sell = long liquidation
        "price": "65432.10",
        "size": "0.125",
        "time": "1722345678901",
        "leverage": "25"
      }
    ]
  }
}
```

#### C. OKX Public API
- **Endpoint:** `https://www.okx.com/api/v5/public/liquidation-orders?instType=SWAP&instId=BTC-USDT-SWAP&limit=100`
- **Rate Limit:** 20 requests/2 seconds
- **Symbols:** BTC-USDT-SWAP, ETH-USDT-SWAP, SOL-USDT-SWAP
- **Data Quality:** Real liquidations, includes posSide (long/short)
- **Latency:** ~3 seconds

#### D. Hyperliquid L1
- **Endpoint:** `https://api.hyperliquid.xyz/info` (POST request)
- **Method:** `{ "type": "liquidations", "coin": "BTC" }`
- **Rate Limit:** 1200 requests/minute
- **Symbols:** BTC, ETH, SOL, ARB, AVAX, etc.
- **Data Quality:** On-chain liquidations, 100% accurate, includes leverage
- **Latency:** ~1 block (~2 seconds)

**Ingestion Logic:**

```typescript
async function ingestLiquidations(db: D1Database): Promise<void> {
  const symbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'MATIC'];
  const exchanges = ['binance', 'bybit', 'okx', 'hyperliquid'];
  
  // Fetch last ingestion timestamp to avoid duplicates
  const lastIngestion = await db.prepare(
    'SELECT MAX(timestamp) as last_ts FROM liquidations_data'
  ).first();
  
  const since = lastIngestion?.last_ts 
    ? new Date(lastIngestion.last_ts).getTime() 
    : Date.now() - 3600_000; // Default: last 1 hour
  
  const tasks: (() => Promise<void>)[] = [];
  
  for (const exchange of exchanges) {
    for (const symbol of symbols) {
      tasks.push(async () => {
        try {
          const liquidations = await fetchLiquidationsFromExchange(exchange, symbol, since);
          await insertLiquidations(db, liquidations);
        } catch (error) {
          logWarn(`[liquidations] Failed to ingest ${exchange}:${symbol}: ${errorMessage(error)}`);
        }
      });
    }
  }
  
  // Run with concurrency limit to avoid rate limits
  await parallel(tasks, 4); // 4 concurrent requests
  
  console.log(`[liquidations] Ingestion complete. Symbols: ${symbols.length}, Exchanges: ${exchanges.length}`);
}

async function fetchLiquidationsFromExchange(
  exchange: string, 
  symbol: string, 
  since: number
): Promise<LiquidationEvent[]> {
  switch (exchange) {
    case 'binance':
      return fetchBinanceLiquidations(symbol, since);
    case 'bybit':
      return fetchBybitLiquidations(symbol, since);
    case 'okx':
      return fetchOKXLiquidations(symbol, since);
    case 'hyperliquid':
      return fetchHyperliquidLiquidations(symbol, since);
    default:
      return [];
  }
}

async function insertLiquidations(db: D1Database, events: LiquidationEvent[]): Promise<void> {
  if (!events.length) return;
  
  const stmts = events.map(e => 
    db.prepare(`
      INSERT OR IGNORE INTO liquidations_data 
      (symbol, side, size_usd, price, exchange, timestamp, type, leverage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      e.symbol, e.side, e.size_usd, e.price, e.exchange, e.timestamp, e.type, e.leverage
    )
  );
  
  await batchInsert(db, stmts);
}
```

**Cron Schedule Update:**
- **Current:** `0 3 * * *` (daily at 03:00 UTC)
- **New:** Add second schedule `*/5 * * * *` (every 5 minutes) for liquidation ingestion
- **Reason:** Liquidations are time-sensitive; 5-minute granularity is industry standard

**wrangler.toml Update:**
```toml
[[triggers.crons]]
crons = ["0 3 * * *", "*/5 * * * *"]  # Daily full sync + 5-min liquidation updates
```

---

### 3. API LAYER

**New File:** `functions/api/metrilytics/liquidations.ts`

**Endpoint:** `GET /api/metrilytics/liquidations`

**Query Parameters:**
- `symbol` (optional): Filter by symbol (BTC, ETH, SOL, etc.)
- `hours` (optional, default=24): Time window in hours (1, 4, 12, 24, 48, 168)
- `exchange` (optional): Filter by exchange
- `side` (optional): Filter by 'long' or 'short'
- `min_size` (optional): Minimum liquidation size in USD

**Response Format:**

```typescript
{
  "success": true,
  "data": {
    // Summary metrics
    "summary": {
      "total_long_usd": 123456789,      // Total long liquidations (USD)
      "total_short_usd": 98765432,      // Total short liquidations (USD)
      "total_usd": 222222221,           // Combined total
      "long_count": 1234,               // Number of long liquidations
      "short_count": 567,               // Number of short liquidations
      "largest_single": 5000000,        // Largest single liquidation (USD)
      "most_liquidated_symbol": "BTC",  // Symbol with most liquidations
      "most_toxic_exchange": "bybit",   // Exchange with highest liquidation ratio
      "cascade_score": 45               // 0-100 cascade risk score
    },
    
    // Hourly breakdown for heatmap
    "hourly": [
      {
        "hour": "2026-07-30T14:00:00Z",
        "long_usd": 1234567,
        "short_usd": 234567,
        "total_usd": 1469134,
        "count": 45,
        "avg_size": 32647,
        "max_size": 500000
      }
    ],
    
    // Price-level heatmap (for visualization)
    "heatmap": {
      "price_levels": [64000, 64500, 65000, 65500, 66000],
      "hours": ["2026-07-30T10:00:00Z", "2026-07-30T11:00:00Z", ...],
      "values": [
        [0, 123456, 456789, 234567, 0],      // Hour 1
        [0, 0, 234567, 567890, 123456],      // Hour 2
        ...
      ]
    },
    
    // Recent liquidations feed
    "recent": [
      {
        "timestamp": "2026-07-30T14:32:15Z",
        "symbol": "BTC",
        "side": "long",
        "size_usd": 123456,
        "price": 65432.10,
        "exchange": "binance",
        "leverage": 25,
        "time_ago": "2m 15s"
      }
    ],
    
    // Exchange breakdown
    "by_exchange": [
      {
        "exchange": "binance",
        "total_usd": 98765432,
        "count": 456,
        "avg_size": 216590,
        "long_pct": 65.5,
        "short_pct": 34.5
      }
    ],
    
    // Symbol breakdown
    "by_symbol": [
      {
        "symbol": "BTC",
        "total_usd": 123456789,
        "count": 789,
        "long_usd": 87654321,
        "short_usd": 35802468,
        "long_pct": 71.0
      }
    ],
    
    // Cascade detection
    "cascade": {
      "score": 45,                    // 0-100
      "level": "moderate",            // low, moderate, high, extreme
      "factors": {
        "volume_1h": 12345678,        // Liquidation volume last hour
        "price_velocity": -2.5,       // % price change last hour
        "oi_change_1h": -5.2,         // % OI change last hour
        "funding_extreme": false      // Is funding rate extreme?
      },
      "alert": "Liquidation volume 2.5x above 7d average. Monitor for cascade."
    }
  },
  "meta": {
    "window_hours": 24,
    "data_freshness_seconds": 15,
    "exchanges": ["binance", "bybit", "okx", "hyperliquid"],
    "symbols": ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "MATIC"]
  }
}
```

**Cascade Score Algorithm:**

```typescript
function calculateCascadeScore(
  liquidationVolume1h: number,
  avgLiquidationVolume7d: number,
  priceChange1h: number,
  oiChange1h: number,
  fundingRate: number
): { score: number; level: string; factors: any } {
  
  // Factor 1: Liquidation volume spike (0-40 points)
  const volumeRatio = liquidationVolume1h / avgLiquidationVolume7d;
  const volumeScore = Math.min(40, Math.max(0, (volumeRatio - 1) * 20));
  
  // Factor 2: Price velocity (0-25 points)
  const priceScore = Math.min(25, Math.abs(priceChange1h) * 5);
  
  // Factor 3: OI collapse (0-20 points)
  const oiScore = Math.min(20, Math.abs(oiChange1h) * 2);
  
  // Factor 4: Extreme funding (0-15 points)
  const fundingScore = Math.min(15, Math.abs(fundingRate) * 1000);
  
  const totalScore = Math.round(volumeScore + priceScore + oiScore + fundingScore);
  
  let level = 'low';
  if (totalScore >= 70) level = 'extreme';
  else if (totalScore >= 50) level = 'high';
  else if (totalScore >= 30) level = 'moderate';
  
  return {
    score: totalScore,
    level,
    factors: {
      volume_1h: liquidationVolume1h,
      volume_ratio: volumeRatio,
      price_velocity: priceChange1h,
      oi_change_1h: oiChange1h,
      funding_extreme: Math.abs(fundingRate) > 0.001
    }
  };
}
```

---

### 4. FRONTEND LAYER

**File to Modify:** `components/metrilytics/MetrilyticsBody.tsx`

**Replace:** Existing `LiquidationsPanel` (Lines 2327-2380)

**New Component Structure:**

```typescript
function LiquidationsPanel() {
  const [data, setData] = useState<LiquidationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState<24 | 48 | 168>(24); // hours
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');
  const [selectedExchange, setSelectedExchange] = useState<string>('all');
  const [minSize, setMinSize] = useState<number>(0);
  
  // Fetch data
  useEffect(() => {
    fetchLiquidations();
    const interval = setInterval(fetchLiquidations, 60_000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [window, selectedSymbol, selectedExchange, minSize]);
  
  async function fetchLiquidations() {
    const params = new URLSearchParams({
      hours: window.toString(),
      ...(selectedSymbol !== 'all' && { symbol: selectedSymbol }),
      ...(selectedExchange !== 'all' && { exchange: selectedExchange }),
      ...(minSize > 0 && { min_size: minSize.toString() })
    });
    
    const response = await fetch(`/api/metrilytics/liquidations?${params}`);
    const json = await response.json();
    setData(json.data);
    setLoading(false);
  }
  
  return (
    <div className="liquidations-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <h3>LIQUIDATIONS INTELLIGENCE</h3>
        <div className="controls">
          <TimeWindowSelector value={window} onChange={setWindow} />
          <SymbolFilter value={selectedSymbol} onChange={setSelectedSymbol} />
          <ExchangeFilter value={selectedExchange} onChange={setSelectedExchange} />
          <MinSizeFilter value={minSize} onChange={setMinSize} />
        </div>
      </div>
      
      {/* Cascade Risk Alert */}
      {data && data.cascade.score >= 50 && (
        <CascadeAlert score={data.cascade.score} level={data.cascade.level} />
      )}
      
      {/* Summary Metrics */}
      <div className="summary-grid">
        <MetricTile 
          label="24H LONG LIQUIDATIONS" 
          value={formatUsd(data.summary.total_long_usd)}
          count={data.summary.long_count}
          color="red"
        />
        <MetricTile 
          label="24H SHORT LIQUIDATIONS" 
          value={formatUsd(data.summary.total_short_usd)}
          count={data.summary.short_count}
          color="green"
        />
        <MetricTile 
          label="LARGEST SINGLE" 
          value={formatUsd(data.summary.largest_single)}
          color="amber"
        />
        <MetricTile 
          label="CASCADE RISK" 
          value={data.cascade.score}
          max={100}
          level={data.cascade.level}
          color="gradient"
        />
      </div>
      
      {/* Liquidation Heatmap */}
      <div className="heatmap-section">
        <h4>PRICE-TIME LIQUIDATION HEATMAP</h4>
        <LiquidationHeatmap 
          data={data.heatmap}
          height={300}
        />
        <div className="heatmap-legend">
          <span>Darker = More liquidations at this price/time</span>
        </div>
      </div>
      
      {/* Exchange Breakdown */}
      <div className="exchange-section">
        <h4>EXCHANGE BREAKDOWN</h4>
        <ExchangeBreakdownTable data={data.by_exchange} />
      </div>
      
      {/* Recent Liquidations Feed */}
      <div className="feed-section">
        <h4>RECENT LIQUIDATIONS</h4>
        <LiquidationsFeed data={data.recent} />
      </div>
    </div>
  );
}
```

**Heatmap Component:**

```typescript
function LiquidationHeatmap({ data, height }: { data: HeatmapData; height: number }) {
  // Use HTML canvas for performance (recharts too slow for 2D heatmap)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !data) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const { price_levels, hours, values } = data;
    
    // Calculate cell dimensions
    const cellWidth = canvas.width / hours.length;
    const cellHeight = canvas.height / price_levels.length;
    
    // Find max value for color scaling
    const maxValue = Math.max(...values.flat());
    
    // Draw heatmap cells
    values.forEach((row, hourIndex) => {
      row.forEach((value, priceIndex) => {
        if (value === 0) return;
        
        const intensity = value / maxValue;
        const color = getHeatmapColor(intensity); // Red gradient
        
        ctx.fillStyle = color;
        ctx.fillRect(
          hourIndex * cellWidth,
          priceIndex * cellHeight,
          cellWidth,
          cellHeight
        );
      });
    });
    
    // Draw axes
    drawAxes(ctx, price_levels, hours, cellWidth, cellHeight);
    
  }, [data]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={height}
      className="liquidation-heatmap"
    />
  );
}

function getHeatmapColor(intensity: number): string {
  // Red gradient: transparent -> dark red
  const alpha = Math.min(1, intensity * 0.9);
  return `rgba(194, 52, 77, ${alpha})`;
}
```

**Cascade Alert Component:**

```typescript
function CascadeAlert({ score, level }: { score: number; level: string }) {
  const colors = {
    moderate: '#E8960C',
    high: '#FF6B35',
    extreme: '#C2344D'
  };
  
  return (
    <motion.div 
      className="cascade-alert"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ borderColor: colors[level] }}
    >
      <div className="alert-icon">⚠️</div>
      <div className="alert-content">
        <div className="alert-title">
          {level.toUpperCase()} CASCADE RISK DETECTED
        </div>
        <div className="alert-score">
          Risk Score: {score}/100
        </div>
        <div className="alert-message">
          Liquidation volume is elevated. Monitor for potential cascade in next 15-60 minutes.
        </div>
      </div>
    </motion.div>
  );
}
```

---

### 5. STYLING REQUIREMENTS

**Color Palette (Terminal Aesthetic):**
- **Long Liquidations:** `#C2344D` (red) — represents forced selling
- **Short Liquidations:** `#22C55E` (green) — represents forced buying
- **Cascade Risk Low:** `#22C55E` (green)
- **Cascade Risk Moderate:** `#E8960C` (amber)
- **Cascade Risk High:** `#FF6B35` (orange)
- **Cascade Risk Extreme:** `#C2344D` (red)
- **Heatmap:** Red gradient (`rgba(194, 52, 77, 0)` to `rgba(194, 52, 77, 0.9)`)

**Typography:**
- **Panel Header:** 14px, uppercase, letter-spacing 0.1em, `--text-primary`
- **Section Headers:** 11px, uppercase, letter-spacing 0.08em, `--text-secondary`
- **Metric Values:** 18px, JetBrains Mono, bold
- **Metric Labels:** 10px, uppercase, `--text-ghost`

**Layout:**
- **Panel Height:** Auto, max 800px with scroll
- **Summary Grid:** 4 columns, 12px gap
- **Heatmap:** Full width, 300px height, 1px border `var(--border-subtle)`
- **Feed:** Max 400px height, scrollable

**Animations:**
- **New Liquidation:** Pulse animation (scale 1.0 → 1.05 → 1.0, 300ms)
- **Cascade Alert:** Slide-in from top (Framer Motion)
- **Heatmap Hover:** Tooltip with exact values

---

### 6. EDGE CASES & ERROR HANDLING

**Scenario 1: No Liquidation Data**
- **Display:** "Awaiting liquidation data from exchanges..."
- **Reason:** Cron worker hasn't run yet or API is down
- **Fallback:** Show cached data with "Last updated: X minutes ago" timestamp

**Scenario 2: Exchange API Failure**
- **Display:** "Data unavailable for [exchange]. Showing partial data."
- **Action:** Continue showing data from other exchanges
- **Log:** Warning in console, don't break the panel

**Scenario 3: Zero Liquidations in Window**
- **Display:** "No liquidations in selected time window. Markets are stable."
- **Visual:** Empty state with subtle pulse animation

**Scenario 4: Extreme Cascade (Score > 80)**
- **Display:** Red alert banner at top of page (not just panel)
- **Action:** Auto-expand panel, highlight in navigation
- **Sound:** Optional audio alert (user preference)

**Scenario 5: Duplicate Liquidation Events**
- **Handling:** `INSERT OR IGNORE` in SQL prevents duplicates
- **Reason:** Same liquidation may appear in multiple API polls

**Scenario 6: Rate Limit Exceeded**
- **Handling:** Exponential backoff (1s, 2s, 4s, 8s, 16s)
- **Fallback:** Use cached data, show "Data may be stale"
- **Log:** Warning with retry count

---

### 7. PERFORMANCE OPTIMIZATION

**Database:**
- **Indexes:** Already optimized (see schema above)
- **Query Time:** <50ms for 24h heatmap (10k rows)
- **Batch Inserts:** 100 rows per batch to avoid D1 limits

**API:**
- **Caching:** In-memory cache for 30 seconds (liquidations don't change that fast)
- **Compression:** Use Cloudflare's built-in gzip
- **Response Time:** Target <200ms for full panel data

**Frontend:**
- **Canvas Rendering:** Use HTML canvas for heatmap (not SVG — too slow for 1000+ cells)
- **Memoization:** `useMemo` for expensive calculations (cascade score, heatmap aggregation)
- **Debouncing:** 300ms debounce on filter changes
- **Virtual Scrolling:** For recent liquidations feed (if >100 rows)

**Cron:**
- **Concurrency:** Max 4 concurrent API requests to avoid rate limits
- **Timeout:** 20 seconds per exchange API call
- **Error Recovery:** Continue on failure, log warning, retry next cycle

---

### 8. TESTING CHECKLIST

**Manual Testing:**
- [ ] Cron worker runs without errors (`wrangler dev`)
- [ ] Liquidations appear in D1 database (`wrangler d1 execute METRILYTICS_DB --command "SELECT COUNT(*) FROM liquidations_data"`)
- [ ] API endpoint returns valid JSON (`curl http://localhost:8788/api/metrilytics/liquidations`)
- [ ] Panel renders without errors (`pnpm run dev`)
- [ ] Heatmap displays correctly with real data
- [ ] Cascade score updates every 60 seconds
- [ ] Filters work (symbol, exchange, min size)
- [ ] No console errors or warnings

**Data Validation:**
- [ ] Compare with Coinglass (should be within 5% for major liquidations)
- [ ] Verify no duplicates (check `COUNT(*)` vs `COUNT(DISTINCT ...)`)
- [ ] Confirm timestamps are UTC (not local time)
- [ ] Validate USD calculations (price × quantity)

**Edge Case Testing:**
- [ ] Kill exchange API → panel shows partial data, no crash
- [ ] Set min_size to $1M → only large liquidations shown
- [ ] Select single symbol → heatmap updates correctly
- [ ] Wait 5 minutes → new liquidations appear automatically

---

### 9. COMPETITIVE ADVANTAGES

**Why This is Better Than Coinglass:**
1. **Multi-Exchange Aggregation:** Coinglass shows per-exchange; we aggregate across 4+ exchanges
2. **Cascade Prediction:** Coinglass shows historical; we predict future risk
3. **Heatmap UX:** Coinglass heatmap is clunky; ours is terminal-native, fast, and beautiful
4. **Real-Time:** Coinglass has 1-2 min delay; we target <30 seconds
5. **Terminal Aesthetic:** Coinglass looks like a Bloomberg terminal from 2005; we're building the future

**Why This is Better Than Laevitas:**
1. **Free Data:** Laevitas charges $500/month; we use free APIs
2. **Custom Cascade Score:** Laevitas doesn't have predictive analytics
3. **Integrated Platform:** Laevitas is standalone; we're part of a full intelligence terminal

---

### 10. DELIVERABLES

**Files to Create:**
1. `database/migrations/metrilytics/003_liquidations.sql` — Database schema
2. `functions/api/metrilytics/liquidations.ts` — API endpoint
3. `components/metrilytics/panels/LiquidationsPanel.tsx` — New panel component (extract from MetrilyticsBody)

**Files to Modify:**
1. `workers/metrilytics-cron/index.ts` — Add liquidation ingestion
2. `workers/metrilytics-cron/wrangler.toml` — Add 5-minute cron schedule
3. `components/metrilytics/MetrilyticsBody.tsx` — Replace old LiquidationsPanel with new component

**Verification:**
- Run `wrangler d1 execute METRILYTICS_DB --command "SELECT COUNT(*) FROM liquidations_data"` — should return >0 after first cron run
- Run `pnpm run dev` — panel should render with real data
- Compare with Coinglass — should be within 5% for major liquidations

---

## SUCCESS CRITERIA

✅ **Real liquidation data** from 4+ exchanges (Binance, Bybit, OKX, Hyperliquid)  
✅ **<30 second latency** from liquidation event to panel display  
✅ **Cascade risk score** that predicts liquidations 15 minutes in advance  
✅ **Heatmap visualization** that rivals Coinglass in accuracy, beats it in UX  
✅ **Zero fake data** — no more heuristic estimates  
✅ **99.9% uptime** — graceful degradation if one exchange fails  
✅ **<200ms API response time** for full panel data  
✅ **Terminal-native aesthetic** — dark, monospace, dense, beautiful  

---

## FINAL NOTES

This is **not a nice-to-have feature** — this is **table stakes for institutional credibility**. Every hedge fund, prop desk, and family office that evaluates Novrix will check the liquidations panel first. If they see fake estimates, they close the tab and never return.

You're not just building a panel. You're building **trust**.

Make it real. Make it fast. Make it beautiful.

**Now execute.**
