'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';

const INACTIVITY_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const LAST_ACTIVITY_KEY = 'novrix-last-activity';

/**
 * Read the inactivity timestamp from localStorage with a sessionStorage
 * fallback for users that signed in before the storage swap. Tabs share
 * localStorage so a session that stays “active” in any tab keeps the
 * verifying overlay hidden everywhere — the sessionStorage version
 * caused a verifying flash on every new tab.
 */
function readLastActivity(): number | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(LAST_ACTIVITY_KEY)
         ?? window.sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * AuthGuard — wraps any terminal page component.
 *
 * While auth check is in flight: renders a dark loading screen ONLY if the
 * user has been away for >2 hours (inactivity threshold). Fresh visits and
 * normal inter-page navigation during an active session pass through silently.
 *
 * If unauthenticated: redirects to /terminal?redirect=<current-path>
 * unless the current path already starts with `/terminal` (which would
 * cause an infinite redirect loop).
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname          = usePathname();
  const router            = useRouter();

  const [showVerifying, setShowVerifying] = useState(false);

  useEffect(() => {
    const lastActivity = readLastActivity();
    if (lastActivity && Date.now() - lastActivity > INACTIVITY_THRESHOLD_MS) {
      queueMicrotask(() => setShowVerifying(true));
    }
  }, []);

  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  }, [user]);

  useEffect(() => {
    if (loading || user) return;
    // Loop guard — the public landing for /terminal also lives at /terminal
    // and is itself wrapped in AuthGuard. Without this check, an unauth
    // visit to /terminal/anything would redirect to /terminal?redirect=...
    // which would bounce forever.
    if (pathname?.startsWith('/terminal')) return;
    const dest = encodeURIComponent(pathname ?? '/terminal');
    const terminalGate = `/terminal?redirect=${dest}`;
    void import('@/components/terminal/TerminalBody');
    router.prefetch(terminalGate);
    window.location.replace(terminalGate);
  }, [user, loading, pathname, router]);

  if (loading && showVerifying) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: '#08090C', zIndex: 9999 }}
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="h-px w-8 bg-[#C2344D]/45" />
            <span
              className="text-[8px] font-mono uppercase tracking-[0.34em] text-[#71717A]"
            >
              Verifying session
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-px h-5 bg-[#C2344D]/20"
                style={{
                  animation: `pipelineFlow 1.4s ease-in-out infinite`,
                  animationDelay: `${i * 0.22}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Silent transparent loading (fresh visit or active session within 2h)
  if (loading) return null;

  if (!user) return null;

  return <>{children}</>;
}
