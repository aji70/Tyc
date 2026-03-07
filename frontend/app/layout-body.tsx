'use client';

/**
 * Wraps the app with Starknet + Cartridge Controller for wallet connect.
 * Dojo SDK is loaded dynamically so /play-ai-3d and other pages can use useDojoSDK() without crashing.
 */
import dynamic from "next/dynamic";
import { ReactNode } from "react";
import { StarknetProvider } from "@/config/starknet-provider";
import { StarknetWalletProvider } from "@/context/starknet-wallet-provider";

const DojoProvider = dynamic(
  () => import("@/context/dojo-provider").then((m) => m.DojoProvider),
  { ssr: false }
);

export function LayoutBody({ children }: { children: ReactNode }) {
  return (
    <StarknetProvider>
      <StarknetWalletProvider>
        <DojoProvider>{children}</DojoProvider>
      </StarknetWalletProvider>
    </StarknetProvider>
  );
}
