'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  id: string;
  novrix_id: string;
}

export interface AuthState {
  user:    AuthUser | null;
  loading: boolean;
  error:   string | null;
}

/**
 * Fetches current session from /api/auth/me.
 * Returns { user, loading, error }.
 *
 * - loading: true during initial check (show skeleton, not redirect)
 * - user: null + loading: false → unauthenticated
 * - user: AuthUser → authenticated
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();

    async function fetchMe(retry = true): Promise<void> {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include', signal: controller.signal });
        if (controller.signal.aborted) return;
        if (res.ok) {
          const data = await res.json() as { success: boolean; user: AuthUser };
          setState({ user: data.user, loading: false, error: null });
        } else {
          setState({ user: null, loading: false, error: null });
        }
      } catch {
        if (controller.signal.aborted) return;
        if (retry) {
          await new Promise((r) => setTimeout(r, 800));
          return fetchMe(false);
        }
        setState({ user: null, loading: false, error: null });
      }
    }

    fetchMe();
    return () => { controller.abort(); };
  }, []);

  return state;
}

/**
 * Logs out by calling POST /api/auth/logout, then reloads.
 */
export function useLogout(): () => Promise<void> {
  return useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      window.location.href = '/';
    }
  }, []);
}
