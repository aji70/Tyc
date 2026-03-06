'use client';

import dynamic from 'next/dynamic';
import { StarknetProvider } from '@/config/starknet-provider';
import { StarknetWalletProvider } from '@/context/starknet-wallet-provider';

const DojoProvider = dynamic(
  () => import('@/context/dojo-provider').then((m) => m.DojoProvider),
  { ssr: false }
);

export function StarknetDojoProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DojoProvider>
      <StarknetProvider>
        <StarknetWalletProvider>{children}</StarknetWalletProvider>
      </StarknetProvider>
    </DojoProvider>
  );
}
