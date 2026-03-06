'use client';

import { useEffect, useState } from 'react';
import { isWasmSupported, getWasmCapabilities } from '@/utils/wasm-loader';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { useDojoPlayerActions } from '@/hooks/dojo/useDojoPlayerActions';
import { useDojoGameActions } from '@/hooks/dojo/useDojoGameActions';
import { useDojoRewardActions } from '@/hooks/dojo/useDojoRewardActions';
import { useDojoTokenActions } from '@/hooks/dojo/useDojoTokenActions';
import { stringToFelt } from '@/utils/starknet';

export default function Wasmdemo() {
  const { account, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const player = useDojoPlayerActions();
  const game = useDojoGameActions();
  const reward = useDojoRewardActions();
  const token = useDojoTokenActions();

  const [fields, setFields] = useState({
    username: '',
    addressP: '',
    gameId: '',
    gameCode: '',
    gameType: '0',
    playerSymbol: '0',
    numPlayers: '2',
    numAi: '1',
    code: '0',
    startingBalance: '1500',
    stakeAmount: '0',
    amount: '',
    tokenId: '',
    tier: '0',
    spender: '',
    owner: '',
  });

  const [response, setResponse] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async (fn: () => Promise<unknown>, label: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fn();
      setResponse(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(label, err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isWasmSupported()) getWasmCapabilities();
  }, []);

  if (!address) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-[#00F0FF]">Tycoon Dojo Demo</h1>
        <p className="text-gray-400">Please connect your wallet to continue.</p>
        <div className="flex gap-2">
          {connectors.map((c) => (
            <button
              key={c.id}
              onClick={() => connect({ connector: c })}
              className="rounded bg-[#00F0FF]/20 px-4 py-2 text-[#00F0FF] hover:bg-[#00F0FF]/30"
            >
              Connect {c.id}
            </button>
          ))}
        </div>
      </main>
    );
  }

  const usernameFelt = stringToFelt(fields.username);
  const creatorUsername = Array.isArray(usernameFelt) ? usernameFelt[0] : usernameFelt;
  const num = (s: string) => (s === '' ? 0 : BigInt(s));
  const toBn = (s: string) => (s === '' ? BigInt(0) : BigInt(s));

  const actionButtons = [
    // Player
    { label: 'Register Player', onClick: () => account && handleRequest(() => player.registerPlayer(account, fields.username), 'registerPlayer') },
    { label: 'Is Registered', onClick: () => handleRequest(() => player.isRegistered(fields.addressP || address), 'isRegistered') },
    { label: 'Get Username', onClick: () => handleRequest(() => player.getUsername(fields.addressP || address), 'getUsername') },
    { label: 'Get User', onClick: () => handleRequest(() => player.getUser(creatorUsername), 'getUser') },
    // Game reads
    { label: 'Get Game', onClick: () => handleRequest(() => game.getGame(toBn(fields.gameId)), 'getGame') },
    { label: 'Get Game By Code', onClick: () => handleRequest(() => game.getGameByCode(toBn(fields.gameCode)), 'getGameByCode') },
    { label: 'Get Game Player', onClick: () => handleRequest(() => game.getGamePlayer(toBn(fields.gameId), fields.addressP || address), 'getGamePlayer') },
    { label: 'Get Game Settings', onClick: () => handleRequest(() => game.getGameSettings(toBn(fields.gameId)), 'getGameSettings') },
    { label: 'Get Players In Game', onClick: () => handleRequest(() => game.getPlayersInGame(toBn(fields.gameId)), 'getPlayersInGame') },
    { label: 'Get Last Game Code', onClick: () => account && handleRequest(() => game.getLastGameCode(account), 'getLastGameCode') },
    // Game writes
    { label: 'Create Game', onClick: () => account && handleRequest(() => game.createGame(account, creatorUsername, num(fields.gameType), num(fields.playerSymbol), num(fields.numPlayers), toBn(fields.code), toBn(fields.startingBalance), toBn(fields.stakeAmount)), 'createGame') },
    { label: 'Create AI Game', onClick: () => account && handleRequest(() => game.createAiGame(account, creatorUsername, num(fields.gameType), num(fields.playerSymbol), num(fields.numAi), toBn(fields.code), toBn(fields.startingBalance)), 'createAiGame') },
    { label: 'Join Game', onClick: () => account && handleRequest(() => game.joinGame(account, toBn(fields.gameId), creatorUsername, num(fields.playerSymbol), toBn(fields.code)), 'joinGame') },
    { label: 'Exit Game', onClick: () => account && handleRequest(() => game.exitGame(account, toBn(fields.gameId)), 'exitGame') },
    { label: 'Leave Pending Game', onClick: () => account && handleRequest(() => game.leavePendingGame(account, toBn(fields.gameId)), 'leavePendingGame') },
    // Reward
    { label: 'Balance Of (reward)', onClick: () => handleRequest(() => reward.balanceOf(fields.addressP || address, toBn(fields.tokenId)), 'reward.balanceOf') },
    { label: 'Get Collectible Info', onClick: () => handleRequest(() => reward.getCollectibleInfo(toBn(fields.tokenId)), 'getCollectibleInfo') },
    { label: 'Get Cash Tier Value', onClick: () => handleRequest(() => reward.getCashTierValue(toBn(fields.tier)), 'getCashTierValue') },
    { label: 'Buy Collectible', onClick: () => account && handleRequest(() => reward.buyCollectible(account, toBn(fields.tokenId), false), 'buyCollectible') },
    { label: 'Redeem Voucher', onClick: () => account && handleRequest(() => reward.redeemVoucher(account, toBn(fields.tokenId)), 'redeemVoucher') },
    { label: 'Burn Collectible For Perk', onClick: () => account && handleRequest(() => reward.burnCollectibleForPerk(account, toBn(fields.tokenId)), 'burnCollectibleForPerk') },
    // Token
    { label: 'TYC Balance Of', onClick: () => handleRequest(() => token.balanceOf(fields.addressP || address), 'token.balanceOf') },
    { label: 'TYC Total Supply', onClick: () => handleRequest(() => token.totalSupply(), 'totalSupply') },
    { label: 'TYC Allowance', onClick: () => handleRequest(() => token.allowance(fields.owner || address, fields.spender), 'allowance') },
    { label: 'TYC Transfer', onClick: () => account && handleRequest(() => token.transfer(account, fields.addressP || '', toBn(fields.amount)), 'transfer') },
  ];

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-[#00F0FF]">Tycoon Dojo Demo</h1>
        <button
          onClick={() => disconnect()}
          className="rounded border border-[#00F0FF]/50 px-3 py-1 text-sm text-[#00F0FF] hover:bg-[#00F0FF]/10"
        >
          Disconnect
        </button>
      </div>
      <div className="text-center text-sm text-gray-400">
        Connected: <span className="font-mono text-[#00F0FF]">{address}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-4 rounded-xl bg-gray-800 p-6 shadow-md">
          <h2 className="mb-2 text-xl font-semibold text-white">Input Fields</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { name: 'username', label: 'Username' },
              { name: 'addressP', label: 'Address' },
              { name: 'gameId', label: 'Game ID' },
              { name: 'gameCode', label: 'Game Code' },
              { name: 'gameType', label: 'Game Type' },
              { name: 'playerSymbol', label: 'Player Symbol' },
              { name: 'numPlayers', label: 'Num Players' },
              { name: 'numAi', label: 'Num AI' },
              { name: 'code', label: 'Code' },
              { name: 'startingBalance', label: 'Starting Balance' },
              { name: 'stakeAmount', label: 'Stake Amount' },
              { name: 'amount', label: 'Amount' },
              { name: 'tokenId', label: 'Token ID' },
              { name: 'tier', label: 'Tier' },
              { name: 'spender', label: 'Spender' },
              { name: 'owner', label: 'Owner' },
            ].map(({ name, label }) => (
              <div key={name} className="flex flex-col">
                <label className="mb-1 text-sm text-gray-300">{label}</label>
                <input
                  name={name}
                  value={(fields as Record<string, string>)[name] ?? ''}
                  onChange={onChange}
                  placeholder={label}
                  className="rounded bg-gray-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="max-h-[640px] space-y-4 overflow-y-auto rounded-xl bg-gray-800 p-6 pr-2 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-white">Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {actionButtons.map((btn, i) => (
              <button
                key={i}
                onClick={btn.onClick}
                disabled={loading}
                className="rounded bg-[#00F0FF]/20 px-3 py-2 text-sm text-[#00F0FF] transition-colors hover:bg-[#00F0FF]/30 disabled:opacity-50"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-gray-900 p-6 shadow-md">
          <h2 className="mb-2 text-xl font-semibold text-[#00F0FF]">Response</h2>
          <div className="max-h-[640px] overflow-y-auto rounded bg-gray-800 p-4 text-sm">
            {loading ? (
              <p className="text-[#00F0FF]">Loading...</p>
            ) : error ? (
              <pre className="whitespace-pre-wrap text-red-400">{error}</pre>
            ) : response != null ? (
              <pre className="whitespace-pre-wrap text-green-400">
                {JSON.stringify(
                  response,
                  (_, v) => (typeof v === 'bigint' ? v.toString() : v),
                  2
                )}
              </pre>
            ) : (
              <p className="text-gray-500">Responses will appear here...</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
