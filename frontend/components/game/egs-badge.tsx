"use client";

import React from "react";
import { useEgsScore, EGS_ADAPTER_ADDRESS, decodeEgsScore } from "@/lib/dojo/egs";

interface EgsBadgeProps {
  /** Numeric game id (on-chain). Non-numeric or undefined hides the badge when adapter is set. */
  gameId: number | string | undefined;
  className?: string;
}

/**
 * Small EGS status badge: "EGS Tracked" (blue) while game is in progress,
 * "EGS Verified · 1-0" (green) after finalisation. Hidden when adapter is not configured or game id is non-numeric.
 */
export function EgsBadge({ gameId, className = "" }: EgsBadgeProps) {
  const hasAdapter = Boolean(EGS_ADAPTER_ADDRESS);
  const numericId =
    gameId != null &&
    (typeof gameId === "number" ? !Number.isNaN(gameId) : !Number.isNaN(parseInt(String(gameId), 10)));
  const { score, gameOver, loading } = useEgsScore(hasAdapter && numericId ? gameId : undefined);

  if (!hasAdapter || !numericId) return null;

  if (gameOver === true && score !== null) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 ${className}`}
        title="EGS Verified on-chain"
      >
        <span>✅</span>
        <span>EGS Verified</span>
        <span>·</span>
        <span>{decodeEgsScore(score)}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 ${className}`}
      title="EGS Tracked (score will be verified when game ends)"
    >
      {loading ? (
        <span className="inline-block size-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      ) : (
        <span>🔒</span>
      )}
      <span>EGS Tracked</span>
    </span>
  );
}
