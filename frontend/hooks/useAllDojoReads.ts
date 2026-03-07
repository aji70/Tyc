'use client';

import { useCallback, useEffect, useState } from 'react';
import { shortString } from 'starknet';
import { readContract } from '@/lib/starknet-read';
import {
  DOJO_CONTRACT_ADDRESSES,
  PLAYER_VIEW_ABI,
  GAME_VIEW_ABI,
  REWARD_VIEW_ABI,
} from '@/lib/dojo-contracts';

/** Normalize Starknet address to canonical felt (0x + 64 hex chars). */
function addressToFelt(addr: string): bigint {
  const s = String(addr).trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]+$/.test(s)) return BigInt(0);
  const padded = s.padStart(64, '0');
  return BigInt('0x' + padded);
}

function usernameToFelt(username: string): bigint {
  if (!username.trim()) return BigInt(0);
  try {
    return BigInt(shortString.encodeShortString(username));
  } catch {
    return BigInt(0);
  }
}

/** Extract result array from starknet.js Contract.call response. v6 returns parsed values directly. */
function getResult(res: unknown): unknown[] {
  if (res === undefined || res === null) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'boolean' || typeof res === 'bigint' || typeof res === 'number') return [res];
  const r = res as { result?: unknown };
  const inner = r?.result;
  if (Array.isArray(inner)) return inner;
  if (inner != null && typeof inner === 'object' && 'result' in inner) {
    const nested = (inner as { result?: unknown }).result;
    if (Array.isArray(nested)) return nested;
  }
  if (inner !== undefined && inner !== null) return [inner];
  return [res];
}

export type ContractTag = 'player' | 'game' | 'reward';

/**
 * Hook to call all Dojo contract read functions via direct RPC.
 */
