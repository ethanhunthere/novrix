'use client';

import type React from 'react';

/**
 * AuthGuard pass-through.
 * Terminal access restrictions have been removed to provide direct,
 * unrestricted platform access.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
