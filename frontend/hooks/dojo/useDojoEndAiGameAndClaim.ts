'use client';

import { useCallback, useState } from 'react';
import { useAccount } from '@starknet-react/core';
import { useDojoGameActions } from './useDojoGameActions';

/**
 * Dojo end AI game and claim. API-compatible with ContractProvider useEndAIGameAndClaim.
 */
export function useDojoEndAiGameAndClaim(
  gameId: bigint,
  finalPosition: number,
  finalBalance: bigint,
  isWin: boolean
) {
  const { account } = useAccount();
  const { endAiGame } = useDojoGameActions();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);

  const write = useCallback(async () => {
    if (!account) throw new Error('Wallet not connected');
    setIsPending(true);
    setError(null);
    setTxHash(undefined);
    try {
      const result = await endAiGame(account, gameId, BigInt(finalPosition), finalBalance, isWin);
      setTxHash(result.transaction_hash);
      setIsSuccess(true);
      return result.transaction_hash;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, [account, endAiGame, gameId, finalPosition, finalBalance, isWin]);

  const reset = useCallback(() => {
    setIsPending(false);
    setIsSuccess(false);
    setError(null);
    setTxHash(undefined);
  }, []);

  return {
    write,
    isPending,
    isSuccess,
    isConfirming: isPending,
    error: error ?? undefined,
    txHash,
    reset,
  };
}
