'use client';

import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';
import DesktopGate from '@/components/layout/DesktopGate';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAuth } from '@/lib/hooks/useAuth';
import type { AuthUser } from '@/lib/hooks/useAuth';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

/* ═══════════════════════════════════════════════════════════
   MARKET DATA
   ═══════════════════════════════════════════════════════════ */

interface MarketTicker {
  btc: number; eth: number; sol: number;
  btcDelta: number; ethDelta: number; solDelta: number;
  btcMcap: number; totalMcap: number;
  fgi: number; fgiLabel: string;
}

function useMarketData() {
  const [data, setData] = useState<MarketTicker | null>(null);
  useEffect(() => {
    const f = async () => {
      try {
        const [p, g] = await Promise.all([
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true', { signal: AbortSignal.timeout(8000) }),
          fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(8000) }),
        ]);
        const prices = await p.json() as Record<string, Record<string, number>>;
        const fgi    = await g.json() as { data?: Array<{ value?: string; value_classification?: string }> };
        setData({
          btc: prices.bitcoin?.usd || 0, eth: prices.ethereum?.usd || 0, sol: prices.solana?.usd || 0,
          btcDelta: prices.bitcoin?.usd_24h_change || 0, ethDelta: prices.ethereum?.usd_24h_change || 0, solDelta: prices.solana?.usd_24h_change || 0,
          btcMcap:  prices.bitcoin?.usd_market_cap || 0,
          totalMcap: (prices.bitcoin?.usd_market_cap || 0) + (prices.ethereum?.usd_market_cap || 0) + (prices.solana?.usd_market_cap || 0),
          fgi: parseInt(fgi?.data?.[0]?.value || '50'), fgiLabel: fgi?.data?.[0]?.value_classification || 'Neutral',
        });
      } catch { /* silent */ }
    };
    f();
    // Paused while the tab is hidden — background tabs don't poll prices.
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') void f();
    }, 60000);
    return () => clearInterval(iv);
  }, []);
  return data;
}

const SYS_SERIAL = 'NVX-4F9A2C1B';
const SYS_VER    = 'v2.0.4-beta';

function useSystemMetrics() {
  const [m, setM] = useState({ latency: 11, throughput: 843 });
  useEffect(() => {
    const id = setInterval(() => setM({
      latency:    8 + Math.floor(Math.random() * 14),
      throughput: 808 + Math.floor(Math.random() * 82),
    }), 2500);
    return () => clearInterval(id);
  }, []);
  return { ...m, serial: SYS_SERIAL, ver: SYS_VER };
}

function formatUSD(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  return `$${(v / 1e3).toFixed(0)}K`;
}

const MODULES = [
  {
    id: '01', code: 'SE-01',
    name: 'SENTIMENT',
    subtitle: 'ON-CHAIN INDICATOR SUITE',
    desc: 'A panel of 14 on-chain indicators organized by category. Select an indicator from the left sidebar, choose a timeframe, and read the current signal phase. Each indicator includes a historical chart and a signal interpretation.',
    steps: [
      'Select an indicator from the left sidebar',
      'Choose a timeframe: 1W · 1M · 6M · 1Y · 4Y · ALL',
      'Read the current phase and signal strength on the chart',
    ],
    tags: ['NUPL', 'MVRV', 'SOPR', 'HASHRATE', 'DOMINANCE', 'NVT'],
    meta: ['14 INDICATORS', '6 TIMEFRAMES'],
    href: '/sentiment',
    accent: '#C2344D', rgb: '194,52,77',
  },
  {
    id: '02', code: 'WT-02',
    name: 'TRACKING',
    subtitle: 'WHALE MOVEMENT MONITOR',
    desc: 'A real-time feed of large wallet transactions across 10 blockchains. Select a chain, set a minimum threshold, and filter by entity type. Each transaction is labeled by known entity and flow direction.',
    steps: [
      'Select a blockchain from the chain selector at the top',
      'Set a minimum threshold and an entity type filter',
      'Read flow type and entity label per transaction row',
    ],
    tags: ['BTC', 'ETH', 'SOL', 'TRX', 'SUI', 'SEI', 'BASE', 'ARB'],
    meta: ['10 CHAINS', '24 ENTITIES'],
    href: '/tracking',
    accent: '#00C8EE', rgb: '0,200,238',
  },
  {
    id: '03', code: 'ML-03',
    name: 'METRILYTICS',
    subtitle: 'DEFI PROTOCOL DASHBOARD',
    desc: 'Eight dashboard modules covering DeFi protocol metrics. Navigate between modules using the top tab bar. Each module covers a distinct data layer: TVL, fee revenue, DEX volume, stablecoin flows, derivatives, and yield pools.',
    steps: [
      'Select a dashboard module from the top tab bar',
      'Apply chain or protocol filters where available',
      'Switch between chart view and metrics table',
    ],
    tags: ['TVL', 'FEES', 'DEX', 'STABLECOINS', 'DERIVATIVES', 'YIELD'],
    meta: ['8 DASHBOARDS', '165+ METRICS'],
    href: '/metrilytics',
    accent: '#E8960C', rgb: '232,150,12',
  },
];

/* ═══════════════════════════════════════════════════════════
   4-CHANNEL OSCILLOSCOPE — SE-01
   Each channel has a distinct waveform character.
   CH1=F&G driven · CH2=price-action spiky · CH3=correlation · CH4=volatility noise
   ═══════════════════════════════════════════════════════════ */

const OSC_CHANNELS = [
  {
    label: 'CH1', sub: 'FEAR/GREED INDEX', color: '#C2344D', rgb: '194,52,77',
    wave: (nx: number, t: number, fgi: number) => {
      const amp = 7 + (fgi / 100) * 22;
      const freq = 5 + (fgi / 100) * 3;
      return Math.sin(nx * Math.PI * freq + t * 2.6) * amp
           + Math.sin(nx * Math.PI * (freq * 1.61) + t * 1.7) * (amp * 0.21)
           + Math.sin(nx * Math.PI * 31 + t * 5.1) * (amp * 0.06);
    },
  },
  {
    label: 'CH2', sub: 'BTC MOMENTUM', color: '#00FF88', rgb: '0,255,136',
    wave: (nx: number, t: number) => {
      return Math.sin(nx * Math.PI * 8.5 + t * 3.1) * 14
           + Math.sin(nx * Math.PI * 31 + t * 7.2) * 5 * Math.abs(Math.sin(nx * Math.PI * 2.1))
           + Math.sin(nx * Math.PI * 73 + t * 11) * 2.2;
    },
  },
  {
    label: 'CH3', sub: 'SIGNAL CORRELATION', color: '#00C8EE', rgb: '0,200,238',
    wave: (nx: number, t: number) => {
      return Math.sin(nx * Math.PI * 6.2 + t * 1.9) * 13
           + Math.cos(nx * Math.PI * 3.7 + t * 0.8) * 5.5;
    },
  },
  {
    label: 'CH4', sub: 'VOLATILITY INDEX', color: '#F59E0B', rgb: '245,158,11',
    wave: (nx: number, t: number) => {
      return Math.sin(nx * Math.PI * 18 + t * 4.5) * 15
           + Math.sin(nx * Math.PI * 42 + t * 8.1) * 5
           + Math.sin(nx * Math.PI * 91 + t * 15) * 2.5;
    },
  },
];

