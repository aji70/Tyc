'use client';

import React from 'react';
import { sepolia, mainnet } from '@starknet-react/chains';
import {
  StarknetConfig,
  jsonRpcProvider,
  cartridge,
  InjectedConnector,
  Connector,
} from '@starknet-react/core';
import { ControllerConnector } from '@cartridge/connector';
import { constants } from 'starknet';
import { TYCOON_SESSION_POLICIES } from '@/constants/sessionPolicies';

// Ensure every Connector (base + InjectedConnector) has externalDetectWallets so no caller throws
const noop = function externalDetectWallets() {};
const patchProto = (proto: object) => {
  if (!proto || typeof (proto as Record<string, unknown>).externalDetectWallets === 'function') return;
  try {
    Object.defineProperty(proto, 'externalDetectWallets', { value: noop, writable: true, configurable: true });
  } catch (_) {}
};
if (typeof Connector !== 'undefined' && Connector.prototype) patchProto(Connector.prototype);
if (typeof InjectedConnector !== 'undefined' && InjectedConnector.prototype) patchProto(InjectedConnector.prototype);

const cartridgeConnector = new ControllerConnector({
  defaultChainId: constants.StarknetChainId.SN_SEPOLIA,
  chains: [
    {
      ...mainnet,
      rpcUrl: 'https://api.cartridge.gg/x/starknet/mainnet',
    },
    {
      ...sepolia,
      rpcUrl:
        process.env.NEXT_PUBLIC_STARKNET_RPC_URL ??
        'https://api.cartridge.gg/x/starknet/sepolia',
    },
  ],
  /** Session key policies: user approves once, then game can sign for these entrypoints (gasless / no prompt per action). */
  policies: TYCOON_SESSION_POLICIES,
});

(cartridgeConnector as unknown as Record<string, unknown>).externalDetectWallets =
  noop;

export function StarknetProvider({ children }: { children: React.ReactNode }) {
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

  const connectors = [cartridgeConnector];

  return (
    <StarknetConfig
      chains={[mainnet, sepolia]}
      provider={provider}
      connectors={connectors}
      explorer={cartridge}
      autoConnect={false}
      defaultChainId={sepolia.id}
    >
      {children}
    </StarknetConfig>
  );
}
