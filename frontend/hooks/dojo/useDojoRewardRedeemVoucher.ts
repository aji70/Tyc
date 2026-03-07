'use client';

import { useCallback, useState } from 'react';
import type { BigNumberish } from 'starknet';
import { useAccount } from '@starknet-react/core';
import { useDojoRewardActions } from './useDojoRewardActions';

export function useDojoRewardRedeemVoucher() {
  const { account } = useAccount();
  const { redeemVoucher } = useDojoRewardActions();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const redeem = useCallback(
    async (tokenId: BigNumberish) => {
      if (!account) throw new Error('Wallet not connected');
      setIsPending(true);
      setIsSuccess(false);
      setError(null);
      try {
        await redeemVoucher(account, tokenId);
        setIsSuccess(true);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [account, redeemVoucher]
  );

  const reset = useCallback(() => {
    setIsPending(false);
    setIsSuccess(false);
    setError(null);
  }, []);

  return { redeem, isPending, isSuccess, isConfirming: isPending, error, reset };
}
