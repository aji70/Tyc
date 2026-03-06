'use client';

import { useCallback } from 'react';
import type { Account, AccountInterface } from 'starknet';
import type { BigNumberish } from 'starknet';
import { useDojoSDK } from '@dojoengine/sdk/react';
import { stringToFelt } from '@/utils/starknet';

/**
 * Dojo world player actions (Tycoon on Starknet).
 */
export function useDojoPlayerActions() {
  const { client } = useDojoSDK();

  const registerPlayer = useCallback(
    (account: Account | AccountInterface, username: string) => {
      const usernameFelt = stringToFelt(username);
      const arg = Array.isArray(usernameFelt) ? usernameFelt[0] : usernameFelt;
      return client.player.registerPlayer(account, arg);
    },
    [client]
  );

  const isRegistered = useCallback(
    (address: string) => client.player.isRegistered(address),
    [client]
  );

  const getUsername = useCallback(
    (address: string) => client.player.getUsername(address),
    [client]
  );

  const getUser = useCallback(
    (username: BigNumberish) => client.player.getUser(username),
    [client]
  );

  return {
    registerPlayer,
    isRegistered,
    getUsername,
    getUser,
  };
}
