'use client';

import { useEffect, useState } from 'react';
import { Contract, RpcProvider, shortString } from 'starknet';
import manifest from '@/lib/dojo/manifest_sepolia.json';
import { dojoConfig } from '@/lib/dojo/dojoConfig';
import { stringToFelt } from '@/utils/starknet';

const PLAYER_TAG = 'tycoon-player';
const RPC_CALL_MS = 15_000;

/**
 * Read player registration from the Dojo Player system as a normal Starknet contract.
 * Each Dojo system is a deployed contract: we use its address from the manifest and
 * call it via RpcProvider + Contract like any other Starknet contract (no Dojo client).
 *
 * Requires an RPC that supports starknet_call. If you get "starknet_call does not exist",
 * set NEXT_PUBLIC_STARKNET_READ_RPC_URL to a full RPC (e.g. https://starknet-sepolia.public.blastapi.io).
 */

/** RPCs that support starknet_call (view). Cartridge gateway often does not; try these first. */
const SEPOLIA_READ_RPC_URLS = [
  'https://starknet-sepolia.public.blastapi.io',
  'https://starknet-sepolia.drpc.org',
  'https://starknet-sepolia-rpc.publicnode.com',
  'https://api.cartridge.gg/x/starknet/sepolia',
];

/** ABI for Player system view functions. Use simple types so starknet.js encodes calldata correctly. */
const PLAYER_VIEW_ABI = [
  {
    type: 'function' as const,
    name: 'is_registered',
    inputs: [{ name: 'address', type: 'felt' }],
    outputs: [{ type: 'bool' }],
    state_mutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'get_username',
    inputs: [{ name: 'address', type: 'felt' }],
    outputs: [{ type: 'felt' }],
    state_mutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'get_user',
    inputs: [{ name: 'username', type: 'felt' }],
    outputs: [
      { type: 'felt' },
      { type: 'u256' },
      { type: 'felt' },
      { type: 'u64' },
      { type: 'u256' },
      { type: 'u256' },
      { type: 'u256' },
      { type: 'u256' },
      { type: 'u256' },
      { type: 'u256' },
      { type: 'u256' },
      { type: 'u256' },
    ],
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

/** Address to single felt for calldata (ContractAddress = one felt in Cairo). */
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

function toHex(v: unknown): string {
  if (v == null) return '0';
  if (typeof v === 'string') return v.startsWith('0x') ? v : `0x${v}`;
  if (typeof v === 'bigint') return '0x' + v.toString(16);
  return '0x' + BigInt(Number(v)).toString(16);
}

function u256FromFelts(arr: unknown[], i: number): string {
  const lo = arr[i];
  const hi = arr[i + 1];
  if (lo == null && hi == null) return '0';
  const loHex = toHex(lo ?? 0);
  const hiHex = toHex(hi ?? 0);
  const loBig = BigInt(loHex);
  const hiBig = BigInt(hiHex);
  if (hiBig === BigInt(0)) return loBig.toString();
  return (hiBig << BigInt(128)) + loBig + '';
}

function decodeUsername(result: unknown[]): string | null {
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
}

function parseGetUserResult(result: unknown[] | Record<string, unknown>, usernameStr: string): DojoUserOnChain | null {
  try {
    const arr = Array.isArray(result) ? result : null;
    const obj = arr == null && result != null && typeof result === 'object' && !Array.isArray(result)
      ? (result as Record<string, unknown>)
      : null;

    if (obj && 'player_address' in obj) {
      const toStr = (v: unknown) => (v != null ? String(v) : '0');
      return {
        username: usernameStr,
        id: toStr(obj.id),
        player_address: toHex(obj.player_address),
        registered_at: toStr(obj.registered_at),
        games_played: toStr(obj.games_played),
        games_won: toStr(obj.games_won),
        games_lost: toStr(obj.games_lost),
        total_staked: toStr(obj.total_staked),
        total_earned: toStr(obj.total_earned),
        total_withdrawn: toStr(obj.total_withdrawn),
        properties_bought: toStr(obj.properties_bought),
        properties_sold: toStr(obj.properties_sold),
      };
    }
    if (arr && arr.length >= 21) {
      return {
        username: usernameStr,
        id: u256FromFelts(arr, 1),
        player_address: toHex(arr[3]),
        registered_at: String(arr[4] ?? 0),
        games_played: u256FromFelts(arr, 5),
        games_won: u256FromFelts(arr, 7),
        games_lost: u256FromFelts(arr, 9),
        total_staked: u256FromFelts(arr, 11),
        total_earned: u256FromFelts(arr, 13),
        total_withdrawn: u256FromFelts(arr, 15),
        properties_bought: u256FromFelts(arr, 17),
        properties_sold: u256FromFelts(arr, 19),
      };
    }
    if (arr && arr.length >= 12) {
      const toStr = (v: unknown) => (v != null ? String(v) : '0');
      return {
        username: usernameStr,
        id: toStr(arr[1]),
        player_address: toHex(arr[2]),
        registered_at: toStr(arr[3]),
        games_played: toStr(arr[4]),
        games_won: toStr(arr[5]),
        games_lost: toStr(arr[6]),
        total_staked: toStr(arr[7]),
        total_earned: toStr(arr[8]),
        total_withdrawn: toStr(arr[9]),
        properties_bought: toStr(arr[10]),
        properties_sold: toStr(arr[11]),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export interface DojoUserOnChain {
  username: string;
  id: string;
  player_address: string;
  registered_at: string;
  games_played: string;
  games_won: string;
  games_lost: string;
  total_staked: string;
  total_earned: string;
  total_withdrawn: string;
  properties_bought: string;
  properties_sold: string;
}

export interface DojoPlayerOnChainResult {
  isRegisteredOnChain: boolean;
  usernameOnChain: string | null;
  userOnChain: DojoUserOnChain | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Read player registration from the Player system contract (Starknet contract read, no Dojo client).
 */
export function useDojoPlayerOnChain(address: string | undefined): DojoPlayerOnChainResult {
  const [isRegisteredOnChain, setIsRegisteredOnChain] = useState(false);
  const [usernameOnChain, setUsernameOnChain] = useState<string | null>(null);
  const [userOnChain, setUserOnChain] = useState<DojoUserOnChain | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address?.trim()) {
      setIsRegisteredOnChain(false);
      setUsernameOnChain(null);
      setUserOnChain(null);
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
    const rpcUrls = readRpc ? [readRpc, ...SEPOLIA_READ_RPC_URLS] : SEPOLIA_READ_RPC_URLS;
    let cancelled = false;

    (async () => {
      setError(null);
      setIsLoading(true);

      const fetchFullUser = async (contract: Contract, name: string): Promise<DojoUserOnChain | null> => {
        try {
          const usernameFelt = stringToFelt(name.trim());
          const felt = Array.isArray(usernameFelt) ? usernameFelt[0] : usernameFelt;
          const userRes = await withTimeout(
            contract.call('get_user', [felt]),
            RPC_CALL_MS,
            'get_user'
          );
          const raw = getResult(userRes);
          const arr = Array.isArray(raw) ? raw : [];
          return parseGetUserResult(arr.length > 0 ? arr : (userRes as Record<string, unknown>), name);
        } catch {
          return null;
        }
      };

      let lastErr: Error | null = null;
      try {
        for (const rpcUrl of rpcUrls) {
          if (cancelled) break;
          try {
            const provider = new RpcProvider({ nodeUrl: rpcUrl });
            const contract = new Contract(PLAYER_VIEW_ABI, playerAddress, provider);

            // Pass address as bigint so starknet.js encodes one felt (ContractAddress)
            const callAddress = addressFelt;

            let name: string | null = null;
            try {
              const usernameRes = await withTimeout(
                contract.call('get_username', [callAddress]),
                RPC_CALL_MS,
                'get_username'
              );
              if (cancelled) break;
              const arr = getResult(usernameRes);
              name = decodeUsername(Array.isArray(arr) ? arr : []);
            } catch (_) {}

            if (name?.trim()) {
              if (!cancelled) {
                setIsRegisteredOnChain(true);
                setUsernameOnChain(name.trim());
                const fullUser = await fetchFullUser(contract, name.trim());
                if (!cancelled && fullUser) setUserOnChain(fullUser);
              }
              return;
            }

            const res = await withTimeout(
              contract.call('is_registered', [callAddress]),
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

            if (!isReg) {
              if (!cancelled) {
                setUsernameOnChain(null);
                setUserOnChain(null);
              }
              return;
            }

            if (!name) {
              try {
                const usernameRes2 = await withTimeout(
                  contract.call('get_username', [callAddress]),
                  RPC_CALL_MS,
                  'get_username'
                );
                if (!cancelled) {
                  const arr2 = getResult(usernameRes2);
                  name = decodeUsername(Array.isArray(arr2) ? arr2 : []);
                }
              } catch (_) {}
            }
            if (!cancelled) setUsernameOnChain(name);
            if (name?.trim() && !cancelled) {
              const fullUser = await fetchFullUser(contract, name.trim());
              if (!cancelled && fullUser) setUserOnChain(fullUser);
            }
            return;
          } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
              console.warn('[useDojoPlayerOnChain] RPC failed:', rpcUrl, lastErr.message);
            }
          }
        }

        if (!cancelled) {
          if (lastErr) setError(lastErr);
          setIsRegisteredOnChain(false);
          setUsernameOnChain(null);
          setUserOnChain(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { isRegisteredOnChain, usernameOnChain, userOnChain, isLoading, error };
}
