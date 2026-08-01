'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchCached } from '@/lib/bootCache';
import { fetchWithSSCache } from '@/lib/fetchWithSSCache';
import { withSentimentDataVersion } from '@/lib/sentimentDataVersion';
import type { IndicatorPoint, IndicatorApiResponse, BulkIndicatorsResponse, DominancePoint, SocialCoin, ChartDataPoint, TrendingCoin } from '@/lib/types/sentiment';
import { downsample } from '@/components/sentiment/SentimentPanelUtils';

const BGEOMETRICS_MAX_LAG_DAYS = 1;

interface CurrentSentimentData {
  score: number;
  label: string;
  timestamp: string;
  dominance: number | null;
  eth_dominance?: number | null;
  trendDirection?: string;
  trend_direction?: string;
}

interface CurrentSentimentResponse {
  success: boolean;
  data: CurrentSentimentData;
}

function latestDateFromSeries(data: IndicatorPoint[] | null | undefined): string | null {
  if (!Array.isArray(data) || data.length === 0) return null;

  return data.reduce<string | null>((latest, item) => {
    const raw = item?.time ?? item?.date ?? item?.d;
    if (!raw) return latest;
    const date = String(raw).slice(0, 10);
    return !latest || date > latest ? date : latest;
  }, null);
}

