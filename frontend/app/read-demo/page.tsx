'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { useSimpleStarknetRead } from '@/hooks/useSimpleStarknetRead';

export default function ReadDemoPage() {
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { getUsername, isRegistered, loading, error } = useSimpleStarknetRead();

  const [username, setUsername] = useState<string | null>(null);
  const [registered, setRegistered] = useState<boolean | null>(null);

  const targetAddress = address ?? '';

  useEffect(() => {
    if (!targetAddress) {
      setUsername(null);
      setRegistered(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [u, r] = await Promise.all([
        getUsername(targetAddress),
        isRegistered(targetAddress),
      ]);
      if (!cancelled) {
        setUsername(u);
        setRegistered(r);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetAddress, getUsername, isRegistered]);

  if (!address) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-[#00F0FF]">Starknet Contract Read Demo</h1>
        <p className="text-gray-400">
          Simple RPC-based reads from tycoon-player contract. Connect wallet to test.
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
    <main className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#00F0FF]">Starknet Contract Read Demo</h1>
        <button
          onClick={() => disconnect()}
          className="rounded border border-[#00F0FF]/50 px-3 py-1 text-sm text-[#00F0FF] hover:bg-[#00F0FF]/10"
        >
          Disconnect
        </button>
      </div>

      <p className="text-sm text-gray-400">
        Uses <code className="rounded bg-gray-800 px-1">readContract</code> +{' '}
        <code className="rounded bg-gray-800 px-1">useSimpleStarknetRead</code> — direct RPC,
        no Torii.
      </p>

      <section className="space-y-4 rounded-xl bg-gray-800/50 p-6">
        <h2 className="text-lg font-semibold text-white">tycoon-player reads</h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-gray-400">Address: </span>
            <span className="break-all font-mono text-white">{address}</span>
          </p>
          <p>
            <span className="text-gray-400">is_registered: </span>
            {loading ? (
              <span className="text-yellow-400">Loading...</span>
            ) : error ? (
              <span className="text-red-400">{error.message}</span>
            ) : registered !== null ? (
              <span className="text-green-400">{String(registered)}</span>
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </p>
          <p>
            <span className="text-gray-400">get_username: </span>
            {loading ? (
              <span className="text-yellow-400">Loading...</span>
            ) : error ? (
              <span className="text-red-400">{error.message}</span>
            ) : username !== null ? (
              <span className="text-green-400">{username || '(empty)'}</span>
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
