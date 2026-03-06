'use client';

import { useCallback } from 'react';
import type { Account, AccountInterface } from 'starknet';
import type { BigNumberish } from 'starknet';
import { useDojoSDK } from '@dojoengine/sdk/react';

/**
 * Dojo world game actions (Tycoon on Starknet).
 * Use with DojoProvider + StarknetProvider; account from useAccount() from @starknet-react/core.
 */
export function useDojoGameActions() {
  const { client } = useDojoSDK();

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
      client.game.createGame(
        account,
        creatorUsername,
        gameType,
        playerSymbol,
        numberOfPlayers,
        code,
        startingBalance,
        stakeAmount
      ),
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
      client.game.createAiGame(
        account,
        creatorUsername,
        gameType,
        playerSymbol,
        numberOfAi,
        code,
        startingBalance
      ),
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
      client.game.joinGame(
        account,
        gameId,
        playerUsername,
        playerSymbol,
        joinCode
      ),
    [client]
  );

  const getGame = useCallback(
    (gameId: BigNumberish) => client.game.getGame(gameId),
    [client]
  );

  const getGameByCode = useCallback(
    (code: BigNumberish) => client.game.getGameByCode(code),
    [client]
  );

  const getGamePlayer = useCallback(
    (gameId: BigNumberish, player: string) =>
      client.game.getGamePlayer(gameId, player),
    [client]
  );

  const getGameSettings = useCallback(
    (gameId: BigNumberish) => client.game.getGameSettings(gameId),
    [client]
  );

  const exitGame = useCallback(
    (account: Account | AccountInterface, gameId: BigNumberish) =>
      client.game.exitGame(account, gameId),
    [client]
  );

  const leavePendingGame = useCallback(
    (account: Account | AccountInterface, gameId: BigNumberish) =>
      client.game.leavePendingGame(account, gameId),
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
      client.game.endAiGame(
        account,
        gameId,
        finalPosition,
        finalBalance,
        isWin
      ),
    [client]
  );

  const getLastGameCode = useCallback(
    (account: Account | AccountInterface) => client.game.getLastGameCode(account),
    [client]
  );

  const getPlayersInGame = useCallback(
    (gameId: BigNumberish) => client.game.getPlayersInGame(gameId),
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
      client.game.transferPropertyOwnership(
        account,
        gameId,
        propertyId,
        fromPlayer,
        toPlayer
      ),
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
