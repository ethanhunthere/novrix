'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface AuthGateContextType {
  isOpen: boolean;
  open:   () => void;
  close:  () => void;
}

const AuthGateContext = createContext<AuthGateContextType>({
  isOpen: false,
  open:   () => {},
  close:  () => {},
});

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open  = useCallback(() => setIsOpen(true),  []);
  const close = useCallback(() => setIsOpen(false), []);
  // Memoized context value — prevents re-rendering all consumers when the
  // provider's parent re-renders with an unchanged state.
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);
  return (
    <AuthGateContext.Provider value={value}>
      {children}
    </AuthGateContext.Provider>
  );
}

export const useAuthGate = () => useContext(AuthGateContext);
