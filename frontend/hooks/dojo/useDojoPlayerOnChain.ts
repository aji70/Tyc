'use client';

import { useEffect, useState } from 'react';
import { RpcProvider, getSelectorFromName, shortString } from 'starknet';
import manifest from '@/lib/dojo/manifest_sepolia.json';
import { dojoConfig } from '@/lib/dojo/dojoConfig';

const PLAYER_TAG = 'tycoon-player';

function getPlayerContractAddress(): string {
  const contract = (manifest as { contracts?: { tag: string; address: string }[] }).contracts?.find(
    (c) => c.tag === PLAYER_TAG
  );
  return contract?.address ?? '';
}

export interface DojoPlayerOnChainResult {
  isRegisteredOnChain: boolean;
  usernameOnChain: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * When a player lands, check if they are registered on the Dojo contract.
 * If so, we can show "Welcome [username]...". Uses RPC only (no Torii).
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

    const rpcUrl = (dojoConfig as { rpcUrl?: string }).rpcUrl ?? process.env.NEXT_PUBLIC_STARKNET_RPC_URL ?? 'https://api.cartridge.gg/x/starknet/sepolia';
    const provider = new RpcProvider({ nodeUrl: rpcUrl });

    let cancelled = false;

    (async () => {
      setError(null);
      setIsLoading(true);
      try {
        const isRegSelector = getSelectorFromName('is_registered');
        const res = await provider.callContract({
          contractAddress: playerAddress,
          entrypoint: isRegSelector,
          calldata: [address],
        });

        if (cancelled) return;

        const result = Array.isArray(res) ? res : (res as { result?: string[] })?.result ?? [];
        const isReg = result.length > 0 && (result[0] === '0x1' || result[0] === '1');
        setIsRegisteredOnChain(!!isReg);

        if (!isReg) {
          setUsernameOnChain(null);
          setIsLoading(false);
          return;
        }

        const usernameSelector = getSelectorFromName('get_username');
        const usernameRes = await provider.callContract({
          contractAddress: playerAddress,
          entrypoint: usernameSelector,
          calldata: [address],
        });

        if (cancelled) return;

        const usernameResult = Array.isArray(usernameRes) ? usernameRes : (usernameRes as { result?: string[] })?.result ?? [];
        let name: string | null = null;
        if (usernameResult.length > 0 && usernameResult[0]) {
          try {
            const felt = usernameResult[0];
            name = shortString.decodeShortString(felt.startsWith('0x') ? felt : `0x${felt}`);
          } catch {
            name = null;
          }
        }
        setUsernameOnChain(name);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
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
