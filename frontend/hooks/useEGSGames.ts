"use client";

import { useQuery } from "@tanstack/react-query";
import { getEGSGames, type EGSGame, type EGSPaginatedResult } from "@/lib/egs-api";

export function useEGSGames(options?: { limit?: number; offset?: number }) {
  return useQuery<EGSPaginatedResult<EGSGame>>({
    queryKey: ["egs", "games", options?.limit ?? 20, options?.offset ?? 0],
    queryFn: () => getEGSGames(options),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
