'use client';

/**
 * SentimentChartPanel — React.memo'd generic chart panel renderer.
 * Used by the macroPanels render loop and future per-panel optimisation.
 *
 * Performance note: To get per-panel memoisation, each panel object passed
 * in `panel` must be individually stable (e.g. wrapped in its own useMemo).
 * Currently macroPanels is a single useMemo so all panels update together;
 * this component already organises the code correctly for future splitting.
 */

import React, { memo, useMemo } from 'react';
import {
  PanelMaximizeWrapper,
  PanelHeader,
  ChartSkeleton,
  LineToggle,
  TfSelector,
  PrecisionTooltip,
  getXAxisTicks,
  formatXAxisTick,
  DateAxisTick,
  getHalvingIndices,
  FRED_TF_OPTS,
  Y_AXIS_LEFT_PROPS,
  Y_AXIS_RIGHT_PROPS,
  formatBtcAxisTick,
} from '@/components/sentiment/SentimentPanelUtils';

type UpdateFrequency = 'bg' | 'd' | 'w' | 'm' | 'q';

type SentimentChartPoint = {
  index: number;
  dateFormatted?: string;
  dateObj?: Date;
  rawDate?: string;
  btcPrice?: number | null;
  [key: string]: unknown;
};

type SentimentZone = { label: string; color: string };

const BAND_RED = '#EF4444';
const BAND_GREEN = '#10B981';
const LINE_AMBER = '#F7931A';
const LINE_NEUTRAL = '#88B4D0';
const LINE_CYAN = '#00E5FF';
const BTC_PRICE_LINE = '#FFFFFF';
const BTC_PRICE_LEGEND = '#FFFFFF';
const REFERENCE_BAND_OPACITY = 0.11;
const PRIMARY_LINE_STROKE_WIDTH = 3;

type ReferenceBandConfig = {
  from?: number;
  to?: number;
  fill: string;
  fillOpacity?: number;
};

/** 4-zone thresholds mapped to FNG colour bands (red/orange/blue/green). */
export type ZoneThresholds = {
  red: number;    // ≤ this = red   (extreme fear / overheated)
  orange: number; // ≤ this = orange (fear / elevated)
  blue: number;   // ≤ this = blue   (neutral)
  green: number;  // ≤ this = green  (greed / undervalued); > this = also green
};

export interface SentimentPanelConfig {
  panelId: string;
  indicatorKey: string;
  code: string;
  title: string;
  desc: string;
  metricLabel: string;
  id: string;
  accentColor: string;
  gradientId: string;
  tag?: string;
  valueKey?: string;
  data: SentimentChartPoint[];
  dataWithPrice?: SentimentChartPoint[];
  isLoading: boolean;
  timeframe: string;
  setTimeframe: (value: string) => void;
  zoneFn: (value: number) => SentimentZone;
  headerValue: (value: number) => string;
  tooltipValue: (value: number) => string;
  yAxisTick: (value: number) => string;
  updateFreq?: UpdateFrequency;
  hideBtcPrice?: boolean;
  useFredTfOpts?: boolean;
  tfOpts?: readonly { label: string; value: string }[];
  btcSameAxis?: boolean;
  referenceBands?: ReferenceBandConfig[];
  /** Optional explicit zone thresholds. When omitted we auto-detect from zoneFn. */
  zoneThresholds?: ZoneThresholds;
}

function normalizeMetricColor(color: string): string {
  const normalized = color.toUpperCase();
  if (normalized === BAND_RED || normalized === '#EF5350' || normalized === '#C2344D' || normalized === '#FF4444' || normalized === '#DC2626') return BAND_RED;
  if (normalized === BAND_GREEN || normalized === '#4CAF50' || normalized === '#00CC6E' || normalized === '#00FF88' || normalized === '#34D399' || normalized === '#4ADE80') return BAND_GREEN;
  if (normalized === LINE_AMBER || normalized === '#F59E0B' || normalized === '#FBBF24' || normalized === '#FCD34D' || normalized === '#F97316' || normalized === '#EAB308') return LINE_AMBER;
  if (normalized === LINE_NEUTRAL || normalized === '#7AAAD0' || normalized === '#64748B' || normalized === '#607D8B' || normalized === '#60A5FA' || normalized === '#00E5FF' || normalized === '#00F0FF' || normalized === '#627EEA' || normalized === '#A855F7' || normalized === '#8B5CF6') return LINE_NEUTRAL;

  const classification = classifyColor(color);
  if (classification === 'hot') return BAND_RED;
  if (classification === 'green') return BAND_GREEN;
  if (classification === 'amber') return LINE_AMBER;
  return LINE_NEUTRAL;
}