export function useAllDojoReads() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const callRead = useCallback(
    async (
      contractTag: ContractTag,
      method: string,
      args: unknown[]
    ): Promise<unknown> => {
      setLoading(true);
      setError(null);
      try {
        const addr = DOJO_CONTRACT_ADDRESSES[contractTag];
        if (!addr) throw new Error(`Unknown contract: ${contractTag}`);
        const abis = {
          player: [...PLAYER_VIEW_ABI],
          game: [...GAME_VIEW_ABI],
          reward: [...REWARD_VIEW_ABI],
        }[contractTag];
        const res = await readContract(addr, abis, method, args);
        return getResult(res);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Player
  const getUsername = useCallback(
    async (address: string): Promise<string | null> => {
      const arr = await callRead('player', 'get_username', [addressToFelt(address)]) as unknown[];
      const raw = arr[0];
      if (raw == null) return null;
      const felt = typeof raw === 'bigint' ? raw : BigInt(String(raw === '' ? '0' : raw));
      if (felt === BigInt(0)) return null;
      return shortString.decodeShortString('0x' + felt.toString(16)) ?? null;
    },
    [callRead]
  );

  const isRegistered = useCallback(
    async (address: string): Promise<boolean> => {
      const arr = (await callRead('player', 'is_registered', [addressToFelt(address)])) as unknown[];
      const raw = arr?.[0] ?? arr;
      if (raw === true) return true;
      if (raw === false || raw === 0 || raw === BigInt(0) || raw === '0' || raw === '0x0') return false;
      try {
        return BigInt(String(raw)) !== BigInt(0);
      } catch {
        return false;
      }
    },
    [callRead]
  );

  const getUser = useCallback(
    async (username: string) => callRead('player', 'get_user', [usernameToFelt(username)]),
    [callRead]
  );

  // Game
  const getGame = useCallback((gameId: bigint | string) => callRead('game', 'get_game', [BigInt(gameId)]), [callRead]);
  const getGameByCode = useCallback((code: string) => callRead('game', 'get_game_by_code', [usernameToFelt(code)]), [callRead]);
  const getGamePlayer = useCallback(
    (gameId: bigint | string, playerAddress: string) =>
      callRead('game', 'get_game_player', [BigInt(gameId), addressToFelt(playerAddress)]),
    [callRead]
  );
  const getGameSettings = useCallback((gameId: bigint | string) => callRead('game', 'get_game_settings', [BigInt(gameId)]), [callRead]);
  const getPlayersInGame = useCallback((gameId: bigint | string) => callRead('game', 'get_players_in_game', [BigInt(gameId)]), [callRead]);
  const getLastGameCode = useCallback((account: string) => callRead('game', 'get_last_game_code', [addressToFelt(account)]), [callRead]);

  // Reward
  const balanceOf = useCallback(
    (owner: string, tokenId: bigint | string) =>
      callRead('reward', 'balance_of', [addressToFelt(owner), BigInt(tokenId)]),
    [callRead]
  );
  const getCashTierValue = useCallback(
    (tier: number) => callRead('reward', 'get_cash_tier_value', [tier]),
    [callRead]
  );
  const getCollectibleInfo = useCallback(
    (tokenId: bigint | string) => callRead('reward', 'get_collectible_info', [BigInt(tokenId)]),
    [callRead]
  );

  return {
    addresses: DOJO_CONTRACT_ADDRESSES,
    loading,
    error,
    callRead,
    getUsername,
    isRegistered,
    getUser,
    getGame,
    getGameByCode,
    getGamePlayer,
    getGameSettings,
    getPlayersInGame,
    getLastGameCode,
    balanceOf,
    getCashTierValue,
    getCollectibleInfo,
  };
}

/**
 * Reactive hook for Hero/registration UI. Drop-in replacement for useDojoPlayerOnChain.
 * Uses useAllDojoReads internally with fixed address normalization and result parsing.
 */
export function useIsRegisteredOnChain(address: string | undefined) {
  const { isRegistered, loading, error } = useAllDojoReads();
  const [isRegisteredOnChain, setIsRegisteredOnChain] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address?.trim()) {
      setIsRegisteredOnChain(false);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    isRegistered(address)
      .then((val) => {
        if (!cancelled) setIsRegisteredOnChain(val);
      })
      .catch(() => {
        if (!cancelled) setIsRegisteredOnChain(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address, isRegistered]);

  return { isRegisteredOnChain, isLoading, error };
}

/** Shape compatible with ContractProvider useGetGameByCode for board pages. */
export type DojoGameByCodeData = {
  id: bigint;
  code?: string;
  creator?: string;
  status?: number;
  winner?: string;
  numberOfPlayers?: number;
  joinedPlayers?: number;
  mode?: number;
  ai?: boolean;
  stakePerPlayer?: bigint;
  totalStaked?: bigint;
  createdAt?: bigint;
  endedAt?: bigint;
};

/**
 * Reactive hook for on-chain game by code (Dojo). Drop-in for ContractProvider useGetGameByCode.
 */
export function useGetGameByCode(code?: string, options = { enabled: true }) {
  const { getGameByCode } = useAllDojoReads();
  const [data, setData] = useState<DojoGameByCodeData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!options.enabled || !code?.trim()) {
      setData(undefined);
      setError(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getGameByCode(code.trim().toUpperCase())
      .then((raw: unknown) => {
        if (cancelled) return;
        const arr = Array.isArray(raw) ? raw : [raw];
        const gameId = arr[0] != null ? BigInt(String(arr[0])) : BigInt(0);
        if (gameId === BigInt(0)) {
          setData(undefined);
          return;
        }
        const parsed: DojoGameByCodeData = {
          id: gameId,
          code,
          creator: arr[1] != null ? String(arr[1]) : undefined,
          numberOfPlayers: arr[2] != null ? Number(arr[2]) : undefined,
          joinedPlayers: arr[3] != null ? Number(arr[3]) : undefined,
          status: arr[4] != null ? Number(arr[4]) : undefined,
          mode: arr[6] != null ? Number(arr[6]) : undefined,
          ai: arr[9] != null ? Boolean(arr[9]) : undefined,
          stakePerPlayer: arr[8] != null ? BigInt(String(arr[8])) : undefined,
          totalStaked: arr[12] != null ? BigInt(String(arr[12])) : undefined,
          createdAt: arr[10] != null ? BigInt(String(arr[10])) : undefined,
          endedAt: arr[11] != null ? BigInt(String(arr[11])) : undefined,
        };
        setData(parsed);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setData(undefined);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [code, options.enabled, getGameByCode]);

  return { data, isLoading, error };
}

/**
 * Reactive hook for last game code by account (Dojo). Drop-in for ContractProvider usePreviousGameCode.
 */
export function usePreviousGameCode(address: string | undefined) {
  const { getLastGameCode } = useAllDojoReads();
  const [data, setData] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address?.trim()) {
      setData(undefined);
      setError(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getLastGameCode(address)
      .then((raw: unknown) => {
        if (cancelled) return;
        const arr = Array.isArray(raw) ? raw : [raw];
        const felt = arr[0];
        if (felt == null || felt === BigInt(0) || felt === 0 || felt === '0' || felt === '0x0') {
          setData(undefined);
          return;
        }
        try {
          const decoded = shortString.decodeShortString('0x' + BigInt(String(felt)).toString(16));
          setData(decoded || undefined);
        } catch {
          setData(undefined);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setData(undefined);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [address, getLastGameCode]);

  return { data, isLoading, error };
}

/**
 * Reactive hook for on-chain username (Dojo). Use in game-settings etc.
 */
export function useDojoUsername(address: string | undefined) {
  const { getUsername } = useAllDojoReads();
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address?.trim()) {
      setUsername(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getUsername(address)
      .then((name) => {
        if (!cancelled) setUsername(name ?? null);
      })
      .catch(() => {
        if (!cancelled) setUsername(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address, getUsername]);

  return { username, isLoading };
}

/** Shape compatible with ContractProvider useGetUser for useUserLevel. */
export type DojoUserData = {
  id: bigint;
  username: string;
  playerAddress: string;
  registeredAt: bigint;
  gamesPlayed: bigint;
  gamesWon: bigint;
  gamesLost: bigint;
  totalStaked: bigint;
  totalEarned: bigint;
  totalWithdrawn: bigint;
};

/**
 * Reactive hook for on-chain user by username (Dojo). API-compatible with ContractProvider useGetUser.
 */
export function useDojoGetUser(username: string | undefined) {
  const { getUser } = useAllDojoReads();
  const [data, setData] = useState<DojoUserData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!username?.trim()) {
      setData(undefined);
      setError(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getUser(username.trim())
      .then((raw: unknown) => {
        if (cancelled) return;
        const arr = Array.isArray(raw) ? raw : [raw];
        if (!arr.length || arr[0] == null) {
          setData(undefined);
          return;
        }
        setData({
          id: BigInt(String(arr[0])),
          username: arr[1] != null ? String(arr[1]) : '',
          playerAddress: arr[2] != null ? String(arr[2]) : '0x0',
          registeredAt: arr[3] != null ? BigInt(String(arr[3])) : BigInt(0),
          gamesPlayed: arr[4] != null ? BigInt(String(arr[4])) : BigInt(0),
          gamesWon: arr[5] != null ? BigInt(String(arr[5])) : BigInt(0),
          gamesLost: arr[6] != null ? BigInt(String(arr[6])) : BigInt(0),
          totalStaked: arr[7] != null ? BigInt(String(arr[7])) : BigInt(0),
          totalEarned: arr[8] != null ? BigInt(String(arr[8])) : BigInt(0),
          totalWithdrawn: arr[9] != null ? BigInt(String(arr[9])) : BigInt(0),
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setData(undefined);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [username, getUser]);

  return { data, isLoading, error };
}
