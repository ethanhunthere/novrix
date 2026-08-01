'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { registerPromise, prefetch } from '@/lib/bootCache';
import TerminalModulePageShell from '@/components/terminal/TerminalModulePageShell';
import FooterTerminal from '@/components/terminal/FooterTerminal';
import DesktopGate from '@/components/layout/DesktopGate';
import BootSequence from '@/components/layout/BootSequence';
import AuthGuard from '@/components/layout/AuthGuard';
import SentimentSidebar from '@/components/sentiment/SentimentSidebar';
import SentimentChartPanel, { type SentimentPanelConfig } from '@/components/sentiment/SentimentChartPanel';
import {
  PanelHeader, FngTooltip, PrecisionTooltip, ChartSkeleton,
  TF_OPTS, FRED_TF_OPTS, TfSelector, LineToggle,
  getXAxisTicks, formatXAxisTick, downsample,
  LiveClock, PANEL_CODES, PanelMaximizeWrapper,
  getHalvingIndices,
} from '@/components/sentiment/SentimentPanelUtils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';

const _rechartsModule = { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine };
import { SENTIMENT_DATA_VERSION } from '@/lib/sentimentDataVersion';
import {
  SENTIMENT_PREFETCH_URLS,
  SENTIMENT_PRELOAD_URL,
} from '@/lib/terminalModulePrefetch';
import { useTerminalModulePrefetch } from '@/lib/hooks/useTerminalModulePrefetch';

// ── Module-level preload ────────────────────────────────────────────────────
// Fires the moment Next.js imports this page — before any component mounts,
// before BootSequence begins. The Promise is registered in bootCache so the
// bulk useEffect can consume it via fetchCached() with zero extra round-trips.
//
// sessionStorage cache (keyed by sentiment data version, TTL: 1 hour) ensures returning
// users within the same session get instant data — no network request at all.
const PRELOAD_URL = SENTIMENT_PRELOAD_URL;
const SS_KEY = 'nvrix-ind-bgeo-fresh-20260510';
const SS_TTL = 3600_000; // 1 hour in ms
const SENTIMENT_BAND_RED = '#EF4444';
const SENTIMENT_BAND_GREEN = '#10B981';
const SENTIMENT_BAND_OPACITY = 0.11;

const lowerBand = (to: number) => ({ to, fill: SENTIMENT_BAND_GREEN, fillOpacity: SENTIMENT_BAND_OPACITY });
const upperBand = (from: number) => ({ from, fill: SENTIMENT_BAND_RED, fillOpacity: SENTIMENT_BAND_OPACITY });

// Opt-in low/high reference bands. The shared renderer clamps these to the visible data extent.
const NUPL_REFERENCE_BANDS = [lowerBand(-0.25), upperBand(0.75)];
const MVRV_REFERENCE_BANDS = [lowerBand(1.0), upperBand(3.5)];
const LTH_MVRV_REFERENCE_BANDS = [lowerBand(1.0), upperBand(5.0)];
const SOPR_REFERENCE_BANDS = [lowerBand(1.0), upperBand(1.0)];
const SSR_REFERENCE_BANDS = [lowerBand(5.0), upperBand(20.0)];
const STH_MVRV_REFERENCE_BANDS = [lowerBand(0.8), upperBand(1.4)];
const AVIV_REFERENCE_BANDS = [lowerBand(0.8), upperBand(5.0)];
const MVRV_ZSCORE_REFERENCE_BANDS = [lowerBand(0.1), upperBand(7.0)];
const PUELL_REFERENCE_BANDS = [lowerBand(0.5), upperBand(4.0)];
const MAYER_REFERENCE_BANDS = [lowerBand(0.8), upperBand(2.4)];
const RESERVE_RISK_REFERENCE_BANDS = [lowerBand(0.0026), upperBand(0.02)];
const VDD_REFERENCE_BANDS = [lowerBand(0.5), upperBand(4.0)];
const RHODL_REFERENCE_BANDS = [lowerBand(5000), upperBand(100000)];
const NVTS_REFERENCE_BANDS = [lowerBand(45), upperBand(150)];
const NVT_ZSCORE_REFERENCE_BANDS = [lowerBand(-1), upperBand(2)];
const SSR_OSCILLATOR_REFERENCE_BANDS = [lowerBand(-0.5), upperBand(1.0)];

// ── Zone-colored line gradient stops (match FNG palette) ────────────────────
const red = '#EF4444', orange = '#F7931A', blue = '#88B4D0', green = '#10B981';

const NUPL_LINE_STOPS = [{ value: 0.75, color: red }, { value: 0.50, color: orange }, { value: 0.25, color: orange }, { value: 0.00, color: blue }, { value: -0.25, color: green }];
const MVRV_LINE_STOPS = [{ value: 3.5, color: red }, { value: 2.4, color: red }, { value: 1.8, color: orange }, { value: 1.0, color: blue }, { value: 0.8, color: green }];
const LTH_MVRV_LINE_STOPS = [{ value: 5.0, color: red }, { value: 3.5, color: orange }, { value: 1.5, color: blue }, { value: 1.0, color: green }];
const SOPR_LINE_STOPS = [{ value: 1.10, color: red }, { value: 1.03, color: red }, { value: 1.00, color: orange }, { value: 0.97, color: blue }, { value: 0.90, color: green }];
const SSR_LINE_STOPS = [{ value: 20, color: red }, { value: 10, color: orange }, { value: 5, color: blue }];
const STH_MVRV_LINE_STOPS = [{ value: 1.4, color: red }, { value: 1.2, color: orange }, { value: 1.0, color: blue }, { value: 0.8, color: green }];
const AVIV_LINE_STOPS = [{ value: 5.0, color: red }, { value: 2.0, color: orange }, { value: 0.8, color: blue }];
const MVRV_ZSCORE_LINE_STOPS = [{ value: 7.0, color: red }, { value: 2.0, color: orange }, { value: 0.1, color: blue }];
const PUELL_LINE_STOPS = [{ value: 4.0, color: red }, { value: 2.0, color: orange }, { value: 0.5, color: blue }];
const MAYER_LINE_STOPS = [{ value: 2.4, color: red }, { value: 1.2, color: orange }, { value: 0.8, color: blue }];
const RESERVE_RISK_LINE_STOPS = [{ value: 0.02, color: red }, { value: 0.005, color: orange }, { value: 0.0026, color: blue }];
const VDD_LINE_STOPS = [{ value: 4.0, color: red }, { value: 2.0, color: orange }, { value: 0.5, color: blue }];
const RHODL_LINE_STOPS = [{ value: 100000, color: red }, { value: 50000, color: orange }, { value: 20000, color: blue }, { value: 5000, color: green }];
const NVTS_LINE_STOPS = [{ value: 150, color: red }, { value: 90, color: orange }, { value: 45, color: blue }];
const NVT_ZSCORE_LINE_STOPS = [{ value: 2.0, color: red }, { value: 1.0, color: orange }, { value: -1.0, color: blue }];
const SSR_OSCILLATOR_LINE_STOPS = [{ value: 1.0, color: red }, { value: 0.5, color: orange }, { value: -0.5, color: blue }];

// KEY 4
const MARKET_CAP_LINE_STOPS = [{ value: 3e12, color: red }, { value: 1.5e12, color: orange }, { value: 0.8e12, color: blue }];
const HIGHLY_LIQUID_LINE_STOPS = [{ value: 4e6, color: red }, { value: 3e6, color: orange }, { value: 2e6, color: blue }];
const LTH_PC_LINE_STOPS = [{ value: 5000, color: red }, { value: 500, color: orange }, { value: -500, color: blue }, { value: -5000, color: green }];
const STH_PC_LINE_STOPS = [{ value: 2000, color: green }, { value: 200, color: blue }, { value: -200, color: orange }, { value: -2000, color: red }];
const MPI_LINE_STOPS = [{ value: 2.0, color: red }, { value: 1.0, color: orange }, { value: 0.5, color: blue }, { value: 0.0, color: green }];
const MINER_SP_LINE_STOPS = [{ value: 0.35, color: red }, { value: 0.20, color: orange }, { value: 0.10, color: blue }];
const UTXO_PROFIT_LINE_STOPS = [{ value: 0.97, color: red }, { value: 0.90, color: orange }, { value: 0.70, color: blue }, { value: 0.50, color: green }];
const UTXO_LOSS_LINE_STOPS = [{ value: 0.50, color: green }, { value: 0.30, color: blue }, { value: 0.10, color: orange }, { value: 0.03, color: red }];

// KEY 5 macro
const M2_LINE_STOPS = [{ value: 21e12, color: green }, { value: 18e12, color: blue }, { value: 15e12, color: red }];
const DXY_LINE_STOPS = [{ value: 105, color: red }, { value: 100, color: orange }, { value: 95, color: blue }];
const VIX_LINE_STOPS = [{ value: 40, color: red }, { value: 30, color: orange }, { value: 20, color: orange }, { value: 12, color: blue }];
const FEDFUNDS_LINE_STOPS = [{ value: 5, color: red }, { value: 3, color: orange }, { value: 1, color: blue }];
const ETF_LINE_STOPS = [{ value: 100e9, color: green }, { value: 50e9, color: green }, { value: 10e9, color: blue }];
const SP500_LINE_STOPS = [{ value: 5500, color: green }, { value: 4000, color: green }, { value: 3000, color: blue }, { value: 2500, color: red }];
const GOLD_LINE_STOPS = [{ value: 3000, color: orange }, { value: 2000, color: orange }, { value: 1500, color: blue }];
const STB_LINE_STOPS = [{ value: 200e9, color: green }, { value: 150e9, color: green }, { value: 80e9, color: blue }];
const CMCAP_LINE_STOPS = [{ value: 3e12, color: green }, { value: 2e12, color: green }, { value: 1e12, color: blue }];
const SOFR_LINE_STOPS = [{ value: 5.0, color: red }, { value: 3.0, color: orange }, { value: 1.5, color: blue }];
const WALCL_LINE_STOPS = [{ value: 9e6, color: green }, { value: 7e6, color: blue }, { value: 5e6, color: red }];
const WRESBAL_LINE_STOPS = [{ value: 3e6, color: green }, { value: 1e6, color: blue }, { value: 0.5e6, color: red }];
const RRPONTSYD_LINE_STOPS = [{ value: 2e6, color: red }, { value: 500e3, color: orange }, { value: 100e3, color: blue }];
const CPI_LINE_STOPS = [{ value: 6.0, color: red }, { value: 4.0, color: orange }, { value: 2.0, color: blue }];
const INFL_EXP_LINE_STOPS = [{ value: 5.0, color: red }, { value: 3.0, color: orange }, { value: 2.0, color: blue }];
const T5YIE_LINE_STOPS = [{ value: 3.0, color: red }, { value: 2.5, color: orange }, { value: 2.0, color: blue }];
const T10Y2Y_LINE_STOPS = [{ value: 0.5, color: green }, { value: 0.0, color: blue }, { value: -0.5, color: orange }];
const M1_LINE_STOPS = [{ value: 22e3, color: green }, { value: 18e3, color: blue }, { value: 14e3, color: red }];
const UNRATE_LINE_STOPS = [{ value: 7.0, color: red }, { value: 5.0, color: orange }, { value: 4.0, color: blue }];
const PAYEMS_LINE_STOPS = [{ value: 160e3, color: green }, { value: 155e3, color: blue }, { value: 150e3, color: orange }];
const ICSA_LINE_STOPS = [{ value: 300e3, color: red }, { value: 250e3, color: orange }, { value: 200e3, color: blue }];
const JTSJOL_LINE_STOPS = [{ value: 10e3, color: green }, { value: 8e3, color: blue }, { value: 6e3, color: orange }];
const EMRATIO_LINE_STOPS = [{ value: 62.0, color: green }, { value: 60.0, color: blue }, { value: 58.0, color: orange }];
const GDP_LINE_STOPS = [{ value: 25000, color: green }, { value: 22000, color: blue }, { value: 20000, color: orange }];
const INDPRO_LINE_STOPS = [{ value: 105, color: green }, { value: 100, color: blue }, { value: 95, color: orange }];
const HOUST_LINE_STOPS = [{ value: 1500, color: green }, { value: 1200, color: blue }, { value: 800, color: orange }];
const UMCSENT_LINE_STOPS = [{ value: 90, color: green }, { value: 70, color: blue }, { value: 55, color: orange }];
const RSXFS_LINE_STOPS = [{ value: 700e3, color: green }, { value: 600e3, color: blue }, { value: 500e3, color: orange }];
const WTI_LINE_STOPS = [{ value: 100, color: red }, { value: 80, color: orange }, { value: 60, color: blue }];
const HY_SPREAD_LINE_STOPS = [{ value: 8.0, color: red }, { value: 5.0, color: orange }, { value: 3.0, color: blue }];
const MORTGAGE_LINE_STOPS = [{ value: 7.0, color: red }, { value: 6.0, color: orange }, { value: 4.0, color: orange }];
const BOGMBASE_LINE_STOPS = [{ value: 7000, color: green }, { value: 4000, color: blue }, { value: 2000, color: red }];
const TOTALSL_LINE_STOPS = [{ value: 5000, color: red }, { value: 4000, color: orange }, { value: 3000, color: blue }];
const OI_LINE_STOPS = [{ value: 500000, color: red }, { value: 300000, color: orange }, { value: 100000, color: blue }];
const FUNDING_LINE_STOPS = [{ value: 0.1, color: red }, { value: 0.05, color: green }, { value: 0.0, color: blue }, { value: -0.05, color: red }];
const NRPL_LINE_STOPS = [{ value: 100000, color: green }, { value: 20000, color: blue }, { value: 0, color: red }];
const CVDD_LINE_STOPS = [{ value: 40000, color: orange }, { value: 10000, color: blue }];

