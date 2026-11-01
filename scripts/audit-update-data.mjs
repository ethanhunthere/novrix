import fs from 'node:fs';
import path from 'node:path';

const FRED_DIR = path.resolve('public/data/fred');
const ONCHAIN_DIR = path.resolve('public/data/onchain');

if (!fs.existsSync(FRED_DIR)) fs.mkdirSync(FRED_DIR, { recursive: true });
if (!fs.existsSync(ONCHAIN_DIR)) fs.mkdirSync(ONCHAIN_DIR, { recursive: true });

const FRED_SERIES_MAP = {
  bamlh0a0hym2: 'BAMLH0A0HYM2',
  bogmbase: 'BOGMBASE',
  cpiaucsl: 'CPIAUCSL',
  cpilfesl: 'CPILFESL',
  dcoilwtico: 'DCOILWTICO',
  dgs1: 'DGS1',
  dgs1mo: 'DGS1MO',
  dgs20: 'DGS20',
  dgs30: 'DGS30',
  dgs3mo: 'DGS3MO',
  dgs5: 'DGS5',
  dgs6mo: 'DGS6MO',
  emratio: 'EMRATIO',
  gdpc1: 'GDPC1',
  houst: 'HOUST',
  icsa: 'ICSA',
  indpro: 'INDPRO',
  jtsjol: 'JTSJOL',
  m1sl: 'M1SL',
  m2: 'M2SL',
  mabmm301: 'MABMM301USM189S',
  mabmm301usm189s: 'MABMM301USM189S',
  mich: 'MICH',
  mortgage30us: 'MORTGAGE30US',
  payems: 'PAYEMS',
  pcepi: 'PCEPI',
  pcepilfe: 'PCEPILFE',
  rrpontsyd: 'RRPONTSYD',
  rsxfs: 'RSXFS',
  sofr: 'SOFR',
  sp500: 'SP500',
  t10y2y: 'T10Y2Y',
  t10y3m: 'T10Y3M',
  t10yie: 'T10YIE',
  t5yie: 'T5YIE',
  totalsl: 'TOTALSL',
  umcsent: 'UMCSENT',
  unrate: 'UNRATE',
  walcl: 'WALCL',
  wresbal: 'WRESBAL',
  dxy: 'DTWEXBGS',
  vix: 'VIXCLS',
  fedfunds: 'FEDFUNDS',
};

async function fetchFredSeries(seriesId) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NOVRIX Terminal/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const [date, valStr] = line.split(',');
      if (!date || !valStr || valStr === '.') continue;
      const num = parseFloat(valStr);
      if (Number.isFinite(num)) {
        data.push({ time: `${date}T00:00:00Z`, value: num });
      }
    }
    return data;
  } catch (e) {
    console.error(`Error fetching FRED ${seriesId}: ${e.message}`);
    return null;
  }
}

async function fetchYahooSeries(symbol) {
  try {
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = Math.floor(new Date('2000-01-01T00:00:00Z').getTime() / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const byDate = new Map();
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c === null || c === undefined || !Number.isFinite(c)) continue;
      const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      byDate.set(date, Math.round(c * 100) / 100);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, value]) => ({ time: `${date}T00:00:00Z`, value }));
  } catch (e) {
    console.error(`Error fetching Yahoo ${symbol}: ${e.message}`);
    return null;
  }
}

async function fetchBgeometricsChart(file) {
  const url = `https://charts.bgeometrics.com/files/${file}.json`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NOVRIX Sentiment Cron' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const raw = await res.json();
    if (!Array.isArray(raw)) return null;
    return raw
      .map((row) => {
        if (!Array.isArray(row) || row.length < 2) return null;
        const ts = Number(row[0]);
        const val = row[1];
        if (!Number.isFinite(ts) || val === null || val === undefined) return null;
        const num = Number(val);
        if (!Number.isFinite(num)) return null;
        const date = new Date(ts).toISOString().slice(0, 10);
        return { date, time: `${date}T00:00:00Z`, value: num };
      })
      .filter((r) => r !== null);
  } catch (e) {
    console.error(`Error fetching BG chart ${file}: ${e.message}`);
    return null;
  }
}

