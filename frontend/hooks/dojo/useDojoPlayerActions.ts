'use client';

import { useCallback } from 'react';
import type { Account, AccountInterface } from 'starknet';
import type { BigNumberish } from 'starknet';
import { useDojoSDK } from '@dojoengine/sdk/react';
import { stringToFelt } from '@/utils/starknet';

const noClient = () => Promise.reject(new Error('Dojo SDK not initialized'));

/**
 * Dojo world player actions (Tycoon on Starknet).
 */
export function useDojoPlayerActions() {
  const sdk = useDojoSDK();
  const client = sdk?.client;

  const registerPlayer = useCallback(
    (account: Account | AccountInterface, username: string) => {
      if (!client) return noClient();
      const usernameFelt = stringToFelt(username);
      const arg = Array.isArray(usernameFelt) ? usernameFelt[0] : usernameFelt;
      return client.player.registerPlayer(account, arg);
    },
    [client]
  );

  const isRegistered = useCallback(
    (address: string) =>
      client ? client.player.isRegistered(address) : noClient(),
    [client]
  );

  const getUsername = useCallback(
    (address: string) =>
      client ? client.player.getUsername(address) : noClient(),
    [client]
  );

  const getUser = useCallback(
    (username: BigNumberish) =>
      client ? client.player.getUser(username) : noClient(),
    [client]
  );

  return {
    registerPlayer,
    isRegistered,
    getUsername,
    getUser,
  };
}
