'use client';

import { useCallback, useState } from 'react';
import type { BigNumberish } from 'starknet';
import { useAccount } from '@starknet-react/core';
import { useDojoRewardActions } from './useDojoRewardActions';

export function useDojoRewardBuyCollectible() {
  const { account } = useAccount();
  const { buyCollectible } = useDojoRewardActions();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const buy = useCallback(
    async (tokenId: BigNumberish, useUsdc: boolean) => {
      if (!account) throw new Error('Wallet not connected');
      setIsPending(true);
      setIsSuccess(false);
      setError(null);
      try {
        await buyCollectible(account, tokenId, useUsdc);
        setIsSuccess(true);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [account, buyCollectible]
  );

  const reset = useCallback(() => {
    setIsPending(false);
    setIsSuccess(false);
    setError(null);
  }, []);

  return { buy, isPending, isSuccess, isConfirming: isPending, error, reset };
}
