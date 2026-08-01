'use client';

/**
 * Metrilytics route shell.
 *
 * The actual page (≈1.4k LOC) statically imports recharts. Loading it via
 * next/dynamic with ssr:false splits recharts (~280 KB compressed) into a
 * separate chunk that loads after first paint, dramatically reducing the
 * initial JS payload for visitors landing on /metrilytics. The dedicated
 * loading.tsx is rendered by Next.js while the chunk is in flight.
 */
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import BootSequence from '@/components/layout/BootSequence';
import DesktopGate from '@/components/layout/DesktopGate';
import { METRILYTICS_PREFETCH_URLS } from '@/lib/terminalModulePrefetch';
import RouteLoading from './loading';

type MetrilyticsBodyProps = {
  onPrimaryDataReady: () => void;
};

const MetrilyticsBody = dynamic<MetrilyticsBodyProps>(() => import('@/components/metrilytics/MetrilyticsBody'), {
  ssr: false,
  loading: () => <RouteLoading />,
});

export default function MetrilyticsPage() {
  const [primaryDataReady, setPrimaryDataReady] = useState(false);
  const [viewportGateReady, setViewportGateReady] = useState(false);
  const handlePrimaryDataReady = useCallback(() => setPrimaryDataReady(true), []);
  const handleViewportCheck = useCallback((isMobile: boolean) => setViewportGateReady(isMobile), []);

  return (
    <BootSequence key="metrilytics" prefetchUrls={METRILYTICS_PREFETCH_URLS} enterLabel="METRILYTICS" dataReady={primaryDataReady || viewportGateReady}>
      <DesktopGate onViewportCheck={handleViewportCheck}>
        <MetrilyticsBody onPrimaryDataReady={handlePrimaryDataReady} />
      </DesktopGate>
    </BootSequence>
  );
}
