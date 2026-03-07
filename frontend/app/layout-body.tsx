'use client';

/**
 * Wraps the app with Starknet + wallet connect.
 * On 3D board routes we use injected-only (no Cartridge) to avoid Cartridge + R3F React conflict (ReactCurrentBatchConfig).
 * Dojo SDK is loaded dynamically so /play-ai-3d and other pages can use useDojoSDK() without crashing.
 */
import dynamic from "next/dynamic";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StarknetProviderInjected } from "@/config/starknet-provider-injected";
import { StarknetWalletProvider } from "@/context/starknet-wallet-provider";

const DojoProvider = dynamic(
  () => import("@/context/dojo-provider").then((m) => m.DojoProvider),
  { ssr: false }
);

const StarknetProviderCartridge = dynamic(
  () => import("@/config/starknet-provider").then((m) => m.StarknetProvider),
  { ssr: false }
);

const BOARD_3D_ROUTES = [
  "/board-3d-multi",
  "/board-3d-multi-mobile",
  "/board-3d",
  "/board-3d-mobile",
];

function isBoard3DRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return BOARD_3D_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function InnerProviders({ children, useInjectedOnly }: { children: ReactNode; useInjectedOnly: boolean }) {
  return useInjectedOnly ? (
    <StarknetProviderInjected>
      <StarknetWalletProvider>
        <DojoProvider>{children}</DojoProvider>
      </StarknetWalletProvider>
    </StarknetProviderInjected>
  ) : (
    <StarknetProviderCartridge>
      <StarknetWalletProvider>
        <DojoProvider>{children}</DojoProvider>
      </StarknetWalletProvider>
    </StarknetProviderCartridge>
  );
}

export function LayoutBody({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Until client mount, use injected-only so server and first client paint match (no Cartridge = no conflict).
  // After mount, use Cartridge on non-3D routes so wallet connect works; keep injected-only on 3D board.
  const useInjectedOnly = !mounted || isBoard3DRoute(pathname);

  return <InnerProviders useInjectedOnly={useInjectedOnly}>{children}</InnerProviders>;
}
