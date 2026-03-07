'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { useAllDojoReads } from '@/hooks/useAllDojoReads';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="ml-2 rounded bg-gray-700 px-2 py-0.5 text-xs text-[#00F0FF] hover:bg-gray-600"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ReadRow({
  label,
  onCall,
  args,
  result,
  loading,
  error,
}: {
  label: string;
  onCall: () => void;
  args: React.ReactNode;
  result: string | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-gray-700/50 p-3">
      <div className="flex-1 min-w-0">
        <span className="font-mono text-sm text-[#00F0FF]">{label}</span>
        <span className="ml-2 text-gray-500 text-sm">{args}</span>
      </div>
      <button
        type="button"
        onClick={onCall}
        disabled={loading}
        className="rounded bg-[#00F0FF]/20 px-3 py-1 text-sm text-[#00F0FF] hover:bg-[#00F0FF]/30 disabled:opacity-50"
      >
        {loading ? '...' : 'Read'}
      </button>
      <div className="w-full text-sm">
        {error && <span className="text-red-400">{error}</span>}
        {result !== null && !error && <span className="text-green-400 break-all">{result}</span>}
      </div>
    </div>
  );
}

export default function ReadDemoPage() {
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const {
    addresses,
    loading,
    error: hookError,
    getUsername,
    isRegistered,
    getUser,
    getGame,
    getGameByCode,
    getGamePlayer,
    getGameSettings,
    getPlayersInGame,
    getLastGameCode,
    balanceOf,
    getCashTierValue,
    getCollectibleInfo,
  } = useAllDojoReads();

  const [results, setResults] = useState<Record<string, string>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [inputUsername, setInputUsername] = useState('');
  const [inputGameId, setInputGameId] = useState('0');
  const [inputGameCode, setInputGameCode] = useState('');
  const [inputTokenId, setInputTokenId] = useState('0');

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setErrs((e) => ({ ...e, [key]: '' }));
    try {
      const res = await fn();
      setResults((r) => ({ ...r, [key]: JSON.stringify(res) }));
    } catch (e) {
      setErrs((err) => ({ ...err, [key]: (e as Error).message }));
      setResults((r) => ({ ...r, [key]: '' }));
    }
  };

  if (!address) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-[#00F0FF]">Starknet Contract Read Demo</h1>
        <p className="text-gray-400">
          All Dojo read functions. Connect wallet to test.
        </p>
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

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#00F0FF]">Dojo Contract Reads</h1>
        <button
          onClick={() => disconnect()}
          className="rounded border border-[#00F0FF]/50 px-3 py-1 text-sm text-[#00F0FF] hover:bg-[#00F0FF]/10"
        >
          Disconnect
        </button>
      </div>
      <p className="text-sm text-gray-400">
        Direct RPC reads. Addresses from manifest_sepolia.
      </p>
      {hookError && (
        <div className="rounded bg-red-900/30 p-3 text-red-400">{hookError.message}</div>
      )}

      {/* Contract addresses */}
      <section className="space-y-3 rounded-xl bg-gray-800/50 p-4">
        <h2 className="text-lg font-semibold text-white">Contract addresses</h2>
        <div className="space-y-2 font-mono text-sm">
          <p className="flex items-center gap-2">
            <span className="text-gray-500 w-16">world:</span>
            <span className="break-all text-gray-300">{addresses.world}</span>
            <CopyButton value={addresses.world} />
          </p>
          <p className="flex items-center gap-2">
            <span className="text-gray-500 w-16">game:</span>
            <span className="break-all text-gray-300">{addresses.game}</span>
            <CopyButton value={addresses.game} />
          </p>
          <p className="flex items-center gap-2">
            <span className="text-gray-500 w-16">player:</span>
            <span className="break-all text-gray-300">{addresses.player}</span>
            <CopyButton value={addresses.player} />
          </p>
          <p className="flex items-center gap-2">
            <span className="text-gray-500 w-16">reward:</span>
            <span className="break-all text-gray-300">{addresses.reward}</span>
            <CopyButton value={addresses.reward} />
          </p>
          <p className="flex items-center gap-2">
            <span className="text-gray-500 w-16">token:</span>
            <span className="break-all text-gray-300">{addresses.token}</span>
            <CopyButton value={addresses.token} />
          </p>
        </div>
      </section>

      {/* Player */}
      <section className="space-y-3 rounded-xl bg-gray-800/50 p-4">
        <h2 className="text-lg font-semibold text-white">tycoon-player</h2>
        <ReadRow
          label="get_username"
          args={`(${address.slice(0, 10)}...)`}
          onCall={() => run('get_username', () => getUsername(address))}
          result={results.get_username ?? null}
          loading={loading}
          error={errs.get_username ?? null}
        />
        <ReadRow
          label="is_registered"
          args={`(${address.slice(0, 10)}...)`}
          onCall={() => run('is_registered', () => isRegistered(address))}
          result={results.is_registered ?? null}
          loading={loading}
          error={errs.is_registered ?? null}
        />
        <div className="flex flex-wrap items-center gap-2 rounded border border-gray-700/50 p-3">
          <span className="font-mono text-sm text-[#00F0FF]">get_user</span>
          <input
            type="text"
            placeholder="username"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-white w-32"
          />
          <button
            type="button"
            onClick={() => run('get_user', () => getUser(inputUsername))}
            disabled={loading}
            className="rounded bg-[#00F0FF]/20 px-3 py-1 text-sm text-[#00F0FF] hover:bg-[#00F0FF]/30 disabled:opacity-50"
          >
            {loading ? '...' : 'Read'}
          </button>
          <div className="w-full text-sm">
            {errs.get_user && <span className="text-red-400">{errs.get_user}</span>}
            {results.get_user && <span className="text-green-400 break-all">{results.get_user}</span>}
          </div>
        </div>
      </section>

      {/* Game */}
      <section className="space-y-3 rounded-xl bg-gray-800/50 p-4">
        <h2 className="text-lg font-semibold text-white">tycoon-game</h2>
        <div className="flex flex-wrap items-center gap-2 rounded border border-gray-700/50 p-3">
          <span className="font-mono text-sm text-[#00F0FF]">get_game</span>
          <input
            type="text"
            placeholder="game_id"
            value={inputGameId}
            onChange={(e) => setInputGameId(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-white w-24"
          />
          <button
            type="button"
            onClick={() => run('get_game', () => getGame(inputGameId))}
            disabled={loading}
            className="rounded bg-[#00F0FF]/20 px-3 py-1 text-sm text-[#00F0FF] hover:bg-[#00F0FF]/30 disabled:opacity-50"
          >
            {loading ? '...' : 'Read'}
          </button>
          <div className="w-full text-sm">
            {errs.get_game && <span className="text-red-400">{errs.get_game}</span>}
            {results.get_game && <span className="text-green-400 break-all">{results.get_game}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded border border-gray-700/50 p-3">
          <span className="font-mono text-sm text-[#00F0FF]">get_game_by_code</span>
          <input
            type="text"
            placeholder="game code"
            value={inputGameCode}
            onChange={(e) => setInputGameCode(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-white w-32"
          />
          <button
            type="button"
            onClick={() => run('get_game_by_code', () => getGameByCode(inputGameCode))}
            disabled={loading}
            className="rounded bg-[#00F0FF]/20 px-3 py-1 text-sm text-[#00F0FF] hover:bg-[#00F0FF]/30 disabled:opacity-50"
          >
            {loading ? '...' : 'Read'}
          </button>
          <div className="w-full text-sm">
            {errs.get_game_by_code && <span className="text-red-400">{errs.get_game_by_code}</span>}
            {results.get_game_by_code && <span className="text-green-400 break-all">{results.get_game_by_code}</span>}
          </div>
        </div>
        <ReadRow
          label="get_game_player"
          args={`(game_id: ${inputGameId}, ${address.slice(0, 10)}...)`}
          onCall={() => run('get_game_player', () => getGamePlayer(inputGameId, address))}
          result={results.get_game_player ?? null}
          loading={loading}
          error={errs.get_game_player ?? null}
        />
        <ReadRow
          label="get_game_settings"
          args={`(game_id: ${inputGameId})`}
          onCall={() => run('get_game_settings', () => getGameSettings(inputGameId))}
          result={results.get_game_settings ?? null}
          loading={loading}
          error={errs.get_game_settings ?? null}
        />
        <ReadRow
          label="get_players_in_game"
          args={`(game_id: ${inputGameId})`}
          onCall={() => run('get_players_in_game', () => getPlayersInGame(inputGameId))}
          result={results.get_players_in_game ?? null}
          loading={loading}
          error={errs.get_players_in_game ?? null}
        />
        <ReadRow
          label="get_last_game_code"
          args={`(${address.slice(0, 10)}...)`}
          onCall={() => run('get_last_game_code', () => getLastGameCode(address))}
          result={results.get_last_game_code ?? null}
          loading={loading}
          error={errs.get_last_game_code ?? null}
        />
      </section>

      {/* Reward */}
      <section className="space-y-3 rounded-xl bg-gray-800/50 p-4">
        <h2 className="text-lg font-semibold text-white">tycoon-reward</h2>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>token_id:</span>
          <input
            type="text"
            value={inputTokenId}
            onChange={(e) => setInputTokenId(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-white w-24"
          />
        </div>
        <ReadRow
          label="balance_of"
          args={`(${address.slice(0, 10)}..., token_id: ${inputTokenId})`}
          onCall={() => run('balance_of', () => balanceOf(address, inputTokenId))}
          result={results.balance_of ?? null}
          loading={loading}
          error={errs.balance_of ?? null}
        />
        <ReadRow
          label="get_cash_tier_value"
          args="(tier: 1)"
          onCall={() => run('get_cash_tier_value', () => getCashTierValue(1))}
          result={results.get_cash_tier_value ?? null}
          loading={loading}
          error={errs.get_cash_tier_value ?? null}
        />
        <ReadRow
          label="get_collectible_info"
          args={`(token_id: ${inputTokenId})`}
          onCall={() => run('get_collectible_info', () => getCollectibleInfo(inputTokenId))}
          result={results.get_collectible_info ?? null}
          loading={loading}
          error={errs.get_collectible_info ?? null}
        />
      </section>
    </main>
  );
}
