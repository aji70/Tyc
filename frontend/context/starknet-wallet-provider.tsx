'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import {
  useConnect,
  useAccount,
  useDisconnect,
  Connector,
  ConnectVariables,
} from '@starknet-react/core';

interface StarknetWalletContextValue {
  account: string | null;
  connectors: Connector[];
  connectWallet: (connector: Connector) => void;
  disconnectWallet: () => void;
  connectAsync: (args?: ConnectVariables) => Promise<void>;
}

const StarknetWalletContext = createContext<StarknetWalletContextValue | null>(
  null
);

export function StarknetWalletProvider({ children }: { children: ReactNode }) {
  const { connect, connectors, connectAsync } = useConnect();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  const connectWallet = useCallback(
    (connector: Connector) => {
      connect({ connector });
    },
    [connect]
  );

  return (
    <StarknetWalletContext.Provider
      value={{
        account: address ?? null,
        connectors,
        connectWallet,
        disconnectWallet: disconnect,
        connectAsync,
      }}
    >
      {children}
    </StarknetWalletContext.Provider>
  );
}

export function useStarknetWallet() {
  const ctx = useContext(StarknetWalletContext);
  if (!ctx) {
    throw new Error('useStarknetWallet must be used within StarknetWalletProvider');
  }
  return ctx;
}
