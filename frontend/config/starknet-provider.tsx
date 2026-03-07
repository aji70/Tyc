'use client';

import React from 'react';
import { sepolia, mainnet } from '@starknet-react/chains';
import {
  StarknetConfig,
  jsonRpcProvider,
  cartridge,
} from '@starknet-react/core';
import { ControllerConnector } from '@cartridge/connector';
import { constants } from 'starknet';
import { TYCOON_SESSION_POLICIES } from '@/constants/sessionPolicies';

const noop = function externalDetectWallets() {};

/** Ensure externalDetectWallets exists on the object so Cartridge internals (e.g. index-kfoymnlo.js) don't throw "t.externalDetectWallets is not a function". */
function ensureExternalDetectWallets(obj: object) {
  if (obj && typeof (obj as Record<string, unknown>).externalDetectWallets !== 'function') {
    try {
      Object.defineProperty(obj, 'externalDetectWallets', { value: noop, writable: true, configurable: true });
    } catch {
      (obj as Record<string, unknown>).externalDetectWallets = noop;
    }
  }
}

/** Wraps a connector in a Proxy so any code that calls .externalDetectWallets() gets a noop instead of throwing. */
function wrapConnectorWithExternalDetect<T extends object>(connector: T): T {
  ensureExternalDetectWallets(connector);
  return new Proxy(connector, {
    get(target, prop, receiver) {
      if (prop === 'externalDetectWallets') {
        const val = Reflect.get(target, prop, receiver);
        if (typeof val === 'function') return val;
        return noop;
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as T;
}

const cartridgeConnectorRaw = new ControllerConnector({
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

const cartridgeConnector = wrapConnectorWithExternalDetect(cartridgeConnectorRaw);

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
