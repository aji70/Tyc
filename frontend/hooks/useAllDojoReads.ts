'use client';

import { useCallback, useState } from 'react';
import { shortString } from 'starknet';
import { readContract } from '@/lib/starknet-read';
import {
  DOJO_CONTRACT_ADDRESSES,
  PLAYER_VIEW_ABI,
  GAME_VIEW_ABI,
  REWARD_VIEW_ABI,
} from '@/lib/dojo-contracts';

function addressToFelt(addr: string): bigint {
  const s = String(addr).trim().toLowerCase();
  const hex = s.startsWith('0x') ? s : `0x${s}`;
  return BigInt(hex);
}

function usernameToFelt(username: string): bigint {
  if (!username.trim()) return BigInt(0);
  try {
    return BigInt(shortString.encodeShortString(username));
  } catch {
    return BigInt(0);
  }
}

function getResult(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  const r = res as { result?: unknown };
  const inner = r?.result;
  if (Array.isArray(inner)) return inner;
  if (inner != null && typeof inner === 'object' && 'result' in inner) {
    const nested = (inner as { result?: unknown }).result;
    if (Array.isArray(nested)) return nested;
  }
  return [];
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
      const arr = await callRead('player', 'is_registered', [addressToFelt(address)]) as unknown[];
      const raw = arr[0];
      return raw === true || raw === '0x1' || raw === 1 || BigInt(String(raw ?? 0)) !== BigInt(0);
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
    // Player
    getUsername,
    isRegistered,
    getUser,
    // Game
    getGame,
    getGameByCode,
    getGamePlayer,
    getGameSettings,
    getPlayersInGame,
    getLastGameCode,
    // Reward
    balanceOf,
    getCashTierValue,
    getCollectibleInfo,
  };
}
