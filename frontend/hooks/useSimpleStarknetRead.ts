'use client';

import { useCallback, useState } from 'react';
import { shortString } from 'starknet';
import { readContract } from '@/lib/starknet-read';
import manifest from '@/lib/dojo/manifest_sepolia.json';

const PLAYER_TAG = 'tycoon-player';

const PLAYER_ABI = [
  {
    type: 'function' as const,
    name: 'get_username',
    inputs: [{ name: 'address', type: 'felt' }],
    outputs: [{ type: 'felt' }],
    state_mutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'is_registered',
    inputs: [{ name: 'address', type: 'felt' }],
    outputs: [{ type: 'bool' }],
    state_mutability: 'view' as const,
  },
] as const;

function getPlayerContractAddress(): string {
  const contracts = (manifest as { contracts?: { tag: string; address: string }[] }).contracts;
  const player = contracts?.find((c) => c.tag === PLAYER_TAG);
  const addr = player?.address?.trim();
  if (addr) return addr;
  const envAddr =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_TYCOON_PLAYER_ADDRESS : undefined;
  return (typeof envAddr === 'string' ? envAddr : '') || '0x29dff7a557a1179b8c2ae9e79d82b4eeadb2d007011310e0b7b03327b074bbf';
}

/** Normalize Starknet address to canonical felt (0x + 64 hex chars). */
function addressToFelt(addr: string): bigint {
  const s = String(addr).trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]+$/.test(s)) return BigInt(0);
  const padded = s.padStart(64, '0');
  return BigInt('0x' + padded);
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

/**
 * Simple hook to read from the tycoon-player Dojo contract via direct RPC.
 * Uses NEXT_PUBLIC_STARKNET_READ_RPC_URL or PublicNode fallback.
 */
export function useSimpleStarknetRead() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getUsername = useCallback(async (address: string): Promise<string | null> => {
    if (!address?.trim()) return null;
    const playerAddress = getPlayerContractAddress();
    if (!playerAddress) {
      setError(new Error('Player contract not configured'));
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await readContract(playerAddress, [...PLAYER_ABI], 'get_username', [
        addressToFelt(address),
      ]);
      const arr = getResult(res);
      const raw = arr[0];
      if (raw == null) return null;
      const felt =
        typeof raw === 'bigint' ? raw : BigInt(String(raw === '' ? '0' : raw));
      if (felt === BigInt(0)) return null;
      return shortString.decodeShortString('0x' + felt.toString(16)) ?? null;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const isRegistered = useCallback(async (address: string): Promise<boolean> => {
    if (!address?.trim()) return false;
    const playerAddress = getPlayerContractAddress();
    if (!playerAddress) {
      setError(new Error('Player contract not configured'));
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await readContract(playerAddress, [...PLAYER_ABI], 'is_registered', [
        addressToFelt(address),
      ]);
      const arr = getResult(res);
      const raw = arr[0];
      return (
        raw === true ||
        raw === '0x1' ||
        raw === 1 ||
        BigInt(String(raw ?? 0)) !== BigInt(0)
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getUsername, isRegistered, loading, error };
}
