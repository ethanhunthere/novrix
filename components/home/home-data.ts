/* ═══════════════════════════════════════════════════════════
   HOME PAGE — SHARED DATA & UTILITIES
   Extracted from app/page.tsx to reduce main chunk size.
   ═══════════════════════════════════════════════════════════ */

/* deterministic pseudo-random value, avoids SSR/hydration mismatch */
export const pr = (seed: number) => ((Math.sin(seed * 9301 + 49297) * 233280) % 1 + 1) % 1;

export function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export const INTEL_TAPE = [
  'market is moving',
  'look closer',
  'keep it private',
  'follow the money',
  'read the room',
  'chain is talking',
  'notes worth keeping',
  'quiet research',
];

export const HERO_STATEMENT =
  'Keeping up with what actually matters in crypto is harder than we think. Sentiment, whale movements, DeFi data and research context all gathered in one place so you always know what is going on.';

export interface DeskItem {
  label: string;
  desk: string;
  title: string;
  accent: string;
  href: string;
  lede: string;
  notes: string[];
}

export const DESKS: DeskItem[] = [
  {
    label: 'SENTIMENT',
    desk: 'Market mood',
    title: 'See when the market is getting carried away.',
    accent: '#C2344D',
    href: '/sentiment',
    lede: 'See what holders are doing, where pressure is building, and whether price is moving with real support or just noise.',
    notes: [
      'Social noise stays out of the way so market behavior is easier to judge.',
      'Price sits beside holder activity, which gives each move more context.',
      'When the picture deserves more time, the full view is close.',
    ],
  },
  {
    label: 'TRACKING',
    desk: 'Wallet movement',
    title: 'Watch the big moves without living inside explorers.',
    accent: '#00C8EE',
    href: '/tracking',
    lede: 'Follow notable wallet movement, exchange flow, and address context from a view that stays clean under pressure.',
    notes: [
      'Flow direction stays readable without spending the day in explorers.',
      'Large transfers are separated from routine background movement.',
      'Address context stays nearby, so the trail is easier to follow.',
    ],
  },
  {
    label: 'METRILYTICS',
    desk: 'Protocol health',
    title: 'Read protocol strength without living in spreadsheets.',
    accent: '#E8960C',
    href: '/metrilytics',
    lede: 'Read protocol activity, liquidity, fees, yield, and usage without bouncing between tabs all day.',
    notes: [
      'Protocol strength is easier to judge when the clutter is trimmed back.',
      'Liquidity, fees, and usage sit beside the context that explains them.',
      'DeFi context stays readable even when the market gets busy.',
    ],
  },
];

export const BRIEFING_FLOW = [
  {
    title: 'Notice',
    text: 'Important market, wallet, and protocol movement comes into view first.',
  },
  {
    title: 'Filter',
    text: 'The clutter drops back so the important part is easier to see.',
  },
  {
    title: 'Read',
    text: 'Each signal sits beside the context that makes it matter.',
  },
  {
    title: 'Follow up',
    text: 'Open the terminal when a question needs a deeper look.',
  },
];

export const fadeUp = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
};
