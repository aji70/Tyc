'use client';

import { useCallback } from 'react';
import type { Account, AccountInterface } from 'starknet';
import type { BigNumberish } from 'starknet';
import { useDojoSDK } from '@dojoengine/sdk/react';

const noClient = () => Promise.reject(new Error('Dojo SDK not initialized'));

/**
 * Dojo world TYC token actions (Tycoon on Starknet).
 */
export function useDojoTokenActions() {
  const sdk = useDojoSDK();
  const client = sdk?.client;

  const balanceOf = useCallback(
    (address: string) =>
      client ? client.token.balanceOf(address) : noClient(),
    [client]
  );

  const transfer = useCallback(
    (account: Account | AccountInterface, to: string, amount: BigNumberish) =>
      client ? client.token.transfer(account, to, amount) : noClient(),
    [client]
  );

  const approve = useCallback(
    (
      account: Account | AccountInterface,
      spender: string,
      amount: BigNumberish
    ) =>
      client ? client.token.approve(account, spender, amount) : noClient(),
    [client]
  );

  const allowance = useCallback(
    (owner: string, spender: string) =>
      client ? client.token.allowance(owner, spender) : noClient(),
    [client]
  );

  const totalSupply = useCallback(
    () => (client ? client.token.totalSupply() : noClient()),
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
