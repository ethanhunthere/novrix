# PROMPT 08 — TRACKING: Advanced Search & Filter System with Saved Views

**Role:** You are a senior UX engineer with 20 years of experience building power-user interfaces for financial data platforms, specializing in advanced search, filtering, and workflow optimization.

**Context:** Novrix Tracking page has basic chain/threshold filters and a simple search. Institutional users need complex multi-criteria search, saved filter combinations, and keyboard-driven workflows.

**File to modify:** `components/tracking/TrackingBody.tsx`

---

## TASK: Build Advanced Search & Filter System

### 1. Query Builder Interface
Add an "Advanced" toggle that expands into a query builder:
- **Amount Range:** Min USD to Max USD slider + input fields
- **Date Range:** Start date to End date picker (last 24h, 7d, 30d, custom)
- **Multiple Chains:** Checkbox group (current: single select)
- **Flow Types:** Multi-select (Exchange Inflow, Outflow, Transfer, Mint, Burn, etc.)
- **Entity Filter:** Search + select specific entities
- **Token Filter:** Multi-select tokens (BTC, ETH, SOL, USDT, USDC, etc.)
- **Address Pattern:** Wildcard search (e.g., "0x1234*" or "*binance*")
- **Direction:** Sent only, Received only, Both

### 2. Saved Views System
- **Save current filters** as named view: "Exchange Inflows >$1M", "SOL Whale Transfers", etc.
- **View dropdown:** Quick switch between saved views
- **Default views:** Pre-built views for common queries:
  - "Large Exchange Inflows" (>$10M into exchanges)
  - "Smart Money Accumulation" (exchange outflows >$1M)
  - "Stablecoin Mints" (mint events >$5M)
  - "New Whale Activity" (first-time addresses >$500K)
- **Persist views:** localStorage, sync across sessions
- **Share view:** Generate URL with encoded filters

### 3. Keyboard Navigation
- **Cmd/Ctrl + K:** Focus search bar
- **Cmd/Ctrl + F:** Open advanced filters
- **Escape:** Close dropdowns/modals
- **Arrow keys:** Navigate transaction rows
- **Enter:** Expand selected transaction
- **Space:** Quick view transaction in modal
- **/** : Focus search
- **?** : Show keyboard shortcuts overlay

### 4. Search Enhancements
- **Fuzzy search:** Match partial entity names, address fragments
- **Search history:** Last 10 searches, dropdown on focus
- **Search suggestions:** Auto-complete entities, tokens, common patterns
- **Regex support:** Advanced users can use regex patterns
- **Search in:** Toggle to search labels only, addresses only, or both

### 5. Filter Presets (Quick Access)
Add preset buttons above the feed:
- **Whale Watch:** >$1M, all chains
- **Exchange Flow:** Inflow + Outflow only
- **Fresh Meat:** First-time addresses, last 24h
- **Stable Moves:** USDT/USDC/DAI only
- **OTC Desk:** Known market makers only
- **Bridge Activity:** Cross-chain transfers

### Implementation:

**State management:**
```typescript
interface FilterState {
  amountMin: number;
  amountMax: number;
  dateFrom: string;
  dateTo: string;
  chains: string[];
  flowTypes: string[];
  entities: string[];
  tokens: string[];
  addressPattern: string;
  direction: 'sent' | 'received' | 'both';
}

interface SavedView {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
  isDefault?: boolean;
}
```

**API updates:**
- Extend `/api/tracking/` to accept complex filter params:
  - `?amount_min=1000000&amount_max=100000000`
  - `?chains=BTC,ETH,SOL` (comma-separated)
  - `?flow_types=Exchange Inflow,Exchange Outflow`
  - `?entities=Binance,Coinbase`
  - `?tokens=BTC,ETH`
  - `?address_pattern=0x1234*`
  - `?date_from=2026-07-01&date_to=2026-07-30`

**Frontend:**
- Query builder: collapsible panel, 2-column grid layout
- Saved views: dropdown + "Save current" button
- Keyboard: global event listeners, prevent default on shortcuts
- Search suggestions: debounced API call to `/api/entities/?q=`
- Filter pills: show active filters as removable pills below search

**Styling:**
- Query builder: subtle background, 1px border, monospace inputs
- Active filter pills: amber background, dark text, × to remove
- Saved view dropdown: terminal aesthetic, keyboard navigable
- Keyboard shortcut overlay: centered modal, dark background

**Edge Cases:**
- Invalid date range: show error, don't apply
- No results: show "No transactions match your filters" with "Clear filters" button
- Too many results (>1000): show warning "Narrow your filters for better performance"
- Conflicting filters: highlight conflict (e.g., sent only + exchange inflow)
