'use client';

import { useCallback, useState } from 'react';
import { useAccount } from '@starknet-react/core';
import { useDojoGameActions } from './useDojoGameActions';

/**
 * Dojo exit game. API-compatible with ContractProvider useExitGame.
 */
export function useDojoExitGame(gameId: bigint) {
  const { account } = useAccount();
  const { exitGame } = useDojoGameActions();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);

  const exit = useCallback(async () => {
    if (!account) throw new Error('Wallet not connected');
    setIsPending(true);
    setError(null);
    setTxHash(undefined);
    try {
      const result = await exitGame(account, gameId);
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
  }, [account, exitGame, gameId]);

  const reset = useCallback(() => {
    setIsPending(false);
    setIsSuccess(false);
    setError(null);
    setTxHash(undefined);
  }, []);

  return {
    exit,
    isPending,
    isSuccess,
    isConfirming: isPending,
    error: error ?? undefined,
    txHash,
    reset,
  };
}
