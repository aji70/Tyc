"use client";

import { useEffect } from "react";
import Link from "next/link";

interface RoomErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for (room) routes (board, game-play, etc.).
 * Shows the crash message and actions — no auto-reload, to avoid reload/crash loops on the 3D board.
 */
export default function RoomError({ error, reset }: RoomErrorProps) {
  useEffect(() => {
    if (error) {
      console.error("[Room error]", error?.message, error?.stack);
    }
  }, [error]);

  const message = error?.message ?? "Something went wrong";
  const digest = error?.digest ? ` (digest: ${error.digest})` : "";

  return (
    <main className="w-full min-h-screen bg-[#010F10] flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-5 text-slate-300 max-w-lg text-center">
        <p className="text-sm font-medium text-red-400/90 uppercase tracking-wider">
          Something went wrong
        </p>
        <div className="w-full rounded-lg bg-black/40 border border-red-500/30 p-4 text-left">
          <p className="text-sm text-slate-200 font-mono break-words whitespace-pre-wrap">
            {message}
            {digest && <span className="text-slate-500">{digest}</span>}
          </p>
        </div>
        <p className="text-xs text-slate-500">
          The 3D board has stopped. Try again or go home. Your wallet stays connected.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium transition-colors"
          >
            Reload page
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
