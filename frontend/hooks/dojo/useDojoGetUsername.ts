'use client';

import { useCallback, useState } from 'react';
import { Contract, RpcProvider } from 'starknet';
import { shortString } from 'starknet';
import manifest from '@/lib/dojo/manifest_sepolia.json';

const PLAYER_TAG = 'tycoon-player';
const RPC_CALL_MS = 15_000;

const PLAYER_GET_USERNAME_ABI = [
  {
    type: 'function' as const,
    name: 'get_username',
    inputs: [{ name: 'address', type: 'felt' }],
    outputs: [{ type: 'felt' }],
    state_mutability: 'view' as const,
  },
];

const CALL_OPTS = { blockIdentifier: 'latest' as const } as const;

function getPlayerContractAddress(): string {
  const contracts = (manifest as { contracts?: { tag: string; address: string }[] }).contracts;
  const player = contracts?.find((c) => c.tag === PLAYER_TAG);
  const addr = player?.address?.trim();
  if (addr) return addr;
  const envAddr = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_TYCOON_PLAYER_ADDRESS : undefined;
  return (typeof envAddr === 'string' ? envAddr : '') || '';
}

function getProxyRpcUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const origin = window.location?.origin;
  if (!origin || origin === 'null') return null;
  return `${origin}/api/starknet-rpc`;
}

function addressToFelt(addr: string): bigint {
  const s = addr.trim().toLowerCase();
  const hex = s.startsWith('0x') ? s : `0x${s}`;
  return BigInt(hex);
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

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Imperative hook to fetch username from Dojo player contract (direct RPC, no Dojo SDK).
 * Same approach as HeroSection / useDojoPlayerOnChain.
 */
export function useDojoGetUsername() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getUsername = useCallback(async (address: string): Promise<string | null> => {
    if (!address?.trim()) return null;

    const playerAddress = getPlayerContractAddress();
    if (!playerAddress) {
      setError(new Error('Player contract not configured'));
      return null;
    }

    setIsLoading(true);
    setError(null);

    const readRpc =
      typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_STARKNET_READ_RPC_URL : undefined;
    const rpcList =
      typeof readRpc === 'string' && readRpc.trim()
        ? [readRpc.trim()]
        : [];
    const appRpc =
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_STARKNET_RPC_URL) ||
      'https://api.cartridge.gg/x/starknet/sepolia';
    const proxyUrl = getProxyRpcUrl();
    const rpcUrls = [...new Set([...rpcList, appRpc, ...(proxyUrl ? [proxyUrl] : [])])];

    let lastErr: Error | null = null;

    try {
      for (const rpcUrl of rpcUrls) {
        try {
          const provider = new RpcProvider({ nodeUrl: rpcUrl });
          const contract = new Contract(
            [...PLAYER_GET_USERNAME_ABI],
            playerAddress,
            provider
          );
          const res = await withTimeout(
            contract.call('get_username', [addressToFelt(address)], CALL_OPTS),
            RPC_CALL_MS,
            'get_username'
          );

          const result = getResult(res);
          if (!result.length || result[0] == null) return null;

          const raw = result[0];
          const felt =
            typeof raw === 'bigint'
              ? raw
              : BigInt(String(raw === '' ? '0' : raw));
          if (felt === BigInt(0)) return null;
          const decoded = shortString.decodeShortString('0x' + felt.toString(16));
          return decoded ?? null;
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error(String(err));
          continue;
        }
      }

      if (lastErr) {
        setError(lastErr);
        throw lastErr;
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { getUsername, isLoading, error };
}