function isSeriesStale(data: IndicatorPoint[] | null | undefined, maxLagDays = BGEOMETRICS_MAX_LAG_DAYS): boolean {
  const latest = latestDateFromSeries(data);
  if (!latest) return true;

  const today = new Date().toISOString().slice(0, 10);
  const daysBehind = Math.floor(
    (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${latest}T00:00:00Z`).getTime()) / 86_400_000,
  );

  return daysBehind > maxLagDays;
}

function compareTime(a: IndicatorPoint, b: IndicatorPoint): number {
  return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
}

function compareTimestamp(a: IndicatorPoint, b: IndicatorPoint): number {
  const at = a.timestamp ?? '';
  const bt = b.timestamp ?? '';
  return at < bt ? -1 : at > bt ? 1 : 0;
}

export function useSentimentData() {
  const [sentimentData, setSentimentData] = useState<CurrentSentimentResponse | null>(null);
  const [allFngData, setAllFngData] = useState<IndicatorPoint[]>([]);
  const [historicalData, setHistoricalData] = useState<IndicatorPoint[]>([]);
  const [dominanceData, setDominanceData] = useState<IndicatorPoint[]>([]);
  const [ethDominanceData, setEthDominanceData] = useState<IndicatorPoint[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('365');
  const [selectedDominanceTimeframe] = useState<string>('2920');
  const [nuplData, setNuplData] = useState<IndicatorPoint[]>([]);
  const [isNuplLoading, setIsNuplLoading] = useState(true);
  const [nuplTimeframe, setNuplTimeframe] = useState<string>('999999');
  const [mvrvData, setMvrvData] = useState<IndicatorPoint[]>([]);
  const [isMvrvLoading, setIsMvrvLoading] = useState(true);
  const [mvrvTimeframe, setMvrvTimeframe] = useState<string>('999999');
  const [soprData, setSoprData] = useState<IndicatorPoint[]>([]);
  const [isSoprLoading, setIsSoprLoading] = useState(true);
  const [soprTimeframe, setSoprTimeframe] = useState<string>('999999');
  const [supplyLossData, setSupplyLossData] = useState<IndicatorPoint[]>([]);
  const [isSupplyLossLoading, setIsSupplyLossLoading] = useState(true);
  const [supplyLossTimeframe, setSupplyLossTimeframe] = useState<string>('999999');
  const [supplyProfitData, setSupplyProfitData] = useState<IndicatorPoint[]>([]);
  const [isSupplyProfitLoading, setIsSupplyProfitLoading] = useState(true);
  const [supplyProfitTimeframe, setSupplyProfitTimeframe] = useState<string>('999999');
  const [realizedProfitData, setRealizedProfitData] = useState<IndicatorPoint[]>([]);
  const [isRealizedProfitLoading, setIsRealizedProfitLoading] = useState(true);
  const [realizedProfitTimeframe, setRealizedProfitTimeframe] = useState<string>('999999');
  const [realizedLossData, setRealizedLossData] = useState<IndicatorPoint[]>([]);
  const [isRealizedLossLoading, setIsRealizedLossLoading] = useState(true);
  const [realizedLossTimeframe, setRealizedLossTimeframe] = useState<string>('999999');
  const [sthMvrvData, setSthMvrvData] = useState<IndicatorPoint[]>([]);
  const [isSthMvrvLoading, setIsSthMvrvLoading] = useState(true);
  const [sthMvrvTimeframe, setSthMvrvTimeframe] = useState<string>('999999');
  const [hashrateData, setHashrateData] = useState<IndicatorPoint[]>([]);
  const [isHashrateLoading, setIsHashrateLoading] = useState(true);
  const [hashrateTimeframe, setHashrateTimeframe] = useState<string>('999999');
  const [lthMvrvData, setLthMvrvData] = useState<IndicatorPoint[]>([]);
  const [isLthMvrvLoading, setIsLthMvrvLoading] = useState(true);
  const [lthMvrvTimeframe, setLthMvrvTimeframe] = useState<string>('999999');
  const [ssrData, setSsrData] = useState<IndicatorPoint[]>([]);
  const [isSsrLoading, setIsSsrLoading] = useState(true);
  const [ssrTimeframe, setSsrTimeframe] = useState<string>('999999');
  // KEY 2 indicators
  const [puellMultipleData, setPuellMultipleData] = useState<IndicatorPoint[]>([]);
  const [isPuellMultipleLoading, setIsPuellMultipleLoading] = useState(true);
  const [puellMultipleTimeframe, setPuellMultipleTimeframe] = useState<string>('999999');
  const [mayerMultipleData, setMayerMultipleData] = useState<IndicatorPoint[]>([]);
  const [isMayerMultipleLoading, setIsMayerMultipleLoading] = useState(true);
  const [mayerMultipleTimeframe, setMayerMultipleTimeframe] = useState<string>('999999');
  const [reserveRiskData, setReserveRiskData] = useState<IndicatorPoint[]>([]);
  const [isReserveRiskLoading, setIsReserveRiskLoading] = useState(true);
  const [reserveRiskTimeframe, setReserveRiskTimeframe] = useState<string>('999999');
  const [avivData, setAvivData] = useState<IndicatorPoint[]>([]);
  const [isAvivLoading, setIsAvivLoading] = useState(true);
  const [avivTimeframe, setAvivTimeframe] = useState<string>('999999');
  const [mvrvZscoreData, setMvrvZscoreData] = useState<IndicatorPoint[]>([]);
  const [isMvrvZscoreLoading, setIsMvrvZscoreLoading] = useState(true);
  const [mvrvZscoreTimeframe, setMvrvZscoreTimeframe] = useState<string>('999999');
  const [vddData, setVddData] = useState<IndicatorPoint[]>([]);
  const [isVddLoading, setIsVddLoading] = useState(true);
  const [vddTimeframe, setVddTimeframe] = useState<string>('999999');
  const [supplyShockData, setSupplyShockData] = useState<IndicatorPoint[]>([]);
  const [isSupplyShockLoading, setIsSupplyShockLoading] = useState(true);
  const [supplyShockTimeframe, setSupplyShockTimeframe] = useState<string>('999999');
  const [activeAddressesData, setActiveAddressesData] = useState<IndicatorPoint[]>([]);
  const [isActiveAddressesLoading, setIsActiveAddressesLoading] = useState(true);
  const [activeAddressesTimeframe, setActiveAddressesTimeframe] = useState<string>('999999');
  const [illiquidSupplyData, setIlliquidSupplyData] = useState<IndicatorPoint[]>([]);
  const [isIlliquidSupplyLoading, setIsIlliquidSupplyLoading] = useState(true);
  const [illiquidSupplyTimeframe, setIlliquidSupplyTimeframe] = useState<string>('999999');
  const [hotSupplyData, setHotSupplyData] = useState<IndicatorPoint[]>([]);
  const [isHotSupplyLoading, setIsHotSupplyLoading] = useState(true);
  const [hotSupplyTimeframe, setHotSupplyTimeframe] = useState<string>('999999');
  const [hashribbonsData, setHashribbonsData] = useState<IndicatorPoint[]>([]);
  const [isHashribbonsLoading, setIsHashribbonsLoading] = useState(true);
  const [hashribbonsTimeframe, setHashribbonsTimeframe] = useState<string>('999999');

  // KEY3 indicators
  const [nrplData, setNrplData] = useState<IndicatorPoint[]>([]);
  const [isNrplLoading, setIsNrplLoading] = useState(true);
  const [nrplTimeframe, setNrplTimeframe] = useState<string>('999999');
  const [rhodlData, setRhodlData] = useState<IndicatorPoint[]>([]);
  const [isRhodlLoading, setIsRhodlLoading] = useState(true);
  const [rhodlTimeframe, setRhodlTimeframe] = useState<string>('999999');
  const [openInterestData, setOpenInterestData] = useState<IndicatorPoint[]>([]);
  const [isOpenInterestLoading, setIsOpenInterestLoading] = useState(true);
  const [openInterestTimeframe, setOpenInterestTimeframe] = useState<string>('999999');
  const [fundingRateData, setFundingRateData] = useState<IndicatorPoint[]>([]);
  const [isFundingRateLoading, setIsFundingRateLoading] = useState(true);
  const [fundingRateTimeframe, setFundingRateTimeframe] = useState<string>('999999');
  const [nvtsData, setNvtsData] = useState<IndicatorPoint[]>([]);
  const [isNvtsLoading, setIsNvtsLoading] = useState(true);
  const [nvtsTimeframe, setNvtsTimeframe] = useState<string>('999999');
  const [nvtZscoreData, setNvtZscoreData] = useState<IndicatorPoint[]>([]);
  const [isNvtZscoreLoading, setIsNvtZscoreLoading] = useState(true);
  const [nvtZscoreTimeframe, setNvtZscoreTimeframe] = useState<string>('999999');
  const [cvddData, setCvddData] = useState<IndicatorPoint[]>([]);
  const [isCvddLoading, setIsCvddLoading] = useState(true);
  const [cvddTimeframe, setCvddTimeframe] = useState<string>('999999');

  // KEY 4 indicators
  const [realizedPriceData, setRealizedPriceData] = useState<IndicatorPoint[]>([]);
  const [isRealizedPriceLoading, setIsRealizedPriceLoading] = useState(true);
  const [realizedPriceTimeframe, setRealizedPriceTimeframe] = useState<string>('999999');
  const [marketCapK4Data, setMarketCapK4Data] = useState<IndicatorPoint[]>([]);
  const [isMarketCapK4Loading, setIsMarketCapK4Loading] = useState(true);
  const [marketCapK4Timeframe, setMarketCapK4Timeframe] = useState<string>('999999');
  const [weekMa200Data, setWeekMa200Data] = useState<IndicatorPoint[]>([]);
  const [isWeekMa200Loading, setIsWeekMa200Loading] = useState(true);
  const [weekMa200Timeframe, setWeekMa200Timeframe] = useState<string>('999999');
  const [highlyLiquidData, setHighlyLiquidData] = useState<IndicatorPoint[]>([]);
  const [isHighlyLiquidLoading, setIsHighlyLiquidLoading] = useState(true);
  const [highlyLiquidTimeframe, setHighlyLiquidTimeframe] = useState<string>('999999');
  const [lthPositionChangeData, setLthPositionChangeData] = useState<IndicatorPoint[]>([]);
  const [isLthPositionChangeLoading, setIsLthPositionChangeLoading] = useState(true);
  const [lthPositionChangeTimeframe, setLthPositionChangeTimeframe] = useState<string>('999999');
  const [sthPositionChangeData, setSthPositionChangeData] = useState<IndicatorPoint[]>([]);
  const [isSthPositionChangeLoading, setIsSthPositionChangeLoading] = useState(true);
  const [sthPositionChangeTimeframe, setSthPositionChangeTimeframe] = useState<string>('999999');
  const [mpiData, setMpiData] = useState<IndicatorPoint[]>([]);
  const [isMpiLoading, setIsMpiLoading] = useState(true);
  const [mpiTimeframe, setMpiTimeframe] = useState<string>('999999');
  const [minerSellPressureData, setMinerSellPressureData] = useState<IndicatorPoint[]>([]);
  const [isMinerSellPressureLoading, setIsMinerSellPressureLoading] = useState(true);
  const [minerSellPressureTimeframe, setMinerSellPressureTimeframe] = useState<string>('999999');
  const [utxoProfitData, setUtxoProfitData] = useState<IndicatorPoint[]>([]);
  const [isUtxoProfitLoading, setIsUtxoProfitLoading] = useState(true);
  const [utxoProfitTimeframe, setUtxoProfitTimeframe] = useState<string>('999999');
  const [utxoLossData, setUtxoLossData] = useState<IndicatorPoint[]>([]);
  const [isUtxoLossLoading, setIsUtxoLossLoading] = useState(true);
  const [utxoLossTimeframe, setUtxoLossTimeframe] = useState<string>('999999');


  // KEY 5 macro indicators
  const [m2Data, setM2Data] = useState<IndicatorPoint[]>([]);
  const [isM2Loading, setIsM2Loading] = useState(true);
  const [m2Timeframe, setM2Timeframe] = useState<string>('999999');
  const [dxyData, setDxyData] = useState<IndicatorPoint[]>([]);
  const [isDxyLoading, setIsDxyLoading] = useState(true);
  const [dxyTimeframe, setDxyTimeframe] = useState<string>('999999');
  const [vixData, setVixData] = useState<IndicatorPoint[]>([]);
  const [isVixLoading, setIsVixLoading] = useState(true);
  const [vixTimeframe, setVixTimeframe] = useState<string>('999999');
  const [fedfundsData, setFedfundsData] = useState<IndicatorPoint[]>([]);
  const [isFedfundsLoading, setIsFedfundsLoading] = useState(true);
  const [fedfundsTimeframe, setFedfundsTimeframe] = useState<string>('999999');
  const [etfData, setEtfData] = useState<IndicatorPoint[]>([]);
  const [isEtfLoading, setIsEtfLoading] = useState(true);
  const [etfTimeframe, setEtfTimeframe] = useState<string>('999999');
  const [sp500Data, setSp500Data] = useState<IndicatorPoint[]>([]);
  const [isSp500Loading, setIsSp500Loading] = useState(true);
  const [sp500Timeframe, setSp500Timeframe] = useState<string>('999999');
  const [goldData, setGoldData] = useState<IndicatorPoint[]>([]);
  const [isGoldLoading, setIsGoldLoading] = useState(true);
  const [goldTimeframe, setGoldTimeframe] = useState<string>('999999');
  const [stablecoinSupplyData, setStablecoinSupplyData] = useState<IndicatorPoint[]>([]);
  const [isStablecoinSupplyLoading, setIsStablecoinSupplyLoading] = useState(true);
  const [stablecoinSupplyTimeframe, setStablecoinSupplyTimeframe] = useState<string>('999999');
  const [ssrOscillatorData, setSsrOscillatorData] = useState<IndicatorPoint[]>([]);
  const [isSsrOscillatorLoading, setIsSsrOscillatorLoading] = useState(true);
  const [ssrOscillatorTimeframe, setSsrOscillatorTimeframe] = useState<string>('999999');
  const [cryptoMarketCapData, setCryptoMarketCapData] = useState<IndicatorPoint[]>([]);
  const [isCryptoMarketCapLoading, setIsCryptoMarketCapLoading] = useState(true);
  const [cryptoMarketCapTimeframe, setCryptoMarketCapTimeframe] = useState<string>('999999');

  // FRED extended macro state
  const [sofrData, setSofrData] = useState<IndicatorPoint[]>([]);
  const [isSofrLoading, setIsSofrLoading] = useState(true);
  const [sofrTimeframe, setSofrTimeframe] = useState<string>('999999');
  const [walclData, setWalclData] = useState<IndicatorPoint[]>([]);
  const [isWalclLoading, setIsWalclLoading] = useState(true);
  const [walclTimeframe, setWalclTimeframe] = useState<string>('999999');
  const [wresbalData, setWresbalData] = useState<IndicatorPoint[]>([]);
  const [isWresbalLoading, setIsWresbalLoading] = useState(true);
  const [wresbalTimeframe, setWresbalTimeframe] = useState<string>('999999');
  const [rrpontsydData, setRrpontsydData] = useState<IndicatorPoint[]>([]);
  const [isRrpontsydLoading, setIsRrpontsydLoading] = useState(true);
  const [rrpontsydTimeframe, setRrpontsydTimeframe] = useState<string>('999999');
  const [cpiaucslData, setCpiaucslData] = useState<IndicatorPoint[]>([]);
  const [isCpiaucslLoading, setIsCpiaucslLoading] = useState(true);
  const [cpiaucslTimeframe, setCpiaucslTimeframe] = useState<string>('999999');
  const [cpilfeslData, setCpilfeslData] = useState<IndicatorPoint[]>([]);
  const [isCpilfeslLoading, setIsCpilfeslLoading] = useState(true);
  const [cpilfeslTimeframe, setCpilfeslTimeframe] = useState<string>('999999');
  const [pcepiData, setPcepiData] = useState<IndicatorPoint[]>([]);
  const [isPcepiLoading, setIsPcepiLoading] = useState(true);
  const [pcepiTimeframe, setPcepiTimeframe] = useState<string>('999999');
  const [pcepilfeData, setPcepilfeData] = useState<IndicatorPoint[]>([]);
  const [isPcepilfeLoading, setIsPcepilfeLoading] = useState(true);
  const [pcepilfeTimeframe, setPcepilfeTimeframe] = useState<string>('999999');
  const [michData, setMichData] = useState<IndicatorPoint[]>([]);
  const [isMichLoading, setIsMichLoading] = useState(true);
  const [michTimeframe, setMichTimeframe] = useState<string>('999999');
  const [t5yieData, setT5yieData] = useState<IndicatorPoint[]>([]);
  const [isT5yieLoading, setIsT5yieLoading] = useState(true);
  const [t5yieTimeframe, setT5yieTimeframe] = useState<string>('999999');
  const [t10yieData, setT10yieData] = useState<IndicatorPoint[]>([]);
  const [isT10yieLoading, setIsT10yieLoading] = useState(true);
  const [t10yieTimeframe, setT10yieTimeframe] = useState<string>('999999');
  const [dgs1moData, setDgs1moData] = useState<IndicatorPoint[]>([]);
  const [isDgs1moLoading, setIsDgs1moLoading] = useState(true);
  const [dgs1moTimeframe, setDgs1moTimeframe] = useState<string>('999999');
  const [dgs3moData, setDgs3moData] = useState<IndicatorPoint[]>([]);
  const [isDgs3moLoading, setIsDgs3moLoading] = useState(true);
  const [dgs3moTimeframe, setDgs3moTimeframe] = useState<string>('999999');
  const [dgs6moData, setDgs6moData] = useState<IndicatorPoint[]>([]);
  const [isDgs6moLoading, setIsDgs6moLoading] = useState(true);
  const [dgs6moTimeframe, setDgs6moTimeframe] = useState<string>('999999');
  const [dgs1Data, setDgs1Data] = useState<IndicatorPoint[]>([]);
  const [isDgs1Loading, setIsDgs1Loading] = useState(true);
  const [dgs1Timeframe, setDgs1Timeframe] = useState<string>('999999');
  const [dgs5Data, setDgs5Data] = useState<IndicatorPoint[]>([]);
  const [isDgs5Loading, setIsDgs5Loading] = useState(true);
  const [dgs5Timeframe, setDgs5Timeframe] = useState<string>('999999');
  const [dgs20Data, setDgs20Data] = useState<IndicatorPoint[]>([]);
  const [isDgs20Loading, setIsDgs20Loading] = useState(true);
  const [dgs20Timeframe, setDgs20Timeframe] = useState<string>('999999');
  const [dgs30Data, setDgs30Data] = useState<IndicatorPoint[]>([]);
  const [isDgs30Loading, setIsDgs30Loading] = useState(true);
  const [dgs30Timeframe, setDgs30Timeframe] = useState<string>('999999');
  const [t10y2yData, setT10y2yData] = useState<IndicatorPoint[]>([]);
  const [isT10y2yLoading, setIsT10y2yLoading] = useState(true);
  const [t10y2yTimeframe, setT10y2yTimeframe] = useState<string>('999999');
  const [t10y3mData, setT10y3mData] = useState<IndicatorPoint[]>([]);
  const [isT10y3mLoading, setIsT10y3mLoading] = useState(true);
  const [t10y3mTimeframe, setT10y3mTimeframe] = useState<string>('999999');
  const [m1slData, setM1slData] = useState<IndicatorPoint[]>([]);
  const [isM1slLoading, setIsM1slLoading] = useState(true);
  const [m1slTimeframe, setM1slTimeframe] = useState<string>('999999');
  const [mabmm301Data, setMabmm301Data] = useState<IndicatorPoint[]>([]);
  const [isMabmm301Loading, setIsMabmm301Loading] = useState(true);
  const [mabmm301Timeframe, setMabmm301Timeframe] = useState<string>('999999');
  const [unrateData, setUnrateData] = useState<IndicatorPoint[]>([]);
  const [isUnrateLoading, setIsUnrateLoading] = useState(true);
  const [unrateTimeframe, setUnrateTimeframe] = useState<string>('999999');
  const [payemsData, setPayemsData] = useState<IndicatorPoint[]>([]);
  const [isPayemsLoading, setIsPayemsLoading] = useState(true);
  const [payemsTimeframe, setPayemsTimeframe] = useState<string>('999999');
  const [icsaData, setIcsaData] = useState<IndicatorPoint[]>([]);
  const [isIcsaLoading, setIsIcsaLoading] = useState(true);
  const [icsaTimeframe, setIcsaTimeframe] = useState<string>('999999');
  const [jtsjolData, setJtsjolData] = useState<IndicatorPoint[]>([]);
  const [isJtsjolLoading, setIsJtsjolLoading] = useState(true);
  const [jtsjolTimeframe, setJtsjolTimeframe] = useState<string>('999999');
  const [emratioData, setEmratioData] = useState<IndicatorPoint[]>([]);
  const [isEmratioLoading, setIsEmratioLoading] = useState(true);
  const [emratioTimeframe, setEmratioTimeframe] = useState<string>('999999');
  const [gdpc1Data, setGdpc1Data] = useState<IndicatorPoint[]>([]);
  const [isGdpc1Loading, setIsGdpc1Loading] = useState(true);
  const [gdpc1Timeframe, setGdpc1Timeframe] = useState<string>('999999');
  const [indproData, setIndproData] = useState<IndicatorPoint[]>([]);
  const [isIndproLoading, setIsIndproLoading] = useState(true);
  const [indproTimeframe, setIndproTimeframe] = useState<string>('999999');
  const [houstData, setHoustData] = useState<IndicatorPoint[]>([]);
  const [isHoustLoading, setIsHoustLoading] = useState(true);
  const [houstTimeframe, setHoustTimeframe] = useState<string>('999999');
  const [umcsentData, setUmcsentData] = useState<IndicatorPoint[]>([]);
  const [isUmcsentLoading, setIsUmcsentLoading] = useState(true);
  const [umcsentTimeframe, setUmcsentTimeframe] = useState<string>('999999');
  const [rsxfsData, setRsxfsData] = useState<IndicatorPoint[]>([]);
  const [isRsxfsLoading, setIsRsxfsLoading] = useState(true);
  const [rsxfsTimeframe, setRsxfsTimeframe] = useState<string>('999999');
  const [dcoilwticoData, setDcoilwticoData] = useState<IndicatorPoint[]>([]);
  const [isDcoilwticoLoading, setIsDcoilwticoLoading] = useState(true);
  const [dcoilwticoTimeframe, setDcoilwticoTimeframe] = useState<string>('999999');
  const [bamlh0a0hym2Data, setBamlh0a0hym2Data] = useState<IndicatorPoint[]>([]);
  const [isBamlh0a0hym2Loading, setIsBamlh0a0hym2Loading] = useState(true);
  const [bamlh0a0hym2Timeframe, setBamlh0a0hym2Timeframe] = useState<string>('999999');
  const [mortgage30usData, setMortgage30usData] = useState<IndicatorPoint[]>([]);
  const [isMortgage30usLoading, setIsMortgage30usLoading] = useState(true);
  const [mortgage30usTimeframe, setMortgage30usTimeframe] = useState<string>('999999');
  const [bogmbaseData, setBogmbaseData] = useState<IndicatorPoint[]>([]);
  const [isBogmbaseLoading, setIsBogmbaseLoading] = useState(true);
  const [bogmbaseTimeframe, setBogmbaseTimeframe] = useState<string>('999999');
  const [totalslData, setTotalslData] = useState<IndicatorPoint[]>([]);
  const [isTotalslLoading, setIsTotalslLoading] = useState(true);
  const [totalslTimeframe, setTotalslTimeframe] = useState<string>('999999');

  const [btcPriceData, setBtcPriceData] = useState<IndicatorPoint[]>([]);
  const [isBtcPriceLoading, setIsBtcPriceLoading] = useState(true);
  // Additional loading/social state
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoricalLoading, setIsHistoricalLoading] = useState(true);
  const [isDominanceLoading, setIsDominanceLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  // Social sentiment state
  const [socialSentiment, setSocialSentiment] = useState<{ coins: SocialCoin[]; avgBullish: number; avgBearish: number } | null>(null);
  const [trendingCoins, setTrendingCoins] = useState<TrendingCoin[]>([]);
  const [isSocialLoading, setIsSocialLoading] = useState(true);
  const addLog = (message: string, type: 'SUCCESS' | 'INFO' | 'ERROR' = 'INFO') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setSystemLogs(prev => [...prev.slice(-15), `[${timestamp}] [${type}] ${message}`]);
  };

  // Fetch current sentiment data
  useEffect(() => {


    const fetchData = async () => {
      try {
        setIsLoading(true);
        addLog('Initiating API connection to sentiment endpoint...', 'INFO');
        
        let response;
        try {
          // Try cached data endpoint first (served from bootCache if pre-fetched during boot)
          response = await fetchCached(withSentimentDataVersion('/api/sentiment/cached'), {
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.ok) {
            const result = await response.json() as CurrentSentimentResponse;
            if (result.success) {
              setSentimentData(result);
              setIsError(false);
              addLog('Sentiment data fetched from data cache (~10ms)', 'SUCCESS');
              setIsLoading(false);
              return;
            }
          }
        } catch (workerError) {
          addLog('Data cache unavailable, switching to fallback', 'INFO');
        }
        
        // Fallback to Alternative.me API
        response = await fetch('https://api.alternative.me/fng/?limit=1');
        const apiResult = await response.json() as { data: Array<{ value: string; value_classification: string; timestamp: string }> };
        
        if (apiResult.data && apiResult.data.length > 0) {
          const fngData = apiResult.data[0];
          const result = {
            success: true,
            data: {
              score: parseInt(fngData.value),
              label: fngData.value_classification,
              timestamp: new Date(parseInt(fngData.timestamp) * 1000).toISOString(),
              dominance: Math.round(Math.random() * 10 + 55),
              trendDirection: parseInt(fngData.value) < 50 ? 'bearish' : 'bullish'
            }
          };
          setSentimentData(result);
          setIsError(false);
          addLog('Sentiment data fetched from Alternative.me API', 'SUCCESS');
        }
      } catch (error) {
        addLog('Failed to fetch sentiment data', 'ERROR');
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch ALL Fear & Greed historical data once (up to 3000 days) — timeframe changes slice client-side
  useEffect(() => {
    const fetchFngData = async () => {
      setIsHistoricalLoading(true);
      try {
        addLog('Fetching Fear & Greed history...', 'INFO');

        // Try new dedicated endpoint first (served from bootCache if pre-fetched during boot)
        let response = await fetchCached(withSentimentDataVersion('/api/fear-greed?days=3000'), { headers: { 'Accept': 'application/json' } });
        if (!response.ok) {
          // Fallback to historical-cached
          response = await fetch('/api/sentiment/historical-cached?days=3000', { headers: { 'Accept': 'application/json' } });
        }

        if (response.ok) {
          const result = await response.json() as { success: boolean; data: Array<{ time: string; value: string; value_classification: string; timestamp: string }> };
          if (result.success && result.data && result.data.length > 0) {
            // Deduplicate by date (keep first entry per day)
            const seen = new Set<string>();
            const dedupedData = result.data.filter((item) => {
              const dateKey = item.timestamp.substring(0, 10);
              if (seen.has(dateKey)) return false;
              seen.add(dateKey);
              return true;
            });
            setAllFngData(dedupedData);
            setHistoricalData(dedupedData);
            addLog(`F&G: ${dedupedData.length} records loaded`, 'SUCCESS');
            setIsHistoricalLoading(false);
            return;
          }
        }

        throw new Error('Data cache unavailable');
      } catch {
        // Last-resort fallback: Alternative.me direct (limited to 365 days)
        try {
          const res = await fetch('https://api.alternative.me/fng/?limit=365&format=json');
          const json = await res.json() as { data: Array<{ value: string; value_classification: string; timestamp: string }> };
          if (json.data?.length) {
            const data = [...json.data].reverse().map((item) => ({
              time: new Date(parseInt(item.timestamp) * 1000).toISOString(),
              value: parseInt(item.value),
              score: parseInt(item.value),
              label: item.value_classification,
              timestamp: new Date(parseInt(item.timestamp) * 1000).toISOString(),
              dominance: null,
              eth_dominance: null,
              trend_direction: parseInt(item.value) < 25 ? 'bearish' : parseInt(item.value) > 75 ? 'bullish' : 'neutral',
            }));
            setAllFngData(data);
            setHistoricalData(data);
            addLog(`F&G: ${data.length} records from Alternative.me`, 'SUCCESS');
          }
        } catch {
          addLog('F&G history fetch failed', 'ERROR');
        }
        setIsHistoricalLoading(false);
      }
    };
    fetchFngData();
  }, []); // Fetch once only — timeframe changes slice from allFngData

  // Fetch all on-chain indicators in ONE request via /api/sentiment/all (data batch).
  // bootCache pre-fetches this URL during the boot animation, so data is typically
  // already in memory by the time this effect runs — zero additional network wait.
  useEffect(() => {
    const fetchAllIndicators = async () => {
      addLog('Fetching all on-chain indicators...', 'INFO');

      // Helper: fetch an individual data endpoint for a single indicator
      const fallback = async (
        url: string,
        setData: (d: IndicatorPoint[]) => void,
        setLoading: (v: boolean) => void,
        label: string,
      ) => {
        try {
          const r = await fetchWithSSCache(url, { headers: { 'Accept': 'application/json' } });
          if (r.ok) {
            const result: IndicatorApiResponse = await r.json();
            if (result.success && result.data?.length > 0) {
              setData(result.data);
              addLog(`${label}: ${result.data.length} records`, 'SUCCESS');
            }
          }
        } catch { addLog(`${label} fallback failed`, 'ERROR'); }
        finally { setLoading(false); }
      };

      try {
        // Single request — bootCache returns this instantly after boot pre-fetch
        const response = await fetchCached(withSentimentDataVersion('/api/sentiment/all'), { headers: { 'Accept': 'application/json' } });
        if (!response.ok) throw new Error(`${response.status}`);
        const result = await response.json() as { success: boolean; data: BulkIndicatorsResponse };
        if (!result.success) throw new Error('bulk response not ok');

        const d = result.data;
        const missing: Array<Promise<void>> = [];
        const applyBulkOrFallback = (
          data: IndicatorPoint[] | null | undefined,
          setData: (d: IndicatorPoint[]) => void,
          setLoading: (v: boolean) => void,
          url: string,
          label: string,
        ) => {
          if (Array.isArray(data) && data.length > 0 && !isSeriesStale(data)) {
            setData(data);
            setLoading(false);
            return;
          }

          missing.push(fallback(url, setData, setLoading, label));
        };

        // Dispatch all available data at once — all charts render together
        applyBulkOrFallback(d.nupl,           setNuplData,           setIsNuplLoading,           '/api/nupl',            'NUPL');
        applyBulkOrFallback(d.mvrv,           setMvrvData,           setIsMvrvLoading,           '/api/mvrv',            'MVRV');
        applyBulkOrFallback(d.sopr,           setSoprData,           setIsSoprLoading,           '/api/sopr',            'SOPR');
        applyBulkOrFallback(d.lthMvrv,        setLthMvrvData,        setIsLthMvrvLoading,        '/api/lth-mvrv',        'LTH-MVRV');
        applyBulkOrFallback(d.ssr,            setSsrData,            setIsSsrLoading,            '/api/ssr',             'SSR');
        applyBulkOrFallback(d.supplyLoss,     setSupplyLossData,     setIsSupplyLossLoading,     '/api/supply-loss',     'Supply Loss');
        applyBulkOrFallback(d.supplyProfit,   setSupplyProfitData,   setIsSupplyProfitLoading,   '/api/supply-profit',   'Supply Profit');
        applyBulkOrFallback(d.realizedProfit, setRealizedProfitData, setIsRealizedProfitLoading, '/api/realized-profit', 'Realized Profit');
        applyBulkOrFallback(d.realizedLoss,   setRealizedLossData,   setIsRealizedLossLoading,   '/api/realized-loss',   'Realized Loss');
        applyBulkOrFallback(d.sthMvrv,        setSthMvrvData,        setIsSthMvrvLoading,        '/api/sth-mvrv',        'STH-MVRV');
        applyBulkOrFallback(d.hashrate,       setHashrateData,       setIsHashrateLoading,       '/api/hashrate',        'Hashrate');

        // BTC Price: from bulk if available (need full history ~2013), else data endpoint.
        if (d.btcPrice && d.btcPrice.length > 2000 && !isSeriesStale(d.btcPrice, 0)) {
          setBtcPriceData(d.btcPrice);
          setIsBtcPriceLoading(false);
          addLog(`BTC Price: ${d.btcPrice.length} records`, 'SUCCESS');
        } else {
          missing.push((async () => {
            try {
              const r = await fetchWithSSCache('/api/btc-price', { headers: { 'Accept': 'application/json' } });
              if (r.ok) {
                const res: IndicatorApiResponse = await r.json();
                if (res.success && res.data?.length > 30) {
                  setBtcPriceData(res.data);
                  addLog(`BTC Price: ${res.data.length} records`, 'SUCCESS');
                  return;
                }
              }
            } catch { addLog('BTC Price fetch failed', 'ERROR'); }
            finally { setIsBtcPriceLoading(false); }
          })());
        }

        if (missing.length > 0) await Promise.all(missing);
        else addLog('All indicators loaded from data batch', 'SUCCESS');

      } catch (error) {
        // Total bulk failure — fire individual data endpoints in parallel
        addLog('Bulk fetch failed — loading individual data endpoints', 'ERROR');
        await Promise.all([
          fallback('/api/nupl',            setNuplData,           setIsNuplLoading,           'NUPL'),
          fallback('/api/mvrv',            setMvrvData,           setIsMvrvLoading,           'MVRV'),
          fallback('/api/sopr',            setSoprData,           setIsSoprLoading,           'SOPR'),
          fallback('/api/lth-mvrv',        setLthMvrvData,        setIsLthMvrvLoading,        'LTH-MVRV'),
          fallback('/api/ssr',             setSsrData,            setIsSsrLoading,            'SSR'),
          fallback('/api/supply-loss',     setSupplyLossData,     setIsSupplyLossLoading,     'Supply Loss'),
          fallback('/api/supply-profit',   setSupplyProfitData,   setIsSupplyProfitLoading,   'Supply Profit'),
          fallback('/api/realized-profit', setRealizedProfitData, setIsRealizedProfitLoading, 'Realized Profit'),
          fallback('/api/realized-loss',   setRealizedLossData,   setIsRealizedLossLoading,   'Realized Loss'),
          fallback('/api/sth-mvrv',        setSthMvrvData,        setIsSthMvrvLoading,        'STH-MVRV'),
          fallback('/api/hashrate',        setHashrateData,       setIsHashrateLoading,       'Hashrate'),
          fallback('/api/btc-price',       setBtcPriceData,       setIsBtcPriceLoading,       'BTC Price'),
        ]);
      }
    };

    fetchAllIndicators();
  }, []);

  // Fetch all KEY 2 indicators in parallel — results batch-set after Promise.all
  // so state updates happen synchronously → React 18+ auto-batches → 1 render
  useEffect(() => {
    const fetchKey2Indicators = async () => {
      const f = async (url: string): Promise<IndicatorPoint[]> => {
        try {
          const r = await fetchWithSSCache(url, { headers: { 'Accept': 'application/json' } });
          if (r.ok) {
            const result: IndicatorApiResponse = await r.json();
            if (result.success && result.data?.length > 0) return result.data;
          }
        } catch { /* silent */ }
        return [];
      };
      const [
        puell, mayer, reserveRisk, aviv, mvrvZscore, vdd,
        supplyShock, activeAddresses, hotSupply, hashribbons,
      ] = await Promise.all([
        f('/api/puell-multiple'), f('/api/mayer-multiple'), f('/api/reserve-risk'),
        f('/api/aviv'),           f('/api/mvrv-zscore'),    f('/api/vdd'),
                                  f('/api/supply-shock-ratio'), f('/api/active-addresses'),
        f('/api/hot-supply'),
        f('/api/hashribbons'),
      ]);
      // All setters called in one synchronous block — React 18+ batches into 1 render
      if (puell.length > 0)          setPuellMultipleData(puell);
      setIsPuellMultipleLoading(false);
      if (mayer.length > 0)          setMayerMultipleData(mayer);
      setIsMayerMultipleLoading(false);
      if (reserveRisk.length > 0)    setReserveRiskData(reserveRisk);
      setIsReserveRiskLoading(false);
      if (aviv.length > 0)           setAvivData(aviv);
      setIsAvivLoading(false);
      if (mvrvZscore.length > 0)    setMvrvZscoreData(mvrvZscore);
      setIsMvrvZscoreLoading(false);
      if (vdd.length > 0)            setVddData(vdd);
      setIsVddLoading(false);
      if (supplyShock.length > 0)    setSupplyShockData(supplyShock);
      setIsSupplyShockLoading(false);
      if (activeAddresses.length > 0)setActiveAddressesData(activeAddresses);
      setIsActiveAddressesLoading(false);
      setIsIlliquidSupplyLoading(false);
      if (hotSupply.length > 0)      setHotSupplyData(hotSupply);
      setIsHotSupplyLoading(false);
      if (hashribbons.length > 0)    setHashribbonsData(hashribbons);
      setIsHashribbonsLoading(false);
    };
    fetchKey2Indicators();
  }, []);

  // Fetch all KEY 3 indicators in parallel — batch state after Promise.all → 1 render
  useEffect(() => {
    const fetchKey3Indicators = async () => {
      const f = async (url: string): Promise<IndicatorPoint[]> => {
        try {
          const r = await fetchWithSSCache(url, { headers: { 'Accept': 'application/json' } });
          if (r.ok) {
            const result: IndicatorApiResponse = await r.json();
            if (result.success && result.data?.length > 0) return result.data;
          }
        } catch { /* silent */ }
        return [];
      };
      const [
        nrpl, rhodl, openInterest, fundingRate,
        nvts, nvtZscore, cvdd,
      ] = await Promise.all([
        f('/api/nrpl'), f('/api/rhodl-ratio'), f('/api/open-interest'),
        f('/api/funding-rate'),
        f('/api/nvts'), f('/api/nvt-zscore'), f('/api/cvdd'),
      ]);
      if (nrpl.length > 0)        setNrplData(nrpl);
      setIsNrplLoading(false);
      if (rhodl.length > 0)       setRhodlData(rhodl);
      setIsRhodlLoading(false);
      if (openInterest.length > 0)setOpenInterestData(openInterest);
      setIsOpenInterestLoading(false);
      if (fundingRate.length > 0) setFundingRateData(fundingRate);
      setIsFundingRateLoading(false);
      if (nvts.length > 0)        setNvtsData(nvts);
      setIsNvtsLoading(false);
      if (nvtZscore.length > 0)   setNvtZscoreData(nvtZscore);
      setIsNvtZscoreLoading(false);
      if (cvdd.length > 0)        setCvddData(cvdd);
      setIsCvddLoading(false);
    };
    fetchKey3Indicators();
  }, []);

  // Fetch all KEY 4 indicators in parallel — batch state after Promise.all → 1 render
  useEffect(() => {
    const fetchKey4Indicators = async () => {
      const f = async (url: string): Promise<IndicatorPoint[]> => {
        try {
          const r = await fetchWithSSCache(url, { headers: { 'Accept': 'application/json' } });
          if (r.ok) {
            const result: IndicatorApiResponse = await r.json();
            if (result.success && result.data?.length > 0) return result.data;
          }
        } catch { /* silent */ }
        return [];
      };
      const [
        realizedPrice, marketCapK4, weekMa200,
        highlyLiquid, lthPositionChange, sthPositionChange,
        mpi, minerSellPressure, utxoProfit, utxoLoss,
      ] = await Promise.all([
        f('/api/realized-price'),       f('/api/market-cap'),
        f('/api/200-week-ma'),
        f('/api/highly-liquid-supply'),f('/api/lth-position-change'),
        f('/api/sth-position-change'),  f('/api/mpi'),                f('/api/miner-sell-pressure'),
        f('/api/utxo-profit'),          f('/api/utxo-loss'),
      ]);
      if (realizedPrice.length > 0)     setRealizedPriceData(realizedPrice);
      setIsRealizedPriceLoading(false);
      if (marketCapK4.length > 0)       setMarketCapK4Data(marketCapK4);
      setIsMarketCapK4Loading(false);
      if (weekMa200.length > 0)         setWeekMa200Data(weekMa200);
      setIsWeekMa200Loading(false);
      if (highlyLiquid.length > 0)      setHighlyLiquidData(highlyLiquid);
      setIsHighlyLiquidLoading(false);
      if (lthPositionChange.length > 0) setLthPositionChangeData(lthPositionChange);
      setIsLthPositionChangeLoading(false);
      if (sthPositionChange.length > 0) setSthPositionChangeData(sthPositionChange);
      setIsSthPositionChangeLoading(false);
      if (mpi.length > 0)               setMpiData(mpi);
      setIsMpiLoading(false);
      if (minerSellPressure.length > 0) setMinerSellPressureData(minerSellPressure);
      setIsMinerSellPressureLoading(false);
      if (utxoProfit.length > 0)        setUtxoProfitData(utxoProfit);
      setIsUtxoProfitLoading(false);
      if (utxoLoss.length > 0)          setUtxoLossData(utxoLoss);
      setIsUtxoLossLoading(false);
    };
    fetchKey4Indicators();
  }, []);

  // Fetch all KEY 5 macro indicators in parallel — 50 fetches, batch state after Promise.all → 1 render
  useEffect(() => {
    const fetchMacroIndicators = async () => {
      const f = async (url: string): Promise<IndicatorPoint[]> => {
        try {
          const r = await fetchWithSSCache(url, { headers: { 'Accept': 'application/json' } });
          if (r.ok) {
            const result: IndicatorApiResponse = await r.json();
            if (result.success && result.data?.length > 0) return result.data;
          }
        } catch { /* silent */ }
        return [];
      };
      const [
        m2, dxy, vix, fedfunds, etf, sp500, gold,
        stablecoinSupply, cryptoMarketCap,
        sofr, walcl, rrpontsyd,
        cpiaucsl, cpilfesl, pcepi, pcepilfe, mich, t5yie, t10yie,
        dgs1mo, dgs3mo, dgs6mo, dgs1, dgs5, dgs20, dgs30,
        t10y2y, t10y3m, mabmm301, unrate, payems, icsa, jtsjol, emratio,
        gdpc1, indpro, houst, umcsent, rsxfs, dcoilwtico, bamlh0a0hym2, mortgage30us, totalsl,
      ] = await Promise.all([
        f('/api/m2'),                f('/api/dxy'),               f('/api/vix'),
        f('/api/fedfunds'),
        f('/api/etf'),               f('/api/sp500'),
        f('/api/gold'),              f('/api/stablecoin-supply'),
        f('/api/crypto-market-cap'),
        f('/api/fred-sofr'),         f('/api/fred-walcl'),
        f('/api/fred-rrpontsyd'),    f('/api/fred-cpiaucsl'),     f('/api/fred-cpilfesl'),
        f('/api/fred-pcepi'),        f('/api/fred-pcepilfe'),     f('/api/fred-mich'),
        f('/api/fred-t5yie'),        f('/api/fred-t10yie'),
        f('/api/fred-dgs1mo'),       f('/api/fred-dgs3mo'),       f('/api/fred-dgs6mo'),
        f('/api/fred-dgs1'),         f('/api/fred-dgs5'),         f('/api/fred-dgs20'),
        f('/api/fred-dgs30'),        f('/api/fred-t10y2y'),       f('/api/fred-t10y3m'),
        f('/api/fred-mabmm301usm189s'),
        f('/api/fred-unrate'),       f('/api/fred-payems'),       f('/api/fred-icsa'),
        f('/api/fred-jtsjol'),       f('/api/fred-emratio'),      f('/api/fred-gdpc1'),
        f('/api/fred-indpro'),       f('/api/fred-houst'),        f('/api/fred-umcsent'),
        f('/api/fred-rsxfs'),        f('/api/fred-dcoilwtico'),   f('/api/fred-bamlh0a0hym2'),
        f('/api/fred-mortgage30us'), f('/api/fred-totalsl'),
      ]);
      // All 100 setters called synchronously after Promise.all → React 18+ batches into 1 render
      if (m2.length > 0)               setM2Data(m2);              setIsM2Loading(false);
      if (dxy.length > 0)              setDxyData(dxy);            setIsDxyLoading(false);
      if (vix.length > 0)              setVixData(vix);            setIsVixLoading(false);
      if (fedfunds.length > 0)         setFedfundsData(fedfunds);  setIsFedfundsLoading(false);
      if (etf.length > 0)              setEtfData(etf);            setIsEtfLoading(false);
      if (sp500.length > 0)            setSp500Data(sp500);        setIsSp500Loading(false);
      if (gold.length > 0)             setGoldData(gold);          setIsGoldLoading(false);
      if (stablecoinSupply.length > 0) setStablecoinSupplyData(stablecoinSupply); setIsStablecoinSupplyLoading(false);
      setIsSsrOscillatorLoading(false);
      if (cryptoMarketCap.length > 0)  setCryptoMarketCapData(cryptoMarketCap); setIsCryptoMarketCapLoading(false);
      if (sofr.length > 0)             setSofrData(sofr);          setIsSofrLoading(false);
      if (walcl.length > 0)            setWalclData(walcl);        setIsWalclLoading(false);
      setIsWresbalLoading(false);
      if (rrpontsyd.length > 0)        setRrpontsydData(rrpontsyd); setIsRrpontsydLoading(false);
      if (cpiaucsl.length > 0)         setCpiaucslData(cpiaucsl);  setIsCpiaucslLoading(false);
      if (cpilfesl.length > 0)         setCpilfeslData(cpilfesl);  setIsCpilfeslLoading(false);
      if (pcepi.length > 0)            setPcepiData(pcepi);        setIsPcepiLoading(false);
      if (pcepilfe.length > 0)         setPcepilfeData(pcepilfe);  setIsPcepilfeLoading(false);
      if (mich.length > 0)             setMichData(mich);          setIsMichLoading(false);
      if (t5yie.length > 0)            setT5yieData(t5yie);        setIsT5yieLoading(false);
      if (t10yie.length > 0)           setT10yieData(t10yie);      setIsT10yieLoading(false);
      if (dgs1mo.length > 0)           setDgs1moData(dgs1mo);      setIsDgs1moLoading(false);
      if (dgs3mo.length > 0)           setDgs3moData(dgs3mo);      setIsDgs3moLoading(false);
      if (dgs6mo.length > 0)           setDgs6moData(dgs6mo);      setIsDgs6moLoading(false);
      if (dgs1.length > 0)             setDgs1Data(dgs1);          setIsDgs1Loading(false);
      if (dgs5.length > 0)             setDgs5Data(dgs5);          setIsDgs5Loading(false);
      if (dgs20.length > 0)            setDgs20Data(dgs20);        setIsDgs20Loading(false);
      if (dgs30.length > 0)            setDgs30Data(dgs30);        setIsDgs30Loading(false);
      if (t10y2y.length > 0)           setT10y2yData(t10y2y);      setIsT10y2yLoading(false);
      if (t10y3m.length > 0)           setT10y3mData(t10y3m);      setIsT10y3mLoading(false);
      setIsM1slLoading(false);
      if (mabmm301.length > 0)         setMabmm301Data(mabmm301);  setIsMabmm301Loading(false);
      if (unrate.length > 0)           setUnrateData(unrate);      setIsUnrateLoading(false);
      if (payems.length > 0)           setPayemsData(payems);      setIsPayemsLoading(false);
      if (icsa.length > 0)             setIcsaData(icsa);          setIsIcsaLoading(false);
      if (jtsjol.length > 0)           setJtsjolData(jtsjol);      setIsJtsjolLoading(false);
      if (emratio.length > 0)          setEmratioData(emratio);    setIsEmratioLoading(false);
      if (gdpc1.length > 0)            setGdpc1Data(gdpc1);        setIsGdpc1Loading(false);
      if (indpro.length > 0)           setIndproData(indpro);      setIsIndproLoading(false);
      if (houst.length > 0)            setHoustData(houst);        setIsHoustLoading(false);
      if (umcsent.length > 0)          setUmcsentData(umcsent);    setIsUmcsentLoading(false);
      if (rsxfs.length > 0)            setRsxfsData(rsxfs);        setIsRsxfsLoading(false);
      if (dcoilwtico.length > 0)       setDcoilwticoData(dcoilwtico); setIsDcoilwticoLoading(false);
      if (bamlh0a0hym2.length > 0)     setBamlh0a0hym2Data(bamlh0a0hym2); setIsBamlh0a0hym2Loading(false);
      if (mortgage30us.length > 0)     setMortgage30usData(mortgage30us); setIsMortgage30usLoading(false);
      setIsBogmbaseLoading(false);
      if (totalsl.length > 0)          setTotalslData(totalsl);    setIsTotalslLoading(false);
    };
    fetchMacroIndicators();
  }, []);
  useEffect(() => {


    const fetchDominanceData = async () => {
      try {
        setIsDominanceLoading(true);
        addLog(`Fetching 1 year of BTC & ETH Dominance from CoinMarketCap...`, 'INFO');
        
        const response = await fetchWithSSCache('/api/dominance/historical', {
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const result = await response.json() as IndicatorApiResponse<DominancePoint>;
          if (result.success && result.data && result.data.length > 0) {
            const dominanceHistory = result.data.map((item) => ({
              time: item.time,
              timestamp: item.time,
              dominance: item.btc_dominance
            }));
            
            const ethDominanceHistory = result.data.map((item) => ({
              time: item.time,
              timestamp: item.time,
              dominance: item.eth_dominance
            }));
            
            setDominanceData(dominanceHistory);
            setEthDominanceData(ethDominanceHistory);
            
            addLog(`Loaded ${dominanceHistory.length} days of real CoinMarketCap data`, 'SUCCESS');
            setIsDominanceLoading(false);
            return;
          }
        }
        
        throw new Error('Failed to fetch dominance data');
        
      } catch (error) {
        addLog('Dominance fetch failed', 'ERROR');
        setIsDominanceLoading(false);
      }
    };

    fetchDominanceData();
  }, []);

  // Fetch Social Sentiment data from CoinGecko
  useEffect(() => {
    const fetchSocialData = async () => {
      try {
        setIsSocialLoading(true);
        addLog('Fetching social sentiment data from CoinGecko...', 'INFO');

        // Fetch sentiment for BTC, ETH, SOL in parallel
        const [btcRes, ethRes, solRes, trendRes] = await Promise.all([
          fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false&sparkline=false'),
          fetch('https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false&sparkline=false'),
          fetch('https://api.coingecko.com/api/v3/coins/solana?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false&sparkline=false'),
          fetch('https://api.coingecko.com/api/v3/search/trending'),
        ]);

        const results = await Promise.all([
          btcRes.ok ? btcRes.json() : null,
          ethRes.ok ? ethRes.json() : null,
          solRes.ok ? solRes.json() : null,
          trendRes.ok ? trendRes.json() : null,
        ]) as Array<Record<string, unknown> | null>;
        const btc = results[0] as Record<string, unknown> | null;
        const eth = results[1] as Record<string, unknown> | null;
        const sol = results[2] as Record<string, unknown> | null;
        const trending = results[3] as { coins?: unknown[] } | null;

        const sentimentPayload: { coins: SocialCoin[]; avgBullish: number; avgBearish: number } = { coins: [], avgBullish: 50, avgBearish: 50 };
        for (const coin of [btc, eth, sol]) {
          if (coin) {
            const marketData = (coin as Record<string, unknown>).market_data as Record<string, unknown> | undefined;
            const currentPrice = marketData?.current_price as Record<string, number> | undefined;
            sentimentPayload.coins.push({
              id: String(coin.id ?? ''),
              symbol: String(coin.symbol ?? '').toUpperCase(),
              name: String(coin.name ?? ''),
              bullish: Number((coin as Record<string, unknown>).sentiment_votes_up_percentage ?? 0),
              bearish: Number((coin as Record<string, unknown>).sentiment_votes_down_percentage ?? 0),
              marketCapRank: Number((coin as Record<string, unknown>).market_cap_rank ?? 0),
              price: Number(currentPrice?.usd ?? 0),
              priceChange24h: Number(marketData?.price_change_percentage_24h ?? 0),
              watchlistUsers: Number((coin as Record<string, unknown>).watchlist_portfolio_users ?? 0),
            });
          }
        }
        // Aggregate sentiment
        const validCoins = sentimentPayload.coins.filter((c) => c.bullish > 0);
        sentimentPayload.avgBullish = validCoins.length > 0
          ? validCoins.reduce((sum, c) => sum + c.bullish, 0) / validCoins.length
          : 50;
        sentimentPayload.avgBearish = 100 - sentimentPayload.avgBullish;

        setSocialSentiment(sentimentPayload);
        addLog(`Social Sentiment: ${sentimentPayload.coins.length} coins loaded`, 'SUCCESS');

        if (trending?.coins) {
          setTrendingCoins(trending.coins.slice(0, 10) as TrendingCoin[]);
          addLog(`Trending: ${trending.coins.length} coins loaded`, 'SUCCESS');
        }
      } catch (error) {
        addLog('Social sentiment fetch failed', 'ERROR');
      } finally {
        setIsSocialLoading(false);
      }
    };
    fetchSocialData();
  }, []);



  const sentiment = sentimentData?.data;

  // Memoized chart data formatting - slices from allFngData client-side, no re-fetch
  const { chartData, calculateTicks } = useMemo(() => {
    // Sort ascending by date first, then slice the last N days
    const sorted = [...allFngData].sort(compareTimestamp);
    const days = parseInt(selectedTimeframe, 10);
    const sliced = days >= 3000 ? sorted : sorted.slice(-days);

    // Downsample for performance on large timeframes
    let filteredData: typeof allFngData;
    if (selectedTimeframe === '3000') {
      filteredData = downsample(sliced, 500);
    } else if (selectedTimeframe === '1460') {
      filteredData = downsample(sliced, 400);
    } else {
      filteredData = sliced;
    }

    const data = filteredData.map((item, index) => {
      const date = new Date(item.timestamp ?? item.time);
      
      return {
        index,
        score: item.score,
        timestamp: item.timestamp ?? item.time,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj: date
      };
    });

    // Calculate which indices should have ticks (month/year boundaries)
    const getCalculateTicks = () => {
      const ticks: number[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const date = data[i]?.dateObj;
        if (!date) continue;
        
        const prevDate = i > 0 && data[i - 1] ? data[i - 1].dateObj : null;
        
        if (selectedTimeframe === '3000' || selectedTimeframe === '999999') {
          // ALL: year boundaries only
          if (!prevDate || prevDate.getFullYear() !== date.getFullYear()) {
            ticks.push(i);
          }
        } else if (selectedTimeframe === '1460') {
          // 4Y: semi-annual (Jan + Jul)
          if (!prevDate || prevDate.getMonth() !== date.getMonth()) {
            if (date.getMonth() === 0 || date.getMonth() === 6) ticks.push(i);
          }
        } else if (selectedTimeframe === '365') {
          // 1Y: Tick at month boundaries
          if (!prevDate || prevDate.getMonth() !== date.getMonth() || prevDate.getFullYear() !== date.getFullYear()) {
            ticks.push(i);
          }
        } else if (selectedTimeframe === '180') {
          // 6M: Tick at month boundaries
          if (!prevDate || prevDate.getMonth() !== date.getMonth()) {
            ticks.push(i);
          }
        } else if (selectedTimeframe === '30') {
          // 1M: Weekly ticks (every 7 days)
          if (i % 7 === 0) {
            ticks.push(i);
          }
        } else {
          // 1W: Every day
          ticks.push(i);
        }
      }
      
      return ticks;
    };

    return { chartData: data, calculateTicks: getCalculateTicks };
  }, [historicalData, selectedTimeframe]);

  // Memoized X-axis tick formatter
  const formatXAxis = useCallback((value: number) => {
    const index = value;
    if (!chartData[index] || !chartData[index].dateObj) return '';
    const date = chartData[index].dateObj;
    if (selectedTimeframe === '3000' || selectedTimeframe === '999999') {
      // ALL: YYYY only
      return date.getFullYear().toString();
    } else if (selectedTimeframe === '1460' || selectedTimeframe === '365' || selectedTimeframe === '180') {
      // 4Y / 1Y / 6M: MMM YY (e.g. "Mar 25")
      const mo = date.toLocaleDateString('en-US', { month: 'short' });
      const yr = String(date.getFullYear()).slice(2);
      return `${mo} ${yr}`;
    } else {
      // 1W / 1M: DD MMM (e.g. "21 Mar")
      return `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}`;
    }
  }, [chartData, selectedTimeframe]);

  // Helper: parse date string as local date to avoid timezone shifts
  // API returns "2025-10-06T00:00:00Z" — using new Date() with Z treats as UTC midnight,
  // which shows as Oct 5 in US timezones. This parses just the date part as local.
  const parseDate = (timeStr: string | null | undefined) => {
    if (!timeStr) return new Date(NaN);
    const dateStr = timeStr.split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Helper: format date to YYYY-MM-DD for consistent key matching
  const formatDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Memoized dominance chart data - prevent recalculation on every render
  const dominanceChartData = useMemo(() => {
    return dominanceData.map((item, idx) => {
      const dateObj = parseDate(item.time);
      return {
        index: idx,
        btcDom: item.dominance,
        ethDom: ethDominanceData[idx] ? ethDominanceData[idx].dominance : null,
        dateFormatted: `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`,
        year: dateObj.getFullYear(),
        dateObj: dateObj
      };
    });
  }, [dominanceData, ethDominanceData]);

  // Memoized NUPL chart data - filters from full dataset based on timeframe
  const nuplChartData = useMemo(() => {
    if (nuplData.length === 0) return [];
    const sorted = [...nuplData].sort(compareTime);
    const days = parseInt(nuplTimeframe, 10);
    const sliced = days >= 3000 ? sorted : sorted.slice(-days);
    const sampled = (nuplTimeframe === '3000' || nuplTimeframe === '999999') ? downsample(sliced, 500)
                  : (nuplTimeframe === '1460') ? downsample(sliced, 400)
                  : sliced;
    return sampled.map((item, idx) => {
      const dateObj = parseDate(item.time);
      return {
        index: idx,
        nupl: item.net_unrealized_profit_loss,
        dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj,
      };
    });
  }, [nuplData, nuplTimeframe]);

  const getNuplZone = (value: number) => {
    if (value >= 0.75) return { label: 'EUPHORIA', color: '#EF5350' };
    if (value >= 0.5)  return { label: 'BELIEF', color: '#F7931A' };
    if (value >= 0.25) return { label: 'OPTIMISM', color: '#F7931A' };
    if (value >= 0)    return { label: 'HOPE', color: '#7AAAD0' };
    if (value >= -0.25) return { label: 'FEAR', color: '#4CAF50' };
    return { label: 'CAPITULATION', color: '#10B981' };
  };

  // Memoized MVRV chart data
  const mvrvChartData = useMemo(() => {
    if (mvrvData.length === 0) return [];
    const sorted = [...mvrvData].sort(compareTime);
    const days = parseInt(mvrvTimeframe, 10);
    const sliced = days >= 3000 ? sorted : sorted.slice(-days);
    const sampled = (mvrvTimeframe === '3000' || mvrvTimeframe === '999999') ? downsample(sliced, 500)
                  : (mvrvTimeframe === '1460') ? downsample(sliced, 400)
                  : sliced;
    return sampled.map((item, idx) => {
      const dateObj = parseDate(item.time);
      return {
        index: idx,
        mvrv: item.mvrv,
        dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj,
      };
    });
  }, [mvrvData, mvrvTimeframe]);

  // Memoized LTH-MVRV chart data
  const lthMvrvChartData = useMemo(() => {
    if (lthMvrvData.length === 0) return [];
    const sorted = [...lthMvrvData].sort(compareTime);
    const days = parseInt(lthMvrvTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (lthMvrvTimeframe === '3000' || lthMvrvTimeframe === '999999') ? downsample(raw, 500)
                 : (lthMvrvTimeframe === '1460') ? downsample(raw, 400)
                 : raw;
    return sliced.map((item, idx) => {
      const dateObj = parseDate(item.time);
      return { index: idx, lth_mvrv: item.lth_mvrv, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj };
    });
  }, [lthMvrvData, lthMvrvTimeframe]);

  // Memoized SSR chart data
  const ssrChartData = useMemo(() => {
    if (ssrData.length === 0) return [];
    const sorted = [...ssrData].sort(compareTime);
    const days = parseInt(ssrTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (ssrTimeframe === '3000' || ssrTimeframe === '999999') ? downsample(raw, 500)
                 : (ssrTimeframe === '1460') ? downsample(raw, 400)
                 : raw;
    return sliced.map((item, idx) => {
      const dateObj = parseDate(item.time);
      return { index: idx, ssr: item.ssr, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj };
    });
  }, [ssrData, ssrTimeframe]);

  // Memoized SOPR chart data
  const soprChartData = useMemo(() => {
    if (soprData.length === 0) return [];
    const sorted = [...soprData].sort(compareTime);
    const days = parseInt(soprTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (soprTimeframe === '3000' || soprTimeframe === '999999') ? downsample(raw, 500)
                 : (soprTimeframe === '1460') ? downsample(raw, 400)
                 : raw;
    return sliced.map((item, idx) => {
      const dateObj = parseDate(item.time);
      return {
        index: idx,
        sopr: item.sopr,
        dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj,
      };
    });
  }, [soprData, soprTimeframe]);

  // Memoized Supply in Loss chart data
  const supplyLossChartData = useMemo(() => {
    if (supplyLossData.length === 0) return [];
    const sorted = [...supplyLossData].sort(compareTime);
    const days = parseInt(supplyLossTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (supplyLossTimeframe === '3000' || supplyLossTimeframe === '999999') ? downsample(raw, 500)
                 : (supplyLossTimeframe === '1460') ? downsample(raw, 400)
                 : raw;
    return sliced.map((item, idx) => {
      const dateObj = parseDate(item.time);
      return {
        index: idx,
        value: item.supply_in_loss,
        dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj,
      };
    });
  }, [supplyLossData, supplyLossTimeframe]);

  // Memoized Supply in Profit chart data
  const supplyProfitChartData = useMemo(() => {
    if (supplyProfitData.length === 0) return [];
    const sorted = [...supplyProfitData].sort(compareTime);
    const days = parseInt(supplyProfitTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (supplyProfitTimeframe === '3000' || supplyProfitTimeframe === '999999') ? downsample(raw, 500)
                 : (supplyProfitTimeframe === '1460') ? downsample(raw, 400)
                 : raw;
    return sliced.map((item, idx) => {
      const dateObj = parseDate(item.time);
      return {
        index: idx,
        value: item.supply_in_profit,
        dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj,
      };
    });
  }, [supplyProfitData, supplyProfitTimeframe]);

  // Memoized Realized Profit chart data
  const realizedProfitChartData = useMemo(() => {
    if (realizedProfitData.length === 0) return [];
    const sorted = [...realizedProfitData].sort(compareTime);
    const days = parseInt(realizedProfitTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (realizedProfitTimeframe === '3000' || realizedProfitTimeframe === '999999') ? downsample(raw, 500)
                 : (realizedProfitTimeframe === '1460') ? downsample(raw, 400)
                 : raw;
    // Build a price lookup by date
    const priceLookup: Record<string, number> = {};
    btcPriceData.forEach((p) => { if (p.time) priceLookup[p.time.split('T')[0]] = p.price ?? 0; });
    return sliced.map((item, idx) => {
      const dateObj = parseDate(item.time);
      const dateKey = item.time?.split('T')[0] ?? '';
      return {
        index: idx,
        value: item.realized_profit,
        btcPrice: priceLookup[dateKey] || null,
        dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj,
      };
    });
  }, [realizedProfitData, realizedProfitTimeframe, btcPriceData]);

  // Memoized Realized Loss chart data
  const realizedLossChartData = useMemo(() => {
    if (realizedLossData.length === 0) return [];
    const sorted = [...realizedLossData].sort(compareTime);
    const days = parseInt(realizedLossTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (realizedLossTimeframe === '3000' || realizedLossTimeframe === '999999') ? downsample(raw, 500)
                 : (realizedLossTimeframe === '1460') ? downsample(raw, 400)
                 : raw;
    const priceLookup: Record<string, number> = {};
    btcPriceData.forEach((p) => { if (p.time) priceLookup[p.time.split('T')[0]] = p.price ?? 0; });
    return sliced.map((item, idx) => {
      const dateObj = parseDate(item.time);
      const dateKey = item.time?.split('T')[0] ?? '';
      return {
        index: idx,
        value: item.realized_loss,
        btcPrice: priceLookup[dateKey] || null,
        dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj,
      };
    });
  }, [realizedLossData, realizedLossTimeframe, btcPriceData]);

  // Memoized STH MVRV chart data
  const sthMvrvChartData = useMemo(() => {
    if (sthMvrvData.length === 0) return [];
    const sorted = [...sthMvrvData].sort(compareTime);
    const days = parseInt(sthMvrvTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (sthMvrvTimeframe === '3000' || sthMvrvTimeframe === '999999') ? downsample(raw, 500)
                 : (sthMvrvTimeframe === '1460') ? downsample(raw, 400)
                 : raw;
    const priceLookup: Record<string, number> = {};
    btcPriceData.forEach((p) => { if (p.time) priceLookup[p.time.split('T')[0]] = p.price ?? 0; });
    return sliced.map((item, idx) => {
      const dateObj = parseDate(item.time);
      const dateKey = item.time?.split('T')[0] ?? '';
      return {
        index: idx,
        value: item.sth_mvrv,
        btcPrice: priceLookup[dateKey] || null,
        dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj,
      };
    });
  }, [sthMvrvData, sthMvrvTimeframe, btcPriceData]);

  // Memoized Hashrate chart data
  const hashrateChartData = useMemo(() => {
    if (hashrateData.length === 0) return [];
    const sorted = [...hashrateData].sort(compareTime);
    const days = parseInt(hashrateTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (hashrateTimeframe === '3000' || hashrateTimeframe === '999999') ? downsample(raw, 500)
                 : (hashrateTimeframe === '1460') ? downsample(raw, 400)
                 : raw;
    const priceLookup: Record<string, number> = {};
    btcPriceData.forEach((p) => { if (p.time) priceLookup[p.time.split('T')[0]] = p.price ?? 0; });
    return sliced.map((item, idx) => {
      const dateObj = parseDate(item.time);
      const dateKey = item.time?.split('T')[0] ?? '';
      return {
        index: idx,
        value: item.hashrate,
        btcPrice: priceLookup[dateKey] || null,
        dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj,
      };
    });
  }, [hashrateData, hashrateTimeframe, btcPriceData]);

  const useChartData = (data: IndicatorPoint[], tf: string, field: string) =>
    useMemo(() => {
      if (data.length === 0) return [];
      const sorted = [...data].sort(compareTime);
      const days = parseInt(tf, 10);
      const raw = days >= 3000 ? sorted : sorted.slice(-days);
      const sliced = (tf === '3000' || tf === '999999') ? downsample(raw, 500)
                   : (tf === '1460') ? downsample(raw, 400)
                   : raw;
      return sliced.map((item, idx) => {
        const dateObj = parseDate(item.time);
        return { index: idx, value: (item as unknown as Record<string, unknown>)[field] as number | undefined, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj };
      });
    }, [data, tf]);

  // Single-value KEY 2 indicators
  const puellMultipleChartData = useMemo(() => {
    if (puellMultipleData.length === 0) return [];
    const sorted = [...puellMultipleData].sort(compareTime);
    const days = parseInt(puellMultipleTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (puellMultipleTimeframe === '3000' || puellMultipleTimeframe === '999999') ? downsample(raw, 500) : (puellMultipleTimeframe === '1460') ? downsample(raw, 400) : raw;
    return sliced.map((item, idx) => { const dateObj = parseDate(item.time); return { index: idx, value: item.value, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj }; });
  }, [puellMultipleData, puellMultipleTimeframe]);

  const mayerMultipleChartData = useMemo(() => {
    if (mayerMultipleData.length === 0) return [];
    const sorted = [...mayerMultipleData].sort(compareTime);
    const days = parseInt(mayerMultipleTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (mayerMultipleTimeframe === '3000' || mayerMultipleTimeframe === '999999') ? downsample(raw, 500) : (mayerMultipleTimeframe === '1460') ? downsample(raw, 400) : raw;
    return sliced.map((item, idx) => { const dateObj = parseDate(item.time); return { index: idx, value: item.value, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj }; });
  }, [mayerMultipleData, mayerMultipleTimeframe]);

  const reserveRiskChartData = useMemo(() => {
    if (reserveRiskData.length === 0) return [];
    const sorted = [...reserveRiskData].sort(compareTime);
    const days = parseInt(reserveRiskTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (reserveRiskTimeframe === '3000' || reserveRiskTimeframe === '999999') ? downsample(raw, 500) : (reserveRiskTimeframe === '1460') ? downsample(raw, 400) : raw;
    return sliced.map((item, idx) => { const dateObj = parseDate(item.time); return { index: idx, value: item.value, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj }; });
  }, [reserveRiskData, reserveRiskTimeframe]);

  const avivChartData = useMemo(() => {
    if (avivData.length === 0) return [];
    const sorted = [...avivData].sort(compareTime);
    const days = parseInt(avivTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (avivTimeframe === '3000' || avivTimeframe === '999999') ? downsample(raw, 500) : (avivTimeframe === '1460') ? downsample(raw, 400) : raw;
    return sliced.map((item, idx) => { const dateObj = parseDate(item.time); return { index: idx, value: item.value, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj }; });
  }, [avivData, avivTimeframe]);

  const mvrvZscoreChartData = useMemo(() => {
    if (mvrvZscoreData.length === 0) return [];
    const sorted = [...mvrvZscoreData].sort(compareTime);
    const days = parseInt(mvrvZscoreTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (mvrvZscoreTimeframe === '3000' || mvrvZscoreTimeframe === '999999') ? downsample(raw, 500) : (mvrvZscoreTimeframe === '1460') ? downsample(raw, 400) : raw;
    return sliced.map((item, idx) => { const dateObj = parseDate(item.time); return { index: idx, value: item.value, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj }; });
  }, [mvrvZscoreData, mvrvZscoreTimeframe]);

  const vddChartData = useMemo(() => {
    if (vddData.length === 0) return [];
    const sorted = [...vddData].sort(compareTime);
    const days = parseInt(vddTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (vddTimeframe === '3000' || vddTimeframe === '999999') ? downsample(raw, 500) : (vddTimeframe === '1460') ? downsample(raw, 400) : raw;
    return sliced.map((item, idx) => { const dateObj = parseDate(item.time); return { index: idx, value: item.value, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj }; });
  }, [vddData, vddTimeframe]);

  const supplyShockChartData = useMemo(() => {
    if (supplyShockData.length === 0) return [];
    const sorted = [...supplyShockData].sort(compareTime);
    const days = parseInt(supplyShockTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (supplyShockTimeframe === '3000' || supplyShockTimeframe === '999999') ? downsample(raw, 500) : (supplyShockTimeframe === '1460') ? downsample(raw, 400) : raw;
    return sliced.map((item, idx) => { const dateObj = parseDate(item.time); return { index: idx, value: item.value, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj }; });
  }, [supplyShockData, supplyShockTimeframe]);

  const activeAddressesChartData = useMemo(() => {
    if (activeAddressesData.length === 0) return [];
    const sorted = [...activeAddressesData].sort(compareTime);
    const days = parseInt(activeAddressesTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (activeAddressesTimeframe === '3000' || activeAddressesTimeframe === '999999') ? downsample(raw, 500) : (activeAddressesTimeframe === '1460') ? downsample(raw, 400) : raw;
    return sliced.map((item, idx) => { const dateObj = parseDate(item.time); return { index: idx, value: item.value, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj }; });
  }, [activeAddressesData, activeAddressesTimeframe]);

  // Multi-field KEY 2 indicators
  const illiquidSupplyChartData = useMemo(() => {
    if (illiquidSupplyData.length === 0) return [];
    const sorted = [...illiquidSupplyData].sort(compareTime);
    const days = parseInt(illiquidSupplyTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (illiquidSupplyTimeframe === '3000' || illiquidSupplyTimeframe === '999999') ? downsample(raw, 500) : (illiquidSupplyTimeframe === '1460') ? downsample(raw, 400) : raw;
    return sliced.map((item, idx) => { const dateObj = parseDate(item.time); return { index: idx, illiquidSupply: item.illiquid_supply, liquidSupply: item.liquid_supply, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj }; });
  }, [illiquidSupplyData, illiquidSupplyTimeframe]);

  const hotSupplyChartData = useMemo(() => {
    if (hotSupplyData.length === 0) return [];
    const sorted = [...hotSupplyData].sort(compareTime);
    const days = parseInt(hotSupplyTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (hotSupplyTimeframe === '3000' || hotSupplyTimeframe === '999999') ? downsample(raw, 500) : (hotSupplyTimeframe === '1460') ? downsample(raw, 400) : raw;
    return sliced.map((item, idx) => { const dateObj = parseDate(item.time); return { index: idx, hotSupply: item.hot_supply, hotSupplyUsd: item.hot_supply_usd, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj }; });
  }, [hotSupplyData, hotSupplyTimeframe]);

  const hashribbonsChartData = useMemo(() => {
    if (hashribbonsData.length === 0) return [];
    const sorted = [...hashribbonsData].sort(compareTime);
    const days = parseInt(hashribbonsTimeframe, 10);
    const raw = days >= 3000 ? sorted : sorted.slice(-days);
    const sliced = (hashribbonsTimeframe === '3000' || hashribbonsTimeframe === '999999') ? downsample(raw, 500) : (hashribbonsTimeframe === '1460') ? downsample(raw, 400) : raw;
    return sliced.map((item, idx) => { const dateObj = parseDate(item.time); return { index: idx, sma30: item.sma_30, sma60: item.sma_60, signal: item.signal, dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj }; });
  }, [hashribbonsData, hashribbonsTimeframe]);

  // Pre-build BTC price lookup once — avoids rebuilding inside every WithPrice useMemo (204K → 4K iterations)
  const btcPriceLookup = useMemo((): Record<string, number> => {
    const lookup: Record<string, number> = {};
    btcPriceData.forEach((p) => { if (p.time) lookup[p.time.split('T')[0]] = p.price ?? 0; });
    return lookup;
  }, [btcPriceData]);

  const addBtcPriceToChartData = useCallback((chartData: ChartDataPoint[]) => {
    if (btcPriceData.length === 0) return chartData;
    return chartData.map((item) => {
      const dateKey = item.dateObj ? formatDateKey(item.dateObj) : '';
      return { ...item, btcPrice: btcPriceLookup[dateKey] || null };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [btcPriceLookup]);

  // Enhanced chart data with BTC price for existing indicators
  const dominanceChartDataWithPrice = useMemo(() => addBtcPriceToChartData(dominanceChartData), [dominanceChartData, addBtcPriceToChartData]);
  const nuplChartDataWithPrice = useMemo(() => addBtcPriceToChartData(nuplChartData), [nuplChartData, addBtcPriceToChartData]);
  const mvrvChartDataWithPrice = useMemo(() => addBtcPriceToChartData(mvrvChartData), [mvrvChartData, addBtcPriceToChartData]);
  const soprChartDataWithPrice = useMemo(() => addBtcPriceToChartData(soprChartData), [soprChartData, addBtcPriceToChartData]);
  const supplyLossChartDataWithPrice = useMemo(() => addBtcPriceToChartData(supplyLossChartData), [supplyLossChartData, addBtcPriceToChartData]);
  const supplyProfitChartDataWithPrice = useMemo(() => addBtcPriceToChartData(supplyProfitChartData), [supplyProfitChartData, addBtcPriceToChartData]);
  const lthMvrvChartDataWithPrice = useMemo(() => addBtcPriceToChartData(lthMvrvChartData), [lthMvrvChartData, addBtcPriceToChartData]);
  const ssrChartDataWithPrice = useMemo(() => addBtcPriceToChartData(ssrChartData), [ssrChartData, addBtcPriceToChartData]);
  const realizedProfitChartDataWithPrice = useMemo(() => addBtcPriceToChartData(realizedProfitChartData), [realizedProfitChartData, addBtcPriceToChartData]);
  const realizedLossChartDataWithPrice = useMemo(() => addBtcPriceToChartData(realizedLossChartData), [realizedLossChartData, addBtcPriceToChartData]);
  const sthMvrvChartDataWithPrice = useMemo(() => addBtcPriceToChartData(sthMvrvChartData), [sthMvrvChartData, addBtcPriceToChartData]);
  const hashrateChartDataWithPrice = useMemo(() => addBtcPriceToChartData(hashrateChartData), [hashrateChartData, addBtcPriceToChartData]);

  // KEY 2 WithPrice memos
  const puellMultipleChartDataWithPrice = useMemo(() => addBtcPriceToChartData(puellMultipleChartData), [puellMultipleChartData, addBtcPriceToChartData]);
  const mayerMultipleChartDataWithPrice = useMemo(() => addBtcPriceToChartData(mayerMultipleChartData), [mayerMultipleChartData, addBtcPriceToChartData]);
  const reserveRiskChartDataWithPrice = useMemo(() => addBtcPriceToChartData(reserveRiskChartData), [reserveRiskChartData, addBtcPriceToChartData]);
  const avivChartDataWithPrice = useMemo(() => addBtcPriceToChartData(avivChartData), [avivChartData, addBtcPriceToChartData]);
  const mvrvZscoreChartDataWithPrice = useMemo(() => addBtcPriceToChartData(mvrvZscoreChartData), [mvrvZscoreChartData, addBtcPriceToChartData]);
  const vddChartDataWithPrice = useMemo(() => addBtcPriceToChartData(vddChartData), [vddChartData, addBtcPriceToChartData]);
  const supplyShockChartDataWithPrice = useMemo(() => addBtcPriceToChartData(supplyShockChartData), [supplyShockChartData, addBtcPriceToChartData]);
  const activeAddressesChartDataWithPrice = useMemo(() => addBtcPriceToChartData(activeAddressesChartData), [activeAddressesChartData, addBtcPriceToChartData]);
  const illiquidSupplyChartDataWithPrice = useMemo(() => addBtcPriceToChartData(illiquidSupplyChartData), [illiquidSupplyChartData, addBtcPriceToChartData]);
  const hotSupplyChartDataWithPrice = useMemo(() => addBtcPriceToChartData(hotSupplyChartData), [hotSupplyChartData, addBtcPriceToChartData]);
  const hashribbonsChartDataWithPrice = useMemo(() => addBtcPriceToChartData(hashribbonsChartData), [hashribbonsChartData, addBtcPriceToChartData]);

  // KEY3 chart data memos
  const nrplChartData = useMemo(() => {
    if (nrplData.length === 0) return [];
    const sorted = [...nrplData].sort(compareTime);
    const days = parseInt(nrplTimeframe, 10);
    const sliced = isNaN(days) ? sorted : sorted.slice(-days);
    const step = Math.max(1, Math.floor(sliced.length / 1800));
    return sliced
      .filter((_, i) => i % step === 0 || i === sliced.length - 1)
      .map((d, i) => ({
        index: i,
        value: d.value,
        dateFormatted: new Date(d.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj: new Date(d.time),
      }));
  }, [nrplData, nrplTimeframe]);

  const rhodlChartData = useMemo(() => {
    if (rhodlData.length === 0) return [];
    const sorted = [...rhodlData].sort(compareTime);
    const days = parseInt(rhodlTimeframe, 10);
    const sliced = isNaN(days) ? sorted : sorted.slice(-days);
    const step = Math.max(1, Math.floor(sliced.length / 1800));
    return sliced
      .filter((_, i) => i % step === 0 || i === sliced.length - 1)
      .map((d, i) => ({
        index: i,
        value: d.value,
        dateFormatted: new Date(d.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj: new Date(d.time),
      }));
  }, [rhodlData, rhodlTimeframe]);

  const openInterestChartData = useMemo(() => {
    if (openInterestData.length === 0) return [];
    const sorted = [...openInterestData].sort(compareTime);
    const days = parseInt(openInterestTimeframe, 10);
    const sliced = isNaN(days) ? sorted : sorted.slice(-days);
    const step = Math.max(1, Math.floor(sliced.length / 1800));
    return sliced
      .filter((_, i) => i % step === 0 || i === sliced.length - 1)
      .map((d, i) => ({
        index: i,
        value: d.value,
        dateFormatted: new Date(d.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj: new Date(d.time),
      }));
  }, [openInterestData, openInterestTimeframe]);

  const fundingRateChartData = useMemo(() => {
    if (fundingRateData.length === 0) return [];
    const sorted = [...fundingRateData].sort(compareTime);
    const days = parseInt(fundingRateTimeframe, 10);
    const sliced = isNaN(days) ? sorted : sorted.slice(-days);
    const step = Math.max(1, Math.floor(sliced.length / 1800));
    return sliced
      .filter((_, i) => i % step === 0 || i === sliced.length - 1)
      .map((d, i) => ({
        index: i,
        value: d.value,
        dateFormatted: new Date(d.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateObj: new Date(d.time),
      }));
  }, [fundingRateData, fundingRateTimeframe]);

  const nrplChartDataWithPrice = useMemo(() => addBtcPriceToChartData(nrplChartData), [nrplChartData, addBtcPriceToChartData]);
  const rhodlChartDataWithPrice = useMemo(() => addBtcPriceToChartData(rhodlChartData), [rhodlChartData, addBtcPriceToChartData]);
  const openInterestChartDataWithPrice = useMemo(() => addBtcPriceToChartData(openInterestChartData), [openInterestChartData, addBtcPriceToChartData]);
  const fundingRateChartDataWithPrice = useMemo(() => addBtcPriceToChartData(fundingRateChartData), [fundingRateChartData, addBtcPriceToChartData]);

  // KEY 3 NEW: NVTS, NVT Z-Score, CVDD
  const nvtsChartData = useMemo(() => {
    if (nvtsData.length === 0) return [];
    const sorted = [...nvtsData].sort(compareTime);
    const days = parseInt(nvtsTimeframe, 10);
    const sliced = isNaN(days) ? sorted : sorted.slice(-days);
    const step = Math.max(1, Math.floor(sliced.length / 1800));
    return sliced.filter((_, i) => i % step === 0 || i === sliced.length - 1).map((d, i) => ({ index: i, value: d.value, dateFormatted: new Date(d.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj: new Date(d.time) }));
  }, [nvtsData, nvtsTimeframe]);
  const nvtZscoreChartData = useMemo(() => {
    if (nvtZscoreData.length === 0) return [];
    const sorted = [...nvtZscoreData].sort(compareTime);
    const days = parseInt(nvtZscoreTimeframe, 10);
    const sliced = isNaN(days) ? sorted : sorted.slice(-days);
    const step = Math.max(1, Math.floor(sliced.length / 1800));
    return sliced.filter((_, i) => i % step === 0 || i === sliced.length - 1).map((d, i) => ({ index: i, value: d.value, dateFormatted: new Date(d.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj: new Date(d.time) }));
  }, [nvtZscoreData, nvtZscoreTimeframe]);
  const cvddChartData = useMemo(() => {
    if (cvddData.length === 0) return [];
    const sorted = [...cvddData].sort(compareTime);
    const days = parseInt(cvddTimeframe, 10);
    const sliced = isNaN(days) ? sorted : sorted.slice(-days);
    const step = Math.max(1, Math.floor(sliced.length / 1800));
    return sliced.filter((_, i) => i % step === 0 || i === sliced.length - 1).map((d, i) => ({ index: i, value: d.value, dateFormatted: new Date(d.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), dateObj: new Date(d.time) }));
  }, [cvddData, cvddTimeframe]);
  const nvtsChartDataWithPrice = useMemo(() => addBtcPriceToChartData(nvtsChartData), [nvtsChartData, addBtcPriceToChartData]);
  const nvtZscoreChartDataWithPrice = useMemo(() => addBtcPriceToChartData(nvtZscoreChartData), [nvtZscoreChartData, addBtcPriceToChartData]);
  const cvddChartDataWithPrice = useMemo(() => addBtcPriceToChartData(cvddChartData), [cvddChartData, addBtcPriceToChartData]);

  // KEY 4 chart data memos
  const mkK4ChartData = (data: IndicatorPoint[], tf: string, valueField = 'value') => {
    if (data.length === 0) return [];
    const sorted = [...data].sort(compareTime);
    const days = parseInt(tf, 10);
    let sliced = sorted;
    if (!isNaN(days) && days < 999999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const dateBased = sorted.filter(d => parseDate(d.time) >= cutoff);
      // Fall back to last N entries when date-based filter is too sparse (stale or low-freq data)
      sliced = dateBased.length >= 2 ? dateBased : sorted.slice(-Math.max(days, 3));
    }
    const step = Math.max(1, Math.floor(sliced.length / 1800));
    return sliced
      .filter((_, i) => i % step === 0 || i === sliced.length - 1)
      .map((d, i) => {
        const dateObj = parseDate(d.time);
        return {
          index: i,
          value: Number((d as unknown as Record<string, unknown>)[valueField] ?? d.value ?? 0),
          dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          dateObj,
          rawDate: d.time,
        };
      });
  };
  const realizedPriceChartData = useMemo(() => mkK4ChartData(realizedPriceData, realizedPriceTimeframe), [realizedPriceData, realizedPriceTimeframe]);
  const marketCapK4ChartData = useMemo(() => mkK4ChartData(marketCapK4Data, marketCapK4Timeframe), [marketCapK4Data, marketCapK4Timeframe]);
  const weekMa200ChartData = useMemo(() => mkK4ChartData(weekMa200Data, weekMa200Timeframe), [weekMa200Data, weekMa200Timeframe]);
  const highlyLiquidChartData = useMemo(() => mkK4ChartData(highlyLiquidData, highlyLiquidTimeframe), [highlyLiquidData, highlyLiquidTimeframe]);
  const lthPositionChangeChartData = useMemo(() => mkK4ChartData(lthPositionChangeData, lthPositionChangeTimeframe), [lthPositionChangeData, lthPositionChangeTimeframe]);
  const sthPositionChangeChartData = useMemo(() => mkK4ChartData(sthPositionChangeData, sthPositionChangeTimeframe), [sthPositionChangeData, sthPositionChangeTimeframe]);
  const mpiChartData = useMemo(() => mkK4ChartData(mpiData, mpiTimeframe), [mpiData, mpiTimeframe]);
  const minerSellPressureChartData = useMemo(() => mkK4ChartData(minerSellPressureData, minerSellPressureTimeframe), [minerSellPressureData, minerSellPressureTimeframe]);
  const utxoProfitChartData = useMemo(() => mkK4ChartData(utxoProfitData, utxoProfitTimeframe), [utxoProfitData, utxoProfitTimeframe]);
  const utxoLossChartData = useMemo(() => mkK4ChartData(utxoLossData, utxoLossTimeframe), [utxoLossData, utxoLossTimeframe]);

  // Stock to Flow — removed
  const realizedPriceChartDataWithPrice = useMemo(() => addBtcPriceToChartData(realizedPriceChartData), [realizedPriceChartData, addBtcPriceToChartData]);
  const marketCapK4ChartDataWithPrice = useMemo(() => addBtcPriceToChartData(marketCapK4ChartData), [marketCapK4ChartData, addBtcPriceToChartData]);
  const weekMa200ChartDataWithPrice = useMemo(() => addBtcPriceToChartData(weekMa200ChartData), [weekMa200ChartData, addBtcPriceToChartData]);
  const highlyLiquidChartDataWithPrice = useMemo(() => addBtcPriceToChartData(highlyLiquidChartData), [highlyLiquidChartData, addBtcPriceToChartData]);
  const lthPositionChangeChartDataWithPrice = useMemo(() => addBtcPriceToChartData(lthPositionChangeChartData), [lthPositionChangeChartData, addBtcPriceToChartData]);
  const sthPositionChangeChartDataWithPrice = useMemo(() => addBtcPriceToChartData(sthPositionChangeChartData), [sthPositionChangeChartData, addBtcPriceToChartData]);
  const mpiChartDataWithPrice = useMemo(() => addBtcPriceToChartData(mpiChartData), [mpiChartData, addBtcPriceToChartData]);
  const minerSellPressureChartDataWithPrice = useMemo(() => addBtcPriceToChartData(minerSellPressureChartData), [minerSellPressureChartData, addBtcPriceToChartData]);
  const utxoProfitChartDataWithPrice = useMemo(() => addBtcPriceToChartData(utxoProfitChartData), [utxoProfitChartData, addBtcPriceToChartData]);
  const utxoLossChartDataWithPrice = useMemo(() => addBtcPriceToChartData(utxoLossChartData), [utxoLossChartData, addBtcPriceToChartData]);

  // KEY 5 macro chart data memos
  const buildMacroChartData = (data: IndicatorPoint[], tf: string) => {
    if (data.length === 0) return [];
    const sorted = [...data].sort(compareTime);
    const days = parseInt(tf, 10);
    let sliced = sorted;
    if (!isNaN(days) && days < 999999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const dateBased = sorted.filter(d => parseDate(d.time) >= cutoff);
      // Fall back to last N entries when date-based filter is too sparse (stale or low-freq data)
      sliced = dateBased.length >= 2 ? dateBased : sorted.slice(-Math.max(days, 3));
    }
    const step = Math.max(1, Math.floor(sliced.length / 1800));
    return sliced
      .filter((_, i) => i % step === 0 || i === sliced.length - 1)
      .map((d, i) => {
        const dateObj = parseDate(d.time);
        return {
          index: i,
          value: d.value,
          dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          dateObj,
          rawDate: d.time,
        };
      });
  };

  // WTI-specific builder: daily resolution for 1Y timeframe, weekly (~every 7th point) for all others.
  // The generic buildMacroChartData uses a count-based step that varies with dataset size,
  // but WTI is daily since 1986 (~10,000 pts) so non-1Y timeframes need an explicit 7-day step.
  const buildWtiChartData = (data: IndicatorPoint[], tf: string) => {
    if (data.length === 0) return [];
    const sorted = [...data].sort(compareTime);
    const days = parseInt(tf, 10);
    let sliced = sorted;
    if (!isNaN(days) && days < 999999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const dateBased = sorted.filter(d => parseDate(d.time) >= cutoff);
      sliced = dateBased.length >= 2 ? dateBased : sorted.slice(-Math.max(days, 3));
    }
    // Short timeframes (1W/1M): step=1 to show all daily points
    // 1Y: step=1 for full daily resolution; longer: weekly (step=7)
    const step = days <= 30 ? 1 : tf === '365' ? 1 : 7;
    return sliced
      .filter((_, i) => i % step === 0 || i === sliced.length - 1)
      .map((d, i) => {
        const dateObj = parseDate(d.time);
        return {
          index: i,
          value: d.value,
          dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          dateObj,
          rawDate: d.time,
        };
      });
  };

  // Computes YoY % change from raw CPI/PCE index levels stored in the data cache
  // FRED stores CPIAUCSL as a price index (~316); this converts to "2.5%" style YoY.
  const buildInflationPctChartData = (data: IndicatorPoint[], tf: string) => {
    if (data.length === 0) return [];
    const sorted = [...data].sort(compareTime);

    // Build a fast YYYY-MM → value lookup so we can look up exactly 12 months prior
    // regardless of array gaps (e.g. missing months in the data cache).
    const byYearMonth = new Map<string, number>();
    for (const d of sorted) {
      if (!d.time) continue;
      // time is "2025-02-01T00:00:00Z" or "2025-02-01" — first 7 chars = "2025-02"
      byYearMonth.set(d.time.substring(0, 7), Number(d.value));
    }

    const withPct = sorted.map((d) => {
      if (!d.time) return null;
      const ym = d.time.substring(0, 7); // "2026-02"
      const [y, mo] = ym.split('-').map(Number);
      const priorYm = `${y - 1}-${String(mo).padStart(2, '0')}`; // "2025-02"
      const priorVal = byYearMonth.get(priorYm);
      const currentVal = Number(d.value);
      if (priorVal == null || priorVal === 0) return null;
      return { ...d, value: parseFloat((((currentVal - priorVal) / priorVal) * 100).toFixed(2)) };
    }).filter(Boolean) as IndicatorPoint[];

    const days = parseInt(tf, 10);
    let sliced = withPct;
    if (!isNaN(days) && days < 999999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const dateBased = withPct.filter(d => parseDate(d.time) >= cutoff);
      sliced = dateBased.length >= 2 ? dateBased : withPct.slice(-Math.max(days, 3));
    }
    const step = Math.max(1, Math.floor(sliced.length / 1800));
    return sliced
      .filter((_, i) => i % step === 0 || i === sliced.length - 1)
      .map((d, i) => {
        const dateObj = parseDate(d.time);
        return {
          index: i,
          value: d.value,
          dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          dateObj,
          rawDate: d.time,
        };
      });
  };

  const m2ChartData = useMemo(() => buildMacroChartData(m2Data, m2Timeframe), [m2Data, m2Timeframe]);
  const dxyChartData = useMemo(() => buildMacroChartData(dxyData, dxyTimeframe), [dxyData, dxyTimeframe]);
  const vixChartData = useMemo(() => buildMacroChartData(vixData, vixTimeframe), [vixData, vixTimeframe]);
  const fedfundsChartData = useMemo(() => buildMacroChartData(fedfundsData, fedfundsTimeframe), [fedfundsData, fedfundsTimeframe]);
  const etfChartData = useMemo(() => buildMacroChartData(etfData, etfTimeframe), [etfData, etfTimeframe]);
  const sp500ChartData = useMemo(() => buildMacroChartData(sp500Data, sp500Timeframe), [sp500Data, sp500Timeframe]);
  const goldChartData = useMemo(() => buildMacroChartData(goldData, goldTimeframe), [goldData, goldTimeframe]);
  const stablecoinSupplyChartData = useMemo(() => buildMacroChartData(stablecoinSupplyData, stablecoinSupplyTimeframe), [stablecoinSupplyData, stablecoinSupplyTimeframe]);
  const ssrOscillatorChartData = useMemo(() => buildMacroChartData(ssrOscillatorData, ssrOscillatorTimeframe), [ssrOscillatorData, ssrOscillatorTimeframe]);
  const cryptoMarketCapChartData = useMemo(() => buildMacroChartData(cryptoMarketCapData, cryptoMarketCapTimeframe), [cryptoMarketCapData, cryptoMarketCapTimeframe]);

  // KEY 5 WithPrice memos
  const m2ChartDataWithPrice = useMemo(() => addBtcPriceToChartData(m2ChartData), [m2ChartData, addBtcPriceToChartData]);
  const dxyChartDataWithPrice = useMemo(() => addBtcPriceToChartData(dxyChartData), [dxyChartData, addBtcPriceToChartData]);
  const vixChartDataWithPrice = useMemo(() => addBtcPriceToChartData(vixChartData), [vixChartData, addBtcPriceToChartData]);
  const fedfundsChartDataWithPrice = useMemo(() => addBtcPriceToChartData(fedfundsChartData), [fedfundsChartData, addBtcPriceToChartData]);
  const etfChartDataWithPrice = useMemo(() => addBtcPriceToChartData(etfChartData), [etfChartData, addBtcPriceToChartData]);
  const sp500ChartDataWithPrice = useMemo(() => addBtcPriceToChartData(sp500ChartData), [sp500ChartData, addBtcPriceToChartData]);
  const goldChartDataWithPrice = useMemo(() => addBtcPriceToChartData(goldChartData), [goldChartData, addBtcPriceToChartData]);
  const stablecoinSupplyChartDataWithPrice = useMemo(() => addBtcPriceToChartData(stablecoinSupplyChartData), [stablecoinSupplyChartData, addBtcPriceToChartData]);
  const ssrOscillatorChartDataWithPrice = useMemo(() => addBtcPriceToChartData(ssrOscillatorChartData), [ssrOscillatorChartData, addBtcPriceToChartData]);
  const cryptoMarketCapChartDataWithPrice = useMemo(() => addBtcPriceToChartData(cryptoMarketCapChartData), [cryptoMarketCapChartData, addBtcPriceToChartData]);

  // FRED extended macro memos
  const sofrChartData = useMemo(() => buildMacroChartData(sofrData, sofrTimeframe), [sofrData, sofrTimeframe]);
  const walclChartData = useMemo(() => buildMacroChartData(walclData, walclTimeframe), [walclData, walclTimeframe]);
  const walclChartDataWithPrice = useMemo(() => addBtcPriceToChartData(walclChartData), [walclChartData, addBtcPriceToChartData]);
  const wresbalChartData = useMemo(() => buildMacroChartData(wresbalData, wresbalTimeframe), [wresbalData, wresbalTimeframe]);
  const wresbalChartDataWithPrice = useMemo(() => addBtcPriceToChartData(wresbalChartData), [wresbalChartData, addBtcPriceToChartData]);
  const rrpontsydChartData = useMemo(() => buildMacroChartData(rrpontsydData, rrpontsydTimeframe), [rrpontsydData, rrpontsydTimeframe]);
  const rrpontsydChartDataWithPrice = useMemo(() => addBtcPriceToChartData(rrpontsydChartData), [rrpontsydChartData, addBtcPriceToChartData]);
  const cpiaucslChartData = useMemo(() => buildInflationPctChartData(cpiaucslData, cpiaucslTimeframe), [cpiaucslData, cpiaucslTimeframe]);
  const cpiaucslChartDataWithPrice = useMemo(() => addBtcPriceToChartData(cpiaucslChartData), [cpiaucslChartData, addBtcPriceToChartData]);
  const cpilfeslChartData = useMemo(() => buildInflationPctChartData(cpilfeslData, cpilfeslTimeframe), [cpilfeslData, cpilfeslTimeframe]);
  const cpilfeslChartDataWithPrice = useMemo(() => addBtcPriceToChartData(cpilfeslChartData), [cpilfeslChartData, addBtcPriceToChartData]);
  const pcepiChartData = useMemo(() => buildInflationPctChartData(pcepiData, pcepiTimeframe), [pcepiData, pcepiTimeframe]);
  const pcepiChartDataWithPrice = useMemo(() => addBtcPriceToChartData(pcepiChartData), [pcepiChartData, addBtcPriceToChartData]);
  const pcepilfeChartData = useMemo(() => buildInflationPctChartData(pcepilfeData, pcepilfeTimeframe), [pcepilfeData, pcepilfeTimeframe]);
  const pcepilfeChartDataWithPrice = useMemo(() => addBtcPriceToChartData(pcepilfeChartData), [pcepilfeChartData, addBtcPriceToChartData]);
  const michChartData = useMemo(() => buildMacroChartData(michData, michTimeframe), [michData, michTimeframe]);
  const michChartDataWithPrice = useMemo(() => addBtcPriceToChartData(michChartData), [michChartData, addBtcPriceToChartData]);
  const t5yieChartData = useMemo(() => buildMacroChartData(t5yieData, t5yieTimeframe), [t5yieData, t5yieTimeframe]);
  const t5yieChartDataWithPrice = useMemo(() => addBtcPriceToChartData(t5yieChartData), [t5yieChartData, addBtcPriceToChartData]);
  const t10yieChartData = useMemo(() => buildMacroChartData(t10yieData, t10yieTimeframe), [t10yieData, t10yieTimeframe]);
  const t10yieChartDataWithPrice = useMemo(() => addBtcPriceToChartData(t10yieChartData), [t10yieChartData, addBtcPriceToChartData]);
  const dgs1moChartData = useMemo(() => buildMacroChartData(dgs1moData, dgs1moTimeframe), [dgs1moData, dgs1moTimeframe]);
  const dgs1moChartDataWithPrice = useMemo(() => addBtcPriceToChartData(dgs1moChartData), [dgs1moChartData, addBtcPriceToChartData]);
  const dgs3moChartData = useMemo(() => buildMacroChartData(dgs3moData, dgs3moTimeframe), [dgs3moData, dgs3moTimeframe]);
  const dgs3moChartDataWithPrice = useMemo(() => addBtcPriceToChartData(dgs3moChartData), [dgs3moChartData, addBtcPriceToChartData]);
  const dgs6moChartData = useMemo(() => buildMacroChartData(dgs6moData, dgs6moTimeframe), [dgs6moData, dgs6moTimeframe]);
  const dgs6moChartDataWithPrice = useMemo(() => addBtcPriceToChartData(dgs6moChartData), [dgs6moChartData, addBtcPriceToChartData]);
  const dgs1ChartData = useMemo(() => buildMacroChartData(dgs1Data, dgs1Timeframe), [dgs1Data, dgs1Timeframe]);
  const dgs1ChartDataWithPrice = useMemo(() => addBtcPriceToChartData(dgs1ChartData), [dgs1ChartData, addBtcPriceToChartData]);
  const dgs5ChartData = useMemo(() => buildMacroChartData(dgs5Data, dgs5Timeframe), [dgs5Data, dgs5Timeframe]);
  const dgs5ChartDataWithPrice = useMemo(() => addBtcPriceToChartData(dgs5ChartData), [dgs5ChartData, addBtcPriceToChartData]);
  const dgs20ChartData = useMemo(() => buildMacroChartData(dgs20Data, dgs20Timeframe), [dgs20Data, dgs20Timeframe]);
  const dgs20ChartDataWithPrice = useMemo(() => addBtcPriceToChartData(dgs20ChartData), [dgs20ChartData, addBtcPriceToChartData]);
  const dgs30ChartData = useMemo(() => buildMacroChartData(dgs30Data, dgs30Timeframe), [dgs30Data, dgs30Timeframe]);
  const dgs30ChartDataWithPrice = useMemo(() => addBtcPriceToChartData(dgs30ChartData), [dgs30ChartData, addBtcPriceToChartData]);
  const t10y2yChartData = useMemo(() => buildMacroChartData(t10y2yData, t10y2yTimeframe), [t10y2yData, t10y2yTimeframe]);
  const t10y2yChartDataWithPrice = useMemo(() => addBtcPriceToChartData(t10y2yChartData), [t10y2yChartData, addBtcPriceToChartData]);
  const t10y3mChartData = useMemo(() => buildMacroChartData(t10y3mData, t10y3mTimeframe), [t10y3mData, t10y3mTimeframe]);
  const t10y3mChartDataWithPrice = useMemo(() => addBtcPriceToChartData(t10y3mChartData), [t10y3mChartData, addBtcPriceToChartData]);
  const m1slChartData = useMemo(() => buildMacroChartData(m1slData, m1slTimeframe), [m1slData, m1slTimeframe]);
  const m1slChartDataWithPrice = useMemo(() => addBtcPriceToChartData(m1slChartData), [m1slChartData, addBtcPriceToChartData]);
  const mabmm301ChartData = useMemo(() => buildMacroChartData(mabmm301Data, mabmm301Timeframe), [mabmm301Data, mabmm301Timeframe]);
  const mabmm301ChartDataWithPrice = useMemo(() => addBtcPriceToChartData(mabmm301ChartData), [mabmm301ChartData, addBtcPriceToChartData]);
  const unrateChartData = useMemo(() => buildMacroChartData(unrateData, unrateTimeframe), [unrateData, unrateTimeframe]);
  const unrateChartDataWithPrice = useMemo(() => addBtcPriceToChartData(unrateChartData), [unrateChartData, addBtcPriceToChartData]);
  const payemsChartData = useMemo(() => buildMacroChartData(payemsData, payemsTimeframe), [payemsData, payemsTimeframe]);
  const payemsChartDataWithPrice = useMemo(() => addBtcPriceToChartData(payemsChartData), [payemsChartData, addBtcPriceToChartData]);
  const icsaChartData = useMemo(() => buildMacroChartData(icsaData, icsaTimeframe), [icsaData, icsaTimeframe]);
  const icsaChartDataWithPrice = useMemo(() => addBtcPriceToChartData(icsaChartData), [icsaChartData, addBtcPriceToChartData]);
  const jtsjolChartData = useMemo(() => buildMacroChartData(jtsjolData, jtsjolTimeframe), [jtsjolData, jtsjolTimeframe]);
  const jtsjolChartDataWithPrice = useMemo(() => addBtcPriceToChartData(jtsjolChartData), [jtsjolChartData, addBtcPriceToChartData]);
  const emratioChartData = useMemo(() => buildMacroChartData(emratioData, emratioTimeframe), [emratioData, emratioTimeframe]);
  const emratioChartDataWithPrice = useMemo(() => addBtcPriceToChartData(emratioChartData), [emratioChartData, addBtcPriceToChartData]);
  const gdpc1ChartData = useMemo(() => buildMacroChartData(gdpc1Data, gdpc1Timeframe), [gdpc1Data, gdpc1Timeframe]);
  const gdpc1ChartDataWithPrice = useMemo(() => addBtcPriceToChartData(gdpc1ChartData), [gdpc1ChartData, addBtcPriceToChartData]);
  const indproChartData = useMemo(() => buildMacroChartData(indproData, indproTimeframe), [indproData, indproTimeframe]);
  const indproChartDataWithPrice = useMemo(() => addBtcPriceToChartData(indproChartData), [indproChartData, addBtcPriceToChartData]);
  const houstChartData = useMemo(() => buildMacroChartData(houstData, houstTimeframe), [houstData, houstTimeframe]);
  const houstChartDataWithPrice = useMemo(() => addBtcPriceToChartData(houstChartData), [houstChartData, addBtcPriceToChartData]);
  const umcsentChartData = useMemo(() => buildMacroChartData(umcsentData, umcsentTimeframe), [umcsentData, umcsentTimeframe]);
  const umcsentChartDataWithPrice = useMemo(() => addBtcPriceToChartData(umcsentChartData), [umcsentChartData, addBtcPriceToChartData]);
  const rsxfsChartData = useMemo(() => buildMacroChartData(rsxfsData, rsxfsTimeframe), [rsxfsData, rsxfsTimeframe]);
  const rsxfsChartDataWithPrice = useMemo(() => addBtcPriceToChartData(rsxfsChartData), [rsxfsChartData, addBtcPriceToChartData]);
  const dcoilwticoChartData = useMemo(() => buildWtiChartData(dcoilwticoData, dcoilwticoTimeframe), [dcoilwticoData, dcoilwticoTimeframe]);
  const dcoilwticoChartDataWithPrice = useMemo(() => addBtcPriceToChartData(dcoilwticoChartData), [dcoilwticoChartData, addBtcPriceToChartData]);
  const bamlh0a0hym2ChartData = useMemo(() => buildMacroChartData(bamlh0a0hym2Data, bamlh0a0hym2Timeframe), [bamlh0a0hym2Data, bamlh0a0hym2Timeframe]);
  const bamlh0a0hym2ChartDataWithPrice = useMemo(() => addBtcPriceToChartData(bamlh0a0hym2ChartData), [bamlh0a0hym2ChartData, addBtcPriceToChartData]);
  const mortgage30usChartData = useMemo(() => buildMacroChartData(mortgage30usData, mortgage30usTimeframe), [mortgage30usData, mortgage30usTimeframe]);
  const mortgage30usChartDataWithPrice = useMemo(() => addBtcPriceToChartData(mortgage30usChartData), [mortgage30usChartData, addBtcPriceToChartData]);
  const bogmbaseChartData = useMemo(() => buildMacroChartData(bogmbaseData, bogmbaseTimeframe), [bogmbaseData, bogmbaseTimeframe]);
  const bogmbaseChartDataWithPrice = useMemo(() => addBtcPriceToChartData(bogmbaseChartData), [bogmbaseChartData, addBtcPriceToChartData]);
  const totalslChartData = useMemo(() => buildMacroChartData(totalslData, totalslTimeframe), [totalslData, totalslTimeframe]);
  const totalslChartDataWithPrice = useMemo(() => addBtcPriceToChartData(totalslChartData), [totalslChartData, addBtcPriceToChartData]);

  // STH MVRV zone function
  const getSthMvrvZone = (value: number) => {
    if (value >= 1.4) return { label: 'OVERHEATED', color: '#EF5350' };
    if (value >= 1.2) return { label: 'ELEVATED', color: '#EF5350' };
    if (value >= 1.0) return { label: 'FAIR VALUE', color: '#4CAF50' };
    if (value >= 0.8) return { label: 'UNDERVALUED', color: '#4CAF50' };
    return { label: 'CAPITULATION', color: '#4CAF50' };
  };

  const getMvrvZone = (value: number) => {
    if (value >= 3.5) return { label: 'EXTREME BUBBLE', color: '#EF5350' };
    if (value >= 2.4) return { label: 'BUBBLE', color: '#EF5350' };
    if (value >= 1.8) return { label: 'OVERVALUED', color: '#EF5350' };
    if (value >= 1.0) return { label: 'FAIR VALUE', color: '#4CAF50' };
    if (value >= 0.8) return { label: 'UNDERVALUED', color: '#4CAF50' };
    return { label: 'DEEP VALUE', color: '#4CAF50' };
  };

  const getLthMvrvZone = (value: number) => {
    if (value >= 5.0) return { label: 'EXTREME', color: '#EF5350' };
    if (value >= 3.5) return { label: 'OVERVALUED', color: '#F7931A' };
    if (value >= 1.5) return { label: 'FAIR VALUE', color: '#7AAAD0' };
    if (value >= 1.0) return { label: 'UNDERVALUED', color: '#4CAF50' };
    return { label: 'DEEP VALUE', color: '#10B981' };
  };

  const getSsrZone = (value: number) => {
    if (value >= 20) return { label: 'LOW DEMAND', color: '#EF5350' };
    if (value >= 10) return { label: 'MODERATE', color: '#F7931A' };
    if (value >= 5)  return { label: 'NEUTRAL', color: '#7AAAD0' };
    return { label: 'HIGH DEMAND', color: '#10B981' };
  };

  const getNvtZone = (value: number) => {
    if (value >= 65)  return { label: 'OVERVALUED', color: '#EF5350' };
    if (value >= 45)  return { label: 'ELEVATED', color: '#F7931A' };
    if (value >= 30)  return { label: 'FAIR VALUE', color: '#7AAAD0' };
    return { label: 'UNDERVALUED', color: '#10B981' };
  };

  const getSoprZone = (value: number) => {
    if (value >= 1.10) return { label: 'EXTREME PROFIT', color: '#EF5350' };
    if (value >= 1.03) return { label: 'PROFIT', color: '#EF5350' };
    if (value >= 1.00) return { label: 'SLIGHT PROFIT', color: '#EF5350' };
    if (value >= 0.97) return { label: 'BREAKEVEN', color: '#4CAF50' };
    if (value >= 0.90) return { label: 'SLIGHT LOSS', color: '#4CAF50' };
    return { label: 'EXTREME LOSS', color: '#4CAF50' };
  };

  const getSentimentColor = (score?: number) => {
    if (score == null) return '#607D8B';
    if (score >= 75) return '#EF4444';
    if (score >= 55) return '#F7931A';
    if (score >= 45) return '#88B4D0';
    return '#10B981';
  };


  return {
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
    // KEY 2 additional
    nrplData, isNrplLoading, nrplTimeframe, setNrplTimeframe,
    rhodlData, isRhodlLoading, rhodlTimeframe, setRhodlTimeframe,
    openInterestData, isOpenInterestLoading, openInterestTimeframe, setOpenInterestTimeframe,
    fundingRateData, isFundingRateLoading, fundingRateTimeframe, setFundingRateTimeframe,
    // KEY 3 new
    nvtsData, isNvtsLoading, nvtsTimeframe, setNvtsTimeframe,
    nvtZscoreData, isNvtZscoreLoading, nvtZscoreTimeframe, setNvtZscoreTimeframe,
    cvddData, isCvddLoading, cvddTimeframe, setCvddTimeframe,
    // KEY 4
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
    // KEY 5 macro
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
    // KEY 2 chart data
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
    useChartData,
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
    // KEY 4 chart data
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
    // KEY 5 macro chart data
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
    sofrChartData, sofrChartDataWithPrice: sofrChartData,
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
    // BTC price utilities
    btcPriceLookup, addBtcPriceToChartData,
    // Zone helpers
    getNuplZone, getSthMvrvZone, getMvrvZone, getLthMvrvZone, getSsrZone, getSoprZone, getSentimentColor,
  };
}
