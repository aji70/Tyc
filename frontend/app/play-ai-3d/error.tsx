"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

/**
 * Error boundary for /play-ai-3d. Catches crashes (e.g. from Starknet/Dojo hooks)
 * and shows a friendly message instead of the global "Something went wrong!".
 */
export default function PlayAI3DError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[play-ai-3d] Error:", error?.message, error?.stack);
  }, [error]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0E282A] via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-8 px-6 text-center">
      <AlertCircle className="w-16 h-16 text-cyan-400/80" />
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 font-orbitron">
          Something went wrong
        </h1>
        <p className="text-slate-400 text-sm max-w-md">
          We couldn’t load the AI game page. This can happen if the network is
          slow or your wallet isn’t connected. Try again or go back home.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-medium rounded-xl border border-cyan-500/50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-900 font-bold rounded-xl border-2 border-cyan-400/50 transition-all"
        >
          <Home className="w-4 h-4" />
          Go to Home
        </Link>
      </div>
    </div>
  );
}
