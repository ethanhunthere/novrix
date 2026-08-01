'use client';

import { useEffect } from 'react';

export default function TerminalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Terminal error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] text-white">
      <div className="text-center px-6">
        <h2 className="text-2xl font-bold mb-3">Terminal Unavailable</h2>
        <p className="text-neutral-400 mb-6">The command interface failed to load. Try reloading.</p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
        >
          Reload Terminal
        </button>
      </div>
    </div>
  );
}
