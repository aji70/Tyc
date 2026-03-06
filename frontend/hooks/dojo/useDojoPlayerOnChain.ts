'use client';

import { useEffect, useState } from 'react';
import { RpcProvider, shortString } from 'starknet';
import manifest from '@/lib/dojo/manifest_sepolia.json';
import { dojoConfig } from '@/lib/dojo/dojoConfig';

const PLAYER_TAG = 'tycoon-player';

function getPlayerContractAddress(): string {
  const contract = (manifest as { contracts?: { tag: string; address: string }[] }).contracts?.find(
    (c) => c.tag === PLAYER_TAG
  );
  return contract?.address ?? '';
}

/** Normalize address to hex for calldata (Starknet expects felt as hex string). */
function normalizeAddress(addr: string): string {
  const s = addr.trim();
  return s.startsWith('0x') ? s : `0x${s}`;
}

/** Extract result array from RPC response (array or { result: string[] }). */
function getResult(res: unknown): string[] {
  if (Array.isArray(res)) return res;
  const r = res as { result?: string[] };
  return r?.result ?? [];
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

    const rpcUrl =
      (dojoConfig as { rpcUrl?: string }).rpcUrl ??
      process.env.NEXT_PUBLIC_STARKNET_RPC_URL ??
      'https://api.cartridge.gg/x/starknet/sepolia';
    const provider = new RpcProvider({ nodeUrl: rpcUrl });
    const normalizedAddress = normalizeAddress(address);

    let cancelled = false;

    (async () => {
      setError(null);
      setIsLoading(true);
      try {
        // entrypoint must be the function *name*; starknet.js calls getSelectorFromName(entrypoint) internally
        const res = await provider.callContract({
          contractAddress: playerAddress,
          entrypoint: 'is_registered',
          calldata: [normalizedAddress],
        });

        if (cancelled) return;

        const result = getResult(res);
        // Cairo bool: 0 or 1 (as decimal or hex "0x0" / "0x1")
        const raw = result[0];
        const isReg =
          result.length > 0 &&
          (raw === '0x1' || raw === '1' || (raw !== undefined && raw !== '0' && raw !== '0x0' && BigInt(raw !== '' ? raw : '0') !== BigInt(0)));
        setIsRegisteredOnChain(!!isReg);

        if (!isReg) {
          setUsernameOnChain(null);
          setIsLoading(false);
          return;
        }

        const usernameRes = await provider.callContract({
          contractAddress: playerAddress,
          entrypoint: 'get_username',
          calldata: [normalizedAddress],
        });

        if (cancelled) return;

        const usernameResult = getResult(usernameRes);
        let name: string | null = null;
        if (usernameResult.length > 0 && usernameResult[0]) {
          try {
            const felt = usernameResult[0];
            const hex = felt.startsWith('0x') ? felt : `0x${felt}`;
            if (BigInt(hex) !== BigInt(0)) name = shortString.decodeShortString(hex);
          } catch (e) {
            if (process.env.NODE_ENV === 'development') console.warn('[useDojoPlayerOnChain] decode username:', e);
          }
        }
        setUsernameOnChain(name);
      } catch (err) {
        if (!cancelled) {
          const e = err instanceof Error ? err : new Error(String(err));
          setError(e);
          if (process.env.NODE_ENV === 'development') console.error('[useDojoPlayerOnChain]', e);
          setIsRegisteredOnChain(false);
          setUsernameOnChain(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { isRegisteredOnChain, usernameOnChain, isLoading, error };
}
