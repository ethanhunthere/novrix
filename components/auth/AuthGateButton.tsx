'use client';

import { openAuthGate } from '@/lib/utils/auth';

export function AuthGateButton({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <button onClick={openAuthGate} className={className} style={style}>
      {children}
    </button>
  );
}
