'use client';

import { useEffect } from 'react';
import {
  prefetchPeerTerminalModules,
  type TerminalModuleKey,
} from '@/lib/terminalModulePrefetch';

export function useTerminalModulePrefetch(currentModule: TerminalModuleKey): void {
  useEffect(() => {
    prefetchPeerTerminalModules(currentModule);
  }, [currentModule]);
}
