'use client';

import type React from 'react';
import { useEffect } from 'react';
import { prefetch as bootPrefetch } from '@/lib/bootCache';

export interface BootSequenceProps {
  children: React.ReactNode;
  prefetchUrls?: string[];
  enterLabel?: string;
  dataReady?: boolean;
}

/**
 * BootSequence pass-through.
 * All artificial delays, full-screen boot sequences, and entering screens
 * have been removed to make navigation and entering into terminal modules instant.
 */
export default function BootSequence({ children, prefetchUrls }: BootSequenceProps) {
  useEffect(() => {
    if (prefetchUrls && prefetchUrls.length > 0) {
      prefetchUrls.forEach(bootPrefetch);
    }
  }, [prefetchUrls]);

  return <>{children}</>;
}
