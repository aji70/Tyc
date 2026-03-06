'use client';

import { useEffect, useState } from 'react';
import { Contract, RpcProvider, shortString } from 'starknet';
import manifest from '@/lib/dojo/manifest_sepolia.json';
import { dojoConfig } from '@/lib/dojo/dojoConfig';

const PLAYER_TAG = 'tycoon-player';

/** Fallback Starknet Sepolia RPCs when primary fails. */
const SEPOLIA_RPC_FALLBACKS = [
  'https://starknet-sepolia.public.blastapi.io',
  'https://starknet-sepolia.drpc.org',
];

/** Minimal ABI for player view calls so Contract compiles calldata correctly (ContractAddress encoding). */
const PLAYER_VIEW_ABI = [
  {
    type: 'function' as const,
    name: 'is_registered',
    inputs: [{ name: 'address', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'get_username',
    inputs: [{ name: 'address', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [{ type: 'core::felt252' }],
    state_mutability: 'view' as const,
  },
];

function getPlayerContractAddress(): string {
  const contract = (manifest as { contracts?: { tag: string; address: string }[] }).contracts?.find(
    (c) => c.tag === PLAYER_TAG
  );
  return contract?.address ?? '';
}

/** Normalize address to hex (lowercase for consistency). */
function normalizeAddress(addr: string): string {
  const s = addr.trim().toLowerCase();
  return s.startsWith('0x') ? s : `0x${s}`;
}

/** Extract result array from Contract.call return (Result type or string[]). */
function getResult(res: unknown): string[] {
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

export interface DojoPlayerOnChainResult {
  isRegisteredOnChain: boolean;
  usernameOnChain: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * When a player lands, check if they are registered on the Dojo contract.
 * Uses RPC only (no Torii). entrypoint must be the *name* (starknet.js hashes it).
 */
export function useDojoPlayerOnChain(address: string | undefined): DojoPlayerOnChainResult {
  const [isRegisteredOnChain, setIsRegisteredOnChain] = useState(false);
  const [usernameOnChain, setUsernameOnChain] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address?.trim()) {
      setIsRegisteredOnChain(false);
      setUsernameOnChain(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const playerAddress = getPlayerContractAddress();
    if (!playerAddress) {
      setIsLoading(false);
      return;
    }

    const normalizedAddress = normalizeAddress(address);
    const primaryRpc =
      (dojoConfig as { rpcUrl?: string }).rpcUrl ??
      process.env.NEXT_PUBLIC_STARKNET_RPC_URL ??
      'https://api.cartridge.gg/x/starknet/sepolia';
    const rpcUrls = [primaryRpc, ...SEPOLIA_RPC_FALLBACKS];
    let cancelled = false;

    (async () => {
      setError(null);
      setIsLoading(true);
      const decodeUsername = (result: unknown[]): string | null => {
        if (result.length === 0 || result[0] == null) return null;
        try {
          const felt = result[0];
          const hex =
            typeof felt === 'string'
              ? felt.startsWith('0x')
                ? felt
                : `0x${felt}`
              : typeof felt === 'bigint'
                ? `0x${felt.toString(16)}`
                : `0x${BigInt(Number(felt)).toString(16)}`;
          if (BigInt(hex) === BigInt(0)) return null;
          return shortString.decodeShortString(hex);
        } catch {
          return null;
        }
      };

      let lastErr: Error | null = null;
      for (const rpcUrl of rpcUrls) {
        if (cancelled) break;
        try {
          const provider = new RpcProvider({ nodeUrl: rpcUrl });
          const playerContract = new Contract(PLAYER_VIEW_ABI, playerAddress, provider);

          // 1) Try get_username first
          let name: string | null = null;
          try {
            const usernameRes = await playerContract.call('get_username', [normalizedAddress]);
            if (cancelled) break;
            const arr = Array.isArray(usernameRes) ? usernameRes : getResult(usernameRes);
            name = decodeUsername(arr);
          } catch (_) {}

          if (name?.trim()) {
            setIsRegisteredOnChain(true);
            setUsernameOnChain(name.trim());
            if (!cancelled) setIsLoading(false);
            return;
          }

          // 2) Call is_registered
          const res = await playerContract.call('is_registered', [normalizedAddress]);
          if (cancelled) break;

          const result = Array.isArray(res) ? res : getResult(res);
          const raw = result[0];
          const isReg =
            result.length > 0 &&
            (raw === true ||
              raw === '0x1' ||
              raw === '1' ||
              (raw !== undefined && raw !== false && raw !== '0' && raw !== '0x0' && BigInt(raw !== '' ? String(raw) : '0') !== BigInt(0)));
          setIsRegisteredOnChain(!!isReg);

          if (!isReg) {
            setUsernameOnChain(null);
            if (!cancelled) setIsLoading(false);
            return;
          }

          if (!name) {
            try {
              const usernameRes2 = await playerContract.call('get_username', [normalizedAddress]);
              if (!cancelled) {
                const arr2 = Array.isArray(usernameRes2) ? usernameRes2 : getResult(usernameRes2);
                name = decodeUsername(arr2);
              }
            } catch (_) {}
          }
          setUsernameOnChain(name);
          if (!cancelled) setIsLoading(false);
          return;
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error(String(err));
          if (process.env.NODE_ENV === 'development') console.warn('[useDojoPlayerOnChain] RPC failed:', rpcUrl, lastErr.message);
        }
      }

      if (!cancelled) {
        if (lastErr) setError(lastErr);
        setIsRegisteredOnChain(false);
        setUsernameOnChain(null);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { isRegisteredOnChain, usernameOnChain, isLoading, error };
}