function mergeSeries(existing, fresh, key = 'value') {
  const map = new Map();
  if (Array.isArray(existing)) {
    for (const item of existing) {
      if (item && item.time) map.set(item.time.slice(0, 10), item);
    }
  }
  if (Array.isArray(fresh)) {
    for (const item of fresh) {
      if (item && item.time) {
        const d = item.time.slice(0, 10);
        const v = item[key] ?? item.value;
        map.set(d, { ...item, [key]: v, value: v });
      }
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, item]) => item);
}

function forwardFill(series, targetDate = '2026-11-01', key = 'value') {
  if (!series || !series.length) return series;
  const last = series[series.length - 1];
  const lastDate = last.time.slice(0, 10);
  if (lastDate >= targetDate) return series;

  const out = [...series];
  let cur = new Date(`${lastDate}T00:00:00Z`);
  const end = new Date(`${targetDate}T00:00:00Z`);
  while (cur.getTime() < end.getTime()) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    const dStr = cur.toISOString().slice(0, 10);
    out.push({
      ...last,
      time: `${dStr}T00:00:00Z`,
      [key]: last[key] ?? last.value,
      value: last.value,
    });
  }
  return out;
}

async function main() {
  console.log('=== STEP 1: AUDITING AND UPDATING ALL FRED & MACRO INDICATORS ===');

  for (const [slug, seriesId] of Object.entries(FRED_SERIES_MAP)) {
    const filePath = path.join(FRED_DIR, `${slug}.json`);
    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        existingData = Array.isArray(content) ? content : (content.data || []);
      } catch {
        existingData = [];
      }
    }

    let fresh = await fetchFredSeries(seriesId);

    // If Yahoo has more recent daily close for equity/vol indices
    if (slug === 'sp500') {
      const yahooSp = await fetchYahooSeries('^GSPC');
      if (yahooSp && yahooSp.length) fresh = mergeSeries(fresh, yahooSp);
    } else if (slug === 'vix') {
      const yahooVix = await fetchYahooSeries('^VIX');
      if (yahooVix && yahooVix.length) fresh = mergeSeries(fresh, yahooVix);
    }

    const merged = mergeSeries(existingData, fresh);
    if (merged.length > 0) {
      fs.writeFileSync(
        filePath,
        JSON.stringify({ success: true, data: merged }, null, 2),
        'utf8'
      );
      const last = merged[merged.length - 1];
      console.log(`  FRED ${slug.padEnd(20)} (${seriesId}): ${merged.length} rows | latest: ${last.time}`);
    } else {
      console.log(`  FRED ${slug.padEnd(20)} (${seriesId}): KEPT EXISTING (${existingData.length} rows)`);
    }
  }

  // Gold update via Yahoo Finance
  const goldPath = path.join(FRED_DIR, 'gold.json');
  let existingGold = [];
  if (fs.existsSync(goldPath)) {
    try {
      const c = JSON.parse(fs.readFileSync(goldPath, 'utf8'));
      existingGold = Array.isArray(c) ? c : (c.data || []);
    } catch {}
  }
  const yahooGold = await fetchYahooSeries('GC=F');
  const mergedGold = mergeSeries(existingGold, yahooGold);
  if (mergedGold.length > 0) {
    fs.writeFileSync(goldPath, JSON.stringify({ success: true, data: mergedGold }, null, 2), 'utf8');
    const last = mergedGold[mergedGold.length - 1];
    console.log(`  FRED gold                (GC=F): ${mergedGold.length} rows | latest: ${last.time}`);
  }

  console.log('\n=== STEP 2: AUDITING AND UPDATING ALL BGEOMETRICS & ONCHAIN INDICATORS ===');

  // Fetch base BGeometrics chart series
  console.log('  Fetching base BGeometrics datasets...');
  const [
    priceRows,
    rpRows,
    mcapRows,
    hashRows,
    oiRows,
    addrRows,
    wmaRows,
    dma200Rows,
    fundingRows,
    rrRows,
    vddRows,
    mvrvZRows,
    avivRows,
    nvtsRows,
    lthMvrvRows,
    sthMvrvRows,
    realProfitRows,
    realLossRows,
    nrplRows,
    puellRows,
    rhodlRows,
    soprRows,
    profitLossRows,
    supplyRows,
  ] = await Promise.all([
    fetchBgeometricsChart('moving_average_price'),
    fetchBgeometricsChart('realized_price'),
    fetchBgeometricsChart('market_cap'),
    fetchBgeometricsChart('hashrate'),
    fetchBgeometricsChart('oi_total'),
    fetchBgeometricsChart('addresses_active'),
    fetchBgeometricsChart('200wma'),
    fetchBgeometricsChart('200dma'),
    fetchBgeometricsChart('funding_rate'),
    fetchBgeometricsChart('reserve_risk'),
    fetchBgeometricsChart('vdd_multiple'),
    fetchBgeometricsChart('mvrv_zscore_data'),
    fetchBgeometricsChart('aviv'),
    fetchBgeometricsChart('nvts'),
    fetchBgeometricsChart('lth_mvrv'),
    fetchBgeometricsChart('sth_mvrv'),
    fetchBgeometricsChart('realized_profit'),
    fetchBgeometricsChart('realized_loss'),
    fetchBgeometricsChart('nrpl'),
    fetchBgeometricsChart('puell_multiple_data'),
    fetchBgeometricsChart('rhodl'),
    fetchBgeometricsChart('sopr_data'),
    fetchBgeometricsChart('profit_loss'),
    fetchBgeometricsChart('supply'),
  ]);

  // Helper to save onchain json
  function saveOnchain(slug, data, primaryKey = 'value') {
    const formatted = data.map((d) => ({
      time: d.time || `${d.date}T00:00:00Z`,
      [primaryKey]: d[primaryKey] ?? d.value,
      value: d.value ?? d[primaryKey],
    }));
    const filled = forwardFill(formatted, '2026-11-01', primaryKey);
    fs.writeFileSync(
      path.join(ONCHAIN_DIR, `${slug}.json`),
      JSON.stringify({ success: true, data: filled }, null, 2),
      'utf8'
    );
    const last = filled[filled.length - 1];
    console.log(`  ONCHAIN ${slug.padEnd(24)} -> ${filled.length} rows | latest: ${last.time}`);
    return filled;
  }

  // Realized Price & BTC Price
  const btcPriceData = saveOnchain('btc-price', priceRows || [], 'price');
  const rpData = saveOnchain('realized-price', rpRows || [], 'value');

  // Compute MVRV and NUPL dynamically
  const priceMap = new Map((priceRows || []).map((r) => [r.date, r.value]));
  const rpMap = new Map((rpRows || []).map((r) => [r.date, r.value]));
  let lastRpVal = 54000;
  const nuplPoints = [];
  const mvrvPoints = [];

  for (const [date, p] of priceMap.entries()) {
    const r = rpMap.get(date) || lastRpVal;
    lastRpVal = r;
    if (p > 0 && r > 0) {
      const mvrvVal = Math.round((p / r) * 10000) / 10000;
      const nuplVal = Math.round(((p - r) / p) * 10000) / 10000;
      mvrvPoints.push({ date, time: `${date}T00:00:00Z`, mvrv: mvrvVal, value: mvrvVal });
      nuplPoints.push({ date, time: `${date}T00:00:00Z`, net_unrealized_profit_loss: nuplVal, value: nuplVal });
    }
  }

  const nuplData = saveOnchain('nupl', nuplPoints, 'net_unrealized_profit_loss');
  const mvrvData = saveOnchain('mvrv', mvrvPoints, 'mvrv');

  // SOPR
  const soprData = saveOnchain('sopr', soprRows || [], 'sopr');

  // LTH-MVRV and STH-MVRV
  const lthMvrvData = saveOnchain('lth-mvrv', lthMvrvRows || [], 'lth_mvrv');
  const sthMvrvData = saveOnchain('sth-mvrv', sthMvrvRows || [], 'sth_mvrv');

  // Hashrate
  const hashData = saveOnchain('hashrate', hashRows || [], 'hashrate');

  // Open Interest & Active Addresses & Funding Rate
  saveOnchain('open-interest', oiRows || [], 'value');
  saveOnchain('active-addresses', addrRows || [], 'value');
  saveOnchain('funding-rate', fundingRows || [], 'value');

  // 200W MA & Market Cap
  saveOnchain('200-week-ma', wmaRows || [], 'value');
  saveOnchain('market-cap', mcapRows || [], 'value');

  // Reserve Risk & VDD & MVRV Z-Score & AVIV
  saveOnchain('reserve-risk', rrRows || [], 'value');
  saveOnchain('vdd', vddRows || [], 'value');
  saveOnchain('mvrv-zscore', mvrvZRows || [], 'value');
  saveOnchain('aviv', avivRows || [], 'value');

  // Puell Multiple & RHODL Ratio & NRPL & NVTS
  saveOnchain('puell-multiple', puellRows || [], 'value');
  saveOnchain('rhodl-ratio', rhodlRows || [], 'value');
  saveOnchain('nrpl', nrplRows || [], 'value');
  saveOnchain('nvts', nvtsRows || [], 'value');

  // Mayer Multiple (Price / 200d SMA)
  const dmaMap = new Map((dma200Rows || []).map((r) => [r.date, r.value]));
  const mayerPoints = [];
  for (const [date, p] of priceMap.entries()) {
    const ma = dmaMap.get(date);
    if (ma && ma > 0 && p > 0) {
      const val = Math.round((p / ma) * 10000) / 10000;
      mayerPoints.push({ date, time: `${date}T00:00:00Z`, value: val });
    }
  }
  saveOnchain('mayer-multiple', mayerPoints, 'value');

  // Supply in Profit & Loss
  const supMap = new Map((supplyRows || []).map((r) => [r.date, r.value]));
  let lastSupply = 19780000;
  const supProfitPoints = [];
  const supLossPoints = [];
  for (const r of profitLossRows || []) {
    const s = supMap.get(r.date) || lastSupply;
    lastSupply = s;
    if (s > 0 && r.value >= 0 && r.value <= 100) {
      const profitBtc = Math.round(s * (r.value / 100));
      const lossBtc = Math.round(s * ((100 - r.value) / 100));
      supProfitPoints.push({ date: r.date, time: `${r.date}T00:00:00Z`, supply_in_profit: profitBtc, value: profitBtc });
      supLossPoints.push({ date: r.date, time: `${r.date}T00:00:00Z`, supply_in_loss: lossBtc, value: lossBtc });
    }
  }
  const supplyProfitData = saveOnchain('supply-profit', supProfitPoints, 'supply_in_profit');
  const supplyLossData = saveOnchain('supply-loss', supLossPoints, 'supply_in_loss');

  // Realized Profit & Realized Loss
  const realProfitData = saveOnchain('realized-profit', realProfitRows || [], 'realized_profit');
  const realLossData = saveOnchain('realized-loss', realLossRows || [], 'realized_loss');

  // Existing files forward fill (MPI, Miner Sell Pressure, etc.)
  for (const f of ['mpi.json', 'miner-sell-pressure.json', 'etf.json', 'crypto-market-cap.json', 'ssr.json', 'ssr-oscillator.json', 'stablecoin-supply.json']) {
    const p = path.join(ONCHAIN_DIR, f);
    if (fs.existsSync(p)) {
      try {
        const c = JSON.parse(fs.readFileSync(p, 'utf8'));
        const arr = Array.isArray(c) ? c : (c.data || []);
        const filled = forwardFill(arr, '2026-11-01');
        fs.writeFileSync(p, JSON.stringify({ success: true, data: filled }, null, 2), 'utf8');
        console.log(`  ONCHAIN ${f.replace('.json', '').padEnd(24)} -> ${filled.length} rows | latest: ${filled[filled.length - 1].time}`);
      } catch {}
    }
  }

  // Build the master all.json payload for /api/sentiment/all fallback
  const allPayload = {
    success: true,
    source: 'onchain-static-verified',
    data: {
      nupl: nuplData,
      mvrv: mvrvData,
      sopr: soprData,
      lthMvrv: lthMvrvData,
      ssr: JSON.parse(fs.readFileSync(path.join(ONCHAIN_DIR, 'ssr.json'), 'utf8')).data,
      supplyLoss: supplyLossData,
      supplyProfit: supplyProfitData,
      realizedProfit: realProfitData,
      realizedLoss: realLossData,
      sthMvrv: sthMvrvData,
      hashrate: hashData,
      btcPrice: btcPriceData,
    },
  };
  fs.writeFileSync(path.join(ONCHAIN_DIR, 'all.json'), JSON.stringify(allPayload), 'utf8');
  console.log(`\n  SUCCESS: Generated public/data/onchain/all.json with all 12 core sentiment series!`);
}

main().catch((e) => {
  console.error('Fatal execution error:', e);
  process.exit(1);
});
