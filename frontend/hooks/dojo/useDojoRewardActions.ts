'use client';

import { useCallback } from 'react';
import type { Account, AccountInterface } from 'starknet';
import type { BigNumberish } from 'starknet';
import { useDojoSDK } from '@dojoengine/sdk/react';

const noClient = () => Promise.reject(new Error('Dojo SDK not initialized'));

/**
 * Dojo world reward actions (Tycoon on Starknet) – shop, collectibles, vouchers.
 */
export function useDojoRewardActions() {
  const sdk = useDojoSDK();
  const client = sdk?.client;

  const balanceOf = useCallback(
    (owner: string, tokenId: BigNumberish) =>
      client ? client.reward.balanceOf(owner, tokenId) : noClient(),
    [client]
  );

  const buyCollectible = useCallback(
    (
      account: Account | AccountInterface,
      tokenId: BigNumberish,
      useUsdc: boolean
    ) =>
      client ? client.reward.buyCollectible(account, tokenId, useUsdc) : noClient(),
    [client]
  );

  const buyCollectibleBatch = useCallback(
    (
      account: Account | AccountInterface,
      tokenIds: BigNumberish[],
      useUsdc: boolean
    ) =>
      client
        ? client.reward.buyCollectibleBatch(account, tokenIds, useUsdc)
        : noClient(),
    [client]
  );

  const redeemVoucher = useCallback(
    (account: Account | AccountInterface, tokenId: BigNumberish) =>
      client ? client.reward.redeemVoucher(account, tokenId) : noClient(),
    [client]
  );

  const burnCollectibleForPerk = useCallback(
    (account: Account | AccountInterface, tokenId: BigNumberish) =>
      client ? client.reward.burnCollectibleForPerk(account, tokenId) : noClient(),
    [client]
  );

  const getCollectibleInfo = useCallback(
    (tokenId: BigNumberish) =>
      client ? client.reward.getCollectibleInfo(tokenId) : noClient(),
    [client]
  );

  const getCashTierValue = useCallback(
    (tier: BigNumberish) =>
      client ? client.reward.getCashTierValue(tier) : noClient(),
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
