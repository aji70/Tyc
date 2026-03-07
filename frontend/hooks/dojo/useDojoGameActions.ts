'use client';

import { useCallback } from 'react';
import type { Account, AccountInterface } from 'starknet';
import type { BigNumberish } from 'starknet';
import { useDojoSDK } from '@dojoengine/sdk/react';

/**
 * Dojo world game actions (Tycoon on Starknet).
 * Use with DojoProvider + StarknetProvider; account from useAccount() from @starknet-react/core.
 * When Dojo SDK is not initialized (e.g. no Torii URL), returns callbacks that reject.
 */
export function useDojoGameActions() {
  const sdk = useDojoSDK();
  const client = sdk?.client;

  const noClient = () => Promise.reject(new Error('Dojo SDK not initialized'));

  const createGame = useCallback(
    (
      account: Account | AccountInterface,
      creatorUsername: BigNumberish,
      gameType: BigNumberish,
      playerSymbol: BigNumberish,
      numberOfPlayers: BigNumberish,
      code: BigNumberish,
      startingBalance: BigNumberish,
      stakeAmount: BigNumberish
    ) =>
      client
        ? client.game.createGame(
            account,
            creatorUsername,
            gameType,
            playerSymbol,
            numberOfPlayers,
            code,
            startingBalance,
            stakeAmount
          )
        : noClient(),
    [client]
  );

  const createAiGame = useCallback(
    (
      account: Account | AccountInterface,
      creatorUsername: BigNumberish,
      gameType: BigNumberish,
      playerSymbol: BigNumberish,
      numberOfAi: BigNumberish,
      code: BigNumberish,
      startingBalance: BigNumberish
    ) =>
      client
        ? client.game.createAiGame(
            account,
            creatorUsername,
            gameType,
            playerSymbol,
            numberOfAi,
            code,
            startingBalance
          )
        : noClient(),
    [client]
  );

  const joinGame = useCallback(
    (
      account: Account | AccountInterface,
      gameId: BigNumberish,
      playerUsername: BigNumberish,
      playerSymbol: BigNumberish,
      joinCode: BigNumberish
    ) =>
      client
        ? client.game.joinGame(
            account,
            gameId,
            playerUsername,
            playerSymbol,
            joinCode
          )
        : noClient(),
    [client]
  );

  const getGame = useCallback(
    (gameId: BigNumberish) =>
      client ? client.game.getGame(gameId) : noClient(),
    [client]
  );

  const getGameByCode = useCallback(
    (code: BigNumberish) =>
      client ? client.game.getGameByCode(code) : noClient(),
    [client]
  );

  const getGamePlayer = useCallback(
    (gameId: BigNumberish, player: string) =>
      client ? client.game.getGamePlayer(gameId, player) : noClient(),
    [client]
  );

  const getGameSettings = useCallback(
    (gameId: BigNumberish) =>
      client ? client.game.getGameSettings(gameId) : noClient(),
    [client]
  );

  const exitGame = useCallback(
    (account: Account | AccountInterface, gameId: BigNumberish) =>
      client ? client.game.exitGame(account, gameId) : noClient(),
    [client]
  );

  const leavePendingGame = useCallback(
    (account: Account | AccountInterface, gameId: BigNumberish) =>
      client ? client.game.leavePendingGame(account, gameId) : noClient(),
    [client]
  );

  const endAiGame = useCallback(
    (
      account: Account | AccountInterface,
      gameId: BigNumberish,
      finalPosition: BigNumberish,
      finalBalance: BigNumberish,
      isWin: boolean
    ) =>
      client
        ? client.game.endAiGame(
            account,
            gameId,
            finalPosition,
            finalBalance,
            isWin
          )
        : noClient(),
    [client]
  );

  const getLastGameCode = useCallback(
    (account: Account | AccountInterface) =>
      client ? client.game.getLastGameCode(account) : noClient(),
    [client]
  );

  const getPlayersInGame = useCallback(
    (gameId: BigNumberish) =>
      client ? client.game.getPlayersInGame(gameId) : noClient(),
    [client]
  );

  const transferPropertyOwnership = useCallback(
    (
      account: Account | AccountInterface,
      gameId: BigNumberish,
      propertyId: BigNumberish,
      fromPlayer: string,
      toPlayer: string
    ) =>
      client
        ? client.game.transferPropertyOwnership(
            account,
            gameId,
            propertyId,
            fromPlayer,
            toPlayer
          )
        : noClient(),
    [client]
  );

  return {
    createGame,
    createAiGame,
    joinGame,
    getGame,
    getGameByCode,
    getGamePlayer,
    getGameSettings,
    exitGame,
    leavePendingGame,
    endAiGame,
    getLastGameCode,
    getPlayersInGame,
    transferPropertyOwnership,
  };
}
