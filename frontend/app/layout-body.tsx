'use client';

/**
 * Wraps the app with Starknet + Cartridge Controller for wallet connect.
 * Dojo SDK is not included here (use StarknetDojoProviders to add it) to avoid torii-wasm build issues.
 */
import { ReactNode } from "react";
import { StarknetProvider } from "@/config/starknet-provider";
import { StarknetWalletProvider } from "@/context/starknet-wallet-provider";

export function LayoutBody({ children }: { children: ReactNode }) {
  return (
    <StarknetProvider>
      <StarknetWalletProvider>{children}</StarknetWalletProvider>
    </StarknetProvider>
  );
}
