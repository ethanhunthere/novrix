'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('Root error boundary caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        <div style={{ maxWidth: '480px', padding: '32px 20px' }}>
          <div
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              marginBottom: '16px',
            }}
          >
            Error
          </div>
          <h1
            style={{
              fontFamily: 'var(--ff-display)',
              fontSize: 'clamp(30px, 7vw, 40px)',
              fontWeight: 500,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: 'var(--text-heading)',
              margin: 0,
            }}
          >
            This page failed to load.
          </h1>
          <p
            style={{
              fontFamily: 'var(--ff-sans)',
              fontSize: '15px',
              lineHeight: 1.7,
              color: 'var(--text-secondary)',
              margin: '16px 0 28px',
            }}
          >
            The error came from this page, not from your connection. Try again, or return home and open a different surface.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button
              onClick={reset}
              style={{
                minHeight: '44px',
                padding: '0 18px',
                fontFamily: 'var(--ff-sans)',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--bg-base)',
                background: 'var(--text-heading)',
                border: '1px solid var(--text-heading)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 18px',
                fontFamily: 'var(--ff-sans)',
                fontSize: '14px',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              Return home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
