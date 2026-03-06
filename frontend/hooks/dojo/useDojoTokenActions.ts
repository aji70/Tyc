'use client';

import { useCallback } from 'react';
import type { Account, AccountInterface } from 'starknet';
import type { BigNumberish } from 'starknet';
import { useDojoSDK } from '@dojoengine/sdk/react';

/**
 * Dojo world TYC token actions (Tycoon on Starknet).
 */
export function useDojoTokenActions() {
  const { client } = useDojoSDK();

  const balanceOf = useCallback(
    (address: string) => client.token.balanceOf(address),
    [client]
  );

  const transfer = useCallback(
    (account: Account | AccountInterface, to: string, amount: BigNumberish) =>
      client.token.transfer(account, to, amount),
    [client]
  );

  const approve = useCallback(
    (
      account: Account | AccountInterface,
      spender: string,
      amount: BigNumberish
    ) => client.token.approve(account, spender, amount),
    [client]
  );

  const allowance = useCallback(
    (owner: string, spender: string) =>
      client.token.allowance(owner, spender),
    [client]
  );

  const totalSupply = useCallback(
    () => client.token.totalSupply(),
    [client]
  );

  return {
    balanceOf,
    transfer,
    approve,
    allowance,
    totalSupply,
  };
}
