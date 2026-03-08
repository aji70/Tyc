"use client";

import { useEffect, useState } from "react";
import { readContract } from "@/lib/starknet-read";

/**
 * EGS (Embeddable Game Standard) adapter address for Tycoon.
 * When set, the UI can show EGS Tracked / EGS Verified and poll score/game_over from the adapter.
 */
export const EGS_ADAPTER_ADDRESS =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_EGS_ADAPTER_ADDRESS : undefined) ?? "";

/** Minimal ABI for EGS adapter view calls (score, game_over). */
const EGS_ADAPTER_ABI = [
  {
    type: "function" as const,
    name: "score",
    inputs: [{ name: "token_id", type: "felt" }],
    outputs: [{ type: "u64" }],
    state_mutability: "view" as const,
  },
  {
    type: "function" as const,
    name: "game_over",
    inputs: [{ name: "token_id", type: "felt" }],
    outputs: [{ type: "bool" }],
    state_mutability: "view" as const,
  },
] as const;

function getResult(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  const r = res as { result?: unknown };
  const inner = r?.result;
  if (Array.isArray(inner)) return inner;
  if (inner != null && typeof inner === "object" && "result" in inner) {
    const nested = (inner as { result?: unknown }).result;
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

/** Token ID for adapter: numeric game id as felt252 (bigint). */
function gameIdToTokenId(gameId: number | string): bigint | null {
  const n = typeof gameId === "string" ? parseInt(gameId, 10) : gameId;
  if (Number.isNaN(n) || n < 0) return null;
  return BigInt(n);
}

/**
 * Poll the EGS adapter for score and game_over for the given game id.
 * Returns null when adapter is not configured, game id is non-numeric, or on error.
 * Stops polling once game_over is true.
 */
export function useEgsScore(gameId: number | string | undefined): {
  score: number | null;
  gameOver: boolean | null;
  loading: boolean;
  error: Error | null;
} {
  const tokenId = gameId != null ? gameIdToTokenId(gameId) : null;
  const [score, setScore] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!EGS_ADAPTER_ADDRESS || tokenId === null) {
      setScore(null);
      setGameOver(null);
      setError(null);
      return;
    }
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const [scoreRes, gameOverRes] = await Promise.all([
          readContract(EGS_ADAPTER_ADDRESS, [...EGS_ADAPTER_ABI], "score", [tokenId]),
          readContract(EGS_ADAPTER_ADDRESS, [...EGS_ADAPTER_ABI], "game_over", [tokenId]),
        ]);
        if (cancelled) return;
        const scoreArr = getResult(scoreRes);
        const gameOverArr = getResult(gameOverRes);
        const s = scoreArr[0];
        const go = gameOverArr[0];
        if (typeof s === "bigint" || typeof s === "number") setScore(Number(s));
        if (typeof go === "boolean") {
          setGameOver(go);
          if (go && intervalId != null) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    poll();
    intervalId = setInterval(poll, 10_000);

    return () => {
      cancelled = true;
      if (intervalId != null) clearInterval(intervalId);
    };
  }, [EGS_ADAPTER_ADDRESS, tokenId]);

  return { score, gameOver, loading, error };
}

/**
 * Decode EGS-encoded score to a human-readable string.
 * Tycoon uses: 1 = win, 0 = loss (single game). So 1 -> "1-0", 0 -> "0-1".
 */
export function decodeEgsScore(score: number | null): string {
  if (score == null || score < 0) return "—";
  if (score === 0) return "0-1";
  if (score === 1) return "1-0";
  // Generic: winner_wins * 100 + loser_wins (e.g. 201 -> 2-1)
  const winner = Math.floor(score / 100);
  const loser = score % 100;
  return `${winner}-${loser}`;
}
