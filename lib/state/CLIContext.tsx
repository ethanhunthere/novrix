'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface CLIContextType {
  isOpen: boolean;
  open:   () => void;
  close:  () => void;
  toggle: () => void;
}

const CLIContext = createContext<CLIContextType>({
  isOpen: false,
  open:   () => {},
  close:  () => {},
  toggle: () => {},
});

export function CLIProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open   = useCallback(() => setIsOpen(true),  []);
  const close  = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(p => !p), []);
  // Memoized context value — prevents re-rendering all consumers when the
  // provider's parent re-renders with an unchanged state.
  const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);
  return (
    <CLIContext.Provider value={value}>
      {children}
    </CLIContext.Provider>
  );
}

export const useCLI = () => useContext(CLIContext);