function OscilloscopeMultiChan({ fgi }: { fgi: number | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }

      tRef.current += 0.016;
      const t      = tRef.current;
      const fgiVal = fgi ?? 50;
      const LABEL_W = 72;
      const CH_H    = H / 4;

      ctx.fillStyle = '#020508';
      ctx.fillRect(0, 0, W, H);

      OSC_CHANNELS.forEach((ch, ci) => {
        const cy   = CH_H * ci;
        const midY = cy + CH_H / 2;

        // channel zone tint
        ctx.fillStyle = `rgba(${ch.rgb},0.022)`;
        ctx.fillRect(0, cy, W, CH_H);

        // channel separator
        if (ci > 0) {
          ctx.strokeStyle = 'rgba(255,255,255,0.055)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
        }

        // label column background
        ctx.fillStyle = `rgba(${ch.rgb},0.07)`;
        ctx.fillRect(0, cy, LABEL_W, CH_H);
        ctx.strokeStyle = `rgba(${ch.rgb},0.14)`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(LABEL_W, cy); ctx.lineTo(LABEL_W, cy + CH_H); ctx.stroke();

        // label text
        ctx.fillStyle = ch.color;
        ctx.font = `900 9px "JetBrains Mono",monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(ch.label, 9, midY - 7);
        ctx.fillStyle = `rgba(${ch.rgb},0.5)`;
        ctx.font = `500 5.5px "JetBrains Mono",monospace`;
        ctx.fillText(ch.sub, 9, midY + 6);

        // grid
        ctx.strokeStyle = 'rgba(255,255,255,0.035)';
        ctx.lineWidth = 0.5;
        [0.25, 0.5, 0.75].forEach(f => {
          ctx.beginPath(); ctx.moveTo(LABEL_W, cy + CH_H * f); ctx.lineTo(W, cy + CH_H * f); ctx.stroke();
        });
        for (let i = 1; i < 8; i++) {
          const gx = LABEL_W + (W - LABEL_W) / 8 * i;
          ctx.beginPath(); ctx.moveTo(gx, cy); ctx.lineTo(gx, cy + CH_H); ctx.stroke();
        }

        // center axis
        ctx.strokeStyle = `rgba(${ch.rgb},0.1)`;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(LABEL_W, midY); ctx.lineTo(W, midY); ctx.stroke();

        // build waveform points
        const pts: [number, number][] = [];
        const wW = W - LABEL_W;
        for (let i = 0; i <= wW; i++) {
          const nx = i / wW;
          const y  = (ch.wave as (nx: number, t: number, fgiVal: number) => number)(nx, t, fgiVal);
          pts.push([LABEL_W + i, midY - y]);
        }

        // glow halo
        ctx.save();
        ctx.shadowBlur = 14; ctx.shadowColor = ch.color;
        ctx.strokeStyle = `rgba(${ch.rgb},0.16)`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        ctx.stroke();
        ctx.restore();

        // fill under wave
        ctx.beginPath();
        pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        ctx.lineTo(W, midY); ctx.lineTo(LABEL_W, midY); ctx.closePath();
        ctx.fillStyle = `rgba(${ch.rgb},0.04)`;
        ctx.fill();

        // waveform line
        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        ctx.stroke();

        // cursor dot at end
        const last = pts[pts.length - 1];
        if (last) {
          ctx.save();
          ctx.shadowBlur = 10; ctx.shadowColor = ch.color;
          ctx.fillStyle = ch.color;
          ctx.beginPath(); ctx.arc(last[0], last[1], 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }

        // value readout
        let valText = '';
        if (ci === 0 && fgi !== null) valText = `${fgi}`;
        if (valText) {
          ctx.fillStyle = `rgba(${ch.rgb},0.45)`;
          ctx.font = `700 7px "JetBrains Mono",monospace`;
          ctx.textAlign = 'right';
          ctx.fillText(valText, W - 8, cy + 11);
        }
        ctx.textAlign = 'left';
      });

      // bottom label strip
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.font = `600 5.5px "JetBrains Mono",monospace`;
      ctx.textAlign = 'right';
      ctx.fillText('50ms/DIV · NOVRIX OSC-4', W - 8, H - 5);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.textAlign = 'left';
      ctx.fillText('', 8, H - 5);
      ctx.textAlign = 'left';

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [fgi]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', background: '#020508' }} />;
}

/* ═══════════════════════════════════════════════════════════
   RADAR — WT-02
   ═══════════════════════════════════════════════════════════ */

const RADAR_CHAINS = [
  { label: 'BTC',  angle: 0,   dist: 0.44 },
  { label: 'ETH',  angle: 36,  dist: 0.71 },
  { label: 'SOL',  angle: 72,  dist: 0.57 },
  { label: 'TRX',  angle: 108, dist: 0.82 },
  { label: 'SUI',  angle: 144, dist: 0.64 },
  { label: 'ARB',  angle: 185, dist: 0.76 },
  { label: 'BASE', angle: 218, dist: 0.52 },
  { label: 'POL',  angle: 252, dist: 0.88 },
  { label: 'SEI',  angle: 298, dist: 0.69 },
  { label: 'AVA',  angle: 335, dist: 0.60 },
];

function RadarViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const degRef    = useRef(0);
  const echoesRef = useRef<{ x: number; y: number; r: number; born: number; color: string }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }

      degRef.current = (degRef.current + 0.9) % 360;
      const sweepRad = (degRef.current * Math.PI) / 180;
      const cx = W / 2, cy = H / 2;
      const maxR = Math.min(cx, cy) * 0.84;

      ctx.fillStyle = '#030407';
      ctx.fillRect(0, 0, W, H);

      // radial background glow
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      bg.addColorStop(0,   'rgba(194,52,77,0.08)');
      bg.addColorStop(0.5, 'rgba(194,52,77,0.02)');
      bg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // rings — 5 rings for more depth
      [0.2, 0.4, 0.6, 0.8, 1.0].forEach((r, i) => {
        ctx.strokeStyle = i === 4 ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, maxR * r, 0, Math.PI * 2); ctx.stroke();
      });

      // 8 radial lines
      for (let a = 0; a < 360; a += 45) {
        const rad = (a * Math.PI) / 180;
        ctx.strokeStyle = a % 90 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * 6, cy + Math.sin(rad) * 6);
        ctx.lineTo(cx + Math.cos(rad) * maxR, cy + Math.sin(rad) * maxR);
        ctx.stroke();
      }

      // sweep trail
      const trailLen = 80;
      for (let i = 0; i < trailLen; i++) {
        const frac   = i / trailLen;
        const alpha  = frac * frac * 0.25;
        const startA = sweepRad - (1 - frac) * (Math.PI * 1.1);
        const endA   = sweepRad - (1 - frac - 1 / trailLen) * (Math.PI * 1.1);
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, startA, endA);
        ctx.closePath();
        ctx.fillStyle = `rgba(194,52,77,${alpha})`;
        ctx.fill();
      }

      // sweep line
      ctx.save();
      ctx.shadowBlur = 16; ctx.shadowColor = 'rgba(194,52,77,0.9)';
      ctx.strokeStyle = '#C2344D'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepRad) * maxR, cy + Math.sin(sweepRad) * maxR);
      ctx.stroke();
      ctx.restore();

      // blips + echo injection
      RADAR_CHAINS.forEach(chain => {
        const blipRad = (chain.angle * Math.PI) / 180;
        const bx = cx + Math.cos(blipRad) * maxR * chain.dist;
        const by = cy + Math.sin(blipRad) * maxR * chain.dist;
        const diff = ((sweepRad - blipRad) + Math.PI * 2) % (Math.PI * 2);
        const intensity = Math.max(0, 1 - diff / (Math.PI * 0.6));
        const r = 2 + intensity * 3;

        ctx.save();
        if (intensity > 0.2) { ctx.shadowBlur = 16 * intensity; ctx.shadowColor = '#C2344D'; }
        ctx.fillStyle = `rgba(194,52,77,${0.12 + intensity * 0.88})`;
        ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
        if (intensity > 0.88) {
          ctx.strokeStyle = `rgba(194,52,77,${(intensity - 0.88) * 5})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(bx, by, 9 + (1 - intensity) * 22, 0, Math.PI * 2); ctx.stroke();
          // inject echo
          if (Math.random() < 0.08) {
            echoesRef.current.push({ x: bx, y: by, r: 5, born: Date.now(), color: '#C2344D' });
          }
        }
        ctx.restore();
        if (intensity > 0.4) {
          ctx.fillStyle = `rgba(255,255,255,${intensity * 0.72})`;
          ctx.font = `bold 6px "JetBrains Mono",monospace`;
          ctx.fillText(chain.label, bx + 6, by - 4);
        }
      });

      // draw + age echoes
      const now = Date.now();
      echoesRef.current = echoesRef.current.filter(e => now - e.born < 2200);
      echoesRef.current.forEach(e => {
        const age   = (now - e.born) / 2200;
        const eR    = e.r + age * 28;
        const alpha = (1 - age) * 0.35;
        ctx.strokeStyle = `rgba(194,52,77,${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(e.x, e.y, eR, 0, Math.PI * 2); ctx.stroke();
      });

      // center origin
      ctx.save();
      ctx.shadowBlur = 20; ctx.shadowColor = '#C2344D';
      ctx.fillStyle = '#C2344D';
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // HUD labels
      ctx.fillStyle = 'rgba(194,52,77,0.5)';
      ctx.font = '700 6px "JetBrains Mono",monospace';
      ctx.textAlign = 'left';  ctx.fillText('GLOBAL SWEEP', 10, 14);
      ctx.textAlign = 'right'; ctx.fillText(`${Math.round(degRef.current)}°`, W - 10, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.textAlign = 'left';  ctx.fillText('10 NODES ONLINE', 10, H - 8);
      ctx.textAlign = 'right'; ctx.fillText('ACTIVE', W - 10, H - 8);
      ctx.textAlign = 'left';

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', background: '#030407' }} />;
}

/* ═══════════════════════════════════════════════════════════
   3D SPECTRUM CANVAS — ML-03
   Three depth layers drawn back-to-front for perspective depth.
   ═══════════════════════════════════════════════════════════ */

const SPEC_BASE = Array.from({ length: 48 }, (_, i) =>
  Math.max(0.06, Math.min(0.96,
    Math.abs(Math.sin(i * 2.31 + 0.71) * 0.48 + Math.sin(i * 0.97 + 1.2) * 0.36 + 0.22)
  ))
);

function SpectrumCanvas({ mcap }: { mcap: number | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }

      tRef.current += 0.012;
      const t = tRef.current;

      ctx.fillStyle = '#030A0E';
      ctx.fillRect(0, 0, W, H);

      // subtle horizontal grid
      [0.25, 0.5, 0.75].forEach(f => {
        ctx.strokeStyle = 'rgba(0,200,238,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, H * f); ctx.lineTo(W, H * f); ctx.stroke();
      });

      const N    = SPEC_BASE.length;
      const PAD  = 14;
      const barW = (W - PAD * 2) / N;

      // 3 depth layers: back → front
      const layers = [
        { yOffset: -H * 0.1, alpha: 0.18, phase: 0.4, speedMult: 0.6, tint: '0,200,238' },
        { yOffset: -H * 0.05, alpha: 0.42, phase: 0.2, speedMult: 0.8, tint: '0,200,238' },
        { yOffset: 0,         alpha: 0.88, phase: 0,   speedMult: 1.0, tint: '0,200,238' },
      ];

      layers.forEach(layer => {
        SPEC_BASE.forEach((base, i) => {
          const anim = Math.sin(t * layer.speedMult * 1.8 + i * 0.38 + layer.phase) * 0.18;
          const h    = Math.max(0.04, Math.min(0.97, base + anim));
          const barH = h * (H * 0.88);
          const x    = PAD + i * barW;
          const y    = H + layer.yOffset - barH;

          const glowAlpha = layer.alpha * (0.3 + h * 0.7);
          const grad = ctx.createLinearGradient(0, y, 0, H + layer.yOffset);
          grad.addColorStop(0, `rgba(${layer.tint},${glowAlpha})`);
          grad.addColorStop(0.6, `rgba(${layer.tint},${glowAlpha * 0.6})`);
          grad.addColorStop(1, `rgba(${layer.tint},${glowAlpha * 0.1})`);

          ctx.fillStyle = grad;
          ctx.fillRect(x + 1, y, barW - 2, barH);

          // glow top for tall bars
          if (h > 0.65 && layer.alpha > 0.5) {
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = `rgba(0,200,238,${(h - 0.65) * 0.7})`;
            ctx.fillStyle = `rgba(0,200,238,${(h - 0.65) * layer.alpha})`;
            ctx.fillRect(x + 2, y, barW - 4, 2);
            ctx.restore();
          }
        });
      });

      // market cap readout overlay
      if (mcap) {
        ctx.fillStyle = 'rgba(0,200,238,0.38)';
        ctx.font = `500 6px "JetBrains Mono",monospace`;
        ctx.textAlign = 'left';
        ctx.fillText('TOTAL MCAP TRACKED', 16, 18);
        ctx.save();
        ctx.shadowBlur = 24; ctx.shadowColor = 'rgba(0,200,238,0.5)';
        ctx.fillStyle = '#00C8EE';
        ctx.font = `900 28px "JetBrains Mono",monospace`;
        ctx.fillText(formatUSD(mcap), 16, 46);
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(0,200,238,0.15)';
        ctx.font = `500 6px "JetBrains Mono",monospace`;
        ctx.textAlign = 'left';
        ctx.fillText('TOTAL MCAP TRACKED', 16, 18);
        ctx.fillStyle = 'rgba(0,50,60,0.9)';
        ctx.font = `900 28px "JetBrains Mono",monospace`;
        ctx.fillText('——', 16, 46);
      }

      ctx.fillStyle = 'rgba(0,200,238,0.25)';
      ctx.font = `600 5.5px "JetBrains Mono",monospace`;
      ctx.textAlign = 'right';
      ctx.fillText('SPECTRAL DEPTH · 3-LAYER', W - 14, H - 8);
      ctx.textAlign = 'left';

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [mcap]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', background: '#030A0E' }} />;
}

/* ═══════════════════════════════════════════════════════════
   ENTITY SCANNER — WT-02
   ═══════════════════════════════════════════════════════════ */

const ENTITY_POOL = [
  { text: '> BLACKROCK_BTC_ACCUMULATION', status: 'DETECTED' },
  { text: '> GRAYSCALE_TRUST_COLD_STORAGE', status: 'ACTIVE' },
  { text: '> COINBASE_PRIME_OTC_DESK', status: 'ACTIVE' },
  { text: '> [UNKNOWN_ENTITY_00A7F2]', status: 'FLAGGED' },
  { text: '> MICROSTRATEGY_RESERVE_03', status: 'DETECTED' },
  { text: '> JUMP_TRADING_ARB_WALLET', status: 'ACTIVE' },
  { text: '> WINTERMUTE_ETH_POSITION', status: 'DETECTED' },
  { text: '> PANTERA_CAPITAL_SOL_POS', status: 'MONITORING' },
  { text: '> [ENTITY_D9B2]', status: 'RESTRICTED' },
  { text: '> GALAXY_DIGITAL_BTC_COLD', status: 'ACTIVE' },
  { text: '> THREE_ARROWS_RECOVERY_07', status: 'FLAGGED' },
  { text: '> ALAMEDA_REMNANT_WALLET', status: 'FLAGGED' },
];

function EntityScan() {
  const [visible, setVisible] = useState<typeof ENTITY_POOL>([]);
  useEffect(() => {
    const pool = [...ENTITY_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    queueMicrotask(() => setVisible(pool));
    const iv = setInterval(() => {
      setVisible(prev => {
        const next = [...prev];
        next[Math.floor(Math.random() * 3)] = ENTITY_POOL[Math.floor(Math.random() * ENTITY_POOL.length)];
        return next;
      });
    }, 2400);
    return () => clearInterval(iv);
  }, []);

  const color = (s: string) => {
    if (s === 'FLAGGED' || s === 'RESTRICTED') return 'rgba(248,113,113,0.75)';
    if (s === 'DETECTED') return 'rgba(194,52,77,0.85)';
    return 'rgba(255,255,255,0.3)';
  };

  return (
    <div style={{ padding: '12px 0 0 0' }}>
      <div style={{ fontSize: '6px', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.44em', color: 'rgba(194,52,77,0.4)', marginBottom: '8px', textTransform: 'uppercase' }}>
        Entity Scanner
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {visible.map((e, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '7px', fontFamily: "'JetBrains Mono',monospace", color: color(e.status), letterSpacing: '0.02em' }}>{e.text}</span>
            <span style={{ fontSize: '6px', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.28em', color: color(e.status), flexShrink: 0, marginLeft: '12px' }}>{e.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SIGNAL SPINE — animated particle bus connecting 3 modules
   ═══════════════════════════════════════════════════════════ */

function SignalSpine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }

      ctx.clearRect(0, 0, W, H);
      const y = H / 2;

      // spine gradient
      const spineGrad = ctx.createLinearGradient(0, 0, W, 0);
      spineGrad.addColorStop(0,    'transparent');
      spineGrad.addColorStop(0.06, 'rgba(194,52,77,0.18)');
      spineGrad.addColorStop(0.48, 'rgba(194,52,77,0.28)');
      spineGrad.addColorStop(0.52, 'rgba(0,200,238,0.28)');
      spineGrad.addColorStop(0.94, 'rgba(0,200,238,0.18)');
      spineGrad.addColorStop(1,    'transparent');
      ctx.strokeStyle = spineGrad;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();

      // 3 module nodes
      const nodes = [
        { x: W * 0.167, label: 'SE-01', color: '#C2344D', rgb: '194,52,77' },
        { x: W * 0.500, label: 'WT-02', color: '#C2344D', rgb: '194,52,77' },
        { x: W * 0.833, label: 'ML-03', color: '#00C8EE', rgb: '0,200,238' },
      ];

      nodes.forEach(n => {
        ctx.strokeStyle = `rgba(${n.rgb},0.22)`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(n.x, y - 16); ctx.lineTo(n.x, y + 16); ctx.stroke();

        ctx.save();
        ctx.shadowBlur = 14; ctx.shadowColor = n.color;
        ctx.fillStyle = n.color;
        ctx.beginPath(); ctx.arc(n.x, y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.fillStyle = `rgba(${n.rgb},0.55)`;
        ctx.font = `700 6.5px "JetBrains Mono",monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, y - 22);
      });

      // animated particles — 4 flowing across the spine
      offsetRef.current = (offsetRef.current + 0.7) % W;
      [0, W * 0.25, W * 0.5, W * 0.75].forEach(base => {
        const px     = (offsetRef.current + base) % W;
        const prog   = px / W;
        const pColor = prog > 0.6 ? '0,200,238' : '194,52,77';
        const alpha  = 0.35 + 0.55 * Math.sin(prog * Math.PI);
        ctx.save();
        ctx.shadowBlur = 7; ctx.shadowColor = `rgba(${pColor},0.7)`;
        ctx.fillStyle = `rgba(${pColor},${alpha})`;
        ctx.beginPath(); ctx.arc(px, y, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      // label
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.font = `600 5.5px "JetBrains Mono",monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('SIGNAL BUS', 12, y - 9);
      ctx.textAlign = 'right';
      ctx.fillText('3 NODES', W - 12, y - 9);
      ctx.textAlign = 'left';

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '72px', display: 'block' }} />;
}

/* ═══════════════════════════════════════════════════════════
   AUTH GATE PANEL — SINGLE ID AUTHENTICATION
   ═══════════════════════════════════════════════════════════ */

type GateMode = 'signin' | 'signup';

// Character set for ID generation animation
const ID_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#%!-';

function getSafeRedirectTarget(raw: string | null) {
  if (!raw) return '/terminal';

  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return '/terminal';

    return ['/sentiment', '/tracking', '/metrilytics'].some(
      modulePath => decoded === modulePath || decoded.startsWith(`${modulePath}/`)
    ) ? decoded : '/terminal';
  } catch {
    return '/terminal';
  }
}

function GatePanel({ targetModule, onSuccess, onClose }: {
  targetModule: string; onSuccess: (u: AuthUser) => void; onClose: () => void;
}) {
  const [mode, setMode]           = useState<GateMode>('signin');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [shaking, setShaking]     = useState(false);
  const [focusField, setFocusField] = useState('');
  const [siId, setSiId]           = useState('');
  const [novrixId, setNovrixId]   = useState('');
  const [idLoading, setIdLoading] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [granted, setGranted]     = useState(false);
  const [grantedFlash, setGrantedFlash] = useState(false);
  const [authHover, setAuthHover] = useState(false);
  const [authedUser, setAuthedUser] = useState<AuthUser | null>(null);
  const idFetched = useRef(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const fetchNewId = useCallback(() => {
    if (idFetched.current) return;
    idFetched.current = true;
    setIdLoading(true);
    setError('');
    fetch('/api/auth/generate-id', { method: 'POST', credentials: 'include' })
      .then(r => r.json() as Promise<{ success?: boolean; novrix_id?: string; error?: string }>)
      .then((d) => { if (d.success && d.novrix_id) setNovrixId(d.novrix_id); else { idFetched.current = false; setError(d.error || 'Failed to generate ID. Try again.'); } })
      .catch(() => { idFetched.current = false; setError('Connection error. Try again.'); })
      .finally(() => setIdLoading(false));
  }, []);

  useEffect(() => {
    if (mode !== 'signup') return;
    fetchNewId();
  }, [mode, fetchNewId]);

  const shake = () => { setShaking(true); setTimeout(() => setShaking(false), 600); };

  const signIn = async () => {
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ novrix_id: siId.trim() }) });
      const data = await res.json() as { success?: boolean; user?: AuthUser; error?: string };
      if (res.ok && data.success && data.user) { onSuccess(data.user); return; }
      shake(); setError(data.error || 'Invalid credentials');
    } catch { shake(); setError('Connection error. Try again.'); }
    finally { setLoading(false); }
  };

  const signUp = async () => {
    setError('');
    setLoading(true);
    try {
      const signupRes  = await fetch('/api/auth/signup', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ novrix_id: novrixId }) });
      const signupData = await signupRes.json() as { success?: boolean; error?: string };
      if (!signupRes.ok || !signupData.success) { shake(); setError(signupData.error || 'Initialization failed'); return; }
      let resolvedUser: AuthUser | null = null;
      try {
        const loginRes  = await fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ novrix_id: novrixId }) });
        const loginData = await loginRes.json() as { success?: boolean; user?: AuthUser };
        if (loginRes.ok && loginData.success && loginData.user) { resolvedUser = loginData.user; setAuthedUser(loginData.user); }
      } catch { /* silent */ }
      const capturedId = novrixId;
      setGrantedFlash(true);
      setTimeout(() => onSuccess(resolvedUser || { id: '', novrix_id: capturedId }), 1000);
    } catch { shake(); setError('Connection error. Try again.'); }
    finally { setLoading(false); }
  };

  const copyId = () => {
    navigator.clipboard.writeText(novrixId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-6 overflow-y-auto"
      style={{ background: 'rgba(1,2,6,0.96)', backdropFilter: 'blur(12px)' }}
      initial={false} animate={{ opacity: 1 }} transition={{ duration: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <motion.div
        style={{ position: 'relative', width: '480px', maxWidth: 'calc(100vw - 32px)' }}
        initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0 }}>

        {/* Corner brackets — visible institutional frame */}
        <div aria-hidden="true" style={{ position: 'absolute', top: '-10px', left: '-10px', width: '20px', height: '20px', borderTop: '1.5px solid rgba(148,163,184,0.55)', borderLeft: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', borderTop: '1.5px solid rgba(148,163,184,0.55)', borderRight: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', bottom: '-10px', left: '-10px', width: '20px', height: '20px', borderBottom: '1.5px solid rgba(148,163,184,0.55)', borderLeft: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', bottom: '-10px', right: '-10px', width: '20px', height: '20px', borderBottom: '1.5px solid rgba(148,163,184,0.55)', borderRight: '1.5px solid rgba(148,163,184,0.55)', zIndex: 2, pointerEvents: 'none' }} />

        {/* Card */}
        <div style={{
          background: 'linear-gradient(180deg, #0C0E16 0%, #090A10 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 0,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.50), 0 32px 80px rgba(0,0,0,0.80), inset 0 1px 0 rgba(255,255,255,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top accent bar — visible slate */}
          <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.60) 30%, rgba(148,163,184,0.60) 70%, transparent 100%)', zIndex: 3 }} />

          {/* ── HEADER ── */}
          <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', borderBottom: '1px solid rgba(255,255,255,0.10)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', letterSpacing: '0.16em', color: '#CBD5E1', textTransform: 'uppercase', fontWeight: 600 }}>TERMINAL ACCESS</span>
            </div>
            <button onClick={onClose}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.08em', transition: 'color 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.80)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
              [ESC]
            </button>
          </div>

          {/* ── CARD BODY ── */}
          <div style={{ padding: '36px 32px', position: 'relative', zIndex: 4, animation: shaking ? 'gateShake 0.5s ease' : 'none' }}>

            {/* ─ SIGN IN ─ */}
            {mode === 'signin' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#CBD5E1', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px', display: 'block', fontWeight: 600 }}>
                  Operator Access ID
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Enter 15-character access ID"
                    value={siId}
                    onChange={e => setSiId(e.target.value)}
                    onFocus={() => setFocusField('si-id')}
                    onBlur={() => setFocusField('')}
                    onKeyDown={e => e.key === 'Enter' && signIn()}
                    className="w-full focus:outline-none gate-input"
                    style={{
                      background: '#0F111A',
                      border: `1px solid ${focusField === 'si-id' ? 'rgba(148,163,184,0.65)' : 'rgba(255,255,255,0.14)'}`,
                      borderLeft: `3px solid ${focusField === 'si-id' ? 'rgba(148,163,184,0.90)' : 'rgba(255,255,255,0.10)'}`,
                      borderRadius: 0,
                      height: '50px',
                      padding: '0 16px',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '16px',
                      color: '#F8FAFC',
                      caretColor: '#94A3B8',
                      boxShadow: focusField === 'si-id' ? 'inset 0 0 0 1px rgba(148,163,184,0.08), 0 0 20px rgba(148,163,184,0.06)' : 'none',
                      transition: 'border-color 150ms, background 150ms, box-shadow 150ms',
                    }}
                    autoComplete="username"
                    spellCheck={false}
                  />
                </div>

                <button
                  onClick={signIn}
                  disabled={loading || !siId}
                  style={{
                    marginTop: '18px', width: '100%', height: '48px', borderRadius: 0,
                    background: loading || !siId ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${loading || !siId ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.22)'}`,
                    color: loading || !siId ? 'rgba(255,255,255,0.35)' : '#F1F5F9',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', letterSpacing: '0.14em', fontWeight: 600, textTransform: 'uppercase',
                    cursor: loading || !siId ? 'not-allowed' : 'pointer',
                    transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => { if (!loading && siId) { e.currentTarget.style.background = 'rgba(148,163,184,0.15)'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.65)'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.boxShadow = '0 0 24px rgba(148,163,184,0.10)'; } }}
                  onMouseLeave={e => { if (!loading && siId) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = '#F1F5F9'; e.currentTarget.style.boxShadow = 'none'; } }}>
                  {loading ? 'AUTHENTICATING…' : 'AUTHENTICATE'}
                </button>

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <button
                    onClick={() => { setMode('signup'); setError(''); }}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'rgba(148,163,184,0.80)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 150ms', letterSpacing: '0.04em' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#E2E8F0')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.80)')}>
                    Issue new credential
                  </button>
                </div>
              </div>
            )}

            {/* ─ SIGN UP ─ */}
            {mode === 'signup' && (
              <>
                {granted ? (
                  /* ── POST-GRANT ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#CBD5E1', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                      Generated Access ID
                    </label>
                    <div style={{ background: '#0F111A', border: '1px solid rgba(148,163,184,0.35)', height: '50px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '17px', color: '#E2E8F0', letterSpacing: '0.04em' }}>{novrixId}</span>
                      <button type="button" onClick={copyId}
                        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#4ADE80' : 'rgba(255,255,255,0.45)', padding: '4px', transition: 'color 150ms' }}
                        onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
                        onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                        title={copied ? 'Copied' : 'Copy ID'}>
                        {copied
                          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
                      </button>
                    </div>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#FCA5A5', margin: 0, lineHeight: 1.6, letterSpacing: '0.02em' }}>
                      This credential cannot be recovered. Save it before continuing.
                    </p>
                    <button
                      onClick={() => onSuccess(authedUser || { id: '', novrix_id: novrixId })}
                      style={{ width: '100%', height: '48px', borderRadius: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.22)', color: '#F1F5F9', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', letterSpacing: '0.14em', fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,163,184,0.15)'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.65)'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.boxShadow = '0 0 24px rgba(148,163,184,0.10)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = '#F1F5F9'; e.currentTarget.style.boxShadow = 'none'; }}>
                      INITIALIZE ACCESS
                    </button>
                    <div style={{ textAlign: 'center' }}>
                      <button onClick={() => { setMode('signin'); setError(''); }}
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'rgba(148,163,184,0.80)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 150ms', letterSpacing: '0.04em' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#E2E8F0')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.80)')}>
                        Already have credentials? Sign in
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── PRE-GRANT ── */
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#CBD5E1', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px', display: 'block', fontWeight: 600 }}>
                      Generated Access ID
                    </label>
                    <div style={{ background: '#0F111A', border: `1px solid ${idLoading ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.35)'}`, height: '50px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      {idLoading ? (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#94A3B8' }}>Generating…</span>
                      ) : (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '17px', color: '#E2E8F0', letterSpacing: '0.04em' }}>{novrixId}</span>
                      )}
                      {!idLoading && novrixId && (
                        <button type="button" onClick={copyId}
                          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#4ADE80' : 'rgba(255,255,255,0.45)', padding: '4px', transition: 'color 150ms' }}
                          onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
                          onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                          title={copied ? 'Copied' : 'Copy ID'}>
                          {copied
                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
                        </button>
                      )}
                    </div>

                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#FCA5A5', marginTop: '14px', marginBottom: '0', lineHeight: 1.6, letterSpacing: '0.02em' }}>
                      This credential cannot be recovered. Save it before continuing.
                    </p>

                    <button
                      onClick={signUp}
                      disabled={loading || idLoading || !novrixId || grantedFlash}
                      style={{
                        marginTop: '18px', width: '100%', height: '48px', borderRadius: 0,
                        background: grantedFlash ? 'rgba(74,222,128,0.08)' : loading || idLoading || !novrixId ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                        border: grantedFlash ? '1px solid rgba(74,222,128,0.35)' : `1px solid ${loading || idLoading || !novrixId ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.22)'}`,
                        color: grantedFlash ? '#4ADE80' : loading || idLoading || !novrixId ? 'rgba(255,255,255,0.35)' : '#F1F5F9',
                        fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', letterSpacing: '0.14em', fontWeight: 600, textTransform: 'uppercase',
                        cursor: loading || idLoading || !novrixId || grantedFlash ? 'not-allowed' : 'pointer',
                        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={e => { if (!loading && !idLoading && novrixId && !grantedFlash) { e.currentTarget.style.background = 'rgba(148,163,184,0.15)'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.65)'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.boxShadow = '0 0 24px rgba(148,163,184,0.10)'; } }}
                      onMouseLeave={e => { if (!loading && !idLoading && novrixId && !grantedFlash) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = '#F1F5F9'; e.currentTarget.style.boxShadow = 'none'; } }}>
                      {grantedFlash ? 'ACCESS GRANTED' : loading ? 'INITIALIZING…' : 'INITIALIZE ACCESS'}
                    </button>

                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                      <button
                        onClick={() => { setMode('signin'); setError(''); }}
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'rgba(148,163,184,0.80)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 150ms', letterSpacing: '0.04em' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#E2E8F0')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.80)')}>
                        Already have credentials? Sign in
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Error */}
            {error && (
              <div style={{ marginTop: '18px', padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)', borderLeft: '3px solid #EF4444', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#FECACA', margin: 0, lineHeight: 1.6, letterSpacing: '0.02em' }}>{error}</p>
                {mode === 'signup' && !novrixId && (
                  <button onClick={fetchNewId} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.12em', color: '#FCA5A5', background: 'none', border: '1px solid rgba(252,165,165,0.35)', cursor: 'pointer', padding: '5px 10px', flexShrink: 0, textTransform: 'uppercase', transition: 'all 150ms' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(252,165,165,0.12)'; e.currentTarget.style.borderColor = 'rgba(252,165,165,0.50)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(252,165,165,0.35)'; }}>
                    RETRY
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 4 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(148,163,184,0.70)' }}>
              SECURE
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(148,163,184,0.55)' }}>
              {targetModule.toUpperCase()}
            </span>
          </div>

        </div>{/* /card */}

        <style jsx global>{`
          @keyframes gateShake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-6px)} 30%{transform:translateX(6px)} 45%{transform:translateX(-4px)} 60%{transform:translateX(4px)} 75%{transform:translateX(-2px)} 90%{transform:translateX(2px)} }
          @keyframes gateFlash { 0%,100%{opacity:1} 50%{opacity:0.8} }
          .gate-input::placeholder { color: rgba(255,255,255,0.45); }
          .gate-input:focus::placeholder { color: rgba(255,255,255,0.20); }
          .gate-input:focus-visible { outline: none !important; }
        `}</style>
      </motion.div>
    </motion.div>
  );
}


/* ═══════════════════════════════════════════════════════════
   COMPACT MODULE VISUALIZATIONS
   ═══════════════════════════════════════════════════════════ */

function SentimentChart({ fgi }: { fgi: number | null }) {
  const fv = fgi ?? 55;
  const [pts] = useState<{ v: number }[]>(() => {
    const arr: { v: number }[] = [];
    let v = Math.max(15, Math.min(80, fv - 18));
    for (let i = 0; i < 30; i++) {
      v = Math.max(8, Math.min(92, v + (Math.random() - 0.46) * 8 + (fv - v) * 0.09));
      arr.push({ v: Math.round(v) });
    }
    arr[arr.length - 1] = { v: fv };
    return arr;
  });
  const trend      = pts[pts.length - 1].v > pts[0].v ? 'UP' : 'DOWN';
  const trendColor = trend === 'UP' ? '#00FF88' : '#C2344D';
  const fgiColor   = fv >= 60 ? '#00FF88' : fv <= 30 ? '#C2344D' : '#F59E0B';
  const zone       = fv >= 60 ? 'GREED' : fv <= 30 ? 'FEAR' : 'NEUTRAL';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 16px 12px' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={pts} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="fgiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C2344D" stopOpacity={0.30} />
                <stop offset="100%" stopColor="#C2344D" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="#C2344D" strokeWidth={1.5} fill="url(#fgiGrad)" dot={false} activeDot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, marginTop: '8px' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', letterSpacing: '0.24em', color: '#8A9BB0', marginBottom: '4px', textTransform: 'uppercase' }}>CURRENT</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 700, color: fgiColor, lineHeight: 1 }}>{fv}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.14em', color: fgiColor }}>{zone}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', letterSpacing: '0.24em', color: '#8A9BB0', marginBottom: '4px', textTransform: 'uppercase' }}>30D TREND</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700, color: trendColor }}>{trend === 'UP' ? '↑' : '↓'} {trend}</div>
        </div>
      </div>
    </div>
  );
}

const WHALE_POOL = [
  { chain: 'BTC', cc: '#F7931A', entity: 'Binance Cold Storage',     amount: '$48.2M',  dir: '↑', type: 'INFLOW',    dc: '#00FF88' },
  { chain: 'ETH', cc: '#8A94AB', entity: 'Coinbase Prime OTC',       amount: '$31.7M',  dir: '↔', type: 'TRANSFER',  dc: '#F59E0B' },
  { chain: 'SOL', cc: '#9945FF', entity: '[UNKNOWN]',                amount: '$12.4M',  dir: '↓', type: 'OUTFLOW',   dc: '#C2344D' },
  { chain: 'ETH', cc: '#8A94AB', entity: 'Kraken Hot Wallet',        amount: '$89.3M',  dir: '↑', type: 'INFLOW',    dc: '#00FF88' },
  { chain: 'BTC', cc: '#F7931A', entity: 'MicroStrategy Reserve',    amount: '$203.1M', dir: '↔', type: 'TRANSFER',  dc: '#F59E0B' },
  { chain: 'TRX', cc: '#EF0027', entity: 'Tron Foundation',          amount: '$55.8M',  dir: '↓', type: 'OUTFLOW',   dc: '#C2344D' },
  { chain: 'BTC', cc: '#F7931A', entity: 'Block.one Reserves',       amount: '$77.6M',  dir: '↑', type: 'INFLOW',    dc: '#00FF88' },
  { chain: 'ETH', cc: '#8A94AB', entity: '[UNKNOWN_C4F1]',           amount: '$14.2M',  dir: '↔', type: 'TRANSFER',  dc: '#F59E0B' },
  { chain: 'SOL', cc: '#9945FF', entity: 'Jump Crypto Vault',        amount: '$28.9M',  dir: '↑', type: 'INFLOW',    dc: '#00FF88' },
  { chain: 'ARB', cc: '#12AAFF', entity: 'Wintermute Trading',       amount: '$9.7M',   dir: '↓', type: 'OUTFLOW',   dc: '#C2344D' },
  { chain: 'BTC', cc: '#F7931A', entity: 'Cumberland OTC Desk',      amount: '$156.4M', dir: '↑', type: 'INFLOW',    dc: '#00FF88' },
  { chain: 'ETH', cc: '#8A94AB', entity: 'Grayscale Custody',        amount: '$71.8M',  dir: '↔', type: 'TRANSFER',  dc: '#F59E0B' },
];

function WhaleFeedLog() {
  const counterRef = useRef(4);
  const [rows, setRows] = useState(() =>
    [0, 1, 2, 3].map(i => ({ ...WHALE_POOL[i % WHALE_POOL.length], ago: (i + 1) * 3, uid: i }))
  );
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const iv1 = setInterval(() => {
      setRows(prev => {
        const next = prev.map(r => ({ ...r, ago: r.ago + 4 }));
        const rIdx = Math.floor(Math.random() * 4);
        next[rIdx] = { ...WHALE_POOL[Math.floor(Math.random() * WHALE_POOL.length)], ago: 0, uid: counterRef.current++ };
        return next;
      });
    }, 4200);
    const iv2 = setInterval(() => setBlink(b => !b), 600);
    return () => { clearInterval(iv1); clearInterval(iv2); };
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', letterSpacing: '0.26em', color: '#00C8EE', textTransform: 'uppercase' }}>TX FEED MIN $1M</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', letterSpacing: '0.18em', color: '#00C8EE' }}>LIVE FEED</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {rows.map((r, i) => (
          <div key={r.uid} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 76px 64px 28px', alignItems: 'center', gap: '8px', padding: '0 14px', height: '32px', background: i % 2 === 1 ? '#1C1C28' : '#161620', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 700, color: r.cc }}>{r.chain}</span>
            <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '13px', color: '#E4E4E7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.entity}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, color: '#FFFFFF', textAlign: 'right', letterSpacing: '0.01em' }}>{r.amount}</span>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '7.5px', letterSpacing: '0.08em', color: r.dc, padding: '1px 5px', border: `1px solid ${r.dc}50`, background: `${r.dc}20` }}>{r.type}</span>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: '#8A9BB0', textAlign: 'right' }}>{r.ago === 0 ? '<1m' : `${r.ago}m`}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '7px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(0,200,238,0.75)' }}>›{' '}<span style={{ opacity: blink ? 1 : 0, transition: 'opacity 0.1s ease' }}>▌</span></span>
      </div>
    </div>
  );
}

const DEFI_BASE = [
  { label: 'TOTAL TVL',       base: 89.2,  unit: 'B', delta: '+2.1%', up: true  },
  { label: 'DEX VOLUME',      base: 4.3,   unit: 'B', delta: '-0.8%', up: false },
  { label: 'STABLECOIN CAP',  base: 174.0, unit: 'B', delta: '+0.2%', up: true  },
  { label: 'PROTOCOL FEES',   base: 18.4,  unit: 'M', delta: '+5.3%', up: true  },
];

function DefiTiles() {
  const [vals, setVals] = useState(DEFI_BASE.map(d => d.base));

  useEffect(() => {
    const iv = setInterval(() => {
      setVals(prev => prev.map(v => +(v * (1 + (Math.random() - 0.499) * 0.0018)).toFixed(1)));
    }, 3600);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '100%', gap: '1px', background: 'rgba(255,255,255,0.08)' }}>
      {DEFI_BASE.map((m, i) => (
        <div key={i} style={{ background: '#1E1E2A', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.18em', color: '#8A9BB0', textTransform: 'uppercase' }}>{m.label}</span>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1, marginBottom: '7px', letterSpacing: '-0.01em' }}>
              ${vals[i].toFixed(1)}{m.unit}
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.10em', color: m.up ? '#4ADE80' : '#F87171', background: m.up ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', padding: '2px 7px', border: `1px solid ${m.up ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}` }}>
              {m.delta} 24H
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

const AUTH_BOOT_PENDING_KEY = 'novrix-auth-boot-pending';

function TerminalInner() {
  const market                         = useMarketData();
  const { user, loading: authLoading } = useAuth();
  const searchParams                   = useSearchParams();
  const redirectParam                  = searchParams.get('redirect');
  const redirectTarget                 = getSafeRedirectTarget(redirectParam);
  const hasModuleRedirect              = redirectTarget !== '/terminal';
  const mountRef                       = useRef(0);
  const [time, setTime]                = useState('');
  const [uptime, setUptime]            = useState('00:00:00');
  const [gateOpen, setGateOpen]        = useState(() => hasModuleRedirect);
  const [pendingHref, setPendingHref]  = useState(() => redirectTarget);

  useEffect(() => {
    mountRef.current = Date.now();
    const tick = () => {
      setTime(new Date().toISOString().replace('T', ' ').slice(0, 19));
      const s   = Math.floor((Date.now() - mountRef.current) / 1000);
      const h   = Math.floor(s / 3600);
      const m   = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setUptime(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`);
    };
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      if (hasModuleRedirect) {
        setPendingHref(redirectTarget);
      }

      if (authLoading) {
        if (hasModuleRedirect) setGateOpen(true);
        return;
      }

      if (user) {
        if (hasModuleRedirect) window.location.replace(redirectTarget);
        return;
      }

      if (hasModuleRedirect) setGateOpen(true);
    });
  }, [authLoading, hasModuleRedirect, redirectTarget, user]);

  const handleEnterModule = useCallback((href: string) => {
    if (user) { window.location.assign(href); return; }
    setPendingHref(href); setGateOpen(true);
  }, [user]);

  const closeGateToTerminal = useCallback(() => {
    setPendingHref('/terminal');
    setGateOpen(false);
    window.history.replaceState(null, '', '/terminal');
  }, []);

  const handleAuthSuccess = useCallback(() => {
    try {
      sessionStorage.setItem(AUTH_BOOT_PENDING_KEY, '1');
    } catch {
      // Storage can be unavailable in hardened browser modes; auth navigation must still proceed.
    }
    setGateOpen(false);
    window.location.assign(pendingHref);
  }, [pendingHref]);

  const fgiPct   = market?.fgi ?? 50;
  const fgiColor = fgiPct >= 60 ? '#00FF88' : fgiPct <= 30 ? '#C2344D' : '#F59E0B';
  const opId     = user?.novrix_id ? `${user.novrix_id.slice(0, 6)}...` : null;


  return (
    <DesktopGate>
      <div className="min-h-screen flex flex-col" style={{ background: '#030407' }}>
        <Navbar />

        <style jsx global>{`
          @keyframes scanSE { 0%{top:-2px;opacity:0} 4%{opacity:1} 96%{opacity:1} 100%{top:calc(100% + 2px);opacity:0} }
          @keyframes scanWT { 0%{top:-2px;opacity:0} 4%{opacity:1} 96%{opacity:1} 100%{top:calc(100% + 2px);opacity:0} }
          @keyframes scanML { 0%{top:-2px;opacity:0} 4%{opacity:1} 96%{opacity:1} 100%{top:calc(100% + 2px);opacity:0} }
          @keyframes headerScan { 0%{left:-180px} 100%{left:100%} }
          @keyframes headerPulse { 0%{left:-100px} 50%{left:50%} 100%{left:calc(100% + 100px)} }
          .module-band { transition: background 0.1s ease, box-shadow 0.1s ease; position: relative; overflow: hidden; cursor: pointer; }
          .module-band * { pointer-events: none; }
          .module-band .enter-btn { pointer-events: auto; }
          .module-band::before { content: ''; position: absolute; left: 0; right: 0; height: 1px; pointer-events: none; z-index: 10; }
          .module-band-se::before { background: linear-gradient(90deg, transparent 0%, rgba(194,52,77,0.35) 50%, transparent 100%); animation: scanSE 7s ease-in-out infinite; }
          .module-band-wt::before { background: linear-gradient(90deg, transparent 0%, rgba(0,200,238,0.35) 50%, transparent 100%); animation: scanWT 7s ease-in-out infinite; animation-delay: 2.33s; }
          .module-band-ml::before { background: linear-gradient(90deg, transparent 0%, rgba(232,150,12,0.35) 50%, transparent 100%); animation: scanML 7s ease-in-out infinite; animation-delay: 4.66s; }
          .module-band:hover { background: #1E1E2A !important; }
          .module-band-se:hover { box-shadow: inset 0 0 40px rgba(194,52,77,0.06) !important; }
          .module-band-wt:hover { box-shadow: inset 0 0 40px rgba(0,200,238,0.06) !important; }
          .module-band-ml:hover { box-shadow: inset 0 0 40px rgba(232,150,12,0.06) !important; }
          .enter-btn { transition: background 0.1s ease, border-color 0.1s ease, box-shadow 0.1s ease !important; }
          @media (max-width: 1199px) {
            .terminal-module-band { grid-template-columns: minmax(0, 1fr) minmax(220px, 0.78fr) !important; }
            .terminal-module-left { grid-column: 1; grid-row: 1; border-right: 1px solid rgba(255,255,255,0.10); }
            .terminal-module-right { grid-column: 2; grid-row: 1; }
            .terminal-module-center { grid-column: 1 / -1; grid-row: 2; min-height: 220px; border-top: 1px solid rgba(255,255,255,0.10); border-right: 0 !important; }
          }
          @media (min-width: 1800px) {
            .terminal-module-band { min-height: 300px !important; }
          }
        `}</style>

        {/* ═══════════════════════════════════════════════════════════
           OPERATIVE HORIZON GRID — Perspective convergence + range arcs
           ═══════════════════════════════════════════════════════════ */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          {/* Layer 1: Perspective floor grid */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', width: '100%', height: '100%' }}>
            {/* Horizontal converging lines — exponential clustering toward horizon */}
            {Array.from({ length: 32 }, (_, i) => {
              const t = (i + 1) / 33;
              const y = 100 - 100 * Math.pow(t, 0.38);
              return <line key={`h-${i}`} x1="0" y1={y} x2="100" y2={y} stroke="rgba(100,116,139,0.032)" strokeWidth="0.06" />;
            })}
            {/* Vertical fan lines radiating from vanishing point above viewport */}
            {Array.from({ length: 27 }, (_, i) => {
              const xBottom = ((i + 1) / 28) * 100;
              return <line key={`v-${i}`} x1="50" y1="-35" x2={xBottom} y2="100" stroke="rgba(100,116,139,0.022)" strokeWidth="0.06" />;
            })}
            {/* Range arcs — concentric ellipses from vanishing point */}
            {[12, 22, 35, 52, 72].map((r, i) => (
              <ellipse key={`arc-${i}`} cx="50" cy="-35" rx={r} ry={r * 0.55} fill="none" stroke="rgba(100,116,139,0.018)" strokeWidth="0.08" />
            ))}
            {/* Horizon glow line */}
            <line x1="0" y1="22" x2="100" y2="22" stroke="rgba(148,163,184,0.045)" strokeWidth="0.12" />
          </svg>
          {/* Layer 2: Anisotropic diagonal weave */}
          <div className="absolute inset-0" style={{
            backgroundImage: `
              repeating-linear-gradient(75deg, transparent, transparent 119px, rgba(100,116,139,0.015) 120px),
              repeating-linear-gradient(-75deg, transparent, transparent 119px, rgba(100,116,139,0.015) 120px)
            `,
            backgroundSize: '140px 140px',
          }} />
          {/* Layer 3: Fine micro-dot matrix */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.018) 1px, transparent 0)',
            backgroundSize: '64px 64px',
          }} />
        </div>

        <main className="flex-1 relative z-10">

          {/* ═══════════════════════════════════════════════════════════
             COMMAND SURFACE HEADER
             ═══════════════════════════════════════════════════════════ */}

          {/* Header outer shell with corner brackets */}
          <div style={{ position: 'relative' }}>
            {/* Corner brackets — top */}
            <div aria-hidden="true" style={{ position: 'absolute', top: '10px', left: '10px', width: '18px', height: '18px', borderTop: '1.5px solid rgba(148,163,184,0.30)', borderLeft: '1.5px solid rgba(148,163,184,0.30)', zIndex: 10, pointerEvents: 'none' }} />
            <div aria-hidden="true" style={{ position: 'absolute', top: '10px', right: '10px', width: '18px', height: '18px', borderTop: '1.5px solid rgba(148,163,184,0.30)', borderRight: '1.5px solid rgba(148,163,184,0.30)', zIndex: 10, pointerEvents: 'none' }} />
            <div aria-hidden="true" style={{ position: 'absolute', bottom: '10px', left: '10px', width: '18px', height: '18px', borderBottom: '1.5px solid rgba(148,163,184,0.20)', borderLeft: '1.5px solid rgba(148,163,184,0.20)', zIndex: 10, pointerEvents: 'none' }} />
            <div aria-hidden="true" style={{ position: 'absolute', bottom: '10px', right: '10px', width: '18px', height: '18px', borderBottom: '1.5px solid rgba(148,163,184,0.20)', borderRight: '1.5px solid rgba(148,163,184,0.20)', zIndex: 10, pointerEvents: 'none' }} />

            {/* Top Frame Bar */}
            <div style={{ background: '#020408', borderBottom: '1px solid rgba(148,163,184,0.08)', position: 'relative' }}>
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.35) 15%, rgba(148,163,184,0.35) 85%, transparent 100%)' }} />
              <div className="max-w-[1700px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '32px', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ADE80' }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', letterSpacing: '0.20em', color: '#4ADE80', textTransform: 'uppercase' }}>Online</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', letterSpacing: '0.14em', color: '#334155', textTransform: 'uppercase' }}>All Systems Nominal</span>
                    <div style={{ width: '1px', height: '12px', background: 'rgba(148,163,184,0.15)' }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', letterSpacing: '0.12em', color: '#334155', textTransform: 'uppercase' }}>Build {SYS_VER}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Band 1 — Identity */}
            <div style={{ background: '#030508', borderBottom: '1px solid rgba(148,163,184,0.10)', position: 'relative' }}>
              <div className="max-w-[1700px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', gap: '20px' }}>
                  {/* Left: System identifier with left accent rail */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '3px', height: '40px', background: 'linear-gradient(180deg, rgba(148,163,184,0.45) 0%, rgba(148,163,184,0.08) 100%)', borderRadius: '1px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 700, letterSpacing: '0.28em', color: '#F8FAFC', textTransform: 'uppercase', lineHeight: 1 }}>TERMINAL</span>
                      <div style={{ width: '64px', height: '2px', background: 'rgba(148,163,184,0.35)' }} />
                    </div>
                    <div style={{ width: '1px', height: '36px', background: 'rgba(148,163,184,0.10)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.18em', color: '#475569', textTransform: 'uppercase' }}>On-Chain Analytics</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', letterSpacing: '0.12em', color: '#334155', textTransform: 'uppercase' }}>Authorized Access Only</span>
                    </div>
                  </div>

                  {/* Right: Time + Auth */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 600, color: '#E2E8F0', letterSpacing: '0.04em', lineHeight: 1 }}>{time}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.16em', color: '#64748B', textTransform: 'uppercase', lineHeight: 1 }}>UTC</span>
                    </div>
                    <div style={{ width: '1px', height: '32px', background: 'rgba(148,163,184,0.18)' }} />
                    {!authLoading && (
                      user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', color: '#4ADE80', textTransform: 'uppercase', lineHeight: 1 }}>Active</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.06em', color: '#64748B', lineHeight: 1 }}>{opId}</span>
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em', color: '#F87171', textTransform: 'uppercase', border: '1px solid rgba(248,113,113,0.40)', padding: '6px 14px' }}>
                          Guest
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Band 2 — Command Surface Status */}
            <div style={{ background: '#05070C', borderBottom: '1px solid rgba(148,163,184,0.08)', position: 'relative', overflow: 'hidden' }}>
              {/* Scanline sweep */}
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, width: '180px', background: 'linear-gradient(90deg, transparent, rgba(148,163,184,0.045), transparent)', animation: 'headerScan 10s linear infinite', pointerEvents: 'none' }} />

              <div className="max-w-[1700px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '40px', gap: '16px' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.22em', color: '#475569', textTransform: 'uppercase', flexShrink: 0 }}>Command Surface</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                    {['#4ADE80', '#00C8EE', '#4ADE80'].map((color, i) => (
                      <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: color }} />
                    ))}
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', color: '#334155', textTransform: 'uppercase', flexShrink: 0 }}>Build {SYS_VER}</span>
                </div>
              </div>
            </div>

            {/* Traveling pulse divider */}
            <div style={{ position: 'relative', height: '1px', background: 'rgba(148,163,184,0.06)' }}>
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: '100px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(148,163,184,0.40), transparent)', animation: 'headerPulse 5s ease-in-out infinite', pointerEvents: 'none' }} />
            </div>

            {/* Band 3 — Primary Telemetry */}
            <div style={{ background: '#06080E', borderBottom: '1px solid rgba(148,163,184,0.10)', position: 'relative' }}>
              <div className="max-w-[1700px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0' }}>
                  {[
                    { label: 'Bitcoin', val: market ? `$${market.btc.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '———', delta: market ? `${market.btcDelta >= 0 ? '+' : ''}${market.btcDelta.toFixed(2)}%` : null, accent: market ? (market.btcDelta >= 0 ? '#4ADE80' : '#F87171') : '#475569' },
                    { label: 'Ethereum', val: market ? `$${market.eth.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '———', delta: market ? `${market.ethDelta >= 0 ? '+' : ''}${market.ethDelta.toFixed(2)}%` : null, accent: market ? (market.ethDelta >= 0 ? '#4ADE80' : '#F87171') : '#475569' },
                    { label: 'Solana', val: market ? `$${market.sol.toFixed(2)}` : '———', delta: market ? `${market.solDelta >= 0 ? '+' : ''}${market.solDelta.toFixed(2)}%` : null, accent: market ? (market.solDelta >= 0 ? '#4ADE80' : '#F87171') : '#475569' },
                    { label: 'Fear & Greed', val: market ? `${fgiPct}` : '——', delta: market ? market.fgiLabel.toUpperCase() : null, accent: fgiColor },
                  ].map((cell, i) => (
                    <div key={cell.label} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', padding: '22px 24px', borderRight: i < 3 ? '1px solid rgba(148,163,184,0.08)' : 'none', position: 'relative', minHeight: '88px' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: cell.accent, opacity: 0.45 }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: cell.accent, opacity: 0.12 }} />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.24em', color: '#475569', textTransform: 'uppercase', lineHeight: 1 }}>{cell.label}</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '26px', fontWeight: 700, color: '#F8FAFC', lineHeight: 1, letterSpacing: '-0.01em' }}>{cell.val}</span>
                        {cell.delta && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: cell.accent, letterSpacing: '0.02em' }}>{cell.delta}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Band 4 — Secondary Telemetry */}
            <div style={{ background: '#070911', borderBottom: '2px solid rgba(148,163,184,0.12)', position: 'relative' }}>
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.25) 50%, transparent 100%)' }} />
              <div className="max-w-[1700px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
                <div style={{ display: 'flex', alignItems: 'center', height: '48px', gap: '0', overflowX: 'auto' }}>
                  {[
                    { label: 'Market Cap', val: market ? formatUSD(market.totalMcap) : '——' },
                    { label: 'BTC Dominance', val: market && market.totalMcap > 0 ? `${((market.btcMcap / market.totalMcap) * 100).toFixed(1)}%` : '——' },
                    { label: 'Uptime', val: uptime },
                    { label: 'Session', val: user ? (opId ?? '——') : 'Guest' },
                  ].map((item, i, arr) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: i < arr.length - 1 ? '20px' : '0', marginRight: i < arr.length - 1 ? '20px' : '0', borderRight: i < arr.length - 1 ? '1px solid rgba(148,163,184,0.08)' : 'none', flexShrink: 0, height: '100%' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.18em', color: '#475569', textTransform: 'uppercase' }}>{item.label}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.02em' }}>{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── MODULE BANDS ── */}
          <div className="max-w-[1700px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-20" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {MODULES.map((mod, idx) => {
                const bandClass = idx === 0 ? 'module-band module-band-se' : idx === 1 ? 'module-band module-band-wt' : 'module-band module-band-ml';
                const descriptions = [
                  'Composite suite of 14 on-chain indicators tracking market cycle phase, miner behavior, and holder psychology.',
                  'Real-time monitoring of $1M+ transactions across 10 networks. Entity-labeled. 15-minute data cadence.',
                  'Institutional DeFi analytics across 165+ metrics: TVL, protocol fees, DEX flow, stablecoin issuance, and yield.',
                ];
                const metaNumbers = idx === 0
                  ? [{ n: '14', l: 'INDICATORS' }, { n: '6', l: 'TIMEFRAMES' }]
                  : idx === 1
                  ? [{ n: '10', l: 'CHAINS' }, { n: '24', l: 'ENTITIES' }]
                  : [{ n: '8', l: 'DASHBOARDS' }, { n: '165+', l: 'METRICS' }];
                return (
                  <div key={mod.id}
                    className={`${bandClass} terminal-module-band`}
                    style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.9fr) minmax(300px, 1.35fr) minmax(210px, 0.8fr)', minHeight: '260px', background: '#161620', border: '1px solid rgba(255,255,255,0.10)', position: 'relative' }}
                    onClick={() => handleEnterModule(mod.href)}>

                    {/* 3px accent edge */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: mod.accent, opacity: 1, zIndex: 5, pointerEvents: 'none' }} />

                    {/* RESTRICTED watermark */}
                    <div style={{ position: 'absolute', bottom: '28px', right: '8px', transform: 'rotate(-90deg)', transformOrigin: 'right center', fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.32em', color: '#FAFAFA', opacity: 0.055, textTransform: 'uppercase', pointerEvents: 'none', userSelect: 'none', zIndex: 1 }}>RESTRICTED</div>

                    {/* LEFT ZONE */}
                    <div className="terminal-module-left" style={{ padding: '30px 26px 30px 30px', borderRight: '1px solid rgba(255,255,255,0.10)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '13px', position: 'relative', zIndex: 2, minWidth: 0 }}>
                      <div style={{ display: 'inline-flex', width: 'fit-content' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', color: mod.accent, background: `rgba(${mod.rgb},0.12)`, border: `1px solid rgba(${mod.rgb},0.30)`, padding: '3px 10px', borderRadius: '2px', fontWeight: 600 }}>{mod.code}</span>
                      </div>
                      <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '32px', lineHeight: 0.95, letterSpacing: '-0.02em', color: '#FFFFFF', margin: 0 }}>
                        {mod.name.charAt(0) + mod.name.slice(1).toLowerCase()}
                      </h2>
                      <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 400, fontSize: '14px', color: '#C4C4D4', lineHeight: 1.55, margin: 0, maxWidth: '264px' }}>
                        {descriptions[idx]}
                      </p>
                      <div style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', border: `1px solid rgba(${mod.rgb},0.34)`, background: `rgba(${mod.rgb},0.10)`, padding: '4px 9px' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.18em', color: mod.accent, textTransform: 'uppercase' }}>Status Active</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {mod.meta.map(m => (
                          <span key={m} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.10em', color: '#A1A1AA', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', padding: '3px 9px' }}>{m}</span>
                        ))}
                      </div>
                    </div>

                    {/* CENTER ZONE */}
                    <div className="terminal-module-center" style={{ borderRight: '1px solid rgba(255,255,255,0.10)', padding: '16px', display: 'flex', alignItems: 'stretch', position: 'relative', zIndex: 2, minWidth: 0 }}>
                      <div style={{ flex: 1, background: '#1A1A26', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '4px', overflow: 'hidden' }}>
                        {idx === 0 && <SentimentChart fgi={market?.fgi ?? null} />}
                        {idx === 1 && <WhaleFeedLog />}
                        {idx === 2 && <DefiTiles />}
                      </div>
                    </div>

                    {/* RIGHT ZONE */}
                    <div className="terminal-module-right" style={{ padding: '30px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 2, minWidth: 0 }}>
                      {/* Large metric number displays */}
                      <div style={{ display: 'flex', gap: '28px' }}>
                        {metaNumbers.map(mn => (
                          <div key={mn.l}>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '30px', fontWeight: 700, color: mod.accent, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: '5px' }}>{mn.n}</div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', letterSpacing: '0.22em', color: '#8A9BB0', textTransform: 'uppercase' }}>{mn.l}</div>
                          </div>
                        ))}
                      </div>
                      {/* Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {mod.tags.map(tag => (
                          <span key={tag} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.14em', color: mod.accent, background: `rgba(${mod.rgb},0.15)`, border: `1px solid rgba(${mod.rgb},0.30)`, padding: '3px 8px', textShadow: `0 0 8px rgba(${mod.rgb},0.25)` }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      {/* ENTER MODULE button */}
                      <button
                        className="enter-btn"
                        onClick={e => { e.stopPropagation(); handleEnterModule(mod.href); }}
                        style={{ width: '100%', height: '48px', background: `rgba(${mod.rgb},0.15)`, border: `1px solid rgba(${mod.rgb},0.60)`, borderRadius: 0, color: '#FFFFFF', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer' }}
                        onMouseEnter={e => { const t = e.currentTarget; t.style.background = `rgba(${mod.rgb},0.25)`; t.style.borderColor = `rgba(${mod.rgb},0.90)`; t.style.boxShadow = `0 0 20px rgba(${mod.rgb},0.20)`; }}
                        onMouseLeave={e => { const t = e.currentTarget; t.style.background = `rgba(${mod.rgb},0.15)`; t.style.borderColor = `rgba(${mod.rgb},0.60)`; t.style.boxShadow = 'none'; }}>
                        ENTER MODULE →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </main>

        <FooterHome />

        {gateOpen && (
          <GatePanel
            targetModule={pendingHref}
            onSuccess={handleAuthSuccess}
            onClose={closeGateToTerminal}
          />
        )}
      </div>
    </DesktopGate>
  );
}
export default function Terminal() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col" style={{ background: '#030407' }}>
        <div className="relative z-[50]" style={{ background: 'rgba(9, 9, 11, 0.94)', backdropFilter: 'blur(20px)' }}>
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
            <div className="flex items-center h-[64px] sm:h-[72px] md:h-[80px]">
              <span className="text-[#C2344D] font-mono text-sm tracking-[0.3em] uppercase">NOVRIX</span>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-[#C2344D]/40 border-t-[#C2344D] animate-spin" />
            <span className="text-[9px] font-mono tracking-[0.4em] text-[#52525B] uppercase">Initializing</span>
          </div>
        </div>
      </div>
    }>
      <TerminalInner />
    </Suspense>
  );
}
