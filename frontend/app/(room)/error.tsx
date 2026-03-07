"use client";

import { useEffect, useState } from "react";

interface RoomErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Errors that require a full reload; others can use reset() to keep wallet connected. */
function isUnrecoverableError(error: Error | null): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("webgl") ||
    msg.includes("context lost") ||
    (msg.includes("style") && msg.includes("detached")) ||
    msg.includes("getcontext") ||
    msg.includes("rendering context") ||
    msg.includes("reactcurrentbatchconfig") ||
    msg.includes("react dom")
  );
}

/**
 * Error boundary for (room) routes (board, game-play, etc.).
 * Only reloads for unrecoverable errors (WebGL/context); for others shows retry so wallet stays connected.
 */
export default function RoomError({ error, reset }: RoomErrorProps) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (!error) return;
    console.error("[Room error]", error?.message, error?.stack);
    if (isUnrecoverableError(error)) {
      setReloading(true);
      window.location.reload();
    }
  }, [error]);

  if (reloading || isUnrecoverableError(error)) {
    return (
      <main className="w-full min-h-screen bg-[#010F10] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500/50 border-t-cyan-400 animate-spin" />
          <p className="text-sm">Reloading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen bg-[#010F10] flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-slate-300 max-w-md text-center">
        <p className="text-sm text-slate-400">Something went wrong</p>
        <p className="text-xs text-slate-500 font-mono break-all">{error?.message?.slice(0, 120)}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
        >
          Try again
        </button>
        <p className="text-xs text-slate-500">Your wallet will stay connected</p>
      </div>
    </main>
  );
}
