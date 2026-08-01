'use client';

/**
 * Tracking route shell.
 * 
 * The actual page (≈2k LOC) is dynamically imported. Loading it via
 * next/dynamic with ssr:false splits it into a separate chunk that loads 
 * after first paint, dramatically reducing the initial JS payload for visitors.
 */
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import BootSequence from '@/components/layout/BootSequence';
import DesktopGate from '@/components/layout/DesktopGate';
import AuthGuard from '@/components/layout/AuthGuard';
import { TRACKING_PREFETCH_URLS } from '@/lib/terminalModulePrefetch';
import { useTerminalModulePrefetch } from '@/lib/hooks/useTerminalModulePrefetch';
import RouteLoading from './loading';

type TrackingBodyProps = {
  onPrimaryDataReady: () => void;
};

const TrackingBody = dynamic<TrackingBodyProps>(() => import('@/components/tracking/TrackingBody'), {
  ssr: false,
  loading: () => <RouteLoading />,
});

export default function Tracking() {
  useTerminalModulePrefetch('tracking');
  const [primaryDataReady, setPrimaryDataReady] = useState(false);
  const [viewportGateReady, setViewportGateReady] = useState(false);
  const handlePrimaryDataReady = useCallback(() => setPrimaryDataReady(true), []);
  const handleViewportCheck = useCallback((isMobile: boolean) => setViewportGateReady(isMobile), []);

  return (
    <BootSequence key="tracking" prefetchUrls={TRACKING_PREFETCH_URLS} enterLabel="TRACKING" dataReady={primaryDataReady || viewportGateReady}>
      <DesktopGate onViewportCheck={handleViewportCheck}>
        <AuthGuard>
          <TrackingBody onPrimaryDataReady={handlePrimaryDataReady} />
        </AuthGuard>
      </DesktopGate>
    </BootSequence>
  );
}
