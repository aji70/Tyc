'use client';

import { useCallback, useState } from 'react';
import type { BigNumberish } from 'starknet';
import { useAccount } from '@starknet-react/core';
import { useDojoRewardActions } from './useDojoRewardActions';

export function useDojoRewardBuyCollectibleBatch() {
  const { account } = useAccount();
  const { buyCollectibleBatch } = useDojoRewardActions();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const buyBatch = useCallback(
    async (tokenIds: BigNumberish[], useUsdc: boolean) => {
      if (!account) throw new Error('Wallet not connected');
      setIsPending(true);
      setIsSuccess(false);
      setError(null);
      try {
        await buyCollectibleBatch(account, tokenIds, useUsdc);
        setIsSuccess(true);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [account, buyCollectibleBatch]
  );

  const reset = useCallback(() => {
    setIsPending(false);
    setIsSuccess(false);
    setError(null);
  }, []);

  return { buyBatch, isPending, isSuccess, isConfirming: isPending, error, reset };
}
