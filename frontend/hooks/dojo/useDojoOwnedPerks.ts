'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from '@starknet-react/core';
import { useNetwork } from '@starknet-react/core';
import { useAllDojoReads } from '@/hooks/useAllDojoReads';

const COLLECTIBLE_ID_START = 2_000_000_000;
/** Perk collectibles: IDs 2_000_000_001 .. 2_000_000_014 (14 perks). */
const PERK_ID_RANGE = Array.from({ length: 14 }, (_, i) => BigInt(COLLECTIBLE_ID_START + i + 1));

export type PerkInfo = { perk: number; tokenId: bigint; strength: number };

export function useDojoOwnedPerks() {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { balanceOf, getCollectibleInfo } = useAllDojoReads();
  const chainId = chain?.id ?? 0;

  const [ownedTokenIds, setOwnedTokenIds] = useState<bigint[]>([]);
  const [perkInfos, setPerkInfos] = useState<PerkInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address?.trim()) {
      setOwnedTokenIds([]);
      setPerkInfos([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    const load = async () => {
      const ids: bigint[] = [];
      for (const tokenId of PERK_ID_RANGE) {
        if (cancelled) return;
        try {
          const raw = await balanceOf(address, tokenId);
          const arr = Array.isArray(raw) ? raw : [raw];
          const bal = arr[0] != null ? BigInt(String(arr[0])) : BigInt(0);
          if (bal > BigInt(0)) ids.push(tokenId);
        } catch {
          // ignore per-token errors
        }
      }
      if (cancelled) return;
      setOwnedTokenIds(ids);

      const infos: PerkInfo[] = [];
      for (const tokenId of ids) {
        if (cancelled) return;
        try {
          const raw = await getCollectibleInfo(tokenId);
          const arr = Array.isArray(raw) ? raw : [raw];
          const perk = arr[0] != null ? Number(arr[0]) : 0;
          const strength = arr[1] != null ? Number(arr[1]) : 1;
          if (perk >= 1 && perk <= 14) infos.push({ perk, tokenId, strength });
        } catch {
          // ignore
        }
      }
      if (!cancelled) setPerkInfos(infos);
    };
    load().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [address, balanceOf, getCollectibleInfo]);

  const perksGrouped = useMemo(() => {
    const byPerk: Record<number, { count: number; tokenId: bigint; strength: number }> = {};
    perkInfos.forEach(({ perk, tokenId, strength }) => {
      if (!byPerk[perk]) byPerk[perk] = { count: 1, tokenId, strength };
      else byPerk[perk].count += 1;
    });
    return Object.entries(byPerk).map(([perkStr, v]) => ({
      perk: Number(perkStr),
      count: v.count,
      tokenId: v.tokenId,
      strength: v.strength,
    }));
  }, [perkInfos]);

  return {
    address: address ?? undefined,
    chainId,
    ownedTokenIds,
    perkInfos,
    perksGrouped,
    isLoading,
  };
}
