'use client';

import { useCallback, useState } from 'react';
import { useAccount } from '@starknet-react/core';
import { stringToFelt } from '@/utils/starknet';
import manifest from '@/lib/dojo/manifest_sepolia.json';

const NAMESPACE = 'tycoon';
const PLAYER_TAG = 'tycoon-player';

function getPlayerContractAddress(): string {
  const contract = (manifest as { contracts?: { tag: string; address: string }[] }).contracts?.find(
    (c) => c.tag === PLAYER_TAG
  );
  return contract?.address ?? '';
}

/**
 * Register on Starknet/Dojo only (no backend). Uses Cartridge/Starknet account
 * to call the Dojo player system's register_player.
 */
export function useStarknetDojoRegister() {
  const { account, address } = useAccount();
  const [isPending, setIsPending] = useState(false);

  const registerPlayer = useCallback(
    async (username: string): Promise<void> => {
      if (!account || !address) {
        throw new Error('Wallet or contract not available');
      }
      const playerAddress = getPlayerContractAddress();
      if (!playerAddress) {
        throw new Error('Dojo player contract not configured');
      }
      const usernameFelt = stringToFelt(username.trim());
      const felt = Array.isArray(usernameFelt) ? usernameFelt[0] : usernameFelt;

      setIsPending(true);
      try {
        await account.execute([
          {
            contractAddress: playerAddress,
            entrypoint: 'register_player',
            calldata: [felt.toString()],
          },
        ]);
      } finally {
        setIsPending(false);
      }
    },
    [account, address]
  );

  return { registerPlayer, isPending };
}
