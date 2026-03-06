'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { useDojoPlayerOnChain } from '@/hooks/dojo/useDojoPlayerOnChain';
import { useDojoGetUsername } from '@/hooks/dojo/useDojoGetUsername';

export default function Wasmdemo() {
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const { isRegisteredOnChain, isLoading: isRegisteredLoading, error: isRegisteredError } =
    useDojoPlayerOnChain(address ?? undefined);
  const { getUsername, isLoading: getUsernameLoading, error: getUsernameError } =
    useDojoGetUsername();

  const [username, setUsername] = useState<string | null>(null);

  const handleGetUsername = async () => {
    const addr = address?.trim();
    if (!addr) return;
    setUsername(null);
    try {
      const u = await getUsername(addr);
      setUsername(u);
    } catch {
      setUsername(null);
    }
  };

  if (!address) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-[#00F0FF]">Tycoon Dojo Demo</h1>
        <p className="text-gray-400">Connect wallet to check isRegistered and getUsername.</p>
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

  const loading = isRegisteredLoading || getUsernameLoading;

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#00F0FF]">Tycoon Dojo Demo</h1>
        <button
          onClick={() => disconnect()}
          className="rounded border border-[#00F0FF]/50 px-3 py-1 text-sm text-[#00F0FF] hover:bg-[#00F0FF]/10"
        >
          Disconnect
        </button>
      </div>

      <p className="text-sm text-gray-400">
        Uses same hooks as HeroSection: isRegistered + getUsername from tycoon-player (direct RPC).
      </p>

      <section className="space-y-4 rounded-xl bg-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white">Results</h2>

        <div>
          <span className="text-gray-400">isRegistered: </span>
          {loading ? (
            <span className="text-yellow-400">Loading...</span>
          ) : isRegisteredError ? (
            <span className="text-red-400">{isRegisteredError.message}</span>
          ) : (
            <span className="text-green-400">{String(isRegisteredOnChain)}</span>
          )}
        </div>

        <div>
          <button
            onClick={handleGetUsername}
            disabled={loading}
            className="rounded bg-[#00F0FF]/20 px-4 py-2 text-sm text-[#00F0FF] hover:bg-[#00F0FF]/30 disabled:opacity-50"
          >
            Get Username
          </button>
          {username !== null && (
            <span className="ml-2 text-green-400">{username || '(empty)'}</span>
          )}
          {getUsernameError && (
            <span className="ml-2 text-red-400">{getUsernameError.message}</span>
          )}
        </div>
      </section>

      <p className="text-xs text-gray-500">
        Address: {address}
      </p>
    </main>
  );
}
