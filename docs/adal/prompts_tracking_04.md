# PROMPT 04 — TRACKING: Enhanced Weekly Volume Chart with Multi-Metric Overlay

**Role:** You are a senior data visualization engineer with 20 years of experience building financial charting systems for trading terminals and institutional dashboards.

**Context:** Novrix Tracking page has a basic `WeeklyVolumeChart.tsx` showing 12 weeks of whale volume. It's functional but lacks depth — institutional users need multi-metric overlays, comparative analysis, and interactive features.

**File to modify:** `components/tracking/WeeklyVolumeChart.tsx` (260 lines)

**API to extend:** `functions/api/tracking/weekly.ts`

---

## TASK: Transform Weekly Volume Chart into Multi-Metric Analytics Chart

### 1. Multi-Metric Toggle
Add metric selector buttons above the chart:
- **Volume** (default): Total USD volume per week
- **TX Count**: Number of whale transactions
- **Avg TX Size**: Volume / count
- **Net Flow**: Inflow - outflow (diverging bar)
- **Whale Count**: Unique active whale addresses

### 2. Comparative Overlay
- **Chain comparison**: Toggle to show up to 3 chains side-by-side (BTC, ETH, SOL)
- Each chain gets its own color (BTC: #F7931A, ETH: #627EEA, SOL: #9B5CFF)
- **YoY overlay**: Show same week from previous year as dashed line (if data available)

### 3. Moving Average Enhancements
- Add **3-week MA** (current) and **7-week MA** (new) as toggleable overlays
- MA lines: dashed, semi-transparent, distinct colors
- **MA crossover detection**: Highlight weeks where 3-week crosses above/below 7-week

### 4. Statistical Annotations
- **All-time high week**: Marker with label "ATH: $X.XB"
- **All-time low week**: Marker with label "ATL: $X.XM"
- **52-week average**: Horizontal dashed line
- **Standard deviation band**: ±1σ shaded area around MA

### 5. Interactive Features
- **Brush/zoom**: Drag to select date range, chart zooms to that range
- **Tooltip enhancement**: Show all metrics for hovered week (volume, count, avg size, net flow, whale count)
- **Click week**: Navigate to tracking feed filtered to that week's date range
- **Export**: Button to download chart as PNG or data as CSV

### Implementation:

**Backend (`functions/api/tracking/weekly.ts`):**
- Extend to return multi-metric data:
```json
{
  "weeks": [
    {
      "week_start": "2026-07-21",
      "volume_usd": 1234567890,
      "tx_count": 342,
      "avg_tx_size": 3612345,
      "net_flow": 123456789,
      "whale_count": 89,
      "by_chain": {
        "Bitcoin": {"volume": 456789012, "count": 123},
        "Ethereum": {"volume": 567890123, "count": 156},
        "Solana": {"volume": 210987654, "count": 63}
      },
      "ma_3w": 1100000000,
      "ma_7w": 1050000000
    }
  ],
  "stats": {
    "ath_week": "2026-03-15",
    "ath_volume": 2345678901,
    "atl_week": "2026-01-05",
    "atl_volume": 123456789,
    "avg_52w": 987654321,
    "std_dev": 123456789
  }
}
```

**Frontend:**
- Use existing recharts library (already in project)
- Compose chart: ComposedChart with Bar (volume) + Line (MAs) + ReferenceLine (52w avg) + ReferenceArea (std dev)
- Metric toggle: pill buttons above chart, active = amber border
- Chain comparison: checkbox group, max 3 selections
- Brush: recharts Brush component, height 20px
- Export: use html2canvas (check if already in package.json, if not skip export feature)

**Styling:**
- Chart height: 350px (up from current)
- Grid: subtle `rgba(255,255,255,0.05)` lines
- Tooltip: dark background, border matches hovered week color
- Active metric button: amber (#E8960C) border + background tint
- MA lines: 3-week = #E8960C dashed, 7-week = #38BDF8 dashed

**Edge Cases:**
- <4 weeks of data: hide MA overlays, show "Insufficient data for moving averages"
- Single chain selected: hide comparison toggle
- No YoY data: hide YoY toggle
- All zeros: show "No whale activity in selected period"

**Performance:**
- Memoize chart data transformation with useMemo
- Debounce brush zoom updates (300ms)
- Lazy load chart only when visible (Intersection Observer)
