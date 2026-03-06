'use client';

import { useCallback } from 'react';
import type { Account, AccountInterface } from 'starknet';
import type { BigNumberish } from 'starknet';
import { useDojoSDK } from '@dojoengine/sdk/react';

/**
 * Dojo world reward actions (Tycoon on Starknet) – shop, collectibles, vouchers.
 */
export function useDojoRewardActions() {
  const { client } = useDojoSDK();

  const balanceOf = useCallback(
    (owner: string, tokenId: BigNumberish) =>
      client.reward.balanceOf(owner, tokenId),
    [client]
  );

  const buyCollectible = useCallback(
    (
      account: Account | AccountInterface,
      tokenId: BigNumberish,
      useUsdc: boolean
    ) => client.reward.buyCollectible(account, tokenId, useUsdc),
    [client]
  );

  const buyCollectibleBatch = useCallback(
    (
      account: Account | AccountInterface,
      tokenIds: BigNumberish[],
      useUsdc: boolean
    ) =>
      client.reward.buyCollectibleBatch(account, tokenIds, useUsdc),
    [client]
  );

  const redeemVoucher = useCallback(
    (account: Account | AccountInterface, tokenId: BigNumberish) =>
      client.reward.redeemVoucher(account, tokenId),
    [client]
  );

  const burnCollectibleForPerk = useCallback(
    (account: Account | AccountInterface, tokenId: BigNumberish) =>
      client.reward.burnCollectibleForPerk(account, tokenId),
    [client]
  );

  const getCollectibleInfo = useCallback(
    (tokenId: BigNumberish) => client.reward.getCollectibleInfo(tokenId),
    [client]
  );

  const getCashTierValue = useCallback(
    (tier: BigNumberish) => client.reward.getCashTierValue(tier),
    [client]
  );

  return {
    balanceOf,
    buyCollectible,
    buyCollectibleBatch,
    redeemVoucher,
    burnCollectibleForPerk,
    getCollectibleInfo,
    getCashTierValue,
  };
}