function getHighIntensityLineColor(color: string): string {
  const normalized = color.toUpperCase();
  if (normalized === BAND_RED || normalized === '#EF5350' || normalized === '#C2344D' || normalized === '#FF4444' || normalized === '#DC2626') return BAND_RED;
  if (normalized === BAND_GREEN || normalized === '#4CAF50' || normalized === '#00CC6E' || normalized === '#00FF88' || normalized === '#34D399' || normalized === '#4ADE80') return BAND_GREEN;
  if (normalized === LINE_AMBER || normalized === '#F59E0B' || normalized === '#FBBF24' || normalized === '#FCD34D' || normalized === '#F97316' || normalized === '#EAB308') return LINE_AMBER;
  return LINE_CYAN;
}

function normalizeZoneColor(zone: SentimentZone): SentimentZone {
  return { ...zone, color: normalizeMetricColor(zone.color) };
}

function classifyColor(color: string): 'hot' | 'green' | 'amber' | 'neutral' {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return 'neutral';

  if (r > 200 && g < 150 && b < 150) return 'hot';
  if (r > 200 && g >= 120 && b < 110) return 'amber';
  if (g > 150 && r < 130 && b < 150) return 'green';

  return 'neutral';
}

type ZoneBand = { y1: number; y2: number; fill: string; fillOpacity: number };

