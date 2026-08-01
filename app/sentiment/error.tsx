'use client';

export default function SentimentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#08090C', fontFamily: 'JetBrains Mono, monospace' }}
    >
      <div className="text-center max-w-md px-6">
        <div className="text-[9px] tracking-[0.3em] text-[#C2344D] mb-4 uppercase">Runtime Error</div>
        <div className="text-[14px] text-[#E4E4E7] mb-2 font-semibold">Sentiment module failed to load</div>
        <div className="text-[11px] text-[#71717A] mb-8 leading-relaxed">
          {error.message || 'An unexpected error occurred while rendering the sentiment intelligence module.'}
        </div>
        <button
          onClick={reset}
          className="px-6 py-2.5 border border-[#C2344D]/30 text-[#C2344D] text-[10px] tracking-[0.18em] uppercase hover:bg-[#C2344D]/08 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
