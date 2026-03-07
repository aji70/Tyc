'use client';

/**
 * Wraps the app with Starknet + Cartridge Controller for wallet connect.
 * Dojo SDK and StarknetProvider load only on the client so prerender (e.g. /_not-found) doesn't run Cartridge/Starknet in Node.
 */
import dynamic from "next/dynamic";
import { ReactNode } from "react";

const StarknetProvider = dynamic(
  () => import("@/config/starknet-provider").then((m) => m.StarknetProvider),
  { ssr: false }
);

const StarknetWalletProvider = dynamic(
  () => import("@/context/starknet-wallet-provider").then((m) => m.StarknetWalletProvider),
  { ssr: false }
);

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