function getValueExtent(
  data: SentimentChartPoint[],
  valueKey: string
): { min: number; max: number } | null {
  if (!data || data.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const val = Number(data[i][valueKey]);
    if (Number.isFinite(val)) {
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return null;
  return { min, max };
}

function getReferenceBands(
  data: SentimentChartPoint[],
  valueKey: string,
  referenceBands: ReferenceBandConfig[] | undefined
): ZoneBand[] {
  if (!referenceBands?.length) return [];

  const extent = getValueExtent(data, valueKey);
  if (!extent) return [];

  return referenceBands.flatMap((band) => {
    const y1 = Math.max(band.from ?? extent.min, extent.min);
    const y2 = Math.min(band.to ?? extent.max, extent.max);
    if (!Number.isFinite(y1) || !Number.isFinite(y2) || y1 >= y2) return [];

    return [{
      y1,
      y2,
      fill: band.fill,
      fillOpacity: band.fillOpacity ?? REFERENCE_BAND_OPACITY,
    }];
  });
}

/** Return the exact same vertical gradient stops used by the Fear & Greed
 *  chart line.  Offsets are percentages of the chart height (fixed), not
 *  derived from data values.  This guarantees every sentiment panel uses
 *  the same visual banding logic as FNG.
 *
 *  FNG band mapping (top → bottom):
 *    0 % – 25 %   → #EF4444  (red)
 *   25 % – 45 %   → #F7931A  (orange)
 *   45 % – 55 %   → #88B4D0  (blue)
 *   55 % – 100 %  → #10B981  (green)
 */
function buildZoneGradientStops(
  data: SentimentChartPoint[],
  valueKey: string,
  chartHeight: number,
  panelId: string
): { gradientId: string; stops: Array<{ offset: string; color: string }> } | null {
  // Only use the multi-stop vertical gradient for sentiment oscillator / FNG panels
  if (chartHeight <= 0 || (panelId !== 'fng' && panelId !== 'sentiment-oscillator')) return null;
  const extent = getValueExtent(data, valueKey);
  if (!extent) return null;

  const stops: Array<{ offset: string; color: string }> = [
    { offset: '0%',      color: '#EF4444' },
    { offset: '25%',     color: '#EF4444' },
    { offset: '25.01%',  color: '#F7931A' },
    { offset: '45%',     color: '#F7931A' },
    { offset: '45.01%',  color: '#88B4D0' },
    { offset: '55%',     color: '#88B4D0' },
    { offset: '55.01%',  color: '#10B981' },
    { offset: '75%',     color: '#10B981' },
    { offset: '75.01%',  color: '#10B981' },
    { offset: '100%',    color: '#10B981' },
  ];

  return { gradientId: `${panelId}-${valueKey}-zone-line`, stops };
}

export interface SentimentChartPanelProps {
  panel: SentimentPanelConfig;
  selectedIndicator: string | null;
  capturePanel: (key: string) => void;
  preloadCapture: () => void;
  setPanelRef: (key: string) => (el: HTMLDivElement | null) => void;
  showBtcPrice: Record<string, boolean>;
  setShowBtcPrice: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showIndicator: Record<string, boolean>;
  setShowIndicator: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  visiblePanels: Set<string>;
  rechartsReady: boolean;
  ch: (panelId: string, normalH?: number) => number;
  recharts: Record<string, React.ElementType>;
}

const SentimentChartPanel = memo(function SentimentChartPanel({
  panel,
  selectedIndicator,
  capturePanel,
  preloadCapture,
  setPanelRef,
  showBtcPrice,
  setShowBtcPrice,
  showIndicator,
  setShowIndicator,
  visiblePanels,
  rechartsReady,
  ch,
  recharts,
}: SentimentChartPanelProps) {
  const {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine,
  } = recharts;

  const valueKey = panel.valueKey || 'value';
  const rawLast = panel.data.length > 0 ? panel.data[panel.data.length - 1][valueKey] : null;
  const last = typeof rawLast === 'number' ? rawLast : rawLast == null ? null : Number(rawLast);
  const zone = last != null ? normalizeZoneColor(panel.zoneFn(last)) : null;
  const metricColor = normalizeMetricColor(panel.accentColor);
  const lineColor = getHighIntensityLineColor(panel.accentColor);

  const isVisible = visiblePanels.has(panel.panelId);

  const zoneBands = useMemo(
    () => isVisible ? getReferenceBands(panel.data, valueKey, panel.referenceBands) : [],
    [isVisible, panel.data, valueKey, panel.referenceBands]
  );

  const chartHeight = ch(panel.panelId);
  const zoneLineGradient = useMemo(
    () => isVisible ? buildZoneGradientStops(panel.data, valueKey, chartHeight, panel.panelId) : null,
    [isVisible, panel.data, valueKey, chartHeight, panel.panelId]
  );

  return (
    <PanelMaximizeWrapper
      fullHeight={false}
      panelId={panel.panelId}
      id={panel.id}
      ref={setPanelRef(panel.panelId)}
      data-panel={panel.panelId}
      onMouseEnter={preloadCapture}
      className="bg-[var(--bg-surface)] border overflow-hidden scroll-mt-4"
      style={{
        position: 'relative',
        background: '#120F0D',
        border: '1px solid var(--border-default)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      }}
    >
      {(() => {
        const val = last != null ? panel.headerValue(last) : null;
        const lastDate = panel.data.length > 0 ? (panel.data[panel.data.length - 1]?.dateFormatted ?? null) : null;
        // Use zone color for the value text so it matches the indicator's current state
        const valueColor = zone?.color ?? metricColor;
        return (
          <PanelHeader
            code={panel.code}
            title={panel.title}
            desc={panel.desc}
            value={val}
            zone={zone}
            tag={panel.tag}
            accentColor={valueColor}
            lastUpdated={lastDate}
            updateFreq={panel.updateFreq}
            panelId={panel.panelId}
            onScreenshot={() => capturePanel(panel.panelId)}
          />
        );
      })()}

      <div
        className={`px-4 sm:px-5 pt-3 pb-3 ${selectedIndicator !== null ? 'flex-1 min-h-0 flex flex-col' : ''}`}
        style={{ background: 'linear-gradient(180deg, rgba(10,9,8,0.85) 0%, rgba(10,9,8,0.5) 12%, rgba(10,9,8,0.2) 28%, transparent 55%)' }}
      >

        {(!visiblePanels.has(panel.panelId) || panel.isLoading || !rechartsReady || panel.data.length === 0) ? (
          <ChartSkeleton height={ch(panel.panelId)} />
        ) : (() => {
          const isFred = panel.panelId.startsWith('fred-') || !!panel.useFredTfOpts;
          const showBtc = !isFred && !panel.hideBtcPrice;
          const chartData = showBtc ? (panel.dataWithPrice ?? panel.data) : panel.data;
          return (
            <div className={selectedIndicator !== null ? 'flex-1 min-h-0 flex flex-col' : undefined}>
              <div className="flex flex-row items-center justify-between gap-3 mb-2.5 flex-wrap shrink-0">
                <LineToggle items={[
                  { key: panel.indicatorKey, label: panel.metricLabel, color: metricColor, active: showIndicator[panel.indicatorKey], onClick: () => setShowIndicator((p) => ({ ...p, [panel.indicatorKey]: !p[panel.indicatorKey] })) },
                  ...(showBtc ? [{ key: `price-${panel.indicatorKey}`, label: 'PRICE', color: BTC_PRICE_LEGEND, active: showBtcPrice[panel.indicatorKey], onClick: () => setShowBtcPrice((p) => ({ ...p, [panel.indicatorKey]: !p[panel.indicatorKey] })) }] : []),
                ]} />
                <TfSelector value={panel.timeframe} onChange={panel.setTimeframe} opts={panel.tfOpts ?? (isFred ? FRED_TF_OPTS : undefined)} />
              </div>
              <div className={selectedIndicator !== null ? 'flex-1 min-h-0 flex flex-col' : undefined} style={{ outline: 'none' }}>
                <ResponsiveContainer key={`${panel.panelId}-${panel.timeframe}`} width="100%" height={ch(panel.panelId)} style={{ outline: 'none' }}>
                  <AreaChart
                    data={chartData}
                    style={{ outline: 'none' }}
                  margin={{
                    top: 6,
                    right: showBtc && showBtcPrice[panel.indicatorKey] && !panel.btcSameAxis ? 6 : 14,
                    bottom: 0,
                    left: 10,
                  }}
                >
                  <defs>
                    <linearGradient id={panel.gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={metricColor} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={metricColor} stopOpacity={0} />
                    </linearGradient>
                    {zoneLineGradient && (
                      <linearGradient
                        id={zoneLineGradient.gradientId}
                        x1="0" y1="0" x2="0" y2={chartHeight}
                        gradientUnits="userSpaceOnUse"
                      >
                        {zoneLineGradient.stops.map((s, i) => (
                          <stop key={i} offset={s.offset} stopColor={s.color} />
                        ))}
                      </linearGradient>
                    )}
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(245,241,234,0.05)" vertical={false} />
                  {zoneBands.map((band, i) => (
                    <ReferenceArea key={`band-${i}`} y1={band.y1} y2={band.y2} fill={band.fill} fillOpacity={band.fillOpacity} />
                  ))}
                  <XAxis
                    dataKey="index"
                    stroke="none"
                    ticks={getXAxisTicks(chartData, panel.timeframe)}
                    tick={(props: Record<string, unknown>) => (
                      <DateAxisTick
                        {...props}
                        chartData={chartData}
                        timeframe={panel.timeframe}
                        fontSize={11}
                      />
                    )}
                    interval={0}
                    height={26}
                  />
                  <YAxis
                    {...Y_AXIS_LEFT_PROPS}
                    domain={['auto', 'auto']}
                    tickFormatter={panel.yAxisTick}
                  />
                  {showBtc && showBtcPrice[panel.indicatorKey] && !panel.btcSameAxis && (
                    <YAxis
                      {...Y_AXIS_RIGHT_PROPS}
                      yAxisId="btcPrice"
                      scale="log"
                      domain={['auto', 'auto']}
                      tickFormatter={formatBtcAxisTick}
                    />
                  )}
                  <Tooltip cursor={{ stroke: 'rgba(245,241,234,0.65)', strokeWidth: 2 }} animationDuration={0} isAnimationActive={false}
                    content={(props: Record<string, unknown>) => (
                      <PrecisionTooltip {...props} accentColor={metricColor} getRows={(pt, pl) => {
                        const rows: Array<{ label: string; value: string; color: string; zone?: { label: string; color: string } }> = [];
                        const v = pt[valueKey] as number | undefined;
                        if (v != null) {
                          const z = normalizeZoneColor((panel.zoneFn as (v: number) => { label: string; color: string })(v));
                          rows.push({ label: panel.metricLabel as string, value: (panel.tooltipValue as (v: number) => string)(v), color: metricColor, zone: z.label ? z : undefined });
                        }
                        if (showBtc) {
                          const btc = pl.find((p) => p.dataKey === 'btcPrice');
                          if (btc?.value) rows.push({ label: 'BTC PRICE', value: `$${Math.round(Number(btc.value)).toLocaleString()}`, color: BTC_PRICE_LEGEND });
                        }
                        return rows;
                      }} />
                    )} />
                  {showIndicator[panel.indicatorKey] && <Area type="monotone" dataKey={valueKey} stroke={zoneLineGradient ? `url(#${zoneLineGradient.gradientId})` : (zone?.color ?? lineColor)} strokeWidth={PRIMARY_LINE_STROKE_WIDTH} fill={`url(#${panel.gradientId})`} animationDuration={0} isAnimationActive={false} dot={false} />}
                  {showBtc && showBtcPrice[panel.indicatorKey] && <Area type="monotone" dataKey="btcPrice" {...(panel.btcSameAxis ? {} : { yAxisId: "btcPrice" })} stroke={BTC_PRICE_LINE} strokeWidth={1.5} fill="none" animationDuration={0} isAnimationActive={false} dot={false} />}
                  {(panel.timeframe === '1460' || panel.timeframe === '999999') && getHalvingIndices(chartData).map((h) => (
                    <ReferenceLine key={h.index} x={h.index} stroke="rgba(247,147,26,0.18)" strokeDasharray="2 4" label={{ value: `${h.year}↑`, position: 'top', fill: 'rgba(247,147,26,0.38)', fontSize: 9, fontFamily: 'var(--ff-mono)' }} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </div>
          );
        })()}
      </div>
    </PanelMaximizeWrapper>
  );
}, arePanelPropsEqual);

function arePanelPropsEqual(prev: SentimentChartPanelProps, next: SentimentChartPanelProps): boolean {
  const p = prev.panel;
  const n = next.panel;
  if (p.panelId !== n.panelId) return false;
  if (p.data !== n.data) return false;
  if (p.dataWithPrice !== n.dataWithPrice) return false;
  if (p.isLoading !== n.isLoading) return false;
  if (p.timeframe !== n.timeframe) return false;
  if (p.accentColor !== n.accentColor) return false;

  // Selected indicator state
  if (prev.selectedIndicator !== next.selectedIndicator) return false;

  // Visibility state for this specific panel
  const pVis = prev.visiblePanels.has(p.panelId);
  const nVis = next.visiblePanels.has(n.panelId);
  if (pVis !== nVis) return false;

  // Toggle states for this specific panel
  const pBtc = prev.showBtcPrice[p.indicatorKey];
  const nBtc = next.showBtcPrice[n.indicatorKey];
  if (pBtc !== nBtc) return false;

  const pInd = prev.showIndicator[p.indicatorKey];
  const nInd = next.showIndicator[n.indicatorKey];
  if (pInd !== nInd) return false;

  // Recharts readiness
  if (prev.rechartsReady !== next.rechartsReady) return false;

  return true;
}

export default SentimentChartPanel;
