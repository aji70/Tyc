'use client';

import { useEffect, useState } from 'react';
import { Contract, RpcProvider, shortString } from 'starknet';
import manifest from '@/lib/dojo/manifest_sepolia.json';
import { dojoConfig } from '@/lib/dojo/dojoConfig';
import { stringToFelt } from '@/utils/starknet';

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
  {
    type: 'function' as const,
    name: 'get_user',
    inputs: [{ name: 'username', type: 'core::felt252' }],
    outputs: [
      { type: 'core::felt252' },
      { type: 'core::integer::u256' },
      { type: 'core::starknet::contract_address::ContractAddress' },
      { type: 'core::integer::u64' },
      { type: 'core::integer::u256' },
      { type: 'core::integer::u256' },
      { type: 'core::integer::u256' },
      { type: 'core::integer::u256' },
      { type: 'core::integer::u256' },
      { type: 'core::integer::u256' },
      { type: 'core::integer::u256' },
      { type: 'core::integer::u256' },
    ],
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

/** Turn a felt (string/bigint) into hex string for u256 or address. */
function toHex(v: unknown): string {
  if (v == null) return '0';
  if (typeof v === 'string') return v.startsWith('0x') ? v : `0x${v}`;
  if (typeof v === 'bigint') return '0x' + v.toString(16);
  return '0x' + BigInt(Number(v)).toString(16);
}

/** Parse u256 from two felts (low, high) at indices i, i+1 in arr. */
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

/**
 * Parse get_user result into DojoUserOnChain.
 * - If RPC returns flattened felts: 21 elements (username, id_lo, id_hi, address, registered_at, 8× u256 as 2 felts each).
 * - If SDK returns decoded tuple: 12 elements (username, id, address, registered_at, 8× u256).
 * - If SDK returns object: { username, id, player_address, ... }.
 */
function parseGetUserResult(
  result: unknown[] | Record<string, unknown>,
  usernameStr: string
): DojoUserOnChain | null {
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

/** Full User from Dojo contract (get_user). */
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
  /** Full user from contract (id, player_address, etc.) when registered. */
  userOnChain: DojoUserOnChain | null;
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

      const fetchFullUser = async (
        contract: Contract,
        name: string
      ): Promise<DojoUserOnChain | null> => {
        try {
          const usernameFelt = stringToFelt(name.trim());
          const felt = Array.isArray(usernameFelt) ? usernameFelt[0] : usernameFelt;
          const userRes = await contract.call('get_user', [felt.toString()]);
          const raw = Array.isArray(userRes) ? userRes : getResult(userRes);
          const payload = raw.length > 0 ? raw : (userRes as Record<string, unknown>);
          return parseGetUserResult(payload as unknown[] | Record<string, unknown>, name);
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
            const trimmed = name.trim();
            setUsernameOnChain(trimmed);
            const fullUser = await fetchFullUser(playerContract, trimmed);
            if (!cancelled && fullUser) setUserOnChain(fullUser);
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
            setUserOnChain(null);
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
          if (name?.trim()) {
            const fullUser = await fetchFullUser(playerContract, name.trim());
            if (!cancelled && fullUser) setUserOnChain(fullUser);
          }
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
        setUserOnChain(null);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { isRegisteredOnChain, usernameOnChain, userOnChain, isLoading, error };
}
