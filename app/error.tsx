'use client';

import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log to console in development; in production this would go to Sentry.
    console.error('Root error boundary caught:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex items-center justify-center bg-[#09090B] text-white">
        <div className="text-center px-6">
          <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
          <p className="text-neutral-400 mb-8 max-w-md mx-auto">
            An unexpected error occurred. Try refreshing the page, or contact support if the problem persists.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Try again
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 text-left text-xs text-red-400 bg-red-950/30 p-4 rounded-lg overflow-auto max-w-2xl mx-auto">
              {error.message}\n{error.stack}
            </pre>
          )}
        </div>
      </body>
    </html>
  );
}
