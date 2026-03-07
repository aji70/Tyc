'use client';

import { useCallback, useState } from 'react';
import { useAccount } from '@starknet-react/core';
import { useDojoRewardActions } from './useDojoRewardActions';

/**
 * Dojo reward burn collectible. API-compatible with ContractProvider useRewardBurnCollectible.
 */
export function useDojoRewardBurnCollectible() {
  const { account } = useAccount();
  const { burnCollectibleForPerk } = useDojoRewardActions();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const burn = useCallback(
    async (tokenId: bigint) => {
      if (!account) throw new Error('Wallet not connected');
      setIsPending(true);
      setIsSuccess(false);
      try {
        await burnCollectibleForPerk(account, tokenId);
        setIsSuccess(true);
      } finally {
        setIsPending(false);
      }
    },
    [account, burnCollectibleForPerk]
  );

  const reset = useCallback(() => {
    setIsPending(false);
    setIsSuccess(false);
  }, []);

  return {
    burn,
    isPending,
    isSuccess,
    isConfirming: isPending,
    error: undefined,
    txHash: undefined,
    reset,
  };
}
