'use client';

import { smoothPath, pr } from './home-data';

export default function OscilloscopeWave({ color, H = 100, className = '' }: { color: string; H?: number; className?: string }) {
  const W = 2400;
  const pts: [number, number][] = Array.from({ length: 320 }, (_, i) => {
    const t = i / 319;
    const y =
      H * 0.5
      + Math.sin(t * Math.PI * 18) * H * 0.22
      + Math.sin(t * Math.PI * 7.3) * H * 0.13
      + Math.sin(t * Math.PI * 31) * H * 0.05
      + Math.sin(t * Math.PI * 2.1) * H * 0.18
      + (pr(i * 3 + 1) - 0.5) * H * 0.03;
    return [(t * W), Math.max(3, Math.min(H - 3, y))];
  });
  const path = smoothPath(pts);
  return (
    <div className={`relative overflow-hidden ${className}`.trim()} style={{ height: `${H}px`, width: '200%', animation: 'oscScroll 22s linear infinite' }}>
      <svg
        viewBox={`0 0 ${W * 2} ${H}`}
        style={{ width: '100%', height: `${H}px` }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="osc-g" x1="0" y1="0" x2={W * 2} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={color} stopOpacity="0.05" />
            <stop offset="8%"   stopColor={color} stopOpacity="0.7" />
            <stop offset="48%"  stopColor={color} stopOpacity="0.7" />
            <stop offset="52%"  stopColor={color} stopOpacity="0.7" />
            <stop offset="92%"  stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="osc-area" x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={color} stopOpacity="0.08" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="url(#osc-g)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p[0] + W).toFixed(1)} ${p[1].toFixed(1)}`).join(' ')}
          fill="none" stroke="url(#osc-g)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
