'use client';
import { useEffect } from 'react';

export default function GlobalError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error('RAW$ unhandled error:', error); }, [error]);

  return (
    <div className="min-h-screen bg-[#0D0B0B] flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-[#1B1717] border border-[#810100] rounded-sm p-6 space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#810100]">
          Something went wrong
        </p>
        <p className="font-mono text-xs text-[#7A6A6A] leading-relaxed">
          {error.message || 'An unexpected error occurred. Your funds are unaffected.'}
        </p>
        <button
          onClick={reset}
          className="w-full py-2.5 font-mono text-xs font-bold bg-[#810100] text-[#EDEBDD] rounded-sm"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
