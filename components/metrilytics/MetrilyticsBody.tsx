'use client';

import TerminalModulePageShell from '@/components/terminal/TerminalModulePageShell';
import FooterTerminal from '@/components/terminal/FooterTerminal';
import DesktopGate from '@/components/layout/DesktopGate';
import AuthGuard from '@/components/layout/AuthGuard';
import IntelRegistry from '@/components/shared/IntelRegistry';
import type { RegistryCat } from '@/components/shared/IntelRegistry';
import { prefetch as bootPrefetch, fetchCached } from '@/lib/bootCache';
import {
  METRILYTICS_API_URLS as API_URLS,
  METRILYTICS_PREFETCH_URLS,
} from '@/lib/terminalModulePrefetch';
import { useTerminalModulePrefetch } from '@/lib/hooks/useTerminalModulePrefetch';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DeFiCategoriesPanel from './panels/DeFiCategoriesPanel';
import FundraisingPanel from './panels/FundraisingPanel';
import LiquidationsPanelNew from './panels/LiquidationsPanel';
import ETFPanelNew from './panels/ETFPanel';
import ProtocolComparePanelNew from './panels/ProtocolComparePanel';
import EnhancedYieldPanel from './panels/EnhancedYieldPanel';
import CategoryTvlHistoryPanel from './panels/CategoryTvlHistoryPanel';
import DexProtocolPanel from './panels/DexProtocolPanel';
import ConcentrationPanel from './panels/ConcentrationPanel';
import { ChainActivityPanel, StakingPanel, RwaPanel } from './panels/DataPanels';

const MONO = 'var(--font-jetbrains-mono), JetBrains Mono, monospace';
const SANS = 'var(--font-inter), Inter, sans-serif';
const AMBER = '#E8960C';
const BLUE = '#38BDF8';
const GREEN = '#22C55E';
const RED = '#C2344D';
const TEXT = 'var(--text-primary)';
const MUTED = 'var(--text-secondary)';
const FAINT = 'var(--text-ghost)';

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627EEA',
  bsc: '#F0B90B',
  tron: '#FF3352',
  arbitrum: '#28A0F0',
  solana: '#9B5CFF',
  polygon: '#A855F7',
  base: '#4DA2FF',
  optimism: '#FF4661',
  avalanche: '#E84142',
  sui: '#62C4FF',
};

const DEX_COLORS: Record<string, string> = {
  all: '#E8960C',
  ethereum: '#627EEA',
  bsc: '#F0B90B',
  arbitrum: '#28A0F0',
  solana: '#9B5CFF',
  base: '#4DA2FF',
  polygon: '#A855F7',
  optimism: '#FF4661',
  avalanche: '#E84142',
  sui: '#62C4FF',
};

const DISPLAY_DEX_CHAINS = ['all', 'ethereum', 'bsc', 'arbitrum', 'solana', 'base', 'polygon'];

const LENDING_COLORS = ['#627EEA', '#A78BFA', '#F59E0B', '#22C55E', '#38BDF8', '#EC4899'];
const BRIDGE_COLORS = ['#627EEA', '#9B5CFF', '#22C55E', '#F59E0B', '#38BDF8', '#EC4899'];

type Summary = Record<string, string>;
type ChainTvlPoint = { date: string; tvl: number };
type ProtocolRow = { protocol: string; slug: string; tvl_usd: number; category: string | null; date: string };
type FeeRow = { protocol: string; slug: string; daily_fees_usd: number; daily_revenue_usd: number; date?: string };
type FeeHistoryPoint = { date: string; fees: number; revenue: number };
type StableRow = { id?: string; symbol: string; supply_usd: number; peg_price: number; date: string };
type TotalStablePoint = { date: string; total: number };
type StableHistoryPoint = { date: string; supply: number };
type DexPoint = { date: string; volume: number };
type DerivPoint = { date: string; oi: number | null; fr: number | null; ls: number | null };
type YieldRow = { pool_id: string; protocol: string; chain: string; symbol: string; apy: number; tvl_usd: number; updated_at: string };
type YieldHistoryPoint = { date: string; apy: number; tvl: number };
type OptionsPoint = { date: string; volume: number };
type BtcPricePoint = { date: string; open: number; high: number; low: number; close: number; volume: number };
type DexPaprikaNetwork = {
  id: string;
  name: string;
  logo?: string;
  volume_usd_24h?: number;
  txns_24h?: number;
  pools_count?: number;
  tokens_count?: number;
};

function mapDexNetworks(raw: Array<{ network_id: string; name: string; volume_usd_24h: number; txns_24h: number; pools_count: number; tokens_count: number }> | undefined): DexPaprikaNetwork[] {
  if (!raw) return [];
  return raw.map(n => ({
    id: n.network_id,
    name: n.name,
    volume_usd_24h: n.volume_usd_24h,
    txns_24h: n.txns_24h,
    pools_count: n.pools_count,
    tokens_count: n.tokens_count,
  }));
}
type DexPaprikaPool = {
  id: string;
  dex_name: string;
  chain: string;
  volume_usd: number;
  transactions: number;
  price_usd: number;
  last_price_change_usd_24h?: number;
  tokens?: { symbol: string }[];
};
type DexPaprikaStats = { networks: number; dexes: number; pools: number; tokens: number };
type CoinPaprikaGlobal = {
  market_cap_usd?: number;
  volume_24h_usd?: number;
  bitcoin_dominance_percentage?: number;
  market_cap_change_24h?: number;
  volume_24h_change_24h?: number;
  cryptocurrencies_number?: number;
  last_updated?: number;
};
type CoinPaprikaTicker = {
  id: string;
  name: string;
  symbol: string;
  quotes?: {
    USD?: {
      price?: number;
      volume_24h?: number;
      market_cap?: number;
      percent_change_24h?: number;
    };
  };
};
type ExternalData = {
  dexNetworks: DexPaprikaNetwork[];
  dexPools: DexPaprikaPool[];
  dexStats: DexPaprikaStats | null;
  cryptoGlobal: CoinPaprikaGlobal | null;
  tickers: Record<string, CoinPaprikaTicker | undefined>;
  sourceStatus: Record<string, 'OK' | 'DELAYED' | 'UNAVAILABLE'>;
};

type AllData = {
  summary: Summary;
  chainTvl: Record<string, ChainTvlPoint[]>;
  chainLatest: { chain: string; tvl_usd: number }[];
  protocols: ProtocolRow[];
  fees: FeeRow[];
  feeHistory: FeeHistoryPoint[];
  stableSupply: StableRow[];
  stableTotal: TotalStablePoint[];
  stableBySymbol: Record<string, StableHistoryPoint[]>;
  dexVolumes: Record<string, DexPoint[]>;
  btcDerivatives: DerivPoint[];
  ethDerivatives: DerivPoint[];
  solDerivatives: DerivPoint[];
  defiOpenInterest: DerivPoint[];
  yields: YieldRow[];
  optionsAggregate: OptionsPoint[];
  optionsByChain: Record<string, OptionsPoint[]>;
  optionsLatest: { chain: string; volume_usd: number }[];
  btcPrices: BtcPricePoint[];
  ethPrices: BtcPricePoint[];
  solPrices: BtcPricePoint[];
  lendingProtocols: ProtocolRow[];
  lendingTotalBorrowed: number;
  bridges: ProtocolRow[];
  external: ExternalData;
};

type RangeKey = '1M' | '3M' | '1Y' | 'ALL';
type TooltipPayload = {
  value?: number | string | null;
  name?: string;
  stroke?: string;
  fill?: string;
  dataKey?: string;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  formatter?: (value: number) => string;
  accent?: string;
};
type IndicatorCategory =
  | 'Liquidity'
  | 'Protocols'
  | 'DEX'
  | 'Stablecoins'
  | 'Derivatives'
  | 'Yield'
  | 'Market'
  | 'Coverage'
  | 'Bridges'
  | 'Lending'
  | 'Liquidations'
  | 'Ratios'
  | 'Momentum'
  | 'Sentiment'
  | 'Efficiency'
  | 'Concentration'
  | 'Leaderboard'
  | 'Staking'
  | 'RWA'
  | 'Chain Activity';
type IndicatorDefinition = {
  id: string;
  name: string;
  category: IndicatorCategory;
  value: string;
  detail: string;
  source: string;
  accent: string;
  panel: PanelId;
  priority?: number;
};
type PanelId =
  | 'defi-macro'
  | 'chain-tvl'
  | 'protocol-revenue'
  | 'protocol-board'
  | 'dex-volume'
  | 'stablecoin-float'
  | 'derivatives-risk'
  | 'yield-market'
  | 'options-flow'
  | 'btc-anchor'
  | 'dex-pools'
  | 'market-structure'
  | 'indicator-detail'
  | 'bridges'
  | 'lending'
  | 'liquidations'
  | 'etf'
  | 'protocol-compare'
  | 'category-history'
  | 'dex-protocols'
  | 'concentration'
  | 'defi-categories'
  | 'fundraising'
  | 'chain-activity'
  | 'staking'
  | 'rwa';

const rangeDays: Record<RangeKey, number> = {
  '1M': 30,
  '3M': 90,
  '1Y': 365,
  ALL: 99_999,
};

const CACHE_KEY = 'novrix_metrilytics_v9';
const CACHE_TTL = 3_600_000;
const DEFAULT_PANELS: PanelId[] = ['chain-tvl', 'chain-activity', 'dex-protocols', 'category-history', 'protocol-revenue', 'staking', 'rwa', 'concentration', 'btc-anchor', 'bridges', 'lending', 'liquidations'];
const MAX_ACTIVE_PANELS = 5;
const EMPTY_EXTERNAL_DATA: ExternalData = {
  dexNetworks: [],
  dexPools: [],
  dexStats: null,
  cryptoGlobal: null,
  tickers: {},
  sourceStatus: {},
};

const PANEL_DOM_ID: Record<PanelId, string | undefined> = {
  'defi-macro': 'module-overview',
  'chain-tvl': 'module-tvl',
  'protocol-revenue': 'module-fees',
  'protocol-board': 'module-protocols',
  'dex-volume': 'module-dex',
  'stablecoin-float': 'module-stables',
  'derivatives-risk': 'module-derivatives',
  'yield-market': 'module-yields',
  'options-flow': 'module-options',
  'btc-anchor': 'module-btc',
  'dex-pools': 'module-dex-pools',
  'market-structure': 'module-market-structure',
  'indicator-detail': undefined,
  'bridges': 'module-bridges',
  'lending': 'module-lending',
  'liquidations': 'module-liquidations',
  'etf': 'module-etf',
  'protocol-compare': 'module-protocol-compare',
  'category-history': 'module-category-history',
  'dex-protocols': 'module-dex-protocols',
  'concentration': 'module-concentration',
  'defi-categories': 'module-defi-categories',
  'fundraising': 'module-fundraising',
  'chain-activity': 'module-chain-activity',
  'staking': 'module-staking',
  'rwa': 'module-rwa',
};

type MetrilyticsBodyProps = {
  onPrimaryDataReady?: () => void;
};

const EXPANDED_CACHE_KEY = 'novrix_metrilytics_expanded_v1';
const EXPANDED_CACHE_TTL = 300_000; // 5 minutes

function getExpandedCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${EXPANDED_CACHE_KEY}_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number };
    if (Date.now() - ts > EXPANDED_CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setExpandedCache<T>(key: string, data: T): void {
  try { localStorage.setItem(`${EXPANDED_CACHE_KEY}_${key}`, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

if (typeof window !== 'undefined') {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { ts } = JSON.parse(raw) as { ts: number };
      if (Date.now() - ts >= CACHE_TTL) METRILYTICS_PREFETCH_URLS.forEach(bootPrefetch);
    } else {
      METRILYTICS_PREFETCH_URLS.forEach(bootPrefetch);
    }
  } catch {
    METRILYTICS_PREFETCH_URLS.forEach(bootPrefetch);
  }
}

function fmtMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '$0';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function fmtDate(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* Range-aware date formatter — includes year for 6M+ timeframes */
function fmtDateForRange(range: string): (value: string | number) => string {
  return (value: string | number) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const shortRange = range === '1W' || range === '1M' || range === '3M';
    if (shortRange) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };
}

function fmtPct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

function fmtFunding(value: number): string {
  return `${(value * 100).toFixed(4)}%`;
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function latest<T>(rows: T[]): T | undefined {
  return rows[rows.length - 1];
}

function cutoffFor(range: RangeKey): string {
  if (range === 'ALL') return '1900-01-01';
  return new Date(Date.now() - rangeDays[range] * 86_400_000).toISOString().split('T')[0];
}

function filterByRange<T extends { date: string }>(rows: T[], range: RangeKey): T[] {
  const cutoff = cutoffFor(range);
  return rows.filter(row => row.date >= cutoff);
}

function mergeSeries<T extends { date: string }>(
  source: Record<string, T[]>,
  keys: string[],
  getValue: (row: T) => number | null | undefined,
  range: RangeKey,
): Record<string, string | number | null>[] {
  const cutoff = cutoffFor(range);
  const byDate = new Map<string, Record<string, string | number | null>>();

  for (const key of keys) {
    for (const row of source[key] ?? []) {
      if (row.date < cutoff) continue;
      const current = byDate.get(row.date) ?? { date: row.date };
      current[key] = getValue(row) ?? null;
      byDate.set(row.date, current);
    }
  }

  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function parseSummaryNumber(summary: Summary, key: string): number {
  const value = Number(summary[key]);
  return Number.isFinite(value) ? value : 0;
}

function numberOrZero(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function latestValue<T, K extends keyof T>(rows: T[], key: K): number {
  return numberOrZero(latest(rows)?.[key]);
}

function pctRatio(numerator: number, denominator: number): string {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return '0.00%';
  return `${((numerator / denominator) * 100).toFixed(2)}%`;
}

function normalizeApiDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function normalizeDay(value: string | number): string {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const millis = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
    return new Date(millis).toISOString().slice(0, 10);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10);
}

function needsHistory<T>(rows: T[] | undefined, minimum = 365): boolean {
  return !rows || rows.length < minimum;
}

function needsRecordHistory<T>(record: Record<string, T[]> | undefined, keys: string[], minimum = 365): boolean {
  return keys.some(key => needsHistory(record?.[key], minimum));
}

type LlamaChartPair = [number | string, number | string | null];
type LlamaOverviewPayload = { totalDataChart?: LlamaChartPair[] };
type LlamaChainTvlPoint = { date: number | string; tvl?: number | string };
type LlamaProtocolPayload = { tvl?: { date: number | string; totalLiquidityUSD?: number | string; tvl?: number | string }[] };
type StablecoinsPayload = {
  peggedAssets?: {
    id?: number | string;
    symbol?: string;
    circulating?: { peggedUSD?: number | string };
    price?: number | string;
    pegMechanism?: string;
  }[];
};
type StablecoinChartPayload = {
  chainBalances?: Record<string, { tokens?: { date: number | string; circulating?: { peggedUSD?: number | string } }[] }>;
};
type TotalStableChartPoint = { date: number | string; totalCirculatingUSD?: Record<string, number | string> };
type BinanceFundingRow = { fundingTime?: number; fundingRate?: string | number };
type BinanceOpenInterestRow = { timestamp?: number; sumOpenInterestValue?: string | number };
type CoinGeckoMarketChart = { prices?: [number, number][]; total_volumes?: [number, number][] };
type YieldChartPayload = { data?: { timestamp?: string; tvlUsd?: number | string; apy?: number | string }[] };

function normalizeLlamaVolume(rows: LlamaChartPair[] | undefined): DexPoint[] {
  return (rows ?? [])
    .map(([date, volume]) => ({ date: normalizeDay(date), volume: numberOrZero(volume) }))
    .filter(row => row.volume > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeLlamaFees(rows: LlamaChartPair[] | undefined): FeeHistoryPoint[] {
  return (rows ?? [])
    .map(([date, fees]) => {
      const value = numberOrZero(fees);
      return { date: normalizeDay(date), fees: value, revenue: value };
    })
    .filter(row => row.fees > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeTotalStablecoinHistory(rows: TotalStableChartPoint[] | undefined): TotalStablePoint[] {
  return (rows ?? [])
    .map(row => ({ date: normalizeDay(row.date), total: numberOrZero(row.totalCirculatingUSD?.peggedUSD) }))
    .filter(row => row.total > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function stablecoinHistoryFromPayload(payload: StablecoinChartPayload): StableHistoryPoint[] {
  const byDate = new Map<string, number>();
  for (const chain of Object.values(payload.chainBalances ?? {})) {
    for (const token of chain.tokens ?? []) {
      const date = normalizeDay(token.date);
      const value = numberOrZero(token.circulating?.peggedUSD);
      if (value > 0) byDate.set(date, (byDate.get(date) ?? 0) + value);
    }
  }
  return [...byDate.entries()]
    .map(([date, supply]) => ({ date, supply }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function apiChainName(chain: string): string {
  const names: Record<string, string> = { bsc: 'BSC', arbitrum: 'Arbitrum', solana: 'Solana', base: 'Base', polygon: 'Polygon', ethereum: 'Ethereum' };
  return names[chain] ?? titleCase(chain);
}

async function fetchJson<T>(url: string, timeoutMs = 15_000, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (response.status === 429 && attempt < retries) {
        await new Promise(r => window.setTimeout(r, 500 * Math.pow(2, attempt)));
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json() as T;
    } finally {
      window.clearTimeout(timeout);
    }
  }
  throw new Error('Max retries exceeded');
}

async function settle<T>(name: string, request: Promise<T>): Promise<{ name: string; value: T | null; status: 'OK' | 'UNAVAILABLE' }> {
  try {
    return { name, value: await request, status: 'OK' };
  } catch {
    return { name, value: null, status: 'UNAVAILABLE' };
  }
}

async function fetchChainTvlFallback(): Promise<{ tvl: Record<string, ChainTvlPoint[]>; latest: { chain: string; tvl_usd: number }[] }> {
  const chains = Object.keys(CHAIN_COLORS);
  const results = await Promise.allSettled(
    chains.map(async chain => {
      const rows = await fetchJson<LlamaChainTvlPoint[]>(`https://api.llama.fi/v2/historicalChainTvl/${encodeURIComponent(apiChainName(chain))}`, 20_000);
      const history = rows
        .map(row => ({ date: normalizeDay(row.date), tvl: numberOrZero(row.tvl) }))
        .filter(row => row.tvl > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      return { chain, history };
    }),
  );

  const tvl: Record<string, ChainTvlPoint[]> = {};
  const latestRows: { chain: string; tvl_usd: number }[] = [];
  for (const result of results) {
    if (result.status !== 'fulfilled' || result.value.history.length === 0) continue;
    tvl[result.value.chain] = result.value.history;
    latestRows.push({ chain: result.value.chain, tvl_usd: latest(result.value.history)?.tvl ?? 0 });
  }
  return { tvl, latest: latestRows.sort((a, b) => b.tvl_usd - a.tvl_usd) };
}

async function fetchDexFallback(): Promise<Record<string, DexPoint[]>> {
  const entries = await Promise.allSettled(
    DISPLAY_DEX_CHAINS.map(async chain => {
      const suffix = chain === 'all' ? '' : `/${encodeURIComponent(apiChainName(chain))}`;
      const payload = await fetchJson<LlamaOverviewPayload>(`https://api.llama.fi/overview/dexs${suffix}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=false`, 22_000);
      return [chain, normalizeLlamaVolume(payload.totalDataChart)] as const;
    }),
  );

  return Object.fromEntries(
    entries
      .filter((entry): entry is PromiseFulfilledResult<readonly [string, DexPoint[]]> => entry.status === 'fulfilled' && entry.value[1].length > 0)
      .map(entry => entry.value),
  );
}

async function fetchFeesFallback(): Promise<FeeHistoryPoint[]> {
  const payload = await fetchJson<LlamaOverviewPayload>('https://api.llama.fi/overview/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=false', 22_000);
  return normalizeLlamaFees(payload.totalDataChart);
}

async function fetchStablecoinFallback(): Promise<{
  supply: StableRow[];
  total: TotalStablePoint[];
  bySymbol: Record<string, StableHistoryPoint[]>;
}> {
  const [assetsResult, totalResult] = await Promise.allSettled([
    fetchJson<StablecoinsPayload>('https://stablecoins.llama.fi/stablecoins?includePrices=true', 20_000),
    fetchJson<TotalStableChartPoint[]>('https://stablecoins.llama.fi/stablecoincharts/all', 20_000),
  ]);

  const assets = assetsResult.status === 'fulfilled'
    ? (assetsResult.value.peggedAssets ?? [])
        .map(asset => ({
          id: asset.id === undefined ? undefined : String(asset.id),
          symbol: asset.symbol ?? 'Stablecoin',
          supply_usd: numberOrZero(asset.circulating?.peggedUSD),
          peg_price: numberOrZero(asset.price) || 1,
          date: new Date().toISOString().slice(0, 10),
        }))
        .filter(asset => asset.supply_usd > 0)
        .sort((a, b) => b.supply_usd - a.supply_usd)
    : [];

  const bySymbol: Record<string, StableHistoryPoint[]> = {};
  const historyResults = await Promise.allSettled(
    assets.slice(0, 6).map(async asset => {
      if (!asset.id) return [asset.symbol, [] as StableHistoryPoint[]] as const;
      const payload = await fetchJson<StablecoinChartPayload>(`https://stablecoins.llama.fi/stablecoin/${encodeURIComponent(asset.id)}`, 22_000);
      return [asset.symbol, stablecoinHistoryFromPayload(payload)] as const;
    }),
  );

  for (const result of historyResults) {
    if (result.status === 'fulfilled' && result.value[1].length > 0) bySymbol[result.value[0]] = result.value[1];
  }

  return {
    supply: assets.slice(0, 24),
    total: totalResult.status === 'fulfilled' ? normalizeTotalStablecoinHistory(totalResult.value) : [],
    bySymbol,
  };
}

async function fetchDerivativesFallback(symbol: 'BTC' | 'ETH' | 'SOL'): Promise<DerivPoint[]> {
  const pair = `${symbol}USDT`;
  const [fundingResult, oiResult] = await Promise.allSettled([
    fetchJson<BinanceFundingRow[]>(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${pair}&limit=1000`, 20_000),
    fetchJson<BinanceOpenInterestRow[]>(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${pair}&period=1d&limit=500`, 20_000),
  ]);

  const byDate = new Map<string, DerivPoint>();
  if (oiResult.status === 'fulfilled' && Array.isArray(oiResult.value)) {
    for (const row of oiResult.value) {
      if (!row.timestamp) continue;
      const date = normalizeDay(row.timestamp);
      byDate.set(date, { date, oi: numberOrZero(row.sumOpenInterestValue), fr: null, ls: null });
    }
  }
  if (fundingResult.status === 'fulfilled' && Array.isArray(fundingResult.value)) {
    for (const row of fundingResult.value) {
      if (!row.fundingTime) continue;
      const date = normalizeDay(row.fundingTime);
      const current = byDate.get(date) ?? { date, oi: null, fr: null, ls: null };
      current.fr = numberOrZero(row.fundingRate);
      byDate.set(date, current);
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchOpenInterestFallback(): Promise<DerivPoint[]> {
  const payload = await fetchJson<LlamaOverviewPayload>('https://api.llama.fi/overview/open-interest?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=false', 22_000);
  return normalizeLlamaVolume(payload.totalDataChart).map(row => ({ date: row.date, oi: row.volume, fr: null, ls: null }));
}

async function fetchOptionsFallback(): Promise<OptionsPoint[]> {
  const payload = await fetchJson<LlamaOverviewPayload>('https://api.llama.fi/overview/options?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=false', 22_000);
  return normalizeLlamaVolume(payload.totalDataChart);
}

async function fetchBtcPriceFallback(): Promise<BtcPricePoint[]> {
  const [ohlcResult, marketResult] = await Promise.allSettled([
    fetchJson<[number, number, number, number, number][]>('https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=365', 20_000),
    fetchJson<CoinGeckoMarketChart>('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily', 20_000),
  ]);
  if (marketResult.status !== 'fulfilled' || !marketResult.value.prices?.length) return [];

  const volumeByDate = new Map(
    (marketResult.value.total_volumes ?? [])
      .map(([timestamp, volume]) => [normalizeDay(timestamp), volume] as const),
  );
  const ohlcByDate = new Map(
    (ohlcResult.status === 'fulfilled' ? ohlcResult.value : [])
      .map(([timestamp, open, high, low, close]) => [normalizeDay(timestamp), { open, high, low, close }] as const),
  );

  return marketResult.value.prices
    .map(([timestamp, close], index, rows) => {
      const date = normalizeDay(timestamp);
      const ohlc = ohlcByDate.get(date);
      const previousClose = index > 0 ? rows[index - 1]?.[1] ?? close : close;
      const open = ohlc?.open ?? previousClose;
      const high = ohlc?.high ?? Math.max(open, close);
      const low = ohlc?.low ?? Math.min(open, close);
      return { date, open, high, low, close, volume: volumeByDate.get(date) ?? 0 };
    })
    .filter(row => row.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchYieldHistory(poolId: string): Promise<YieldHistoryPoint[]> {
  const payload = await fetchJson<YieldChartPayload>(`https://yields.llama.fi/chart/${encodeURIComponent(poolId)}`, 20_000);
  return (payload.data ?? [])
    .map(row => ({ date: normalizeDay(row.timestamp ?? ''), apy: numberOrZero(row.apy), tvl: numberOrZero(row.tvlUsd) }))
    .filter(row => row.date && (row.apy > 0 || row.tvl > 0))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchProtocolHistory(slug: string): Promise<{ date: string; tvl: number }[]> {
  try {
    const response = await fetch(`/api/metrilytics/protocol/${encodeURIComponent(slug)}?days=0`);
    const payload = await response.json() as { tvl?: { date: string; tvl: number }[] };
    if ((payload.tvl ?? []).length > 0) return payload.tvl ?? [];
  } catch {}

  const payload = await fetchJson<LlamaProtocolPayload>(`https://api.llama.fi/protocol/${encodeURIComponent(slug)}`, 22_000);
  return (payload.tvl ?? [])
    .map(row => ({ date: normalizeDay(row.date), tvl: numberOrZero(row.totalLiquidityUSD ?? row.tvl) }))
    .filter(row => row.tvl > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function applyHistoricalFallbacks(input: Partial<AllData>): Promise<Partial<AllData>> {
  const nextData: Partial<AllData> = { ...input };

  const [
    chainResult,
    stableResult,
    dexResult,
    feesResult,
    btcDerivativesResult,
    ethDerivativesResult,
    solDerivativesResult,
    defiOiResult,
    optionsResult,
    btcPricesResult,
    lendingRes,
    bridgesRes,
  ] = await Promise.allSettled([
    needsRecordHistory(nextData.chainTvl, Object.keys(CHAIN_COLORS)) ? fetchChainTvlFallback() : Promise.resolve(null),
    needsHistory(nextData.stableTotal) || needsRecordHistory(nextData.stableBySymbol, (nextData.stableSupply ?? []).slice(0, 6).map(row => row.symbol)) ? fetchStablecoinFallback() : Promise.resolve(null),
    needsRecordHistory(nextData.dexVolumes, DISPLAY_DEX_CHAINS) ? fetchDexFallback() : Promise.resolve(null),
    needsHistory(nextData.feeHistory) ? fetchFeesFallback() : Promise.resolve(null),
    needsHistory(nextData.btcDerivatives, 120) ? fetchDerivativesFallback('BTC') : Promise.resolve(null),
    needsHistory(nextData.ethDerivatives, 120) ? fetchDerivativesFallback('ETH') : Promise.resolve(null),
    needsHistory(nextData.solDerivatives, 120) ? fetchDerivativesFallback('SOL') : Promise.resolve(null),
    needsHistory(nextData.defiOpenInterest) ? fetchOpenInterestFallback() : Promise.resolve(null),
    needsHistory(nextData.optionsAggregate) ? fetchOptionsFallback() : Promise.resolve(null),
    needsHistory(nextData.btcPrices, 300) ? fetchBtcPriceFallback() : Promise.resolve(null),
    (nextData.lendingProtocols ?? []).length === 0 ? fetchCached(API_URLS.lending).then(response => response.json()) : Promise.resolve(null),
    (nextData.bridges ?? []).length === 0 ? fetchCached(API_URLS.bridges).then(response => response.json()) : Promise.resolve(null),
  ]);

  if (chainResult.status === 'fulfilled' && chainResult.value) {
    nextData.chainTvl = { ...(nextData.chainTvl ?? {}), ...chainResult.value.tvl };
    nextData.chainLatest = chainResult.value.latest.length > 0 ? chainResult.value.latest : nextData.chainLatest;
  }
  if (stableResult.status === 'fulfilled' && stableResult.value) {
    if (stableResult.value.supply.length > 0) nextData.stableSupply = stableResult.value.supply;
    if (stableResult.value.total.length > 0) nextData.stableTotal = stableResult.value.total;
    if (Object.keys(stableResult.value.bySymbol).length > 0) nextData.stableBySymbol = stableResult.value.bySymbol;
  }
  if (dexResult.status === 'fulfilled' && dexResult.value && Object.keys(dexResult.value).length > 0) {
    nextData.dexVolumes = { ...(nextData.dexVolumes ?? {}), ...dexResult.value };
  }
  if (feesResult.status === 'fulfilled' && feesResult.value && feesResult.value.length > 0) nextData.feeHistory = feesResult.value;
  if (btcDerivativesResult.status === 'fulfilled' && btcDerivativesResult.value && btcDerivativesResult.value.length > 0) nextData.btcDerivatives = btcDerivativesResult.value;
  if (ethDerivativesResult.status === 'fulfilled' && ethDerivativesResult.value && ethDerivativesResult.value.length > 0) nextData.ethDerivatives = ethDerivativesResult.value;
  if (solDerivativesResult.status === 'fulfilled' && solDerivativesResult.value && solDerivativesResult.value.length > 0) nextData.solDerivatives = solDerivativesResult.value;
  if (defiOiResult.status === 'fulfilled' && defiOiResult.value && defiOiResult.value.length > 0) nextData.defiOpenInterest = defiOiResult.value;
  if (optionsResult.status === 'fulfilled' && optionsResult.value && optionsResult.value.length > 0) {
    nextData.optionsAggregate = optionsResult.value;
    nextData.optionsLatest = [{ chain: 'all', volume_usd: latest(optionsResult.value)?.volume ?? 0 }];
  }
  if (btcPricesResult.status === 'fulfilled' && btcPricesResult.value && btcPricesResult.value.length > 0) nextData.btcPrices = btcPricesResult.value;
  if (lendingRes.status === 'fulfilled' && lendingRes.value) {
    const payload = lendingRes.value as Record<string, unknown>;
    nextData.lendingProtocols = (payload.protocols as ProtocolRow[] | undefined) ?? nextData.lendingProtocols;
    nextData.lendingTotalBorrowed = (payload.totalBorrowed as number | undefined) ?? nextData.lendingTotalBorrowed;
  }
  if (bridgesRes.status === 'fulfilled' && bridgesRes.value) {
    const payload = bridgesRes.value as Record<string, unknown>;
    nextData.bridges = (payload.protocols as ProtocolRow[] | undefined) ?? nextData.bridges;
  }

  return nextData;
}

function tickerUsd(ticker: CoinPaprikaTicker | undefined): NonNullable<NonNullable<CoinPaprikaTicker['quotes']>['USD']> {
  return ticker?.quotes?.USD ?? {};
}

function calcChange<T extends Record<string, unknown>>(rows: T[] | undefined, days: number, field = 'tvl'): number {
  if (!rows || rows.length < 2) return 0;
  const sorted = [...rows].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
  const current = sorted[sorted.length - 1];
  const past = sorted[Math.max(0, sorted.length - 1 - days)];
  const currentVal = Number(current[field] ?? 0);
  const pastVal = Number(past[field] ?? 0);
  if (pastVal === 0) return 0;
  return ((currentVal - pastVal) / pastVal) * 100;
}

function avgFunding(rows: { fr: number | null }[] | undefined, days: number): number {
  if (!rows || rows.length === 0) return 0;
  const valid = rows.filter(r => r.fr !== null).slice(-days);
  if (valid.length === 0) return 0;
  return valid.reduce((sum, r) => sum + (r.fr ?? 0), 0) / valid.length;
}

function topBy<T>(rows: T[], getValue: (row: T) => number, limit: number): T[] {
  return [...rows].sort((a, b) => getValue(b) - getValue(a)).slice(0, limit);
}

function uniqueCount<T>(rows: T[], getKey: (row: T) => string | null | undefined): number {
  return new Set(rows.map(getKey).filter(Boolean)).size;
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const iso = now.toISOString();

  return (
    <>
      <div className="text-[15px] tabular-nums font-bold leading-none" style={{ fontFamily: MONO, color: '#fff' }}>
        {iso.slice(11, 19)}
      </div>
      <div className="text-[11px] tabular-nums mt-0.5" style={{ fontFamily: MONO, color: 'rgba(255,255,255,0.42)' }}>
        {iso.slice(0, 10)}
      </div>
    </>
  );
}

function Skeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        border: '1px solid rgba(255,255,255,0.06)',
        background:
          'linear-gradient(110deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.035) 70%)',
        backgroundSize: '240% 100%',
        animation: 'metrilytics-scan 2.4s var(--ease-standard) infinite',
      }}
    />
  );
}

function RangeControl({
  options,
  value,
  onChange,
}: {
  options: RangeKey[];
  value: RangeKey;
  onChange: (value: RangeKey) => void;
}) {
  return (
    <div
      className="flex shrink-0"
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.28)',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {options.map(option => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            style={{
              minWidth: 40,
              padding: '7px 10px',
              fontFamily: MONO,
              fontSize: 11,
              lineHeight: 1,
              letterSpacing: '0.11em',
              textTransform: 'uppercase',
              fontWeight: active ? 800 : 500,
              color: active ? '#0A0A0F' : MUTED,
              background: active ? AMBER : 'transparent',
              border: 0,
              borderRight: option === options[options.length - 1] ? 0 : '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function ChartTooltip({ active, payload, label, formatter = fmtMoney, accent = AMBER }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        minWidth: 230,
        padding: '14px 18px',
        border: `1px solid rgba(255,255,255,0.15)`,
        borderTop: `2px solid ${accent}`,
        borderRadius: '1px',
        background: '#0E0E18',
        boxShadow: '0 8px 32px rgba(0,0,0,0.80)',
        fontFamily: MONO,
        pointerEvents: 'none',
      }}
    >
      <div style={{ color: '#8A9BB0', fontSize: 13, marginBottom: '2px', letterSpacing: '0.12em' }}>{label ? fmtDate(label) : ''}</div>
      <div style={{ height: '1px', background: 'rgba(30,60,100,0.9)', margin: '9px 0' }} />
      <div className="space-y-3">
        {payload.map((item, index) => {
          const value = typeof item.value === 'number' ? item.value : Number(item.value);
          const color = item.stroke || item.fill || accent;
          return (
            <div key={`${item.name ?? item.dataKey ?? 'value'}-${index}`} className="flex items-center justify-between gap-4">
              <span style={{ color: '#6A8EAA', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>{item.name || item.dataKey || 'value'}</span>
              <span style={{ color, fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', lineHeight: 1, textShadow: `0 0 18px ${color}50` }}>{formatter(Number.isFinite(value) ? value : 0)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const tickStyle = { fill: '#8AAEC8', fontSize: 12, fontFamily: MONO };
const gridProps = { stroke: 'rgba(255,255,255,0.07)', strokeDasharray: '3 8', vertical: false };
const cursorProps = { stroke: 'rgba(232,150,12,0.75)', strokeDasharray: '3 5' };

function PanelFrame({
  id,
  eyebrow,
  title,
  note,
  accent = AMBER,
  action,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  note?: string;
  accent?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45, ease: [0.2, 0, 0.38, 0.9] }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 0,
        border: '1px solid rgba(255,255,255,0.09)',
        background:
          'linear-gradient(135deg, rgba(16,16,22,0.97) 0%, rgba(8,9,13,0.98) 48%, rgba(12,10,6,0.98) 100%)',
        boxShadow: '0 32px 100px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >

      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.65), transparent 78%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent 5%, ${accent}80 35%, ${accent}80 65%, transparent 95%)`,
          opacity: 0.75,
          boxShadow: `0 2px 8px ${accent}25`,
        }}
      />
      <div className="relative flex items-center justify-between gap-5 px-6 py-5 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <span style={{ width: 5, height: 5, borderRadius: 99, background: accent, boxShadow: `0 0 14px ${accent}` }} />
            <span style={{ fontFamily: MONO, fontSize: 11, color: accent, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 650 }}>
              {eyebrow}
            </span>
          </div>
          <h2 style={{ fontFamily: SANS, fontSize: 17, lineHeight: 1.2, color: 'var(--text-heading)', fontWeight: 600, letterSpacing: '0.008em' }}>
            {title}
          </h2>
          {note && <p className="mt-2 max-w-2xl" style={{ fontFamily: SANS, fontSize: 14, color: 'rgba(160,180,210,0.60)', lineHeight: 1.55, letterSpacing: '0.01em' }}>{note}</p>}
        </div>
        {action}
      </div>
      <div className="relative p-6">{children}</div>
    </motion.section>
  );
}

function MetricTile({
  label,
  value,
  detail,
  accent,
  live = false,
}: {
  label: string;
  value: string;
  detail?: string;
  accent: string;
  live?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: 132,
        padding: '18px 20px',
        borderRadius: 0,
        border: '1px solid rgba(255,255,255,0.07)',
        background:
          'linear-gradient(155deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 50%, rgba(0,0,0,0.22) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px', background: `linear-gradient(90deg, transparent, ${accent}50, transparent)` }} />
      <div className="flex items-center gap-2 mb-4">
        <span style={{ width: 18, height: 2, background: accent }} />
        <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
        {live && (
          <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10, color: accent, letterSpacing: '0.13em', fontWeight: 700, textTransform: 'uppercase' }}>LIVE</span>
        )}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 26, lineHeight: 1, color: TEXT, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{value}</div>
      {detail && <div className="mt-3" style={{ fontFamily: SANS, fontSize: 13, color: 'rgba(160,180,210,0.60)', lineHeight: 1.5 }}>{detail}</div>}
    </div>
  );
}

function DataUnavailable({ onRetry, message = 'Data unavailable' }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div style={{ fontFamily: MONO, fontSize: 13, color: MUTED }}>{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            border: `1px solid ${AMBER}44`,
            background: `${AMBER}12`,
            color: AMBER,
            fontFamily: MONO,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div style={{ height: 40 }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 40 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function OverviewPanel({ summary, loading }: { summary: Summary; loading: boolean }) {
  const btcFunding = parseSummaryNumber(summary, 'btc_funding_rate');
  const ethFunding = parseSummaryNumber(summary, 'eth_funding_rate');
  const solFunding = parseSummaryNumber(summary, 'sol_funding_rate');

  const stats = [
    {
      label: 'DeFi TVL',
      value: fmtMoney(parseSummaryNumber(summary, 'total_defi_tvl')),
      detail: summary.top_chain_by_tvl ? `Largest chain: ${titleCase(summary.top_chain_by_tvl)}` : 'Global liquidity base',
      accent: AMBER,
      live: true,
    },
    {
      label: 'Stablecoin Float',
      value: fmtMoney(parseSummaryNumber(summary, 'total_stablecoin_supply')),
      detail: 'Settlement liquidity across tracked assets',
      accent: GREEN,
      live: true,
    },
    {
      label: 'DEX Tape',
      value: fmtMoney(parseSummaryNumber(summary, 'total_dex_volume_24h')),
      detail: 'Latest daily spot flow',
      accent: BLUE,
      live: true,
    },
    {
      label: 'BTC Price',
      value: `$${(parseSummaryNumber(summary, 'btc_price') / 1000).toFixed(1)}K`,
      detail: 'Spot anchor from Binance',
      accent: '#F59E0B',
      live: true,
    },
    {
      label: 'Perp Funding',
      value: `BTC ${fmtFunding(btcFunding)}`,
      detail: `ETH ${fmtFunding(ethFunding)} · SOL ${fmtFunding(solFunding)}`,
      accent: btcFunding >= 0 ? GREEN : RED,
      live: true,
    },
  ];

  return (
    <div id="module-overview" className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-5 gap-3">
        {stats.map(stat => loading ? <Skeleton key={stat.label} height={120} /> : <MetricTile key={stat.label} {...stat} />)}
      </div>
    </div>
  );
}

function TvlPanel({
  tvl,
  latestRows,
  loading,
}: {
  tvl: Record<string, ChainTvlPoint[]>;
  latestRows: { chain: string; tvl_usd: number }[];
  loading: boolean;
}) {
  const [range, setRange] = useState<RangeKey>('1Y');
  const [selected, setSelected] = useState(() => new Set(['ethereum', 'bsc', 'tron', 'arbitrum', 'solana', 'base']));
  const selectedKeys = useMemo(() => [...selected], [selected]);
  const chartData = useMemo(() => mergeSeries(tvl, selectedKeys, row => row.tvl, range), [range, selectedKeys, tvl]);
  const visibleChains = Object.keys(CHAIN_COLORS);

  return (
    <PanelFrame
      id="module-tvl"
      eyebrow="Liquidity map"
      title="Chain TVL Monitoring"
      note="All-time DeFiLlama history with current liquidity snapshots layered by chain."
      accent="#7DD3FC"
      action={<RangeControl options={['1M', '3M', '1Y', 'ALL']} value={range} onChange={setRange} />}
    >
      <div className="flex flex-wrap gap-2 mb-5">
        {visibleChains.map(chain => {
          const active = selected.has(chain);
          return (
            <button
              key={chain}
              type="button"
              onClick={() => setSelected(prev => {
                const next = new Set(prev);
                if (next.has(chain)) next.delete(chain);
                else next.add(chain);
                return next;
              })}
              style={{
                borderRadius: 999,
                border: `1px solid ${active ? CHAIN_COLORS[chain] : 'rgba(255,255,255,0.08)'}`,
                background: active ? `${CHAIN_COLORS[chain]}18` : 'rgba(255,255,255,0.025)',
                color: active ? CHAIN_COLORS[chain] : MUTED,
                padding: '7px 11px',
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              {titleCase(chain)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Skeleton height={330} />
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-[1fr_300px] 3xl:grid-cols-[1fr_340px] gap-5">
          <div className="h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
                <defs>
                  {selectedKeys.map(chain => (
                    <linearGradient key={chain} id={`tvl-area-${chain}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHAIN_COLORS[chain] || BLUE} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={CHAIN_COLORS[chain] || BLUE} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" tickFormatter={fmtDateForRange(range)} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} width={68} />
                <Tooltip content={<ChartTooltip accent="#7DD3FC" />} cursor={cursorProps} />
                {selectedKeys.map(chain => (
                  <Area
                    key={chain}
                    type="monotone"
                    dataKey={chain}
                    name={titleCase(chain)}
                    stroke={CHAIN_COLORS[chain] || BLUE}
                    fill={`url(#tvl-area-${chain})`}
                    strokeWidth={1.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {latestRows.filter(row => row.chain !== 'all').slice(0, 10).map(row => (
              <div key={row.chain} className="flex items-center justify-between gap-3 py-2 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.055)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: CHAIN_COLORS[row.chain] || MUTED }} />
                  <span className="truncate" style={{ fontFamily: SANS, fontSize: 13, color: TEXT, fontWeight: 500 }}>{titleCase(row.chain)}</span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 13, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(row.tvl_usd)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelFrame>
  );
}

function ProtocolPanel({ protocols, loading }: { protocols: ProtocolRow[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<{ date: string; tvl: number }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);

  const loadProtocol = useCallback(async (slug: string) => {
    setHistoryLoading(true);
    try {
      setHistory(await fetchProtocolHistory(slug));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const firstSlug = protocols[0]?.slug;
    if (!firstSlug || autoLoaded) return;
    queueMicrotask(() => {
      setAutoLoaded(true);
      setExpanded(firstSlug);
      void loadProtocol(firstSlug);
    });
  }, [autoLoaded, loadProtocol, protocols]);

  const openProtocol = async (slug: string) => {
    if (expanded === slug) {
      setExpanded(null);
      return;
    }
    setExpanded(slug);
    await loadProtocol(slug);
  };

  return (
    <PanelFrame
      id="module-protocols"
      eyebrow="Protocol book"
      title="Capital Allocation Board"
      note="Current TVL leaders with expandable historical context for core protocols."
      accent="#A78BFA"
    >
      {loading ? (
        <Skeleton height={520} />
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_130px_120px] 3xl:grid-cols-[1fr_150px_140px] gap-4 px-2 pb-2 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.08)' }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>Protocol</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', textAlign: 'right', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>TVL</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', textAlign: 'right', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>Class</span>
          </div>
          {protocols.slice(0, 18).map(protocol => (
            <div key={protocol.slug}>
              <button
                type="button"
                onClick={() => openProtocol(protocol.slug)}
                className="w-full grid grid-cols-[1fr_130px_120px] 3xl:grid-cols-[1fr_150px_140px] gap-4 items-center px-2 py-3 text-left"
                style={{
                  border: 0,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: expanded === protocol.slug ? 'rgba(167,139,250,0.08)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span className="truncate" style={{ fontFamily: SANS, color: TEXT, fontSize: 14, fontWeight: 600 }}>{protocol.protocol}</span>
                <span style={{ fontFamily: MONO, color: TEXT, fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(protocol.tvl_usd)}</span>
                <span className="truncate" style={{ fontFamily: MONO, color: MUTED, fontSize: 11, textAlign: 'right' }}>
                  {protocol.category || 'Protocol'}
                </span>
              </button>
              {expanded === protocol.slug && (
                <div className="px-2 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {historyLoading ? (
                    <Skeleton height={130} />
                  ) : (
                    <ResponsiveContainer width="100%" height={130}>
                      <AreaChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`protocol-${protocol.slug}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...gridProps} />
                        <XAxis dataKey="date" tickFormatter={fmtDateForRange('ALL')} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={32} />
                        <YAxis tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} width={66} />
                        <Tooltip content={<ChartTooltip accent="#A78BFA" />} cursor={cursorProps} />
                        <Area dataKey="tvl" name="TVL" type="monotone" stroke="#A78BFA" fill={`url(#protocol-${protocol.slug})`} dot={false} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PanelFrame>
  );
}

function FeesPanel({
  history,
  protocols,
  loading,
}: {
  history: FeeHistoryPoint[];
  protocols: FeeRow[];
  loading: boolean;
}) {
  const [range, setRange] = useState<RangeKey>('1Y');
  const [mode, setMode] = useState<'fees' | 'revenue'>('fees');
  const chartData = useMemo(() => filterByRange(history, range), [history, range]);
  const chartMode = mode === 'revenue' && chartData.every(row => !row.revenue) ? 'fees' : mode;
  const topRows = useMemo(() => {
    const key = chartMode === 'fees' ? 'daily_fees_usd' : 'daily_revenue_usd';
    return [...protocols].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0)).slice(0, 10);
  }, [chartMode, protocols]);
  const accent = chartMode === 'fees' ? BLUE : AMBER;

  return (
    <PanelFrame
      id="module-fees"
      eyebrow="Revenue tape"
      title="Protocol Fees and Earnings"
      note="Aggregate history sits beside the current protocol revenue stack."
      accent={accent}
      action={<RangeControl options={['1M', '3M', '1Y', 'ALL']} value={range} onChange={setRange} />}
    >
      <div className="flex justify-end mb-4">
        <div className="flex gap-2">
          {(['revenue', 'fees'] as const).map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              style={{
                borderRadius: 999,
                border: `1px solid ${mode === option ? accent : 'rgba(255,255,255,0.08)'}`,
                background: mode === option ? `${accent}1C` : 'transparent',
                color: mode === option ? accent : MUTED,
                padding: '7px 12px',
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: '0.04em',
                fontWeight: mode === option ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {titleCase(option)}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <Skeleton height={320} />
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-[1fr_320px] 3xl:grid-cols-[1fr_360px] gap-5">
          <div className="h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fees-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" tickFormatter={fmtDateForRange(range)} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} width={70} />
                <Tooltip content={<ChartTooltip accent={accent} />} cursor={cursorProps} />
                <Area
                  type="monotone"
                  dataKey={chartMode}
                  name={chartMode === 'fees' ? 'Daily fees' : 'Daily revenue'}
                  stroke={accent}
                  fill="url(#fees-gradient)"
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {topRows.map(row => (
              <div key={`${row.slug}-${mode}`} className="grid grid-cols-[1fr_96px] gap-3 items-center">
                <div>
                  <div className="truncate" style={{ fontFamily: SANS, fontSize: 13, color: TEXT, fontWeight: 600 }}>{row.protocol}</div>
                  <div style={{ height: 5, marginTop: 7, background: 'rgba(255,255,255,0.055)', borderRadius: 99, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, ((chartMode === 'fees' ? row.daily_fees_usd : row.daily_revenue_usd) / Math.max(1, chartMode === 'fees' ? topRows[0]?.daily_fees_usd ?? 1 : topRows[0]?.daily_revenue_usd ?? 1)) * 100)}%`,
                        height: '100%',
                        background: accent,
                      }}
                    />
                  </div>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 13, color: MUTED, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtMoney(chartMode === 'fees' ? row.daily_fees_usd : row.daily_revenue_usd)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelFrame>
  );
}

function DexPanel({ volumes, loading }: { volumes: Record<string, DexPoint[]>; loading: boolean }) {
  const [range, setRange] = useState<RangeKey>('1Y');
  const chartData = useMemo(() => mergeSeries(volumes, DISPLAY_DEX_CHAINS, row => row.volume, range), [range, volumes]);

  return (
    <PanelFrame
      id="module-dex"
      eyebrow="Exchange flow"
      title="DEX Volume Intelligence"
      note="Native DeFiLlama chain histories replace estimated chain allocation."
      accent={GREEN}
      action={<RangeControl options={['1M', '3M', '1Y', 'ALL']} value={range} onChange={setRange} />}
    >
      {loading ? (
        <Skeleton height={300} />
      ) : (
        <>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" tickFormatter={fmtDateForRange(range)} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} width={70} />
                <Tooltip content={<ChartTooltip accent={GREEN} />} cursor={{ fill: 'rgba(34,197,94,0.035)' }} />
                {DISPLAY_DEX_CHAINS.map(chain => (
                  <Bar
                    key={chain}
                    dataKey={chain}
                    name={chain === 'all' ? 'All DEXs' : titleCase(chain)}
                    fill={DEX_COLORS[chain]}
                    fillOpacity={chain === 'all' ? 0.68 : 0.34}
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            {DISPLAY_DEX_CHAINS.map(chain => {
              const value = latest(volumes[chain] ?? [])?.volume ?? 0;
              return (
                <div key={chain} className="flex items-center gap-2">
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: DEX_COLORS[chain] }} />
                  <span style={{ fontFamily: SANS, fontSize: 12, color: MUTED }}>{chain === 'all' ? 'All DEXs' : titleCase(chain)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: TEXT, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(value)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </PanelFrame>
  );
}

function StablecoinPanel({
  supply,
  total,
  bySymbol,
  loading,
}: {
  supply: StableRow[];
  total: TotalStablePoint[];
  bySymbol: Record<string, StableHistoryPoint[]>;
  loading: boolean;
}) {
  const [range, setRange] = useState<RangeKey>('1Y');
  const symbols = useMemo(() => supply.slice(0, 6).map(row => row.symbol), [supply]);
  const chartData = useMemo(() => {
    const merged = mergeSeries(bySymbol, symbols, row => row.supply, range);
    return merged.length > 0 ? merged : filterByRange(total, range);
  }, [bySymbol, range, symbols, total]);
  const totalSupply = supply.reduce((sum, row) => sum + row.supply_usd, 0);
  const colors = ['#22C55E', '#38BDF8', '#A78BFA', '#F59E0B', '#EF4444', '#06B6D4'];

  return (
    <PanelFrame
      id="module-stables"
      eyebrow="Settlement layer"
      title="Stablecoin Reserve Monitor"
      note="All-time stablecoin supply history with live peg and market share context."
      accent={GREEN}
      action={<RangeControl options={['1M', '3M', '1Y', 'ALL']} value={range} onChange={setRange} />}
    >
      {loading ? (
        <Skeleton height={300} />
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-[1fr_330px] 3xl:grid-cols-[1fr_380px] gap-5">
          <div className="h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="stable-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GREEN} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" tickFormatter={fmtDateForRange(range)} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} width={70} />
                <Tooltip content={<ChartTooltip accent={GREEN} />} cursor={cursorProps} />
                {symbols.length > 0 ? symbols.map((symbol, index) => (
                  <Area
                    key={symbol}
                    type="monotone"
                    dataKey={symbol}
                    name={symbol}
                    stackId="stablecoins"
                    stroke={colors[index % colors.length]}
                    fill={colors[index % colors.length]}
                    fillOpacity={0.26}
                    strokeWidth={1.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )) : (
                  <Area type="monotone" dataKey="total" name="Total supply" stroke={GREEN} fill="url(#stable-gradient)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.06)' }}>
              {supply.slice(0, 6).map((row, index) => (
                <span key={row.symbol} style={{ width: `${totalSupply ? (row.supply_usd / totalSupply) * 100 : 0}%`, background: colors[index] }} />
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {supply.slice(0, 10).map((row, index) => {
                const peg = row.peg_price || 1;
                const alert = Math.abs(peg - 1) > 0.005;
                return (
                  <div key={row.symbol} className="flex items-center justify-between gap-3 py-2 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.055)' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ width: 7, height: 7, borderRadius: 99, background: colors[index % colors.length] }} />
                      <span style={{ fontFamily: SANS, fontSize: 13, color: TEXT, fontWeight: 600 }}>{row.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div style={{ fontFamily: MONO, fontSize: 13, color: TEXT, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(row.supply_usd)}</div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: alert ? RED : MUTED }}>${peg.toFixed(4)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </PanelFrame>
  );
}

function DerivativesPanel({
  btcData,
  ethData,
  solData,
  defiOpenInterest,
  loading,
}: {
  btcData: DerivPoint[];
  ethData: DerivPoint[];
  solData: DerivPoint[];
  defiOpenInterest: DerivPoint[];
  loading: boolean;
}) {
  const [range, setRange] = useState<RangeKey>('3M');
  const [activeTab, setActiveTab] = useState<'oi' | 'funding'>('oi');
  const btcChart = useMemo(() => filterByRange(btcData, range), [btcData, range]);
  const ethChart = useMemo(() => filterByRange(ethData, range), [ethData, range]);
  const solChart = useMemo(() => filterByRange(solData, range), [solData, range]);
  const defiChart = useMemo(() => filterByRange(defiOpenInterest, range), [defiOpenInterest, range]);

  const symbolData = { BTC: btcChart, ETH: ethChart, SOL: solChart };
  const symbolFunding = {
    BTC: [...btcData].reverse().find(row => row.fr !== null)?.fr ?? 0,
    ETH: [...ethData].reverse().find(row => row.fr !== null)?.fr ?? 0,
    SOL: [...solData].reverse().find(row => row.fr !== null)?.fr ?? 0,
  };
  const symbolLS = {
    BTC: [...btcData].reverse().find(row => row.ls !== null)?.ls ?? 1,
    ETH: [...ethData].reverse().find(row => row.ls !== null)?.ls ?? 1,
    SOL: [...solData].reverse().find(row => row.ls !== null)?.ls ?? 1,
  };
  const symbolOI = {
    BTC: [...btcData].reverse().find(row => row.oi !== null)?.oi ?? 0,
    ETH: [...ethData].reverse().find(row => row.oi !== null)?.oi ?? 0,
    SOL: [...solData].reverse().find(row => row.oi !== null)?.oi ?? 0,
  };
  const totalOI = symbolOI.BTC + symbolOI.ETH + symbolOI.SOL;

  const oiValues = defiChart.map(row => row.oi ?? 0).filter(value => value > 0);
  const oiAvg = oiValues.length ? oiValues.reduce((sum, value) => sum + value, 0) / oiValues.length : 0;
  const oiBand = oiAvg * 0.12;

  return (
    <PanelFrame
      id="module-derivatives"
      eyebrow="Risk surface"
      title="Derivatives Radar"
      note="Multi-symbol futures posture — BTC, ETH, SOL funding rates paired with DeFi perpetual open interest."
      accent="#F97316"
      action={<RangeControl options={['1M', '3M', '1Y', 'ALL']} value={range} onChange={setRange} />}
    >
      {loading ? (
        <Skeleton height={500} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile label="BTC OI" value={fmtMoney(symbolOI.BTC)} detail={`FR: ${fmtFunding(symbolFunding.BTC)}`} accent={symbolFunding.BTC >= 0 ? GREEN : RED} />
            <MetricTile label="ETH OI" value={fmtMoney(symbolOI.ETH)} detail={`FR: ${fmtFunding(symbolFunding.ETH)}`} accent={symbolFunding.ETH >= 0 ? GREEN : RED} />
            <MetricTile label="SOL OI" value={fmtMoney(symbolOI.SOL)} detail={`FR: ${fmtFunding(symbolFunding.SOL)}`} accent={symbolFunding.SOL >= 0 ? GREEN : RED} />
            <MetricTile label="Total OI" value={fmtMoney(totalOI)} detail="Combined futures exposure" accent="#F97316" />
          </div>

          <div className="flex gap-2 mb-1">
            {(['oi', 'funding'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 12px',
                  fontFamily: MONO,
                  fontSize: 11,
                  fontWeight: activeTab === tab ? 800 : 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  border: `1px solid ${activeTab === tab ? '#F97316' : 'rgba(255,255,255,0.06)'}`,
                  background: activeTab === tab ? 'rgba(249,115,22,0.10)' : 'transparent',
                  color: activeTab === tab ? '#F97316' : MUTED,
                  cursor: 'pointer',
                  borderRadius: 0,
                }}
              >
                {tab === 'oi' ? 'Open Interest' : 'Funding Rates'}
              </button>
            ))}
          </div>

          {activeTab === 'oi' && (
            <div className="grid grid-cols-1 2xl:grid-cols-[1.1fr_0.9fr] gap-5">
              <div className="h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={defiChart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="date" tickFormatter={fmtDateForRange(range)} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} width={70} />
                    <Tooltip content={<ChartTooltip accent="#F97316" />} cursor={cursorProps} />
                    {oiAvg > 0 && <ReferenceArea y1={Math.max(0, oiAvg - oiBand)} y2={oiAvg + oiBand} fill="#F97316" fillOpacity={0.08} strokeOpacity={0} />}
                    {oiAvg > 0 && <ReferenceLine y={oiAvg} stroke="rgba(249,115,22,0.42)" strokeDasharray="4 8" />}
                    <Line type="monotone" dataKey="oi" name="DeFi open interest" stroke="#F97316" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <MetricTile label="BTC Funding" value={fmtFunding(symbolFunding.BTC)} detail={symbolFunding.BTC >= 0 ? 'Longs are paying' : 'Shorts are paying'} accent={symbolFunding.BTC >= 0 ? GREEN : RED} />
                  <MetricTile label="Long Short" value={symbolLS.BTC.toFixed(3)} detail={symbolLS.BTC >= 1 ? 'Long bias in accounts' : 'Short bias in accounts'} accent={symbolLS.BTC >= 1 ? GREEN : RED} />
                </div>
                <div style={{ height: 170 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={btcChart} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="date" tickFormatter={fmtDateForRange(range)} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={28} />
                      <YAxis tickFormatter={value => `${(Number(value) * 100).toFixed(3)}%`} tick={tickStyle} tickLine={false} axisLine={false} width={62} />
                      <Tooltip content={<ChartTooltip accent={BLUE} formatter={fmtFunding} />} cursor={{ fill: 'rgba(255,255,255,0.035)' }} />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 6" />
                      <Bar dataKey="fr" name="BTC funding" fill={BLUE} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'funding' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(['BTC', 'ETH', 'SOL'] as const).map(sym => (
                <div key={sym}>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: MUTED, marginBottom: 8, letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>{sym} FUNDING RATE</div>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={symbolData[sym]} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid {...gridProps} />
                        <XAxis dataKey="date" tickFormatter={fmtDateForRange(range)} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={20} />
                        <YAxis tickFormatter={v => `${(Number(v) * 100).toFixed(3)}%`} tick={tickStyle} tickLine={false} axisLine={false} width={58} />
                        <Tooltip content={<ChartTooltip formatter={fmtFunding} accent={BLUE} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 6" />
                        <Bar dataKey="fr" name={`${sym} funding`} fill={BLUE} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </PanelFrame>
  );
}

function YieldPanel({ yields, loading }: { yields: YieldRow[]; loading: boolean }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<'tvl_usd' | 'apy'>('tvl_usd');
  const [history, setHistory] = useState<YieldHistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...yields]
      .filter(row => !q || row.protocol.toLowerCase().includes(q) || row.chain.toLowerCase().includes(q) || row.symbol.toLowerCase().includes(q))
      .sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));
  }, [query, sortKey, yields]);

  const topApy = useMemo(() => {
    return [...yields].sort((a, b) => b.apy - a.apy).slice(0, 10);
  }, [yields]);

  const bestStable = useMemo(() => {
    const stables = ['USDC', 'USDT', 'DAI', 'USDE', 'FRAX'];
    return [...yields]
      .filter(y => stables.some(s => y.symbol.toUpperCase().includes(s)) && y.tvl_usd >= 1_000_000)
      .sort((a, b) => b.apy - a.apy)[0];
  }, [yields]);

  const selectedPool = selectedPoolId ? yields.find(y => y.pool_id === selectedPoolId) : filtered[0];

  useEffect(() => {
    if (!selectedPool?.pool_id) {
      queueMicrotask(() => setHistory([]));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setHistoryLoading(true); });
    fetchYieldHistory(selectedPool.pool_id)
      .then(rows => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedPool?.pool_id]);

  return (
    <PanelFrame
      id="module-yields"
      eyebrow="Yield market"
      title="Pool Quality Screen"
      note="Current free Yields Llama pool data, ranked by capital or yield."
      accent="#14B8A6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Filter protocol, chain, or symbol"
          style={{
            width: 'min(360px, 100%)',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.22)',
            color: TEXT,
            outline: 'none',
            padding: '10px 12px',
            fontFamily: SANS,
            fontSize: 13,
            letterSpacing: '0.01em',
          }}
        />
        <div className="flex gap-2">
          {(['tvl_usd', 'apy'] as const).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setSortKey(key)}
              style={{
                borderRadius: 999,
                border: `1px solid ${sortKey === key ? '#14B8A6' : 'rgba(255,255,255,0.08)'}`,
                background: sortKey === key ? 'rgba(20,184,166,0.14)' : 'transparent',
                color: sortKey === key ? '#5EEAD4' : MUTED,
                padding: '8px 12px',
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: '0.04em',
                fontWeight: sortKey === key ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {key === 'tvl_usd' ? 'TVL' : 'APY'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton height={460} />
      ) : (
        <div className="space-y-5">
          {bestStable && (
            <div style={{ padding: '12px 16px', border: `1px solid ${GREEN}33`, background: `${GREEN}08` }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: GREEN, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>Best Stablecoin Yield</div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <span style={{ fontFamily: SANS, fontSize: 15, color: TEXT, fontWeight: 600 }}>{bestStable.symbol}</span>
                  <span style={{ fontFamily: SANS, fontSize: 12, color: MUTED, marginLeft: 8 }}>{bestStable.protocol} · {bestStable.chain}</span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 20, color: GREEN, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{fmtPct(bestStable.apy)}</span>
              </div>
            </div>
          )}

          <div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: MUTED, marginBottom: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Top 10 by APY</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {topApy.map((row, index) => (
                <button
                  key={row.pool_id}
                  type="button"
                  onClick={() => setSelectedPoolId(row.pool_id)}
                  style={{
                    padding: '10px 12px',
                    border: `1px solid ${selectedPoolId === row.pool_id ? '#14B8A6' : 'rgba(255,255,255,0.06)'}`,
                    background: selectedPoolId === row.pool_id ? 'rgba(20,184,166,0.10)' : 'rgba(0,0,0,0.15)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 10, color: FAINT, fontWeight: 600 }}>#{index + 1}</div>
                  <div className="truncate" style={{ fontFamily: SANS, fontSize: 13, color: TEXT, fontWeight: 600 }}>{row.symbol}</div>
                  <div style={{ fontFamily: SANS, fontSize: 11, color: MUTED }}>{row.protocol}</div>
                  <div style={{ fontFamily: MONO, fontSize: 15, color: row.apy >= 10 ? GREEN : AMBER, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{fmtPct(row.apy)}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 240 }}>
            {historyLoading ? (
              <Skeleton height={240} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={history} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="yield-apy-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="date" tickFormatter={fmtDateForRange('ALL')} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis yAxisId="apy" tickFormatter={value => `${Number(value).toFixed(1)}%`} tick={tickStyle} tickLine={false} axisLine={false} width={58} />
                  <YAxis yAxisId="tvl" orientation="right" tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} width={68} />
                  <Tooltip
                    cursor={cursorProps}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload as YieldHistoryPoint;
                      return (
                        <div style={{ minWidth: 170, padding: 12, border: '1px solid rgba(20,184,166,0.45)', borderTop: '2px solid #14B8A6', background: 'rgba(8,10,16,0.98)', fontFamily: MONO, boxShadow: '0 24px 70px rgba(0,0,0,0.72)' }}>
                          <div style={{ color: '#8A9BB0', fontSize: 12, marginBottom: '2px', letterSpacing: '0.12em' }}>{label ? fmtDate(label) : ''}</div>
                          <div style={{ height: '1px', background: 'rgba(30,60,100,0.9)', margin: '9px 0' }} />
                          <div style={{ color: '#6A8EAA', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>APY</div>
                          <div style={{ color: '#5EEAD4', fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', lineHeight: 1, textShadow: '0 0 18px rgba(94,234,212,0.50)' }}>{fmtPct(row.apy)}</div>
                          <div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>TVL {fmtMoney(row.tvl)}</div>
                        </div>
                      );
                    }}
                  />
                  <Area yAxisId="apy" type="monotone" dataKey="apy" name="APY" stroke="#14B8A6" fill="url(#yield-apy-gradient)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  <Line yAxisId="tvl" type="monotone" dataKey="tvl" name="TVL" stroke="#E8960C" strokeWidth={1.2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_130px_100px_90px] 3xl:grid-cols-[1fr_150px_120px_110px] gap-4 px-2 pb-2 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.08)' }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>Pool</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', textAlign: 'right', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>TVL</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', textAlign: 'right', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>APY</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', textAlign: 'right', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>Chain</span>
            </div>
            {filtered.slice(0, 24).map(row => (
              <button
                key={row.pool_id}
                type="button"
                onClick={() => setSelectedPoolId(row.pool_id)}
                className="w-full grid grid-cols-[1fr_130px_100px_90px] 3xl:grid-cols-[1fr_150px_120px_110px] gap-4 items-center px-2 py-3 text-left"
                style={{
                  border: 0,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: selectedPoolId === row.pool_id ? 'rgba(20,184,166,0.06)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div className="min-w-0">
                  <div className="truncate" style={{ fontFamily: SANS, fontSize: 13, color: TEXT, fontWeight: 600 }}>{row.symbol}</div>
                  <div className="truncate" style={{ fontFamily: SANS, fontSize: 11, color: MUTED }}>{row.protocol}</div>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 13, color: MUTED, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(row.tvl_usd)}</span>
                <span style={{ fontFamily: MONO, fontSize: 13, color: row.apy >= 10 ? GREEN : AMBER, textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtPct(row.apy)}</span>
                <span className="truncate" style={{ fontFamily: SANS, fontSize: 11, color: MUTED, textAlign: 'right' }}>{row.chain}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </PanelFrame>
  );
}

function OptionsPanel({
  aggregate,
  byChain,
  latest: latestRows,
  loading,
}: {
  aggregate: OptionsPoint[];
  byChain: Record<string, OptionsPoint[]>;
  latest: { chain: string; volume_usd: number }[];
  loading: boolean;
}) {
  const [range, setRange] = useState<RangeKey>('1Y');
  const chartData = useMemo(() => filterByRange(aggregate, range), [aggregate, range]);
  const sideRows = useMemo(() => {
    if (latestRows.length > 0) return latestRows;
    return Object.entries(byChain)
      .map(([chain, rows]) => ({ chain, volume_usd: latest(rows)?.volume ?? 0 }))
      .filter(row => row.volume_usd > 0)
      .sort((a, b) => b.volume_usd - a.volume_usd)
      .slice(0, 8);
  }, [byChain, latestRows]);

  return (
    <PanelFrame
      id="module-options"
      eyebrow="Derivatives surface"
      title="Options Market Flow"
      note="DeFi options volume across chains — aggregate history with per-chain breakdown."
      accent="#EC4899"
      action={<RangeControl options={['1M', '3M', '1Y', 'ALL']} value={range} onChange={setRange} />}
    >
      {loading ? (
        <Skeleton height={320} />
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-[1fr_280px] 3xl:grid-cols-[1fr_320px] gap-5">
          <div className="h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="options-aggregate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EC4899" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" tickFormatter={fmtDateForRange(range)} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} width={70} />
                <Tooltip content={<ChartTooltip accent="#EC4899" />} cursor={cursorProps} />
                <Area type="monotone" dataKey="volume" name="Total options" stroke="#EC4899" fill="url(#options-aggregate)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Top Chains</div>
            {sideRows.map(row => (
              <div key={row.chain} className="flex items-center justify-between gap-3 py-2 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.055)' }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: TEXT }}>{row.chain === 'all' ? 'All Options' : titleCase(row.chain)}</span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: MUTED }}>{fmtMoney(row.volume_usd)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelFrame>
  );
}

function BtcPricePanel({ prices, loading }: { prices: BtcPricePoint[]; loading: boolean }) {
  const [range, setRange] = useState<RangeKey>('1Y');
  const chartData = useMemo(() => {
    const cutoff = cutoffFor(range);
    return prices.filter(row => row.date >= cutoff);
  }, [prices, range]);

  const latest = chartData[chartData.length - 1];
  const change24h = chartData.length > 1 && latest && chartData[chartData.length - 2]
    ? ((latest.close - chartData[chartData.length - 2].close) / chartData[chartData.length - 2].close) * 100
    : 0;

  return (
    <PanelFrame
      id="module-btc"
      eyebrow="Market anchor"
      title="BTC Price Context"
      note="Daily spot price from Binance — the macro anchor for all DeFi risk pricing."
      accent="#F59E0B"
      action={<RangeControl options={['1M', '3M', '1Y', 'ALL']} value={range} onChange={setRange} />}
    >
      {loading ? (
        <Skeleton height={300} />
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-[1fr_220px] 3xl:grid-cols-[1fr_260px] gap-5">
          <div className="h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="btc-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" tickFormatter={fmtDateForRange(range)} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis tickFormatter={v => `$${(Number(v) / 1000).toFixed(0)}K`} tick={tickStyle} tickLine={false} axisLine={false} width={62} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as BtcPricePoint;
                    return (
                      <div style={{ minWidth: 180, padding: 12, border: '1px solid rgba(245,158,11,0.4)', borderTop: '2px solid #F59E0B', background: 'rgba(8,10,16,0.98)', fontFamily: MONO, boxShadow: '0 24px 70px rgba(0,0,0,0.72)' }}>
                        <div style={{ color: '#8A9BB0', fontSize: 12, marginBottom: '2px', letterSpacing: '0.12em' }}>{label ? fmtDate(label) : ''}</div>
                        <div style={{ height: '1px', background: 'rgba(30,60,100,0.9)', margin: '9px 0' }} />
                        <div style={{ color: '#6A8EAA', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>BTC CLOSE</div>
                        <div style={{ color: '#F59E0B', fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', lineHeight: 1, textShadow: '0 0 18px rgba(245,158,11,0.50)' }}>${p.close.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                        <div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>H: ${p.high.toLocaleString('en-US', { maximumFractionDigits: 0 })} · L: ${p.low.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                        <div style={{ color: MUTED, fontSize: 11 }}>Vol: ${(p.volume / 1e9).toFixed(2)}B</div>
                      </div>
                    );
                  }}
                  cursor={cursorProps}
                />
                <Area type="monotone" dataKey="close" name="BTC close" stroke="#F59E0B" fill="url(#btc-gradient)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {latest && (
              <>
                <MetricTile label="BTC Price" value={`$${latest.close.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} detail={`24h: ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`} accent="#F59E0B" live />
                <MetricTile label="24h High" value={`$${latest.high.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} accent="#22C55E" />
                <MetricTile label="24h Low" value={`$${latest.low.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} accent="#C2344D" />
              </>
            )}
          </div>
        </div>
      )}
    </PanelFrame>
  );
}

function LendingPanel({
  protocols,
  yields,
  totalBorrowed,
  loading,
}: {
  protocols: ProtocolRow[];
  yields: YieldRow[];
  totalBorrowed: number;
  loading: boolean;
}) {
  const totalSupplied = useMemo(() => protocols.reduce((sum, p) => sum + p.tvl_usd, 0), [protocols]);

  const stableYields = useMemo(() => {
    const targets = ['USDC', 'USDT', 'ETH', 'WBTC'];
    return targets.map(symbol => {
      const match = yields
        .filter(y => y.symbol.toUpperCase().includes(symbol) && y.tvl_usd >= 100_000)
        .sort((a, b) => b.apy - a.apy)[0];
      return { symbol, apy: match?.apy ?? 0, protocol: match?.protocol ?? '-', pool: match?.symbol ?? '-' };
    });
  }, [yields]);

  if (loading) return <PanelFrame id="module-lending" eyebrow="Credit markets" title="Lending Intelligence" note="DeFi lending protocols and borrow rates" accent={AMBER}><Skeleton height={400} /></PanelFrame>;

  if (protocols.length === 0) {
    return (
      <PanelFrame id="module-lending" eyebrow="Credit markets" title="Lending Intelligence" note="DeFi lending protocols and borrow rates" accent={AMBER}>
        <DataUnavailable />
      </PanelFrame>
    );
  }

  return (
    <PanelFrame id="module-lending" eyebrow="Credit markets" title="Lending Intelligence" note="DeFi lending protocols and borrow rates" accent={AMBER}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <MetricTile label="Total Supplied" value={fmtMoney(totalSupplied)} detail="Across tracked lending protocols" accent={AMBER} />
        <MetricTile label="Total Borrowed" value={totalBorrowed > 0 ? fmtMoney(totalBorrowed) : 'Not tracked'} detail={totalBorrowed > 0 ? 'Outstanding debt' : 'Per-protocol detail not fetched'} accent={BLUE} />
      </div>

      <div className="mb-5">
        <h3 style={{ fontFamily: MONO, fontSize: 12, color: MUTED, marginBottom: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Top Lending Protocols</h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3 px-2 py-2 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.08)' }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>Protocol</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', textAlign: 'right', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>TVL</span>
          </div>
          {protocols.slice(0, 8).map((p, index) => (
            <div key={p.slug} className="flex items-center justify-between gap-3 px-2 py-2 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2">
                <span style={{ width: 7, height: 7, borderRadius: 99, background: LENDING_COLORS[index % LENDING_COLORS.length] }} />
                <span style={{ fontFamily: MONO, fontSize: 12, color: TEXT }}>{p.protocol}</span>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 12, color: MUTED }}>{fmtMoney(p.tvl_usd)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontFamily: MONO, fontSize: 12, color: MUTED, marginBottom: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Lending APYs</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stableYields.map(y => (
            <div key={y.symbol} style={{ border: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', background: 'rgba(0,0,0,0.15)' }}>
              <div style={{ fontFamily: SANS, fontSize: 11, color: FAINT, marginBottom: 4, fontWeight: 600 }}>{y.symbol}</div>
              <div style={{ fontFamily: MONO, fontSize: 20, color: y.apy > 0 ? GREEN : MUTED, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{fmtPct(y.apy)}</div>
              <div style={{ fontFamily: SANS, fontSize: 11, color: MUTED, marginTop: 4 }}>{y.protocol}</div>
            </div>
          ))}
        </div>
      </div>
    </PanelFrame>
  );
}

function BridgesPanel({ protocols, loading }: { protocols: ProtocolRow[]; loading: boolean }) {
  const top5 = useMemo(() => protocols.slice(0, 5), [protocols]);
  const totalTvl = useMemo(() => top5.reduce((sum, b) => sum + b.tvl_usd, 0), [top5]);

  if (loading) return <PanelFrame id="module-bridges" eyebrow="Interoperability" title="Bridge TVL Monitor" note="Cross-chain liquidity bridges" accent="#A78BFA"><Skeleton height={350} /></PanelFrame>;

  if (protocols.length === 0) {
    return (
      <PanelFrame id="module-bridges" eyebrow="Interoperability" title="Bridge TVL Monitor" note="Cross-chain liquidity bridges" accent="#A78BFA">
        <DataUnavailable />
      </PanelFrame>
    );
  }

  return (
    <PanelFrame id="module-bridges" eyebrow="Interoperability" title="Bridge TVL Monitor" note="Cross-chain liquidity bridges" accent="#A78BFA">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {top5.map((b, index) => (
          <MetricTile key={b.slug} label={b.protocol} value={fmtMoney(b.tvl_usd)} detail={b.category || 'Bridge'} accent={BRIDGE_COLORS[index % BRIDGE_COLORS.length]} />
        ))}
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between gap-3 px-2 py-2 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.08)' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>Bridge</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', textAlign: 'right', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>TVL</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.40)', textAlign: 'right', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600 }}>Share</span>
        </div>
        {protocols.slice(0, 10).map((b, index) => (
          <div key={b.slug} className="flex items-center justify-between gap-3 px-2 py-2 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <span style={{ width: 7, height: 7, borderRadius: 99, background: BRIDGE_COLORS[index % BRIDGE_COLORS.length] }} />
              <span className="truncate" style={{ fontFamily: SANS, fontSize: 13, color: TEXT, fontWeight: 500 }}>{b.protocol}</span>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 13, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(b.tvl_usd)}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: MUTED, textAlign: 'right', minWidth: 50, fontVariantNumeric: 'tabular-nums' }}>
              {totalTvl ? ((b.tvl_usd / totalTvl) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
      </div>
    </PanelFrame>
  );
}

// Legacy LiquidationsPanel - replaced by ./panels/LiquidationsPanel.tsx
// Kept for reference during migration
/*
function LiquidationsPanel({
  btcData,
  ethData,
  solData,
  loading,
  onShowDerivatives,
}: {
  btcData: DerivPoint[];
  ethData: DerivPoint[];
  solData: DerivPoint[];
  loading: boolean;
  onShowDerivatives?: () => void;
}) {
  const latestBtcOi = latest(btcData)?.oi ?? 0;
  const latestEthOi = latest(ethData)?.oi ?? 0;
  const latestSolOi = latest(solData)?.oi ?? 0;
  const totalOi = latestBtcOi + latestEthOi + latestSolOi;

  const btcFr = latest(btcData)?.fr ?? 0;
  const ethFr = latest(ethData)?.fr ?? 0;
  const solFr = latest(solData)?.fr ?? 0;

  const liquidationEstimate = useMemo(() => {
    const avgFr = (Math.abs(btcFr) + Math.abs(ethFr) + Math.abs(solFr)) / 3;
    return totalOi * avgFr * 0.15;
  }, [btcFr, ethFr, solFr, totalOi]);

  if (loading) return <PanelFrame id="module-liquidations" eyebrow="Risk events" title="Liquidation Risk Estimate" note="Estimated liquidations derived from funding rates and open interest" accent={RED}><Skeleton height={260} /></PanelFrame>;

  return (
    <PanelFrame id="module-liquidations" eyebrow="Risk events" title="Liquidation Risk Estimate" note="Estimated liquidations derived from funding rates and open interest" accent={RED}>
      <div className="mb-5">
        <button
          type="button"
          onClick={onShowDerivatives}
          style={{
            padding: '8px 14px',
            border: '1px solid rgba(249,115,22,0.35)',
            background: 'rgba(249,115,22,0.08)',
            color: '#F97316',
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: '0.06em',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          View full OI / funding breakdown in Derivatives →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {([
          { sym: 'BTC', fr: btcFr, oi: latestBtcOi },
          { sym: 'ETH', fr: ethFr, oi: latestEthOi },
          { sym: 'SOL', fr: solFr, oi: latestSolOi },
        ] as const).map(({ sym, fr, oi }) => {
          const risk = Math.abs(fr) * oi * 0.15;
          return (
            <MetricTile
              key={sym}
              label={`${sym} Liquidation Risk`}
              value={fmtMoney(risk)}
              detail={`${sym} OI: ${fmtMoney(oi)} · FR: ${fmtFunding(fr)}`}
              accent={Math.abs(fr) > 0.001 ? RED : GREEN}
            />
          );
        })}
      </div>

      <div style={{ padding: '20px', border: '1px solid rgba(194,52,77,0.25)', background: 'rgba(194,52,77,0.06)' }}>
        <div style={{ fontFamily: SANS, fontSize: 13, color: TEXT, fontWeight: 600, marginBottom: 8, letterSpacing: '0.01em' }}>Total Estimated Liquidations (24h)</div>
        <div style={{ fontFamily: MONO, fontSize: 28, color: RED, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{fmtMoney(liquidationEstimate)}</div>
        <div style={{ fontFamily: SANS, fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>Based on funding rate extremes vs open interest. Not actual liquidations.</div>
      </div>
    </PanelFrame>
  );
}
*/

function MarketStructurePanel({
  summary,
  external,
  btcPrices,
  ethPrices,
  solPrices,
  loading,
}: {
  summary: Summary;
  external: ExternalData;
  btcPrices: BtcPricePoint[];
  ethPrices: BtcPricePoint[];
  solPrices: BtcPricePoint[];
  loading: boolean;
}) {
  const global = external.cryptoGlobal;
  const btcQuote = tickerUsd(external.tickers.BTC);
  const ethQuote = tickerUsd(external.tickers.ETH);
  const solQuote = tickerUsd(external.tickers.SOL);
  const barData = [
    { asset: 'BTC', cap: btcQuote.market_cap ?? 0, volume: btcQuote.volume_24h ?? 0, color: '#F59E0B' },
    { asset: 'ETH', cap: ethQuote.market_cap ?? 0, volume: ethQuote.volume_24h ?? 0, color: '#627EEA' },
    { asset: 'SOL', cap: solQuote.market_cap ?? 0, volume: solQuote.volume_24h ?? 0, color: '#9B5CFF' },
    { asset: 'DeFi TVL', cap: parseSummaryNumber(summary, 'total_defi_tvl'), volume: parseSummaryNumber(summary, 'total_dex_volume_24h'), color: AMBER },
  ];
  const btcChart = useMemo(() => filterByRange(btcPrices, '3M'), [btcPrices]);

  const latestBtc = latest(btcPrices);
  const latestEth = latest(ethPrices);
  const latestSol = latest(solPrices);

  const sparkData = (prices: BtcPricePoint[]) => prices.slice(-30).map(p => p.close);

  const assets = [
    { name: 'BTC', price: latestBtc?.close ?? 0, change: btcPrices.length > 1 && latestBtc ? ((latestBtc.close - btcPrices[btcPrices.length - 2].close) / btcPrices[btcPrices.length - 2].close) * 100 : 0, data: sparkData(btcPrices), color: '#F59E0B' },
    { name: 'ETH', price: latestEth?.close ?? 0, change: ethPrices.length > 1 && latestEth ? ((latestEth.close - ethPrices[ethPrices.length - 2].close) / ethPrices[ethPrices.length - 2].close) * 100 : 0, data: sparkData(ethPrices), color: '#627EEA' },
    { name: 'SOL', price: latestSol?.close ?? 0, change: solPrices.length > 1 && latestSol ? ((latestSol.close - solPrices[solPrices.length - 2].close) / solPrices[solPrices.length - 2].close) * 100 : 0, data: sparkData(solPrices), color: '#9B5CFF' },
  ];

  return (
    <PanelFrame
      id="module-market-structure"
      eyebrow="Macro context"
      title="Market Structure Crosscheck"
      note="CoinPaprika global market data sits beside Novrix DeFi liquidity to show whether on-chain risk is expanding with the broader market."
      accent={BLUE}
    >
      {loading ? (
        <Skeleton height={460} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile label="Global Market Cap" value={fmtMoney(global?.market_cap_usd)} detail={`24h ${fmtPct(global?.market_cap_change_24h ?? 0)}`} accent={BLUE} />
            <MetricTile label="BTC Dominance" value={fmtPct(global?.bitcoin_dominance_percentage ?? 0)} detail="Market share" accent="#F59E0B" />
            <MetricTile label="Global Volume" value={fmtMoney(global?.volume_24h_usd)} detail={`24h ${fmtPct(global?.volume_24h_change_24h ?? 0)}`} accent="#60A5FA" />
            <MetricTile label="Tracked Assets" value={(global?.cryptocurrencies_number ?? 0).toLocaleString('en-US')} detail={global?.last_updated ? `Updated ${fmtDate(normalizeApiDate(global.last_updated))}` : 'CoinPaprika coverage'} accent="#A78BFA" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {assets.map(asset => (
              <div key={asset.name} style={{ border: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px', background: 'rgba(0,0,0,0.15)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontFamily: SANS, fontSize: 13, color: TEXT, fontWeight: 600 }}>{asset.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: asset.change >= 0 ? GREEN : RED, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtPct(asset.change)}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 22, color: TEXT, fontWeight: 800, marginBottom: 12, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  ${asset.price.toLocaleString('en-US', { maximumFractionDigits: asset.price > 1000 ? 0 : 2 })}
                </div>
                <Sparkline data={asset.data} color={asset.change >= 0 ? GREEN : RED} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-[1fr_360px] 3xl:grid-cols-[1fr_400px] gap-5">
            <div className="flex flex-col gap-5 h-full">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={barData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="asset" tick={tickStyle} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} width={72} />
                    <Tooltip content={<ChartTooltip accent={BLUE} />} cursor={{ fill: 'rgba(56,189,248,0.035)' }} />
                    <Bar dataKey="cap" name="Capital base" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                      {barData.map(row => <Cell key={row.asset} fill={row.color} />)}
                    </Bar>
                    <Line type="monotone" dataKey="volume" name="24h flow" stroke="#FFFFFF" strokeWidth={1.4} dot={{ r: 2 }} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={btcChart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="market-btc-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="date" tickFormatter={fmtDateForRange('3M')} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis tickFormatter={value => `$${(Number(value) / 1000).toFixed(0)}K`} tick={tickStyle} tickLine={false} axisLine={false} width={62} />
                    <Tooltip content={<ChartTooltip accent="#F59E0B" formatter={fmtMoney} />} cursor={cursorProps} />
                    <Area type="monotone" dataKey="close" name="BTC close" stroke="#F59E0B" fill="url(#market-btc-gradient)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <MetricTile label="Global Market Cap" value={fmtMoney(global?.market_cap_usd)} detail={`24h ${fmtPct(global?.market_cap_change_24h ?? 0)}`} accent={BLUE} />
              <MetricTile label="Global Volume" value={fmtMoney(global?.volume_24h_usd)} detail={`24h ${fmtPct(global?.volume_24h_change_24h ?? 0)}`} accent="#60A5FA" />
              <MetricTile label="BTC Dominance" value={fmtPct(global?.bitcoin_dominance_percentage ?? 0)} detail="Crypto market share" accent="#F59E0B" />
              <MetricTile label="Tracked Assets" value={(global?.cryptocurrencies_number ?? 0).toLocaleString('en-US')} detail={global?.last_updated ? `Updated ${fmtDate(normalizeApiDate(global.last_updated))}` : 'CoinPaprika coverage'} accent="#A78BFA" />
            </div>
          </div>
        </div>
      )}
    </PanelFrame>
  );
}

function buildIndicators(data: Partial<AllData>): IndicatorDefinition[] {
  const summary = data.summary ?? {};
  const external = data.external ?? EMPTY_EXTERNAL_DATA;
  const chainLatest = data.chainLatest ?? [];
  const protocols = data.protocols ?? [];
  const fees = data.fees ?? [];
  const stableSupply = data.stableSupply ?? [];
  const stableTotal = data.stableTotal ?? [];
  const dexVolumes = data.dexVolumes ?? {};
  const yields = data.yields ?? [];
  const btcFunding = [...(data.btcDerivatives ?? [])].reverse().find(row => row.fr !== null)?.fr ?? 0;
  const ethFunding = [...(data.ethDerivatives ?? [])].reverse().find(row => row.fr !== null)?.fr ?? 0;
  const solFunding = [...(data.solDerivatives ?? [])].reverse().find(row => row.fr !== null)?.fr ?? 0;
  const btcOi = [...(data.btcDerivatives ?? [])].reverse().find(row => row.oi !== null)?.oi ?? 0;
  const ethOi = [...(data.ethDerivatives ?? [])].reverse().find(row => row.oi !== null)?.oi ?? 0;
  const solOi = [...(data.solDerivatives ?? [])].reverse().find(row => row.oi !== null)?.oi ?? 0;
  const defiOi = [...(data.defiOpenInterest ?? [])].reverse().find(row => row.oi !== null)?.oi ?? 0;
  const optionsLatest = latest(data.optionsAggregate ?? [])?.volume
    || (data.optionsLatest ?? []).reduce((s, o) => s + (o.volume_usd ?? 0), 0)
    || parseSummaryNumber(summary, 'options_volume_24h')
    || 0;
  const stables = latest(stableTotal)?.total ?? parseSummaryNumber(summary, 'total_stablecoin_supply');
  const tvl = parseSummaryNumber(summary, 'total_defi_tvl') || chainLatest.reduce((sum, row) => sum + row.tvl_usd, 0);
  const global = external.cryptoGlobal;
  const btcQuote = tickerUsd(external.tickers.BTC);
  const ethQuote = tickerUsd(external.tickers.ETH);
  const solQuote = tickerUsd(external.tickers.SOL);
  const usdcQuote = tickerUsd(external.tickers.USDC);
  const usdtQuote = tickerUsd(external.tickers.USDT);
  const btcDominanceRaw = global?.bitcoin_dominance_percentage ?? 0;
  const btcPriceChange24h = (btcQuote.percent_change_24h ?? 0) / 100;
  const globalMcapChange24h = (global?.market_cap_change_24h ?? 0) / 100;
  const projectedDominance = globalMcapChange24h > -1
    ? (btcDominanceRaw * (1 + btcPriceChange24h)) / (1 + globalMcapChange24h)
    : btcDominanceRaw;
  const dominanceTrend = projectedDominance - btcDominanceRaw;
  const dominanceArrow = dominanceTrend > 0.001 ? '▲' : dominanceTrend < -0.001 ? '▼' : '—';
  const latestDex = (chain: string) => latest(dexVolumes[chain] ?? [])?.volume ?? 0;
  const topStable = topBy(stableSupply, row => row.supply_usd, 8);
  const topChains = topBy(chainLatest.filter(row => row.chain !== 'all'), row => row.tvl_usd, 14);
  const topProtocols = topBy(protocols, row => row.tvl_usd, 12);
  const topFees = topBy(fees, row => row.daily_fees_usd, 10);
  const topYields = topBy(yields, row => row.tvl_usd, 10);
  const bestApy = topBy(yields.filter(row => row.tvl_usd >= 10_000_000), row => row.apy, 8);
  const dexNetworks = topBy(external.dexNetworks, row => numberOrZero(row.volume_usd_24h), 12);
  const lending = data.lendingProtocols ?? [];
  const bridges = data.bridges ?? [];
  const totalBorrowed = data.lendingTotalBorrowed ?? 0;

  const bestLargePool = yields.filter(y => (y.tvl_usd ?? 0) >= 1_000_000).sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))[0];
  const st = data.stableTotal ?? [];
  const currentStable = st.length > 0 ? (st[st.length - 1]?.total ?? 0) : 0;
  const stable7dAgo = st.length >= 7 ? (st[st.length - 7]?.total ?? 0) : (st.length > 0 ? (st[0]?.total ?? 0) : 0);
  const stableChange = currentStable - stable7dAgo;

  const btcFrValue = latest(data.btcDerivatives ?? [])?.fr ?? parseSummaryNumber(summary, 'btc_funding_rate') ?? 0;
  const ethFrValue = latest(data.ethDerivatives ?? [])?.fr ?? parseSummaryNumber(summary, 'eth_funding_rate') ?? 0;
  const solFrValue = latest(data.solDerivatives ?? [])?.fr ?? parseSummaryNumber(summary, 'sol_funding_rate') ?? 0;
  const btcOiValue = latest(data.btcDerivatives ?? [])?.oi ?? parseSummaryNumber(summary, 'btc_open_interest') ?? 0;

  // New Combined Indicators Data
  const highestFeeProtocol = fees.sort((a, b) => (b.daily_fees_usd ?? 0) - (a.daily_fees_usd ?? 0))[0];
  const highestRevenueProtocol = fees.sort((a, b) => (b.daily_revenue_usd ?? 0) - (a.daily_revenue_usd ?? 0))[0];
  const top100Yields = [...yields].sort((a, b) => (b.tvl_usd ?? 0) - (a.tvl_usd ?? 0)).slice(0, 100);
  const avgYieldTop100 = top100Yields.length ? top100Yields.reduce((sum, y) => sum + (y.apy ?? 0), 0) / top100Yields.length : 0;
  const topChain = [...chainLatest].filter(c => c.chain !== 'all').sort((a, b) => (b.tvl_usd ?? 0) - (a.tvl_usd ?? 0))[0];
  const topChainDominance = topChain && tvl > 0 ? (topChain.tvl_usd / tvl) * 100 : 0;
  const dailyDexVol = latestDex('all') || parseSummaryNumber(summary, 'total_dex_volume_24h');
  const stableVelocity = stables > 0 ? (dailyDexVol / stables) * 100 : 0;
  const defiCryptoRatio = global?.market_cap_usd ? (tvl / global.market_cap_usd) * 100 : 0;
  const ethBtcRatio = (btcQuote?.price ?? 0) > 0 ? ((ethQuote?.price ?? 0) / (btcQuote?.price ?? 1)) : 0;
  const totalBridges = bridges.reduce((sum, b) => sum + (b.tvl_usd ?? 0), 0);
  const topBridgeShare = totalBridges > 0 && bridges[0] ? (bridges[0].tvl_usd / totalBridges) * 100 : 0;
  const totalDexTxns = (external.dexNetworks ?? []).reduce((sum, n) => sum + (n.txns_24h ?? 0), 0);
  const dexAvgTradeSize = totalDexTxns > 0 ? dailyDexVol / totalDexTxns : 0;
  const topStableCoin = topBy(stableSupply, row => row.supply_usd, 1)[0];
  const stableDominance = stables > 0 && topStableCoin ? (topStableCoin.supply_usd / stables) * 100 : 0;
  const highestApyPool = yields.filter(y => (y.tvl_usd ?? 0) >= 100000).sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))[0];
  const oiToTvlRatio = tvl > 0 ? (defiOi / tvl) * 100 : 0;
  const totalDailyFees = latestValue(data.feeHistory ?? [], 'fees') || parseSummaryNumber(summary, 'protocol_fees_24h');
  const annualizedFeesToTvl = tvl > 0 ? ((totalDailyFees * 365) / tvl) * 100 : 0;
  const btcEthOiRatio = ethOi > 0 ? (btcOi / ethOi) : 0;
  const topDexNetwork = [...(external.dexNetworks ?? [])].sort((a, b) => numberOrZero(b.volume_usd_24h) - numberOrZero(a.volume_usd_24h))[0];
  const yieldPoolsAbove10M = yields.filter(y => (y.tvl_usd ?? 0) > 10_000_000).length;
  const lendingTvl = lending.reduce((s, p) => s + (p.tvl_usd ?? 0), 0);
  const lendingToTvlRatio = tvl > 0 ? (lendingTvl / tvl) * 100 : 0;

  /* Momentum & sentiment composites — derived from price history, positioning and cross-source data */
  const totalCryptoMcap = global?.market_cap_usd ?? parseSummaryNumber(summary, 'total_market_cap');
  const totalCryptoVol = external.cryptoGlobal?.volume_24h_usd ?? parseSummaryNumber(summary, 'total_crypto_volume');
  const btcDomNow = global?.bitcoin_dominance_percentage ?? parseSummaryNumber(summary, 'btc_dominance');
  const closesOf = (rows: BtcPricePoint[] | undefined) => (rows ?? []).map(row => row.close).filter(close => Number.isFinite(close) && close > 0);
  const return30d = (rows: BtcPricePoint[] | undefined): number | null => {
    const closes = closesOf(rows);
    if (closes.length < 31) return null;
    const past = closes[closes.length - 31];
    return past > 0 ? ((closes[closes.length - 1] / past) - 1) * 100 : null;
  };
  const windowAvg = (values: number[], size: number) => {
    const slice = values.slice(-size);
    return slice.length > 0 ? slice.reduce((sum, v) => sum + v, 0) / slice.length : 0;
  };
  const btcCloses = closesOf(data.btcPrices);
  const btcMa50 = windowAvg(btcCloses, 50);
  const btcMa200 = windowAvg(btcCloses, 200);
  const btc30d = return30d(data.btcPrices);
  const eth30d = return30d(data.ethPrices);
  const sol30d = return30d(data.solPrices);
  const dailyRevenueNow = latest(data.feeHistory ?? [])?.revenue ?? parseSummaryNumber(summary, 'protocol_revenue_24h');
  const avgFunding3 = (btcFrValue + ethFrValue + solFrValue) / 3;
  const btcLsRatio = latest(data.btcDerivatives ?? [])?.ls ?? 0;
  const majorsUpCount = [btcQuote, ethQuote, solQuote].filter(q => (q.percent_change_24h ?? 0) > 0).length;
  const ethDomNow = external.tickers.ETH && totalCryptoMcap > 0 ? ((ethQuote.market_cap ?? 0) / totalCryptoMcap) * 100 : parseSummaryNumber(summary, 'eth_dominance');
  const altSharePct = Math.max(0, 100 - btcDomNow - ethDomNow);
  const yieldTvlSum = yields.reduce((sum, y) => sum + (y.tvl_usd ?? 0), 0);
  const weightedApyAvg = yieldTvlSum > 0 ? yields.reduce((sum, y) => sum + (y.apy ?? 0) * (y.tvl_usd ?? 0), 0) / yieldTvlSum : 0;

  const items: IndicatorDefinition[] = [
    { id: 'total-defi-tvl', name: 'Total DeFi TVL', category: 'Liquidity', value: fmtMoney(tvl), detail: 'Global capital locked across tracked protocols', source: 'DeFiLlama', accent: '#7DD3FC', panel: 'chain-tvl', priority: 1 },
    { id: 'stablecoin-float', name: 'Stablecoin Float', category: 'Stablecoins', value: fmtMoney(stables), detail: `${pctRatio(stables, tvl)} of DeFi TVL`, source: 'DeFiLlama', accent: GREEN, panel: 'stablecoin-float', priority: 2 },
    { id: 'stable-7d-change', name: 'Stablecoin 7d Change', category: 'Stablecoins', value: (stableChange >= 0 ? '▲ +' : '▼ -') + fmtMoney(Math.abs(stableChange)), detail: '7d supply change', source: 'DeFiLlama', accent: GREEN, panel: 'stablecoin-float' },
    { id: 'dex-spot-flow', name: 'DEX Spot Flow', category: 'DEX', value: fmtMoney(latestDex('all') || parseSummaryNumber(summary, 'total_dex_volume_24h')), detail: 'Latest daily on-chain spot volume', source: 'DeFiLlama', accent: GREEN, panel: 'dex-volume', priority: 3 },
    { id: 'protocol-fees', name: 'Protocol Fees', category: 'Protocols', value: fmtMoney(latestValue(data.feeHistory ?? [], 'fees') || parseSummaryNumber(summary, 'protocol_fees_24h')), detail: 'Daily user demand paid to protocols', source: 'DeFiLlama', accent: AMBER, panel: 'protocol-revenue', priority: 4 },
    { id: 'defi-open-interest', name: 'DeFi Open Interest', category: 'Derivatives', value: fmtMoney(defiOi), detail: 'Perpetual risk parked in DeFi venues', source: 'DeFiLlama', accent: '#F97316', panel: 'derivatives-risk', priority: 5 },
    { id: 'options-flow', name: 'Options Flow', category: 'Derivatives', value: fmtMoney(optionsLatest), detail: 'DeFi options volume where available', source: 'DeFiLlama', accent: '#EC4899', panel: 'options-flow' },
    { id: 'yield-leader', name: 'Yield Capital Leader', category: 'Yield', value: topYields[0]?.symbol ?? 'Loading', detail: `${topYields[0]?.protocol ?? 'Pool'} at ${fmtMoney(topYields[0]?.tvl_usd)}`, source: 'Yields Llama', accent: '#14B8A6', panel: 'yield-market' },
    { id: 'best-large-pool-apy', name: 'Best Large Pool APY', category: 'Yield', value: (bestLargePool?.apy ?? 0).toFixed(2) + '%', detail: bestLargePool ? `${bestLargePool.protocol} - ${bestLargePool.symbol}` : '—', source: 'Yields Llama', accent: '#14B8A6', panel: 'yield-market' },
    { id: 'total-yield-tvl', name: 'Total Yield TVL', category: 'Yield', value: fmtMoney(yields.reduce((sum, y) => sum + (y.tvl_usd ?? 0), 0)), detail: yields.length + ' pools tracked', source: 'Yields Llama', accent: '#14B8A6', panel: 'yield-market' },
    { id: 'market-structure', name: 'Market Structure', category: 'Market', value: fmtMoney(global?.market_cap_usd), detail: 'Global prices, volume & dominance', source: 'CoinPaprika', accent: BLUE, panel: 'market-structure' },
    { id: 'dex-network-txns', name: 'DEX Network Transactions', category: 'DEX', value: (() => { const txns = (external.dexNetworks ?? []).reduce((sum, n) => sum + (n.txns_24h ?? 0), 0); return txns > 1000000 ? (txns / 1000000).toFixed(1) + 'M' : txns > 1000 ? (txns / 1000).toFixed(0) + 'K' : txns.toString(); })(), detail: '24h DEX transactions across all networks', source: 'DexPaprika', accent: GREEN, panel: 'dex-pools' },
    { id: 'dex-network-volume', name: 'DEX Network Volume', category: 'DEX', value: fmtMoney(external.dexNetworks.reduce((sum, row) => sum + numberOrZero(row.volume_usd_24h), 0)), detail: 'DexPaprika indexed 24h network flow', source: 'DexPaprika', accent: GREEN, panel: 'dex-pools' },
    { id: 'lending-total', name: 'Lending Total Supplied', category: 'Lending', value: fmtMoney(lending.reduce((s, p) => s + (p.tvl_usd ?? 0), 0)), detail: 'Top lending protocols combined TVL', source: 'DeFiLlama', accent: AMBER, panel: 'lending' },
    { id: 'top-lending-protocol', name: 'Top Lending Protocol', category: 'Lending', value: fmtMoney(lending[0]?.tvl_usd ?? 0), detail: lending[0]?.protocol ?? summary.top_lending_protocol ?? '—', source: 'DeFiLlama', accent: AMBER, panel: 'lending' },
    { id: 'bridge-tvl', name: 'Bridge TVL Total', category: 'Bridges', value: fmtMoney(bridges.reduce((sum, b) => sum + (b.tvl_usd ?? 0), 0) || parseSummaryNumber(summary, 'total_bridge_tvl')), detail: bridges[0]?.protocol ? 'Top: ' + bridges[0].protocol : summary.top_bridge ?? '—', source: 'DeFiLlama', accent: '#A78BFA', panel: 'bridges' },
    { id: 'top-bridge', name: 'Top Bridge', category: 'Bridges', value: fmtMoney(bridges[0]?.tvl_usd ?? 0), detail: bridges[0]?.protocol ?? summary.top_bridge ?? '—', source: 'DeFiLlama', accent: '#A78BFA', panel: 'bridges' },
    { id: 'liquidations-total-oi', name: 'Aggregate Futures OI (Liquidation Context)', category: 'Liquidations', value: fmtMoney(btcOi + ethOi + solOi), detail: 'BTC + ETH + SOL open interest', source: 'Binance', accent: '#F97316', panel: 'liquidations' },
    { id: 'btc-funding', name: 'BTC Funding Rate', category: 'Derivatives', value: (btcFrValue >= 0 ? '+' : '') + (btcFrValue * 100).toFixed(4) + '%', detail: btcFrValue >= 0 ? 'Longs paying shorts' : 'Shorts paying longs', source: 'DeFiLlama', accent: '#F97316', panel: 'derivatives-risk' },
    { id: 'eth-funding', name: 'ETH Funding Rate', category: 'Derivatives', value: (ethFrValue >= 0 ? '+' : '') + (ethFrValue * 100).toFixed(4) + '%', detail: ethFrValue >= 0 ? 'Longs paying shorts' : 'Shorts paying longs', source: 'DeFiLlama', accent: '#F97316', panel: 'derivatives-risk' },
    { id: 'sol-funding', name: 'SOL Funding Rate', category: 'Derivatives', value: (solFrValue >= 0 ? '+' : '') + (solFrValue * 100).toFixed(4) + '%', detail: solFrValue >= 0 ? 'Longs paying shorts' : 'Shorts paying longs', source: 'DeFiLlama', accent: '#F97316', panel: 'derivatives-risk' },
    { id: 'btc-oi', name: 'BTC Open Interest', category: 'Derivatives', value: fmtMoney(btcOiValue), detail: 'BTC perpetual open interest', source: 'DeFiLlama', accent: '#F97316', panel: 'derivatives-risk' },
    { id: 'dex-pool-count', name: 'DEX Pool Coverage', category: 'Coverage', value: (external.dexStats?.pools ?? 0).toLocaleString(), detail: 'active DEX pools tracked', source: 'DexPaprika', accent: GREEN, panel: 'dex-pools' },
    { id: 'protocol-count', name: 'Tracked Protocols', category: 'Coverage', value: protocols.length.toString(), detail: 'DeFi protocols tracked', source: 'DeFiLlama', accent: AMBER, panel: 'protocol-board' },
    { id: 'protocol-revenue', name: 'Protocol Revenue', category: 'Protocols', value: fmtMoney(latest(data.feeHistory ?? [])?.revenue ?? parseSummaryNumber(summary, 'protocol_revenue_24h')), detail: '24h revenue across all protocols', source: 'DeFiLlama', accent: AMBER, panel: 'protocol-revenue' },
    { id: 'top-protocol-tvl', name: 'Top Protocol by TVL', category: 'Protocols', value: fmtMoney(protocols[0]?.tvl_usd ?? 0), detail: protocols[0]?.protocol ?? summary.top_protocol_by_tvl ?? '—', source: 'DeFiLlama', accent: AMBER, panel: 'protocol-board' },
    { id: 'top-defi-category', name: 'Top DeFi Category', category: 'Concentration', value: (() => { const counts = new Map<string, number>(); for (const p of protocols) { const c = p.category || 'Unknown'; counts.set(c, (counts.get(c) ?? 0) + 1); } let best = '—', bestN = 0; for (const [c, n] of counts) if (n > bestN) { best = c; bestN = n; } return best; })(), detail: 'Largest protocol cluster by category', source: 'DeFiLlama', accent: '#7DD3FC', panel: 'category-history' },
    { id: 'protocol-concentration', name: 'Top Protocol TVL Share', category: 'Concentration', value: (() => { const total = protocols.reduce((s, p) => s + (p.tvl_usd ?? 0), 0); return total > 0 ? ((protocols[0]?.tvl_usd ?? 0) / total * 100).toFixed(1) + '%' : '—'; })(), detail: protocols[0]?.protocol ? `Leader: ${protocols[0].protocol}` : 'Capital concentration gauge', source: 'Composite', accent: '#A78BFA', panel: 'concentration' },
    { id: 'dex-venue-leader', name: 'DEX Venue Leaderboard', category: 'DEX', value: 'Leaderboard', detail: 'Per-protocol DEX volume by 24h / 30d / 1y', source: 'DeFiLlama', accent: GREEN, panel: 'dex-protocols' },
    { id: 'stable-velocity', name: 'Stablecoin Velocity', category: 'Stablecoins', value: stableVelocity.toFixed(2) + '%', detail: 'Daily DEX Vol / Stable Supply', source: 'Combined', accent: GREEN, panel: 'stablecoin-float' },
    { id: 'defi-to-crypto-cap', name: 'DeFi / Crypto Ratio', category: 'Market', value: defiCryptoRatio.toFixed(2) + '%', detail: 'DeFi TVL vs Total Crypto Cap', source: 'Combined', accent: BLUE, panel: 'market-structure' },
    { id: 'eth-btc-price-ratio', name: 'ETH/BTC Ratio', category: 'Market', value: ethBtcRatio.toFixed(4), detail: 'Relative pricing strength', source: 'CoinPaprika', accent: '#A78BFA', panel: 'market-structure' },
    { id: 'top-bridge-share', name: 'Top Bridge Dominance', category: 'Bridges', value: topBridgeShare.toFixed(1) + '%', detail: bridges[0]?.protocol ?? '—', source: 'DeFiLlama', accent: '#A78BFA', panel: 'bridges' },
    { id: 'dex-avg-trade-size', name: 'Avg DEX Trade Size', category: 'DEX', value: fmtMoney(dexAvgTradeSize), detail: 'Vol per Txn across top networks', source: 'DexPaprika', accent: GREEN, panel: 'dex-pools' },
    { id: 'stablecoin-top-dominance', name: 'Stablecoin Dominance', category: 'Stablecoins', value: stableDominance.toFixed(1) + '%', detail: topStableCoin?.symbol ?? '—', source: 'DeFiLlama', accent: GREEN, panel: 'stablecoin-float' },
    { id: 'highest-apy-pool-100k', name: 'Highest APY (>$100k)', category: 'Yield', value: (highestApyPool?.apy ?? 0).toFixed(0) + '%', detail: highestApyPool ? `${highestApyPool.protocol} ${highestApyPool.symbol}` : '—', source: 'Yields Llama', accent: '#14B8A6', panel: 'yield-market' },
    { id: 'oi-to-tvl-ratio', name: 'Derivs OI to TVL', category: 'Derivatives', value: oiToTvlRatio.toFixed(2) + '%', detail: 'Leverage relative to spot TVL', source: 'Combined', accent: '#F97316', panel: 'derivatives-risk' },
    { id: 'fee-yield-to-tvl', name: 'Annualized Protocol APY', category: 'Protocols', value: annualizedFeesToTvl.toFixed(2) + '%', detail: 'Annual fees / Global TVL', source: 'Combined', accent: AMBER, panel: 'protocol-revenue' },
    { id: 'btc-eth-oi-ratio', name: 'BTC/ETH OI Ratio', category: 'Derivatives', value: btcEthOiRatio.toFixed(2) + 'x', detail: 'Relative open interest sizes', source: 'Binance', accent: '#F97316', panel: 'liquidations' },
    { id: 'top-dex-network-name', name: 'Top DEX Network', category: 'DEX', value: topDexNetwork?.name ?? '—', detail: fmtMoney(numberOrZero(topDexNetwork?.volume_usd_24h)) + ' 24h Vol', source: 'DexPaprika', accent: GREEN, panel: 'dex-pools' },
    { id: 'yield-pools-over-10m', name: 'Mega Pools (>$10M)', category: 'Yield', value: yieldPoolsAbove10M.toString(), detail: 'Yield pools with deep liquidity', source: 'Yields Llama', accent: '#14B8A6', panel: 'yield-market' },
    { id: 'lending-tvl-ratio', name: 'Lending / Global TVL', category: 'Lending', value: lendingToTvlRatio.toFixed(1) + '%', detail: 'Share of TVL in lending', source: 'DeFiLlama', accent: AMBER, panel: 'lending' },
    { id: 'btc-30d-momentum', name: 'BTC 30d Momentum', category: 'Momentum', value: btc30d === null ? '—' : fmtPct(btc30d), detail: '30-day price return', source: 'CoinGecko', accent: '#EAB308', panel: 'btc-anchor' },
    { id: 'eth-30d-momentum', name: 'ETH 30d Momentum', category: 'Momentum', value: eth30d === null ? '—' : fmtPct(eth30d), detail: '30-day price return', source: 'CoinGecko', accent: '#A78BFA', panel: 'market-structure' },
    { id: 'sol-30d-momentum', name: 'SOL 30d Momentum', category: 'Momentum', value: sol30d === null ? '—' : fmtPct(sol30d), detail: '30-day price return', source: 'CoinGecko', accent: '#9945FF', panel: 'market-structure' },
    { id: 'btc-ma-cross', name: 'BTC Trend Signal', category: 'Momentum', value: btcCloses.length >= 200 ? (btcMa50 >= btcMa200 ? 'Bullish' : 'Bearish') : '—', detail: btcCloses.length >= 200 ? `50d MA ${fmtMoney(btcMa50)} vs 200d MA ${fmtMoney(btcMa200)}` : 'Insufficient price history', source: 'CoinGecko', accent: btcCloses.length >= 200 ? (btcMa50 >= btcMa200 ? GREEN : RED) : MUTED, panel: 'btc-anchor' },
    { id: 'cross-asset-funding', name: 'Cross-Asset Funding', category: 'Sentiment', value: (avgFunding3 >= 0 ? '+' : '') + (avgFunding3 * 100).toFixed(4) + '%', detail: 'Mean BTC/ETH/SOL perp funding — positioning bias', source: 'Binance', accent: '#FB7185', panel: 'derivatives-risk' },
    { id: 'btc-long-short', name: 'BTC Long/Short Ratio', category: 'Sentiment', value: btcLsRatio > 0 ? btcLsRatio.toFixed(2) : '—', detail: btcLsRatio > 0 ? (btcLsRatio >= 1 ? 'Accounts skew net long' : 'Accounts skew net short') : 'No positioning data', source: 'Binance', accent: btcLsRatio > 0 ? (btcLsRatio >= 1 ? GREEN : RED) : MUTED, panel: 'liquidations' },
    { id: 'majors-breadth', name: 'Majors 24h Breadth', category: 'Sentiment', value: `${majorsUpCount}/3`, detail: 'BTC · ETH · SOL trading green over 24h', source: 'CoinPaprika', accent: majorsUpCount >= 2 ? GREEN : RED, panel: 'market-structure' },
    { id: 'alt-market-share', name: 'Alt Market Share', category: 'Sentiment', value: altSharePct.toFixed(1) + '%', detail: 'Market cap outside BTC & ETH — altseason gauge', source: 'Composite', accent: '#14B8A6', panel: 'market-structure' },
    { id: 'stable-mcap-share', name: 'Stablecoin Share of Market', category: 'Ratios', value: totalCryptoMcap > 0 ? ((stables / totalCryptoMcap) * 100).toFixed(1) + '%' : '—', detail: 'Dry powder vs total market size', source: 'Composite', accent: GREEN, panel: 'stablecoin-float' },
    { id: 'market-turnover', name: 'Market Turnover', category: 'Ratios', value: totalCryptoMcap > 0 ? ((totalCryptoVol / totalCryptoMcap) * 100).toFixed(1) + '%' : '—', detail: '24h volume vs market cap — trading intensity', source: 'Composite', accent: BLUE, panel: 'market-structure' },
    { id: 'revenue-take-rate', name: 'Revenue Take Rate', category: 'Efficiency', value: dailyRevenueNow > 0 && totalDailyFees > 0 ? ((dailyRevenueNow / totalDailyFees) * 100).toFixed(1) + '%' : '—', detail: 'Share of user fees kept as revenue', source: 'Composite', accent: '#34D399', panel: 'protocol-revenue' },
    { id: 'tvl-weighted-apy', name: 'TVL-Weighted Avg APY', category: 'Efficiency', value: weightedApyAvg > 0 ? weightedApyAvg.toFixed(2) + '%' : '—', detail: `${yields.length} pools weighted by capital`, source: 'Composite', accent: '#14B8A6', panel: 'yield-market' },
    { id: 'top-chain-share', name: 'Top Chain TVL Share', category: 'Concentration', value: topChainDominance > 0 ? topChainDominance.toFixed(1) + '%' : '—', detail: `${topChain?.chain ?? summary.top_chain_by_tvl ?? '—'} share of DeFi TVL`, source: 'Composite', accent: '#7DD3FC', panel: 'chain-tvl' },
    { id: 'fee-leader', name: 'Top Protocol by Fees', category: 'Leaderboard', value: highestFeeProtocol?.protocol ?? '—', detail: `${fmtMoney(highestFeeProtocol?.daily_fees_usd ?? 0)} daily fees`, source: 'DeFiLlama', accent: AMBER, panel: 'protocol-revenue' },
    { id: 'revenue-leader', name: 'Top Protocol by Revenue', category: 'Leaderboard', value: highestRevenueProtocol?.protocol ?? '—', detail: `${fmtMoney(highestRevenueProtocol?.daily_revenue_usd ?? 0)} daily revenue`, source: 'DeFiLlama', accent: AMBER, panel: 'protocol-revenue' }
  ];


  return items.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
}

function FocusedSignal({ indicator }: { indicator: IndicatorDefinition | null }) {
  if (!indicator) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="grid grid-cols-1 md:grid-cols-[1fr_170px_160px] 3xl:grid-cols-[1fr_200px_190px] gap-3 items-center px-4 py-3"
      style={{
        border: `1px solid ${indicator.accent}44`,
        background: `linear-gradient(90deg, ${indicator.accent}12, rgba(255,255,255,0.018))`,
        boxShadow: `inset 3px 0 0 ${indicator.accent}`,
      }}
    >
      <div className="min-w-0">
        <div style={{ fontFamily: MONO, fontSize: 10, color: indicator.accent, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
          Focused Signal
        </div>
        <div className="truncate mt-1" style={{ fontFamily: SANS, color: TEXT, fontSize: 15, fontWeight: 600, letterSpacing: '0.01em' }}>
          {indicator.name}
        </div>
      </div>
      <div style={{ fontFamily: MONO, color: TEXT, fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{indicator.value}</div>
      <div className="truncate" style={{ fontFamily: SANS, color: MUTED, fontSize: 13, lineHeight: 1.45 }}>{indicator.detail}</div>
    </motion.div>
  );
}

function DexPaprikaPanel({ external, loading }: { external: ExternalData; loading: boolean }) {
  const topNetworks = useMemo(() => topBy(external.dexNetworks, row => numberOrZero(row.volume_usd_24h), 10), [external.dexNetworks]);
  const topPools = useMemo(() => topBy(external.dexPools, row => numberOrZero(row.volume_usd), 12), [external.dexPools]);
  const scatter = useMemo(() => topPools.map(pool => ({
    name: pool.tokens?.map(token => token.symbol).filter(Boolean).slice(0, 2).join('/') || pool.dex_name,
    chain: pool.chain,
    volume: pool.volume_usd,
    txns: pool.transactions,
    change: pool.last_price_change_usd_24h ?? 0,
  })), [topPools]);

  return (
    <PanelFrame
      id="module-dex-pools"
      eyebrow="Pool tape"
      title="DexPaprika Liquidity Surface"
      note="Real-time network and pool coverage adds fresh DEX microstructure to the DeFiLlama macro view."
      accent="#5EEAD4"
    >
      {loading ? (
        <Skeleton height={360} />
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-[1fr_360px] 3xl:grid-cols-[1fr_400px] gap-5">
          <div className="flex flex-col gap-5 h-full">
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topNetworks} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="name" tick={tickStyle} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={52} />
                  <YAxis tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} width={70} />
                  <Tooltip content={<ChartTooltip accent="#5EEAD4" formatter={fmtMoney} />} cursor={{ fill: 'rgba(94,234,212,0.035)' }} />
                  <Bar dataKey="volume_usd_24h" name="24h volume" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                    {topNetworks.map(row => (
                      <Cell key={row.id} fill={DEX_COLORS[row.id] || '#5EEAD4'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {topPools.length > 0 && (
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="volume" type="number" name="Volume" tickFormatter={fmtMoney} tick={tickStyle} tickLine={false} axisLine={false} />
                    <YAxis dataKey="txns" type="number" name="Transactions" tickFormatter={value => Number(value).toLocaleString('en-US')} tick={tickStyle} tickLine={false} axisLine={false} width={74} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const point = payload[0].payload as { name: string; chain: string; volume: number; txns: number; change: number };
                        return (
                          <div style={{ minWidth: 190, padding: 13, border: '1px solid rgba(94,234,212,0.45)', borderTop: '2px solid #5EEAD4', background: 'rgba(8,10,16,0.98)', fontFamily: MONO }}>
                            <div style={{ color: '#5EEAD4', fontSize: 12, fontWeight: 800 }}>{point.name}</div>
                            <div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>{titleCase(point.chain)} · {fmtMoney(point.volume)}</div>
                            <div style={{ color: MUTED, fontSize: 11 }}>{point.txns.toLocaleString('en-US')} transactions · {fmtPct(point.change)}</div>
                          </div>
                        );
                      }}
                      cursor={{ stroke: 'rgba(94,234,212,0.45)', strokeDasharray: '3 5' }}
                    />
                    <Scatter data={scatter} name="Pools" fill="#5EEAD4" isAnimationActive={false} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div style={{ fontFamily: MONO, color: 'rgba(255,255,255,0.40)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>Top pools</div>
            {topPools.length > 0 ? topPools.slice(0, 10).map(pool => {
              const pair = pool.tokens?.map(token => token.symbol).filter(Boolean).slice(0, 2).join('/') || pool.dex_name;
              return (
                <div key={`${pool.chain}-${pool.id}`} className="grid grid-cols-[1fr_92px] gap-3 py-2 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.055)' }}>
                  <div className="min-w-0">
                    <div className="truncate" style={{ fontFamily: SANS, color: TEXT, fontSize: 13, fontWeight: 600 }}>{pair}</div>
                    <div className="truncate" style={{ fontFamily: SANS, color: MUTED, fontSize: 11 }}>{pool.dex_name} · {titleCase(pool.chain)}</div>
                  </div>
                  <div className="text-right">
                    <div style={{ fontFamily: MONO, color: TEXT, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(pool.volume_usd)}</div>
                    <div style={{ fontFamily: MONO, color: MUTED, fontSize: 11 }}>{pool.transactions.toLocaleString('en-US')} tx</div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ fontFamily: SANS, color: MUTED, fontSize: 12, padding: '12px 0', lineHeight: 1.5 }}>Pool-level data not available via backend.</div>
            )}
          </div>
        </div>
      )}
    </PanelFrame>
  );
}

export default function MetrilyticsPage({ onPrimaryDataReady }: MetrilyticsBodyProps) {
  useTerminalModulePrefetch('metrilytics');

  const [data, setData] = useState<Partial<AllData>>({});
  const [loading, setLoading] = useState(true);
  const [externalLoading, setExternalLoading] = useState(true);
  const [, setLastSync] = useState<string | null>(null);
  const [activePanels, setActivePanels] = useState<PanelId[]>(DEFAULT_PANELS);
  const [focusedIndicator, setFocusedIndicator] = useState<IndicatorDefinition | null>(null);
  const [registrySearch, setRegistrySearch] = useState('');
  const [openAccordion, setOpenAccordion] = useState<string | null>('liquidity');
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);

  const hydrateExternal = useCallback(async () => {
    setExternalLoading(true);
    try {
      type ApiResult = Record<string, unknown>;
      const [marketRes, dexNetworksRes] = await Promise.allSettled([
        fetchCached(API_URLS.market).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.dexNetworks).then(response => response.json() as Promise<ApiResult>),
      ]);
      const marketPayload = marketRes.status === 'fulfilled' ? marketRes.value : {};
      const dexNetworksPayload = dexNetworksRes.status === 'fulfilled' ? dexNetworksRes.value : {};
      const marketPrices = (marketPayload.prices as Record<string, { price: number; change_24h: number | null; market_cap: number | null; volume_24h: number | null }> | undefined) ?? {};
      const mkt = (marketPayload.market as Record<string, number | null> | undefined) ?? {};
      const toTicker = (p: typeof marketPrices[string] | undefined): CoinPaprikaTicker | undefined => {
        if (!p) return undefined;
        return {
          id: '', name: '', symbol: '',
          quotes: { USD: { price: p.price, percent_change_24h: p.change_24h ?? undefined, market_cap: p.market_cap ?? undefined, volume_24h: p.volume_24h ?? undefined } },
        };
      };
      const external: ExternalData = {
        dexNetworks: mapDexNetworks(dexNetworksPayload.networks as Array<{ network_id: string; name: string; volume_usd_24h: number; txns_24h: number; pools_count: number; tokens_count: number }> | undefined),
        dexPools: [],
        dexStats: (dexNetworksPayload.stats as DexPaprikaStats | undefined) ?? { networks: 0, dexes: 0, pools: 0, tokens: 0 },
        cryptoGlobal: {
          market_cap_usd: mkt.total_market_cap_usd ?? undefined,
          volume_24h_usd: mkt.total_volume_24h_usd ?? undefined,
          bitcoin_dominance_percentage: mkt.btc_dominance ?? undefined,
          market_cap_change_24h: mkt.market_cap_change_24h ?? undefined,
          volume_24h_change_24h: mkt.volume_change_24h ?? undefined,
          cryptocurrencies_number: mkt.active_cryptocurrencies ?? undefined,
          last_updated: undefined,
        },
        tickers: {
          BTC: toTicker(marketPrices.BTC),
          ETH: toTicker(marketPrices.ETH),
          SOL: toTicker(marketPrices.SOL),
          USDC: toTicker(marketPrices.USDC),
          USDT: toTicker(marketPrices.USDT),
        },
        sourceStatus: {},
      };
      setData(prev => {
        const merged = { ...prev, external };
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: merged, ts: Date.now() })); } catch {}
        return merged;
      });
    } finally {
      setExternalLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data: cachedData, ts } = JSON.parse(cached) as { data: Partial<AllData>; ts: number };
        if (Date.now() - ts < CACHE_TTL) {
          setData({ ...cachedData, external: cachedData.external ?? EMPTY_EXTERNAL_DATA });
          setLastSync(cachedData.summary?.last_updated ?? null);
          setLoading(false);
          if (cachedData.external?.dexNetworks?.length) setExternalLoading(false);
          else void hydrateExternal();
          return;
        }
      }
    } catch {}

    setLoading(true);
    try {
      type ApiResult = Record<string, unknown>;
      const valueOf = (result: PromiseSettledResult<ApiResult>): ApiResult => result.status === 'fulfilled' ? result.value : {};

      const [
        summaryRes,
        chainsRes,
        protocolsRes,
        feesRes,
        stablecoinsRes,
        dexRes,
        btcDerivativesRes,
        ethDerivativesRes,
        solDerivativesRes,
        defiOpenInterestRes,
        yieldsRes,
        optionsRes,
        pricesRes,
        lendingRes,
        bridgesRes,
        marketRes,
        dexNetworksRes,
        ethPricesRes,
        solPricesRes,
      ] = await Promise.allSettled([
        fetchCached(API_URLS.summary).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.chains).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.protocols).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.fees).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.stablecoins).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.dex).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.btcDerivatives).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.ethDerivatives).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.solDerivatives).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.defiOpenInterest).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.yields).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.options).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.prices).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.lending).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.bridges).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.market).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.dexNetworks).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.ethPrices).then(response => response.json() as Promise<ApiResult>),
        fetchCached(API_URLS.solPrices).then(response => response.json() as Promise<ApiResult>),
      ]);

      const summaryPayload = valueOf(summaryRes);
      const chainsPayload = valueOf(chainsRes);
      const protocolsPayload = valueOf(protocolsRes);
      const feesPayload = valueOf(feesRes);
      const stablecoinsPayload = valueOf(stablecoinsRes);
      const dexPayload = valueOf(dexRes);
      const btcDerivativesPayload = valueOf(btcDerivativesRes);
      const ethDerivativesPayload = valueOf(ethDerivativesRes);
      const solDerivativesPayload = valueOf(solDerivativesRes);
      const defiOpenInterestPayload = valueOf(defiOpenInterestRes);
      const yieldsPayload = valueOf(yieldsRes);
      const optionsPayload = valueOf(optionsRes);
      const pricesPayload = valueOf(pricesRes);
      const lendingPayload = valueOf(lendingRes);
      const bridgesPayload = valueOf(bridgesRes);
      const marketPayload = valueOf(marketRes);
      const dexNetworksPayload = valueOf(dexNetworksRes);
      const ethPricesPayload = valueOf(ethPricesRes);
      const solPricesPayload = valueOf(solPricesRes);

      const marketPrices = (marketPayload.prices as Record<string, { price: number; change_24h: number | null; market_cap: number | null; volume_24h: number | null }> | undefined) ?? {};
      const mkt = (marketPayload.market as Record<string, number | null> | undefined) ?? {};
      const toTicker = (p: typeof marketPrices[string] | undefined): CoinPaprikaTicker | undefined => {
        if (!p) return undefined;
        return {
          id: '', name: '', symbol: '',
          quotes: { USD: { price: p.price, percent_change_24h: p.change_24h ?? undefined, market_cap: p.market_cap ?? undefined, volume_24h: p.volume_24h ?? undefined } },
        };
      };

      const nextData: Partial<AllData> = {
        summary: (summaryPayload.summary as Summary | undefined) ?? {},
        chainTvl: (chainsPayload.tvl as Record<string, ChainTvlPoint[]> | undefined) ?? {},
        chainLatest: (chainsPayload.latest as { chain: string; tvl_usd: number }[] | undefined) ?? [],
        protocols: (protocolsPayload.protocols as ProtocolRow[] | undefined) ?? [],
        fees: (feesPayload.protocols as FeeRow[] | undefined) ?? [],
        feeHistory: (feesPayload.history as FeeHistoryPoint[] | undefined) ?? [],
        stableSupply: (stablecoinsPayload.supply as StableRow[] | undefined) ?? [],
        stableTotal: (stablecoinsPayload.total as TotalStablePoint[] | undefined) ?? [],
        stableBySymbol: (stablecoinsPayload.bySymbol as Record<string, StableHistoryPoint[]> | undefined) ?? {},
        dexVolumes: (dexPayload.volumes as Record<string, DexPoint[]> | undefined) ?? {},
        btcDerivatives: (btcDerivativesPayload.data as DerivPoint[] | undefined) ?? [],
        ethDerivatives: (ethDerivativesPayload.data as DerivPoint[] | undefined) ?? [],
        solDerivatives: (solDerivativesPayload.data as DerivPoint[] | undefined) ?? [],
        defiOpenInterest: (defiOpenInterestPayload.data as DerivPoint[] | undefined) ?? [],
        yields: (yieldsPayload.yields as YieldRow[] | undefined) ?? [],
        optionsAggregate: (optionsPayload.aggregate as OptionsPoint[] | undefined) ?? [],
        optionsByChain: (optionsPayload.byChain as Record<string, OptionsPoint[]> | undefined) ?? {},
        optionsLatest: (optionsPayload.latestByChain as { chain: string; volume_usd: number }[] | undefined) ?? [],
        btcPrices: (pricesPayload.data as BtcPricePoint[] | undefined) ?? [],
        ethPrices: (ethPricesPayload.data as BtcPricePoint[] | undefined) ?? [],
        solPrices: (solPricesPayload.data as BtcPricePoint[] | undefined) ?? [],
        lendingProtocols: (lendingPayload.protocols as ProtocolRow[] | undefined) ?? [],
        lendingTotalBorrowed: (lendingPayload.totalBorrowed as number | undefined) ?? 0,
        bridges: (bridgesPayload.protocols as ProtocolRow[] | undefined) ?? [],
        external: {
          dexNetworks: mapDexNetworks(dexNetworksPayload.networks as Array<{ network_id: string; name: string; volume_usd_24h: number; txns_24h: number; pools_count: number; tokens_count: number }> | undefined),
          dexPools: [],
          dexStats: (dexNetworksPayload.stats as DexPaprikaStats | undefined) ?? { networks: 0, dexes: 0, pools: 0, tokens: 0 },
          cryptoGlobal: {
            market_cap_usd: mkt.total_market_cap_usd ?? undefined,
            volume_24h_usd: mkt.total_volume_24h_usd ?? undefined,
            bitcoin_dominance_percentage: mkt.btc_dominance ?? undefined,
            market_cap_change_24h: mkt.market_cap_change_24h ?? undefined,
            volume_24h_change_24h: mkt.volume_change_24h ?? undefined,
            cryptocurrencies_number: mkt.active_cryptocurrencies ?? undefined,
            last_updated: undefined,
          },
          tickers: {
            BTC: toTicker(marketPrices.BTC),
            ETH: toTicker(marketPrices.ETH),
            SOL: toTicker(marketPrices.SOL),
            USDC: toTicker(marketPrices.USDC),
            USDT: toTicker(marketPrices.USDT),
          },
          sourceStatus: {},
        },
      };

      const hydratedData = await applyHistoricalFallbacks(nextData);
      setData(hydratedData);
      setLastSync(hydratedData.summary?.last_updated ?? null);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: hydratedData, ts: Date.now() })); } catch {}
      void hydrateExternal();
    } finally {
      setLoading(false);
    }
  }, [hydrateExternal]);

  useEffect(() => { queueMicrotask(() => { void fetchAll(); }); }, [fetchAll]);

  useEffect(() => {
    if (!loading) onPrimaryDataReady?.();
  }, [loading, onPrimaryDataReady]);

  const indicators = useMemo(() => buildIndicators(data), [data]);

  const registryCats = useMemo(() => {
    const categories: IndicatorCategory[] = ['Liquidity', 'Protocols', 'DEX', 'Stablecoins', 'Derivatives', 'Yield', 'Market', 'Coverage', 'Bridges', 'Lending', 'Liquidations', 'Ratios', 'Momentum', 'Sentiment', 'Efficiency', 'Concentration', 'Leaderboard', 'Staking', 'RWA', 'Chain Activity'];
    return categories
      .map((cat) => {
        const catItems = indicators.filter((item) => item.category === cat);
        if (catItems.length === 0) return null;
        return {
          id: cat.toLowerCase(),
          label: cat.toUpperCase(),
          accent: catItems[0]?.accent ?? '#E8960C',
          items: catItems.map((item) => ({
            name: item.name,
            id: item.id,
            live: true,
            freq: '',
          })),
        };
      })
      .filter(Boolean) as RegistryCat[];
  }, [indicators]);

  const showOverview = useCallback(() => {
    setFocusedIndicator(null);
    setActivePanels(DEFAULT_PANELS);
    setSelectedIndicator(null);
  }, []);

  const renderPanel = (panel: PanelId) => {
    switch (panel) {
      case 'defi-macro':
        return <OverviewPanel key={panel} summary={data.summary ?? {}} loading={loading} />;
      case 'chain-tvl':
        return <TvlPanel key={panel} tvl={data.chainTvl ?? {}} latestRows={data.chainLatest ?? []} loading={loading} />;
      case 'protocol-revenue':
        return <FeesPanel key={panel} history={data.feeHistory ?? []} protocols={data.fees ?? []} loading={loading} />;
      case 'protocol-board':
        return <ProtocolPanel key={panel} protocols={data.protocols ?? []} loading={loading} />;
      case 'dex-volume':
        return <DexPanel key={panel} volumes={data.dexVolumes ?? {}} loading={loading} />;
      case 'stablecoin-float':
        return <StablecoinPanel key={panel} supply={data.stableSupply ?? []} total={data.stableTotal ?? []} bySymbol={data.stableBySymbol ?? {}} loading={loading} />;
      case 'derivatives-risk':
        return (
          <DerivativesPanel
            key={panel}
            btcData={data.btcDerivatives ?? []}
            ethData={data.ethDerivatives ?? []}
            solData={data.solDerivatives ?? []}
            defiOpenInterest={data.defiOpenInterest ?? []}
            loading={loading}
          />
        );
      case 'yield-market':
        return <EnhancedYieldPanel key={panel} />;
      case 'options-flow':
        return <OptionsPanel key={panel} aggregate={data.optionsAggregate ?? []} byChain={data.optionsByChain ?? {}} latest={data.optionsLatest ?? []} loading={loading} />;
      case 'btc-anchor':
        return <BtcPricePanel key={panel} prices={data.btcPrices ?? []} loading={loading} />;
      case 'dex-pools':
        return <DexPaprikaPanel key={panel} external={data.external ?? EMPTY_EXTERNAL_DATA} loading={externalLoading} />;
      case 'market-structure':
        return <MarketStructurePanel key={panel} summary={data.summary ?? {}} external={data.external ?? EMPTY_EXTERNAL_DATA} btcPrices={data.btcPrices ?? []} ethPrices={data.ethPrices ?? []} solPrices={data.solPrices ?? []} loading={loading || externalLoading} />;
      case 'bridges':
        return <BridgesPanel key={panel} protocols={data.bridges ?? []} loading={loading} />;
      case 'lending':
        return <LendingPanel key={panel} protocols={data.lendingProtocols ?? []} yields={data.yields ?? []} totalBorrowed={data.lendingTotalBorrowed ?? 0} loading={loading} />;
      case 'liquidations':
        return <LiquidationsPanelNew key={panel} />;
      case 'etf':
        return <ETFPanelNew key={panel} />;
      case 'protocol-compare':
        return <ProtocolComparePanelNew key={panel} />;
      case 'category-history':
        return <CategoryTvlHistoryPanel key={panel} />;
      case 'dex-protocols':
        return <DexProtocolPanel key={panel} />;
      case 'concentration':
        return <ConcentrationPanel key={panel} />;
      case 'defi-categories':
        return <DeFiCategoriesPanel key={panel} />;
      case 'fundraising':
        return <FundraisingPanel key={panel} />;
      case 'chain-activity':
        return <ChainActivityPanel key={panel} />;
      case 'staking':
        return <StakingPanel key={panel} />;
      case 'rwa':
        return <RwaPanel key={panel} />;
      case 'indicator-detail':
      default:
        return null;
    }
  };

  const pageStyle: CSSProperties = {
    fontFamily: MONO,
    background:
      'radial-gradient(circle at 75% 6%, rgba(232,150,12,0.085), transparent 32%), radial-gradient(circle at 20% 22%, rgba(56,189,248,0.06), transparent 26%), radial-gradient(circle at 50% 100%, rgba(20,184,166,0.03), transparent 40%), #09090E',
  };

  return (
    <DesktopGate>
      <AuthGuard>
        <div className="min-h-screen flex flex-col relative overflow-hidden font-mono" style={pageStyle}>
            <div
              className="fixed inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
                backgroundSize: '44px 44px',
                maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.7), transparent 80%)',
              }}
            />

            <TerminalModulePageShell
              header={{
                sectionLabel: 'METRILYTICS',
                title: 'METRILYTICS INTELLIGENCE',

                subtitle: 'DeFi liquidity mapping, protocol monitoring, and yield intelligence',
                accent: '#E8960C',
                accentDark: '#7A4F00',
                background: '#0A0800',
                clock: <LiveClock />,
              }}
            >
              <div className="metrilytics-comfort relative grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)] 3xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
                <IntelRegistry
                  registryCats={registryCats}
                  registrySearch={registrySearch}
                  setRegistrySearch={setRegistrySearch}
                  openAccordion={openAccordion}
                  setOpenAccordion={setOpenAccordion}
                  selectedIndicator={selectedIndicator}
                  setSelectedIndicator={(id) => {
                    setSelectedIndicator(id);
                    if (id) {
                      const indicator = indicators.find((i) => i.id === id);
                      if (indicator) {
                        setFocusedIndicator(indicator);
                        setActivePanels([indicator.panel]);
                        const domId = PANEL_DOM_ID[indicator.panel] ?? 'metrilytics-workspace';
                        window.setTimeout(() => document.getElementById(domId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                      }
                    }
                  }}
                  themeAccent="#E8960C"
                />

                <div className="min-w-0 flex flex-col gap-3">
                  {activePanels.length !== DEFAULT_PANELS.length && (
                    <button
                      onClick={showOverview}
                      className="self-start flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider transition-all"
                      style={{
                        fontFamily: MONO,
                        color: '#E8960C',
                        background: 'rgba(232,150,12,0.06)',
                        border: '1px solid rgba(232,150,12,0.14)',
                        borderRadius: 0,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,150,12,0.10)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,150,12,0.25)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,150,12,0.06)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,150,12,0.14)';
                      }}
                    >
                      <span>←</span> OVERVIEW
                    </button>
                  )}
                  <main id="metrilytics-workspace" className="min-w-0 flex flex-col gap-6">
                    <FocusedSignal indicator={focusedIndicator} />
                    {activePanels.map(renderPanel)}
                  </main>
                </div>
              </div>
            </TerminalModulePageShell>

            <FooterTerminal />

            <style>{`
              @keyframes metrilytics-scan {
                0% { background-position: 220% 0; opacity: 0.4; }
                50% { opacity: 0.72; }
                100% { background-position: -220% 0; opacity: 0.4; }
              }
              .metrilytics-comfort .text-\[10px\] { font-size: 11px !important; }
              .metrilytics-comfort .text-\[11px\] { font-size: 12px !important; }
              .metrilytics-comfort .text-\[12px\] { font-size: 13px !important; }
              .metrilytics-comfort .text-\[13px\] { font-size: 14px !important; }
              .metrilytics-comfort .text-\[14px\] { font-size: 15px !important; }
              .metrilytics-comfort .text-xs { font-size: 13px !important; }
              .metrilytics-comfort .text-sm { font-size: 15px !important; }
              .metrilytics-comfort input,
              .metrilytics-comfort button { min-height: 32px; }
              .metrilytics-comfort .recharts-cartesian-axis-tick-value,
              .metrilytics-comfort .recharts-label,
              .metrilytics-comfort .recharts-text { font-size: 11.5px !important; }
            `}</style>
        </div>
      </AuthGuard>
    </DesktopGate>
  );
}
