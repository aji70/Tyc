/**
 * EGS (Embeddable Game Standard) – thin client for Provable Games Denshokan API.
 * Docs: https://docs.provable.games/embeddable-game-standard
 * API: https://docs.provable.games/embeddable-game-standard/frontend/sdk (Sepolia defaults)
 */

const EGS_API_BASE = "https://denshokan-api-production.up.railway.app";

export interface EGSGame {
  gameId: number;
  gameAddress: string;
  name?: string;
  description?: string;
  creator?: string;
  [key: string]: unknown;
}

export interface EGSPaginatedResult<T> {
  data: T[];
  total?: number;
  limit?: number;
  offset?: number;
}

async function egsFetch<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(path, EGS_API_BASE);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EGS API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * List games registered on the EGS (Embeddable Game Standard).
 */
export async function getEGSGames(options?: { limit?: number; offset?: number }): Promise<EGSPaginatedResult<EGSGame>> {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  return egsFetch<EGSPaginatedResult<EGSGame>>("/games", { limit, offset });
}

/**
 * Health check for EGS API.
 */
export async function getEGSHealth(): Promise<{ ok?: boolean; status?: string }> {
  try {
    return await egsFetch("/health");
  } catch {
    return { ok: false };
  }
}

export const EGS_DOCS_URL = "https://docs.provable.games/embeddable-game-standard";
export const EGS_GAMES_OVERVIEW_URL = "https://docs.provable.games/embeddable-game-standard/games";