if (typeof window !== 'undefined') {
  let servedFromCache = false;

  // Check sessionStorage for a hot cache hit (1-hour TTL)
  const raw = sessionStorage.getItem(SS_KEY);
  if (raw) {
    try {
      const { d, t } = JSON.parse(raw);
      if (Date.now() - t < SS_TTL && d) {
        // Serve instantly — zero network request
        registerPromise(PRELOAD_URL, Promise.resolve(d));
        servedFromCache = true;
      }
    } catch {
      sessionStorage.removeItem(SS_KEY);
    }
  }

  if (!servedFromCache) {
    // Fire the network fetch at module import time — before any component mounts
    const networkPromise: Promise<unknown> = fetch(PRELOAD_URL, { credentials: 'include' })
      .then(r => {
        if (!r.ok) return null;
        return r.json().then((data: unknown) => {
          try {
            sessionStorage.setItem(SS_KEY, JSON.stringify({ d: data, t: Date.now() }));
          } catch { /* storage quota — ignore */ }
          return data;
        });
      })
      .catch(() => null);

    registerPromise(PRELOAD_URL, networkPromise);
  }
}
import { fetchWithSSCache } from '@/lib/fetchWithSSCache';
import { useSentimentData } from '@/lib/hooks/useSentimentData';
// ── Per-indicator sessionStorage cache (1-hour TTL) — also used by useSentimentData hook ──
// Re-exported from lib/fetchWithSSCache.ts; kept here only as a reference.
// URLs pre-fetched during the boot animation so data is ready when content mounts
// ── Module-level prefetch for ALL indicator URLs ────────────────────────────
// Fires at JS parse time — before React hydrates, before BootSequence mounts.
// Checks sessionStorage for each URL (1-hour TTL) and falls back to a network
// fetch. This gives every indicator a 2.5 s head-start while the boot animation
// runs, so data is ready the moment the overlay dismisses.
if (typeof window !== 'undefined') {
  SENTIMENT_PREFETCH_URLS.forEach((url) => {
    // Skip the bulk endpoint — already handled by the dedicated preload block above
    if (url === PRELOAD_URL) return;

    // Check sessionStorage for per-indicator cached data (same key format as fetchWithSSCache)
    const cacheKey = `novrix_${SENTIMENT_DATA_VERSION}_` + url.replace(/^\/api\//, '').replace(/[\/?=&]/g, '_') + '_cache';
    const raw = sessionStorage.getItem(cacheKey);
    if (raw) {
      try {
        const { d, t } = JSON.parse(raw);
        if (Date.now() - t < SS_TTL && d) {
          registerPromise(url, Promise.resolve(d));
          return;
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    // Start the fetch immediately — bootCache deduplicates so BootSequence's
    // identical prefetch later in the lifecycle is a no-op.
    prefetch(url);
  });
}

type SentimentContentProps = {
  onPrimaryDataReady: () => void;
};

function SentimentContent({ onPrimaryDataReady }: SentimentContentProps) {
  const {
    // KEY 0 - Sentiment/FNG state
    sentimentData, setSentimentData, allFngData, setAllFngData,
    historicalData, setHistoricalData, dominanceData, setDominanceData,
    ethDominanceData, setEthDominanceData, selectedTimeframe, setSelectedTimeframe,
    selectedDominanceTimeframe,
    // KEY 1 loading
    isLoading, isHistoricalLoading, isDominanceLoading, isError,
    // Social sentiment
    socialSentiment, trendingCoins, isSocialLoading,
    // BTC Price
    btcPriceData, setBtcPriceData, isBtcPriceLoading,
    // KEY 2 - indicator data
    nuplData, isNuplLoading, nuplTimeframe, setNuplTimeframe,
    mvrvData, isMvrvLoading, mvrvTimeframe, setMvrvTimeframe,
    soprData, isSoprLoading, soprTimeframe, setSoprTimeframe,
    supplyLossData, isSupplyLossLoading, supplyLossTimeframe, setSupplyLossTimeframe,
    supplyProfitData, isSupplyProfitLoading, supplyProfitTimeframe, setSupplyProfitTimeframe,
    realizedProfitData, isRealizedProfitLoading, realizedProfitTimeframe, setRealizedProfitTimeframe,
    realizedLossData, isRealizedLossLoading, realizedLossTimeframe, setRealizedLossTimeframe,
    sthMvrvData, isSthMvrvLoading, sthMvrvTimeframe, setSthMvrvTimeframe,
    hashrateData, isHashrateLoading, hashrateTimeframe, setHashrateTimeframe,
    lthMvrvData, isLthMvrvLoading, lthMvrvTimeframe, setLthMvrvTimeframe,
    ssrData, isSsrLoading, ssrTimeframe, setSsrTimeframe,
    puellMultipleData, isPuellMultipleLoading, puellMultipleTimeframe, setPuellMultipleTimeframe,
    mayerMultipleData, isMayerMultipleLoading, mayerMultipleTimeframe, setMayerMultipleTimeframe,
    reserveRiskData, isReserveRiskLoading, reserveRiskTimeframe, setReserveRiskTimeframe,
    avivData, isAvivLoading, avivTimeframe, setAvivTimeframe,
    mvrvZscoreData, isMvrvZscoreLoading, mvrvZscoreTimeframe, setMvrvZscoreTimeframe,
    vddData, isVddLoading, vddTimeframe, setVddTimeframe,
    supplyShockData, isSupplyShockLoading, supplyShockTimeframe, setSupplyShockTimeframe,
    activeAddressesData, isActiveAddressesLoading, activeAddressesTimeframe, setActiveAddressesTimeframe,
    illiquidSupplyData, isIlliquidSupplyLoading, illiquidSupplyTimeframe, setIlliquidSupplyTimeframe,
    hotSupplyData, isHotSupplyLoading, hotSupplyTimeframe, setHotSupplyTimeframe,
    hashribbonsData, isHashribbonsLoading, hashribbonsTimeframe, setHashribbonsTimeframe,
    nrplData, isNrplLoading, nrplTimeframe, setNrplTimeframe,
    rhodlData, isRhodlLoading, rhodlTimeframe, setRhodlTimeframe,
    openInterestData, isOpenInterestLoading, openInterestTimeframe, setOpenInterestTimeframe,
    fundingRateData, isFundingRateLoading, fundingRateTimeframe, setFundingRateTimeframe,
    nvtsData, isNvtsLoading, nvtsTimeframe, setNvtsTimeframe,
    nvtZscoreData, isNvtZscoreLoading, nvtZscoreTimeframe, setNvtZscoreTimeframe,
    cvddData, isCvddLoading, cvddTimeframe, setCvddTimeframe,
    realizedPriceData, isRealizedPriceLoading, realizedPriceTimeframe, setRealizedPriceTimeframe,
    marketCapK4Data, isMarketCapK4Loading, marketCapK4Timeframe, setMarketCapK4Timeframe,
    weekMa200Data, isWeekMa200Loading, weekMa200Timeframe, setWeekMa200Timeframe,
    highlyLiquidData, isHighlyLiquidLoading, highlyLiquidTimeframe, setHighlyLiquidTimeframe,
    lthPositionChangeData, isLthPositionChangeLoading, lthPositionChangeTimeframe, setLthPositionChangeTimeframe,
    sthPositionChangeData, isSthPositionChangeLoading, sthPositionChangeTimeframe, setSthPositionChangeTimeframe,
    mpiData, isMpiLoading, mpiTimeframe, setMpiTimeframe,
    minerSellPressureData, isMinerSellPressureLoading, minerSellPressureTimeframe, setMinerSellPressureTimeframe,
    utxoProfitData, isUtxoProfitLoading, utxoProfitTimeframe, setUtxoProfitTimeframe,
    utxoLossData, isUtxoLossLoading, utxoLossTimeframe, setUtxoLossTimeframe,
    m2Data, isM2Loading, m2Timeframe, setM2Timeframe,
    dxyData, isDxyLoading, dxyTimeframe, setDxyTimeframe,
    vixData, isVixLoading, vixTimeframe, setVixTimeframe,
    fedfundsData, isFedfundsLoading, fedfundsTimeframe, setFedfundsTimeframe,
    etfData, isEtfLoading, etfTimeframe, setEtfTimeframe,
    sp500Data, isSp500Loading, sp500Timeframe, setSp500Timeframe,
    goldData, isGoldLoading, goldTimeframe, setGoldTimeframe,
    stablecoinSupplyData, isStablecoinSupplyLoading, stablecoinSupplyTimeframe, setStablecoinSupplyTimeframe,
    ssrOscillatorData, isSsrOscillatorLoading, ssrOscillatorTimeframe, setSsrOscillatorTimeframe,
    cryptoMarketCapData, isCryptoMarketCapLoading, cryptoMarketCapTimeframe, setCryptoMarketCapTimeframe,
    sofrData, isSofrLoading, sofrTimeframe, setSofrTimeframe,
    walclData, isWalclLoading, walclTimeframe, setWalclTimeframe,
    wresbalData, isWresbalLoading, wresbalTimeframe, setWresbalTimeframe,
    rrpontsydData, isRrpontsydLoading, rrpontsydTimeframe, setRrpontsydTimeframe,
    cpiaucslData, isCpiaucslLoading, cpiaucslTimeframe, setCpiaucslTimeframe,
    cpilfeslData, isCpilfeslLoading, cpilfeslTimeframe, setCpilfeslTimeframe,
    pcepiData, isPcepiLoading, pcepiTimeframe, setPcepiTimeframe,
    pcepilfeData, isPcepilfeLoading, pcepilfeTimeframe, setPcepilfeTimeframe,
    michData, isMichLoading, michTimeframe, setMichTimeframe,
    t5yieData, isT5yieLoading, t5yieTimeframe, setT5yieTimeframe,
    t10yieData, isT10yieLoading, t10yieTimeframe, setT10yieTimeframe,
    dgs1moData, isDgs1moLoading, dgs1moTimeframe, setDgs1moTimeframe,
    dgs3moData, isDgs3moLoading, dgs3moTimeframe, setDgs3moTimeframe,
    dgs6moData, isDgs6moLoading, dgs6moTimeframe, setDgs6moTimeframe,
    dgs1Data, isDgs1Loading, dgs1Timeframe, setDgs1Timeframe,
    dgs5Data, isDgs5Loading, dgs5Timeframe, setDgs5Timeframe,
    dgs20Data, isDgs20Loading, dgs20Timeframe, setDgs20Timeframe,
    dgs30Data, isDgs30Loading, dgs30Timeframe, setDgs30Timeframe,
    t10y2yData, isT10y2yLoading, t10y2yTimeframe, setT10y2yTimeframe,
    t10y3mData, isT10y3mLoading, t10y3mTimeframe, setT10y3mTimeframe,
    m1slData, isM1slLoading, m1slTimeframe, setM1slTimeframe,
    mabmm301Data, isMabmm301Loading, mabmm301Timeframe, setMabmm301Timeframe,
    unrateData, isUnrateLoading, unrateTimeframe, setUnrateTimeframe,
    payemsData, isPayemsLoading, payemsTimeframe, setPayemsTimeframe,
    icsaData, isIcsaLoading, icsaTimeframe, setIcsaTimeframe,
    jtsjolData, isJtsjolLoading, jtsjolTimeframe, setJtsjolTimeframe,
    emratioData, isEmratioLoading, emratioTimeframe, setEmratioTimeframe,
    gdpc1Data, isGdpc1Loading, gdpc1Timeframe, setGdpc1Timeframe,
    indproData, isIndproLoading, indproTimeframe, setIndproTimeframe,
    houstData, isHoustLoading, houstTimeframe, setHoustTimeframe,
    umcsentData, isUmcsentLoading, umcsentTimeframe, setUmcsentTimeframe,
    rsxfsData, isRsxfsLoading, rsxfsTimeframe, setRsxfsTimeframe,
    dcoilwticoData, isDcoilwticoLoading, dcoilwticoTimeframe, setDcoilwticoTimeframe,
    bamlh0a0hym2Data, isBamlh0a0hym2Loading, bamlh0a0hym2Timeframe, setBamlh0a0hym2Timeframe,
    mortgage30usData, isMortgage30usLoading, mortgage30usTimeframe, setMortgage30usTimeframe,
    bogmbaseData, isBogmbaseLoading, bogmbaseTimeframe, setBogmbaseTimeframe,
    totalslData, isTotalslLoading, totalslTimeframe, setTotalslTimeframe,
    // Derived chart data
    sentiment, chartData, calculateTicks, formatXAxis,
    dominanceChartData, dominanceChartDataWithPrice,
    nuplChartData, nuplChartDataWithPrice,
    mvrvChartData, mvrvChartDataWithPrice,
    soprChartData, soprChartDataWithPrice,
    supplyLossChartData, supplyLossChartDataWithPrice,
    supplyProfitChartData, supplyProfitChartDataWithPrice,
    lthMvrvChartData, lthMvrvChartDataWithPrice,
    ssrChartData, ssrChartDataWithPrice,
    realizedProfitChartData, realizedProfitChartDataWithPrice,
    realizedLossChartData, realizedLossChartDataWithPrice,
    sthMvrvChartData, sthMvrvChartDataWithPrice,
    hashrateChartData, hashrateChartDataWithPrice,
    puellMultipleChartData, puellMultipleChartDataWithPrice,
    mayerMultipleChartData, mayerMultipleChartDataWithPrice,
    reserveRiskChartData, reserveRiskChartDataWithPrice,
    avivChartData, avivChartDataWithPrice,
    mvrvZscoreChartData, mvrvZscoreChartDataWithPrice,
    vddChartData, vddChartDataWithPrice,
    supplyShockChartData, supplyShockChartDataWithPrice,
    activeAddressesChartData, activeAddressesChartDataWithPrice,
    illiquidSupplyChartData, illiquidSupplyChartDataWithPrice,
    hotSupplyChartData, hotSupplyChartDataWithPrice,
    hashribbonsChartData, hashribbonsChartDataWithPrice,
    nrplChartData, nrplChartDataWithPrice,
    rhodlChartData, rhodlChartDataWithPrice,
    openInterestChartData, openInterestChartDataWithPrice,
    fundingRateChartData, fundingRateChartDataWithPrice,
    nvtsChartData, nvtsChartDataWithPrice,
    nvtZscoreChartData, nvtZscoreChartDataWithPrice,
    cvddChartData, cvddChartDataWithPrice,
    mkK4ChartData,
    realizedPriceChartData, realizedPriceChartDataWithPrice,
    marketCapK4ChartData, marketCapK4ChartDataWithPrice,
    weekMa200ChartData, weekMa200ChartDataWithPrice,
    highlyLiquidChartData, highlyLiquidChartDataWithPrice,
    lthPositionChangeChartData, lthPositionChangeChartDataWithPrice,
    sthPositionChangeChartData, sthPositionChangeChartDataWithPrice,
    mpiChartData, mpiChartDataWithPrice,
    minerSellPressureChartData, minerSellPressureChartDataWithPrice,
    utxoProfitChartData, utxoProfitChartDataWithPrice,
    utxoLossChartData, utxoLossChartDataWithPrice,
    m2ChartData, m2ChartDataWithPrice,
    dxyChartData, dxyChartDataWithPrice,
    vixChartData, vixChartDataWithPrice,
    fedfundsChartData, fedfundsChartDataWithPrice,
    etfChartData, etfChartDataWithPrice,
    sp500ChartData, sp500ChartDataWithPrice,
    goldChartData, goldChartDataWithPrice,
    stablecoinSupplyChartData, stablecoinSupplyChartDataWithPrice,
    ssrOscillatorChartData, ssrOscillatorChartDataWithPrice,
    cryptoMarketCapChartData, cryptoMarketCapChartDataWithPrice,
    sofrChartData,
    walclChartData, walclChartDataWithPrice,
    wresbalChartData, wresbalChartDataWithPrice,
    rrpontsydChartData, rrpontsydChartDataWithPrice,
    cpiaucslChartData, cpiaucslChartDataWithPrice,
    cpilfeslChartData, cpilfeslChartDataWithPrice,
    pcepiChartData, pcepiChartDataWithPrice,
    pcepilfeChartData, pcepilfeChartDataWithPrice,
    michChartData, michChartDataWithPrice,
    t5yieChartData, t5yieChartDataWithPrice,
    t10yieChartData, t10yieChartDataWithPrice,
    dgs1moChartData, dgs1moChartDataWithPrice,
    dgs3moChartData, dgs3moChartDataWithPrice,
    dgs6moChartData, dgs6moChartDataWithPrice,
    dgs1ChartData, dgs1ChartDataWithPrice,
    dgs5ChartData, dgs5ChartDataWithPrice,
    dgs20ChartData, dgs20ChartDataWithPrice,
    dgs30ChartData, dgs30ChartDataWithPrice,
    t10y2yChartData, t10y2yChartDataWithPrice,
    t10y3mChartData, t10y3mChartDataWithPrice,
    m1slChartData, m1slChartDataWithPrice,
    mabmm301ChartData, mabmm301ChartDataWithPrice,
    unrateChartData, unrateChartDataWithPrice,
    payemsChartData, payemsChartDataWithPrice,
    icsaChartData, icsaChartDataWithPrice,
    jtsjolChartData, jtsjolChartDataWithPrice,
    emratioChartData, emratioChartDataWithPrice,
    gdpc1ChartData, gdpc1ChartDataWithPrice,
    indproChartData, indproChartDataWithPrice,
    houstChartData, houstChartDataWithPrice,
    umcsentChartData, umcsentChartDataWithPrice,
    rsxfsChartData, rsxfsChartDataWithPrice,
    dcoilwticoChartData, dcoilwticoChartDataWithPrice,
    bamlh0a0hym2ChartData, bamlh0a0hym2ChartDataWithPrice,
    mortgage30usChartData, mortgage30usChartDataWithPrice,
    bogmbaseChartData, bogmbaseChartDataWithPrice,
    totalslChartData, totalslChartDataWithPrice,
    btcPriceLookup, addBtcPriceToChartData,
    getNuplZone, getSthMvrvZone, getMvrvZone, getLthMvrvZone, getSsrZone, getSoprZone, getSentimentColor,
  } = useSentimentData();

  useEffect(() => {
    if (!isLoading && !isHistoricalLoading) onPrimaryDataReady();
  }, [isHistoricalLoading, isLoading, onPrimaryDataReady]);

  const [showBtcPrice, setShowBtcPrice] = useState<Record<string, boolean>>({
    nupl: true, mvrv: true, 'lth-mvrv': true, sopr: true, ssr: true,
    supplyLoss: true, supplyProfit: true, realizedProfit: true, realizedLoss: true,
    sthMvrv: true, hashrate: true,
    puellMultiple: true, mayerMultiple: true, reserveRisk: true, aviv: true,
    mvrvZscore: true, vdd: true,
    supplyShock: true, activeAddresses: true, illiquidSupply: true,
    hotSupply: true, hashribbons: true, dominance: true,
    nrpl: true, rhodl: true, openInterest: true, fundingRate: true,
    m2: true, dxy: true, vix: true,
    fedfunds: true,
    etf: true, sp500: true, gold: true,
    stablecoinSupply: true, ssrOscillator: true, cryptoMarketCap: true,
    realizedPrice: true, marketCapK4: true, weekMa200: true,
    highlyLiquid: true,
    lthPositionChange: true, sthPositionChange: true, mpi: true, minerSellPressure: true,
    utxoProfit: true, utxoLoss: true,
    nvts: true, nvtZscore: true, cvdd: true,
    sofr: true, walcl: true, wresbal: true, rrpontsyd: true, cpiaucsl: true, cpilfesl: true, pcepi: true, pcepilfe: true, mich: true, t5yie: true, t10yie: true, dgs1mo: true, dgs3mo: true, dgs6mo: true, dgs1: true, dgs5: true, dgs20: true, dgs30: true, t10y2y: true, t10y3m: true, m1sl: true, mabmm301: true, unrate: true, payems: true, icsa: true, jtsjol: true, emratio: true, gdpc1: true, indpro: true, houst: true, umcsent: true, rsxfs: true, dcoilwtico: true, bamlh0a0hym2: true, mortgage30us: true, bogmbase: true, totalsl: true,
  });
  const [showIndicator, setShowIndicator] = useState<Record<string, boolean>>({
    nupl: true, mvrv: true, 'lth-mvrv': true, sopr: true, ssr: true,
    supplyLoss: true, supplyProfit: true, realizedProfit: true, realizedLoss: true,
    sthMvrv: true, hashrate: true,
    puellMultiple: true, mayerMultiple: true, reserveRisk: true, aviv: true,
    mvrvZscore: true, vdd: true,
    supplyShock: true, activeAddresses: true, illiquidSupply: true, liquidSupply: true,
    hotSupply: true, hashribbons: true, hashribbonsSma30: true, hashribbonsSma60: true,
    btcDom: true, ethDom: true,
    nrpl: true, rhodl: true, openInterest: true, fundingRate: true,
    m2: true, dxy: true, vix: true,
    fedfunds: true,
    etf: true, sp500: true, gold: true,
    stablecoinSupply: true, ssrOscillator: true, cryptoMarketCap: true,
    realizedPrice: true, marketCapK4: true, weekMa200: true,
    highlyLiquid: true,
    lthPositionChange: true, sthPositionChange: true, mpi: true, minerSellPressure: true,
    utxoProfit: true, utxoLoss: true,
    nvts: true, nvtZscore: true, cvdd: true,
    sofr: true, walcl: true, wresbal: true, rrpontsyd: true, cpiaucsl: true, cpilfesl: true, pcepi: true, pcepilfe: true, mich: true, t5yie: true, t10yie: true, dgs1mo: true, dgs3mo: true, dgs6mo: true, dgs1: true, dgs5: true, dgs20: true, dgs30: true, t10y2y: true, t10y3m: true, m1sl: true, mabmm301: true, unrate: true, payems: true, icsa: true, jtsjol: true, emratio: true, gdpc1: true, indpro: true, houst: true, umcsent: true, rsxfs: true, dcoilwtico: true, bamlh0a0hym2: true, mortgage30us: true, bogmbase: true, totalsl: true,
  });
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null);
  const [capturedPanel, setCapturedPanel] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const DEFAULT_OVERVIEW_IDS = useMemo(() => new Set(['indicator-fear-greed', 'indicator-nupl', 'indicator-mvrv', 'indicator-realized-price', 'indicator-sopr', 'indicator-sth-mvrv', 'indicator-hashrate', 'indicator-open-interest', 'indicator-fedfunds']), []);

  const [openAccordion, setOpenAccordion] = useState<string | null>('sentiment');
  const [registrySearch, setRegistrySearch] = useState('');

  const { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine } = _rechartsModule;



  // All panels render immediately — data skeletons handle loading state per-chart
  const [visiblePanels] = useState<Set<string>>(() => new Set([
    'sentiment-oscillator', 'nupl', 'mvrv', 'lth-mvrv', 'sopr', 'sth-mvrv', 'ssr',
    'supply-loss', 'supply-profit', 'realized-profit', 'realized-loss', 'hashrate',
    'dominance', 'social-sentiment', 'trending-coins',
    'puell-multiple', 'mayer-multiple', 'reserve-risk', 'aviv', 'mvrv-zscore',
    'vdd', 'supply-shock', 'active-addresses',
    'illiquid-supply', 'hot-supply', 'hashribbons',
    'nrpl', 'rhodl-ratio', 'open-interest', 'funding-rate',
    'm2', 'dxy', 'vix',
    'fedfunds', 'etf', 'sp500', 'gold',
    'stablecoin-supply', 'ssr-oscillator', 'crypto-market-cap',
    'realized-price', 'market-cap-k4', '200-week-ma',
    'highly-liquid-supply',
    'lth-position-change', 'sth-position-change', 'mpi', 'miner-sell-pressure',
    'utxo-profit', 'utxo-loss',
    'nvts', 'nvt-zscore', 'cvdd',
    'fred-sofr', 'fred-walcl', 'fred-wresbal', 'fred-rrpontsyd', 'fred-cpiaucsl', 'fred-cpilfesl', 'fred-pcepi', 'fred-pcepilfe', 'fred-mich', 'fred-t5yie', 'fred-t10yie', 'fred-dgs1mo', 'fred-dgs3mo', 'fred-dgs6mo', 'fred-dgs1', 'fred-dgs5', 'fred-dgs20', 'fred-dgs30', 'fred-t10y2y', 'fred-t10y3m', 'fred-m1sl', 'fred-mabmm301usm189s', 'fred-unrate', 'fred-payems', 'fred-icsa', 'fred-jtsjol', 'fred-emratio', 'fred-gdpc1', 'fred-indpro', 'fred-houst', 'fred-umcsent', 'fred-rsxfs', 'fred-dcoilwtico', 'fred-bamlh0a0hym2', 'fred-mortgage30us', 'fred-bogmbase', 'fred-totalsl',
  ]));

  // Refs for screenshot capture on each indicator panel
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const setPanelRef = useCallback((key: string) => (el: HTMLDivElement | null) => {
    panelRefs.current[key] = el;
  }, []);


  // Dynamic chart height — taller in maximized mode
  // Viewport height — read once on mount, updated on resize.
  // Avoids synchronous layout reads inside the render callback (`ch`).
  const [vpHeight, setVpHeight] = useState(() => typeof window !== 'undefined' ? window.innerHeight : 1080);
  useEffect(() => {
    const onResize = () => setVpHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const ch = useCallback((panelId: string, normalH = 320) => {
    if (maximizedPanel === panelId) return Math.min(600, vpHeight * 0.65);
    if (selectedIndicator !== null) return Math.max(normalH, Math.min(vpHeight - 410, 600));
    return normalH;
  }, [maximizedPanel, selectedIndicator, vpHeight]);

  // Preload modern-screenshot module on first hover
  const msRef = useRef<Promise<typeof import('modern-screenshot')> | null>(null);
  const preloadCapture = useCallback(() => {
    if (!msRef.current) {
      msRef.current = import('modern-screenshot').catch((err) => {
        msRef.current = null; // clear rejected promise so next try can re-attempt
        throw err;
      });
    }
  }, []);

  // Screenshot capture — modern-screenshot handles CSS gradients, SVG, fonts, backdrop-filter
  const capturePanel = useCallback(async (panelKey: string) => {
    const el = panelRefs.current[panelKey];
    if (!el) return;

    try {
      if (!msRef.current) {
        msRef.current = import('modern-screenshot').catch((err) => {
          msRef.current = null;
          throw err;
        });
      }
      const { domToPng } = await msRef.current;

      const dataUrl = await domToPng(el, {
        backgroundColor: '#0F0F0F',
        scale: Math.max(window.devicePixelRatio, 2),
        filter: (node: Node) => {
          if ((node as HTMLElement)?.hasAttribute?.('data-no-capture')) return false;
          return true;
        },
      });

      // Create final image with watermark using Canvas
      const img = new Image();
      img.onload = () => {
        const watermarkHeight = 40;
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height + watermarkHeight;
        const ctx = canvas.getContext('2d')!;

        // Draw captured panel
        ctx.drawImage(img, 0, 0);

        // Draw watermark bar
        ctx.fillStyle = '#0D0D0F';
        ctx.fillRect(0, img.height, canvas.width, watermarkHeight);

        // Watermark top border
        ctx.fillStyle = '#1C1C1E';
        ctx.fillRect(0, img.height, canvas.width, 1);

        // Watermark text
        ctx.fillStyle = '#444444';
        ctx.font = '20px "JetBrains Mono", monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText('NOVRIX.IO  ·  ON-CHAIN INTELLIGENCE', 32, img.height + watermarkHeight / 2);

        // Date on right
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'right';
        const date = new Date().toISOString().slice(0, 10);
        ctx.fillText(date, canvas.width - 32, img.height + watermarkHeight / 2);

        // Download
        const code = PANEL_CODES[panelKey] ?? panelKey.toUpperCase();
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `NOVRIX-${code}-${date}.png`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'image/png');

        setCapturedPanel(panelKey);
        setTimeout(() => setCapturedPanel(null), 1200);
      };
      img.src = dataUrl;
    } catch {
      // Screenshot failures are non-fatal UI errors; swallow silently in
      // production to avoid leaking internal details to the browser console.
    }
  }, []);

  const timeframes = [
    { label: '1W',  value: '7',    days: 7    },
    { label: '1M',  value: '30',   days: 30   },
    { label: '6M',  value: '180',  days: 180  },
    { label: '1Y',  value: '365',  days: 365  },
    { label: '4Y',  value: '1460', days: 1460 },
    { label: 'ALL', value: '3000', days: 3000 },
  ];



  const macroTickDefault = (v: number) => {
    if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return v.toFixed(2);
  };

  // KEY 4 zone helpers
  const getRealizedPriceZone = (price: number, realized: number) => {
    if (realized <= 0) return { label: 'N/A', color: '#64748B' };
    const ratio = price / realized;
    if (ratio >= 3.5) return { label: 'EXTREME BUBBLE', color: '#C2344D' };
    if (ratio >= 2.5) return { label: 'OVERVALUED',     color: '#EF5350' };
    if (ratio >= 1.5) return { label: 'ELEVATED',       color: '#F59E0B' };
    if (ratio >= 1.0) return { label: 'FAIR',           color: '#4CAF50' };
    return                { label: 'UNDERVALUED',    color: '#00E5FF' };
  };
  const getMarketCapK4Zone = (v: number) => {
    if (v >= 3e12) return { label: 'EXTREME HIGH',  color: '#C2344D' };
    if (v >= 1.5e12) return { label: 'HIGH',        color: '#F59E0B' };
    if (v >= 8e11)  return { label: 'MID',          color: '#4CAF50' };
    return               { label: 'LOW',            color: '#64748B' };
  };
  const getWeekMa200Zone = (price: number, ma: number) => {
    if (ma <= 0) return { label: 'N/A', color: '#64748B' };
    const ratio = price / ma;
    if (ratio >= 3.0) return { label: 'EXTREME BUBBLE', color: '#C2344D' };
    if (ratio >= 2.0) return { label: 'OVEREXTENDED',   color: '#EF5350' };
    if (ratio >= 1.2) return { label: 'ABOVE MA',       color: '#F59E0B' };
    if (ratio >= 0.8) return { label: 'NEAR MA',        color: '#4CAF50' };
    return               { label: 'BELOW MA',       color: '#00E5FF' };
  };
  const getHighlyLiquidZone = (v: number) => {
    if (v >= 4e6)  return { label: 'VERY HIGH SUPPLY', color: '#C2344D' };
    if (v >= 3e6)  return { label: 'HIGH',             color: '#EF5350' };
    if (v >= 2e6)  return { label: 'MODERATE',         color: '#4CAF50' };
    return              { label: 'LOW',               color: '#00E5FF' };
  };
  const getLthPositionChangeZone = (v: number) => {
    if (v > 5000)  return { label: 'STRONG ACCUMULATION', color: '#00FF88' };
    if (v > 500)   return { label: 'ACCUMULATION',        color: '#4CAF50' };
    if (v > -500)  return { label: 'NEUTRAL',             color: '#F59E0B' };
    if (v > -5000) return { label: 'DISTRIBUTION',        color: '#EF5350' };
    return              { label: 'STRONG DISTRIBUTION', color: '#C2344D' };
  };
  const getSthPositionChangeZone = (v: number) => {
    if (v > 2000)  return { label: 'STRONG BUY',   color: '#00FF88' };
    if (v > 200)   return { label: 'BUYING',       color: '#4CAF50' };
    if (v > -200)  return { label: 'NEUTRAL',      color: '#F59E0B' };
    if (v > -2000) return { label: 'SELLING',      color: '#EF5350' };
    return              { label: 'STRONG SELL', color: '#C2344D' };
  };
  const getMpiZone = (v: number) => {
    if (v >= 2.0)  return { label: 'MINER DUMPING',     color: '#C2344D' };
    if (v >= 1.0)  return { label: 'HIGH PRESSURE',     color: '#EF5350' };
    if (v >= 0.5)  return { label: 'MODERATE',          color: '#F59E0B' };
    if (v >= 0.0)  return { label: 'LOW PRESSURE',      color: '#4CAF50' };
    return              { label: 'MINER STOCKPILE', color: '#00E5FF' };
  };
  const getMinerSellPressureZone = (v: number) => {
    if (v >= 0.35) return { label: 'HIGH SELL PRESSURE', color: '#C2344D' };
    if (v >= 0.20) return { label: 'ELEVATED',           color: '#EF5350' };
    if (v >= 0.10) return { label: 'MODERATE',           color: '#F59E0B' };
    return              { label: 'LOW PRESSURE',      color: '#4CAF50' };
  };
  const getUtxoProfitZone = (v: number) => {
    if (v >= 0.97) return { label: 'TOP SIGNAL',   color: '#C2344D' };
    if (v >= 0.90) return { label: 'HIGH PROFIT',  color: '#EF5350' };
    if (v >= 0.70) return { label: 'MAJORITY',     color: '#F59E0B' };
    if (v >= 0.50) return { label: 'MODERATE',     color: '#4CAF50' };
    return              { label: 'LOW PROFIT',  color: '#00E5FF' };
  };
  const getUtxoLossZone = (v: number) => {
    if (v >= 0.50) return { label: 'EXTREME LOSS',  color: '#00E5FF' };
    if (v >= 0.30) return { label: 'HIGH LOSS',     color: '#4CAF50' };
    if (v >= 0.10) return { label: 'MODERATE LOSS', color: '#F59E0B' };
    if (v >= 0.03) return { label: 'MINIMAL',       color: '#EF5350' };
    return              { label: 'VERY LOW',     color: '#C2344D' };
  };
  // KEY 2 zone helpers
  const getPuellZone = (v: number) => {
    if (v >= 4.0) return { label: 'OVERHEATED',  color: '#EF5350' };
    if (v >= 2.0) return { label: 'HIGH',        color: '#F7931A' };
    if (v >= 0.5) return { label: 'FAIR',        color: '#4CAF50' };
    return               { label: 'UNDERVALUED', color: '#10B981' };
  };
  const getMayerMultipleZone = (v: number) => {
    if (v >= 2.4) return { label: 'OVERVALUED',  color: '#EF5350' };
    if (v >= 1.2) return { label: 'ELEVATED',    color: '#F7931A' };
    if (v >= 0.8) return { label: 'NEUTRAL',     color: '#7AAAD0' };
    return               { label: 'UNDERVALUED', color: '#10B981' };
  };
  const getReserveRiskZone = (v: number) => {
    if (v >= 0.02)  return { label: 'HIGH RISK', color: '#EF5350' };
    if (v >= 0.005) return { label: 'MODERATE',  color: '#F7931A' };
    if (v > 0.0026) return { label: 'NEUTRAL',   color: '#7AAAD0' };
    return                 { label: 'LOW RISK',  color: '#10B981' };
  };
  const getAvivZone = (v: number) => {
    if (v >= 5.0) return { label: 'BUBBLE',      color: '#EF5350' };
    if (v >= 2.0) return { label: 'ELEVATED',    color: '#F7931A' };
    if (v >= 0.8) return { label: 'FAIR VALUE',  color: '#7AAAD0' };
    return               { label: 'UNDERVALUED', color: '#10B981' };
  };
  const getVddZone = (v: number) => {
    if (v >= 4.0) return { label: 'OVERHEATED',  color: '#EF5350' };
    if (v >= 2.0) return { label: 'ELEVATED',    color: '#F7931A' };
    if (v >= 0.5) return { label: 'NORMAL',      color: '#7AAAD0' };
    return               { label: 'UNDERVALUED', color: '#10B981' };
  };
  const getHashribbonsSignalZone = (signal: string) => {
    if (!signal) return { label: 'UNKNOWN', color: '#607D8B' };
    const s = signal.toLowerCase();
    if (s === 'recovery' || s === 'up') return { label: signal.toUpperCase(), color: '#10B981' };
    return { label: signal.toUpperCase(), color: '#EF5350' };
  };

  // KEY 3 zone helpers
  const getNrplZone = (v: number) => {
    if (v < 0)      return { label: 'NET LOSS',     color: '#C2344D' };
    if (v < 20000)  return { label: 'ACCUMULATION', color: '#7AAAD0' };
    if (v < 100000) return { label: 'NET PROFIT',   color: '#10B981' };
    return                 { label: 'PEAK PROFIT',  color: '#4CAF50' };
  };
  const getRhodlZone = (v: number) => {
    if (v < 5000)   return { label: 'EXTREME LOW',  color: '#10B981' };
    if (v < 20000)  return { label: 'UNDERVALUED',  color: '#4CAF50' };
    if (v < 50000)  return { label: 'FAIR VALUE',   color: '#7AAAD0' };
    if (v < 100000) return { label: 'OVERVALUED',   color: '#F7931A' };
    return                 { label: 'EXTREME HIGH', color: '#C2344D' };
  };
  const getOpenInterestZone = (v: number) => {
    if (v < 100000) return { label: 'LOW OI',   color: '#7AAAD0' };
    if (v < 300000) return { label: 'MODERATE', color: '#10B981' };
    if (v < 500000) return { label: 'ELEVATED', color: '#F7931A' };
    return                 { label: 'HIGH OI',  color: '#C2344D' };
  };
  const getFundingRateZone = (v: number) => {
    if (v < -0.05) return { label: 'HEAVY SHORT', color: '#C2344D' };
    if (v < 0)     return { label: 'NEGATIVE',    color: '#F7931A' };
    if (v < 0.05)  return { label: 'NEUTRAL',     color: '#7AAAD0' };
    if (v < 0.1)   return { label: 'POSITIVE',    color: '#10B981' };
    return                { label: 'OVERHEATED',  color: '#C2344D' };
  };
  const getMinerNetFlowZone = (v: number) => {
    if (v < -2000) return { label: 'ACCUMULATING', color: '#10B981' };
    if (v < 0)     return { label: 'SLIGHT ACCUM', color: '#4CAF50' };
    if (v < 1000)  return { label: 'NEUTRAL',      color: '#7AAAD0' };
    if (v < 5000)  return { label: 'OUTFLOW',      color: '#F7931A' };
    return                { label: 'HEAVY SELL',   color: '#C2344D' };
  };
  const getMinerReserveZone = (v: number) => {
    if (v < 1600000) return { label: 'DEPLETED', color: '#C2344D' };
    if (v < 1750000) return { label: 'LOW',      color: '#F7931A' };
    if (v < 1900000) return { label: 'NORMAL',   color: '#7AAAD0' };
    return                  { label: 'HIGH',     color: '#10B981' };
  };
  const getNvtsZone = (v: number) => {
    if (v >= 150) return { label: 'OVERVALUED',  color: '#EF5350' };
    if (v >= 90)  return { label: 'ELEVATED',    color: '#F7931A' };
    if (v >= 45)  return { label: 'FAIR VALUE',  color: '#7AAAD0' };
    return               { label: 'UNDERVALUED', color: '#10B981' };
  };
  const getNvtZscoreZone = (v: number) => {
    if (v >= 2.0)  return { label: 'OVERVALUED',  color: '#EF5350' };
    if (v >= 1.0)  return { label: 'ELEVATED',    color: '#F7931A' };
    if (v >= -1.0) return { label: 'NEUTRAL',     color: '#7AAAD0' };
    return                { label: 'UNDERVALUED', color: '#10B981' };
  };
  const getCvddZone = (v: number) => {
    if (v >= 40000) return { label: 'HIGH',       color: '#F7931A' };
    if (v >= 10000) return { label: 'MODERATE',   color: '#7AAAD0' };
    return                 { label: 'UNDERVALUED', color: '#10B981' };
  };
  // KEY 5 macro zone helpers
  const getM2Zone = (v: number) => {
    if (v >= 21000000000000) return { label: 'EXPANDING', color: '#10B981' };
    if (v >= 18000000000000) return { label: 'STABLE',    color: '#7AAAD0' };
    return                         { label: 'CONTRACTING', color: '#EF5350' };
  };
  const getDxyZone = (v: number) => {
    if (v >= 105) return { label: 'STRONG USD', color: '#EF5350' };
    if (v >= 100) return { label: 'ELEVATED',   color: '#F7931A' };
    if (v >= 95)  return { label: 'NEUTRAL',    color: '#7AAAD0' };
    return               { label: 'WEAK USD',   color: '#10B981' };
  };
  const getVixZone = (v: number) => {
    if (v >= 40) return { label: 'PANIC',     color: '#EF5350' };
    if (v >= 30) return { label: 'HIGH FEAR', color: '#F7931A' };
    if (v >= 20) return { label: 'ELEVATED',  color: '#F59E0B' };
    if (v >= 12) return { label: 'NORMAL',    color: '#7AAAD0' };
    return              { label: 'COMPLACENCY', color: '#A855F7' };
  };
  const getFedfundsZone = (v: number) => {
    if (v >= 5) return { label: 'RESTRICTIVE',    color: '#EF5350' };
    if (v >= 3) return { label: 'HIGH',           color: '#F7931A' };
    if (v >= 1) return { label: 'MODERATE',       color: '#7AAAD0' };
    return             { label: 'ACCOMMODATIVE',  color: '#10B981' };
  };
  const getEtfZone = (v: number) => {
    if (v >= 100e9) return { label: 'VERY HIGH', color: '#10B981' };
    if (v >= 50e9)  return { label: 'HIGH',      color: '#4CAF50' };
    if (v >= 10e9)  return { label: 'GROWING',   color: '#7AAAD0' };
    return                 { label: 'LOW',       color: '#64748B' };
  };
  const getSp500Zone = (v: number) => {
    if (v >= 5500) return { label: 'ATH TERRITORY', color: '#10B981' };
    if (v >= 4000) return { label: 'BULL MARKET',   color: '#4CAF50' };
    if (v >= 3000) return { label: 'RECOVERY',      color: '#7AAAD0' };
    return                { label: 'BEAR MARKET',   color: '#EF5350' };
  };
  const getGoldZone = (v: number) => {
    if (v >= 3000) return { label: 'ATH TERRITORY', color: '#F59E0B' };
    if (v >= 2000) return { label: 'ELEVATED',      color: '#FBBF24' };
    if (v >= 1500) return { label: 'NORMAL',        color: '#7AAAD0' };
    return                { label: 'LOW',           color: '#64748B' };
  };
  const getStablecoinSupplyZone = (v: number) => {
    if (v >= 200e9) return { label: 'VERY HIGH', color: '#10B981' };
    if (v >= 150e9) return { label: 'HIGH',      color: '#4CAF50' };
    if (v >= 80e9)  return { label: 'ELEVATED',  color: '#7AAAD0' };
    return                 { label: 'LOW',       color: '#64748B' };
  };
  const getSsrOscillatorZone = (v: number) => {
    if (v >= 1)    return { label: 'OVERBOUGHT', color: '#EF5350' };
    if (v >= 0.5)  return { label: 'ELEVATED',   color: '#F7931A' };
    if (v >= -0.5) return { label: 'NEUTRAL',    color: '#7AAAD0' };
    return                { label: 'OVERSOLD',   color: '#10B981' };
  };
  const getCryptoMarketCapZone = (v: number) => {
    if (v >= 3e12) return { label: 'BULL TERRITORY', color: '#10B981' };
    if (v >= 2e12) return { label: 'ELEVATED',       color: '#4CAF50' };
    if (v >= 1e12) return { label: 'RECOVERY',       color: '#7AAAD0' };
    return                { label: 'LOW',            color: '#64748B' };
  };
  const getSofrZone = (v: number) => {
    if (v >= 5.0) return { label: 'RESTRICTIVE', color: '#EF5350' };
    if (v >= 3.0) return { label: 'HIGH',        color: '#F7931A' };
    if (v >= 1.5) return { label: 'MODERATE',    color: '#7AAAD0' };
    return               { label: 'EASY',        color: '#10B981' };
  };
  const getWalclZone = (v: number) => {
    if (v >= 9000000.0) return { label: 'EXPANDING', color: '#10B981' };
    if (v >= 7000000.0) return { label: 'STABLE',    color: '#7AAAD0' };
    return                     { label: 'CONTRACTING', color: '#EF5350' };
  };
  const getWresbalZone = (v: number) => {
    if (v >= 3000000.0) return { label: 'HIGH',     color: '#10B981' };
    if (v >= 1000000.0) return { label: 'MODERATE', color: '#7AAAD0' };
    return                     { label: 'LOW',      color: '#EF5350' };
  };
  const getRrpontsydZone = (v: number) => {
    if (v >= 2000000.0) return { label: 'VERY HIGH', color: '#EF5350' };
    if (v >= 500000.0)  return { label: 'HIGH',      color: '#F7931A' };
    if (v >= 100000.0)  return { label: 'ELEVATED',  color: '#7AAAD0' };
    return                     { label: 'LOW',       color: '#10B981' };
  };
  const getCpiaucslZone = (v: number) => {
    if (v >= 6.0) return { label: 'HIGH INFLATION', color: '#EF5350' };
    if (v >= 4.0) return { label: 'ELEVATED',       color: '#F7931A' };
    if (v >= 2.0) return { label: 'NORMAL',         color: '#7AAAD0' };
    return               { label: 'LOW',            color: '#10B981' };
  };
  const getCpilfeslZone = (v: number) => {
    if (v >= 6.0) return { label: 'HIGH INFLATION', color: '#EF5350' };
    if (v >= 4.0) return { label: 'ELEVATED',       color: '#F7931A' };
    if (v >= 2.0) return { label: 'NORMAL',         color: '#7AAAD0' };
    return               { label: 'LOW',            color: '#10B981' };
  };
  const getPcepiZone = (v: number) => {
    if (v >= 6.0) return { label: 'HIGH INFLATION', color: '#EF5350' };
    if (v >= 4.0) return { label: 'ELEVATED',       color: '#F7931A' };
    if (v >= 2.0) return { label: 'NORMAL',         color: '#7AAAD0' };
    return               { label: 'LOW',            color: '#10B981' };
  };
  const getPcepilfeZone = (v: number) => {
    if (v >= 6.0) return { label: 'HIGH INFLATION', color: '#EF5350' };
    if (v >= 4.0) return { label: 'ELEVATED',       color: '#F7931A' };
    if (v >= 2.0) return { label: 'NORMAL',         color: '#7AAAD0' };
    return               { label: 'LOW',            color: '#10B981' };
  };
  const getMichZone = (v: number) => {
    if (v >= 5.0) return { label: 'HIGH EXPECT', color: '#EF5350' };
    if (v >= 3.0) return { label: 'ELEVATED',    color: '#F7931A' };
    if (v >= 2.0) return { label: 'NORMAL',      color: '#7AAAD0' };
    return               { label: 'LOW',         color: '#10B981' };
  };
  const getT5yieZone = (v: number) => {
    if (v >= 3.0) return { label: 'HIGH',     color: '#EF5350' };
    if (v >= 2.5) return { label: 'ELEVATED', color: '#F7931A' };
    if (v >= 2.0) return { label: 'NORMAL',   color: '#10B981' };
    return               { label: 'LOW',      color: '#7AAAD0' };
  };
  const getT10yieZone = (v: number) => {
    if (v >= 3.0) return { label: 'HIGH',     color: '#EF5350' };
    if (v >= 2.5) return { label: 'ELEVATED', color: '#F7931A' };
    if (v >= 2.0) return { label: 'NORMAL',   color: '#10B981' };
    return               { label: 'LOW',      color: '#7AAAD0' };
  };
  const getDgs1moZone = (v: number) => {
    if (v >= 5.0) return { label: 'VERY HIGH', color: '#EF5350' };
    if (v >= 4.0) return { label: 'HIGH',      color: '#F7931A' };
    if (v >= 2.0) return { label: 'ELEVATED',  color: '#FCD34D' };
    return               { label: 'LOW',       color: '#10B981' };
  };
  const getDgs3moZone = (v: number) => {
    if (v >= 5.0) return { label: 'VERY HIGH', color: '#EF5350' };
    if (v >= 4.0) return { label: 'HIGH',      color: '#F7931A' };
    if (v >= 2.0) return { label: 'ELEVATED',  color: '#FCD34D' };
    return               { label: 'LOW',       color: '#10B981' };
  };
  const getDgs6moZone = (v: number) => {
    if (v >= 5.0) return { label: 'VERY HIGH', color: '#EF5350' };
    if (v >= 4.0) return { label: 'HIGH',      color: '#F7931A' };
    if (v >= 2.0) return { label: 'ELEVATED',  color: '#FCD34D' };
    return               { label: 'LOW',       color: '#10B981' };
  };
  const getDgs1Zone = (v: number) => {
    if (v >= 5.0) return { label: 'VERY HIGH', color: '#EF5350' };
    if (v >= 4.0) return { label: 'HIGH',      color: '#F7931A' };
    if (v >= 2.0) return { label: 'ELEVATED',  color: '#FCD34D' };
    return               { label: 'LOW',       color: '#10B981' };
  };
  const getDgs5Zone = (v: number) => {
    if (v >= 5.0) return { label: 'VERY HIGH', color: '#EF5350' };
    if (v >= 4.0) return { label: 'HIGH',      color: '#F7931A' };
    if (v >= 2.0) return { label: 'ELEVATED',  color: '#FCD34D' };
    return               { label: 'LOW',       color: '#10B981' };
  };
  const getDgs20Zone = (v: number) => {
    if (v >= 5.0) return { label: 'VERY HIGH', color: '#EF5350' };
    if (v >= 4.0) return { label: 'HIGH',      color: '#F7931A' };
    if (v >= 2.0) return { label: 'ELEVATED',  color: '#FCD34D' };
    return               { label: 'LOW',       color: '#10B981' };
  };
  const getDgs30Zone = (v: number) => {
    if (v >= 5.0) return { label: 'VERY HIGH', color: '#EF5350' };
    if (v >= 4.0) return { label: 'HIGH',      color: '#F7931A' };
    if (v >= 2.0) return { label: 'ELEVATED',  color: '#FCD34D' };
    return               { label: 'LOW',       color: '#10B981' };
  };
  const getT10y2yZone = (v: number) => {
    if (v >= 0.5)  return { label: 'NORMAL',         color: '#10B981' };
    if (v >= 0.0)  return { label: 'FLAT',           color: '#7AAAD0' };
    if (v >= -0.5) return { label: 'INVERTED',       color: '#F7931A' };
    return                { label: 'DEEP INVERSION', color: '#EF5350' };
  };
  const getT10y3mZone = (v: number) => {
    if (v >= 0.5)  return { label: 'NORMAL',         color: '#10B981' };
    if (v >= 0.0)  return { label: 'FLAT',           color: '#7AAAD0' };
    if (v >= -0.5) return { label: 'INVERTED',       color: '#F7931A' };
    return                { label: 'DEEP INVERSION', color: '#EF5350' };
  };
  const getM1slZone = (v: number) => {
    if (v >= 22000.0) return { label: 'EXPANDING',   color: '#10B981' };
    if (v >= 18000.0) return { label: 'STABLE',      color: '#7AAAD0' };
    return                   { label: 'CONTRACTING', color: '#EF5350' };
  };
  const getMabmm301Zone = (v: number) => {
    if (v >= 22000.0) return { label: 'EXPANDING',   color: '#10B981' };
    if (v >= 18000.0) return { label: 'STABLE',      color: '#7AAAD0' };
    return                   { label: 'CONTRACTING', color: '#EF5350' };
  };
  const getUnrateZone = (v: number) => {
    if (v <= 4.0) return { label: 'STRONG LABOR',  color: '#10B981' };
    if (v <= 5.0) return { label: 'NORMAL',        color: '#7AAAD0' };
    if (v <= 7.0) return { label: 'ELEVATED',      color: '#F7931A' };
    return               { label: 'HIGH UNEMPLOYMNT', color: '#EF5350' };
  };
  const getPayemsZone = (v: number) => {
    if (v >= 160000.0) return { label: 'STRONG',    color: '#10B981' };
    if (v >= 155000.0) return { label: 'NORMAL',    color: '#7AAAD0' };
    if (v >= 150000.0) return { label: 'RECOVERING', color: '#F7931A' };
    return                    { label: 'WEAK',      color: '#EF5350' };
  };
  const getIcsaZone = (v: number) => {
    if (v <= 200000.0) return { label: 'LOW CLAIMS', color: '#10B981' };
    if (v <= 250000.0) return { label: 'NORMAL',     color: '#7AAAD0' };
    if (v <= 300000.0) return { label: 'ELEVATED',   color: '#F7931A' };
    return                    { label: 'HIGH',       color: '#EF5350' };
  };
  const getJtsjolZone = (v: number) => {
    if (v >= 10000.0) return { label: 'VERY TIGHT', color: '#10B981' };
    if (v >= 8000.0)  return { label: 'TIGHT',      color: '#7AAAD0' };
    if (v >= 6000.0)  return { label: 'NORMAL',     color: '#F7931A' };
    return                   { label: 'SOFT',       color: '#EF5350' };
  };
  const getEmratioZone = (v: number) => {
    if (v >= 62.0) return { label: 'HIGH PARTICIP', color: '#10B981' };
    if (v >= 60.0) return { label: 'NORMAL',        color: '#7AAAD0' };
    if (v >= 58.0) return { label: 'LOW',           color: '#F7931A' };
    return                { label: 'VERY LOW',      color: '#EF5350' };
  };
  const getGdpc1Zone = (v: number) => {
    if (v >= 25000.0) return { label: 'STRONG',   color: '#10B981' };
    if (v >= 22000.0) return { label: 'GROWING',  color: '#7AAAD0' };
    if (v >= 20000.0) return { label: 'MODERATE', color: '#F7931A' };
    return                   { label: 'WEAK',     color: '#EF5350' };
  };
  const getIndproZone = (v: number) => {
    if (v >= 105) return { label: 'HIGH',   color: '#10B981' };
    if (v >= 100) return { label: 'NORMAL', color: '#7AAAD0' };
    if (v >= 95)  return { label: 'LOW',    color: '#F7931A' };
    return               { label: 'VERY LOW', color: '#EF5350' };
  };
  const getHoustZone = (v: number) => {
    if (v >= 1500) return { label: 'STRONG', color: '#10B981' };
    if (v >= 1200) return { label: 'NORMAL', color: '#7AAAD0' };
    if (v >= 800)  return { label: 'LOW',    color: '#F7931A' };
    return                { label: 'WEAK',  color: '#EF5350' };
  };
  const getUmcsentZone = (v: number) => {
    if (v >= 90) return { label: 'HIGH CONFIDENCE', color: '#10B981' };
    if (v >= 70) return { label: 'MODERATE',        color: '#7AAAD0' };
    if (v >= 55) return { label: 'LOW',             color: '#F7931A' };
    return              { label: 'VERY LOW',        color: '#EF5350' };
  };
  const getRsxfsZone = (v: number) => {
    if (v >= 700000.0) return { label: 'STRONG',    color: '#10B981' };
    if (v >= 600000.0) return { label: 'NORMAL',    color: '#7AAAD0' };
    if (v >= 500000.0) return { label: 'WEAK',      color: '#F7931A' };
    return                    { label: 'VERY WEAK', color: '#EF5350' };
  };
  const getDcoilwticoZone = (v: number) => {
    if (v >= 100) return { label: 'VERY HIGH', color: '#EF5350' };
    if (v >= 80)  return { label: 'HIGH',      color: '#F7931A' };
    if (v >= 60)  return { label: 'MODERATE',  color: '#7AAAD0' };
    return               { label: 'LOW',       color: '#10B981' };
  };
  const getBamlh0a0hym2Zone = (v: number) => {
    if (v >= 8.0) return { label: 'STRESS',   color: '#EF5350' };
    if (v >= 5.0) return { label: 'ELEVATED', color: '#F7931A' };
    if (v >= 3.0) return { label: 'NORMAL',   color: '#7AAAD0' };
    return               { label: 'LOW',      color: '#10B981' };
  };
  const getMortgage30usZone = (v: number) => {
    if (v >= 7.0) return { label: 'VERY HIGH',  color: '#EF5350' };
    if (v >= 6.0) return { label: 'HIGH',       color: '#F7931A' };
    if (v >= 4.0) return { label: 'ELEVATED',   color: '#F59E0B' };
    return               { label: 'LOW',        color: '#10B981' };
  };
  const getBogmbaseZone = (v: number) => {
    if (v >= 7000.0) return { label: 'EXPANDING',   color: '#10B981' };
    if (v >= 4000.0) return { label: 'STABLE',      color: '#7AAAD0' };
    return                  { label: 'CONTRACTING', color: '#EF5350' };
  };
  const getTotalslZone = (v: number) => {
    if (v >= 5000.0) return { label: 'VERY HIGH', color: '#EF5350' };
    if (v >= 4000.0) return { label: 'HIGH',      color: '#F7931A' };
    if (v >= 3000.0) return { label: 'ELEVATED',  color: '#7AAAD0' };
    return                  { label: 'LOW',       color: '#10B981' };
  };

  // KEY 4 panels array (simple single-line panels)
  const key4SimplePanels = useMemo<SentimentPanelConfig[]>(() => [
    {
      panelId: 'market-cap-k4', indicatorKey: 'marketCapK4', code: 'MCAP', title: 'Bitcoin Market Cap', desc: 'Total BTC market capitalization', metricLabel: 'MARKET CAP',
      id: 'indicator-market-cap-k4', accentColor: '#F7931A', gradientId: 'marketCapK4Fill', tag: '',
      data: marketCapK4ChartData, dataWithPrice: marketCapK4ChartDataWithPrice, isLoading: isMarketCapK4Loading,
      timeframe: marketCapK4Timeframe, setTimeframe: setMarketCapK4Timeframe, zoneFn: getMarketCapK4Zone,
      headerValue: (v: number) => `$${macroTickDefault(v)}`, tooltipValue: (v: number) => `$${macroTickDefault(v)}`,
      yAxisTick: (v: number) => `$${macroTickDefault(v)}`,
    },
    {
      panelId: 'highly-liquid-supply', indicatorKey: 'highlyLiquid', code: 'HLIQ', title: 'Highly Liquid BTC Supply', desc: 'BTC held in highly liquid entities', metricLabel: 'HIGHLY LIQUID',
      id: 'indicator-highly-liquid-supply', accentColor: '#00E5FF', gradientId: 'highlyLiquidFill', tag: '',
      data: highlyLiquidChartData, dataWithPrice: highlyLiquidChartDataWithPrice, isLoading: isHighlyLiquidLoading,
      timeframe: highlyLiquidTimeframe, setTimeframe: setHighlyLiquidTimeframe, zoneFn: getHighlyLiquidZone,
      headerValue: (v: number) => `${macroTickDefault(v)} BTC`, tooltipValue: (v: number) => `${macroTickDefault(v)} BTC`,
      yAxisTick: (v: number) => macroTickDefault(v),
    },
    {
      panelId: 'lth-position-change', indicatorKey: 'lthPositionChange', code: 'LTHPC', title: 'LTH Position Change', desc: 'Long-term holder position change (BTC/day)', metricLabel: 'LTH Δ',
      id: 'indicator-lth-position-change', accentColor: '#4CAF50', gradientId: 'lthPositionChangeFill', tag: '',
      data: lthPositionChangeChartData, dataWithPrice: lthPositionChangeChartDataWithPrice, isLoading: isLthPositionChangeLoading,
      timeframe: lthPositionChangeTimeframe, setTimeframe: setLthPositionChangeTimeframe, zoneFn: getLthPositionChangeZone,
      headerValue: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)} BTC`, tooltipValue: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)} BTC`,
      yAxisTick: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v >= -1000 ? v.toFixed(0) : `${(v/1000).toFixed(0)}K`,
    },
    {
      panelId: 'sth-position-change', indicatorKey: 'sthPositionChange', code: 'STHPC', title: 'STH Position Change', desc: 'Short-term holder position change (BTC/day)', metricLabel: 'STH Δ',
      id: 'indicator-sth-position-change', accentColor: '#EF5350', gradientId: 'sthPositionChangeFill', tag: '',
      data: sthPositionChangeChartData, dataWithPrice: sthPositionChangeChartDataWithPrice, isLoading: isSthPositionChangeLoading,
      timeframe: sthPositionChangeTimeframe, setTimeframe: setSthPositionChangeTimeframe, zoneFn: getSthPositionChangeZone,
      headerValue: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)} BTC`, tooltipValue: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)} BTC`,
      yAxisTick: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v >= -1000 ? v.toFixed(0) : `${(v/1000).toFixed(0)}K`,
    },
    {
      panelId: 'mpi', indicatorKey: 'mpi', code: 'MPI', title: 'Miners Position Index', desc: 'Miner outflow relative to 1Y average (>2 = dumping)', metricLabel: 'MPI',
      id: 'indicator-mpi', accentColor: '#F59E0B', gradientId: 'mpiFill', tag: '',
      data: mpiChartData, dataWithPrice: mpiChartDataWithPrice, isLoading: isMpiLoading,
      timeframe: mpiTimeframe, setTimeframe: setMpiTimeframe, zoneFn: getMpiZone,
      headerValue: (v: number) => v.toFixed(2), tooltipValue: (v: number) => v.toFixed(2),
      yAxisTick: (v: number) => v.toFixed(1),
    },
    {
      panelId: 'miner-sell-pressure', indicatorKey: 'minerSellPressure', code: 'MINSP', title: 'Miner Sell Pressure', desc: 'Ratio of miner outflows to market volume', metricLabel: 'SELL PRESSURE',
      id: 'indicator-miner-sell-pressure', accentColor: '#EF5350', gradientId: 'minerSellPressureFill', tag: '',
      data: minerSellPressureChartData, dataWithPrice: minerSellPressureChartDataWithPrice, isLoading: isMinerSellPressureLoading,
      timeframe: minerSellPressureTimeframe, setTimeframe: setMinerSellPressureTimeframe, zoneFn: getMinerSellPressureZone,
      headerValue: (v: number) => v.toFixed(4), tooltipValue: (v: number) => v.toFixed(4),
      yAxisTick: (v: number) => v.toFixed(3),
    },
    {
      panelId: 'utxo-profit', indicatorKey: 'utxoProfit', code: 'UTXOP', title: 'UTXO in Profit', desc: '% of UTXOs currently in profit', metricLabel: 'UTXO PROFIT',
      id: 'indicator-utxo-profit', accentColor: '#4CAF50', gradientId: 'utxoProfitFill', tag: '',
      data: utxoProfitChartData, dataWithPrice: utxoProfitChartDataWithPrice, isLoading: isUtxoProfitLoading,
      timeframe: utxoProfitTimeframe, setTimeframe: setUtxoProfitTimeframe, zoneFn: getUtxoProfitZone,
      headerValue: (v: number) => `${(v * 100).toFixed(1)}%`, tooltipValue: (v: number) => `${(v * 100).toFixed(2)}%`,
      yAxisTick: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    {
      panelId: 'utxo-loss', indicatorKey: 'utxoLoss', code: 'UTXOL', title: 'UTXO in Loss', desc: '% of UTXOs currently at a loss', metricLabel: 'UTXO LOSS',
      id: 'indicator-utxo-loss', accentColor: '#C2344D', gradientId: 'utxoLossFill', tag: '',
      data: utxoLossChartData, dataWithPrice: utxoLossChartDataWithPrice, isLoading: isUtxoLossLoading,
      timeframe: utxoLossTimeframe, setTimeframe: setUtxoLossTimeframe, zoneFn: getUtxoLossZone,
      headerValue: (v: number) => `${(v * 100).toFixed(1)}%`, tooltipValue: (v: number) => `${(v * 100).toFixed(2)}%`,
      yAxisTick: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
  ], [
    marketCapK4ChartData, marketCapK4ChartDataWithPrice, isMarketCapK4Loading, marketCapK4Timeframe,
    highlyLiquidChartData, highlyLiquidChartDataWithPrice, isHighlyLiquidLoading, highlyLiquidTimeframe,
    lthPositionChangeChartData, lthPositionChangeChartDataWithPrice, isLthPositionChangeLoading, lthPositionChangeTimeframe,
    sthPositionChangeChartData, sthPositionChangeChartDataWithPrice, isSthPositionChangeLoading, sthPositionChangeTimeframe,
    mpiChartData, mpiChartDataWithPrice, isMpiLoading, mpiTimeframe,
    minerSellPressureChartData, minerSellPressureChartDataWithPrice, isMinerSellPressureLoading, minerSellPressureTimeframe,
    utxoProfitChartData, utxoProfitChartDataWithPrice, isUtxoProfitLoading, utxoProfitTimeframe,
    utxoLossChartData, utxoLossChartDataWithPrice, isUtxoLossLoading, utxoLossTimeframe,
  ]);

  const macroPanels = useMemo<SentimentPanelConfig[]>(() => [
    {
      panelId: 'm2', indicatorKey: 'm2', code: 'M2', title: 'M2 Money Supply', desc: 'US money supply vs BTC price', metricLabel: 'M2',
      id: 'indicator-m2', accentColor: '#10B981', gradientId: 'm2Fill', tag: '', updateFreq: 'w',
      data: m2ChartData, dataWithPrice: m2ChartDataWithPrice, isLoading: isM2Loading,
      timeframe: m2Timeframe, setTimeframe: setM2Timeframe, zoneFn: getM2Zone,
      headerValue: (v: number) => `$${(v / 1e12).toFixed(2)}T`, tooltipValue: (v: number) => `$${(v / 1e12).toFixed(2)}T`,
      yAxisTick: (v: number) => `$${(v / 1e12).toFixed(1)}T`,
    },
    {
      panelId: 'dxy', indicatorKey: 'dxy', code: 'DXY', title: 'US Dollar Index', desc: 'DXY strength against major currencies', metricLabel: 'DXY',
      id: 'indicator-dxy', accentColor: '#60A5FA', gradientId: 'dxyFill', tag: '', hideBtcPrice: true, updateFreq: 'd',
      data: dxyChartData, dataWithPrice: dxyChartDataWithPrice, isLoading: isDxyLoading,
      timeframe: dxyTimeframe, setTimeframe: setDxyTimeframe, zoneFn: getDxyZone,
      headerValue: (v: number) => v.toFixed(2), tooltipValue: (v: number) => v.toFixed(2),
      yAxisTick: (v: number) => v.toFixed(1),
    },
    {
      panelId: 'vix', indicatorKey: 'vix', code: 'VIX', title: 'Volatility Index', desc: 'Implied volatility and risk appetite', metricLabel: 'VIX',
      id: 'indicator-vix', accentColor: '#F59E0B', gradientId: 'vixFill', tag: '', hideBtcPrice: true, updateFreq: 'd',
      data: vixChartData, dataWithPrice: vixChartDataWithPrice, isLoading: isVixLoading,
      timeframe: vixTimeframe, setTimeframe: setVixTimeframe, zoneFn: getVixZone,
      headerValue: (v: number) => v.toFixed(2), tooltipValue: (v: number) => v.toFixed(2),
      yAxisTick: (v: number) => v.toFixed(1),
    },
    {
      panelId: 'fedfunds', indicatorKey: 'fedfunds', code: 'FED', title: 'Fed Funds Rate', desc: 'Federal Reserve policy rate', metricLabel: 'FED FUNDS',
      id: 'indicator-fedfunds', accentColor: '#F97316', gradientId: 'fedfundsFill', tag: '', hideBtcPrice: true, useFredTfOpts: true, updateFreq: 'm',
      data: fedfundsChartData, dataWithPrice: fedfundsChartDataWithPrice, isLoading: isFedfundsLoading,
      timeframe: fedfundsTimeframe, setTimeframe: setFedfundsTimeframe, zoneFn: getFedfundsZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      panelId: 'etf', indicatorKey: 'etf', code: 'ETF', title: 'ETF Assets Under Management', desc: 'Aggregate ETF AUM exposure', metricLabel: 'ETF AUM',
      id: 'indicator-etf', accentColor: '#14B8A6', gradientId: 'etfFill', tag: '',
      data: etfChartData, dataWithPrice: etfChartDataWithPrice, isLoading: isEtfLoading,
      timeframe: etfTimeframe, setTimeframe: setEtfTimeframe, zoneFn: getEtfZone,
      headerValue: (v: number) => `$${macroTickDefault(v)}`, tooltipValue: (v: number) => `$${macroTickDefault(v)}`,
      yAxisTick: (v: number) => `$${macroTickDefault(v)}`,
    },
    {
      panelId: 'sp500', indicatorKey: 'sp500', code: 'SPX', title: 'S&P 500 Index', desc: 'US equity risk benchmark', metricLabel: 'S&P 500',
      id: 'indicator-sp500', accentColor: '#0EA5E9', gradientId: 'sp500Fill', tag: '', hideBtcPrice: true, updateFreq: 'd',
      data: sp500ChartData, dataWithPrice: sp500ChartDataWithPrice, isLoading: isSp500Loading,
      timeframe: sp500Timeframe, setTimeframe: setSp500Timeframe, zoneFn: getSp500Zone,
      headerValue: (v: number) => v.toFixed(2), tooltipValue: (v: number) => v.toFixed(2),
      yAxisTick: (v: number) => v.toFixed(0),
    },
    {
      panelId: 'gold', indicatorKey: 'gold', code: 'GOLD', title: 'Gold Spot Price', desc: 'Gold as macro hedge reference', metricLabel: 'GOLD',
      id: 'indicator-gold', accentColor: '#EAB308', gradientId: 'goldFill', tag: '', hideBtcPrice: true, updateFreq: 'd',
      data: goldChartData, dataWithPrice: goldChartDataWithPrice, isLoading: isGoldLoading,
      timeframe: goldTimeframe, setTimeframe: setGoldTimeframe, zoneFn: getGoldZone,
      headerValue: (v: number) => `$${v.toFixed(2)}`, tooltipValue: (v: number) => `$${v.toFixed(2)}`,
      yAxisTick: (v: number) => `$${v.toFixed(0)}`,
    },
    {
      panelId: 'stablecoin-supply', indicatorKey: 'stablecoinSupply', code: 'STBS', title: 'Stablecoin Supply', desc: 'Aggregate stablecoin issuance', metricLabel: 'STABLECOIN',
      id: 'indicator-stablecoin-supply', accentColor: '#06B6D4', gradientId: 'stablecoinSupplyFill', tag: '',
      data: stablecoinSupplyChartData, dataWithPrice: stablecoinSupplyChartDataWithPrice, isLoading: isStablecoinSupplyLoading,
      timeframe: stablecoinSupplyTimeframe, setTimeframe: setStablecoinSupplyTimeframe, zoneFn: getStablecoinSupplyZone,
      headerValue: (v: number) => `$${macroTickDefault(v)}`, tooltipValue: (v: number) => `$${macroTickDefault(v)}`,
      yAxisTick: (v: number) => `$${macroTickDefault(v)}`,
    },
    {
      panelId: 'ssr-oscillator', indicatorKey: 'ssrOscillator', code: 'SSRO', title: 'SSR Oscillator', desc: 'Stablecoin ratio oscillator', metricLabel: 'SSR OSC',
      id: 'indicator-ssr-oscillator', accentColor: '#8B5CF6', gradientId: 'ssrOscillatorFill', tag: '',
      data: ssrOscillatorChartData, dataWithPrice: ssrOscillatorChartDataWithPrice, isLoading: isSsrOscillatorLoading,
      timeframe: ssrOscillatorTimeframe, setTimeframe: setSsrOscillatorTimeframe, zoneFn: getSsrOscillatorZone,
      referenceBands: SSR_OSCILLATOR_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(4), tooltipValue: (v: number) => v.toFixed(4),
      yAxisTick: (v: number) => v.toFixed(2),
    },
    {
      panelId: 'crypto-market-cap', indicatorKey: 'cryptoMarketCap', code: 'CMCAP', title: 'Crypto Market Cap', desc: 'Total crypto market capitalization', metricLabel: 'CRYPTO CAP',
      id: 'indicator-crypto-market-cap', accentColor: '#34D399', gradientId: 'cryptoMarketCapFill', tag: '',
      data: cryptoMarketCapChartData, dataWithPrice: cryptoMarketCapChartDataWithPrice, isLoading: isCryptoMarketCapLoading,
      timeframe: cryptoMarketCapTimeframe, setTimeframe: setCryptoMarketCapTimeframe, zoneFn: getCryptoMarketCapZone,
      headerValue: (v: number) => `$${macroTickDefault(v)}`, tooltipValue: (v: number) => `$${macroTickDefault(v)}`,
      yAxisTick: (v: number) => `$${macroTickDefault(v)}`,
    },
    // FRED extended macro panels
    {
      panelId: 'fred-sofr', indicatorKey: 'sofr', code: 'SOFR', title: 'Repo Rate (SOFR)', desc: 'Secured Overnight Financing Rate — overnight repo market', metricLabel: 'SOFR',
      id: 'indicator-fred-sofr', accentColor: '#34D399', gradientId: 'sofrFill', tag: '', updateFreq: 'd',
      data: sofrChartData, dataWithPrice: sofrChartData, isLoading: isSofrLoading,
      timeframe: sofrTimeframe, setTimeframe: setSofrTimeframe, zoneFn: getSofrZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-walcl', indicatorKey: 'walcl', code: 'WALCL', title: 'Fed Balance Sheet', desc: 'Total assets held by the Federal Reserve', metricLabel: 'BAL SHEET',
      id: 'indicator-fred-walcl', accentColor: '#F97316', gradientId: 'walclFill', tag: '', updateFreq: 'w',
      data: walclChartData, dataWithPrice: walclChartDataWithPrice, isLoading: isWalclLoading,
      timeframe: walclTimeframe, setTimeframe: setWalclTimeframe, zoneFn: getWalclZone,
      headerValue: (v: number) => `$${(v/1e6).toFixed(1)}T`, tooltipValue: (v: number) => `$${(v/1e6).toFixed(1)}T`,
      yAxisTick: (v: number) => `$${(v/1e6).toFixed(0)}T`,
    },
    {
      panelId: 'fred-wresbal', indicatorKey: 'wresbal', code: 'WRESBAL', title: 'Bank Reserves', desc: 'Total reserves held by depository institutions', metricLabel: 'RESERVES',
      id: 'indicator-fred-wresbal', accentColor: '#FB923C', gradientId: 'wresbalFill', tag: '', updateFreq: 'w',
      data: wresbalChartData, dataWithPrice: wresbalChartDataWithPrice, isLoading: isWresbalLoading,
      timeframe: wresbalTimeframe, setTimeframe: setWresbalTimeframe, zoneFn: getWresbalZone,
      headerValue: (v: number) => `$${(v/1e6).toFixed(1)}T`, tooltipValue: (v: number) => `$${(v/1e6).toFixed(1)}T`,
      yAxisTick: (v: number) => `$${(v/1e6).toFixed(0)}T`,
    },
    {
      panelId: 'fred-rrpontsyd', indicatorKey: 'rrpontsyd', code: 'RRPONTSYD', title: 'Reverse Repo Facility', desc: 'Overnight reverse repurchase agreements — balance in $B', metricLabel: 'REV REPO',
      id: 'indicator-fred-rrpontsyd', accentColor: '#10B981', gradientId: 'rrpontsydFill', tag: '', updateFreq: 'd',
      data: rrpontsydChartData, dataWithPrice: rrpontsydChartDataWithPrice, isLoading: isRrpontsydLoading,
      timeframe: rrpontsydTimeframe, setTimeframe: setRrpontsydTimeframe, zoneFn: getRrpontsydZone,
      headerValue: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(2)}T` : `$${v.toFixed(1)}B`,
      tooltipValue: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(2)}T` : `$${v.toFixed(1)}B`,
      yAxisTick: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(1)}T` : `$${v.toFixed(0)}B`,
    },
    {
      panelId: 'fred-cpiaucsl', indicatorKey: 'cpiaucsl', code: 'CPIAUCSL', title: 'CPI Inflation', desc: 'Consumer Price Index YoY % Change', metricLabel: 'CPI YoY',
      id: 'indicator-fred-cpiaucsl', accentColor: '#EF5350', gradientId: 'cpiaucslFill', tag: '', updateFreq: 'm',
      data: cpiaucslChartData, dataWithPrice: cpiaucslChartDataWithPrice, isLoading: isCpiaucslLoading,
      timeframe: cpiaucslTimeframe, setTimeframe: setCpiaucslTimeframe, zoneFn: getCpiaucslZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      panelId: 'fred-cpilfesl', indicatorKey: 'cpilfesl', code: 'CPILFESL', title: 'Core CPI', desc: 'CPI excl. food & energy — YoY % Change', metricLabel: 'CORE CPI YoY',
      id: 'indicator-fred-cpilfesl', accentColor: '#F87171', gradientId: 'cpilfeslFill', tag: '', updateFreq: 'm',
      data: cpilfeslChartData, dataWithPrice: cpilfeslChartDataWithPrice, isLoading: isCpilfeslLoading,
      timeframe: cpilfeslTimeframe, setTimeframe: setCpilfeslTimeframe, zoneFn: getCpilfeslZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      panelId: 'fred-pcepi', indicatorKey: 'pcepi', code: 'PCEPI', title: 'PCE Inflation', desc: 'Personal Consumption Expenditures — YoY % Change', metricLabel: 'PCE YoY',
      id: 'indicator-fred-pcepi', accentColor: '#FBBF24', gradientId: 'pcepiFill', tag: '', updateFreq: 'm',
      data: pcepiChartData, dataWithPrice: pcepiChartDataWithPrice, isLoading: isPcepiLoading,
      timeframe: pcepiTimeframe, setTimeframe: setPcepiTimeframe, zoneFn: getPcepiZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      panelId: 'fred-pcepilfe', indicatorKey: 'pcepilfe', code: 'PCEPILFE', title: 'Core PCE', desc: 'PCE excl. food & energy — YoY % Change', metricLabel: 'CORE PCE YoY',
      id: 'indicator-fred-pcepilfe', accentColor: '#F59E0B', gradientId: 'pcepilfeFill', tag: '', updateFreq: 'm',
      data: pcepilfeChartData, dataWithPrice: pcepilfeChartDataWithPrice, isLoading: isPcepilfeLoading,
      timeframe: pcepilfeTimeframe, setTimeframe: setPcepilfeTimeframe, zoneFn: getPcepilfeZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      panelId: 'fred-mich', indicatorKey: 'mich', code: 'MICH', title: 'Inflation Expectations', desc: 'University of Michigan 1Y inflation expectations', metricLabel: 'INFL EXP',
      id: 'indicator-fred-mich', accentColor: '#A78BFA', gradientId: 'michFill', tag: '', updateFreq: 'm',
      data: michChartData, dataWithPrice: michChartDataWithPrice, isLoading: isMichLoading,
      timeframe: michTimeframe, setTimeframe: setMichTimeframe, zoneFn: getMichZone,
      headerValue: (v: number) => `${v.toFixed(1)}%`, tooltipValue: (v: number) => `${v.toFixed(1)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-t5yie', indicatorKey: 't5yie', code: 'T5YIE', title: '5Y Breakeven Inflation', desc: '5-year breakeven inflation rate', metricLabel: 'T5Y BE',
      id: 'indicator-fred-t5yie', accentColor: '#60A5FA', gradientId: 't5yieFill', tag: '', updateFreq: 'd',
      data: t5yieChartData, dataWithPrice: t5yieChartDataWithPrice, isLoading: isT5yieLoading,
      timeframe: t5yieTimeframe, setTimeframe: setT5yieTimeframe, zoneFn: getT5yieZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-t10yie', indicatorKey: 't10yie', code: 'T10YIE', title: '10Y Breakeven Inflation', desc: '10-year breakeven inflation rate', metricLabel: 'T10Y BE',
      id: 'indicator-fred-t10yie', accentColor: '#3B82F6', gradientId: 't10yieFill', tag: '', updateFreq: 'd',
      data: t10yieChartData, dataWithPrice: t10yieChartDataWithPrice, isLoading: isT10yieLoading,
      timeframe: t10yieTimeframe, setTimeframe: setT10yieTimeframe, zoneFn: getT10yieZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-dgs1mo', indicatorKey: 'dgs1mo', code: 'DGS1MO', title: '1M Treasury Yield', desc: '1-month Treasury constant maturity yield', metricLabel: '1M YIELD',
      id: 'indicator-fred-dgs1mo', accentColor: '#94A3B8', gradientId: 'dgs1moFill', tag: '', updateFreq: 'd',
      data: dgs1moChartData, dataWithPrice: dgs1moChartDataWithPrice, isLoading: isDgs1moLoading,
      timeframe: dgs1moTimeframe, setTimeframe: setDgs1moTimeframe, zoneFn: getDgs1moZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-dgs3mo', indicatorKey: 'dgs3mo', code: 'DGS3MO', title: '3M Treasury Yield', desc: '3-month Treasury constant maturity yield', metricLabel: '3M YIELD',
      id: 'indicator-fred-dgs3mo', accentColor: '#CBD5E1', gradientId: 'dgs3moFill', tag: '', updateFreq: 'd',
      data: dgs3moChartData, dataWithPrice: dgs3moChartDataWithPrice, isLoading: isDgs3moLoading,
      timeframe: dgs3moTimeframe, setTimeframe: setDgs3moTimeframe, zoneFn: getDgs3moZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-dgs6mo', indicatorKey: 'dgs6mo', code: 'DGS6MO', title: '6M Treasury Yield', desc: '6-month Treasury constant maturity yield', metricLabel: '6M YIELD',
      id: 'indicator-fred-dgs6mo', accentColor: '#E2E8F0', gradientId: 'dgs6moFill', tag: '', updateFreq: 'd',
      data: dgs6moChartData, dataWithPrice: dgs6moChartDataWithPrice, isLoading: isDgs6moLoading,
      timeframe: dgs6moTimeframe, setTimeframe: setDgs6moTimeframe, zoneFn: getDgs6moZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-dgs1', indicatorKey: 'dgs1', code: 'DGS1', title: '1Y Treasury Yield', desc: '1-year Treasury constant maturity yield', metricLabel: '1Y YIELD',
      id: 'indicator-fred-dgs1', accentColor: '#FCA5A5', gradientId: 'dgs1Fill', tag: '', updateFreq: 'd',
      data: dgs1ChartData, dataWithPrice: dgs1ChartDataWithPrice, isLoading: isDgs1Loading,
      timeframe: dgs1Timeframe, setTimeframe: setDgs1Timeframe, zoneFn: getDgs1Zone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-dgs5', indicatorKey: 'dgs5', code: 'DGS5', title: '5Y Treasury Yield', desc: '5-year Treasury constant maturity yield', metricLabel: '5Y YIELD',
      id: 'indicator-fred-dgs5', accentColor: '#F87171', gradientId: 'dgs5Fill', tag: '', updateFreq: 'd',
      data: dgs5ChartData, dataWithPrice: dgs5ChartDataWithPrice, isLoading: isDgs5Loading,
      timeframe: dgs5Timeframe, setTimeframe: setDgs5Timeframe, zoneFn: getDgs5Zone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-dgs20', indicatorKey: 'dgs20', code: 'DGS20', title: '20Y Treasury Yield', desc: '20-year Treasury constant maturity yield', metricLabel: '20Y YIELD',
      id: 'indicator-fred-dgs20', accentColor: '#EF4444', gradientId: 'dgs20Fill', tag: '', updateFreq: 'd',
      data: dgs20ChartData, dataWithPrice: dgs20ChartDataWithPrice, isLoading: isDgs20Loading,
      timeframe: dgs20Timeframe, setTimeframe: setDgs20Timeframe, zoneFn: getDgs20Zone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-dgs30', indicatorKey: 'dgs30', code: 'DGS30', title: '30Y Treasury Yield', desc: '30-year Treasury constant maturity yield', metricLabel: '30Y YIELD',
      id: 'indicator-fred-dgs30', accentColor: '#DC2626', gradientId: 'dgs30Fill', tag: '', updateFreq: 'd',
      data: dgs30ChartData, dataWithPrice: dgs30ChartDataWithPrice, isLoading: isDgs30Loading,
      timeframe: dgs30Timeframe, setTimeframe: setDgs30Timeframe, zoneFn: getDgs30Zone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-t10y2y', indicatorKey: 't10y2y', code: 'T10Y2Y', title: '10Y-2Y Yield Spread', desc: '10-year minus 2-year yield curve spread', metricLabel: '10Y2Y SPR',
      id: 'indicator-fred-t10y2y', accentColor: '#C084FC', gradientId: 't10y2yFill', tag: '', updateFreq: 'd',
      data: t10y2yChartData, dataWithPrice: t10y2yChartDataWithPrice, isLoading: isT10y2yLoading,
      timeframe: t10y2yTimeframe, setTimeframe: setT10y2yTimeframe, zoneFn: getT10y2yZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-t10y3m', indicatorKey: 't10y3m', code: 'T10Y3M', title: '10Y-3M Yield Spread', desc: '10-year minus 3-month yield curve spread', metricLabel: '10Y3M SPR',
      id: 'indicator-fred-t10y3m', accentColor: '#A855F7', gradientId: 't10y3mFill', tag: '', updateFreq: 'd',
      data: t10y3mChartData, dataWithPrice: t10y3mChartDataWithPrice, isLoading: isT10y3mLoading,
      timeframe: t10y3mTimeframe, setTimeframe: setT10y3mTimeframe, zoneFn: getT10y3mZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-m1sl', indicatorKey: 'm1sl', code: 'M1SL', title: 'M1 Money Supply', desc: 'Narrow money supply (M1)', metricLabel: 'M1',
      id: 'indicator-fred-m1sl', accentColor: '#34D399', gradientId: 'm1slFill', tag: '', updateFreq: 'm',
      data: m1slChartData, dataWithPrice: m1slChartDataWithPrice, isLoading: isM1slLoading,
      timeframe: m1slTimeframe, setTimeframe: setM1slTimeframe, zoneFn: getM1slZone,
      headerValue: (v: number) => `$${(v/1e3).toFixed(1)}T`, tooltipValue: (v: number) => `$${(v/1e3).toFixed(1)}T`,
      yAxisTick: (v: number) => `$${(v/1e3).toFixed(0)}T`,
    },
    {
      panelId: 'fred-mabmm301usm189s', indicatorKey: 'mabmm301', code: 'MABMM301USM189S', title: 'M3 Global Money Supply', desc: 'Global M3 broad money supply proxy', metricLabel: 'M3 GLOBAL',
      id: 'indicator-fred-mabmm301usm189s', accentColor: '#2DD4BF', gradientId: 'mabmm301Fill', tag: '', updateFreq: 'm',
      data: mabmm301ChartData, dataWithPrice: mabmm301ChartDataWithPrice, isLoading: isMabmm301Loading,
      timeframe: mabmm301Timeframe, setTimeframe: setMabmm301Timeframe, zoneFn: getMabmm301Zone,
      headerValue: (v: number) => `$${(v/1e3).toFixed(1)}T`, tooltipValue: (v: number) => `$${(v/1e3).toFixed(1)}T`,
      yAxisTick: (v: number) => `$${(v/1e3).toFixed(0)}T`,
    },
    {
      panelId: 'fred-unrate', indicatorKey: 'unrate', code: 'UNRATE', title: 'Unemployment Rate', desc: 'US civilian unemployment rate', metricLabel: 'UNEMP',
      id: 'indicator-fred-unrate', accentColor: '#F59E0B', gradientId: 'unrateFill', tag: '', updateFreq: 'm',
      data: unrateChartData, dataWithPrice: unrateChartDataWithPrice, isLoading: isUnrateLoading,
      timeframe: unrateTimeframe, setTimeframe: setUnrateTimeframe, zoneFn: getUnrateZone,
      headerValue: (v: number) => `${v.toFixed(1)}%`, tooltipValue: (v: number) => `${v.toFixed(1)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-payems', indicatorKey: 'payems', code: 'PAYEMS', title: 'Non-Farm Payrolls', desc: 'Total non-farm payroll employment (thousands)', metricLabel: 'PAYROLLS',
      id: 'indicator-fred-payems', accentColor: '#4ADE80', gradientId: 'payemsFill', tag: '', updateFreq: 'm',
      data: payemsChartData, dataWithPrice: payemsChartDataWithPrice, isLoading: isPayemsLoading,
      timeframe: payemsTimeframe, setTimeframe: setPayemsTimeframe, zoneFn: getPayemsZone,
      headerValue: (v: number) => `${(v/1e3).toFixed(1)}M`, tooltipValue: (v: number) => `${(v/1e3).toFixed(1)}M`,
      yAxisTick: (v: number) => `${(v/1e3).toFixed(0)}M`,
    },
    {
      panelId: 'fred-icsa', indicatorKey: 'icsa', code: 'ICSA', title: 'Initial Jobless Claims', desc: 'Weekly initial unemployment insurance claims', metricLabel: 'JOBLESS',
      id: 'indicator-fred-icsa', accentColor: '#FBBF24', gradientId: 'icsaFill', tag: '', updateFreq: 'w',
      data: icsaChartData, dataWithPrice: icsaChartDataWithPrice, isLoading: isIcsaLoading,
      timeframe: icsaTimeframe, setTimeframe: setIcsaTimeframe, zoneFn: getIcsaZone,
      headerValue: (v: number) => `${(v/1e3).toFixed(0)}K`, tooltipValue: (v: number) => `${(v/1e3).toFixed(0)}K`,
      yAxisTick: (v: number) => `${(v/1e3).toFixed(0)}K`,
    },
    {
      panelId: 'fred-jtsjol', indicatorKey: 'jtsjol', code: 'JTSJOL', title: 'Job Openings (JOLTS)', desc: 'Total job openings via JOLTS survey', metricLabel: 'JOB OPENS',
      id: 'indicator-fred-jtsjol', accentColor: '#86EFAC', gradientId: 'jtsjolFill', tag: '', updateFreq: 'm',
      data: jtsjolChartData, dataWithPrice: jtsjolChartDataWithPrice, isLoading: isJtsjolLoading,
      timeframe: jtsjolTimeframe, setTimeframe: setJtsjolTimeframe, zoneFn: getJtsjolZone,
      headerValue: (v: number) => `${(v/1e3).toFixed(1)}M`, tooltipValue: (v: number) => `${(v/1e3).toFixed(1)}M`,
      yAxisTick: (v: number) => `${(v/1e3).toFixed(0)}M`,
    },
    {
      panelId: 'fred-emratio', indicatorKey: 'emratio', code: 'EMRATIO', title: 'Employment-to-Pop Ratio', desc: 'Civilian employment-population ratio', metricLabel: 'EMP RATIO',
      id: 'indicator-fred-emratio', accentColor: '#6EE7B7', gradientId: 'emratioFill', tag: '', updateFreq: 'm',
      data: emratioChartData, dataWithPrice: emratioChartDataWithPrice, isLoading: isEmratioLoading,
      timeframe: emratioTimeframe, setTimeframe: setEmratioTimeframe, zoneFn: getEmratioZone,
      headerValue: (v: number) => `${v.toFixed(1)}%`, tooltipValue: (v: number) => `${v.toFixed(1)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-gdpc1', indicatorKey: 'gdpc1', code: 'GDPC1', title: 'Real GDP', desc: 'Real Gross Domestic Product (billions chained 2017$)', metricLabel: 'REAL GDP',
      id: 'indicator-fred-gdpc1', accentColor: '#818CF8', gradientId: 'gdpc1Fill', tag: '', updateFreq: 'q',
      data: gdpc1ChartData, dataWithPrice: gdpc1ChartDataWithPrice, isLoading: isGdpc1Loading,
      timeframe: gdpc1Timeframe, setTimeframe: setGdpc1Timeframe, zoneFn: getGdpc1Zone,
      headerValue: (v: number) => `$${(v/1e3).toFixed(1)}T`, tooltipValue: (v: number) => `$${(v/1e3).toFixed(1)}T`,
      yAxisTick: (v: number) => `$${(v/1e3).toFixed(0)}T`,
    },
    {
      panelId: 'fred-indpro', indicatorKey: 'indpro', code: 'INDPRO', title: 'Industrial Production', desc: 'Industrial production index (2017=100)', metricLabel: 'IND PROD',
      id: 'indicator-fred-indpro', accentColor: '#A5B4FC', gradientId: 'indproFill', tag: '', updateFreq: 'm',
      data: indproChartData, dataWithPrice: indproChartDataWithPrice, isLoading: isIndproLoading,
      timeframe: indproTimeframe, setTimeframe: setIndproTimeframe, zoneFn: getIndproZone,
      headerValue: (v: number) => `${v.toFixed(2)}`, tooltipValue: (v: number) => `${v.toFixed(2)}`,
      yAxisTick: (v: number) => `${v.toFixed(1)}`,
    },
    {
      panelId: 'fred-houst', indicatorKey: 'houst', code: 'HOUST', title: 'Housing Starts', desc: 'New privately-owned housing units started (thousands)', metricLabel: 'HOUSING',
      id: 'indicator-fred-houst', accentColor: '#FCD34D', gradientId: 'houstFill', tag: '', updateFreq: 'm',
      data: houstChartData, dataWithPrice: houstChartDataWithPrice, isLoading: isHoustLoading,
      timeframe: houstTimeframe, setTimeframe: setHoustTimeframe, zoneFn: getHoustZone,
      headerValue: (v: number) => `${v.toFixed(0)}K`, tooltipValue: (v: number) => `${v.toFixed(0)}K`,
      yAxisTick: (v: number) => `${v.toFixed(0)}K`,
    },
    {
      panelId: 'fred-umcsent', indicatorKey: 'umcsent', code: 'UMCSENT', title: 'Consumer Sentiment', desc: 'University of Michigan Consumer Sentiment Index', metricLabel: 'CONS SENT',
      id: 'indicator-fred-umcsent', accentColor: '#FDE68A', gradientId: 'umcsentFill', tag: '', updateFreq: 'm',
      data: umcsentChartData, dataWithPrice: umcsentChartDataWithPrice, isLoading: isUmcsentLoading,
      timeframe: umcsentTimeframe, setTimeframe: setUmcsentTimeframe, zoneFn: getUmcsentZone,
      headerValue: (v: number) => `${v.toFixed(1)}`, tooltipValue: (v: number) => `${v.toFixed(1)}`,
      yAxisTick: (v: number) => `${v.toFixed(0)}`,
    },
    {
      panelId: 'fred-rsxfs', indicatorKey: 'rsxfs', code: 'RSXFS', title: 'Retail Sales', desc: 'Advance retail trade & food services sales (millions)', metricLabel: 'RETAIL',
      id: 'indicator-fred-rsxfs', accentColor: '#67E8F9', gradientId: 'rsxfsFill', tag: '', updateFreq: 'm',
      data: rsxfsChartData, dataWithPrice: rsxfsChartDataWithPrice, isLoading: isRsxfsLoading,
      timeframe: rsxfsTimeframe, setTimeframe: setRsxfsTimeframe, zoneFn: getRsxfsZone,
      headerValue: (v: number) => `$${(v/1e3).toFixed(0)}B`, tooltipValue: (v: number) => `$${(v/1e3).toFixed(0)}B`,
      yAxisTick: (v: number) => `$${(v/1e3).toFixed(0)}B`,
    },
    {
      panelId: 'fred-dcoilwtico', indicatorKey: 'dcoilwtico', code: 'DCOILWTICO', title: 'WTI Crude Oil', desc: 'West Texas Intermediate crude oil spot price', metricLabel: 'WTI OIL',
      id: 'indicator-fred-dcoilwtico', accentColor: '#78716C', gradientId: 'dcoilwticoFill', tag: '', updateFreq: 'd',
      data: dcoilwticoChartData, dataWithPrice: dcoilwticoChartDataWithPrice, isLoading: isDcoilwticoLoading,
      timeframe: dcoilwticoTimeframe, setTimeframe: setDcoilwticoTimeframe, zoneFn: getDcoilwticoZone,
      headerValue: (v: number) => `$${v.toFixed(2)}`, tooltipValue: (v: number) => `$${v.toFixed(2)}`,
      yAxisTick: (v: number) => `$${v.toFixed(1)}`,
    },
    {
      panelId: 'fred-bamlh0a0hym2', indicatorKey: 'bamlh0a0hym2', code: 'BAMLH0A0HYM2', title: 'HY Credit Spread', desc: 'BofA US High Yield Option-Adjusted Spread', metricLabel: 'HY SPREAD',
      id: 'indicator-fred-bamlh0a0hym2', accentColor: '#FCA5A5', gradientId: 'bamlh0a0hym2Fill', tag: '', updateFreq: 'd',
      data: bamlh0a0hym2ChartData, dataWithPrice: bamlh0a0hym2ChartDataWithPrice, isLoading: isBamlh0a0hym2Loading,
      timeframe: bamlh0a0hym2Timeframe, setTimeframe: setBamlh0a0hym2Timeframe, zoneFn: getBamlh0a0hym2Zone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-mortgage30us', indicatorKey: 'mortgage30us', code: 'MORTGAGE30US', title: '30Y Mortgage Rate', desc: '30-year fixed-rate mortgage average', metricLabel: 'MTG 30Y',
      id: 'indicator-fred-mortgage30us', accentColor: '#FDA4AF', gradientId: 'mortgage30usFill', tag: '', updateFreq: 'w',
      data: mortgage30usChartData, dataWithPrice: mortgage30usChartDataWithPrice, isLoading: isMortgage30usLoading,
      timeframe: mortgage30usTimeframe, setTimeframe: setMortgage30usTimeframe, zoneFn: getMortgage30usZone,
      headerValue: (v: number) => `${v.toFixed(2)}%`, tooltipValue: (v: number) => `${v.toFixed(2)}%`,
      yAxisTick: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      panelId: 'fred-bogmbase', indicatorKey: 'bogmbase', code: 'BOGMBASE', title: 'Monetary Base', desc: 'Total US monetary base (adjusted)', metricLabel: 'MON BASE',
      id: 'indicator-fred-bogmbase', accentColor: '#C4B5FD', gradientId: 'bogmbaseFill', tag: '', updateFreq: 'w',
      data: bogmbaseChartData, dataWithPrice: bogmbaseChartDataWithPrice, isLoading: isBogmbaseLoading,
      timeframe: bogmbaseTimeframe, setTimeframe: setBogmbaseTimeframe, zoneFn: getBogmbaseZone,
      headerValue: (v: number) => `$${(v/1e6).toFixed(1)}T`, tooltipValue: (v: number) => `$${(v/1e6).toFixed(1)}T`,
      yAxisTick: (v: number) => `$${(v/1e6).toFixed(0)}T`,
    },
    {
      panelId: 'fred-totalsl', indicatorKey: 'totalsl', code: 'TOTALSL', title: 'Total Consumer Credit', desc: 'Total outstanding consumer credit', metricLabel: 'CREDIT',
      id: 'indicator-fred-totalsl', accentColor: '#93C5FD', gradientId: 'totalslFill', tag: '', updateFreq: 'm',
      data: totalslChartData, dataWithPrice: totalslChartDataWithPrice, isLoading: isTotalslLoading,
      timeframe: totalslTimeframe, setTimeframe: setTotalslTimeframe, zoneFn: getTotalslZone,
      headerValue: (v: number) => `$${v.toFixed(0)}B`, tooltipValue: (v: number) => `$${v.toFixed(0)}B`,
      yAxisTick: (v: number) => `$${v.toFixed(0)}B`,
    },
  ], [
    m2ChartData, m2ChartDataWithPrice, isM2Loading, m2Timeframe,
    dxyChartData, dxyChartDataWithPrice, isDxyLoading, dxyTimeframe,
    vixChartData, vixChartDataWithPrice, isVixLoading, vixTimeframe,
    fedfundsChartData, fedfundsChartDataWithPrice, isFedfundsLoading, fedfundsTimeframe,
    etfChartData, etfChartDataWithPrice, isEtfLoading, etfTimeframe,
    sp500ChartData, sp500ChartDataWithPrice, isSp500Loading, sp500Timeframe,
    goldChartData, goldChartDataWithPrice, isGoldLoading, goldTimeframe,
    stablecoinSupplyChartData, stablecoinSupplyChartDataWithPrice, isStablecoinSupplyLoading, stablecoinSupplyTimeframe,
    ssrOscillatorChartData, ssrOscillatorChartDataWithPrice, isSsrOscillatorLoading, ssrOscillatorTimeframe,
    cryptoMarketCapChartData, cryptoMarketCapChartDataWithPrice, isCryptoMarketCapLoading, cryptoMarketCapTimeframe,
    sofrChartData, isSofrLoading, sofrTimeframe,
    walclChartData, walclChartDataWithPrice, isWalclLoading, walclTimeframe,
    wresbalChartData, wresbalChartDataWithPrice, isWresbalLoading, wresbalTimeframe,
    rrpontsydChartData, rrpontsydChartDataWithPrice, isRrpontsydLoading, rrpontsydTimeframe,
    cpiaucslChartData, cpiaucslChartDataWithPrice, isCpiaucslLoading, cpiaucslTimeframe,
    cpilfeslChartData, cpilfeslChartDataWithPrice, isCpilfeslLoading, cpilfeslTimeframe,
    pcepiChartData, pcepiChartDataWithPrice, isPcepiLoading, pcepiTimeframe,
    pcepilfeChartData, pcepilfeChartDataWithPrice, isPcepilfeLoading, pcepilfeTimeframe,
    michChartData, michChartDataWithPrice, isMichLoading, michTimeframe,
    t5yieChartData, t5yieChartDataWithPrice, isT5yieLoading, t5yieTimeframe,
    t10yieChartData, t10yieChartDataWithPrice, isT10yieLoading, t10yieTimeframe,
    dgs1moChartData, dgs1moChartDataWithPrice, isDgs1moLoading, dgs1moTimeframe,
    dgs3moChartData, dgs3moChartDataWithPrice, isDgs3moLoading, dgs3moTimeframe,
    dgs6moChartData, dgs6moChartDataWithPrice, isDgs6moLoading, dgs6moTimeframe,
    dgs1ChartData, dgs1ChartDataWithPrice, isDgs1Loading, dgs1Timeframe,
    dgs5ChartData, dgs5ChartDataWithPrice, isDgs5Loading, dgs5Timeframe,
    dgs20ChartData, dgs20ChartDataWithPrice, isDgs20Loading, dgs20Timeframe,
    dgs30ChartData, dgs30ChartDataWithPrice, isDgs30Loading, dgs30Timeframe,
    t10y2yChartData, t10y2yChartDataWithPrice, isT10y2yLoading, t10y2yTimeframe,
    t10y3mChartData, t10y3mChartDataWithPrice, isT10y3mLoading, t10y3mTimeframe,
    m1slChartData, m1slChartDataWithPrice, isM1slLoading, m1slTimeframe,
    mabmm301ChartData, mabmm301ChartDataWithPrice, isMabmm301Loading, mabmm301Timeframe,
    unrateChartData, unrateChartDataWithPrice, isUnrateLoading, unrateTimeframe,
    payemsChartData, payemsChartDataWithPrice, isPayemsLoading, payemsTimeframe,
    icsaChartData, icsaChartDataWithPrice, isIcsaLoading, icsaTimeframe,
    jtsjolChartData, jtsjolChartDataWithPrice, isJtsjolLoading, jtsjolTimeframe,
    emratioChartData, emratioChartDataWithPrice, isEmratioLoading, emratioTimeframe,
    gdpc1ChartData, gdpc1ChartDataWithPrice, isGdpc1Loading, gdpc1Timeframe,
    indproChartData, indproChartDataWithPrice, isIndproLoading, indproTimeframe,
    houstChartData, houstChartDataWithPrice, isHoustLoading, houstTimeframe,
    umcsentChartData, umcsentChartDataWithPrice, isUmcsentLoading, umcsentTimeframe,
    rsxfsChartData, rsxfsChartDataWithPrice, isRsxfsLoading, rsxfsTimeframe,
    dcoilwticoChartData, dcoilwticoChartDataWithPrice, isDcoilwticoLoading, dcoilwticoTimeframe,
    bamlh0a0hym2ChartData, bamlh0a0hym2ChartDataWithPrice, isBamlh0a0hym2Loading, bamlh0a0hym2Timeframe,
    mortgage30usChartData, mortgage30usChartDataWithPrice, isMortgage30usLoading, mortgage30usTimeframe,
    bogmbaseChartData, bogmbaseChartDataWithPrice, isBogmbaseLoading, bogmbaseTimeframe,
    totalslChartData, totalslChartDataWithPrice, isTotalslLoading, totalslTimeframe,
  ]);

  // BGeometrics panels — config-driven, render via shared <SentimentChartPanel/>
  // (drops zone visuals/threshold lines for uniformity; BTC price overlay always available)
  const noZone = (_v: number) => ({ label: '', color: '#88B4D0' });
  const bgeoPanels = useMemo<SentimentPanelConfig[]>(() => [
    {
      panelId: 'nupl', indicatorKey: 'nupl', code: 'NUPL', title: 'Net Unrealized P/L', desc: 'holder profitability sentiment', metricLabel: 'NUPL',
      id: 'indicator-nupl', accentColor: '#88B4D0', gradientId: 'nuplFill', tag: '', updateFreq: 'd', valueKey: 'nupl',
      data: nuplChartData, dataWithPrice: nuplChartDataWithPrice, isLoading: isNuplLoading,
      timeframe: nuplTimeframe, setTimeframe: setNuplTimeframe, zoneFn: getNuplZone,
      referenceBands: NUPL_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(4), tooltipValue: (v: number) => v.toFixed(4),
      yAxisTick: (v: number) => v.toFixed(2),
    },
    {
      panelId: 'mvrv', indicatorKey: 'mvrv', code: 'MVRV', title: 'MVRV Ratio', desc: 'Market Value to Realized Value', metricLabel: 'MVRV',
      id: 'indicator-mvrv', accentColor: '#00F0FF', gradientId: 'mvrvFill', tag: '', updateFreq: 'd', valueKey: 'mvrv',
      data: mvrvChartData, dataWithPrice: mvrvChartDataWithPrice, isLoading: isMvrvLoading,
      timeframe: mvrvTimeframe, setTimeframe: setMvrvTimeframe, zoneFn: getMvrvZone,
      referenceBands: MVRV_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(4), tooltipValue: (v: number) => v.toFixed(4),
      yAxisTick: (v: number) => v.toFixed(1),
    },
    {
      panelId: 'lth-mvrv', indicatorKey: 'lth-mvrv', code: 'LTH-MVRV', title: 'LTH Market Value to Realized Value', desc: 'Long-Term Holder profitability ratio', metricLabel: 'LTH-MVRV',
      id: 'indicator-lth-mvrv', accentColor: '#7AAAD0', gradientId: 'lthMvrvFill', tag: '', updateFreq: 'd', valueKey: 'lth_mvrv',
      data: lthMvrvChartData, dataWithPrice: lthMvrvChartDataWithPrice, isLoading: isLthMvrvLoading,
      timeframe: lthMvrvTimeframe, setTimeframe: setLthMvrvTimeframe, zoneFn: getLthMvrvZone,
      referenceBands: LTH_MVRV_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(4), tooltipValue: (v: number) => v.toFixed(4),
      yAxisTick: (v: number) => v.toFixed(0),
    },
    {
      panelId: 'sopr', indicatorKey: 'sopr', code: 'SOPR', title: 'Spent Output Profit Ratio', desc: 'Profit/loss ratio of on-chain transactions — above 1.0 = profit', metricLabel: 'SOPR',
      id: 'indicator-sopr', accentColor: '#00F0FF', gradientId: 'soprFill', tag: '', updateFreq: 'd', valueKey: 'sopr',
      data: soprChartData, dataWithPrice: soprChartDataWithPrice, isLoading: isSoprLoading,
      timeframe: soprTimeframe, setTimeframe: setSoprTimeframe, zoneFn: getSoprZone,
      referenceBands: SOPR_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(6), tooltipValue: (v: number) => v.toFixed(6),
      yAxisTick: (v: number) => v.toFixed(3),
    },
    {
      panelId: 'ssr', indicatorKey: 'ssr', code: 'SSR', title: 'Stablecoin Supply Ratio', desc: 'Bitcoin market cap vs stablecoin supply — buying power proxy', metricLabel: 'SSR',
      id: 'indicator-ssr', accentColor: '#A855F7', gradientId: 'ssrFill', tag: '', updateFreq: 'd', valueKey: 'ssr',
      data: ssrChartData, dataWithPrice: ssrChartDataWithPrice, isLoading: isSsrLoading,
      timeframe: ssrTimeframe, setTimeframe: setSsrTimeframe, zoneFn: getSsrZone,
      referenceBands: SSR_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(2), tooltipValue: (v: number) => v.toFixed(2),
      yAxisTick: (v: number) => v.toFixed(0),
    },
    {
      panelId: 'supply-loss', indicatorKey: 'supplyLoss', code: 'SUP-L', title: 'Supply in Loss', desc: 'Total BTC supply at a loss — capitulation indicator', metricLabel: 'SUPPLY IN LOSS',
      id: 'indicator-supply-loss', accentColor: '#C2344D', gradientId: 'supplyLossGradient', tag: '', updateFreq: 'd',
      data: supplyLossChartData, dataWithPrice: supplyLossChartDataWithPrice, isLoading: isSupplyLossLoading,
      timeframe: supplyLossTimeframe, setTimeframe: setSupplyLossTimeframe, zoneFn: noZone,
      headerValue: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(2)}M BTC` : v >= 1e3 ? `${(v/1e3).toFixed(1)}K BTC` : `${v.toFixed(2)} BTC`,
      tooltipValue: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(2)}M BTC` : v >= 1e3 ? `${(v/1e3).toFixed(1)}K BTC` : `${v.toFixed(2)} BTC`,
      yAxisTick: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v.toFixed(0),
    },
    {
      panelId: 'supply-profit', indicatorKey: 'supplyProfit', code: 'SUP-P', title: 'Supply in Profit', desc: 'Total BTC supply currently in profit — conviction indicator', metricLabel: 'SUPPLY IN PROFIT',
      id: 'indicator-supply-profit', accentColor: '#00CC6E', gradientId: 'supplyProfitGradient', tag: '', updateFreq: 'd',
      data: supplyProfitChartData, dataWithPrice: supplyProfitChartDataWithPrice, isLoading: isSupplyProfitLoading,
      timeframe: supplyProfitTimeframe, setTimeframe: setSupplyProfitTimeframe, zoneFn: noZone,
      headerValue: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(2)}M BTC` : v >= 1e3 ? `${(v/1e3).toFixed(1)}K BTC` : `${v.toFixed(2)} BTC`,
      tooltipValue: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(2)}M BTC` : v >= 1e3 ? `${(v/1e3).toFixed(1)}K BTC` : `${v.toFixed(2)} BTC`,
      yAxisTick: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v.toFixed(0),
    },
    {
      panelId: 'realized-profit', indicatorKey: 'realizedProfit', code: 'R-PROF', title: 'Realized Profit', desc: 'Aggregate realized profit of all on-chain UTXOs moved', metricLabel: 'REALIZED PROFIT',
      id: 'indicator-realized-profit', accentColor: '#00CC6E', gradientId: 'realizedProfitGradient', tag: '', updateFreq: 'd',
      data: realizedProfitChartData, dataWithPrice: realizedProfitChartDataWithPrice, isLoading: isRealizedProfitLoading,
      timeframe: realizedProfitTimeframe, setTimeframe: setRealizedProfitTimeframe, zoneFn: noZone,
      headerValue: (v: number) => v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      tooltipValue: (v: number) => v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      yAxisTick: (v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v.toFixed(0),
    },
    {
      panelId: 'realized-loss', indicatorKey: 'realizedLoss', code: 'R-LOSS', title: 'Realized Loss', desc: 'Aggregate realized loss of all on-chain UTXOs moved', metricLabel: 'REALIZED LOSS',
      id: 'indicator-realized-loss', accentColor: '#FF4444', gradientId: 'realizedLossGradient', tag: '', updateFreq: 'd',
      data: realizedLossChartData, dataWithPrice: realizedLossChartDataWithPrice, isLoading: isRealizedLossLoading,
      timeframe: realizedLossTimeframe, setTimeframe: setRealizedLossTimeframe, zoneFn: noZone,
      headerValue: (v: number) => v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      tooltipValue: (v: number) => v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      yAxisTick: (v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v.toFixed(0),
    },
    {
      panelId: 'sth-mvrv', indicatorKey: 'sthMvrv', code: 'STH-MV', title: 'STH MVRV', desc: 'Short-Term Holder MVRV — unrealized P/L of recent buyers', metricLabel: 'STH-MVRV',
      id: 'indicator-sth-mvrv', accentColor: '#627EEA', gradientId: 'sthFill', tag: '', updateFreq: 'd',
      data: sthMvrvChartData, dataWithPrice: sthMvrvChartDataWithPrice, isLoading: isSthMvrvLoading,
      timeframe: sthMvrvTimeframe, setTimeframe: setSthMvrvTimeframe, zoneFn: getSthMvrvZone,
      referenceBands: STH_MVRV_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(4), tooltipValue: (v: number) => v.toFixed(4),
      yAxisTick: (v: number) => v.toFixed(2),
    },
    {
      panelId: 'hashrate', indicatorKey: 'hashrate', code: 'HASH', title: 'Network Hashrate', desc: 'Bitcoin network computational power — security & miner commitment', metricLabel: 'HASHRATE',
      id: 'indicator-hashrate', accentColor: '#F7931A', gradientId: 'hashrateGradient', tag: '', updateFreq: 'd',
      data: hashrateChartData, dataWithPrice: hashrateChartDataWithPrice, isLoading: isHashrateLoading,
      timeframe: hashrateTimeframe, setTimeframe: setHashrateTimeframe, zoneFn: noZone,
      headerValue: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(0)} EH/s` : v >= 1e3 ? `${(v/1e3).toFixed(2)} PH/s` : `${v.toFixed(2)} TH/s`,
      tooltipValue: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(0)} EH/s` : v >= 1e3 ? `${(v/1e3).toFixed(2)} PH/s` : `${v.toFixed(2)} TH/s`,
      yAxisTick: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(0)}E` : v >= 1e3 ? `${(v/1e3).toFixed(0)}P` : `${v.toFixed(0)}T`,
    },
    {
      panelId: 'aviv', indicatorKey: 'aviv', code: 'AVIV', title: 'AVIV Ratio', desc: 'Adjusted VWAP to Investor Value ratio — filters for active supply', metricLabel: 'AVIV',
      id: 'indicator-aviv', accentColor: '#7AAAD0', gradientId: 'avivFill', tag: '', updateFreq: 'd',
      data: avivChartData, dataWithPrice: avivChartDataWithPrice, isLoading: isAvivLoading,
      timeframe: avivTimeframe, setTimeframe: setAvivTimeframe, zoneFn: getAvivZone,
      referenceBands: AVIV_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(4), tooltipValue: (v: number) => v.toFixed(4),
      yAxisTick: (v: number) => v.toFixed(1),
    },
    {
      panelId: 'mvrv-zscore', indicatorKey: 'mvrvZscore', code: 'MVRVZ', title: 'MVRV Z-Score', desc: 'Standard deviations of MVRV from its mean — classic top/bottom signal', metricLabel: 'MVRV Z-SCORE',
      id: 'indicator-mvrv-zscore', accentColor: '#10B981', gradientId: 'mvrvZscoreFill', tag: '', updateFreq: 'd',
      data: mvrvZscoreChartData, dataWithPrice: mvrvZscoreChartDataWithPrice, isLoading: isMvrvZscoreLoading,
      timeframe: mvrvZscoreTimeframe, setTimeframe: setMvrvZscoreTimeframe, zoneFn: noZone,
      referenceBands: MVRV_ZSCORE_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(2),
      tooltipValue: (v: number) => v.toFixed(3),
      yAxisTick: (v: number) => v.toFixed(1),
    },
    {
      panelId: 'supply-shock', indicatorKey: 'supplyShock', code: 'SSR2', title: 'Supply Shock Ratio', desc: 'Ratio of illiquid supply to exchange supply — rising = tightening supply', metricLabel: 'SUPPLY SHOCK',
      id: 'indicator-supply-shock', accentColor: '#06B6D4', gradientId: 'supplyShockFill', tag: '', updateFreq: 'd',
      data: supplyShockChartData, dataWithPrice: supplyShockChartDataWithPrice, isLoading: isSupplyShockLoading,
      timeframe: supplyShockTimeframe, setTimeframe: setSupplyShockTimeframe, zoneFn: noZone,
      headerValue: (v: number) => v.toFixed(4), tooltipValue: (v: number) => v.toFixed(4),
      yAxisTick: (v: number) => v.toFixed(2),
    },
    {
      panelId: 'illiquid-supply', indicatorKey: 'illiquidSupply', code: 'ILLIQ', title: 'Illiquid Supply', desc: 'BTC held by entities that rarely sell — rising = accumulation', metricLabel: 'ILLIQUID',
      id: 'indicator-illiquid-supply', accentColor: '#10B981', gradientId: 'illiquidFill', tag: '', updateFreq: 'd', valueKey: 'illiquidSupply',
      data: illiquidSupplyChartData, dataWithPrice: illiquidSupplyChartDataWithPrice, isLoading: isIlliquidSupplyLoading,
      timeframe: illiquidSupplyTimeframe, setTimeframe: setIlliquidSupplyTimeframe, zoneFn: noZone,
      headerValue: (v: number) => `${(v/1e6).toFixed(2)}M BTC`,
      tooltipValue: (v: number) => `${(v/1e6).toFixed(3)}M BTC`,
      yAxisTick: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v.toFixed(0),
    },
    {
      panelId: 'hot-supply', indicatorKey: 'hotSupply', code: 'HOTSP', title: 'Hot Supply', desc: 'Bitcoin moved within the last 7 days — rising = short-term speculative activity', metricLabel: 'HOT BTC',
      id: 'indicator-hot-supply', accentColor: '#F87171', gradientId: 'hotSupplyFill', tag: '', updateFreq: 'd', valueKey: 'hotSupply',
      data: hotSupplyChartData, dataWithPrice: hotSupplyChartDataWithPrice, isLoading: isHotSupplyLoading,
      timeframe: hotSupplyTimeframe, setTimeframe: setHotSupplyTimeframe, zoneFn: noZone,
      headerValue: (v: number) => `${(v/1e6).toFixed(3)}M BTC`,
      tooltipValue: (v: number) => `${(v/1e6).toFixed(4)}M BTC`,
      yAxisTick: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v.toFixed(0),
    },
    {
      panelId: 'puell-multiple', indicatorKey: 'puellMultiple', code: 'PUELL', title: 'Puell Multiple', desc: 'Miner revenue relative to 365-day moving average', metricLabel: 'PUELL',
      id: 'indicator-puell-multiple', accentColor: '#F7931A', gradientId: 'puellFill', tag: '', updateFreq: 'd',
      data: puellMultipleChartData, dataWithPrice: puellMultipleChartDataWithPrice, isLoading: isPuellMultipleLoading,
      timeframe: puellMultipleTimeframe, setTimeframe: setPuellMultipleTimeframe, zoneFn: getPuellZone,
      referenceBands: PUELL_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(4), tooltipValue: (v: number) => v.toFixed(4),
      yAxisTick: (v: number) => v.toFixed(1),
    },
    {
      panelId: 'mayer-multiple', indicatorKey: 'mayerMultiple', code: 'MAYER', title: 'Mayer Multiple', desc: 'BTC price divided by 200-day moving average', metricLabel: 'MAYER',
      id: 'indicator-mayer-multiple', accentColor: '#FBBF24', gradientId: 'mayerFill', tag: '', updateFreq: 'd',
      data: mayerMultipleChartData, dataWithPrice: mayerMultipleChartDataWithPrice, isLoading: isMayerMultipleLoading,
      timeframe: mayerMultipleTimeframe, setTimeframe: setMayerMultipleTimeframe, zoneFn: getMayerMultipleZone,
      referenceBands: MAYER_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(4), tooltipValue: (v: number) => v.toFixed(4),
      yAxisTick: (v: number) => v.toFixed(1),
    },
    {
      panelId: 'reserve-risk', indicatorKey: 'reserveRisk', code: 'RESRISK', title: 'Reserve Risk', desc: 'Confidence in Bitcoin relative to opportunity cost of HODLing', metricLabel: 'RESERVE RISK',
      id: 'indicator-reserve-risk', accentColor: '#10B981', gradientId: 'reserveRiskFill', tag: '', updateFreq: 'd',
      data: reserveRiskChartData, dataWithPrice: reserveRiskChartDataWithPrice, isLoading: isReserveRiskLoading,
      timeframe: reserveRiskTimeframe, setTimeframe: setReserveRiskTimeframe, zoneFn: getReserveRiskZone,
      referenceBands: RESERVE_RISK_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(6), tooltipValue: (v: number) => v.toFixed(6),
      yAxisTick: (v: number) => v < 0.001 ? v.toExponential(1) : v.toFixed(4),
    },
    {
      panelId: 'vdd', indicatorKey: 'vdd', code: 'VDD', title: 'VDD Multiple', desc: 'Value Days Destroyed — long-term holder spending weighted by price', metricLabel: 'VDD',
      id: 'indicator-vdd', accentColor: '#818CF8', gradientId: 'vddFill', tag: '', updateFreq: 'd',
      data: vddChartData, dataWithPrice: vddChartDataWithPrice, isLoading: isVddLoading,
      timeframe: vddTimeframe, setTimeframe: setVddTimeframe, zoneFn: getVddZone,
      referenceBands: VDD_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(4), tooltipValue: (v: number) => v.toFixed(4),
      yAxisTick: (v: number) => v.toFixed(1),
    },
    {
      panelId: 'active-addresses', indicatorKey: 'activeAddresses', code: 'ACTADR', title: 'Active Addresses', desc: 'Unique Bitcoin addresses active per day — measures network adoption', metricLabel: 'ACTIVE ADDR',
      id: 'indicator-active-addresses', accentColor: '#34D399', gradientId: 'activeAddrFill', tag: '', updateFreq: 'd',
      data: activeAddressesChartData, dataWithPrice: activeAddressesChartDataWithPrice, isLoading: isActiveAddressesLoading,
      timeframe: activeAddressesTimeframe, setTimeframe: setActiveAddressesTimeframe, zoneFn: noZone,
      headerValue: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v.toFixed(0),
      tooltipValue: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(3)}M` : v >= 1e3 ? `${(v/1e3).toFixed(1)}K` : v.toFixed(0),
      yAxisTick: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v.toFixed(0),
    },
    {
      panelId: 'open-interest', indicatorKey: 'openInterest', code: 'OI', title: 'Open Interest', desc: 'Total open BTC futures contracts (all exchanges)', metricLabel: 'OPEN INT',
      id: 'indicator-open-interest', accentColor: '#60A5FA', gradientId: 'openInterestFill', tag: '', updateFreq: 'd',
      data: openInterestChartData, dataWithPrice: openInterestChartDataWithPrice, isLoading: isOpenInterestLoading,
      timeframe: openInterestTimeframe, setTimeframe: setOpenInterestTimeframe, zoneFn: getOpenInterestZone,
      headerValue: (v: number) => `${(v/1000).toFixed(1)}K`, tooltipValue: (v: number) => `${v.toLocaleString()} BTC`,
      yAxisTick: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v.toFixed(0),
    },
    {
      panelId: 'funding-rate', indicatorKey: 'fundingRate', code: 'FUNDRATE', title: 'Funding Rate', desc: 'Perpetual futures funding rate — long/short market bias', metricLabel: 'FUNDING',
      id: 'indicator-funding-rate', accentColor: '#A78BFA', gradientId: 'fundingRateFill', tag: '', updateFreq: 'd',
      data: fundingRateChartData, dataWithPrice: fundingRateChartDataWithPrice, isLoading: isFundingRateLoading,
      timeframe: fundingRateTimeframe, setTimeframe: setFundingRateTimeframe, zoneFn: getFundingRateZone,
      headerValue: (v: number) => `${(v * 100).toFixed(4)}%`, tooltipValue: (v: number) => `${(v * 100).toFixed(4)}%`,
      yAxisTick: (v: number) => `${(v * 100).toFixed(3)}%`,
    },
    {
      panelId: 'nrpl', indicatorKey: 'nrpl', code: 'NRPL', title: 'Net Realized Profit / Loss', desc: 'Net realized profit or loss across all on-chain transactions', metricLabel: 'NRPL',
      id: 'indicator-nrpl', accentColor: '#10B981', gradientId: 'nrplFill', tag: '', updateFreq: 'd',
      data: nrplChartData, dataWithPrice: nrplChartDataWithPrice, isLoading: isNrplLoading,
      timeframe: nrplTimeframe, setTimeframe: setNrplTimeframe, zoneFn: getNrplZone,
      headerValue: (v: number) => v.toFixed(4), tooltipValue: (v: number) => v.toFixed(4),
      yAxisTick: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v <= -1000 ? `${(v/1000).toFixed(0)}K` : v.toFixed(2),
    },
    {
      panelId: 'rhodl-ratio', indicatorKey: 'rhodl', code: 'RHODL', title: 'RHODL Ratio', desc: 'Realized HODL Ratio — cycle position via coin age weighting', metricLabel: 'RHODL',
      id: 'indicator-rhodl-ratio', accentColor: '#7AAAD0', gradientId: 'rhodlFill', tag: '', updateFreq: 'd',
      data: rhodlChartData, dataWithPrice: rhodlChartDataWithPrice, isLoading: isRhodlLoading,
      timeframe: rhodlTimeframe, setTimeframe: setRhodlTimeframe, zoneFn: getRhodlZone,
      referenceBands: RHODL_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(2), tooltipValue: (v: number) => v.toFixed(2),
      yAxisTick: (v: number) => v.toFixed(0),
    },
    {
      panelId: 'nvts', indicatorKey: 'nvts', code: 'NVTS', title: 'NVT Signal', desc: 'Bitcoin network value vs. transaction volume — smoothed 90d MA variant', metricLabel: 'NVTS',
      id: 'indicator-nvts', accentColor: '#A855F7', gradientId: 'nvtsFill', tag: '', updateFreq: 'd',
      data: nvtsChartData, dataWithPrice: nvtsChartDataWithPrice, isLoading: isNvtsLoading,
      timeframe: nvtsTimeframe, setTimeframe: setNvtsTimeframe, zoneFn: getNvtsZone,
      referenceBands: NVTS_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(2), tooltipValue: (v: number) => v.toFixed(2),
      yAxisTick: (v: number) => v.toFixed(0),
    },
    {
      panelId: 'nvt-zscore', indicatorKey: 'nvtZscore', code: 'NVTZSCORE', title: 'NVT Z-Score', desc: 'Standard deviations above/below mean NVT — statistical overbought/oversold', metricLabel: 'NVT Z-SCORE',
      id: 'indicator-nvt-zscore', accentColor: '#00E5FF', gradientId: 'nvtZscoreFill', tag: '', updateFreq: 'd',
      data: nvtZscoreChartData, dataWithPrice: nvtZscoreChartDataWithPrice, isLoading: isNvtZscoreLoading,
      timeframe: nvtZscoreTimeframe, setTimeframe: setNvtZscoreTimeframe, zoneFn: getNvtZscoreZone,
      referenceBands: NVT_ZSCORE_REFERENCE_BANDS,
      headerValue: (v: number) => v.toFixed(3), tooltipValue: (v: number) => v.toFixed(3),
      yAxisTick: (v: number) => v.toFixed(1),
    },
    {
      panelId: 'cvdd', indicatorKey: 'cvdd', code: 'CVDD', title: 'CVDD', desc: 'Cumulative Value Days Destroyed — long-term bottom price model', metricLabel: 'CVDD',
      id: 'indicator-cvdd', accentColor: '#F59E0B', gradientId: 'cvddFill', tag: '', updateFreq: 'd',
      data: cvddChartData, dataWithPrice: cvddChartDataWithPrice, isLoading: isCvddLoading,
      timeframe: cvddTimeframe, setTimeframe: setCvddTimeframe, zoneFn: getCvddZone,
      headerValue: (v: number) => `$${(v/1000).toFixed(1)}K`,
      tooltipValue: (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      yAxisTick: (v: number) => v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v.toFixed(0)}`,
    },
    {
      panelId: 'realized-price', indicatorKey: 'realizedPrice', code: 'RPRICE', title: 'Realized Price', desc: 'Bitcoin realized price vs market price', metricLabel: 'REALIZED PRICE',
      id: 'indicator-realized-price', accentColor: '#F7931A', gradientId: 'realizedPriceFill', tag: '', updateFreq: 'd',
      data: realizedPriceChartData, dataWithPrice: realizedPriceChartDataWithPrice, isLoading: isRealizedPriceLoading,
      timeframe: realizedPriceTimeframe, setTimeframe: setRealizedPriceTimeframe, zoneFn: noZone,
      headerValue: (v: number) => `$${Math.round(v).toLocaleString()}`,
      tooltipValue: (v: number) => `$${Math.round(v).toLocaleString()}`,
      yAxisTick: (v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v.toFixed(0)}`,
      btcSameAxis: true,
    },
  ], [
    nuplChartData, nuplChartDataWithPrice, isNuplLoading, nuplTimeframe,
    mvrvChartData, mvrvChartDataWithPrice, isMvrvLoading, mvrvTimeframe,
    lthMvrvChartData, lthMvrvChartDataWithPrice, isLthMvrvLoading, lthMvrvTimeframe,
    soprChartData, soprChartDataWithPrice, isSoprLoading, soprTimeframe,
    ssrChartData, ssrChartDataWithPrice, isSsrLoading, ssrTimeframe,
    supplyLossChartData, supplyLossChartDataWithPrice, isSupplyLossLoading, supplyLossTimeframe,
    supplyProfitChartData, supplyProfitChartDataWithPrice, isSupplyProfitLoading, supplyProfitTimeframe,
    realizedProfitChartData, realizedProfitChartDataWithPrice, isRealizedProfitLoading, realizedProfitTimeframe,
    realizedLossChartData, realizedLossChartDataWithPrice, isRealizedLossLoading, realizedLossTimeframe,
    sthMvrvChartData, sthMvrvChartDataWithPrice, isSthMvrvLoading, sthMvrvTimeframe,
    hashrateChartData, hashrateChartDataWithPrice, isHashrateLoading, hashrateTimeframe,
    setNuplTimeframe, setMvrvTimeframe, setLthMvrvTimeframe, setSoprTimeframe, setSsrTimeframe,
    setSupplyLossTimeframe, setSupplyProfitTimeframe, setRealizedProfitTimeframe, setRealizedLossTimeframe,
    setSthMvrvTimeframe, setHashrateTimeframe,
    getNuplZone, getMvrvZone, getLthMvrvZone, getSoprZone, getSsrZone, getSthMvrvZone,
    avivChartData, avivChartDataWithPrice, isAvivLoading, avivTimeframe, setAvivTimeframe, getAvivZone,
    mvrvZscoreChartData, mvrvZscoreChartDataWithPrice, isMvrvZscoreLoading, mvrvZscoreTimeframe, setMvrvZscoreTimeframe,
    supplyShockChartData, supplyShockChartDataWithPrice, isSupplyShockLoading, supplyShockTimeframe, setSupplyShockTimeframe,
    illiquidSupplyChartData, illiquidSupplyChartDataWithPrice, isIlliquidSupplyLoading, illiquidSupplyTimeframe, setIlliquidSupplyTimeframe,
    hotSupplyChartData, hotSupplyChartDataWithPrice, isHotSupplyLoading, hotSupplyTimeframe, setHotSupplyTimeframe,
    puellMultipleChartData, puellMultipleChartDataWithPrice, isPuellMultipleLoading, puellMultipleTimeframe, setPuellMultipleTimeframe, getPuellZone,
    mayerMultipleChartData, mayerMultipleChartDataWithPrice, isMayerMultipleLoading, mayerMultipleTimeframe, setMayerMultipleTimeframe, getMayerMultipleZone,
    reserveRiskChartData, reserveRiskChartDataWithPrice, isReserveRiskLoading, reserveRiskTimeframe, setReserveRiskTimeframe, getReserveRiskZone,
    vddChartData, vddChartDataWithPrice, isVddLoading, vddTimeframe, setVddTimeframe, getVddZone,
    activeAddressesChartData, activeAddressesChartDataWithPrice, isActiveAddressesLoading, activeAddressesTimeframe, setActiveAddressesTimeframe,
    openInterestChartData, openInterestChartDataWithPrice, isOpenInterestLoading, openInterestTimeframe, setOpenInterestTimeframe, getOpenInterestZone,
    fundingRateChartData, fundingRateChartDataWithPrice, isFundingRateLoading, fundingRateTimeframe, setFundingRateTimeframe, getFundingRateZone,
    nrplChartData, nrplChartDataWithPrice, isNrplLoading, nrplTimeframe, setNrplTimeframe, getNrplZone,
    rhodlChartData, rhodlChartDataWithPrice, isRhodlLoading, rhodlTimeframe, setRhodlTimeframe, getRhodlZone,
    nvtsChartData, nvtsChartDataWithPrice, isNvtsLoading, nvtsTimeframe, setNvtsTimeframe, getNvtsZone,
    nvtZscoreChartData, nvtZscoreChartDataWithPrice, isNvtZscoreLoading, nvtZscoreTimeframe, setNvtZscoreTimeframe, getNvtZscoreZone,
    cvddChartData, cvddChartDataWithPrice, isCvddLoading, cvddTimeframe, setCvddTimeframe, getCvddZone,
    realizedPriceChartData, realizedPriceChartDataWithPrice, isRealizedPriceLoading, realizedPriceTimeframe, setRealizedPriceTimeframe,
  ]);

  // Intel Registry categories — pure static data, memoized to avoid rebuilding on every render
  const registryCats = useMemo(() => [
    { id: 'sentiment', label: 'SENTIMENT', accent: '#C2344D', items: [
      { name: 'Fear & Greed',       id: 'indicator-fear-greed',       live: true,  freq: '' },
      { name: 'NUPL',               id: 'indicator-nupl',             live: true,  freq: ''   },
      { name: 'NRPL',               id: 'indicator-nrpl',             live: true,  freq: ''   },
      { name: 'Trending Coins',     id: 'indicator-trending',         live: true,  freq: '' },
    ]},
    { id: 'valuation', label: 'ON-CHAIN VALUATION', accent: '#3B82F6', items: [
      { name: 'MVRV Ratio',     id: 'indicator-mvrv',              live: true,  freq: ''   },
      { name: 'AVIV Ratio',     id: 'indicator-aviv',              live: true,  freq: ''   },
      { name: 'MVRV Z-Score',   id: 'indicator-mvrv-zscore',       live: true,  freq: ''   },
      { name: 'Market Cap',     id: 'indicator-market-cap-k4',     live: true,  freq: ''   },
      { name: 'Crypto Mkt Cap', id: 'indicator-crypto-market-cap', live: true,  freq: '' },
    ]},
    { id: 'price-models', label: 'PRICE MODELS', accent: '#8B5CF6', items: [
      { name: 'Realized Price', id: 'indicator-realized-price', live: true, freq: '' },
      { name: '200-Week MA',    id: 'indicator-200-week-ma',    live: true, freq: '' },
      { name: 'CVDD',           id: 'indicator-cvdd',           live: true, freq: '' },
      { name: 'Mayer Multiple', id: 'indicator-mayer-multiple', live: true, freq: '' },
      { name: 'Reserve Risk',   id: 'indicator-reserve-risk',   live: true, freq: '' },
      { name: 'RHODL Ratio',    id: 'indicator-rhodl-ratio',    live: true, freq: '' },
    ]},
    { id: 'profitability', label: 'PROFITABILITY', accent: '#10B981', items: [
      { name: 'SOPR',             id: 'indicator-sopr',            live: true, freq: '' },
      { name: 'Supply in Profit', id: 'indicator-supply-profit',   live: true, freq: '' },
      { name: 'Supply in Loss',   id: 'indicator-supply-loss',     live: true, freq: '' },
      { name: 'Realized Profit',  id: 'indicator-realized-profit', live: true, freq: '' },
      { name: 'Realized Loss',    id: 'indicator-realized-loss',   live: true, freq: '' },
      { name: 'UTXO in Profit',   id: 'indicator-utxo-profit',     live: true, freq: '' },
      { name: 'UTXO in Loss',     id: 'indicator-utxo-loss',       live: true, freq: '' },
    ]},
    { id: 'holder', label: 'HOLDER BEHAVIOR', accent: '#F59E0B', items: [
      { name: 'STH-MVRV',         id: 'indicator-sth-mvrv',            live: true, freq: '' },
      { name: 'LTH-MVRV',         id: 'indicator-lth-mvrv',            live: true, freq: '' },
      { name: 'LTH Position Δ',   id: 'indicator-lth-position-change', live: true, freq: '' },
      { name: 'STH Position Δ',   id: 'indicator-sth-position-change', live: true, freq: '' },
      { name: 'VDD Multiple',     id: 'indicator-vdd',                 live: true, freq: '' },
      { name: 'NVTS',             id: 'indicator-nvts',                live: true, freq: '' },
      { name: 'NVT Z-Score',      id: 'indicator-nvt-zscore',          live: true, freq: '' },
    ]},
    { id: 'supply', label: 'SUPPLY DYNAMICS', accent: '#06B6D4', items: [
      { name: 'Hot Supply',           id: 'indicator-hot-supply',           live: true, freq: '' },
      { name: 'Highly Liquid Supply', id: 'indicator-highly-liquid-supply', live: true, freq: '' },
      { name: 'Supply Shock Ratio',   id: 'indicator-supply-shock',         live: true, freq: '' },
      { name: 'Stablecoin Supply',    id: 'indicator-stablecoin-supply',    live: true, freq: '' },
      { name: 'Active Addresses',     id: 'indicator-active-addresses',     live: true, freq: '' },
    ]},
    { id: 'miner', label: 'MINER INTELLIGENCE', accent: '#EF4444', items: [
      { name: 'Hashrate',            id: 'indicator-hashrate',            live: true, freq: '' },
      { name: 'Hash Ribbons',        id: 'indicator-hashribbons',         live: true, freq: '' },
      { name: 'Puell Multiple',      id: 'indicator-puell-multiple',      live: true, freq: '' },
      { name: 'Miner Sell Pressure', id: 'indicator-miner-sell-pressure', live: true, freq: '' },
      { name: 'MPI',                 id: 'indicator-mpi',                 live: true, freq: '' },
      { name: 'BTC Dominance',       id: 'indicator-dominance',           live: true, freq: '' },
    ]},
    { id: 'market-structure', label: 'MARKET STRUCTURE', accent: '#EC4899', items: [
      { name: 'Open Interest', id: 'indicator-open-interest', live: true,  freq: '' },
      { name: 'Funding Rate',  id: 'indicator-funding-rate',  live: true,  freq: '' },
      { name: 'ETF AUM',       id: 'indicator-etf',           live: true,  freq: ''   },
      { name: 'SSR',           id: 'indicator-ssr',           live: true,  freq: ''   },
    ]},
    { id: 'macro', label: 'MACRO', accent: '#6B7280', items: [
      { isDivider: true as const, dividerLabel: 'MONETARY POLICY' },
      { name: 'Fed Funds Rate',    id: 'indicator-fedfunds',          live: true, freq: '' },
      { name: 'Fed Balance Sheet', id: 'indicator-fred-walcl',        live: true, freq: '' },
      { name: 'Reverse Repo',      id: 'indicator-fred-rrpontsyd',    live: true, freq: '' },
      { name: 'Repo Rate (SOFR)',  id: 'indicator-fred-sofr',         live: true, freq: '' },
      { isDivider: true as const, dividerLabel: 'INFLATION' },
      { name: 'CPI',               id: 'indicator-fred-cpiaucsl',     live: true, freq: '' },
      { name: 'Core CPI',          id: 'indicator-fred-cpilfesl',     live: true, freq: '' },
      { name: 'PCE Inflation',     id: 'indicator-fred-pcepi',        live: true, freq: '' },
      { name: 'Core PCE',          id: 'indicator-fred-pcepilfe',     live: true, freq: '' },
      { name: 'Inflation Expect.', id: 'indicator-fred-mich',         live: true, freq: '' },
      { name: '5Y Breakeven',      id: 'indicator-fred-t5yie',        live: true, freq: '' },
      { name: '10Y Breakeven',     id: 'indicator-fred-t10yie',       live: true, freq: '' },
      { isDivider: true as const, dividerLabel: 'TREASURY YIELDS' },
      { name: '1M Treasury',       id: 'indicator-fred-dgs1mo',       live: true, freq: '' },
      { name: '3M Treasury',       id: 'indicator-fred-dgs3mo',       live: true, freq: '' },
      { name: '6M Treasury',       id: 'indicator-fred-dgs6mo',       live: true, freq: '' },
      { name: '1Y Treasury',       id: 'indicator-fred-dgs1',         live: true, freq: '' },
      { name: '5Y Treasury',       id: 'indicator-fred-dgs5',         live: true, freq: '' },
      { name: '20Y Treasury',      id: 'indicator-fred-dgs20',        live: true, freq: '' },
      { name: '30Y Treasury',      id: 'indicator-fred-dgs30',        live: true, freq: '' },
      { name: '10Y-2Y Spread',     id: 'indicator-fred-t10y2y',       live: true, freq: '' },
      { name: '10Y-3M Spread',     id: 'indicator-fred-t10y3m',       live: true, freq: '' },
      { isDivider: true as const, dividerLabel: 'MONEY SUPPLY' },
      { name: 'M2 Money Supply',   id: 'indicator-m2',                    live: true, freq: '' },
      { name: 'M3 Global',         id: 'indicator-fred-mabmm301usm189s',  live: true, freq: '' },
      { name: 'Consumer Credit',   id: 'indicator-fred-totalsl',          live: true, freq: '' },
      { isDivider: true as const, dividerLabel: 'LABOR & GROWTH' },
      { name: 'Unemployment Rate', id: 'indicator-fred-unrate',       live: true, freq: '' },
      { name: 'Non-Farm Payrolls', id: 'indicator-fred-payems',       live: true, freq: '' },
      { name: 'Jobless Claims',    id: 'indicator-fred-icsa',         live: true, freq: '' },
      { name: 'Job Openings',      id: 'indicator-fred-jtsjol',       live: true, freq: '' },
      { name: 'Employment Ratio',  id: 'indicator-fred-emratio',      live: true, freq: '' },
      { name: 'Real GDP',          id: 'indicator-fred-gdpc1',        live: true, freq: '' },
      { name: 'Industrial Prod.',  id: 'indicator-fred-indpro',       live: true, freq: '' },
      { name: 'Housing Starts',    id: 'indicator-fred-houst',        live: true, freq: '' },
      { name: 'Consumer Sent.',    id: 'indicator-fred-umcsent',      live: true, freq: '' },
      { name: 'Retail Sales',      id: 'indicator-fred-rsxfs',        live: true, freq: '' },
      { isDivider: true as const, dividerLabel: 'FINANCIAL' },
      {  name: 'VIX',              id: 'indicator-vix',               live: true, freq: '' },
      { name: 'DXY',              id: 'indicator-dxy',               live: true, freq: '' },
      { name: 'S&P 500',          id: 'indicator-sp500',             live: true, freq: '' },
      { name: 'Gold',             id: 'indicator-gold',              live: true, freq: '' },
      { name: 'WTI Crude Oil',    id: 'indicator-fred-dcoilwtico',   live: true, freq: '' },
      { name: 'HY Credit Spread', id: 'indicator-fred-bamlh0a0hym2', live: true, freq: '' },
      { name: '30Y Mortgage Rate',id: 'indicator-fred-mortgage30us', live: true, freq: '' },
    ]},
  ], []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden font-mono" style={{ background: '#030508' }}>
      {/* Dot matrix overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, rgba(100,140,200,0.03) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }} />
      {/* Cold blue ambient glow — top right */}
      <div className="fixed pointer-events-none" style={{
        top: '-10vh', right: '-8vw', width: '60vw', height: '60vh',
        background: 'radial-gradient(ellipse at center, rgba(30,80,180,0.04) 0%, transparent 70%)',
        zIndex: 0,
      }} />
      {/* Subtle red ambient glow — bottom left */}
      <div className="fixed pointer-events-none" style={{
        bottom: '-15vh', left: '-10vw', width: '55vw', height: '55vh',
        background: 'radial-gradient(ellipse at center, rgba(194,52,77,0.025) 0%, transparent 70%)',
        zIndex: 0,
      }} />

      <TerminalModulePageShell
        header={{
          sectionLabel: 'SENTIMENT',
          title: 'SENTIMENT INTELLIGENCE',

          subtitle: 'Maps market psychology through on-chain behavior',
          accent: '#C2344D',
          accentDark: '#8B1A1A',
          background: '#0A0608',
          clock: <LiveClock />,
        }}
      >

        <div className="sentiment-comfort grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)] 3xl:grid-cols-[420px_minmax(0,1fr)] 4xl:grid-cols-[500px_minmax(0,1fr)] gap-6">
          {/* ─── Indicators Registry Sidebar ─── */}
          <SentimentSidebar
            registryCats={registryCats}
            registrySearch={registrySearch}
            setRegistrySearch={setRegistrySearch}
            openAccordion={openAccordion}
            setOpenAccordion={setOpenAccordion}
            selectedIndicator={selectedIndicator}
            setSelectedIndicator={setSelectedIndicator}
          />

          {/* ─── Main Content ─── */}
          <div className="min-w-0 space-y-5">
            {selectedIndicator !== null && (
              <button
                onClick={() => setSelectedIndicator(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all duration-150 hover:opacity-80"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#94A3B8',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  width: 'fit-content',
                }}
              >
                <span style={{ fontSize: '14px', lineHeight: 1 }}>←</span>
                <span>OVERVIEW</span>
              </button>
            )}

            {/* ── Panel 01: Fear & Greed Index ── */}
            {(selectedIndicator === 'indicator-fear-greed' || selectedIndicator === null) && (
            <PanelMaximizeWrapper
              fullHeight={selectedIndicator !== null}
              panelId="sentiment-oscillator"
              isMaximized={maximizedPanel === 'sentiment-oscillator'}
              onMinimize={() => setMaximizedPanel(null)}
              id="indicator-fear-greed"
              ref={setPanelRef('sentiment-oscillator')}
              data-panel="sentiment-oscillator"
              onMouseEnter={preloadCapture}
              className="bg-[#0D1420] border overflow-hidden scroll-mt-4"
              style={{ position: 'relative', background: 'linear-gradient(135deg, #040912 0%, #050A16 60%, #040810 100%)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 40px rgba(0,0,0,0.7)' }}
            >
              <PanelHeader
                code="FNG"
                title="Fear & Greed Index"
                desc="Alternative.me composite sentiment index"
                value={sentiment ? String(sentiment.score) : null}
                zone={sentiment ? { label: (sentiment.label as string).toUpperCase(), color: getSentimentColor(sentiment.score) } : null}
                tag=""
                accentColor={getSentimentColor(sentiment?.score)}
                lastUpdated={sentiment?.timestamp ? new Date(sentiment.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null}
                onScreenshot={() => capturePanel('sentiment-oscillator')}
                onMaximize={() => setMaximizedPanel(maximizedPanel === 'sentiment-oscillator' ? null : 'sentiment-oscillator')}
                isMaximized={maximizedPanel === 'sentiment-oscillator'}
              />
              <div className="px-4 pt-3 pb-4" style={{ background: 'linear-gradient(180deg, rgba(3,5,10,0.85) 0%, rgba(4,7,12,0.55) 12%, rgba(5,8,14,0.22) 28%, transparent 55%)' }}>
                {(!visiblePanels.has('sentiment-oscillator') || isLoading) ? (
                  <ChartSkeleton height={264} />
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
                    {/* Gauge — larger, multi-ring, dramatic */}
                    <div className="xl:col-span-1 flex flex-col items-center justify-center gap-3">
                      <div className="relative w-44 h-44 xl:w-52 xl:h-52 2xl:w-60 2xl:h-60 3xl:w-72 3xl:h-72 4xl:w-80 4xl:h-80">
                        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                          {/* Outer decorative ring */}
                          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(14,26,50,0.8)" strokeWidth="1" />
                          {/* Zone color segments on outer ring */}
                          <circle cx="100" cy="100" r="90" fill="none" stroke="#10B981" strokeWidth="1.5" strokeDasharray="141 424" strokeDashoffset="0" strokeOpacity="0.3" />
                          <circle cx="100" cy="100" r="90" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="141 424" strokeDashoffset="-283" strokeOpacity="0.3" />
                          {/* Tick marks at 25, 50, 75 */}
                          <line x1="190" y1="100" x2="182" y2="100" stroke="rgba(100,140,180,0.4)" strokeWidth="1.5" />
                          <line x1="100" y1="10" x2="100" y2="18" stroke="rgba(100,140,180,0.4)" strokeWidth="1.5" />
                          <line x1="10" y1="100" x2="18" y2="100" stroke="rgba(100,140,180,0.4)" strokeWidth="1.5" />
                          {/* Inner background ring */}
                          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(10,18,36,0.9)" strokeWidth="10" />
                          {/* Main progress ring */}
                          <circle
                            cx="100" cy="100" r="80" fill="none"
                            stroke={getSentimentColor(sentiment?.score)}
                            strokeWidth="5"
                            strokeDasharray={`${(sentiment?.score || 0) * 5.03} 503`}
                            style={{ filter: `drop-shadow(0 0 8px ${getSentimentColor(sentiment?.score)}AA)`, transition: 'stroke-dasharray 1.2s ease' }}
                          />
                          {/* Inner decorative ring */}
                          <circle cx="100" cy="100" r="68" fill="none" stroke="rgba(14,26,50,0.5)" strokeWidth="1" strokeDasharray="3 6" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div
                            className="text-[52px] font-black leading-none tabular-nums"
                            style={{ color: getSentimentColor(sentiment?.score), fontFamily: 'JetBrains Mono, monospace', textShadow: `0 0 30px ${getSentimentColor(sentiment?.score)}60`, letterSpacing: '-0.02em' }}
                          >
                            {sentiment?.score || 0}
                          </div>
                          <div className="text-[9px] uppercase tracking-[0.24em] mt-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#5A7A94' }}>
                            {sentiment?.label || 'NULL'}
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] tracking-[0.22em] mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>TREND SIGNAL</div>
                        <div
                          className={`text-[10px] font-black uppercase tracking-widest ${
                            sentiment?.trendDirection === 'bullish' ? 'text-[#10B981]' :
                            sentiment?.trendDirection === 'bearish' ? 'text-[#EF4444]' : 'text-[#88B4D0]'
                          }`}
                          style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.18em' }}
                        >
                          {sentiment?.trendDirection === 'bearish' && '▼ '}
                          {sentiment?.trendDirection === 'bullish' && '▲ '}
                          {sentiment?.trendDirection || 'NULL'}
                        </div>
                      </div>
                    </div>

                    {/* Historical Chart */}
                    <div className="min-w-0 xl:col-span-5">
                      {isHistoricalLoading ? (
                        <div className="flex items-center justify-center h-64">
                          <span className="text-[9px] text-[#71717A] tracking-[0.2em]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>LOADING</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-3 mb-3">
                            <div className="flex flex-wrap items-center gap-3 text-[7.5px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#5A7A94' }}>
                              <div className="flex items-center gap-1.5"><div className="w-4 h-[2px]" style={{ background: '#10B981', opacity: 0.8 }} /><span>FEAR &lt;25</span></div>
                              <div className="flex items-center gap-1.5"><div className="w-4 h-[2px]" style={{ background: '#EF4444', opacity: 0.8 }} /><span>GREED &gt;75</span></div>
                            </div>
                            <div style={{
                              display: 'flex', alignItems: 'stretch',
                              border: '1px solid rgba(14,26,52,0.98)',
                              background: 'rgba(2,5,14,0.98)',
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.018)',
                            }}>
                              {timeframes.map((tf, i) => {
                                const active = selectedTimeframe === tf.value;
                                return (
                                  <button
                                    key={tf.value}
                                    onClick={() => setSelectedTimeframe(tf.value)}
                                    style={{
                                      fontFamily: 'JetBrains Mono, monospace',
                                      fontSize: '11px',
                                      letterSpacing: '0.12em',
                                      padding: '5px 9px',
                                      borderTop: 'none',
                                      borderBottom: 'none',
                                      borderLeft: 'none',
                                      borderRight: i < timeframes.length - 1 ? '1px solid rgba(14,26,52,0.98)' : 'none',
                                      background: active ? 'rgba(194,52,77,0.20)' : 'transparent',
                                      color: active ? '#E8405A' : 'rgba(255,255,255,0.45)',
                                      fontWeight: active ? 800 : 500,
                                      cursor: 'pointer',
                                      lineHeight: 1,
                                      textTransform: 'uppercase',
                                      boxShadow: active ? 'inset 0 0 0 1px rgba(194,52,77,0.80)' : 'none',
                                    }}
                                    onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.70)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}}
                                    onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}}
                                  >
                                    {tf.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <ResponsiveContainer
                            key={`chart-${selectedTimeframe}`}
                            width="100%"
                            height={ch('sentiment-oscillator')}
                          >
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="fngFill" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%"  stopColor="#88B4D0" stopOpacity={0.12} />
                                  <stop offset="95%" stopColor="#88B4D0" stopOpacity={0} />
                                </linearGradient>
                                {/* Zone-colored stroke: domain [0,100], chartAreaH≈228 */}
                                <linearGradient id="fngLine" x1="0" y1="0" x2="0" y2={ch('sentiment-oscillator') - 32} gradientUnits="userSpaceOnUse">
                                  <stop offset="0%"      stopColor="#EF4444" />
                                  <stop offset="25%"     stopColor="#EF4444" />
                                  <stop offset="25.01%"  stopColor="#F7931A" />
                                  <stop offset="45%"     stopColor="#F7931A" />
                                  <stop offset="45.01%"  stopColor="#88B4D0" />
                                  <stop offset="55%"     stopColor="#88B4D0" />
                                  <stop offset="55.01%"  stopColor="#10B981" />
                                  <stop offset="75%"     stopColor="#10B981" />
                                  <stop offset="75.01%"  stopColor="#10B981" />
                                  <stop offset="100%"    stopColor="#10B981" />
                                </linearGradient>
                              </defs>
                              <ReferenceArea y1={0} y2={25} fill="#10B981" fillOpacity={SENTIMENT_BAND_OPACITY} />
                              <ReferenceArea y1={75} y2={100} fill="#EF4444" fillOpacity={SENTIMENT_BAND_OPACITY} />
                              <XAxis
                                dataKey="index" stroke="none"
                                tick={{ fill: '#8AAEC8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                                ticks={calculateTicks()}
                                tickFormatter={formatXAxis}
                                height={22}
                              />
                              <YAxis
                                domain={[0, 100]}
                                stroke="none"
                                tick={{ fill: '#8AAEC8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                                width={24}
                              />
                              <Tooltip
                                cursor={{ stroke: 'rgba(160,215,255,0.85)', strokeWidth: 2 }}
                                animationDuration={0}
                                isAnimationActive={false}
                                content={<FngTooltip />}
                              />
                              <Area type="monotone" dataKey="score" stroke="url(#fngLine)" strokeWidth={2} fill="url(#fngFill)" animationDuration={0} isAnimationActive={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </PanelMaximizeWrapper>
            )}

            {/* NUPL On-Chain Indicator - Panel 02 */}
            {bgeoPanels.filter(p => p.panelId === 'nupl' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel 03: MVRV Ratio ── */}
            {bgeoPanels.filter(p => p.panelId === 'mvrv' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel key={panel.panelId} panel={panel} selectedIndicator={selectedIndicator} maximizedPanel={maximizedPanel} setMaximizedPanel={setMaximizedPanel} capturePanel={capturePanel} preloadCapture={preloadCapture} setPanelRef={setPanelRef} showBtcPrice={showBtcPrice} setShowBtcPrice={setShowBtcPrice} showIndicator={showIndicator} setShowIndicator={setShowIndicator} visiblePanels={visiblePanels} rechartsReady={true} ch={ch} recharts={_rechartsModule ?? {}} />
            ))}

            {/* ── Panel 04: LTH-MVRV ── */}
            {bgeoPanels.filter(p => p.panelId === 'lth-mvrv' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel key={panel.panelId} panel={panel} selectedIndicator={selectedIndicator} maximizedPanel={maximizedPanel} setMaximizedPanel={setMaximizedPanel} capturePanel={capturePanel} preloadCapture={preloadCapture} setPanelRef={setPanelRef} showBtcPrice={showBtcPrice} setShowBtcPrice={setShowBtcPrice} showIndicator={showIndicator} setShowIndicator={setShowIndicator} visiblePanels={visiblePanels} rechartsReady={true} ch={ch} recharts={_rechartsModule ?? {}} />
            ))}

            {/* ── Panel 05: SOPR ── */}
            {bgeoPanels.filter(p => p.panelId === 'sopr' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel key={panel.panelId} panel={panel} selectedIndicator={selectedIndicator} maximizedPanel={maximizedPanel} setMaximizedPanel={setMaximizedPanel} capturePanel={capturePanel} preloadCapture={preloadCapture} setPanelRef={setPanelRef} showBtcPrice={showBtcPrice} setShowBtcPrice={setShowBtcPrice} showIndicator={showIndicator} setShowIndicator={setShowIndicator} visiblePanels={visiblePanels} rechartsReady={true} ch={ch} recharts={_rechartsModule ?? {}} />
            ))}

            <div className={selectedIndicator !== null ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-3 xl:gap-4 3xl:gap-5 4xl:gap-6"}>
            {/* ── Panel 06: SSR ── */}
            {bgeoPanels.filter(p => p.panelId === 'ssr' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel key={panel.panelId} panel={panel} selectedIndicator={selectedIndicator} maximizedPanel={maximizedPanel} setMaximizedPanel={setMaximizedPanel} capturePanel={capturePanel} preloadCapture={preloadCapture} setPanelRef={setPanelRef} showBtcPrice={showBtcPrice} setShowBtcPrice={setShowBtcPrice} showIndicator={showIndicator} setShowIndicator={setShowIndicator} visiblePanels={visiblePanels} rechartsReady={true} ch={ch} recharts={_rechartsModule ?? {}} />
            ))}
            </div>

            <div className={selectedIndicator !== null ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-3 xl:gap-4 3xl:gap-5 4xl:gap-6"}>
            {/* ── Panel 08: Supply in Loss ── */}

            {bgeoPanels.filter(p => p.panelId === 'supply-loss' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel key={panel.panelId} panel={panel} selectedIndicator={selectedIndicator} maximizedPanel={maximizedPanel} setMaximizedPanel={setMaximizedPanel} capturePanel={capturePanel} preloadCapture={preloadCapture} setPanelRef={setPanelRef} showBtcPrice={showBtcPrice} setShowBtcPrice={setShowBtcPrice} showIndicator={showIndicator} setShowIndicator={setShowIndicator} visiblePanels={visiblePanels} rechartsReady={true} ch={ch} recharts={_rechartsModule ?? {}} />
            ))}

            {/* ── Panel 07: Supply in Profit ── */}
            {bgeoPanels.filter(p => p.panelId === 'supply-profit' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel key={panel.panelId} panel={panel} selectedIndicator={selectedIndicator} maximizedPanel={maximizedPanel} setMaximizedPanel={setMaximizedPanel} capturePanel={capturePanel} preloadCapture={preloadCapture} setPanelRef={setPanelRef} showBtcPrice={showBtcPrice} setShowBtcPrice={setShowBtcPrice} showIndicator={showIndicator} setShowIndicator={setShowIndicator} visiblePanels={visiblePanels} rechartsReady={true} ch={ch} recharts={_rechartsModule ?? {}} />
            ))}
            </div>

            <div className={selectedIndicator !== null ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-3 xl:gap-4 3xl:gap-5 4xl:gap-6"}>
            {/* ── Panel 08: Realized Profit ── */}
            {bgeoPanels.filter(p => p.panelId === 'realized-profit' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel key={panel.panelId} panel={panel} selectedIndicator={selectedIndicator} maximizedPanel={maximizedPanel} setMaximizedPanel={setMaximizedPanel} capturePanel={capturePanel} preloadCapture={preloadCapture} setPanelRef={setPanelRef} showBtcPrice={showBtcPrice} setShowBtcPrice={setShowBtcPrice} showIndicator={showIndicator} setShowIndicator={setShowIndicator} visiblePanels={visiblePanels} rechartsReady={true} ch={ch} recharts={_rechartsModule ?? {}} />
            ))}

            {/* ── Panel 09: Realized Loss ── */}
            {bgeoPanels.filter(p => p.panelId === 'realized-loss' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel key={panel.panelId} panel={panel} selectedIndicator={selectedIndicator} maximizedPanel={maximizedPanel} setMaximizedPanel={setMaximizedPanel} capturePanel={capturePanel} preloadCapture={preloadCapture} setPanelRef={setPanelRef} showBtcPrice={showBtcPrice} setShowBtcPrice={setShowBtcPrice} showIndicator={showIndicator} setShowIndicator={setShowIndicator} visiblePanels={visiblePanels} rechartsReady={true} ch={ch} recharts={_rechartsModule ?? {}} />
            ))}
            </div>

            {/* ── Panel 10: STH MVRV ── */}
            {bgeoPanels.filter(p => p.panelId === 'sth-mvrv' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel key={panel.panelId} panel={panel} selectedIndicator={selectedIndicator} maximizedPanel={maximizedPanel} setMaximizedPanel={setMaximizedPanel} capturePanel={capturePanel} preloadCapture={preloadCapture} setPanelRef={setPanelRef} showBtcPrice={showBtcPrice} setShowBtcPrice={setShowBtcPrice} showIndicator={showIndicator} setShowIndicator={setShowIndicator} visiblePanels={visiblePanels} rechartsReady={true} ch={ch} recharts={_rechartsModule ?? {}} />
            ))}

            {/* ── Panel 11: Hashrate ── */}
            {bgeoPanels.filter(p => p.panelId === 'hashrate' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel key={panel.panelId} panel={panel} selectedIndicator={selectedIndicator} maximizedPanel={maximizedPanel} setMaximizedPanel={setMaximizedPanel} capturePanel={capturePanel} preloadCapture={preloadCapture} setPanelRef={setPanelRef} showBtcPrice={showBtcPrice} setShowBtcPrice={setShowBtcPrice} showIndicator={showIndicator} setShowIndicator={setShowIndicator} visiblePanels={visiblePanels} rechartsReady={true} ch={ch} recharts={_rechartsModule ?? {}} />
            ))}

            {/* BTC & ETH Dominance Kernel - Panel 03 */}
            {selectedIndicator === 'indicator-dominance' && (
            <PanelMaximizeWrapper
              fullHeight={selectedIndicator !== null}
              panelId="dominance"
              isMaximized={maximizedPanel === 'dominance'}
              onMinimize={() => setMaximizedPanel(null)}
              id="indicator-dominance"
              ref={setPanelRef('dominance')}
              data-panel="dominance"
              onMouseEnter={preloadCapture}
              className="bg-[#0D1420] border overflow-hidden scroll-mt-4"
              style={{ position: 'relative', background: 'linear-gradient(135deg, #040912 0%, #050A16 60%, #040810 100%)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 40px rgba(0,0,0,0.7)' }}
            >
              <PanelHeader
                code="DOM"
                title="Market Dominance"
                desc="BTC / ETH relative share"
                value={dominanceData.length > 0 ? `${Number(dominanceData[dominanceData.length - 1].dominance).toFixed(1)}%` : null}
                zone={null}
                tag="1Y"
                accentColor="#F7931A"
                lastUpdated={dominanceData.length > 0 ? new Date(dominanceData[dominanceData.length - 1].time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null}
                onScreenshot={() => capturePanel('dominance')}
                onMaximize={() => setMaximizedPanel(maximizedPanel === 'dominance' ? null : 'dominance')}
                isMaximized={maximizedPanel === 'dominance'}
              />
              <div className="px-4 pt-3 pb-4" style={{ background: 'linear-gradient(180deg, rgba(3,5,10,0.85) 0%, rgba(4,7,12,0.55) 12%, rgba(5,8,14,0.22) 28%, transparent 55%)' }}>
                {(!visiblePanels.has('dominance') || isDominanceLoading) ? (
                  <ChartSkeleton height={320} />
                ) : dominanceChartDataWithPrice.length === 0 ? (
                  <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#52525B', letterSpacing: '0.18em' }}>AWAITING DATA SYNC</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <LineToggle items={[
                        { key: 'btcDom', label: 'BTC DOM', color: '#F7931A', active: showIndicator['btcDom'], onClick: () => setShowIndicator(p => ({ ...p, btcDom: !p.btcDom })) },
                        { key: 'ethDom', label: 'ETH DOM', color: '#627EEA', active: showIndicator['ethDom'], onClick: () => setShowIndicator(p => ({ ...p, ethDom: !p.ethDom })) },
                        { key: 'dominance-price', label: 'PRICE', color: '#FFFFFF', active: showBtcPrice['dominance'], onClick: () => setShowBtcPrice(p => ({ ...p, dominance: !p.dominance })) },
                      ]} />
                    </div>
                    <ResponsiveContainer key="dominance-chart" width="100%" height={ch('dominance')}>
                      <AreaChart data={dominanceChartDataWithPrice} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="btcDominanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F7931A" stopOpacity={0.12}/>
                            <stop offset="95%" stopColor="#F7931A" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="ethDominanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#627EEA" stopOpacity={0.12}/>
                            <stop offset="95%" stopColor="#627EEA" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 6" stroke="rgba(130,175,220,0.04)" vertical={false} />
                        <XAxis dataKey="index" stroke="none"
                          tick={{ fill: '#8AAEC8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                          ticks={getXAxisTicks(dominanceChartDataWithPrice, '365')}
                          tickFormatter={(i: number) => formatXAxisTick(dominanceChartDataWithPrice, i, '365')}
                          height={22} />
                        <YAxis domain={['auto', 'auto']} stroke="none"
                          tick={{ fill: '#8AAEC8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                          tickFormatter={(v) => `${v.toFixed(0)}%`} width={52} />
                        {showBtcPrice['dominance'] && (
                          <YAxis yAxisId="btcPrice" orientation="right" scale="log" domain={['auto', 'auto']} stroke="none"
                            tick={{ fill: '#6B7A8D', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                            tickFormatter={(v) => v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v}`} width={46} />
                        )}
                        <Tooltip cursor={{ stroke: 'rgba(160,215,255,0.85)', strokeWidth: 2 }} animationDuration={0} isAnimationActive={false}
                          content={(props) => (
                            <PrecisionTooltip {...props} accentColor="#F7931A" getRows={(pt, pl) => {
                              const rows: Array<{ label: string; value: string; color: string }> = [];
                              const btcDom = pt.btcDom as number | undefined;
                              const ethDom = pt.ethDom as number | undefined;
                              if (btcDom != null) rows.push({ label: 'BTC DOMINANCE', value: `${btcDom.toFixed(2)}%`, color: '#F7931A' });
                              if (ethDom != null) rows.push({ label: 'ETH DOMINANCE', value: `${ethDom.toFixed(2)}%`, color: '#627EEA' });
                              const btc = pl.find((p) => p.dataKey === 'btcPrice');
                              if (btc?.value) rows.push({ label: 'BTC PRICE', value: `$${Math.round(Number(btc.value)).toLocaleString()}`, color: '#FFFFFF' });
                              return rows;
                            }} />
                          )} />
{showIndicator['btcDom'] && <Area type="monotone" dataKey="btcDom" stroke="#F7931A" strokeWidth={3} fill="url(#btcDominanceGradient)" animationDuration={0} isAnimationActive={false} dot={false} />}
{showIndicator['ethDom'] && <Area type="monotone" dataKey="ethDom" stroke="#627EEA" strokeWidth={3} fill="url(#ethDominanceGradient)" animationDuration={0} isAnimationActive={false} dot={false} />}
                        {showBtcPrice['dominance'] && <Area type="monotone" dataKey="btcPrice" yAxisId="btcPrice" stroke="#FFFFFF" strokeWidth={1.5} fill="none" animationDuration={0} isAnimationActive={false} dot={false} />}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </PanelMaximizeWrapper>
            )}

            {/* ── Panel: AVIV Ratio ── */}
            {bgeoPanels.filter(p => p.panelId === 'aviv' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: MVRV Z-Score ── */}
            {bgeoPanels.filter(p => p.panelId === 'mvrv-zscore' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: Supply Shock Ratio ── */}
            {bgeoPanels.filter(p => p.panelId === 'supply-shock' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: Illiquid Supply ── */}
            {bgeoPanels.filter(p => p.panelId === 'illiquid-supply' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: Hot Supply ── */}
            {bgeoPanels.filter(p => p.panelId === 'hot-supply' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: Puell Multiple ── */}
            {bgeoPanels.filter(p => p.panelId === 'puell-multiple' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: Mayer Multiple ── */}
            {bgeoPanels.filter(p => p.panelId === 'mayer-multiple' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: Reserve Risk ── */}
            {bgeoPanels.filter(p => p.panelId === 'reserve-risk' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: VDD Multiple ── */}
            {bgeoPanels.filter(p => p.panelId === 'vdd' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: Active Addresses ── */}
            {bgeoPanels.filter(p => p.panelId === 'active-addresses' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: Hash Ribbons ── */}
            {selectedIndicator === 'indicator-hashribbons' && (
            <PanelMaximizeWrapper
              fullHeight={selectedIndicator !== null}
              panelId="hashribbons"
              isMaximized={maximizedPanel === 'hashribbons'}
              onMinimize={() => setMaximizedPanel(null)}
              id="indicator-hashribbons"
              ref={setPanelRef('hashribbons')}
              data-panel="hashribbons"
              onMouseEnter={preloadCapture}
              className="bg-[#0D1420] border overflow-hidden scroll-mt-4"
              style={{ position: 'relative', background: 'linear-gradient(135deg, #040912 0%, #050A16 60%, #040810 100%)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 40px rgba(0,0,0,0.7)' }}
            >
              {(() => {
                const last = hashribbonsChartData.length > 0 ? hashribbonsChartData[hashribbonsChartData.length - 1] : null;
                const zone = last?.signal ? getHashribbonsSignalZone(last.signal) : null;
                const val = last?.sma30 != null ? `${(last.sma30 >= 1e6 ? `${(last.sma30/1e6).toFixed(1)}E` : `${(last.sma30/1e3).toFixed(0)}P`)} EH` : null;
                const lastDate = last?.dateFormatted ?? null;
                const zoneColor = zone?.color ?? '#F7931A';
                return (
                  <>
                  <PanelHeader
                    code="HRIBB"
                    title="Hash Ribbons"
                    desc="Hashrate MA crossover — signals miner capitulation and recovery"
                    value={last?.signal ? (last.signal as string).toUpperCase() : val}
                    zone={zone}
                    tag=""
                    accentColor={zoneColor}
                    lastUpdated={lastDate}
                    onScreenshot={() => capturePanel('hashribbons')}
                    onMaximize={() => setMaximizedPanel(maximizedPanel === 'hashribbons' ? null : 'hashribbons')}
                    isMaximized={maximizedPanel === 'hashribbons'}
                  />
              <div className="px-4 pt-3 pb-4" style={{ background: 'linear-gradient(180deg, rgba(3,5,10,0.85) 0%, rgba(4,7,12,0.55) 12%, rgba(5,8,14,0.22) 28%, transparent 55%)' }}>
                {(!visiblePanels.has('hashribbons') || isHashribbonsLoading) ? <ChartSkeleton height={320} /> : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <LineToggle items={[
                        { key: 'hashribbonsSma30', label: 'SMA-30', color: '#F7931A', active: showIndicator['hashribbonsSma30'], onClick: () => setShowIndicator(p => ({ ...p, hashribbonsSma30: !p.hashribbonsSma30 })) },
                        { key: 'hashribbonsSma60', label: 'SMA-60', color: '#60A5FA', active: showIndicator['hashribbonsSma60'], onClick: () => setShowIndicator(p => ({ ...p, hashribbonsSma60: !p.hashribbonsSma60 })) },
                        { key: 'price', label: 'PRICE', color: '#FFFFFF', active: showBtcPrice['hashribbons'], onClick: () => setShowBtcPrice(p => ({ ...p, hashribbons: !p.hashribbons })) },
                      ]} />
                      <TfSelector value={hashribbonsTimeframe} onChange={setHashribbonsTimeframe} />
                    </div>
                    <ResponsiveContainer key={`hashribbons-chart-${hashribbonsTimeframe}`} width="100%" height={ch('hashribbons')}>
                      <AreaChart data={hashribbonsChartDataWithPrice} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="hribSma30Fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F7931A" stopOpacity={0.10} />
                            <stop offset="95%" stopColor="#F7931A" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="hribSma60Fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.08} />
                            <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 6" stroke="rgba(130,175,220,0.04)" vertical={false} />
                        <XAxis dataKey="index" stroke="none" tick={{ fill: '#8AAEC8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                          ticks={getXAxisTicks(hashribbonsChartData, hashribbonsTimeframe)}
                          tickFormatter={(i: number) => formatXAxisTick(hashribbonsChartData, i, hashribbonsTimeframe)} height={22} />
                        <YAxis stroke="none" tick={{ fill: '#8AAEC8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                          tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(0)}E` : v >= 1e3 ? `${(v/1e3).toFixed(0)}P` : `${v.toFixed(0)}T`} width={52} />
                        {showBtcPrice['hashribbons'] && (
                          <YAxis yAxisId="btcPrice" orientation="right" scale="log" domain={['auto', 'auto']} stroke="none"
                            tick={{ fill: '#6B7A8D', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                            tickFormatter={(v) => v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v}`} width={46} />
                        )}
                        <Tooltip cursor={{ stroke: 'rgba(160,215,255,0.85)', strokeWidth: 2 }} animationDuration={0} isAnimationActive={false}
                          content={(props) => (
                            <PrecisionTooltip {...props} accentColor="#F7931A" getRows={(pt, pl) => {
                              const rows: Array<{ label: string; value: string; color: string }> = [];
                              const sma30 = pt.sma30 as number | undefined;
                              const sma60 = pt.sma60 as number | undefined;
                              const signal = pt.signal as string | undefined;
                              if (sma30 != null) rows.push({ label: 'SMA-30', value: sma30 >= 1e6 ? `${(sma30/1e6).toFixed(2)}E EH/s` : `${(sma30/1e3).toFixed(1)}P PH/s`, color: '#F7931A' });
                              if (sma60 != null) rows.push({ label: 'SMA-60', value: sma60 >= 1e6 ? `${(sma60/1e6).toFixed(2)}E EH/s` : `${(sma60/1e3).toFixed(1)}P PH/s`, color: '#60A5FA' });
                              if (signal) { const z = getHashribbonsSignalZone(signal); rows.push({ label: 'SIGNAL', value: signal.toUpperCase(), color: z.color }); }
                              const btc = pl.find((p) => p.dataKey === 'btcPrice');
                              if (btc?.value) rows.push({ label: 'BTC PRICE', value: `$${Math.round(Number(btc.value)).toLocaleString()}`, color: '#FFFFFF' });
                              return rows;
                            }} />
                          )} />
{showIndicator['hashribbonsSma30'] && <Area type="monotone" dataKey="sma30" stroke={zoneColor} strokeWidth={3} fill="url(#hribSma30Fill)" animationDuration={0} isAnimationActive={false} dot={false} />}
{showIndicator['hashribbonsSma60'] && <Area type="monotone" dataKey="sma60" stroke={zoneColor} strokeWidth={3} fill="url(#hribSma60Fill)" animationDuration={0} isAnimationActive={false} dot={false} />}
                        {showBtcPrice['hashribbons'] && <Area type="monotone" dataKey="btcPrice" yAxisId="btcPrice" stroke="#FFFFFF" strokeWidth={1.5} fill="none" animationDuration={0} isAnimationActive={false} dot={false} />}
                        {(hashribbonsTimeframe === '1460' || hashribbonsTimeframe === '999999') && getHalvingIndices(hashribbonsChartDataWithPrice).map((h) => (
                          <ReferenceLine key={h.index} x={h.index} stroke="rgba(247,147,26,0.2)" strokeDasharray="2 4" label={{ value: `${h.year}↑`, position: 'top', fill: 'rgba(247,147,26,0.4)', fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }} />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              </>
                );
              })()}
            </PanelMaximizeWrapper>
            )}

            {macroPanels.filter(p => p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id))).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: Open Interest ── */}
            {bgeoPanels.filter(p => p.panelId === 'open-interest' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: Funding Rate ── */}
            {bgeoPanels.filter(p => p.panelId === 'funding-rate' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: NRPL ── */}
            {bgeoPanels.filter(p => p.panelId === 'nrpl' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: RHODL Ratio ── */}
            {bgeoPanels.filter(p => p.panelId === 'rhodl-ratio' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: NVTS ── */}
            {bgeoPanels.filter(p => p.panelId === 'nvts' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: NVT Z-Score ── */}
            {bgeoPanels.filter(p => p.panelId === 'nvt-zscore' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* ── Panel: CVDD ── */}
            {bgeoPanels.filter(p => p.panelId === 'cvdd' && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* Realized Price — special: uses BTC price as reference */}
            {bgeoPanels.filter(p => p.panelId === 'realized-price' && (p.id === selectedIndicator || (selectedIndicator === null && DEFAULT_OVERVIEW_IDS.has(p.id)))).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* Market Cap + 200-Week MA side-by-side */}
            <div className={selectedIndicator !== null ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-3 xl:gap-4 3xl:gap-5 4xl:gap-6"}>
            {key4SimplePanels.filter(p => (p.panelId === 'market-cap-k4') && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            {/* 200-Week MA — shows MA + BTC price (both are prices, no yAxisId needed) */}
            {selectedIndicator === 'indicator-200-week-ma' && (
            <PanelMaximizeWrapper
              fullHeight={selectedIndicator !== null}
              panelId="200-week-ma"
              isMaximized={maximizedPanel === '200-week-ma'}
              onMinimize={() => setMaximizedPanel(null)}
              id="indicator-200-week-ma"
              ref={setPanelRef('200-week-ma')}
              data-panel="200-week-ma"
              onMouseEnter={preloadCapture}
              className="bg-[#0D1420] border overflow-hidden scroll-mt-4"
              style={{ position: 'relative', background: 'linear-gradient(135deg, #040912 0%, #050A16 60%, #040810 100%)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 40px rgba(0,0,0,0.7)' }}
            >
              {(() => {
                const last = weekMa200ChartData.length > 0 ? weekMa200ChartData[weekMa200ChartData.length - 1].value : null;
                const btcLast = btcPriceData.length > 0 ? btcPriceData[btcPriceData.length - 1].value ?? null : null;
                const zone = (last != null && btcLast != null) ? getWeekMa200Zone(Number(btcLast), Number(last)) : null;
                const lastDate = weekMa200ChartData.length > 0 ? (weekMa200ChartData[weekMa200ChartData.length - 1]?.dateFormatted ?? null) : null;
                const zoneColor = zone?.color ?? '#00E5FF';
                return (
                  <>
                  <PanelHeader
                    code="WMA200" title="200-Week Moving Average" desc="Long-term trend reference (historically = cycle bottom)" accentColor={zoneColor}
                    value={last != null ? `$${Math.round(Number(last)).toLocaleString()}` : null}
                    zone={zone} tag="" lastUpdated={lastDate}
                    onScreenshot={() => capturePanel('200-week-ma')}
                    onMaximize={() => setMaximizedPanel(maximizedPanel === '200-week-ma' ? null : '200-week-ma')}
                    isMaximized={maximizedPanel === '200-week-ma'}
                  />
              <div className="px-4 pt-3 pb-4" style={{ background: 'linear-gradient(180deg, rgba(3,5,10,0.85) 0%, rgba(4,7,12,0.55) 12%, rgba(5,8,14,0.22) 28%, transparent 55%)' }}>
                {(!visiblePanels.has('200-week-ma') || isWeekMa200Loading) ? <ChartSkeleton height={320} /> : weekMa200ChartData.length === 0 ? (
                  <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#52525B', letterSpacing: '0.18em' }}>AWAITING DATA SYNC</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <LineToggle items={[
                        { key: 'weekMa200', label: '200W MA', color: '#00E5FF', active: showIndicator['weekMa200'], onClick: () => setShowIndicator((p) => ({ ...p, weekMa200: !p.weekMa200 })) },
                        { key: 'price-weekMa200', label: 'PRICE', color: '#FFFFFF', active: showBtcPrice['weekMa200'], onClick: () => setShowBtcPrice((p) => ({ ...p, weekMa200: !p.weekMa200 })) },
                      ]} />
                      <TfSelector value={weekMa200Timeframe} onChange={setWeekMa200Timeframe} />
                    </div>
                    <ResponsiveContainer key={`200-week-ma-${weekMa200Timeframe}`} width="100%" height={ch('200-week-ma')}>
                      <AreaChart data={weekMa200ChartDataWithPrice} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="weekMa200Fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.10} />
                            <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 6" stroke="rgba(130,175,220,0.04)" vertical={false} />
                        <XAxis dataKey="index" stroke="none" tick={{ fill: '#8AAEC8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                          ticks={getXAxisTicks(weekMa200ChartData, weekMa200Timeframe)}
                          tickFormatter={(i: number) => formatXAxisTick(weekMa200ChartData, i, weekMa200Timeframe)} height={22} />
                        <YAxis domain={['auto', 'auto']} stroke="none" tick={{ fill: '#8AAEC8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                          tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v.toFixed(0)}`} width={52} />
                        <Tooltip cursor={{ stroke: 'rgba(160,215,255,0.85)', strokeWidth: 2 }} animationDuration={0} isAnimationActive={false}
                          content={(props) => (
                            <PrecisionTooltip {...props} accentColor="#00E5FF" getRows={(pt, pl) => {
                              const rows: Array<{ label: string; value: string; color: string }> = [];
                              const val = pt.value as number | undefined;
                              if (val != null) rows.push({ label: '200W MA', value: `$${Math.round(val).toLocaleString()}`, color: '#00E5FF' });
                              const btc = pl.find((p) => p.dataKey === 'btcPrice');
                              if (btc?.value) rows.push({ label: 'BTC PRICE', value: `$${Math.round(Number(btc.value)).toLocaleString()}`, color: '#FFFFFF' });
                              return rows;
                            }} />
                          )} />
                        {showIndicator['weekMa200'] && <Area type="monotone" dataKey="value" stroke={zoneColor} strokeWidth={3} fill="url(#weekMa200Fill)" animationDuration={0} isAnimationActive={false} dot={false} />}
                        {showBtcPrice['weekMa200'] && <Area type="monotone" dataKey="btcPrice" stroke="#FFFFFF" strokeWidth={1.5} fill="none" animationDuration={0} isAnimationActive={false} dot={false} />}
                        {(weekMa200Timeframe === '1460' || weekMa200Timeframe === '999999') && getHalvingIndices(weekMa200ChartDataWithPrice).map((h) => (
                          <ReferenceLine key={h.index} x={h.index} stroke="rgba(247,147,26,0.2)" strokeDasharray="2 4" label={{ value: `${h.year}↑`, position: 'top', fill: 'rgba(247,147,26,0.4)', fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }} />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              </>
                );
              })()}
            </PanelMaximizeWrapper>
            )}
            </div>



            {key4SimplePanels.filter(p => (p.panelId === 'highly-liquid-supply') && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}

            <div className={selectedIndicator !== null ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-3 xl:gap-4 3xl:gap-5 4xl:gap-6"}>
            {key4SimplePanels.filter(p => (p.panelId === 'lth-position-change' || p.panelId === 'sth-position-change') && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}
            </div>

            <div className={selectedIndicator !== null ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-3 xl:gap-4 3xl:gap-5 4xl:gap-6"}>
            {key4SimplePanels.filter(p => (p.panelId === 'mpi' || p.panelId === 'miner-sell-pressure') && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}
            </div>

            <div className={selectedIndicator !== null ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-3 xl:gap-4 3xl:gap-5 4xl:gap-6"}>
            {key4SimplePanels.filter(p => (p.panelId === 'utxo-profit' || p.panelId === 'utxo-loss') && p.id === selectedIndicator).map((panel) => (
              <SentimentChartPanel
                key={panel.panelId}
                panel={panel}
                selectedIndicator={selectedIndicator}
                maximizedPanel={maximizedPanel}
                setMaximizedPanel={setMaximizedPanel}
                capturePanel={capturePanel}
                preloadCapture={preloadCapture}
                setPanelRef={setPanelRef}
                showBtcPrice={showBtcPrice}
                setShowBtcPrice={setShowBtcPrice}
                showIndicator={showIndicator}
                setShowIndicator={setShowIndicator}
                visiblePanels={visiblePanels}
                rechartsReady={true}
                ch={ch}
                recharts={_rechartsModule ?? {}}
              />
            ))}
            </div>

            <div className={selectedIndicator !== null ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-3 xl:gap-4 3xl:gap-5 4xl:gap-6"}>
            {/* Social Sentiment Analysis Panel */}
            {selectedIndicator === 'indicator-social-sentiment' && (
            <PanelMaximizeWrapper
              fullHeight={selectedIndicator !== null}
              panelId="social-sentiment"
              isMaximized={maximizedPanel === 'social-sentiment'}
              onMinimize={() => setMaximizedPanel(null)}
              id="indicator-social-sentiment"
              ref={setPanelRef('social-sentiment')}
              data-panel="social-sentiment"
              className="bg-[#0D1420] border overflow-hidden"
              style={{ position: 'relative', background: 'linear-gradient(135deg, #040912 0%, #050A16 60%, #040810 100%)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 40px rgba(0,0,0,0.7)' }}
              onMouseEnter={preloadCapture}
            >
              <PanelHeader
                code="SOC"
                title="Social Sentiment"
                desc="community bullish/bearish balance"
                value={socialSentiment ? `${socialSentiment.avgBullish.toFixed(1)}%` : null}
                zone={socialSentiment ? { label: socialSentiment.avgBullish > 55 ? 'BULLISH' : socialSentiment.avgBullish < 45 ? 'BEARISH' : 'NEUTRAL', color: socialSentiment.avgBullish > 55 ? '#00FF88' : socialSentiment.avgBullish < 45 ? '#C2344D' : '#F7931A' } : null}
                tag=""
                accentColor="#A855F7"
                onScreenshot={() => capturePanel('social-sentiment')}
                onMaximize={() => setMaximizedPanel(maximizedPanel === 'social-sentiment' ? null : 'social-sentiment')}
                isMaximized={maximizedPanel === 'social-sentiment'}
              />
              <div className="px-4 pt-3 pb-4" style={{ background: 'linear-gradient(180deg, rgba(3,5,10,0.85) 0%, rgba(4,7,12,0.55) 12%, rgba(5,8,14,0.22) 28%, transparent 55%)' }}>
                {(!visiblePanels.has('social-sentiment') || isSocialLoading) ? (
                  <ChartSkeleton height={200} />
                ) : socialSentiment ? (
                  <div>
                    {/* Aggregate signal bar — flat, sharp, precision */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '6.5px', letterSpacing: '0.28em', color: '#64748B' }}>COMMUNITY AGGREGATE SIGNAL</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '7px', letterSpacing: '0.12em', fontWeight: 800, color: socialSentiment.avgBullish > 55 ? '#00FF88' : socialSentiment.avgBullish < 45 ? '#C2344D' : '#F7931A', textShadow: `0 0 10px ${socialSentiment.avgBullish > 55 ? 'rgba(0,255,136,0.5)' : socialSentiment.avgBullish < 45 ? 'rgba(194,52,77,0.5)' : 'rgba(247,147,26,0.5)'}` }}>
                          {socialSentiment.avgBullish > 55 ? 'BULLISH' : socialSentiment.avgBullish < 45 ? 'BEARISH' : 'NEUTRAL'} · {socialSentiment.avgBullish.toFixed(1)}%
                        </span>
                      </div>
                      {/* Segmented precision bar */}
                      <div style={{ position: 'relative', height: '6px', background: 'rgba(4,8,18,0.9)', border: '1px solid rgba(12,22,44,0.8)', overflow: 'hidden' }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${socialSentiment.avgBullish}%`,
                          background: socialSentiment.avgBullish > 55
                            ? 'linear-gradient(90deg, #1A6040 0%, #00FF88 100%)'
                            : socialSentiment.avgBullish < 45
                            ? 'linear-gradient(90deg, #C2344D 0%, #8B1C30 100%)'
                            : 'linear-gradient(90deg, #7A4500 0%, #F7931A 100%)',
                          boxShadow: socialSentiment.avgBullish > 55 ? '2px 0 12px rgba(0,255,136,0.4)' : socialSentiment.avgBullish < 45 ? '2px 0 12px rgba(194,52,77,0.4)' : '2px 0 12px rgba(247,147,26,0.4)',
                          transition: 'width 0.8s ease',
                        }} />
                        {/* 50% center marker */}
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.08)' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '6px', color: '#C2344D', letterSpacing: '0.14em' }}>BEARISH {(100 - socialSentiment.avgBullish).toFixed(1)}%</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '6px', color: '#00FF88', letterSpacing: '0.14em' }}>BULLISH {socialSentiment.avgBullish.toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Per-coin intelligence dossier rows */}
                    {/* Column headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', marginBottom: '1px' }}>
                      {socialSentiment.coins.map((coin) => (
                        <div key={coin.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', background: 'rgba(4,8,18,0.9)', borderBottom: '1px solid rgba(12,22,44,0.6)' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '6px', color: '#64748B', letterSpacing: '0.20em' }}>{coin.symbol}</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '6px', color: coin.priceChange24h >= 0 ? '#00FF88' : '#C2344D', fontWeight: 700 }}>
                            {coin.priceChange24h >= 0 ? '+' : ''}{coin.priceChange24h.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px' }}>
                      {socialSentiment.coins.map((coin) => {
                        const signalColor = coin.bullish > 55 ? '#00FF88' : coin.bullish < 45 ? '#C2344D' : '#F7931A';
                        const signal = coin.bullish > 55 ? 'BULLISH' : coin.bullish < 45 ? 'BEARISH' : 'NEUTRAL';
                        return (
                          <div
                            key={coin.id}
                            style={{
                              background: 'rgba(4,8,20,0.7)',
                              border: `1px solid rgba(18,34,64,0.8)`,
                              borderTop: '1px solid rgba(255,255,255,0.05)',
                              padding: '10px 10px 8px',
                              transition: 'border-color 0.1s',
                              cursor: 'default',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${signalColor}45`; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(18,34,64,0.8)'; }}
                          >
                            {/* Symbol + rank */}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 800, color: '#D8E8F4', letterSpacing: '0.02em', lineHeight: 1 }}>{coin.symbol}</span>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '7px', color: '#64748B' }}>#{coin.marketCapRank}</span>
                            </div>
                            {/* Flat sentiment bar */}
                            <div style={{ height: '3px', background: 'rgba(4,8,18,0.9)', border: '1px solid rgba(10,20,40,0.6)', marginBottom: '6px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${coin.bullish}%`,
                                background: coin.bullish > 55 ? '#00FF88' : coin.bullish < 45 ? '#C2344D' : '#F7931A',
                                boxShadow: `1px 0 8px ${signalColor}60`,
                                transition: 'width 0.6s ease',
                              }} />
                            </div>
                            {/* Signal chip */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '6px', color: '#64748B', letterSpacing: '0.12em' }}>{coin.bearish.toFixed(1)}% bear</span>
                              <span style={{
                                fontFamily: 'JetBrains Mono, monospace', fontSize: '6.5px', fontWeight: 800,
                                letterSpacing: '0.14em', padding: '2px 6px',
                                color: signalColor, background: `${signalColor}12`, border: `1px solid ${signalColor}40`,
                              }}>{signal}</span>
                            </div>
                            {/* Watchlist */}
                            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(12,22,44,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '6px', color: '#64748B', letterSpacing: '0.12em' }}>WATCHLIST</span>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '7px', color: '#64748B', fontWeight: 600 }}>{(coin.watchlistUsers / 1000).toFixed(0)}K</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#C2344D', letterSpacing: '0.18em' }}>SOCIAL DATA UNAVAILABLE</span>
                  </div>
                )}
              </div>
            </PanelMaximizeWrapper>
            )}

            {/* Trending Market Monitor Panel */}
            {selectedIndicator === 'indicator-trending' && (
            <PanelMaximizeWrapper
              fullHeight={selectedIndicator !== null}
              panelId="trending"
              isMaximized={maximizedPanel === 'trending'}
              onMinimize={() => setMaximizedPanel(null)}
              id="indicator-trending"
              ref={setPanelRef('trending')}
              data-panel="trending-coins"
              className="bg-[#0D1420] border overflow-hidden"
              style={{ position: 'relative', background: 'linear-gradient(135deg, #040912 0%, #050A16 60%, #040810 100%)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 40px rgba(0,0,0,0.7)' }}
              onMouseEnter={preloadCapture}
            >
              <PanelHeader
                code="TRD"
                title="Trending Coins"
                desc="top by social activity score"
                tag=""
                accentColor="#F59E0B"
                onScreenshot={() => capturePanel('trending')}
                onMaximize={() => setMaximizedPanel(maximizedPanel === 'trending' ? null : 'trending')}
                isMaximized={maximizedPanel === 'trending'}
              />
              <div className="px-4 pt-3 pb-4" style={{ background: 'linear-gradient(180deg, rgba(3,5,10,0.85) 0%, rgba(4,7,12,0.55) 12%, rgba(5,8,14,0.22) 28%, transparent 55%)' }}>
                {(!visiblePanels.has('trending-coins') || isSocialLoading) ? (
                  <ChartSkeleton height={200} />
                ) : trendingCoins.length > 0 ? (
                  <div>
                    {/* Terminal data-feed header row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 52px 80px 52px', gap: 0, borderBottom: '1px solid rgba(14,26,50,0.9)', paddingBottom: '6px', marginBottom: '2px' }}>
                      {['·', 'ASSET', 'RANK', 'PRICE (USD)', '24H Δ'].map((h, i) => (
                        <div key={i} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '0.20em', color: '#64748B', textAlign: i > 1 ? 'right' : 'left', padding: '0 4px' }}>{h}</div>
                      ))}
                    </div>

                    {/* Trending coins — terminal feed rows */}
                    {trendingCoins.map((coin, idx: number) => {
                      const item = coin.item;
                      const priceUsd = item.data?.price;
                      const priceChange = item.data?.price_change_percentage_24h?.usd ?? 0;
                      const isPositive = priceChange >= 0;
                      const changeColor = isPositive ? '#00FF88' : '#C2344D';
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'grid', gridTemplateColumns: '28px 1fr 52px 80px 52px',
                            gap: 0, alignItems: 'center',
                            padding: '6px 0',
                            borderBottom: idx < trendingCoins.length - 1 ? '1px solid rgba(10,20,40,0.5)' : 'none',
                            borderLeft: '2px solid transparent',
                            transition: 'all 0.08s ease',
                          }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.background = 'rgba(245,158,11,0.04)';
                            el.style.borderLeftColor = 'rgba(245,158,11,0.4)';
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.background = 'transparent';
                            el.style.borderLeftColor = 'transparent';
                          }}
                        >
                          {/* Rank index */}
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', fontWeight: 800, color: '#F59E0B', padding: '0 4px', textShadow: '0 0 8px rgba(245,158,11,0.4)' }}>{idx + 1}</div>
                          {/* Name + ticker */}
                          <div style={{ padding: '0 4px', overflow: 'hidden' }}>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 600, color: '#BACEDF', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#4E6A80', letterSpacing: '0.10em', marginTop: '1px' }}>{item.symbol?.toUpperCase()}</div>
                          </div>
                          {/* Market cap rank */}
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#4E6A80', textAlign: 'right', padding: '0 4px' }}>
                            {item.market_cap_rank ? `#${item.market_cap_rank}` : '—'}
                          </div>
                          {/* Price */}
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', fontWeight: 600, color: '#7AAAD0', textAlign: 'right', padding: '0 4px', fontVariantNumeric: 'tabular-nums' }}>
                            {priceUsd
                              ? Number(priceUsd) >= 1
                                ? `$${Number(priceUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                : `$${Number(priceUsd).toPrecision(4)}`
                              : '—'}
                          </div>
                          {/* 24h change */}
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8.5px', fontWeight: 700, color: changeColor, textAlign: 'right', padding: '0 4px', textShadow: `0 0 8px ${changeColor}50` }}>
                            {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#C2344D', letterSpacing: '0.18em' }}>TRENDING DATA UNAVAILABLE</span>
                  </div>
                )}
              </div>
            </PanelMaximizeWrapper>
            )}
            </div>

          </div>
        </div>
      </TerminalModulePageShell>

      <style jsx global>{`
        .sentiment-comfort .text-\\[52px\\] { font-size: 58px !important; }
        .sentiment-comfort .text-\\[6px\\],
        .sentiment-comfort [style*="font-size: 6px"] { font-size: 7.5px !important; }
        .sentiment-comfort .text-\\[6\\.5px\\],
        .sentiment-comfort [style*="font-size: 6.5px"] { font-size: 8px !important; }
        .sentiment-comfort .text-\\[7px\\],
        .sentiment-comfort [style*="font-size: 7px"] { font-size: 8.5px !important; }
        .sentiment-comfort .text-\\[7\\.5px\\],
        .sentiment-comfort [style*="font-size: 7.5px"] { font-size: 9px !important; }
        .sentiment-comfort .text-\\[8px\\],
        .sentiment-comfort [style*="font-size: 8px"] { font-size: 9.5px !important; }
        .sentiment-comfort .text-\\[8\\.5px\\],
        .sentiment-comfort [style*="font-size: 8.5px"] { font-size: 10px !important; }
        .sentiment-comfort .text-\\[9px\\],
        .sentiment-comfort [style*="font-size: 9px"] { font-size: 10.5px !important; }
        .sentiment-comfort .text-\\[10px\\],
        .sentiment-comfort [style*="font-size: 10px"] { font-size: 11.5px !important; }
        .sentiment-comfort .text-\\[11px\\],
        .sentiment-comfort [style*="font-size: 11px"] { font-size: 12.5px !important; }
        .sentiment-comfort .text-\\[12px\\],
        .sentiment-comfort [style*="font-size: 12px"] { font-size: 13.5px !important; }
        .sentiment-comfort .text-\\[13px\\],
        .sentiment-comfort [style*="font-size: 13px"] { font-size: 14.5px !important; }
        .sentiment-comfort .text-\\[14px\\],
        .sentiment-comfort [style*="font-size: 14px"] { font-size: 15.5px !important; }
        .sentiment-comfort .text-\\[15px\\],
        .sentiment-comfort [style*="font-size: 15px"] { font-size: 17px !important; }
        .sentiment-comfort [style*="font-size: 16px"] { font-size: 18px !important; }
        .sentiment-comfort [style*="font-size: 24px"] { font-size: 28px !important; }
        .sentiment-comfort .recharts-cartesian-axis-tick-value,
        .sentiment-comfort .recharts-label,
        .sentiment-comfort .recharts-text { font-size: 12px !important; }
        .sentiment-comfort [data-panel] { scroll-margin-top: 18px; }

        @media (min-width: 2560px) {
          .sentiment-comfort .text-\\[52px\\] { font-size: 72px !important; }
          .sentiment-comfort .text-\\[6px\\],
          .sentiment-comfort [style*="font-size: 6px"] { font-size: 9.5px !important; }
          .sentiment-comfort .text-\\[6\\.5px\\],
          .sentiment-comfort [style*="font-size: 6.5px"] { font-size: 10px !important; }
          .sentiment-comfort .text-\\[7px\\],
          .sentiment-comfort [style*="font-size: 7px"] { font-size: 10.5px !important; }
          .sentiment-comfort .text-\\[7\\.5px\\],
          .sentiment-comfort [style*="font-size: 7.5px"] { font-size: 11px !important; }
          .sentiment-comfort .text-\\[8px\\],
          .sentiment-comfort [style*="font-size: 8px"] { font-size: 11.5px !important; }
          .sentiment-comfort .text-\\[8\\.5px\\],
          .sentiment-comfort [style*="font-size: 8.5px"] { font-size: 12px !important; }
          .sentiment-comfort .text-\\[9px\\],
          .sentiment-comfort [style*="font-size: 9px"] { font-size: 12.5px !important; }
          .sentiment-comfort .text-\\[10px\\],
          .sentiment-comfort [style*="font-size: 10px"] { font-size: 13.5px !important; }
          .sentiment-comfort .text-\\[11px\\],
          .sentiment-comfort [style*="font-size: 11px"] { font-size: 14.5px !important; }
          .sentiment-comfort .text-\\[12px\\],
          .sentiment-comfort [style*="font-size: 12px"] { font-size: 15.5px !important; }
          .sentiment-comfort .text-\\[13px\\],
          .sentiment-comfort [style*="font-size: 13px"] { font-size: 16.5px !important; }
          .sentiment-comfort .text-\\[14px\\],
          .sentiment-comfort [style*="font-size: 14px"] { font-size: 17.5px !important; }
          .sentiment-comfort .text-\\[15px\\],
          .sentiment-comfort [style*="font-size: 15px"] { font-size: 19px !important; }
          .sentiment-comfort [style*="font-size: 16px"] { font-size: 20px !important; }
          .sentiment-comfort [style*="font-size: 24px"] { font-size: 30px !important; }
          .sentiment-comfort .recharts-cartesian-axis-tick-value,
          .sentiment-comfort .recharts-label,
          .sentiment-comfort .recharts-text { font-size: 13px !important; }
        }

        @media (min-width: 3840px) {
          .sentiment-comfort .text-\\[52px\\] { font-size: 88px !important; }
          .sentiment-comfort .text-\\[6px\\],
          .sentiment-comfort [style*="font-size: 6px"] { font-size: 11.5px !important; }
          .sentiment-comfort .text-\\[6\\.5px\\],
          .sentiment-comfort [style*="font-size: 6.5px"] { font-size: 12px !important; }
          .sentiment-comfort .text-\\[7px\\],
          .sentiment-comfort [style*="font-size: 7px"] { font-size: 12.5px !important; }
          .sentiment-comfort .text-\\[7\\.5px\\],
          .sentiment-comfort [style*="font-size: 7.5px"] { font-size: 13px !important; }
          .sentiment-comfort .text-\\[8px\\],
          .sentiment-comfort [style*="font-size: 8px"] { font-size: 13.5px !important; }
          .sentiment-comfort .text-\\[8\\.5px\\],
          .sentiment-comfort [style*="font-size: 8.5px"] { font-size: 14px !important; }
          .sentiment-comfort .text-\\[9px\\],
          .sentiment-comfort [style*="font-size: 9px"] { font-size: 14.5px !important; }
          .sentiment-comfort .text-\\[10px\\],
          .sentiment-comfort [style*="font-size: 10px"] { font-size: 15.5px !important; }
          .sentiment-comfort .text-\\[11px\\],
          .sentiment-comfort [style*="font-size: 11px"] { font-size: 16.5px !important; }
          .sentiment-comfort .text-\\[12px\\],
          .sentiment-comfort [style*="font-size: 12px"] { font-size: 17.5px !important; }
          .sentiment-comfort .text-\\[13px\\],
          .sentiment-comfort [style*="font-size: 13px"] { font-size: 18.5px !important; }
          .sentiment-comfort .text-\\[14px\\],
          .sentiment-comfort [style*="font-size: 14px"] { font-size: 19.5px !important; }
          .sentiment-comfort .text-\\[15px\\],
          .sentiment-comfort [style*="font-size: 15px"] { font-size: 21px !important; }
          .sentiment-comfort [style*="font-size: 16px"] { font-size: 22px !important; }
          .sentiment-comfort [style*="font-size: 24px"] { font-size: 32px !important; }
          .sentiment-comfort .recharts-cartesian-axis-tick-value,
          .sentiment-comfort .recharts-label,
          .sentiment-comfort .recharts-text { font-size: 14px !important; }
        }
      `}</style>

      <FooterTerminal />

      {/* Capture confirmation toast */}
      {capturedPanel && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999,
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 16px',
          background: 'rgba(4,8,18,0.98)',
          border: '1px solid rgba(16,185,129,0.4)',
          borderLeft: '2px solid #10B981',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '8px', letterSpacing: '0.18em', color: '#10B981',
          boxShadow: '0 8px 40px rgba(0,0,0,0.9)',
          pointerEvents: 'none',
        }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          CAPTURED · {PANEL_CODES[capturedPanel] ?? capturedPanel.toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default SentimentContent;
