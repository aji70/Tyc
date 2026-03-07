'use client';

import React from 'react';
import { sepolia, mainnet } from '@starknet-react/chains';
import {
  StarknetConfig,
  jsonRpcProvider,
  argent,
  braavos,
} from '@starknet-react/core';

/**
 * Starknet config with only injected wallets (Argent X, Braavos).
 * No Cartridge — use this on 3D board routes to avoid Cartridge + R3F React conflict (ReactCurrentBatchConfig).
 */
const connectors = [argent(), braavos()];

export function StarknetProviderInjected({ children }: { children: React.ReactNode }) {
  const provider = jsonRpcProvider({
    rpc: (chain) => {
      switch (chain) {
        case mainnet:
          return { nodeUrl: 'https://rpc.mainnet.starknet.io/rpc/v0_8_0' };
        case sepolia:
        default:
          return {
            nodeUrl:
              process.env.NEXT_PUBLIC_STARKNET_RPC_URL ??
              'https://api.cartridge.gg/x/starknet/sepolia',
          };
      }
    },
  });

  return (
    <StarknetConfig
      chains={[mainnet, sepolia]}
      provider={provider}
      connectors={connectors}
      autoConnect={true}
      defaultChainId={sepolia.id}
    >
      {children}
    </StarknetConfig>
  );
}
