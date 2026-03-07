'use client';

import { useEffect, useState } from 'react';
import { Contract, RpcProvider } from 'starknet';
import manifest from '@/lib/dojo/manifest_sepolia.json';

const PLAYER_TAG = 'tycoon-player';
const RPC_CALL_MS = 15_000;

/**
 * Read player registration from the Dojo Player system (starknet_call, no Dojo client).
 * Returns only isRegisteredOnChain. Use NEXT_PUBLIC_STARKNET_READ_RPC_URL or proxy if needed.
 */

/** Public RPCs used only outside browser (e.g. SSR) or when proxy unavailable. */
const SEPOLIA_READ_RPC_FALLBACKS = [
  'https://starknet-sepolia.public.blastapi.io',
  'https://starknet-sepolia-rpc.publicnode.com',
];

/** Same-origin proxy for view calls. Server must set STARKNET_RPC_UPSTREAM. */
function getProxyRpcUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const origin = window.location?.origin;
  if (!origin || origin === 'null') return null;
  return `${origin}/api/starknet-rpc`;
}

/** Use 'latest' block - Cartridge RPC rejects 'pending' with "Invalid block id". */
const CALL_OPTS = { blockIdentifier: 'latest' as const } as const;

/** ABI for is_registered only. */
const PLAYER_VIEW_ABI = [
  {
    type: 'function' as const,
    name: 'is_registered',
    inputs: [{ name: 'address', type: 'felt' }],
    outputs: [{ type: 'bool' }],
    state_mutability: 'view' as const,
  },
];

function getPlayerContractAddress(): string {
  const contracts = (manifest as { contracts?: { tag: string; address: string }[] }).contracts;
  const player = contracts?.find((c) => c.tag === PLAYER_TAG);
  const addr = player?.address?.trim();
  if (addr) return addr;
  const envAddr = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_TYCOON_PLAYER_ADDRESS : undefined;
  return (typeof envAddr === 'string' ? envAddr : '') || '';
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Address to single felt for calldata (ContractAddress = one felt in Cairo). Normalize to 64 hex chars. */
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
 * Returns { isRegisteredOnChain, isLoading, error }. Only calls is_registered.
 */
export function useDojoPlayerOnChain(address: string | undefined) {
  const [isRegisteredOnChain, setIsRegisteredOnChain] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address?.trim()) {
      setIsRegisteredOnChain(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    const playerAddress = getPlayerContractAddress();
    if (!playerAddress) {
      setIsLoading(false);
      return;
    }

    const addressFelt = addressToFelt(address);
    const envReadRpc =
      typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_STARKNET_READ_RPC_URL : undefined;
    const readRpc = typeof envReadRpc === 'string' && envReadRpc.trim() ? envReadRpc.trim() : null;
    const appRpc =
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_STARKNET_RPC_URL) ||
      'https://api.cartridge.gg/x/starknet/sepolia';
    const proxyUrl = getProxyRpcUrl();
    const inBrowser = typeof window !== 'undefined';
    const rpcUrls =
      readRpc !== null
        ? inBrowser
          ? [readRpc, appRpc, ...(proxyUrl ? [proxyUrl] : [])]
          : [readRpc, appRpc, ...SEPOLIA_READ_RPC_FALLBACKS]
        : inBrowser
          ? [appRpc, ...(proxyUrl ? [proxyUrl] : [])]
          : [appRpc, ...SEPOLIA_READ_RPC_FALLBACKS];
    let cancelled = false;

    (async () => {
      setError(null);
      setIsLoading(true);

      let lastErr: Error | null = null;
      try {
        for (const rpcUrl of rpcUrls) {
          if (cancelled) break;
          try {
            const provider = new RpcProvider({ nodeUrl: rpcUrl });
            const contract = new Contract(PLAYER_VIEW_ABI, playerAddress, provider);
            const res = await withTimeout(
              contract.call('is_registered', [addressFelt], CALL_OPTS),
              RPC_CALL_MS,
              'is_registered'
            );
            if (cancelled) break;

            const result = getResult(res);
            const arr = Array.isArray(result) ? result : [];
            const raw = arr[0];
            const isReg =
              arr.length > 0 &&
              (raw === true ||
                raw === '0x1' ||
                raw === '1' ||
                (raw !== undefined && raw !== false && raw !== '0' && raw !== '0x0' && BigInt(String(raw !== '' ? raw : '0')) !== BigInt(0)));

            if (!cancelled) setIsRegisteredOnChain(!!isReg);
            return;
          } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            const raw =
              err && typeof err === 'object'
                ? {
                    message: (err as Error).message,
                    cause: (err as Error & { cause?: unknown }).cause,
                    ...(typeof (err as Record<string, unknown>).response !== 'undefined' && {
                      response: (err as Record<string, unknown>).response,
                    }),
                    ...(typeof (err as Record<string, unknown>).body !== 'undefined' && {
                      body: (err as Record<string, unknown>).body,
                    }),
                  }
                : err;
            console.warn('[useDojoPlayerOnChain] RPC failed:', rpcUrl, raw);
          }
        }

        if (!cancelled) {
          if (lastErr) setError(lastErr);
          setIsRegisteredOnChain(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { isRegisteredOnChain, isLoading, error };
}
